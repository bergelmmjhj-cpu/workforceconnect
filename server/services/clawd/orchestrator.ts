import type { AssistantOutput, AssistantType, OrchestrationRequest, OrchestrationResponse } from "./types";
import { analyzeStaffing } from "./assistants/staffing";
import { analyzeAttendance } from "./assistants/attendance";
import { analyzeRecruitment } from "./assistants/recruitment";
import { analyzePayroll } from "./assistants/payroll";
import { analyzeClientRisk } from "./assistants/client-risk";
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

export async function orchestrate(request: OrchestrationRequest): Promise<OrchestrationResponse> {
  const startTime = Date.now();

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
    metadata: {
      totalDurationMs,
      model: "claude-sonnet-4-6",
    },
  };
}

export async function generateBriefing(userId: string): Promise<OrchestrationResponse> {
  return orchestrate({
    userMessage: "Give me today's executive operational briefing. Cover staffing status, attendance concerns, recruitment pipeline, payroll issues, and site risks. Prioritize by urgency.",
    conversationHistory: [],
    userId,
  });
}
