/**
 * AI Follow-Up SMS Service
 * 
 * When Clawd/AI sends an SMS, this service:
 * 1. Logs the message in ai_message_log
 * 2. After 2 hours with no reply → sends a human-like follow-up
 * 3. If recipient replies → cancels pending follow-up
 */

import { db } from "../db";
import { aiMessageLog } from "../../shared/schema";
import { eq, and, lt, sql } from "drizzle-orm";
import { sendSMS } from "./openphone";
import { nowToronto, formatToronto } from "../utils/time";

const TWO_HOURS_MS = 2 * 60 * 60 * 1000;

const FOLLOWUP_MESSAGES = [
  "Hi! Just checking in — I sent a message a couple hours ago and wanted to make sure you saw it.",
  "Hey, just a quick follow-up in case my earlier message got buried. Let me know if you have any questions!",
  "Hi there — I reached out earlier and wanted to see if you had a chance to read my message.",
  "Just following up on my earlier message! Feel free to reply whenever convenient.",
  "Hey! Checking in to see if everything is okay and if you had a chance to read my last message.",
];

function pickFollowupMessage(recipientPhone: string): string {
  const index = recipientPhone.split("").reduce((sum, c) => sum + c.charCodeAt(0), 0) % FOLLOWUP_MESSAGES.length;
  return FOLLOWUP_MESSAGES[index];
}

export async function logAiMessage(opts: {
  recipientPhone: string;
  recipientName?: string;
  message: string;
  triggeredBy?: string;
  contextNote?: string;
  followupEnabled?: boolean;
}): Promise<string> {
  const now = nowToronto();

  const [record] = await db.insert(aiMessageLog).values({
    recipientPhone: opts.recipientPhone,
    recipientName: opts.recipientName,
    message: opts.message,
    sentAt: now,
    responseReceived: false,
    followupSent: false,
    triggeredBy: opts.triggeredBy || "clawd",
    contextNote: opts.contextNote,
    followupEnabled: opts.followupEnabled ?? false,
  }).returning({ id: aiMessageLog.id });

  console.log(`[AI MESSAGE] Logged message to ${opts.recipientPhone} | id=${record.id} | at=${formatToronto(now)}`);

  return record.id;
}

export async function markResponseReceived(recipientPhone: string): Promise<void> {
  const now = nowToronto();

  const result = await db.update(aiMessageLog)
    .set({
      responseReceived: true,
      responseReceivedAt: now,
    })
    .where(
      and(
        eq(aiMessageLog.recipientPhone, recipientPhone),
        eq(aiMessageLog.responseReceived, false)
      )
    );

  if (result.rowCount && result.rowCount > 0) {
    console.log(`[AI MESSAGE] Response received from ${recipientPhone} — follow-up cancelled | at=${formatToronto(now)}`);
  }
}

export async function runFollowupCheck(): Promise<void> {
  const now = nowToronto();
  const twoHoursAgo = new Date(now.getTime() - TWO_HOURS_MS);

  console.log(`[FOLLOWUP CHECK] Running at ${formatToronto(now)}`);

  const pending = await db.select()
    .from(aiMessageLog)
    .where(
      and(
        eq(aiMessageLog.followupEnabled, true),
        eq(aiMessageLog.responseReceived, false),
        eq(aiMessageLog.followupSent, false),
        lt(aiMessageLog.sentAt, twoHoursAgo)
      )
    );

  if (pending.length === 0) {
    console.log(`[FOLLOWUP CHECK] No pending follow-ups needed`);
    return;
  }

  console.log(`[FOLLOWUP CHECK] Found ${pending.length} message(s) needing follow-up`);

  for (const record of pending) {
    const hoursSince = Math.floor((now.getTime() - record.sentAt.getTime()) / 3600000);
    console.log(`[FOLLOWUP CHECK] ${record.recipientPhone} | ${hoursSince}h since last message`);

    const followupMsg = pickFollowupMessage(record.recipientPhone);

    try {
      await sendSMS(record.recipientPhone, followupMsg);

      await db.update(aiMessageLog)
        .set({
          followupSent: true,
          followupSentAt: now,
          followupMessage: followupMsg,
        })
        .where(eq(aiMessageLog.id, record.id));

      console.log(`[FOLLOWUP SENT] ${record.recipientPhone} | at=${formatToronto(now)} | msg="${followupMsg.slice(0, 60)}..."`);
    } catch (err: any) {
      console.error(`[FOLLOWUP ERROR] Failed to send follow-up to ${record.recipientPhone}:`, err?.message);
    }
  }
}

let followupInterval: ReturnType<typeof setInterval> | null = null;

export function startFollowupScheduler(): void {
  if (followupInterval) return;

  const CHECK_INTERVAL_MS = 15 * 60 * 1000; // Check every 15 minutes

  console.log("[AI FOLLOWUP] Starting follow-up scheduler (checks every 15 min)");

  runFollowupCheck().catch((e) => console.error("[AI FOLLOWUP] Initial check error:", e?.message));

  followupInterval = setInterval(() => {
    runFollowupCheck().catch((e) => console.error("[AI FOLLOWUP] Scheduled check error:", e?.message));
  }, CHECK_INTERVAL_MS);
}
