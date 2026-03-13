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
  return draft;
}

export function clearPendingDraft(userId: string) {
  pendingDrafts.delete(userId);
}

// ─── Routing ─────────────────────────────────────────────────────────────────

function formatAssistantOutputs(outputs: AssistantOutput[]): string {
  if (outputs.length === 0) {
    return "No data available at this time. Please try again later.";
  }

  const parts: string[] = [];

  if (outputs.length > 1) {
    const allFindings = outputs.flatMap(o => o.keyFindings);
    const criticalFindings = allFindings.filter(f => f.severity === "critical" || f.severity === "high");
    if (criticalFindings.length > 0) {
      parts.push("**Priority Alerts:**");
      criticalFindings.slice(0, 5).forEach(f => {
        parts.push(`- [${f.severity.toUpperCase()}] ${f.title}: ${f.detail}`);
      });
      parts.push("");
    }
  }

  for (const output of outputs) {
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
  // Follow-up replies
  /^\s*try\s+\w+/i,
  /^\s*[\d\s\-\+\(\)]{7,15}\s*$/,             // phone number as standalone reply
  /\bcan i have\b/i,
  /\bi need\s+\d*\s*(hk|housekeep|server|staff)/i,
  /\beven if (you can't|you cannot|there('s| is) no)\b/i,
  /\bapply (same|similar) logic\b/i,
  /\bstill (let us|notify|alert|report)\b/i,
  /\bneed .+ (for|at) (tomorrow|tonight|today)\b/i,
  // Worker/workplace lookup
  /\b(find|look up|search for)\s+(a\s+)?(worker|staff|workplace|hotel)\b/i,
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

function buildActionSystemPrompt(pendingDraft?: PendingShiftDraft | null): string {
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
- Date: ${pendingDraft.date || "unknown"}
- Time: ${pendingDraft.startTime || "?"} – ${pendingDraft.endTime || "?"}
- Missing: ${pendingDraft.missingFields.join(", ")}

The user's current message is likely providing the missing information:
- If it looks like a phone number → use lookup_workers with phone=[message]
- If it looks like a name or spelling variation → use lookup_workers with query=[message]
- If it starts with "try" → strip "try" and search with the remainder
- After resolving the worker → create the shift with the saved draft details
` : "";

  return `You are Clawd, the WFConnect AI Operations Assistant. You are integrated into a workforce management platform.

You can BOTH analyze data AND take real actions. You have tools to look up information and perform operations.
${pendingSection}
## Capabilities:
- **Look up** workers, shifts, workplaces, shift requests, incoming SMS
- **Send SMS** to workers for shift coverage requests
- **Notify GM Lilee** (+14166028038) — ALWAYS for sick calls, client requests, urgent staffing
- **Post to Discord** for team-wide visibility
- **Send internal app messages** to workers
- **Create shift requests** in the system
- **Generate Replit prompts** when a capability is missing

## Operational Rules:
1. Always use lookup tools FIRST before taking action
2. Sick calls / client requests → notify GM Lilee AND Discord every time
3. Be specific: name names, numbers, times in your responses
4. If a tool fails → log it and continue with remaining steps
5. Never stop mid-workflow without alerting — fail open

## Response Format for Staffing Operations:
For ANY shift/worker/staffing task, use this structure:

**Understood:** [1 line — what the user wants]
**Matched:** [what was found; what was NOT found]
**Action taken:** [what was done]
**Still needed:** [only if something is missing — omit if complete]

Rules:
- Short and operational — no long explanations
- NEVER say "Analysis unavailable" for staffing tasks
- If worker/workplace not found: say so clearly, ask for ONE specific thing
- If user's message is short and you're mid-task: treat as follow-up answer, not new request
- When shift creation fails due to missing worker: save all other fields and ask ONLY for the worker

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

  // Check pending draft first — this always forces action mode
  const draft = getPendingDraft(request.userId);
  const hasDraft = !!draft;

  // Route to action mode if:
  // 1. Current message matches action patterns, OR
  // 2. Conversation history shows we're mid-action, OR
  // 3. User has a pending shift draft
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
    return orchestrateWithTools(request, startTime, draft);
  }

  return orchestrateAnalysis(request, startTime);
}

async function orchestrateWithTools(
  request: OrchestrationRequest,
  startTime: number,
  pendingDraft?: PendingShiftDraft | null
): Promise<OrchestrationResponse> {

  const systemPrompt = buildActionSystemPrompt(pendingDraft);

  const messages: Array<{ role: "user" | "assistant"; content: string }> = [
    ...request.conversationHistory
      .filter(m => m.role === "user" || m.role === "assistant")
      .map(m => ({ role: m.role as "user" | "assistant", content: m.content })),
    { role: "user", content: request.userMessage },
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

    // If Claude successfully looked up a worker AND a workplace, clear the pending draft
    const workerLookupSuccess = toolCalls.some(
      tc => tc.toolName === "lookup_workers" && tc.success && (tc.result as any)?.count > 0
    );
    const shiftCreated = toolCalls.some(
      tc => tc.toolName === "create_shift_request" && tc.success
    );
    if (shiftCreated || (workerLookupSuccess && pendingDraft)) {
      clearPendingDraft(request.userId);
    }
  } catch (err: any) {
    console.error("[Clawd] Tool-use orchestration failed:", err?.message);
    finalResponse = `Something went wrong while handling your request: ${err?.message || "Unknown error"}. Please try again.`;
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
