import { db } from "../../../db";
import { titoLogs, titoCorrections, shifts, users, workplaces, timesheets, timesheetEntries } from "../../../../shared/schema";
import { eq, and, gte, lte, sql, isNull, isNotNull, ne, count, sum } from "drizzle-orm";
import { calculatePayableHours, getCutoffPeriods } from "../../../payroll-hours";
import { AnalyticsTimeWindow, TIME_WINDOWS } from "../types";

export interface WorkerHoursComparison {
  workerId: string;
  workerName: string;
  scheduledHours: number;
  actualHours: number;
  variance: number;
  variancePercent: number;
}

export interface SiteHoursComparison {
  workplaceId: string;
  workplaceName: string;
  scheduledHours: number;
  actualHours: number;
  variance: number;
  variancePercent: number;
}

export interface MissingTimesheet {
  workerId: string;
  workerName: string;
  completedShiftsCount: number;
  approvedTimesheetCount: number;
  missingCount: number;
}

export interface OvertimeRisk {
  workerId: string;
  workerName: string;
  currentWeekHours: number;
  overtimeThreshold: number;
  hoursRemaining: number;
  atRisk: boolean;
}

export interface SuspiciousPattern {
  type: "identical_hours" | "consistently_short" | "rapid_clockout";
  workerId: string;
  workerName: string;
  detail: string;
  occurrences: number;
}

export interface DuplicateTitoEntry {
  workerId: string;
  workerName: string;
  date: string;
  workplaceId: string | null;
  workplaceName: string;
  count: number;
}

export interface PendingCorrection {
  correctionId: string;
  titoLogId: string;
  requesterId: string;
  requesterName: string;
  reason: string;
  createdAt: Date;
}

export interface PayrollExposure {
  totalScheduledHours: number;
  totalActualHours: number;
  totalApprovedTimesheetHours: number;
  totalUnapprovedHours: number;
  periodLabel: string;
}

export interface PayrollMetrics {
  hoursComparisonByWorker: WorkerHoursComparison[];
  hoursComparisonBySite: SiteHoursComparison[];
  missingTimesheets: MissingTimesheet[];
  overtimeRisks: OvertimeRisk[];
  suspiciousPatterns: SuspiciousPattern[];
  duplicateTitoEntries: DuplicateTitoEntry[];
  pendingCorrections: PendingCorrection[];
  payrollExposure: PayrollExposure;
  generatedAt: string;
  windowDays: number;
}

const OVERTIME_THRESHOLD_WEEKLY = 44;

function getWindowDates(window: AnalyticsTimeWindow): { start: Date; end: Date } {
  const end = new Date();
  const start = new Date();
  start.setDate(start.getDate() - window.days);
  return { start, end };
}

function getCurrentWeekBounds(): { start: Date; end: Date } {
  const now = new Date();
  const day = now.getDay();
  const diff = day === 0 ? 6 : day - 1;
  const start = new Date(now);
  start.setDate(now.getDate() - diff);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  end.setHours(23, 59, 59, 999);
  return { start, end };
}

function estimateShiftHours(startTime: string, endTime: string | null): number {
  if (!endTime) return 8;
  const [sh, sm] = startTime.split(":").map(Number);
  const [eh, em] = endTime.split(":").map(Number);
  let hours = (eh * 60 + em - sh * 60 - sm) / 60;
  if (hours <= 0) hours += 24;
  return hours;
}

export async function getPayrollMetrics(windowKey: string = "30d"): Promise<PayrollMetrics> {
  const window = TIME_WINDOWS[windowKey] || TIME_WINDOWS["30d"];
  const { start, end } = getWindowDates(window);

  const [
    hoursComparisonByWorker,
    hoursComparisonBySite,
    missingTimesheets,
    overtimeRisks,
    suspiciousPatterns,
    duplicateTitoEntries,
    pendingCorrections,
    payrollExposure,
  ] = await Promise.all([
    computeHoursComparisonByWorker(start, end),
    computeHoursComparisonBySite(start, end),
    computeMissingTimesheets(start, end),
    computeOvertimeRisks(),
    computeSuspiciousPatterns(start, end),
    computeDuplicateTitoEntries(start, end),
    computePendingCorrections(),
    computePayrollExposure(start, end, window.label),
  ]);

  return {
    hoursComparisonByWorker,
    hoursComparisonBySite,
    missingTimesheets,
    overtimeRisks,
    suspiciousPatterns,
    duplicateTitoEntries,
    pendingCorrections,
    payrollExposure,
    generatedAt: new Date().toISOString(),
    windowDays: window.days,
  };
}

async function computeHoursComparisonByWorker(start: Date, end: Date): Promise<WorkerHoursComparison[]> {
  const startStr = start.toISOString().split("T")[0];
  const endStr = end.toISOString().split("T")[0];

  const scheduledShifts = await db
    .select({
      workerId: shifts.workerUserId,
      workerName: users.fullName,
      startTime: shifts.startTime,
      endTime: shifts.endTime,
    })
    .from(shifts)
    .innerJoin(users, eq(shifts.workerUserId, users.id))
    .where(
      and(
        gte(shifts.date, startStr),
        lte(shifts.date, endStr),
        isNotNull(shifts.workerUserId),
        ne(shifts.status, "cancelled")
      )
    );

  const scheduledByWorker = new Map<string, { name: string; hours: number }>();
  for (const s of scheduledShifts) {
    if (!s.workerId) continue;
    const existing = scheduledByWorker.get(s.workerId) || { name: s.workerName, hours: 0 };
    existing.hours += estimateShiftHours(s.startTime, s.endTime);
    scheduledByWorker.set(s.workerId, existing);
  }

  const titoRecords = await db
    .select({
      workerId: titoLogs.workerId,
      workerName: users.fullName,
      timeIn: titoLogs.timeIn,
      timeOut: titoLogs.timeOut,
    })
    .from(titoLogs)
    .innerJoin(users, eq(titoLogs.workerId, users.id))
    .where(
      and(
        gte(titoLogs.timeIn, start),
        lte(titoLogs.timeIn, end),
        eq(titoLogs.status, "approved")
      )
    );

  const actualByWorker = new Map<string, { name: string; hours: number }>();
  for (const t of titoRecords) {
    const calc = calculatePayableHours(t.timeIn, t.timeOut);
    const existing = actualByWorker.get(t.workerId) || { name: t.workerName, hours: 0 };
    existing.hours += calc.netHoursRounded;
    actualByWorker.set(t.workerId, existing);
  }

  const allWorkerIds = new Set([...scheduledByWorker.keys(), ...actualByWorker.keys()]);
  const results: WorkerHoursComparison[] = [];

  for (const wid of allWorkerIds) {
    const scheduled = scheduledByWorker.get(wid);
    const actual = actualByWorker.get(wid);
    const scheduledHours = scheduled?.hours || 0;
    const actualHours = actual?.hours || 0;
    const variance = actualHours - scheduledHours;
    const variancePercent = scheduledHours > 0 ? (variance / scheduledHours) * 100 : 0;
    results.push({
      workerId: wid,
      workerName: scheduled?.name || actual?.name || "Unknown",
      scheduledHours: Math.round(scheduledHours * 100) / 100,
      actualHours: Math.round(actualHours * 100) / 100,
      variance: Math.round(variance * 100) / 100,
      variancePercent: Math.round(variancePercent * 10) / 10,
    });
  }

  return results.sort((a, b) => Math.abs(b.variance) - Math.abs(a.variance));
}

async function computeHoursComparisonBySite(start: Date, end: Date): Promise<SiteHoursComparison[]> {
  const startStr = start.toISOString().split("T")[0];
  const endStr = end.toISOString().split("T")[0];

  const scheduledShifts = await db
    .select({
      workplaceId: shifts.workplaceId,
      workplaceName: workplaces.name,
      startTime: shifts.startTime,
      endTime: shifts.endTime,
    })
    .from(shifts)
    .innerJoin(workplaces, eq(shifts.workplaceId, workplaces.id))
    .where(
      and(
        gte(shifts.date, startStr),
        lte(shifts.date, endStr),
        ne(shifts.status, "cancelled")
      )
    );

  const scheduledBySite = new Map<string, { name: string; hours: number }>();
  for (const s of scheduledShifts) {
    const existing = scheduledBySite.get(s.workplaceId) || { name: s.workplaceName, hours: 0 };
    existing.hours += estimateShiftHours(s.startTime, s.endTime);
    scheduledBySite.set(s.workplaceId, existing);
  }

  const titoRecords = await db
    .select({
      workplaceId: titoLogs.workplaceId,
      workplaceName: workplaces.name,
      timeIn: titoLogs.timeIn,
      timeOut: titoLogs.timeOut,
    })
    .from(titoLogs)
    .leftJoin(workplaces, eq(titoLogs.workplaceId, workplaces.id))
    .where(
      and(
        gte(titoLogs.timeIn, start),
        lte(titoLogs.timeIn, end),
        eq(titoLogs.status, "approved"),
        isNotNull(titoLogs.workplaceId)
      )
    );

  const actualBySite = new Map<string, { name: string; hours: number }>();
  for (const t of titoRecords) {
    if (!t.workplaceId) continue;
    const calc = calculatePayableHours(t.timeIn, t.timeOut);
    const existing = actualBySite.get(t.workplaceId) || { name: t.workplaceName || "Unknown", hours: 0 };
    existing.hours += calc.netHoursRounded;
    actualBySite.set(t.workplaceId, existing);
  }

  const allSiteIds = new Set([...scheduledBySite.keys(), ...actualBySite.keys()]);
  const results: SiteHoursComparison[] = [];

  for (const sid of allSiteIds) {
    const scheduled = scheduledBySite.get(sid);
    const actual = actualBySite.get(sid);
    const scheduledHours = scheduled?.hours || 0;
    const actualHours = actual?.hours || 0;
    const variance = actualHours - scheduledHours;
    const variancePercent = scheduledHours > 0 ? (variance / scheduledHours) * 100 : 0;
    results.push({
      workplaceId: sid,
      workplaceName: scheduled?.name || actual?.name || "Unknown",
      scheduledHours: Math.round(scheduledHours * 100) / 100,
      actualHours: Math.round(actualHours * 100) / 100,
      variance: Math.round(variance * 100) / 100,
      variancePercent: Math.round(variancePercent * 10) / 10,
    });
  }

  return results.sort((a, b) => Math.abs(b.variance) - Math.abs(a.variance));
}

async function computeMissingTimesheets(start: Date, end: Date): Promise<MissingTimesheet[]> {
  const startStr = start.toISOString().split("T")[0];
  const endStr = end.toISOString().split("T")[0];

  const completedShifts = await db
    .select({
      workerId: shifts.workerUserId,
      workerName: users.fullName,
      shiftCount: count(),
    })
    .from(shifts)
    .innerJoin(users, eq(shifts.workerUserId, users.id))
    .where(
      and(
        gte(shifts.date, startStr),
        lte(shifts.date, endStr),
        eq(shifts.status, "completed"),
        isNotNull(shifts.workerUserId)
      )
    )
    .groupBy(shifts.workerUserId, users.fullName);

  const approvedTimesheets = await db
    .select({
      workerId: timesheets.workerUserId,
      tsCount: count(),
    })
    .from(timesheets)
    .where(
      and(
        eq(timesheets.status, "approved")
      )
    )
    .groupBy(timesheets.workerUserId);

  const tsMap = new Map<string, number>();
  for (const ts of approvedTimesheets) {
    tsMap.set(ts.workerId, Number(ts.tsCount));
  }

  const results: MissingTimesheet[] = [];
  for (const cs of completedShifts) {
    if (!cs.workerId) continue;
    const completedCount = Number(cs.shiftCount);
    const approvedCount = tsMap.get(cs.workerId) || 0;
    if (completedCount > approvedCount) {
      results.push({
        workerId: cs.workerId,
        workerName: cs.workerName,
        completedShiftsCount: completedCount,
        approvedTimesheetCount: approvedCount,
        missingCount: completedCount - approvedCount,
      });
    }
  }

  return results.sort((a, b) => b.missingCount - a.missingCount);
}

async function computeOvertimeRisks(): Promise<OvertimeRisk[]> {
  const { start, end } = getCurrentWeekBounds();

  const titoRecords = await db
    .select({
      workerId: titoLogs.workerId,
      workerName: users.fullName,
      timeIn: titoLogs.timeIn,
      timeOut: titoLogs.timeOut,
    })
    .from(titoLogs)
    .innerJoin(users, eq(titoLogs.workerId, users.id))
    .where(
      and(
        gte(titoLogs.timeIn, start),
        lte(titoLogs.timeIn, end),
        eq(titoLogs.status, "approved")
      )
    );

  const hoursByWorker = new Map<string, { name: string; hours: number }>();
  for (const t of titoRecords) {
    const calc = calculatePayableHours(t.timeIn, t.timeOut);
    const existing = hoursByWorker.get(t.workerId) || { name: t.workerName, hours: 0 };
    existing.hours += calc.netHoursRounded;
    hoursByWorker.set(t.workerId, existing);
  }

  const results: OvertimeRisk[] = [];
  for (const [wid, data] of hoursByWorker) {
    const hoursRemaining = OVERTIME_THRESHOLD_WEEKLY - data.hours;
    const atRisk = hoursRemaining <= 8;
    if (atRisk || data.hours >= OVERTIME_THRESHOLD_WEEKLY * 0.75) {
      results.push({
        workerId: wid,
        workerName: data.name,
        currentWeekHours: Math.round(data.hours * 100) / 100,
        overtimeThreshold: OVERTIME_THRESHOLD_WEEKLY,
        hoursRemaining: Math.round(Math.max(0, hoursRemaining) * 100) / 100,
        atRisk,
      });
    }
  }

  return results.sort((a, b) => a.hoursRemaining - b.hoursRemaining);
}

async function computeSuspiciousPatterns(start: Date, end: Date): Promise<SuspiciousPattern[]> {
  const titoRecords = await db
    .select({
      workerId: titoLogs.workerId,
      workerName: users.fullName,
      timeIn: titoLogs.timeIn,
      timeOut: titoLogs.timeOut,
    })
    .from(titoLogs)
    .innerJoin(users, eq(titoLogs.workerId, users.id))
    .where(
      and(
        gte(titoLogs.timeIn, start),
        lte(titoLogs.timeIn, end),
        eq(titoLogs.status, "approved"),
        isNotNull(titoLogs.timeOut)
      )
    );

  const workerShifts = new Map<string, { name: string; hours: number[] }>();
  for (const t of titoRecords) {
    const calc = calculatePayableHours(t.timeIn, t.timeOut);
    if (calc.isIncomplete) continue;
    const existing = workerShifts.get(t.workerId) || { name: t.workerName, hours: [] };
    existing.hours.push(calc.netHoursRounded);
    workerShifts.set(t.workerId, existing);
  }

  const patterns: SuspiciousPattern[] = [];

  for (const [wid, data] of workerShifts) {
    if (data.hours.length < 3) continue;

    const hourCounts = new Map<number, number>();
    for (const h of data.hours) {
      hourCounts.set(h, (hourCounts.get(h) || 0) + 1);
    }

    for (const [hours, occCount] of hourCounts) {
      if (occCount >= 5 && occCount / data.hours.length >= 0.8) {
        patterns.push({
          type: "identical_hours",
          workerId: wid,
          workerName: data.name,
          detail: `Logged exactly ${hours}h on ${occCount} of ${data.hours.length} shifts`,
          occurrences: occCount,
        });
      }
    }

    const shortShifts = data.hours.filter(h => h < 3);
    if (shortShifts.length >= 3 && shortShifts.length / data.hours.length >= 0.5) {
      patterns.push({
        type: "consistently_short",
        workerId: wid,
        workerName: data.name,
        detail: `${shortShifts.length} of ${data.hours.length} shifts under 3 hours`,
        occurrences: shortShifts.length,
      });
    }
  }

  for (const t of titoRecords) {
    if (!t.timeIn || !t.timeOut) continue;
    const diffMinutes = (t.timeOut.getTime() - t.timeIn.getTime()) / (1000 * 60);
    if (diffMinutes > 0 && diffMinutes < 15) {
      const existing = patterns.find(p => p.type === "rapid_clockout" && p.workerId === t.workerId);
      if (existing) {
        existing.occurrences += 1;
        existing.detail = `${existing.occurrences} clock-ins followed by clock-out within 15 minutes`;
      } else {
        const workerData = workerShifts.get(t.workerId);
        patterns.push({
          type: "rapid_clockout",
          workerId: t.workerId,
          workerName: workerData?.name || "Unknown",
          detail: "1 clock-in followed by clock-out within 15 minutes",
          occurrences: 1,
        });
      }
    }
  }

  return patterns.sort((a, b) => b.occurrences - a.occurrences);
}

async function computeDuplicateTitoEntries(start: Date, end: Date): Promise<DuplicateTitoEntry[]> {
  const titoRecords = await db
    .select({
      workerId: titoLogs.workerId,
      workerName: users.fullName,
      timeIn: titoLogs.timeIn,
      workplaceId: titoLogs.workplaceId,
      workplaceName: workplaces.name,
    })
    .from(titoLogs)
    .innerJoin(users, eq(titoLogs.workerId, users.id))
    .leftJoin(workplaces, eq(titoLogs.workplaceId, workplaces.id))
    .where(
      and(
        gte(titoLogs.timeIn, start),
        lte(titoLogs.timeIn, end),
        isNotNull(titoLogs.timeIn)
      )
    );

  const keyMap = new Map<string, { workerId: string; workerName: string; date: string; workplaceId: string | null; workplaceName: string; count: number }>();

  for (const t of titoRecords) {
    if (!t.timeIn) continue;
    const dateStr = t.timeIn.toISOString().split("T")[0];
    const key = `${t.workerId}:${dateStr}:${t.workplaceId || "none"}`;
    const existing = keyMap.get(key);
    if (existing) {
      existing.count += 1;
    } else {
      keyMap.set(key, {
        workerId: t.workerId,
        workerName: t.workerName,
        date: dateStr,
        workplaceId: t.workplaceId,
        workplaceName: t.workplaceName || "Unassigned",
        count: 1,
      });
    }
  }

  const duplicates: DuplicateTitoEntry[] = [];
  for (const entry of keyMap.values()) {
    if (entry.count > 1) {
      duplicates.push(entry);
    }
  }

  return duplicates.sort((a, b) => b.count - a.count);
}

async function computePendingCorrections(): Promise<PendingCorrection[]> {
  const corrections = await db
    .select({
      correctionId: titoCorrections.id,
      titoLogId: titoCorrections.titoLogId,
      requesterId: titoCorrections.requesterId,
      requesterName: users.fullName,
      reason: titoCorrections.reason,
      createdAt: titoCorrections.createdAt,
    })
    .from(titoCorrections)
    .innerJoin(users, eq(titoCorrections.requesterId, users.id))
    .where(eq(titoCorrections.status, "pending"))
    .orderBy(titoCorrections.createdAt);

  return corrections.map(c => ({
    correctionId: c.correctionId,
    titoLogId: c.titoLogId,
    requesterId: c.requesterId,
    requesterName: c.requesterName,
    reason: c.reason,
    createdAt: c.createdAt,
  }));
}

async function computePayrollExposure(start: Date, end: Date, periodLabel: string): Promise<PayrollExposure> {
  const startStr = start.toISOString().split("T")[0];
  const endStr = end.toISOString().split("T")[0];

  const scheduledResult = await db
    .select({
      startTime: shifts.startTime,
      endTime: shifts.endTime,
    })
    .from(shifts)
    .where(
      and(
        gte(shifts.date, startStr),
        lte(shifts.date, endStr),
        ne(shifts.status, "cancelled")
      )
    );

  let totalScheduledHours = 0;
  for (const s of scheduledResult) {
    totalScheduledHours += estimateShiftHours(s.startTime, s.endTime);
  }

  const titoRecords = await db
    .select({
      timeIn: titoLogs.timeIn,
      timeOut: titoLogs.timeOut,
    })
    .from(titoLogs)
    .where(
      and(
        gte(titoLogs.timeIn, start),
        lte(titoLogs.timeIn, end),
        eq(titoLogs.status, "approved")
      )
    );

  let totalActualHours = 0;
  for (const t of titoRecords) {
    const calc = calculatePayableHours(t.timeIn, t.timeOut);
    totalActualHours += calc.netHoursRounded;
  }

  const approvedTs = await db
    .select({
      totalHours: timesheets.totalHours,
    })
    .from(timesheets)
    .where(eq(timesheets.status, "approved"));

  let totalApprovedTimesheetHours = 0;
  for (const ts of approvedTs) {
    totalApprovedTimesheetHours += parseFloat(String(ts.totalHours || "0"));
  }

  const totalUnapprovedHours = Math.max(0, totalActualHours - totalApprovedTimesheetHours);

  return {
    totalScheduledHours: Math.round(totalScheduledHours * 100) / 100,
    totalActualHours: Math.round(totalActualHours * 100) / 100,
    totalApprovedTimesheetHours: Math.round(totalApprovedTimesheetHours * 100) / 100,
    totalUnapprovedHours: Math.round(totalUnapprovedHours * 100) / 100,
    periodLabel,
  };
}
