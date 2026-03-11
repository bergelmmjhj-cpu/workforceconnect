import { callClaude } from "./anthropic-client";
import type { AssistantOutput, AssistantType, OrchestrationRequest, OrchestrationResponse } from "./types";
import { analyzeStaffing } from "./assistants/staffing";
import { analyzeAttendance } from "./assistants/attendance";
import { analyzeRecruitment } from "./assistants/recruitment";
import { analyzePayroll } from "./assistants/payroll";
import { analyzeClientRisk } from "./assistants/client-risk";
import { synthesizeInsights } from "./assistants/communication";
import { db } from "../../db";
import { clawdAssistantRuns } from "@shared/schema";

const ASSISTANT_MAP: Record<string, (q: string, userId?: string, msgId?: string) => Promise<AssistantOutput>> = {
  staffing: analyzeStaffing,
  attendance: analyzeAttendance,
  recruitment: analyzeRecruitment,
  payroll: analyzePayroll,
  client_risk: analyzeClientRisk,
};

const CLASSIFICATION_PROMPT = `You are the Clawd Executive, the central orchestrator for WFConnect's multi-agent business intelligence system. Your job is to classify incoming requests and decide which specialized assistants should handle them.

Available assistants:
- staffing: Understands shift scheduling, fill rates, worker allocation, unfilled shifts, overused workers, scheduling conflicts
- attendance: Monitors worker reliability — no-shows, lateness, accept-then-cancel patterns, reliability scores and trends
- recruitment: Analyzes applicant pipeline — stalled applicants, conversion rates, chronic shortage roles, pipeline velocity
- payroll: Detects hours/timesheet irregularities — scheduled vs worked hours, overtime risk, suspicious patterns, missing timesheets
- client_risk: Evaluates site/account-level health — cancellations, no-show rates, GPS failures, service reliability trends

Routing rules:
- "What should I worry about today?" → staffing, attendance, client_risk
- "Executive summary" or "daily briefing" → staffing, attendance, client_risk, recruitment, payroll
- Questions about specific workers → attendance, staffing
- Questions about specific sites/workplaces → client_risk, staffing
- Questions about hiring/applicants → recruitment
- Questions about hours/pay/overtime → payroll
- Questions about reliability/no-shows/lateness → attendance
- Questions about unfilled shifts/scheduling → staffing
- General operational health → staffing, attendance, client_risk
- If unsure, include staffing and client_risk as defaults

Respond with ONLY a JSON object:
{
  "assistants": ["staffing", "attendance"],
  "reasoning": "Brief explanation of why these assistants were chosen"
}

Do not include any text outside the JSON.`;

interface ClassificationResult {
  assistants: AssistantType[];
  reasoning: string;
}

async function classifyRequest(userMessage: string, conversationHistory: Array<{ role: string; content: string }>): Promise<ClassificationResult> {
  const contextSummary = conversationHistory.length > 0
    ? `\nRecent conversation context:\n${conversationHistory.slice(-4).map(m => `${m.role}: ${m.content.slice(0, 200)}`).join("\n")}`
    : "";

  const response = await callClaude(CLASSIFICATION_PROMPT, [
    { role: "user", content: `${userMessage}${contextSummary}` },
  ], { temperature: 0.1 });

  try {
    const cleaned = response.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    const parsed = JSON.parse(cleaned);
    const validAssistants = (parsed.assistants || []).filter(
      (a: string) => a in ASSISTANT_MAP
    ) as AssistantType[];

    if (validAssistants.length === 0) {
      return { assistants: ["staffing", "client_risk"], reasoning: "Default routing" };
    }
    return { assistants: validAssistants, reasoning: parsed.reasoning || "" };
  } catch {
    return { assistants: ["staffing", "client_risk"], reasoning: "Classification parse failed, using defaults" };
  }
}

export async function orchestrate(request: OrchestrationRequest): Promise<OrchestrationResponse> {
  const startTime = Date.now();

  const classification = await classifyRequest(request.userMessage, request.conversationHistory);

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

  const finalResponse = await synthesizeInsights(
    assistantOutputs,
    request.userMessage,
    request.userId,
    undefined
  );

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
