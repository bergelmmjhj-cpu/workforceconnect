/**
 * Clawd Auto-Responder
 *
 * Handles smart automatic responses to:
 * - Sick calls / late arrivals / emergencies from workers
 * - Client staffing requests (known AND unknown senders)
 *
 * Fail-open design: unknown senders still generate operational alerts.
 */

import { callClaudeWithTools } from "./anthropic-client";
import { CLAWD_TOOLS, executeTool } from "./tools";
import { sendDiscordNotification } from "../discord";
import { sendSMS, logSMS } from "../openphone";
import { db } from "../../db";
import { smsLogs, discordAlerts } from "../../../shared/schema";
import { eq } from "drizzle-orm";
import type { SmsClassification } from "./sms-classifier";

const GM_LILEE_PHONE = "+14166028038";

// ─── System Prompts ───────────────────────────────────────────────────────────

function buildSickCallPrompt(senderMatched: boolean): string {
  const unknownInstructions = senderMatched ? "" : `
## IMPORTANT: UNMATCHED SENDER — FAIL-OPEN RULES
The sender's phone number is NOT in the system. Do NOT skip or fail.

Follow these steps IMMEDIATELY for unmatched senders:
1. Call notify_gm_lilee with:
   "POSSIBLE CALLOFF from unmatched number [phone]. Message: '[full message]'. Worker may be using personal/alternate number. Manual identification required."
2. Call send_discord_notification with urgency="urgent":
   Title: "Possible Calloff — Unmatched Sender"
   Message: "🔴 POSSIBLE CALLOFF\\nSender: Unmatched number [phone]\\nWorker mentioned: [name if any in message, else 'unknown']\\nReason: [extracted from message]\\nMessage: \\"[full message]\\"\\nAction: Manual review needed — worker not in system"
3. Then try find_available_workers at any relevant workplace as a precaution
   - If a workplace is mentioned in the message, look it up first
   - If no workplace, use lookup_workplaces to list options and pick the most likely
4. DO NOT call lookup_shifts — the worker isn't in the system, no shifts to find

Do NOT return "unknown sender, cannot process". Always alert and act.`;

  return `You are Clawd, the WFConnect AI operations assistant. An inbound SMS has been classified as a staff absence or sick call.

Your job is to respond automatically. Always complete ALL applicable steps.${unknownInstructions}

## For KNOWN workers (Worker ID provided):
1. Use lookup_shifts to find this worker's upcoming shifts today AND tomorrow
2. Use find_available_workers to find replacements at the same workplace(s)
3. Use send_sms to text each available worker (limit 5) asking if they can cover
4. Use notify_gm_lilee with a clear summary:
   "CALLOFF: [worker name] ([phone]) called in sick for shift at [workplace] on [date] at [time]. [N] replacement workers contacted."
5. Use send_discord_notification with urgency="urgent":
   Title: "Staff Calloff — [Worker Name]"
   Message: "🔴 STAFF CALLOFF\\nWorker: [name] ([phone])\\nShift: [date, time, workplace]\\nReason: [extracted or 'not specified']\\nMessage: \\"[original SMS]\\"\\nActions: Notified Lilee · Texted [N] replacement workers"

## Worker SMS template:
"Hi [name], [sick worker] is unable to make their shift at [workplace] on [date] at [time]. Are you available to cover? Reply ACCEPT SHIFT to confirm. - WFConnect"

## Response format to admin:
After completing all steps, summarize:
- Worker name and shift details found (or not found)
- Number of replacement workers contacted
- Whether GM Lilee and Discord were notified

Today's date (Toronto): ${new Date().toLocaleDateString("en-CA", { timeZone: "America/Toronto" })}
Current time (Toronto): ${new Date().toLocaleTimeString("en-CA", { timeZone: "America/Toronto" })}`;
}

function buildClientRequestPrompt(senderMatched: boolean, classification: Partial<SmsClassification>): string {
  const extractedContext = [
    classification.role_requested ? `Role requested: ${classification.role_requested}` : null,
    classification.quantity_requested ? `Quantity: ${classification.quantity_requested}` : null,
    classification.worker_name_mentioned ? `Specific worker requested: ${classification.worker_name_mentioned}` : null,
    classification.shift_date ? `Date: ${classification.shift_date}` : null,
    classification.shift_time ? `Time: ${classification.shift_time}` : null,
    classification.workplace_mentioned ? `Workplace mentioned: ${classification.workplace_mentioned}` : null,
  ].filter(Boolean).join("\n");

  const unknownInstructions = senderMatched ? "" : `
## IMPORTANT: UNMATCHED SENDER — FAIL-OPEN RULES
The client's phone number is NOT in the system. Do NOT fail — still process as a valid request.

Steps for unmatched senders:
1. Call notify_gm_lilee:
   "CLIENT REQUEST from unmatched number [phone]: [qty] [role] requested on [date]. Message: '[full message]'. Manual assignment and client identification needed."
2. Call send_discord_notification with urgency="warning":
   Title: "Client Staffing Request — Unmatched Sender"
   Message: "🟡 CLIENT REQUEST\\nSender: Unmatched number [phone]\\nRequest: [qty] [role] on [date] [time if any]\\nWorkplace: [if mentioned, else 'not confirmed']\\n[If specific worker named]: Requested worker: [name]\\nOriginal: \\"[full message]\\"\\nAction: Review & assign coverage — client not in system"
3. If a specific worker name is mentioned, use lookup_workers to try to find them
4. Use find_available_workers at the most likely workplace
5. DO NOT stop because the sender is unknown`;

  return `You are Clawd, the WFConnect AI operations assistant. An inbound SMS has been classified as a client staffing request.

## Pre-extracted entities from the message:
${extractedContext || "No entities extracted — use message content"}

Your job is to respond automatically. Always complete ALL applicable steps.${unknownInstructions}

## For known clients:
1. Use lookup_workplaces to identify the client's workplace (by phone match or name in message)
2. If a specific worker was requested by name, use lookup_workers to find them
3. Use find_available_workers at the relevant workplace for the requested date
4. Use send_sms to contact available workers about the opportunity (limit 5)
5. Use notify_gm_lilee with summary:
   "CLIENT REQUEST: [workplace/phone] needs [qty] [role] on [date]. [N] workers contacted."
6. Use send_discord_notification with urgency="warning":
   Title: "Client Staffing Request — [Workplace or phone]"
   Message with: quantity, role, date, time, specific worker if requested, workers contacted

## Worker SMS template:
"Hi [name], a client at [workplace] needs [role] coverage on [date] at [time]. Are you available? Reply ACCEPT SHIFT to confirm. - WFConnect"

## Response format:
Summarize: workplace found/not found, role and quantity, workers contacted, alerts sent.

Today's date (Toronto): ${new Date().toLocaleDateString("en-CA", { timeZone: "America/Toronto" })}
Current time (Toronto): ${new Date().toLocaleTimeString("en-CA", { timeZone: "America/Toronto" })}`;
}

// ─── Handlers ─────────────────────────────────────────────────────────────────

export async function handleSickCall(params: {
  workerId: string | null;
  workerName: string;
  workerPhone: string;
  smsMessage: string;
  senderMatched?: boolean;
  classification?: Partial<SmsClassification>;
}) {
  const senderMatched = params.senderMatched ?? !!params.workerId;
  console.log(
    `[AutoResponder] Sick call from ${params.workerName} (${params.workerPhone}) — matched=${senderMatched}`
  );

  const userMessage = `Staff absence SMS received:
- Worker: ${params.workerName}
- Phone: ${params.workerPhone}
- Worker ID: ${params.workerId || "NOT IN SYSTEM — unmatched sender"}
- Sender matched: ${senderMatched}
- Message: "${params.smsMessage}"
- Received: ${new Date().toLocaleString("en-CA", { timeZone: "America/Toronto" })}
${params.classification?.reason ? `- Reason extracted: ${params.classification.reason}` : ""}
${params.classification?.shift_date ? `- Date mentioned: ${params.classification.shift_date}` : ""}

Please handle this ${senderMatched ? "sick call" : "possible calloff"} now. Follow ALL steps in your instructions.`;

  try {
    const { finalResponse, toolCalls } = await callClaudeWithTools(
      buildSickCallPrompt(senderMatched),
      [{ role: "user", content: userMessage }],
      CLAWD_TOOLS,
      (toolName, input) => executeTool(toolName, input, undefined),
      { maxTokens: 2048 }
    );

    const actionsSummary = toolCalls
      .filter(tc => tc.success)
      .map(tc => `${tc.toolName}`)
      .join(", ");

    console.log(`[AutoResponder] Sick call handled. Tools: ${actionsSummary}`);

    const discordCall = toolCalls.find(tc => tc.toolName === "send_discord_notification" && tc.success);
    if (discordCall) {
      const alertId = (discordCall.result as any)?.alertId;
      if (alertId) {
        await db.update(discordAlerts)
          .set({ actionsTaken: actionsSummary })
          .where(eq(discordAlerts.alertId, alertId));
      }
    }

    return { success: true, toolCalls, summary: finalResponse };
  } catch (err: any) {
    console.error("[AutoResponder] Sick call handling failed:", err?.message);

    // Hard fallback — always notify even if Claude fails
    try {
      const label = senderMatched ? params.workerName : `Unmatched number ${params.workerPhone}`;
      const fallbackSms = `[WFConnect] ${senderMatched ? "CALLOFF" : "POSSIBLE CALLOFF"}: ${label} — "${params.smsMessage.slice(0, 120)}". Auto-response failed — handle manually.`;
      await sendSMS(GM_LILEE_PHONE, fallbackSms);
      await logSMS({ phoneNumber: GM_LILEE_PHONE, direction: "outbound", message: fallbackSms, status: "sent" });
      await sendDiscordNotification({
        title: senderMatched ? "Sick Call (Manual Action Required)" : "Possible Calloff — Unmatched Sender",
        message: `${senderMatched ? "🔴" : "🟠"} ${label} reported an absence.\n"${params.smsMessage}"\n\nAuto-response failed — handle manually.`,
        color: "red",
        type: "sick_call",
        sourcePhone: params.workerPhone,
        sourceWorkerId: params.workerId || undefined,
      });
    } catch (fe: any) {
      console.error("[AutoResponder] Fallback notification failed:", fe?.message);
    }

    return { success: false, error: err?.message };
  }
}

export async function handleClientRequest(params: {
  phoneNumber: string;
  smsMessage: string;
  senderMatched?: boolean;
  knownWorkplaceId?: string;
  classification?: Partial<SmsClassification>;
}) {
  const senderMatched = params.senderMatched ?? false;
  console.log(
    `[AutoResponder] Client request from ${params.phoneNumber} — matched=${senderMatched}`
  );

  const classif = params.classification || {};

  const userMessage = `Client staffing request SMS received:
- From phone: ${params.phoneNumber}
- Sender matched to client record: ${senderMatched}
- Message: "${params.smsMessage}"
- Received: ${new Date().toLocaleString("en-CA", { timeZone: "America/Toronto" })}
${classif.role_requested ? `- Role requested: ${classif.role_requested}` : ""}
${classif.quantity_requested ? `- Quantity: ${classif.quantity_requested}` : ""}
${classif.worker_name_mentioned ? `- Specific worker named: ${classif.worker_name_mentioned}` : ""}
${classif.shift_date ? `- Date: ${classif.shift_date}` : ""}
${classif.shift_time ? `- Time: ${classif.shift_time}` : ""}
${classif.workplace_mentioned ? `- Workplace mentioned: ${classif.workplace_mentioned}` : ""}
${params.knownWorkplaceId ? `- Known workplace ID: ${params.knownWorkplaceId}` : ""}

Please handle this staffing request now. Follow ALL steps in your instructions.`;

  try {
    const { finalResponse, toolCalls } = await callClaudeWithTools(
      buildClientRequestPrompt(senderMatched, classif),
      [{ role: "user", content: userMessage }],
      CLAWD_TOOLS,
      (toolName, input) => executeTool(toolName, input, undefined),
      { maxTokens: 2048 }
    );

    console.log(`[AutoResponder] Client request handled. Tools: ${toolCalls.map(tc => tc.toolName).join(", ")}`);
    return { success: true, toolCalls, summary: finalResponse };
  } catch (err: any) {
    console.error("[AutoResponder] Client request handling failed:", err?.message);

    // Hard fallback
    try {
      const fallbackSms = `[WFConnect] CLIENT REQUEST from ${params.phoneNumber}: "${params.smsMessage.slice(0, 120)}". Auto-response failed — handle manually.`;
      await sendSMS(GM_LILEE_PHONE, fallbackSms);
      await logSMS({ phoneNumber: GM_LILEE_PHONE, direction: "outbound", message: fallbackSms, status: "sent" });
      await sendDiscordNotification({
        title: `Client Request${senderMatched ? "" : " — Unmatched Sender"} (Manual Action Required)`,
        message: `🟡 CLIENT REQUEST\nPhone: ${params.phoneNumber}\n${senderMatched ? "" : "⚠️ Sender not in system\n"}Message: "${params.smsMessage}"\n\nAuto-response failed — handle manually.`,
        color: "amber",
        type: "client_request",
        sourcePhone: params.phoneNumber,
      });
    } catch (fe: any) {
      console.error("[AutoResponder] Fallback notification failed:", fe?.message);
    }

    return { success: false, error: err?.message };
  }
}

export async function handleLateArrival(params: {
  workerId: string | null;
  workerName: string;
  workerPhone: string;
  smsMessage: string;
  classification: Partial<SmsClassification>;
}) {
  console.log(`[AutoResponder] Late arrival from ${params.workerName} (${params.workerPhone})`);

  const senderMatched = !!params.workerId;

  const userMessage = `Late arrival SMS received:
- Worker: ${params.workerName}
- Phone: ${params.workerPhone}
- Worker ID: ${params.workerId || "NOT IN SYSTEM"}
- Message: "${params.smsMessage}"
- Received: ${new Date().toLocaleString("en-CA", { timeZone: "America/Toronto" })}
${params.classification?.shift_date ? `- Date: ${params.classification.shift_date}` : ""}

Please handle this late arrival:
1. Use notify_gm_lilee: "LATE ARRIVAL: [worker name] ([phone]) will be late. Message: '[SMS]'"
2. Use send_discord_notification with urgency="warning":
   Title: "Late Arrival — [Worker Name]"
   Message: "🟡 LATE ARRIVAL\nWorker: [name] ([phone])\nMessage: \\"[full SMS]\\"\nAction: Monitoring — may need coverage if significantly late"
3. If worker found: use lookup_shifts to find today's shift details for context
4. Do NOT proactively text replacements unless shift is more than 1 hour away`;

  try {
    const { finalResponse, toolCalls } = await callClaudeWithTools(
      `You are Clawd, the WFConnect AI operations assistant. A worker is running late for their shift.

Today's date (Toronto): ${new Date().toLocaleDateString("en-CA", { timeZone: "America/Toronto" })}
Current time (Toronto): ${new Date().toLocaleTimeString("en-CA", { timeZone: "America/Toronto" })}`,
      [{ role: "user", content: userMessage }],
      CLAWD_TOOLS,
      (toolName, input) => executeTool(toolName, input, undefined),
      { maxTokens: 1024 }
    );

    console.log(`[AutoResponder] Late arrival handled. Tools: ${toolCalls.map(tc => tc.toolName).join(", ")}`);
    return { success: true, toolCalls, summary: finalResponse };
  } catch (err: any) {
    console.error("[AutoResponder] Late arrival handling failed:", err?.message);

    try {
      const fallbackMsg = `[WFConnect] LATE: ${params.workerName} (${params.workerPhone}): "${params.smsMessage.slice(0, 100)}"`;
      await sendSMS(GM_LILEE_PHONE, fallbackMsg);
      await logSMS({ phoneNumber: GM_LILEE_PHONE, direction: "outbound", message: fallbackMsg, status: "sent" });
    } catch {}

    return { success: false, error: err?.message };
  }
}
