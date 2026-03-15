import OpenAI from "openai";

const VISION_SYSTEM_PROMPT = `You are a vision analysis assistant for WFConnect, a workforce management platform.
Analyze images in the context of workforce operations: staffing schedules, work sites, worker photos, time sheets, client requests, hotel/venue layouts, etc.
Describe what you see in detail, focusing on operationally relevant information:
- Names, dates, times, locations, phone numbers
- Shift schedules, worker assignments, room numbers
- Any text visible in the image
- Document types (invoice, schedule, ID, etc.)
Be thorough but concise. Extract all actionable data.`;

function getOpenAIClient(): OpenAI {
  return new OpenAI({
    apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
    baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
  });
}

export async function analyzeImageWithGPT(
  imageUrls: string[],
  prompt?: string
): Promise<string> {
  try {
    const client = getOpenAIClient();
    const content: OpenAI.Chat.Completions.ChatCompletionContentPart[] = [];

    if (prompt) {
      content.push({ type: "text", text: prompt });
    } else {
      content.push({
        type: "text",
        text: "Analyze this image in the context of workforce management operations. Extract all relevant details.",
      });
    }

    for (const url of imageUrls) {
      content.push({
        type: "image_url",
        image_url: { url, detail: "high" },
      });
    }

    const response = await client.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: VISION_SYSTEM_PROMPT },
        { role: "user", content },
      ],
    });

    const result = response.choices[0]?.message?.content || "";
    console.log(`[VISION] Analyzed ${imageUrls.length} image URL(s): ${result.slice(0, 100)}...`);
    return result;
  } catch (err: any) {
    console.error("[VISION] Image URL analysis error:", err?.message);
    return "";
  }
}

export async function analyzeImageBase64WithGPT(
  base64Images: string[],
  prompt?: string
): Promise<string> {
  try {
    const client = getOpenAIClient();
    const content: OpenAI.Chat.Completions.ChatCompletionContentPart[] = [];

    if (prompt) {
      content.push({ type: "text", text: prompt });
    } else {
      content.push({
        type: "text",
        text: "Analyze this image in the context of workforce management operations. Extract all relevant details.",
      });
    }

    for (const b64 of base64Images) {
      const dataUri = b64.startsWith("data:") ? b64 : `data:image/jpeg;base64,${b64}`;
      content.push({
        type: "image_url",
        image_url: { url: dataUri, detail: "high" },
      });
    }

    const response = await client.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: VISION_SYSTEM_PROMPT },
        { role: "user", content },
      ],
    });

    const result = response.choices[0]?.message?.content || "";
    console.log(`[VISION] Analyzed ${base64Images.length} base64 image(s): ${result.slice(0, 100)}...`);
    return result;
  } catch (err: any) {
    console.error("[VISION] Base64 image analysis error:", err?.message);
    return "";
  }
}
