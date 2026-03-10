import { db } from "../../db";
import { contactLeads, shiftRequests, shifts, users, aiActionLogs, aiAlertState } from "../../../shared/schema";
import { eq, and, lt, gte, isNull, sql, lte, count } from "drizzle-orm";
import { logAction } from "./logger";
import {
  sendContactLeadAlert,
  sendShiftRequestAlert,
  sendUnfilledShiftAlert,
  sendPendingAccountsDigest,
} from "./alerts";

let activationTimestamp: Date | null = null;

async function getOrSetActivationTimestamp(): Promise<Date> {
  if (activationTimestamp) return activationTimestamp;

  const [existing] = await db
    .select({ createdAt: aiActionLogs.createdAt })
    .from(aiActionLogs)
    .where(and(eq(aiActionLogs.monitorType, "system"), eq(aiActionLogs.actionTaken, "activated")))
    .orderBy(aiActionLogs.createdAt)
    .limit(1);

  if (existing) {
    activationTimestamp = existing.createdAt;
    console.log(`[AI] Using existing activation timestamp: ${activationTimestamp.toISOString()}`);
    return activationTimestamp;
  }

  const now = new Date();
  activationTimestamp = now;
  await logAction({
    monitorType: "system",
    signalSummary: "AI operations assistant activated",
    actionTaken: "activated",
  });
  console.log(`[AI] First activation — timestamp set to: ${now.toISOString()}`);
  return now;
}

async function isAlreadyAlerted(entityType: string, entityId: string, alertType: string): Promise<boolean> {
  const [existing] = await db
    .select({ id: aiAlertState.id })
    .from(aiAlertState)
    .where(
      and(
        eq(aiAlertState.entityType, entityType),
        eq(aiAlertState.entityId, entityId),
        eq(aiAlertState.alertType, alertType)
      )
    )
    .limit(1);
  return !!existing;
}

async function markAlerted(entityType: string, entityId: string, alertType: string): Promise<void> {
  await db
    .insert(aiAlertState)
    .values({ entityType, entityId, alertType })
    .onConflictDoUpdate({
      target: [aiAlertState.entityType, aiAlertState.entityId, aiAlertState.alertType],
      set: {
        alertedAt: new Date(),
        alertCount: sql`${aiAlertState.alertCount} + 1`,
      },
    });
}

async function checkContactLeads(activationTs: Date): Promise<void> {
  try {
    const leads = await db
      .select()
      .from(contactLeads)
      .where(gte(contactLeads.createdAt, activationTs));

    for (const lead of leads) {
      const alreadyAlerted = await isAlreadyAlerted("contact_lead", lead.id, "new");
      if (alreadyAlerted) continue;

      const result = await sendContactLeadAlert({
        id: lead.id,
        name: lead.name,
        email: lead.email,
        company: lead.company,
        phone: lead.phone,
        cityProvince: (lead as any).cityProvince ?? null,
        serviceNeeded: (lead as any).serviceNeeded ?? null,
        message: lead.message,
        createdAt: lead.createdAt,
      });

      if (result.success) {
        await markAlerted("contact_lead", lead.id, "new");
        await logAction({
          monitorType: "contact_lead",
          signalId: lead.id,
          signalSummary: `New contact lead from ${lead.name} (${lead.email})${lead.company ? ` — ${lead.company}` : ""}`,
          actionTaken: "alert_sent",
          alertSentTo: "admin@wfconnect.org",
        });
        console.log(`[AI] Contact lead alert sent for ${lead.email}`);
      } else {
        await logAction({
          monitorType: "contact_lead",
          signalId: lead.id,
          signalSummary: `New contact lead from ${lead.name} (${lead.email})`,
          actionTaken: "error",
          errorMessage: result.error,
        });
        console.error(`[AI] Failed to send contact lead alert: ${result.error}`);
      }
    }
  } catch (err: any) {
    console.error("[AI] checkContactLeads error:", err?.message);
    await logAction({
      monitorType: "contact_lead",
      signalSummary: "Monitor check failed",
      actionTaken: "error",
      errorMessage: err?.message,
    });
  }
}

async function checkShiftRequests(activationTs: Date): Promise<void> {
  try {
    const thirtyMinAgo = new Date(Date.now() - 30 * 60 * 1000);
    const fourHoursAgo = new Date(Date.now() - 4 * 60 * 60 * 1000);

    const openRequests = await db
      .select()
      .from(shiftRequests)
      .where(
        and(
          eq(shiftRequests.status, "submitted"),
          gte(shiftRequests.createdAt, activationTs),
          lt(shiftRequests.createdAt, thirtyMinAgo)
        )
      );

    for (const req of openRequests) {
      const isEscalated = req.createdAt < fourHoursAgo;

      if (isEscalated) {
        const alreadyEscalated = await isAlreadyAlerted("shift_request", req.id, "unacknowledged_4h");
        if (!alreadyEscalated) {
          const result = await sendShiftRequestAlert(
            {
              id: req.id,
              roleType: req.roleType,
              date: req.date instanceof Date ? req.date.toISOString().split("T")[0] : String(req.date),
              startTime: req.startTime,
              endTime: req.endTime,
              notes: req.notes,
              createdAt: req.createdAt,
            },
            true
          );

          if (result.success) {
            await markAlerted("shift_request", req.id, "unacknowledged_4h");
            await logAction({
              monitorType: "shift_request",
              signalId: req.id,
              signalSummary: `ESCALATED: Shift request for ${req.roleType} on ${req.date} open 4+ hours`,
              actionTaken: "alert_sent",
              alertSentTo: "admin@wfconnect.org",
            });
            console.log(`[AI] Escalation alert sent for shift request ${req.id}`);
          } else {
            await logAction({
              monitorType: "shift_request",
              signalId: req.id,
              signalSummary: `Escalation alert failed for ${req.roleType} request`,
              actionTaken: "error",
              errorMessage: result.error,
            });
          }
        }
        continue;
      }

      const already30min = await isAlreadyAlerted("shift_request", req.id, "unacknowledged_30min");
      if (already30min) continue;

      const result = await sendShiftRequestAlert(
        {
          id: req.id,
          roleType: req.roleType,
          date: req.date instanceof Date ? req.date.toISOString().split("T")[0] : String(req.date),
          startTime: req.startTime,
          endTime: req.endTime,
          notes: req.notes,
          createdAt: req.createdAt,
        },
        false
      );

      if (result.success) {
        await markAlerted("shift_request", req.id, "unacknowledged_30min");
        await logAction({
          monitorType: "shift_request",
          signalId: req.id,
          signalSummary: `Shift request for ${req.roleType} on ${req.date} unacknowledged 30+ min`,
          actionTaken: "alert_sent",
          alertSentTo: "admin@wfconnect.org",
        });
        console.log(`[AI] 30-min alert sent for shift request ${req.id}`);
      } else {
        await logAction({
          monitorType: "shift_request",
          signalId: req.id,
          signalSummary: `30-min alert failed for ${req.roleType} request`,
          actionTaken: "error",
          errorMessage: result.error,
        });
      }
    }
  } catch (err: any) {
    console.error("[AI] checkShiftRequests error:", err?.message);
    await logAction({
      monitorType: "shift_request",
      signalSummary: "Monitor check failed",
      actionTaken: "error",
      errorMessage: err?.message,
    });
  }
}

async function checkUnfilledShifts(): Promise<void> {
  try {
    const now = new Date();
    const fourHoursFromNow = new Date(now.getTime() + 4 * 60 * 60 * 1000);

    const todayStr = now.toISOString().split("T")[0];
    const nowTimeStr = now.toTimeString().substring(0, 5);
    const fourHourStr = fourHoursFromNow.toTimeString().substring(0, 5);

    const unfilledShifts = await db
      .select()
      .from(shifts)
      .where(
        and(
          eq(shifts.status, "scheduled"),
          isNull(shifts.workerUserId),
          sql`${shifts.date}::text = ${todayStr}`,
          sql`${shifts.startTime} >= ${nowTimeStr}`,
          sql`${shifts.startTime} <= ${fourHourStr}`
        )
      );

    for (const shift of unfilledShifts) {
      const alreadyAlerted = await isAlreadyAlerted("shift", shift.id, "unfilled_4h");
      if (alreadyAlerted) continue;

      const result = await sendUnfilledShiftAlert({
        id: shift.id,
        title: (shift as any).title ?? null,
        date: shift.date instanceof Date ? shift.date.toISOString().split("T")[0] : String(shift.date),
        startTime: shift.startTime,
        endTime: (shift as any).endTime ?? null,
      });

      if (result.success) {
        await markAlerted("shift", shift.id, "unfilled_4h");
        await logAction({
          monitorType: "unfilled_shift",
          signalId: shift.id,
          signalSummary: `Unfilled shift on ${shift.date} starting at ${shift.startTime}`,
          actionTaken: "alert_sent",
          alertSentTo: "admin@wfconnect.org",
        });
        console.log(`[AI] Unfilled shift alert sent for shift ${shift.id}`);
      } else {
        await logAction({
          monitorType: "unfilled_shift",
          signalId: shift.id,
          signalSummary: `Unfilled shift alert failed for ${shift.date} ${shift.startTime}`,
          actionTaken: "error",
          errorMessage: result.error,
        });
      }
    }
  } catch (err: any) {
    console.error("[AI] checkUnfilledShifts error:", err?.message);
    await logAction({
      monitorType: "unfilled_shift",
      signalSummary: "Monitor check failed",
      actionTaken: "error",
      errorMessage: err?.message,
    });
  }
}

async function checkPendingAccountsDigest(): Promise<void> {
  try {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const [alreadySentToday] = await db
      .select({ id: aiActionLogs.id })
      .from(aiActionLogs)
      .where(
        and(
          eq(aiActionLogs.monitorType, "pending_accounts_digest"),
          eq(aiActionLogs.actionTaken, "alert_sent"),
          gte(aiActionLogs.createdAt, todayStart)
        )
      )
      .limit(1);

    if (alreadySentToday) return;

    const pendingUsers = await db
      .select({ role: users.role, createdAt: users.createdAt })
      .from(users)
      .where(eq(users.isActive, false));

    if (pendingUsers.length === 0) return;

    const workerCount = pendingUsers.filter((u) => u.role === "worker").length;
    const clientCount = pendingUsers.filter((u) => u.role === "client").length;
    const oldest = pendingUsers.reduce<Date | null>((min, u) => {
      if (!min) return u.createdAt;
      return u.createdAt < min ? u.createdAt : min;
    }, null);

    const result = await sendPendingAccountsDigest({
      count: pendingUsers.length,
      workerCount,
      clientCount,
      oldest,
    });

    if (result.success) {
      await logAction({
        monitorType: "pending_accounts_digest",
        signalSummary: `Daily digest: ${pendingUsers.length} accounts pending (${workerCount} workers, ${clientCount} clients)`,
        actionTaken: "alert_sent",
        alertSentTo: "admin@wfconnect.org",
      });
      console.log(`[AI] Pending accounts digest sent: ${pendingUsers.length} accounts`);
    } else {
      await logAction({
        monitorType: "pending_accounts_digest",
        signalSummary: `Digest send failed (${pendingUsers.length} accounts pending)`,
        actionTaken: "error",
        errorMessage: result.error,
      });
    }
  } catch (err: any) {
    console.error("[AI] checkPendingAccountsDigest error:", err?.message);
    await logAction({
      monitorType: "pending_accounts_digest",
      signalSummary: "Monitor check failed",
      actionTaken: "error",
      errorMessage: err?.message,
    });
  }
}

export async function runMonitorCycle(): Promise<void> {
  const activationTs = await getOrSetActivationTimestamp();

  await Promise.allSettled([
    checkContactLeads(activationTs),
    checkShiftRequests(activationTs),
    checkUnfilledShifts(),
  ]);

  const now = new Date();
  if (now.getHours() === 9) {
    await checkPendingAccountsDigest();
  }
}
