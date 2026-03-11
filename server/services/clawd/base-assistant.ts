import { callClaude } from "./anthropic-client";
import type { AssistantOutput, AssistantType } from "./types";
import { db } from "../../db";
import { clawdAssistantRuns } from "@shared/schema";

const analyticsCache = new Map<string, { data: Record<string, unknown>; timestamp: number }>();
const CACHE_TTL_MS = 3 * 60 * 1000;

export function getCachedAnalytics(key: string): Record<string, unknown> | null {
  const entry = analyticsCache.get(key);
  if (entry && Date.now() - entry.timestamp < CACHE_TTL_MS) {
    return entry.data;
  }
  analyticsCache.delete(key);
  return null;
}

export function setCachedAnalytics(key: string, data: Record<string, unknown>): void {
  analyticsCache.set(key, { data, timestamp: Date.now() });
}

const STRUCTURED_OUTPUT_INSTRUCTION = `
You MUST respond with valid JSON matching this exact structure:
{
  "summary": "Brief 1-3 sentence summary of findings",
  "keyFindings": [
    { "title": "Finding title", "detail": "Detailed explanation", "category": "category name", "severity": "low|medium|high|critical" }
  ],
  "risks": [
    { "title": "Risk title", "description": "What could go wrong", "likelihood": "low|medium|high", "impact": "low|medium|high|critical", "affectedEntity": "optional entity name", "affectedEntityId": "optional ID" }
  ],
  "supportingEvidence": [
    { "metric": "Metric name", "value": "metric value", "context": "What this means", "period": "optional time period" }
  ],
  "recommendedActions": [
    { "title": "Action title", "description": "What to do", "priority": "low|medium|high|urgent", "category": "category name" }
  ],
  "confidenceScore": 0.85,
  "severityScore": 0.5
}

Rules:
- confidenceScore: 0.0-1.0 (how confident you are in the analysis)
- severityScore: 0.0-1.0 (how urgent/severe the situation is, 0=nothing wrong, 1=critical)
- Only include findings/risks/actions that are supported by the data
- Do NOT invent data or make unsupported claims
- If data is insufficient, say so clearly and lower confidence score
- Keep summaries actionable and business-focused
- Return ONLY the JSON object, no markdown or extra text
`;

export async function runAssistant(
  assistantType: AssistantType,
  domainPrompt: string,
  analyticsData: Record<string, unknown>,
  userQuestion: string,
  userId?: string,
  chatMessageId?: string
): Promise<AssistantOutput> {
  const startTime = Date.now();

  const systemPrompt = `${domainPrompt}

${STRUCTURED_OUTPUT_INSTRUCTION}`;

  const userContent = `## Current Analytics Data
${JSON.stringify(analyticsData, null, 2)}

## User Question
${userQuestion}`;

  const responseText = await callClaude(systemPrompt, [
    { role: "user", content: userContent },
  ]);

  const durationMs = Date.now() - startTime;

  let parsed: Omit<AssistantOutput, "assistantType">;
  try {
    const cleaned = responseText.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    parsed = JSON.parse(cleaned);
  } catch {
    parsed = {
      summary: responseText.slice(0, 500),
      keyFindings: [],
      risks: [],
      supportingEvidence: [],
      recommendedActions: [],
      confidenceScore: 0.3,
      severityScore: 0,
    };
  }

  const output: AssistantOutput = {
    assistantType,
    ...parsed,
  };

  try {
    await db.insert(clawdAssistantRuns).values({
      chatMessageId: chatMessageId ?? null,
      assistantType,
      inputContext: JSON.stringify({ question: userQuestion, dataKeys: Object.keys(analyticsData) }),
      outputFindings: JSON.stringify(output),
      durationMs,
      userId: userId ?? null,
    });
  } catch (err) {
    console.error(`[Clawd] Failed to log assistant run for ${assistantType}:`, err);
  }

  return output;
}
