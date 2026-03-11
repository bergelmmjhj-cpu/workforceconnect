import { callClaude } from "../anthropic-client";
import type { AssistantOutput, AssistantType } from "../types";
import { db } from "../../../db";
import { clawdAssistantRuns } from "@shared/schema";

const SYSTEM_PROMPT = "You are the Communication & Insight Assistant for WFConnect. You transform technical analytics outputs from specialized assistants into clear, actionable business intelligence. Present information as: what changed, why it matters, what to do next. Write in business language, not technical jargon. Organize by priority/urgency.";

export async function synthesizeInsights(
  assistantOutputs: AssistantOutput[],
  userQuestion: string,
  userId?: string,
  chatMessageId?: string
): Promise<string> {
  const startTime = Date.now();

  const userContent = `## Assistant Outputs
${JSON.stringify(assistantOutputs, null, 2)}

## User Question
${userQuestion}`;

  const response = await callClaude(SYSTEM_PROMPT, [
    { role: "user", content: userContent },
  ]);

  const durationMs = Date.now() - startTime;

  try {
    await db.insert(clawdAssistantRuns).values({
      chatMessageId: chatMessageId ?? null,
      assistantType: "communication" as AssistantType,
      inputContext: JSON.stringify({
        question: userQuestion,
        assistantTypes: assistantOutputs.map((o) => o.assistantType),
      }),
      outputFindings: JSON.stringify({ response }),
      durationMs,
      userId: userId ?? null,
    });
  } catch (err) {
    console.error("[Clawd] Failed to log communication assistant run:", err);
  }

  return response;
}
