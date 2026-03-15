import type { AssistantOutput, AssistantType, OrchestrationRequest, OrchestrationResponse, ToolCallLog, PendingShiftDraft } from "./types";
import { analyzeStaffing } from "./assistants/staffing";
import { analyzeAttendance } from "./assistants/attendance";
import { analyzeRecruitment } from "./assistants/recruitment";
import { analyzePayroll } from "./assistants/payroll";
import { analyzeClientRisk } from "./assistants/client-risk";
import { callClaudeWithTools } from "./anthropic-client";
import { CLAWD_TOOLS, executeTool } from "./tools";
import { db } from "../../db";
import { clawdAssistantRuns } from "@shared/schema";
import { analyzeImageWithGPT, analyzeImageBase64WithGPT } from "../openai-vision";

// ─── Typed Tool Result Helpers ────────────────────────────────────────────────
// Safely extract typed data from tool results (result: unknown) without as any.

interface WorkerResult { id: string | number; name?: string; fullName?: string; }
interface WorkplaceResult { id: string | number; name: string; addressLine1?: string; city?: string; }
interface LookupWorkersOutput { workers: WorkerResult[]; count: number; }
interface LookupWorkplacesOutput { workplaces: WorkplaceResult[]; count: number; }
interface CreateShiftInput { date?: string; startTime?: string; endTime?: string; roleType?: string; }
interface LookupInput { query?: string; phone?: string; }

function asLookupWorkersResult(result: unknown): LookupWorkersOutput {
  if (result && typeof result === "object") {
    const r = result as Record<string, unknown>;
    const workers = Array.isArray(r.workers) ? r.workers : (Array.isArray(r.results) ? r.results : []);
    const count = typeof r.count === "number" ? r.count : workers.length;
    return { workers: workers as WorkerResult[], count };
  }
  return { workers: [], count: 0 };
}

function asLookupWorkplacesResult(result: unknown): LookupWorkplacesOutput {
  if (result && typeof result === "object") {
    const r = result as Record<string, unknown>;
    const workplaces = Array.isArray(r.workplaces) ? r.workplaces : [];
    const count = typeof r.count === "number" ? r.count : workplaces.length;
    return { workplaces: workplaces as WorkplaceResult[], count };
  }
  return { workplaces: [], count: 0 };
}

function asLookupInput(input: unknown): LookupInput {
  if (input && typeof input === "object") {
    const i = input as Record<string, unknown>;
    return { query: typeof i.query === "string" ? i.query : undefined, phone: typeof i.phone === "string" ? i.phone : undefined };
  }
  return {};
}

function asCreateShiftInput(input: unknown): CreateShiftInput {
  if (input && typeof input === "object") {
    const i = input as Record<string, unknown>;
    return {
      date: typeof i.date === "string" ? i.date : undefined,
      startTime: typeof i.startTime === "string" ? i.startTime : undefined,
      endTime: typeof i.endTime === "string" ? i.endTime : undefined,
      roleType: typeof i.roleType === "string" ? i.roleType : undefined,
    };
  }
  return {};
}

function toErrorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (err && typeof err === "object" && "message" in err) return String((err as Record<string, unknown>).message);
  return "Unknown error";
}

const ASSISTANT_MAP: Record<string, (q: string, userId?: string, msgId?: string) => Promise<AssistantOutput>> = {
  staffing: analyzeStaffing,
  attendance: analyzeAttendance,
  recruitment: analyzeRecruitment,
  payroll: analyzePayroll,
  client_risk: analyzeClientRisk,
};

const ASSISTANT_LABELS: Record<string, string> = {
  staffing: "Staffing",
  attendance: "Attendance & Reliability",
  recruitment: "Recruitment Pipeline",
  payroll: "Payroll & Hours",
  client_risk: "Client & Site Risk",
};

// ─── Worker Name Alias Memory (in-memory, per user, session-scoped) ──────────
// Stores resolved mappings: compressedName → workerId, so repeat lookups skip API calls

const workerAliases = new Map<string, Map<string, string>>(); // userId → { alias → workerId }
const ALIAS_EXPIRY_MS = 4 * 60 * 60 * 1000; // 4 hours
const workerAliasTimestamps = new Map<string, number>();

export function setWorkerAlias(userId: string, alias: string, workerId: string) {
  if (!workerAliases.has(userId)) workerAliases.set(userId, new Map());
  workerAliases.get(userId)!.set(alias.toLowerCase().trim(), workerId);
  workerAliasTimestamps.set(userId, Date.now());
}

export function getWorkerAliases(userId: string): Record<string, string> {
  const ts = workerAliasTimestamps.get(userId) ?? 0;
  if (Date.now() - ts > ALIAS_EXPIRY_MS) {
    workerAliases.delete(userId);
    workerAliasTimestamps.delete(userId);
    return {};
  }
  const map = workerAliases.get(userId);
  if (!map) return {};
  const out: Record<string, string> = {};
  map.forEach((v, k) => { out[k] = v; });
  return out;
}

// ─── Pending Shift Draft State (in-memory, per user) ─────────────────────────

const pendingDrafts = new Map<string, PendingShiftDraft>();
const PENDING_EXPIRY_MS = 30 * 60 * 1000; // 30 minutes

export function setPendingDraft(userId: string, draft: Omit<PendingShiftDraft, "userId" | "lastAttempt">) {
  pendingDrafts.set(userId, { ...draft, userId, lastAttempt: Date.now() });
}

export function getPendingDraft(userId: string): PendingShiftDraft | null {
  const draft = pendingDrafts.get(userId);
  if (!draft) return null;
  if (Date.now() - draft.lastAttempt > PENDING_EXPIRY_MS) {
    pendingDrafts.delete(userId);
    return null;
  }
  // Refresh lastAttempt to implement inactivity-based expiry, not creation-time expiry.
  // The draft expires 30 min after the LAST relevant interaction, not after creation.
  draft.lastAttempt = Date.now();
  return draft;
}

export function clearPendingDraft(userId: string) {
  pendingDrafts.delete(userId);
}

// ─── Routing ─────────────────────────────────────────────────────────────────

export function isUselessOutput(output: AssistantOutput): boolean {
  const emptyFindings = output.keyFindings.length === 0 && output.risks.length === 0 && output.recommendedActions.length === 0;
  const fallbackSummary = output.summary === "Analysis unavailable." || output.summary === "" || output.confidenceScore <= 0.3;
  const outOfScopePattern = /outside\s+(the\s+)?scope|out\s+of\s+scope|not\s+designed\s+for\s+this|scoped\s+exclusively|cannot\s+(help|assist|answer)\s+(with\s+)?(this|that)|not\s+within\s+(my|the)\s+scope|beyond\s+(my|the)\s+scope|falls?\s+outside/i;
  const outOfScope = outOfScopePattern.test(output.summary);
  return (emptyFindings && fallbackSummary) || outOfScope;
}

function formatAssistantOutputs(outputs: AssistantOutput[]): string {
  const usefulOutputs = outputs.filter(o => !isUselessOutput(o));

  if (usefulOutputs.length === 0) {
    return "That's outside what my analytics can see — try asking me to check internal messages or Discord instead.";
  }

  const parts: string[] = [];

  if (usefulOutputs.length > 1) {
    const allFindings = usefulOutputs.flatMap(o => o.keyFindings);
    const criticalFindings = allFindings.filter(f => f.severity === "critical" || f.severity === "high");
    if (criticalFindings.length > 0) {
      parts.push("**Priority Alerts:**");
      criticalFindings.slice(0, 5).forEach(f => {
        parts.push(`- [${f.severity.toUpperCase()}] ${f.title}: ${f.detail}`);
      });
      parts.push("");
    }
  }

  for (const output of usefulOutputs) {
    const label = ASSISTANT_LABELS[output.assistantType] || output.assistantType;
    parts.push(`**${label}**`);
    parts.push(output.summary);
    parts.push("");

    if (output.keyFindings.length > 0) {
      output.keyFindings.slice(0, 5).forEach(f => {
        const tag = f.severity === "critical" || f.severity === "high" ? ` [${f.severity.toUpperCase()}]` : "";
        parts.push(`- ${f.title}${tag}: ${f.detail}`);
      });
      parts.push("");
    }

    if (output.risks.length > 0) {
      parts.push("Risks:");
      output.risks.slice(0, 3).forEach(r => {
        parts.push(`- ${r.title} (${r.likelihood} likelihood, ${r.impact} impact): ${r.description}`);
      });
      parts.push("");
    }

    if (output.recommendedActions.length > 0) {
      parts.push("Actions:");
      output.recommendedActions.slice(0, 3).forEach(a => {
        const tag = a.priority === "urgent" || a.priority === "high" ? ` [${a.priority.toUpperCase()}]` : "";
        parts.push(`- ${a.title}${tag}: ${a.description}`);
      });
      parts.push("");
    }
  }

  return parts.join("\n").trim();
}

interface RoutingRule {
  patterns: RegExp[];
  assistants: AssistantType[];
}

const ROUTING_RULES: RoutingRule[] = [
  {
    patterns: [/executive\s*summary/i, /daily\s*briefing/i, /full\s*(report|overview|briefing)/i, /everything/i, /all\s*assistants/i, /complete\s*(analysis|overview)/i],
    assistants: ["staffing", "attendance", "client_risk", "recruitment", "payroll"],
  },
  {
    patterns: [/what\s*(should|do)\s*i\s*worry/i, /priorities?\s*today/i, /urgent|critical\s*(issue|concern)/i, /what('s|\s+is)\s*(going\s+on|happening)/i, /status\s*update/i, /how\s*(are|is)\s*(things|operations)/i],
    assistants: ["staffing", "attendance", "client_risk"],
  },
  {
    patterns: [/unfilled\s*shift/i, /fill\s*rate/i, /schedul(e|ing)/i, /staff(ing|ed)/i, /coverage/i, /allocation/i, /worker\s*(assign|deploy)/i, /shift\s*(gap|short)/i, /overuse/i, /burnout/i, /double.?book/i],
    assistants: ["staffing"],
  },
  {
    patterns: [/reliab(le|ility)/i, /no.?show/i, /late(ness)?/i, /attendance/i, /absent/i, /punctual/i, /clock.?in/i, /tardy/i, /risky\s*worker/i, /worker\s*risk/i, /cancel.*accept/i],
    assistants: ["attendance"],
  },
  {
    patterns: [/recruit/i, /applicant/i, /pipeline/i, /hiring/i, /application/i, /candidate/i, /onboard/i, /shortage/i, /stalled/i, /conversion\s*rate/i],
    assistants: ["recruitment"],
  },
  {
    patterns: [/payroll/i, /overtime/i, /hours?\s*(work|log|track)/i, /timesheet/i, /wage/i, /pay\s*(rate|period)/i, /suspicious\s*pattern/i, /hour\s*integrity/i, /tito\s*correct/i],
    assistants: ["payroll"],
  },
  {
    patterns: [/client\s*risk/i, /site\s*risk/i, /workplace\s*(issue|risk|problem)/i, /gps\s*fail/i, /service\s*reliab/i, /escalat/i, /account\s*health/i],
    assistants: ["client_risk"],
  },
  {
    patterns: [/worker.*(late|reliable|show)/i, /who\s*(is|are).*(late|unreliable|absent)/i],
    assistants: ["attendance", "staffing"],
  },
  {
    patterns: [/site.*(problem|issue|cancel|unstable)/i, /workplace.*(cancel|issue|problem)/i, /why\s*is\s*\w+\s*(unstable|failing|struggling)/i],
    assistants: ["client_risk", "staffing"],
  },
];

// Patterns that trigger action mode from the current message alone
const ACTION_INTENT_PATTERNS: RegExp[] = [
  /\b(assign|add|put)\b.*(worker|staff|person)/i,
  /\b(blast|broadcast|send.*offer|offer.*shift)\b/i,
  /\bcreate\b.*(shift|request|schedule)/i,
  /\bschedule\b.*(shift|worker)/i,
  /\bsend\b.*(sms|text|message|notification)/i,
  /\b(text|sms)\b.*(worker|staff|lilee|gm)/i,
  /\bnotify\b.*(discord|gm|lilee|team)/i,
  /\bcheck\b.*(discord|alert|incoming|sms|message)/i,
  /\bread\b.*(sms|text|message|incoming)/i,
  /\bwho\s+(texted|called|messaged)/i,
  /\bincoming\s+(sms|text|message)/i,
  /\b(sick\s*call|calling\s*in\s*sick|sick\s*day)\b/i,
  /\b(cover|coverage|replacement)\b.*shift/i,
  /\bfind\b.*(replacement|cover|backup|available)/i,
  /\b(remove|cancel|terminate)\b.*(worker|shift|request)/i,
  /\backnowledge\b.*(alert|discord)/i,
  /\bwhat.*(worker|staff)\s*(are|is)\s*available/i,
  /\bavailable\s*(worker|staff)\b/i,
  /\blilee\b/i,
  /\bdiscord\b/i,
  // Shift creation (natural language)
  /\b(book|set|put|schedule)\b.*(at|for)\b/i,
  /\bneed\s+\w+\s+at\s+\w/i,
  /\b(create|make|add)\s+a?\s*shift\b/i,
  // Follow-up replies and confirmations
  /^\s*try\s+\w+/i,
  /^\s*[\d\s\-\+\(\)]{7,15}\s*$/,             // phone number as standalone reply
  /^\s*(yes|yep|yis|yeah|sure|ok|okay|go ahead|go|proceed|do it|confirm|correct|sounds good|perfect|great|absolutely|right|that's right|that works|approved|affirmative|done|send it|do that|exactly|yup)\s*[.!]?\s*$/i, // short confirmations
  /\bcan (i|you) have\b/i,
  /\bi need\s+\d*\s*(hk|housekeep|server|staff)/i,
  /\beven if (you can't|you cannot|there('s| is) no)\b/i,
  /\bapply (same|similar) logic\b/i,
  /\bstill (let us|notify|alert|report)\b/i,
  /\bneed .+ (for|at) (tomorrow|tonight|today)\b/i,
  // Worker/workplace lookup
  /\b(find|look up|search for)\s+(a\s+)?(worker|staff|workplace|hotel)\b/i,
  // Follow-up / update queries (route to action for message/Discord checks)
  /\b(any|get|check|ask\s+for)\b.*(update|reply|response|feedback)\b.*(from|about|on)\b/i,
  /\bany\b.*\breply\b/i,
  /\bfollow[\s\-]?up\b/i,
  /\bupdate\s+on\b/i,
  /\bcheck\s+(if|whether|for)\b.*\b(replied|responded|got\s+back)\b/i,
  // Google Calendar / Gmail
  /\b(send|write|draft|email|e-mail)\b.*(worker|staff|client|team|lilee|gm|hr)/i,
  /\b(email|e-mail|gmail)\b/i,
  /\b(create|add|schedule|book)\b.*(calendar|event|appointment|meeting)/i,
  /\b(list|check|show|what.*(on|in))\b.*(calendar|schedule|events|appointments)/i,
  /\bread\b.*(email|inbox|gmail|e-mail)/i,
  /\bcheck\b.*(email|inbox|gmail|e-mail)/i,
];

// Signals in the last assistant message that indicate an active action conversation
const ACTIVE_ACTION_CONTEXT_SIGNALS = [
  "What I Need From You",
  "what I need from you",
  "Still needed",
  "still needed",
  "Need from you",
  "need from you",
  "Once I confirm",
  "once I confirm",
  "What's the correct",
  "what's the correct",
  "Can you help me",
  "please provide",
  "Please provide",
  "Worker Not Found",
  "worker not found",
  "Not found in system",
  "not found in system",
  "before I can proceed",
  "to proceed with",
  "I'll create the shift",
  "Draft saved",
  "draft saved",
  "just need the worker",
  "Just need the worker",
  "provide a name or phone",
  "phone number or",
  "another name",
  "try a different",
  "Try a different",
  "spelling variation",
  "which workplace",
  "Which workplace",
  // Confirmation-seeking signals — AI asked user to confirm
  "Shall I",
  "shall I",
  "go ahead and",
  "Go ahead and",
  "instead?",
  "instead —",
  "Shall I proceed",
  "shall I proceed",
  "Would you like me to",
  "would you like me to",
  "Do you want me to",
  "do you want me to",
  "Should I",
  "should I",
  "Confirm and I'll",
  "confirm and I'll",
  "Say yes",
  "say yes",
  "Ready to send",
  "ready to send",
  "Want me to",
  "want me to",
  "I can also",
  "i can also",
  "Let me know",
  "let me know",
  "Does that look right",
  "does that look right",
  "Look correct",
  "look correct",
];

function detectActionIntent(userMessage: string): boolean {
  return ACTION_INTENT_PATTERNS.some(p => p.test(userMessage));
}

function detectConversationActionContext(
  history: Array<{ role: string; content: string }>
): boolean {
  if (history.length === 0) return false;
  // Look at the last 4 messages for assistant responses in action mode
  const recent = history.slice(-4);
  const lastAssistant = [...recent].reverse().find(m => m.role === "assistant");
  if (!lastAssistant) return false;
  const content = lastAssistant.content;
  return ACTIVE_ACTION_CONTEXT_SIGNALS.some(signal => content.includes(signal));
}

function hasPendingDraft(userId: string): boolean {
  return getPendingDraft(userId) !== null;
}

function classifyByKeywords(userMessage: string): { assistants: AssistantType[]; reasoning: string } {
  const matchedAssistants = new Set<AssistantType>();
  const matchedPatterns: string[] = [];

  for (const rule of ROUTING_RULES) {
    for (const pattern of rule.patterns) {
      if (pattern.test(userMessage)) {
        rule.assistants.forEach(a => matchedAssistants.add(a));
        matchedPatterns.push(pattern.source);
        break;
      }
    }
  }

  if (matchedAssistants.size === 0) {
    return {
      assistants: ["staffing", "client_risk"],
      reasoning: "No keyword match — using defaults (staffing + client_risk)",
    };
  }

  const MAX_ASSISTANTS = 4;
  const assistants = Array.from(matchedAssistants).slice(0, MAX_ASSISTANTS);

  return {
    assistants,
    reasoning: `Matched patterns: ${matchedPatterns.join(", ")}`,
  };
}

// ─── System Prompts ───────────────────────────────────────────────────────────

function buildActionSystemPrompt(pendingDraft?: PendingShiftDraft | null, aliases?: Record<string, string>): string {
  const now = new Date();
  const torontoDate = now.toLocaleDateString("en-CA", { timeZone: "America/Toronto" });
  const torontoTime = now.toLocaleTimeString("en-CA", { timeZone: "America/Toronto" });

  // Tomorrow's date
  const tomorrow = new Date(now.toLocaleString("en-US", { timeZone: "America/Toronto" }));
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowDate = tomorrow.toISOString().split("T")[0];

  const pendingSection = pendingDraft ? `
## ACTIVE PENDING WORKFLOW — RESUME THIS FIRST
You have an incomplete shift creation in progress. DO NOT start a new workflow.

Pending shift draft:
- Worker query: "${pendingDraft.workerQuery || "unknown"}" — NOT YET RESOLVED
- Workplace: ${pendingDraft.workplaceName || "not found"} (ID: ${pendingDraft.workplaceId || "unknown"})
- Date: ${pendingDraft.date || "unknown — re-parse from conversation history"}
- Time: ${pendingDraft.startTime || "?"} – ${pendingDraft.endTime || "? — re-parse from conversation history"}
${pendingDraft.roleType ? `- Role: ${pendingDraft.roleType}` : ""}
- Missing: ${pendingDraft.missingFields.join(", ")}

The user's current message is likely providing the missing information:
- If it looks like a phone number → use lookup_workers with phone=[message]
- If it looks like a name or spelling variation → use lookup_workers with query=[message]
- If it starts with "try" → strip "try" and search with the remainder
- If the message is a short confirmation (yes, yep, ok, sure, go ahead) → proceed with the shift using the draft details
- After resolving the worker → create the shift with the saved draft details
` : "";

  const aliasSection = aliases && Object.keys(aliases).length > 0 ? `
## Known Worker Aliases (from earlier in this conversation)
These names were already resolved — use the stored IDs directly without calling lookup_workers again:
${Object.entries(aliases).map(([alias, id]) => `- "${alias}" → worker ID: ${id}`).join("\n")}
` : "";

  return `You are Clawd, the WFConnect AI Operations Assistant. You are integrated into a workforce management platform.

You can BOTH analyze data AND take real actions. You have tools to look up information and perform operations.
${pendingSection}${aliasSection}
## Capabilities:
- **Look up** workers, shifts, workplaces, shift requests, incoming SMS
- **Send SMS** to workers for shift coverage requests
- **Notify GM Lilee** (+14166028038) — ALWAYS for sick calls, client requests, urgent staffing
- **Post to Discord** for team-wide visibility
- **Send internal app messages** to workers
- **Create shift requests** in the system
- **Create workplaces** with auto-geocoded coordinates (address → lat/lng)
- **Update workplaces** (name, address, geofence radius, active status)
- **Analyze images** — photos sent by users are automatically analyzed and described for you
- **Create Google Calendar events** — schedule meetings, interviews, shifts, or appointments
- **List upcoming Google Calendar events** — view what's on the calendar
- **Send emails via Gmail** — email workers, clients, or HR with formatted messages
- **Read recent Gmail emails** — check inbox for messages or search by keyword
- **Generate Replit prompts** when a capability is missing

## Operational Rules:
1. Always use lookup tools FIRST before taking action
2. Sick calls / client requests → notify GM Lilee AND Discord every time
3. Be specific: name names, numbers, times in your responses
4. If a tool fails → tell the user exactly why (e.g. "SMS failed: insufficient credits") and suggest next steps
5. Never stop mid-workflow without alerting — fail open
6. Ask only ONE question at a time — never ask multiple things in the same message
7. If a short message (yes/ok/sure/go ahead) follows a question you asked, treat it as confirmation

## Response Format for Staffing Operations:
For ANY shift/worker/staffing task, use this structure:

**Understood:** [1 line — what the user wants]
**Matched:** [what was found; what was NOT found]
**Action taken:** [what was done]
**Still needed:** [only if something is missing — ONE question only]

On successful shift creation, always end with:
✓ **Shift created:** [Worker name] at [Workplace] on [Date], [StartTime]–[EndTime]

Rules:
- Short and operational — no long explanations
- NEVER say "Analysis unavailable" for staffing tasks
- If worker/workplace not found: say so clearly, ask for ONE specific thing (name OR phone, not both)
- If user's message is short and you're mid-task: treat as follow-up answer, not new request
- When shift creation fails due to missing worker: save all other fields and ask ONLY for the worker
- When user says "yes", "ok", "sure", "go ahead", "proceed", "absolutely", "do that", "send it" after you asked a question: treat as confirmation and execute
- Store resolved worker names in memory so you don't re-lookup the same person
- When presenting a shift confirmation, list all details on one line: worker, workplace, date, time range
- Never ask the user to confirm what you can already derive from the conversation

## Shift Creation Rules:

### Worker name parsing (try all variations before giving up):
- "BergelMMJ" → try "Bergel", "MMJ", each part separately
- "Nino" → try first name search
- "try X" → strip "try" and search for X
- phone number only → search by phone

### Workplace alias resolution:
- "Hyatt place" / "Hyatt" → search workplaces for "hyatt"
- "four points" / "4 points" → search for "four points"
- "holiday inn" / "HI" → search for "holiday inn"
- Always use lookup_workplaces, never guess an ID

### Time parsing:
- "8-4:30am" → 08:00 to 04:30 (next day, crosses midnight)
  OR → 08:00 to 16:30 (same day, if end > start and end > 12)
  → Default: if start < end → same day. If end < start and end < 12 → AM next day.
  → Always state the resolved time in your response
- "8am-4:30pm" → 08:00–16:30
- "8 to 4:30" → default to 08:00–16:30 unless context suggests otherwise

### Date:
- "tomorrow" → ${tomorrowDate}
- "tonight" / "today" → ${torontoDate}

Today's date (Toronto): ${torontoDate}
Current time (Toronto): ${torontoTime}`;
}

// ─── Orchestration ────────────────────────────────────────────────────────────

export async function orchestrate(request: OrchestrationRequest): Promise<OrchestrationResponse> {
  const startTime = Date.now();

  const hasImages = (request.imageUrls && request.imageUrls.length > 0) ||
    (request.imageBase64 && request.imageBase64.length > 0);

  if (hasImages) {
    try {
      let imageDescription = "";
      if (request.imageUrls && request.imageUrls.length > 0) {
        imageDescription = await analyzeImageWithGPT(request.imageUrls);
      } else if (request.imageBase64 && request.imageBase64.length > 0) {
        imageDescription = await analyzeImageBase64WithGPT(request.imageBase64);
      }
      if (imageDescription) {
        request = {
          ...request,
          userMessage: `[Image analysis: ${imageDescription}]\n\nUser message: ${request.userMessage}`,
        };
        console.log(`[Clawd] Image analyzed, augmented message (${imageDescription.length} chars)`);
      }
    } catch (err: any) {
      console.error("[Clawd] Image analysis failed (continuing without):", err?.message);
    }
  }

  // forceActionMode bypasses all routing logic — used for Discord @mentions
  if (request.forceActionMode) {
    console.log(`[Clawd] Force action mode (Discord @mention) for: "${request.userMessage.slice(0, 60)}"`);
    const activeDraft = getPendingDraft(request.userId);
    return orchestrateWithTools(request, startTime, activeDraft);
  }

  // Check pending draft first — this always forces action mode
  let activeDraft = getPendingDraft(request.userId);

  // Auto-clear stale draft if user explicitly cancels
  if (activeDraft) {
    const msg = request.userMessage.toLowerCase();
    const clearingKeywords = ["forget", "cancel", "start over", "never mind", "nevermind", "abort", "stop", "reset"];
    const explicitClear = clearingKeywords.some(kw => msg.includes(kw));
    if (explicitClear) {
      clearPendingDraft(request.userId);
      activeDraft = null;
    }
  }

  // Auto-clear draft on genuine topic change: if the only reason for action mode is
  // a pending draft (no action intent in current message, no active action context),
  // and the new message is clearly a multi-word analysis/reporting query, clear the
  // draft and let the analysis path answer the question instead.
  if (
    activeDraft &&
    !detectActionIntent(request.userMessage) &&
    !detectConversationActionContext(request.conversationHistory)
  ) {
    const wordCount = request.userMessage.trim().split(/\s+/).length;
    const isAnalysisQuery = wordCount >= 5 &&
      /\b(payroll|attendance|recruitment|report|analysis|overview|briefing|status|stat|issue|problem|risk|how (are|is)|what('s| is)|give me|show me)\b/i.test(request.userMessage);
    if (isAnalysisQuery) {
      clearPendingDraft(request.userId);
      activeDraft = null;
      console.log(`[Clawd] Draft auto-cleared: topic change detected ("${request.userMessage.slice(0, 50)}")`);
    }
  }

  const hasDraft = !!activeDraft;

  // Route to action mode if:
  // 1. Current message matches action patterns, OR
  // 2. Conversation history shows we're mid-action, OR
  // 3. User has a pending shift draft (after cancel/topic-change check above)
  const isActionMode =
    detectActionIntent(request.userMessage) ||
    detectConversationActionContext(request.conversationHistory) ||
    hasDraft;

  const reason = detectActionIntent(request.userMessage)
    ? "message pattern"
    : detectConversationActionContext(request.conversationHistory)
    ? "conversation context"
    : hasDraft
    ? "pending draft"
    : "analysis";

  console.log(`[Clawd] Routing to ${isActionMode ? "action" : "analysis"} mode (${reason}) for: "${request.userMessage.slice(0, 60)}"`);

  if (isActionMode) {
    return orchestrateWithTools(request, startTime, activeDraft);
  }

  return orchestrateAnalysis(request, startTime);
}

async function orchestrateWithTools(
  request: OrchestrationRequest,
  startTime: number,
  pendingDraft?: PendingShiftDraft | null
): Promise<OrchestrationResponse> {

  const aliases = getWorkerAliases(request.userId);
  const systemPrompt = buildActionSystemPrompt(pendingDraft, aliases);

  const MAX_HISTORY = 20;
  const MAX_MSG_CHARS = 2000;
  const trimmedHistory = request.conversationHistory
    .filter(m => m.role === "user" || m.role === "assistant")
    .slice(-MAX_HISTORY)
    .map(m => m.content.length > MAX_MSG_CHARS
      ? { ...m, content: m.content.slice(0, MAX_MSG_CHARS) + "\n[...truncated]" }
      : m
    );

  // When a pending draft is active, augment short/phone replies so Claude
  // immediately knows they are worker-resolution attempts, not new requests
  let effectiveUserMessage = request.userMessage;
  if (pendingDraft) {
    const trimmed = request.userMessage.trim();
    const isPhoneLike = /^[\d\s\-\+\(\)]{7,15}$/.test(trimmed);
    const isShortNonKeyword = trimmed.split(/\s+/).length <= 3 &&
      !/\b(forget|cancel|start over|nevermind|abort|stop|reset)\b/i.test(trimmed);

    if (isPhoneLike) {
      effectiveUserMessage = `Phone number for worker lookup: ${trimmed}. Use lookup_workers with phone="${trimmed}" to resolve the pending shift draft.`;
    } else if (isShortNonKeyword && !/\b(yes|ok|sure|go ahead|yep|proceed|confirm)\b/i.test(trimmed)) {
      effectiveUserMessage = `Worker name attempt: "${trimmed}". Try lookup_workers with this name to resolve the pending shift draft.`;
    }
    if (effectiveUserMessage !== request.userMessage) {
      console.log(`[Clawd] Draft resume: augmented message for worker resolution`);
    }
  }

  const messages: Array<{ role: "user" | "assistant"; content: string }> = [
    ...trimmedHistory.map(m => ({ role: m.role as "user" | "assistant", content: m.content })),
    { role: "user", content: effectiveUserMessage },
  ];

  let finalResponse = "";
  let toolCalls: ToolCallLog[] = [];

  try {
    const result = await callClaudeWithTools(
      systemPrompt,
      messages,
      CLAWD_TOOLS,
      (toolName, input) => executeTool(toolName, input, request.userId),
      { maxTokens: 2048 }
    );

    finalResponse = result.finalResponse;
    toolCalls = result.toolCalls;

    // Record resolved worker aliases for this session
    for (const tc of toolCalls) {
      if (tc.toolName === "lookup_workers" && tc.success) {
        const { workers } = asLookupWorkersResult(tc.result);
        if (workers.length === 1) {
          const w = workers[0];
          const inp = asLookupInput(tc.input);
          const query = inp.query ?? inp.phone ?? null;
          if (query && w.id) {
            setWorkerAlias(request.userId, query, String(w.id));
            const displayName = w.fullName ?? w.name;
            if (displayName) setWorkerAlias(request.userId, displayName, String(w.id));
          }
        }
      }
    }

    // Determine outcome of tool calls
    const workerLookupSuccess = toolCalls.some(
      tc => tc.toolName === "lookup_workers" && tc.success && asLookupWorkersResult(tc.result).count > 0
    );
    const workerLookupAttempted = toolCalls.some(tc => tc.toolName === "lookup_workers");
    const workerLookupFailed = workerLookupAttempted && !workerLookupSuccess;
    const shiftCreated = toolCalls.some(
      tc => tc.toolName === "create_shift_request" && tc.success
    );

    // Only clear pending draft on successful shift creation or explicit cancel.
    // Do NOT clear merely because worker was found — shift creation may still be pending.
    if (shiftCreated) {
      clearPendingDraft(request.userId);
    }

    // Auto-save pending draft when Claude found a workplace but couldn't resolve the worker.
    // Only save when exactly one workplace matched — avoids silently persisting an
    // incorrect workplace when the query is ambiguous (2+ matches).
    if (workerLookupFailed && !shiftCreated && !pendingDraft) {
      const workplaceTc = toolCalls.find(
        tc => tc.toolName === "lookup_workplaces" && tc.success
      );
      const workerTc = toolCalls.find(tc => tc.toolName === "lookup_workers");
      const shiftTc = toolCalls.find(tc => tc.toolName === "create_shift_request");

      const workerInp = workerTc ? asLookupInput(workerTc.input) : {};
      const workerQuery = workerInp.query ?? workerInp.phone ?? null;

      if (workplaceTc) {
        const { workplaces } = asLookupWorkplacesResult(workplaceTc.result);
        // Only autosave when exactly one workplace matched — prevents silently saving
        // the wrong workplace when the search returned ambiguous results.
        if (workplaces.length === 1) {
          const workplace = workplaces[0];
          // Extract date/time from attempted create_shift_request call if present
          const shiftInp = shiftTc ? asCreateShiftInput(shiftTc.input) : {};

          setPendingDraft(request.userId, {
            type: "create_shift",
            workerQuery,
            workplaceId: String(workplace.id),
            workplaceName: workplace.name,
            date: shiftInp.date ?? null,
            startTime: shiftInp.startTime ?? null,
            endTime: shiftInp.endTime ?? null,
            roleType: shiftInp.roleType ?? null,
            missingFields: ["worker"],
          });
          console.log(`[Clawd] Draft saved: worker="${workerQuery}" workplace="${workplace.name}" date="${shiftInp.date}" time="${shiftInp.startTime}-${shiftInp.endTime}" user=${request.userId}`);
        } else if (workplaces.length > 1) {
          console.log(`[Clawd] Draft NOT saved: ambiguous workplace (${workplaces.length} matches) — user must confirm`);
        }
      }
    }
  } catch (err: unknown) {
    const msg = toErrorMessage(err);
    console.error("[Clawd] Tool-use orchestration failed:", msg);
    finalResponse = `Something went wrong while handling your request: ${msg}. Please try again.`;
  }

  const totalDurationMs = Date.now() - startTime;

  try {
    await db.insert(clawdAssistantRuns).values({
      assistantType: "executive",
      inputContext: JSON.stringify({
        userMessage: request.userMessage,
        mode: "action",
        hasPendingDraft: !!pendingDraft,
        toolsUsed: toolCalls.map(tc => tc.toolName),
      }),
      outputFindings: JSON.stringify({
        response: finalResponse.slice(0, 1000),
        toolCallCount: toolCalls.length,
        toolCalls: toolCalls.slice(0, 5),
        severityScore: 0,
      }),
      durationMs: totalDurationMs,
      userId: request.userId,
    });
  } catch (err) {
    console.error("[Clawd] Failed to log action run:", err);
  }

  return {
    response: finalResponse,
    assistantsInvoked: [],
    assistantOutputs: [],
    overallSeverity: 0,
    isActionMode: true,
    toolCalls,
    metadata: { totalDurationMs, model: "claude-sonnet-4-6" },
  };
}

async function orchestrateAnalysis(request: OrchestrationRequest, startTime: number): Promise<OrchestrationResponse> {
  const classification = classifyByKeywords(request.userMessage);

  const assistantPromises = classification.assistants.map(assistantType => {
    const fn = ASSISTANT_MAP[assistantType];
    if (!fn) return null;
    return fn(request.userMessage, request.userId, undefined).catch(err => {
      console.error(`[Clawd] Assistant ${assistantType} failed:`, err);
      return null;
    });
  });

  const results = await Promise.all(assistantPromises);
  const assistantOutputs = results.filter((r): r is AssistantOutput => r !== null);

  const finalResponse = formatAssistantOutputs(assistantOutputs);

  const overallSeverity = assistantOutputs.length > 0
    ? Math.max(...assistantOutputs.map(o => o.severityScore))
    : 0;

  const totalDurationMs = Date.now() - startTime;

  try {
    await db.insert(clawdAssistantRuns).values({
      assistantType: "executive",
      inputContext: JSON.stringify({
        userMessage: request.userMessage,
        mode: "analysis",
        classification,
        assistantsInvoked: classification.assistants,
      }),
      outputFindings: JSON.stringify({
        response: finalResponse.slice(0, 1000),
        overallSeverity,
        severityScore: overallSeverity,
        assistantCount: assistantOutputs.length,
      }),
      durationMs: totalDurationMs,
      userId: request.userId,
    });
  } catch (err) {
    console.error("[Clawd] Failed to log orchestration run:", err);
  }

  return {
    response: finalResponse,
    assistantsInvoked: classification.assistants,
    assistantOutputs,
    overallSeverity,
    isActionMode: false,
    metadata: { totalDurationMs, model: "claude-sonnet-4-6" },
  };
}

export async function generateBriefing(userId: string): Promise<OrchestrationResponse> {
  return orchestrate({
    userMessage: "Give me today's executive operational briefing. Cover staffing status, attendance concerns, recruitment pipeline, payroll issues, and site risks. Prioritize by urgency.",
    conversationHistory: [],
    userId,
  });
}
