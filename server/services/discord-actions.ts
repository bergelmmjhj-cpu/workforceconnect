import { db } from "../db";
import { discordAlerts, users, workplaces, workplaceAssignments, shifts, shiftRequests, conversations, messages } from "../../shared/schema";
import { eq, and, ilike, sql } from "drizzle-orm";
import { sendSMS, logSMS } from "./openphone";
import { sendDiscordNotification, acknowledgeAlert } from "./discord";

const GM_LILEE_PHONE = "+14166028038";

export interface DiscordActionContext {
  intent: string;
  args: Record<string, string>;
  alertId: string | null;
  alert: typeof discordAlerts.$inferSelect | null;
  discordUserId: string;
  discordUsername: string;
  rawMessage: string;
}

interface ActionResult {
  success: boolean;
  message: string;
}

export async function executeDiscordAction(ctx: DiscordActionContext): Promise<ActionResult> {
  switch (ctx.intent) {
    case "acknowledge":
      return handleAcknowledge(ctx);
    case "assign_worker":
      return handleAssignWorker(ctx);
    case "list_available":
      return handleListAvailable(ctx);
    case "resend_sms":
      return handleResendSms(ctx);
    case "notify_gm_lilee":
      return handleNotifyGmLilee(ctx);
    case "notify_client":
      return handleNotifyClient(ctx);
    case "mark_resolved":
      return handleMarkResolved(ctx);
    case "mark_unresolved":
      return handleMarkUnresolved(ctx);
    case "escalate":
      return handleEscalate(ctx);
    case "summarize":
      return handleSummarize(ctx);
    default:
      return { success: false, message: `**Understood:** ${ctx.intent}\n**Blocked:** Unknown action type\n**Need:** Try \`/clawd help\` for available commands` };
  }
}

async function handleAcknowledge(ctx: DiscordActionContext): Promise<ActionResult> {
  if (!ctx.alertId) {
    return { success: false, message: "**Understood:** Acknowledge alert\n**Blocked:** No alert ID found in context\n**Need:** Reply to a specific alert message or include the WFC-XXXX ID" };
  }

  const success = await acknowledgeAlert(ctx.alertId, ctx.discordUsername, `Acknowledged via Discord by ${ctx.discordUsername}`);
  if (success) {
    return { success: true, message: `**Understood:** Acknowledge alert ${ctx.alertId}\n**Action:** Status updated to acknowledged\n**Result:** Alert ${ctx.alertId} acknowledged by ${ctx.discordUsername}` };
  }
  return { success: false, message: `**Understood:** Acknowledge alert ${ctx.alertId}\n**Blocked:** Alert not found in system\n**Need:** Verify the alert ID is correct` };
}

async function handleAssignWorker(ctx: DiscordActionContext): Promise<ActionResult> {
  const workerQuery = ctx.args.workerQuery;
  if (!workerQuery) {
    return { success: false, message: "**Understood:** Assign a worker\n**Blocked:** No worker name provided\n**Still needed:** Specify who to assign, e.g. `assign Nino`" };
  }

  const workers = await db.select({
    id: users.id,
    fullName: users.fullName,
    phone: users.phone,
    workerRoles: users.workerRoles,
  }).from(users).where(and(
    eq(users.role, "worker"),
    eq(users.isActive, true),
    ilike(users.fullName, `%${workerQuery}%`),
  )).limit(5);

  if (workers.length === 0) {
    return { success: false, message: `**Understood:** Assign "${workerQuery}"\n**Blocked:** No worker found matching "${workerQuery}"\n**Still needed:** Try a different name or check spelling` };
  }

  if (workers.length > 1) {
    const list = workers.map(w => `- ${w.fullName} (${w.phone || "no phone"})`).join("\n");
    return { success: false, message: `**Understood:** Assign "${workerQuery}"\n**Blocked:** Multiple matches found:\n${list}\n**Still needed:** Be more specific with the name` };
  }

  const worker = workers[0];
  const alertInfo = ctx.alert ? `\nAlert: ${ctx.alertId} — ${ctx.alert.title}` : "";
  const actions: string[] = [];

  if (ctx.alert?.workplaceId && ctx.alert?.shiftId) {
    try {
      const today = new Date().toLocaleDateString("en-CA", { timeZone: "America/Toronto" });
      const [adminUser] = await db.select({ id: users.id }).from(users)
        .where(and(eq(users.role, "admin"), eq(users.isActive, true)))
        .limit(1);

      if (adminUser) {
        const [newRequest] = await db.insert(shiftRequests).values({
          clientId: adminUser.id,
          workplaceId: ctx.alert.workplaceId,
          roleType: worker.workerRoles || "general",
          date: today,
          startTime: "08:00",
          endTime: "16:00",
          notes: `Auto-created via Discord assign command by ${ctx.discordUsername}`,
          status: "submitted",
        }).returning();
        actions.push(`Shift request created (ID: ${newRequest.id})`);
      }
    } catch (err: any) {
      console.error("[DISCORD ACTIONS] Shift request creation failed:", err?.message);
    }
  }

  if (worker.phone) {
    const smsBody = `Hi ${worker.fullName.split(" ")[0]}, you've been assigned to cover a shift. Please check WFConnect for details or reply to confirm. — WFConnect`;
    try {
      await sendSMS(worker.phone, smsBody);
      await logSMS(worker.phone, smsBody, "outbound", worker.id, "clawd_discord_assign");
      actions.push("SMS notification sent");
    } catch (smsErr: any) {
      console.error("[DISCORD ACTIONS] SMS send failed:", smsErr?.message);
      actions.push("SMS send failed");
    }
  }

  if (ctx.alertId) {
    try {
      await db.update(discordAlerts)
        .set({ status: "acknowledged", acknowledgedBy: ctx.discordUsername, acknowledgedAt: new Date(), responseNote: `Assigned ${worker.fullName} via Discord` })
        .where(eq(discordAlerts.alertId, ctx.alertId));
      actions.push("Alert acknowledged");
    } catch {}
  }

  const actionSummary = actions.length > 0 ? actions.join(", ") : "Worker identified";
  return {
    success: true,
    message: `**Understood:** Assign ${worker.fullName} to coverage${alertInfo}\n**Action:** ${actionSummary}\n**Result:** ${worker.fullName} (${worker.phone || "no phone"}) has been notified\n**Still needed:** Worker needs to confirm availability`,
  };
}

async function handleListAvailable(ctx: DiscordActionContext): Promise<ActionResult> {
  const workplaceId = ctx.alert?.workplaceId;
  const today = new Date().toLocaleDateString("en-CA", { timeZone: "America/Toronto" });

  if (!workplaceId) {
    const allWorkers = await db.select({
      id: users.id,
      fullName: users.fullName,
      phone: users.phone,
    }).from(users).where(and(eq(users.role, "worker"), eq(users.isActive, true))).limit(15);

    if (allWorkers.length === 0) {
      return { success: true, message: "**Understood:** List available workers\n**Result:** No active workers found in the system" };
    }

    const busyRows = await db.select({ workerUserId: shifts.workerUserId }).from(shifts)
      .where(and(eq(shifts.date, today), sql`${shifts.status} != 'cancelled'`));
    const busyIds = new Set(busyRows.map(r => r.workerUserId).filter(Boolean));
    const available = allWorkers.filter(w => !busyIds.has(w.id));
    const busy = allWorkers.filter(w => busyIds.has(w.id));

    const list = available.map(w => `- ${w.fullName} (${w.phone || "no phone"})`).join("\n");
    return { success: true, message: `**Understood:** List available workers for ${today}\n**Result:** ${available.length} available (${busy.length} already scheduled):\n${list}` };
  }

  const assignments = await db.select({
    workerUserId: workplaceAssignments.workerUserId,
  }).from(workplaceAssignments).where(and(
    eq(workplaceAssignments.workplaceId, workplaceId),
    eq(workplaceAssignments.status, "active"),
  ));

  if (assignments.length === 0) {
    return { success: true, message: `**Understood:** List available workers for workplace\n**Result:** No workers assigned to this workplace` };
  }

  const assignedIds = assignments.map(a => a.workerUserId);
  const busyRows = await db.select({ workerUserId: shifts.workerUserId }).from(shifts)
    .where(and(eq(shifts.date, today), sql`${shifts.workerUserId} = ANY(${assignedIds})`, sql`${shifts.status} != 'cancelled'`));
  const busyIds = new Set(busyRows.map(r => r.workerUserId).filter(Boolean));
  const availableIds = assignedIds.filter(id => !busyIds.has(id));

  if (availableIds.length === 0) {
    return { success: true, message: `**Understood:** List available workers\n**Result:** All ${assignedIds.length} assigned worker(s) are already scheduled on ${today}\n**Still needed:** Consider checking other dates or sending a shift offer blast` };
  }

  const workerDetails = await db.select({
    id: users.id,
    fullName: users.fullName,
    phone: users.phone,
  }).from(users).where(and(eq(users.isActive, true), sql`${users.id} = ANY(${availableIds})`));

  const list = workerDetails.map(w => `- ${w.fullName} (${w.phone || "no phone"})`).join("\n");
  return { success: true, message: `**Understood:** List available workers for workplace on ${today}\n**Result:** ${workerDetails.length} available (${busyIds.size} already scheduled):\n${list}` };
}

async function handleResendSms(ctx: DiscordActionContext): Promise<ActionResult> {
  if (!ctx.alert) {
    return { success: false, message: "**Understood:** Resend SMS\n**Blocked:** No alert context found\n**Need:** Reply to a specific alert message" };
  }

  const phone = ctx.alert.sourcePhone;
  if (!phone) {
    return { success: false, message: `**Understood:** Resend SMS for ${ctx.alertId}\n**Blocked:** No phone number associated with this alert\n**Need:** This alert doesn't have a source phone number` };
  }

  const body = `WFConnect Update: Your message regarding "${ctx.alert.title}" has been received and is being handled. We'll follow up shortly.`;
  try {
    await sendSMS(phone, body);
    await logSMS(phone, body, "outbound", ctx.alert.sourceWorkerId || undefined, "clawd_discord_resend");
    return { success: true, message: `**Understood:** Resend SMS for ${ctx.alertId}\n**Action:** SMS sent to ${phone}\n**Result:** Acknowledgment message sent` };
  } catch (err: any) {
    return { success: false, message: `**Understood:** Resend SMS for ${ctx.alertId}\n**Blocked:** SMS send failed: ${err?.message}\n**Need:** Check OpenPhone configuration` };
  }
}

async function handleNotifyGmLilee(ctx: DiscordActionContext): Promise<ActionResult> {
  const alertInfo = ctx.alert ? `Alert ${ctx.alertId}: ${ctx.alert.title}\n${ctx.alert.message}` : "Escalation requested via Discord";
  const smsBody = `[WFConnect] ${alertInfo}\n\nEscalated by: ${ctx.discordUsername} via Discord`;

  try {
    await sendSMS(GM_LILEE_PHONE, smsBody);
    await logSMS(GM_LILEE_PHONE, smsBody, "outbound", undefined, "clawd_discord_lilee");
    return { success: true, message: `**Understood:** Notify GM Lilee\n**Action:** SMS sent to GM Lilee (+14166028038)\n**Result:** Alert forwarded successfully` };
  } catch (err: any) {
    return { success: false, message: `**Understood:** Notify GM Lilee\n**Blocked:** SMS failed: ${err?.message}\n**Need:** Check OpenPhone configuration` };
  }
}

async function handleNotifyClient(ctx: DiscordActionContext): Promise<ActionResult> {
  if (!ctx.alert) {
    return { success: false, message: "**Understood:** Notify client\n**Blocked:** No alert context found\n**Need:** Reply to a specific alert to identify the client" };
  }

  const clientId = ctx.alert.clientId;
  if (!clientId) {
    return { success: false, message: `**Understood:** Notify client for ${ctx.alertId}\n**Blocked:** No client ID linked to this alert\n**Still needed:** Send a manual message through the WFConnect app instead` };
  }

  const [client] = await db.select({ id: users.id, fullName: users.fullName, phone: users.phone }).from(users).where(eq(users.id, clientId)).limit(1);
  if (!client) {
    return { success: false, message: `**Understood:** Notify client for ${ctx.alertId}\n**Blocked:** Client user not found in system\n**Still needed:** Verify client data in admin panel` };
  }

  const messageBody = `Update regarding your staffing request: We are working on coverage for you. We'll confirm details shortly. — WFConnect Team`;

  try {
    const [adminUser] = await db.select({ id: users.id }).from(users)
      .where(and(eq(users.role, "admin"), eq(users.isActive, true)))
      .limit(1);
    const senderUserId = adminUser?.id || clientId;

    let [conversation] = await db.select().from(conversations)
      .where(and(eq(conversations.workerUserId, clientId), eq(conversations.isArchived, false)))
      .limit(1);

    if (!conversation) {
      const [newConv] = await db.insert(conversations)
        .values({ workerUserId: clientId, hrUserId: senderUserId, lastMessageAt: new Date(), lastMessagePreview: messageBody.slice(0, 100) })
        .returning();
      conversation = newConv;
    }

    await db.insert(messages).values({
      conversationId: conversation.id,
      senderUserId,
      recipientUserId: clientId,
      body: messageBody,
      messageType: "text",
      status: "delivered",
    });

    await db.update(conversations)
      .set({ lastMessageAt: new Date(), lastMessagePreview: messageBody.slice(0, 100) })
      .where(eq(conversations.id, conversation.id));

    return { success: true, message: `**Understood:** Notify client for ${ctx.alertId}\n**Action:** Internal message sent to ${client.fullName} via WFConnect messaging\n**Result:** Client has been notified through the app` };
  } catch (err: any) {
    if (client.phone) {
      try {
        const smsBody = `[WFConnect] ${messageBody}`;
        await sendSMS(client.phone, smsBody);
        await logSMS(client.phone, smsBody, "outbound", clientId, "clawd_discord_notify_client");
        return { success: true, message: `**Understood:** Notify client for ${ctx.alertId}\n**Action:** Internal messaging failed, sent SMS to ${client.fullName} (${client.phone}) as fallback\n**Result:** Client has been notified via SMS` };
      } catch {}
    }
    return { success: false, message: `**Understood:** Notify client for ${ctx.alertId}\n**Blocked:** Failed to send message: ${err?.message}\n**Still needed:** Notify client manually via the app` };
  }
}

async function handleMarkResolved(ctx: DiscordActionContext): Promise<ActionResult> {
  if (!ctx.alertId) {
    return { success: false, message: "**Understood:** Mark resolved\n**Blocked:** No alert ID found\n**Need:** Reply to a specific alert message" };
  }

  try {
    await db.update(discordAlerts)
      .set({ status: "resolved", acknowledgedBy: ctx.discordUsername, acknowledgedAt: new Date(), responseNote: `Resolved via Discord by ${ctx.discordUsername}` })
      .where(eq(discordAlerts.alertId, ctx.alertId));
    return { success: true, message: `**Understood:** Mark ${ctx.alertId} resolved\n**Action:** Status updated\n**Result:** Alert ${ctx.alertId} marked as resolved by ${ctx.discordUsername}` };
  } catch (err: any) {
    return { success: false, message: `**Understood:** Mark resolved\n**Blocked:** Database update failed: ${err?.message}\n**Need:** Try again or resolve manually in app` };
  }
}

async function handleMarkUnresolved(ctx: DiscordActionContext): Promise<ActionResult> {
  if (!ctx.alertId) {
    return { success: false, message: "**Understood:** Mark unresolved\n**Blocked:** No alert ID found\n**Need:** Reply to a specific alert message" };
  }

  try {
    await db.update(discordAlerts)
      .set({ status: "pending", responseNote: `Reopened via Discord by ${ctx.discordUsername}` })
      .where(eq(discordAlerts.alertId, ctx.alertId));
    return { success: true, message: `**Understood:** Reopen ${ctx.alertId}\n**Action:** Status updated to pending\n**Result:** Alert ${ctx.alertId} reopened` };
  } catch (err: any) {
    return { success: false, message: `**Understood:** Mark unresolved\n**Blocked:** Database update failed: ${err?.message}\n**Need:** Try again` };
  }
}

async function handleEscalate(ctx: DiscordActionContext): Promise<ActionResult> {
  const alertInfo = ctx.alert
    ? `ESCALATION: ${ctx.alert.title}\n${ctx.alert.message}\nEscalated by ${ctx.discordUsername} via Discord`
    : `ESCALATION requested by ${ctx.discordUsername} via Discord`;

  try {
    await sendSMS(GM_LILEE_PHONE, `[WFConnect URGENT] ${alertInfo}`);
    await logSMS(GM_LILEE_PHONE, alertInfo, "outbound", undefined, "clawd_discord_escalation");
  } catch {}

  await sendDiscordNotification({
    title: `ESCALATION — ${ctx.alert?.title || "Manual Escalation"}`,
    message: `Escalated by ${ctx.discordUsername}\n${ctx.alert?.message || "No additional details"}`,
    color: "red",
    type: "escalation",
  });

  if (ctx.alertId) {
    try {
      await db.update(discordAlerts)
        .set({ status: "pending", responseNote: `Escalated via Discord by ${ctx.discordUsername}` })
        .where(eq(discordAlerts.alertId, ctx.alertId));
    } catch {}
  }

  return { success: true, message: `**Understood:** Escalate${ctx.alertId ? ` ${ctx.alertId}` : ""}\n**Action:** GM Lilee notified via SMS + Discord re-alert sent\n**Result:** Issue escalated to management\n**Still needed:** Await GM response` };
}

async function handleSummarize(ctx: DiscordActionContext): Promise<ActionResult> {
  if (!ctx.alert) {
    return { success: false, message: "**Understood:** Summarize alert\n**Blocked:** No alert context found\n**Need:** Reply to a specific alert message or include the WFC-XXXX ID" };
  }

  const a = ctx.alert;
  const parts: string[] = [
    `**Alert Summary: ${a.alertId}**`,
    `**Type:** ${a.type}`,
    `**Status:** ${a.status}`,
    `**Title:** ${a.title}`,
  ];

  if (a.sourcePhone) parts.push(`**Source Phone:** ${a.sourcePhone}`);
  if (a.originalMessage) parts.push(`**Original Message:** "${a.originalMessage}"`);
  if (a.acknowledgedBy) parts.push(`**Acknowledged By:** ${a.acknowledgedBy} at ${a.acknowledgedAt?.toLocaleString() || "unknown"}`);
  if (a.responseNote) parts.push(`**Notes:** ${a.responseNote}`);
  if (a.actionsTaken) {
    try {
      const actions = JSON.parse(a.actionsTaken);
      if (Array.isArray(actions)) {
        parts.push(`**Actions Taken:** ${actions.join(", ")}`);
      } else {
        parts.push(`**Actions Taken:** ${a.actionsTaken}`);
      }
    } catch {
      parts.push(`**Actions Taken:** ${a.actionsTaken}`);
    }
  }
  parts.push(`**Created:** ${a.createdAt.toLocaleString()}`);

  return { success: true, message: parts.join("\n") };
}
