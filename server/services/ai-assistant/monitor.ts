import { db } from "../../db";
import { contactLeads, shiftRequests, shifts, users, aiActionLogs, aiAlertState, titoLogs, workplaces } from "../../../shared/schema";
import { eq, and, lt, gte, isNull, sql, lte, count, isNotNull, inArray } from "drizzle-orm";
import { logAction } from "./logger";
import {
  sendContactLeadAlert,
  sendShiftRequestAlert,
  sendUnfilledShiftAlert,
  sendPendingAccountsDigest,
} from "./alerts";
import { sendSMS, logSMS } from "../openphone";

const GM_PHONE = "+14166028038";

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

async function sendGMSms(message: string): Promise<void> {
  try {
    await sendSMS(GM_PHONE, message);
    await logSMS({ phoneNumber: GM_PHONE, direction: "outbound", message, status: "sent" });
  } catch (e: any) {
    console.error("[AI] GM SMS failed:", e?.message);
  }
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

        const contactInfo = lead.phone || lead.email;
        const smsMsg = `New Lead: ${lead.name}${lead.company ? ` from ${lead.company}` : ""}. ${contactInfo}`;
        await sendGMSms(smsMsg);
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
      const dateStr = String(req.date);

      if (isEscalated) {
        const alreadyEscalated = await isAlreadyAlerted("shift_request", req.id, "unacknowledged_4h");
        if (!alreadyEscalated) {
          const result = await sendShiftRequestAlert(
            {
              id: req.id,
              roleType: req.roleType,
              date: dateStr,
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

            await sendGMSms(`URGENT: Shift request for ${req.roleType} on ${dateStr} open 4+ hours`);
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
          date: dateStr,
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

        await sendGMSms(`Alert: Shift request for ${req.roleType} on ${dateStr} open 30+ min`);
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

      const dateStr = String(shift.date);

      const result = await sendUnfilledShiftAlert({
        id: shift.id,
        title: (shift as any).title ?? null,
        date: dateStr,
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

        await sendGMSms(`URGENT: Unfilled shift on ${dateStr} at ${shift.startTime}`);
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

function getTorontoHour(): { hour: number; dayOfWeek: number; dateStr: string } {
  const now = new Date();
  const torontoStr = now.toLocaleString("en-US", { timeZone: "America/Toronto" });
  const torontoDate = new Date(torontoStr);
  const dateOnly = now.toLocaleDateString("en-CA", { timeZone: "America/Toronto" });
  return {
    hour: torontoDate.getHours(),
    dayOfWeek: torontoDate.getDay(),
    dateStr: dateOnly,
  };
}

function getISOWeek(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  d.setDate(d.getDate() + 3 - ((d.getDay() + 6) % 7));
  const week1 = new Date(d.getFullYear(), 0, 4);
  const weekNum = 1 + Math.round(((d.getTime() - week1.getTime()) / 86400000 - 3 + ((week1.getDay() + 6) % 7)) / 7);
  return `${d.getFullYear()}-W${String(weekNum).padStart(2, "0")}`;
}

async function checkDailyDeploymentReport(): Promise<void> {
  try {
    const { hour, dateStr } = getTorontoHour();
    if (hour < 20 || hour >= 21) return;

    const alreadySent = await isAlreadyAlerted("gm_report", dateStr, "daily");
    if (alreadySent) return;

    const todayShifts = await db
      .select({
        id: shifts.id,
        workplaceId: shifts.workplaceId,
        workerUserId: shifts.workerUserId,
      })
      .from(shifts)
      .where(
        and(
          sql`${shifts.date}::text = ${dateStr}`,
          inArray(shifts.status, ["completed", "in_progress"]),
          isNotNull(shifts.workerUserId)
        )
      );

    const todayStart = new Date(dateStr + "T00:00:00");
    const todayEnd = new Date(dateStr + "T23:59:59");

    const titoResults = await db
      .select({ id: titoLogs.id })
      .from(titoLogs)
      .where(
        and(
          gte(titoLogs.timeIn, todayStart),
          lte(titoLogs.timeIn, todayEnd)
        )
      );

    const deploymentCount = titoResults.length;
    const shiftCount = todayShifts.length;

    const workplaceIds = [...new Set(todayShifts.map(s => s.workplaceId).filter(Boolean))];
    let workplaceBreakdown = "";
    if (workplaceIds.length > 0) {
      const wpNames = await db
        .select({ id: workplaces.id, name: workplaces.name })
        .from(workplaces)
        .where(inArray(workplaces.id, workplaceIds));

      const wpMap = new Map(wpNames.map(w => [w.id, w.name]));
      const wpCounts: Record<string, number> = {};
      for (const s of todayShifts) {
        const name = wpMap.get(s.workplaceId) || "Unknown";
        wpCounts[name] = (wpCounts[name] || 0) + 1;
      }
      const sorted = Object.entries(wpCounts).sort((a, b) => b[1] - a[1]);
      workplaceBreakdown = "\n" + sorted.map(([name, cnt]) => `${name}: ${cnt}`).join(", ");
    }

    const smsMsg = `WFConnect Daily Report - ${dateStr}\nWorkers Deployed: ${deploymentCount}\nShifts Today: ${shiftCount}${workplaceBreakdown}`;

    await sendSMS(GM_PHONE, smsMsg);
    await logSMS({ phoneNumber: GM_PHONE, direction: "outbound", message: smsMsg, status: "sent" });

    await markAlerted("gm_report", dateStr, "daily");
    await logAction({
      monitorType: "gm_daily_report",
      signalSummary: `Daily report sent: ${deploymentCount} deployed, ${shiftCount} shifts`,
      actionTaken: "alert_sent",
      alertSentTo: GM_PHONE,
    });
    console.log(`[AI] Daily deployment report sent for ${dateStr}`);
  } catch (err: any) {
    console.error("[AI] checkDailyDeploymentReport error:", err?.message);
    await logAction({
      monitorType: "gm_daily_report",
      signalSummary: "Daily report check failed",
      actionTaken: "error",
      errorMessage: err?.message,
    });
  }
}

async function checkWeeklyReport(): Promise<void> {
  try {
    const { hour, dayOfWeek, dateStr } = getTorontoHour();
    if (dayOfWeek !== 1 || hour < 8 || hour >= 9) return;

    const weekId = `week-${getISOWeek(dateStr)}`;
    const alreadySent = await isAlreadyAlerted("gm_report", weekId, "weekly");
    if (alreadySent) return;

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const sevenDaysAgoStr = sevenDaysAgo.toISOString().split("T")[0];

    const weekShifts = await db
      .select({
        id: shifts.id,
        workplaceId: shifts.workplaceId,
        workerUserId: shifts.workerUserId,
        status: shifts.status,
      })
      .from(shifts)
      .where(
        and(
          sql`${shifts.date}::text >= ${sevenDaysAgoStr}`,
          sql`${shifts.date}::text <= ${dateStr}`,
          inArray(shifts.status, ["completed", "in_progress"])
        )
      );

    const completedShifts = weekShifts.filter(s => s.status === "completed").length;
    const uniqueWorkers = new Set(weekShifts.map(s => s.workerUserId).filter(Boolean)).size;

    const weekTitoLogs = await db
      .select({
        timeIn: titoLogs.timeIn,
        timeOut: titoLogs.timeOut,
      })
      .from(titoLogs)
      .where(
        and(
          gte(titoLogs.timeIn, sevenDaysAgo),
          isNotNull(titoLogs.timeOut)
        )
      );

    let totalHours = 0;
    for (const log of weekTitoLogs) {
      if (log.timeIn && log.timeOut) {
        const diffMs = new Date(log.timeOut).getTime() - new Date(log.timeIn).getTime();
        totalHours += diffMs / (1000 * 60 * 60);
      }
    }

    const wpCounts: Record<string, number> = {};
    const wpIds = [...new Set(weekShifts.map(s => s.workplaceId).filter(Boolean))];
    let topSitesStr = "N/A";
    if (wpIds.length > 0) {
      const wpNames = await db
        .select({ id: workplaces.id, name: workplaces.name })
        .from(workplaces)
        .where(inArray(workplaces.id, wpIds));

      const wpMap = new Map(wpNames.map(w => [w.id, w.name]));
      for (const s of weekShifts) {
        const name = wpMap.get(s.workplaceId) || "Unknown";
        wpCounts[name] = (wpCounts[name] || 0) + 1;
      }
      const sorted = Object.entries(wpCounts).sort((a, b) => b[1] - a[1]).slice(0, 3);
      topSitesStr = sorted.map(([name, cnt]) => `${name} (${cnt})`).join(", ");
    }

    const weekOfDate = sevenDaysAgoStr;
    const smsMsg = `WFConnect Weekly Report - Week of ${weekOfDate}\nTotal Deployments: ${weekShifts.length}\nTotal Workers: ${uniqueWorkers}\nEst. Hours: ${Math.round(totalHours)}\nTop Sites: ${topSitesStr}`;

    await sendSMS(GM_PHONE, smsMsg);
    await logSMS({ phoneNumber: GM_PHONE, direction: "outbound", message: smsMsg, status: "sent" });

    await markAlerted("gm_report", weekId, "weekly");
    await logAction({
      monitorType: "gm_weekly_report",
      signalSummary: `Weekly report sent: ${weekShifts.length} deployments, ${uniqueWorkers} workers, ${Math.round(totalHours)}h`,
      actionTaken: "alert_sent",
      alertSentTo: GM_PHONE,
    });
    console.log(`[AI] Weekly report sent for ${weekId}`);
  } catch (err: any) {
    console.error("[AI] checkWeeklyReport error:", err?.message);
    await logAction({
      monitorType: "gm_weekly_report",
      signalSummary: "Weekly report check failed",
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

  await checkDailyDeploymentReport();
  await checkWeeklyReport();
}
