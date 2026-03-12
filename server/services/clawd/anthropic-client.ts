import Anthropic from "@anthropic-ai/sdk";

const MODEL = "claude-sonnet-4-6";
const MAX_TOKENS = 2048;
const MAX_TOOL_ITERATIONS = 8;

export function getAnthropicClient(): Anthropic {
  return new Anthropic({
    apiKey: process.env.AI_INTEGRATIONS_ANTHROPIC_KEY || process.env.AI_INTEGRATIONS_ANTHROPIC_API_KEY,
    baseURL: process.env.AI_INTEGRATIONS_ANTHROPIC_BASE_URL,
  });
}

export async function callClaude(
  systemPrompt: string,
  messages: Array<{ role: "user" | "assistant"; content: string }>,
  options?: { maxTokens?: number; temperature?: number }
): Promise<string> {
  const client = getAnthropicClient();
  const response = await client.messages.create({
    model: MODEL,
    max_tokens: options?.maxTokens ?? MAX_TOKENS,
    temperature: options?.temperature ?? 0.3,
    system: systemPrompt,
    messages,
  });

  const textBlock = response.content.find((block) => block.type === "text");
  return textBlock?.text ?? "";
}

export interface ToolCallLog {
  toolName: string;
  input: Record<string, unknown>;
  result: unknown;
  success: boolean;
  error?: string;
}

export interface ToolUseResult {
  finalResponse: string;
  toolCalls: ToolCallLog[];
}

export async function callClaudeWithTools(
  systemPrompt: string,
  messages: Array<{ role: "user" | "assistant"; content: string }>,
  tools: Anthropic.Tool[],
  toolExecutor: (toolName: string, input: Record<string, unknown>) => Promise<unknown>,
  options?: { maxTokens?: number; temperature?: number }
): Promise<ToolUseResult> {
  const client = getAnthropicClient();
  const toolCalls: ToolCallLog[] = [];

  // Build the initial messages array in Anthropic format
  let apiMessages: Anthropic.MessageParam[] = messages.map((m) => ({
    role: m.role,
    content: m.content,
  }));

  let iterations = 0;

  while (iterations < MAX_TOOL_ITERATIONS) {
    iterations++;

    const response = await client.messages.create({
      model: MODEL,
      max_tokens: options?.maxTokens ?? MAX_TOKENS,
      temperature: options?.temperature ?? 0.3,
      system: systemPrompt,
      messages: apiMessages,
      tools,
    });

    // If Claude is done (no tool use blocks), return the final text
    if (response.stop_reason === "end_turn" || !response.content.some((b) => b.type === "tool_use")) {
      const textBlock = response.content.find((b) => b.type === "text");
      return {
        finalResponse: (textBlock as Anthropic.TextBlock)?.text ?? "Done.",
        toolCalls,
      };
    }

    // Append Claude's response (with tool_use blocks) to the conversation
    apiMessages.push({ role: "assistant", content: response.content });

    // Execute all tool_use blocks in this response
    const toolResultContents: Anthropic.ToolResultBlockParam[] = [];

    for (const block of response.content) {
      if (block.type !== "tool_use") continue;

      const toolBlock = block as Anthropic.ToolUseBlock;
      const input = toolBlock.input as Record<string, unknown>;

      let result: unknown;
      let success = true;
      let errorMsg: string | undefined;

      try {
        result = await toolExecutor(toolBlock.name, input);
        console.log(`[Clawd Tools] Executed ${toolBlock.name}:`, JSON.stringify(result).slice(0, 200));
      } catch (err: any) {
        success = false;
        errorMsg = err?.message || "Tool execution failed";
        result = { error: errorMsg };
        console.error(`[Clawd Tools] Error executing ${toolBlock.name}:`, errorMsg);
      }

      toolCalls.push({
        toolName: toolBlock.name,
        input,
        result,
        success,
        error: errorMsg,
      });

      toolResultContents.push({
        type: "tool_result",
        tool_use_id: toolBlock.id,
        content: JSON.stringify(result),
      });
    }

    // Feed all tool results back to Claude
    apiMessages.push({ role: "user", content: toolResultContents });
  }

  // Hit iteration cap — return whatever we have
  const lastAssistantMsg = [...apiMessages].reverse().find((m) => m.role === "assistant");
  let finalText = "I completed several actions but reached the maximum steps. Here is what I did:";
  if (lastAssistantMsg && typeof lastAssistantMsg.content === "string") {
    finalText = lastAssistantMsg.content;
  } else if (Array.isArray(lastAssistantMsg?.content)) {
    const tb = (lastAssistantMsg!.content as Anthropic.ContentBlock[]).find((b) => b.type === "text");
    if (tb) finalText = (tb as Anthropic.TextBlock).text;
  }

  return { finalResponse: finalText, toolCalls };
}

export { MODEL, MAX_TOKENS };
