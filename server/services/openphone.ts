import { db } from "../db";
import { smsLogs, users, shifts, shiftOffers, workplaces } from "../../shared/schema";
import { eq, and, desc } from "drizzle-orm";

const OPENPHONE_API_KEY = process.env.OPENPHONE_API_KEY;
const OPENPHONE_PHONE_NUMBER_ID = "PNo1n737XV";
const OPENPHONE_FROM_NUMBER = "+12896705697";

interface SendSMSResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

export async function sendSMS(toPhoneNumber: string, message: string): Promise<SendSMSResult> {
  if (!OPENPHONE_API_KEY) {
    console.error("[OPENPHONE] API key not configured");
    return { success: false, error: "API key not configured" };
  }

  const cleaned = toPhoneNumber.replace(/[^\d+]/g, "");
  const formatted = cleaned.startsWith("+") ? cleaned : `+1${cleaned}`;

  try {
    const response = await fetch("https://api.openphone.com/v1/messages", {
      method: "POST",
      headers: {
        "Authorization": OPENPHONE_API_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        content: message,
        from: OPENPHONE_PHONE_NUMBER_ID,
        to: [formatted],
      }),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      console.error(`[OPENPHONE] SMS send failed (${response.status}):`, errorBody);
      return { success: false, error: `HTTP ${response.status}: ${errorBody}` };
    }

    const data = await response.json() as any;
    console.log(`[OPENPHONE] SMS sent to ${formatted}`);
    return { success: true, messageId: data?.data?.id || data?.id };
  } catch (error: any) {
    console.error("[OPENPHONE] SMS send error:", error?.message || error);
    return { success: false, error: error?.message || "Unknown error" };
  }
}

async function logSMS(params: {
  phoneNumber: string;
  direction: "outbound" | "inbound";
  message: string;
  shiftOfferId?: string;
  shiftId?: string;
  workerId?: string;
  status: string;
  openphoneMessageId?: string;
}) {
  try {
    await db.insert(smsLogs).values({
      phoneNumber: params.phoneNumber,
      direction: params.direction,
      message: params.message,
      shiftOfferId: params.shiftOfferId || null,
      shiftId: params.shiftId || null,
      workerId: params.workerId || null,
      status: params.status,
      openphoneMessageId: params.openphoneMessageId || null,
    });
  } catch (e: any) {
    console.error("[OPENPHONE] Failed to log SMS:", e?.message);
  }
}

export async function sendShiftOfferSMS(
  worker: { id: string; fullName: string; phone?: string | null },
  shift: { id: string; title: string; date: string; startTime: string; endTime?: string | null; workplaceId: string },
  offerId: string
) {
  if (!worker.phone) {
    console.log(`[OPENPHONE] Worker ${worker.fullName} has no phone number, skipping SMS`);
    return;
  }

  let workplaceName = "Unknown Location";
  try {
    const [wp] = await db.select({ name: workplaces.name }).from(workplaces).where(eq(workplaces.id, shift.workplaceId));
    if (wp?.name) workplaceName = wp.name;
  } catch {}

  const timeRange = shift.endTime ? `${shift.startTime} - ${shift.endTime}` : `${shift.startTime} (open-ended)`;

  const message = `WFConnect Shift Available!\n\n` +
    `${shift.title}\n` +
    `Date: ${shift.date}\n` +
    `Time: ${timeRange}\n` +
    `Location: ${workplaceName}\n\n` +
    `Reply ACCEPT SHIFT to accept or DECLINE SHIFT to decline.`;

  const result = await sendSMS(worker.phone, message);

  await logSMS({
    phoneNumber: worker.phone,
    direction: "outbound",
    message,
    shiftOfferId: offerId,
    shiftId: shift.id,
    workerId: worker.id,
    status: result.success ? "sent" : "failed",
    openphoneMessageId: result.messageId,
  });
}

export async function sendShiftAssignedSMS(
  worker: { id: string; fullName: string; phone?: string | null },
  shift: { id: string; title: string; date: string; startTime: string; endTime?: string | null; workplaceId: string }
) {
  if (!worker.phone) {
    console.log(`[OPENPHONE] Worker ${worker.fullName} has no phone number, skipping SMS`);
    return;
  }

  let workplaceName = "Unknown Location";
  try {
    const [wp] = await db.select({ name: workplaces.name }).from(workplaces).where(eq(workplaces.id, shift.workplaceId));
    if (wp?.name) workplaceName = wp.name;
  } catch {}

  const timeRange = shift.endTime ? `${shift.startTime} - ${shift.endTime}` : `${shift.startTime} (open-ended)`;

  const message = `WFConnect Shift Assigned!\n\n` +
    `${shift.title}\n` +
    `Date: ${shift.date}\n` +
    `Time: ${timeRange}\n` +
    `Location: ${workplaceName}\n\n` +
    `You have been assigned to this shift. Please confirm your availability.`;

  const result = await sendSMS(worker.phone, message);

  await logSMS({
    phoneNumber: worker.phone,
    direction: "outbound",
    message,
    shiftId: shift.id,
    workerId: worker.id,
    status: result.success ? "sent" : "failed",
    openphoneMessageId: result.messageId,
  });
}

export async function sendConfirmationSMS(phoneNumber: string, message: string, workerId?: string) {
  const result = await sendSMS(phoneNumber, message);

  await logSMS({
    phoneNumber,
    direction: "outbound",
    message,
    workerId,
    status: result.success ? "sent" : "failed",
    openphoneMessageId: result.messageId,
  });
}

export { logSMS };
