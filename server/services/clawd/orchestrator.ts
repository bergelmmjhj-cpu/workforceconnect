import type { AssistantOutput, AssistantType, OrchestrationRequest, OrchestrationResponse, ToolCallLog } from "./types";
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
      output.keyFindings.slice(0, 5).forEach((f) => {
        const tag = f.severity === "critical" || f.severity === "high" ? ` [${f.severity.toUpperCase()}]` : "";
        parts.push(`- ${f.title}${tag}: ${f.detail}`);
      });
      parts.push("");
    }

    if (output.risks.length > 0) {
      parts.push("Risks:");
      output.risks.slice(0, 3).forEach((r) => {
        parts.push(`- ${r.title} (${r.likelihood} likelihood, ${r.impact} impact): ${r.description}`);
      });
      parts.push("");
    }

    if (output.recommendedActions.length > 0) {
      parts.push("Actions:");
      output.recommendedActions.slice(0, 3).forEach((a) => {
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

// Patterns that indicate the user wants Clawd to TAKE AN ACTION (not just analyze)
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
];

function detectActionIntent(userMessage: string): boolean {
  return ACTION_INTENT_PATTERNS.some((p) => p.test(userMessage));
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

const ACTION_MODE_SYSTEM_PROMPT = `You are Clawd, the WFConnect AI Operations Assistant. You are integrated into a workforce management platform that handles staff deployment, shift scheduling, and communications.

You can BOTH analyze data AND take real actions. You have access to tools to look up information and perform operations.

## Your capabilities:
- **Look up** workers, shifts, workplaces, shift requests, and incoming SMS messages
- **Send SMS** to workers asking if they're available to cover shifts
- **Notify GM Lilee** (+14166028038) about critical events — ALWAYS do this for sick calls, client requests, urgent staffing issues
- **Post to Discord** for team-wide visibility
- **Send internal app messages** to workers
- **Create shift requests** in the system
- **Generate Replit AI prompts** when you need a new capability built

## Rules:
1. Always use lookup tools FIRST to find the right IDs and context before taking action
2. For sick calls or client requests: contact available workers AND always notify GM Lilee AND Discord
3. For ANY critical operational event: notify GM Lilee via notify_gm_lilee
4. Be specific in confirmations — tell the user exactly what you did (names, numbers, times)
5. If you cannot do something with your available tools, use generate_replit_prompt to create a clear prompt for Replit AI to build the missing capability

Today's date: ${new Date().toLocaleDateString("en-CA", { timeZone: "America/Toronto" })}
Current time (Toronto): ${new Date().toLocaleTimeString("en-CA", { timeZone: "America/Toronto" })}`;

export async function orchestrate(request: OrchestrationRequest): Promise<OrchestrationResponse> {
  const startTime = Date.now();

  // Detect if the user wants Clawd to take action
  const isActionMode = detectActionIntent(request.userMessage);

  if (isActionMode) {
    return orchestrateWithTools(request, startTime);
  }

  return orchestrateAnalysis(request, startTime);
}

async function orchestrateWithTools(request: OrchestrationRequest, startTime: number): Promise<OrchestrationResponse> {
  console.log(`[Clawd] Action mode detected for: "${request.userMessage.slice(0, 80)}..."`);

  // Build conversation history for Claude
  const messages: Array<{ role: "user" | "assistant"; content: string }> = [
    ...request.conversationHistory
      .filter((m) => m.role === "user" || m.role === "assistant")
      .map((m) => ({ role: m.role as "user" | "assistant", content: m.content })),
    { role: "user", content: request.userMessage },
  ];

  let finalResponse = "";
  let toolCalls: ToolCallLog[] = [];

  try {
    const result = await callClaudeWithTools(
      ACTION_MODE_SYSTEM_PROMPT,
      messages,
      CLAWD_TOOLS,
      (toolName, input) => executeTool(toolName, input, request.userId),
      { maxTokens: 2048 }
    );

    finalResponse = result.finalResponse;
    toolCalls = result.toolCalls;
  } catch (err: any) {
    console.error("[Clawd] Tool-use orchestration failed:", err?.message);
    finalResponse = `I encountered an error while trying to perform this action: ${err?.message || "Unknown error"}. Please try again or rephrase your request.`;
  }

  const totalDurationMs = Date.now() - startTime;

  try {
    await db.insert(clawdAssistantRuns).values({
      assistantType: "executive",
      inputContext: JSON.stringify({
        userMessage: request.userMessage,
        mode: "action",
        toolsUsed: toolCalls.map((tc) => tc.toolName),
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

  const assistantPromises = classification.assistants.map((assistantType) => {
    const fn = ASSISTANT_MAP[assistantType];
    if (!fn) return null;
    return fn(request.userMessage, request.userId, undefined).catch((err) => {
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
