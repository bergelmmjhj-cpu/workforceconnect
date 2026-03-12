/**
 * Clawd Auto-Responder
 * 
 * Handles smart automatic responses to:
 * - Sick calls from workers (finds replacement, texts available workers, notifies GM + Discord)
 * - Client staffing requests (finds available workers, texts them, notifies GM + Discord)
 */

import { callClaudeWithTools } from "./anthropic-client";
import { CLAWD_TOOLS, executeTool } from "./tools";
import { sendDiscordNotification } from "../discord";
import { sendSMS, logSMS } from "../openphone";
import { db } from "../../db";
import { smsLogs, discordAlerts } from "../../../shared/schema";
import { eq } from "drizzle-orm";

const GM_LILEE_PHONE = "+14166028038";

const SICK_CALL_SYSTEM_PROMPT = `You are Clawd, the WFConnect AI operations assistant. A worker has called in sick via SMS.

Your job is to respond automatically:
1. Use lookup_shifts to find this worker's upcoming shifts today and tomorrow
2. Use find_available_workers to find replacement workers at the same workplace
3. Use send_sms to text each available worker asking if they can cover (keep it short and clear)
4. Use notify_gm_lilee to alert GM Lilee about the sick call and actions taken
5. Use send_discord_notification to post an alert (type: "sick_call", urgency: "urgent")

Text message template for workers:
"Hi [name], [sick worker name] is unable to make their shift at [workplace] on [date] at [time]. Are you available to cover? Please reply ACCEPT SHIFT to confirm. - WFConnect"

Always complete ALL steps. After texting workers, summarize what you did (how many workers contacted, at which workplace, for which shifts).`;

const CLIENT_REQUEST_SYSTEM_PROMPT = `You are Clawd, the WFConnect AI operations assistant. A client or someone has texted requesting staff coverage.

Your job is to respond automatically:
1. Use lookup_workplaces to try to identify the client's workplace (if their phone number matches)
2. Use find_available_workers to find workers available at the relevant workplace
3. Use send_sms to text each available worker about the opportunity
4. Use notify_gm_lilee to alert GM Lilee about the client request and actions taken
5. Use send_discord_notification to post an alert (type: "client_request", urgency: "warning")

Keep worker texts concise:
"Hi [name], a client at [workplace] needs coverage. Are you available? Reply ACCEPT SHIFT to confirm. - WFConnect"

Always complete ALL steps. Summarize what you did at the end.`;

export async function handleSickCall(params: {
  workerId: string | null;
  workerName: string;
  workerPhone: string;
  smsMessage: string;
}) {
  console.log(`[AutoResponder] Handling sick call from ${params.workerName} (${params.workerPhone})`);

  try {
    const userMessage = `Worker sick call received:
- Worker: ${params.workerName}
- Phone: ${params.workerPhone}
- Message: "${params.smsMessage}"
- Worker ID: ${params.workerId || "unknown"}
- Date/Time: ${new Date().toLocaleString("en-CA", { timeZone: "America/Toronto" })}

Please handle this sick call now. Find their shifts, contact available replacements, and notify GM Lilee and Discord.`;

    const { finalResponse, toolCalls } = await callClaudeWithTools(
      SICK_CALL_SYSTEM_PROMPT,
      [{ role: "user", content: userMessage }],
      CLAWD_TOOLS,
      (toolName, input) => executeTool(toolName, input, undefined),
      { maxTokens: 2048 }
    );

    const actionsSummary = toolCalls
      .filter((tc) => tc.success)
      .map((tc) => `${tc.toolName}: ${JSON.stringify(tc.result).slice(0, 100)}`)
      .join(" | ");

    console.log(`[AutoResponder] Sick call handled. Tools used: ${toolCalls.map((tc) => tc.toolName).join(", ")}`);
    console.log(`[AutoResponder] Final response: ${finalResponse.slice(0, 200)}`);

    // Update the discord_alert with actions taken if one was created
    const discordToolCall = toolCalls.find((tc) => tc.toolName === "send_discord_notification" && tc.success);
    if (discordToolCall) {
      const alertId = (discordToolCall.result as any)?.alertId;
      if (alertId) {
        await db.update(discordAlerts).set({ actionsTaken: actionsSummary }).where(eq(discordAlerts.alertId, alertId));
      }
    }

    return { success: true, toolCalls, summary: finalResponse };
  } catch (err: any) {
    console.error("[AutoResponder] Sick call handling failed:", err?.message);

    // Fallback: at minimum notify GM Lilee directly
    try {
      const fallbackMsg = `[WFConnect] SICK CALL: ${params.workerName} (${params.workerPhone}) called in sick. Message: "${params.smsMessage}". Auto-response failed — please handle manually.`;
      await sendSMS(GM_LILEE_PHONE, fallbackMsg);
      await logSMS({ phoneNumber: GM_LILEE_PHONE, direction: "outbound", message: fallbackMsg, status: "sent" });
      await sendDiscordNotification({
        title: "Sick Call (Manual Action Required)",
        message: `${params.workerName} called in sick.\n"${params.smsMessage}"\n\nAuto-response failed. Please handle manually.`,
        color: "red",
        type: "sick_call",
        sourcePhone: params.workerPhone,
        sourceWorkerId: params.workerId || undefined,
      });
    } catch (fallbackErr: any) {
      console.error("[AutoResponder] Fallback notification also failed:", fallbackErr?.message);
    }

    return { success: false, error: err?.message };
  }
}

export async function handleClientRequest(params: {
  phoneNumber: string;
  smsMessage: string;
  knownWorkplaceId?: string;
}) {
  console.log(`[AutoResponder] Handling client request from ${params.phoneNumber}`);

  try {
    const today = new Date().toISOString().split("T")[0];

    const userMessage = `Client staffing request received:
- From phone: ${params.phoneNumber}
- Message: "${params.smsMessage}"
- Date/Time: ${new Date().toLocaleString("en-CA", { timeZone: "America/Toronto" })}
${params.knownWorkplaceId ? `- Possible workplace ID: ${params.knownWorkplaceId}` : ""}

Please handle this staffing request now. Identify the workplace if possible, find available workers, contact them, and notify GM Lilee and Discord.`;

    const { finalResponse, toolCalls } = await callClaudeWithTools(
      CLIENT_REQUEST_SYSTEM_PROMPT,
      [{ role: "user", content: userMessage }],
      CLAWD_TOOLS,
      (toolName, input) => executeTool(toolName, input, undefined),
      { maxTokens: 2048 }
    );

    console.log(`[AutoResponder] Client request handled. Tools used: ${toolCalls.map((tc) => tc.toolName).join(", ")}`);

    return { success: true, toolCalls, summary: finalResponse };
  } catch (err: any) {
    console.error("[AutoResponder] Client request handling failed:", err?.message);

    // Fallback: notify GM Lilee
    try {
      const fallbackMsg = `[WFConnect] CLIENT REQUEST: ${params.phoneNumber} texted: "${params.smsMessage}". Auto-response failed — please handle manually.`;
      await sendSMS(GM_LILEE_PHONE, fallbackMsg);
      await logSMS({ phoneNumber: GM_LILEE_PHONE, direction: "outbound", message: fallbackMsg, status: "sent" });
      await sendDiscordNotification({
        title: "Client Request (Manual Action Required)",
        message: `Phone: ${params.phoneNumber}\nMessage: "${params.smsMessage}"\n\nAuto-response failed. Please handle manually.`,
        color: "blue",
        type: "client_request",
        sourcePhone: params.phoneNumber,
      });
    } catch (fallbackErr: any) {
      console.error("[AutoResponder] Fallback notification failed:", fallbackErr?.message);
    }

    return { success: false, error: err?.message };
  }
}
