import { db } from "../../../db";
import { shifts, shiftOffers, workplaces, users, shiftRequests, titoLogs } from "../../../../shared/schema";
import { eq, and, gte, lte, lt, sql, ne, isNull, count, inArray } from "drizzle-orm";

export interface UnfilledShiftInfo {
  shiftId: string;
  title: string;
  workplaceName: string;
  workplaceId: string;
  date: string;
  startTime: string;
  endTime: string | null;
  workersNeeded: number;
  workersAssigned: number;
  hoursUntilStart: number;
}

export interface WorkplaceFillRate {
  workplaceId: string;
  workplaceName: string;
  totalShifts: number;
  filledShifts: number;
  fillRate: number;
  period: string;
}

export interface FillRateTrend {
  workplaceId: string;
  workplaceName: string;
  currentFillRate: number;
  previousFillRate: number;
  change: number;
  trend: "improving" | "declining" | "stable";
}

export interface OverusedWorker {
  workerId: string;
  workerName: string;
  shiftCount: number;
  period: string;
}

export interface SchedulingConflict {
  workerId: string;
  workerName: string;
  shift1Id: string;
  shift1Title: string;
  shift2Id: string;
  shift2Title: string;
  date: string;
  overlapDescription: string;
}

export interface ShiftOfferStats {
  totalOffers: number;
  accepted: number;
  declined: number;
  pending: number;
  expired: number;
  acceptanceRate: number;
  declineRate: number;
}

export interface ProblematicSite {
  workplaceId: string;
  workplaceName: string;
  fillRate: number;
  cancellationCount: number;
  issueScore: number;
}

export interface StaffingMetrics {
  unfilledShifts: {
    next12Hours: UnfilledShiftInfo[];
    next24Hours: UnfilledShiftInfo[];
    next48Hours: UnfilledShiftInfo[];
  };
  fillRates: {
    "7d": WorkplaceFillRate[];
    "14d": WorkplaceFillRate[];
    "30d": WorkplaceFillRate[];
  };
  fillRateTrends: FillRateTrend[];
  overusedWorkers: OverusedWorker[];
  schedulingConflicts: SchedulingConflict[];
  shiftOfferStats: ShiftOfferStats;
  problematicSites: ProblematicSite[];
  summary: {
    totalUpcomingShifts: number;
    totalUnfilledNext24h: number;
    averageFillRate7d: number;
    totalConflicts: number;
    totalProblematicSites: number;
  };
}

function getNowUTC(): Date {
  return new Date();
}

function addHours(date: Date, hours: number): Date {
  return new Date(date.getTime() + hours * 60 * 60 * 1000);
}

function subtractDays(date: Date, days: number): Date {
  return new Date(date.getTime() - days * 24 * 60 * 60 * 1000);
}

function toDateString(d: Date): string {
  return d.toISOString().split("T")[0];
}

async function getUnfilledShifts(withinHours: number): Promise<UnfilledShiftInfo[]> {
  const now = getNowUTC();
  const cutoff = addHours(now, withinHours);
  const todayStr = toDateString(now);
  const cutoffStr = toDateString(cutoff);

  const upcomingShifts = await db
    .select({
      id: shifts.id,
      title: shifts.title,
      workplaceId: shifts.workplaceId,
      workplaceName: workplaces.name,
      date: shifts.date,
      startTime: shifts.startTime,
      endTime: shifts.endTime,
      workersNeeded: shifts.workersNeeded,
      workerUserId: shifts.workerUserId,
    })
    .from(shifts)
    .leftJoin(workplaces, eq(shifts.workplaceId, workplaces.id))
    .where(
      and(
        gte(shifts.date, todayStr),
        lte(shifts.date, cutoffStr),
        eq(shifts.status, "scheduled")
      )
    );

  const unfilled: UnfilledShiftInfo[] = [];

  for (const s of upcomingShifts) {
    const needed = s.workersNeeded ?? 1;
    const assigned = s.workerUserId ? 1 : 0;

    if (assigned < needed) {
      const shiftDateTime = new Date(`${s.date}T${s.startTime}:00Z`);
      const hoursUntilStart = (shiftDateTime.getTime() - now.getTime()) / (1000 * 60 * 60);

      if (hoursUntilStart > 0 && hoursUntilStart <= withinHours) {
        unfilled.push({
          shiftId: s.id,
          title: s.title,
          workplaceName: s.workplaceName ?? "Unknown",
          workplaceId: s.workplaceId,
          date: s.date,
          startTime: s.startTime,
          endTime: s.endTime,
          workersNeeded: needed,
          workersAssigned: assigned,
          hoursUntilStart: Math.round(hoursUntilStart * 10) / 10,
        });
      }
    }
  }

  return unfilled.sort((a, b) => a.hoursUntilStart - b.hoursUntilStart);
}

async function getFillRatesByWorkplace(days: number, label: string): Promise<WorkplaceFillRate[]> {
  const now = getNowUTC();
  const startDate = toDateString(subtractDays(now, days));
  const endDate = toDateString(now);

  const results = await db
    .select({
      workplaceId: shifts.workplaceId,
      workplaceName: workplaces.name,
      totalShifts: count(shifts.id),
      filledShifts: sql<number>`count(case when ${shifts.workerUserId} is not null then 1 end)`.as("filled_shifts"),
    })
    .from(shifts)
    .leftJoin(workplaces, eq(shifts.workplaceId, workplaces.id))
    .where(
      and(
        gte(shifts.date, startDate),
        lte(shifts.date, endDate),
        ne(shifts.status, "cancelled")
      )
    )
    .groupBy(shifts.workplaceId, workplaces.name);

  return results.map((r) => ({
    workplaceId: r.workplaceId,
    workplaceName: r.workplaceName ?? "Unknown",
    totalShifts: Number(r.totalShifts),
    filledShifts: Number(r.filledShifts),
    fillRate: Number(r.totalShifts) > 0 ? Math.round((Number(r.filledShifts) / Number(r.totalShifts)) * 100) : 0,
    period: label,
  }));
}

async function getFillRateTrends(): Promise<FillRateTrend[]> {
  const current = await getFillRatesByWorkplace(14, "current");
  const now = getNowUTC();
  const prevStart = toDateString(subtractDays(now, 28));
  const prevEnd = toDateString(subtractDays(now, 14));

  const previousResults = await db
    .select({
      workplaceId: shifts.workplaceId,
      workplaceName: workplaces.name,
      totalShifts: count(shifts.id),
      filledShifts: sql<number>`count(case when ${shifts.workerUserId} is not null then 1 end)`.as("filled_shifts"),
    })
    .from(shifts)
    .leftJoin(workplaces, eq(shifts.workplaceId, workplaces.id))
    .where(
      and(
        gte(shifts.date, prevStart),
        lte(shifts.date, prevEnd),
        ne(shifts.status, "cancelled")
      )
    )
    .groupBy(shifts.workplaceId, workplaces.name);

  const previousMap = new Map(
    previousResults.map((r) => [
      r.workplaceId,
      Number(r.totalShifts) > 0 ? Math.round((Number(r.filledShifts) / Number(r.totalShifts)) * 100) : 0,
    ])
  );

  return current.map((c) => {
    const prev = previousMap.get(c.workplaceId) ?? 0;
    const change = c.fillRate - prev;
    let trend: "improving" | "declining" | "stable" = "stable";
    if (change > 5) trend = "improving";
    else if (change < -5) trend = "declining";

    return {
      workplaceId: c.workplaceId,
      workplaceName: c.workplaceName,
      currentFillRate: c.fillRate,
      previousFillRate: prev,
      change,
      trend,
    };
  });
}

async function getOverusedWorkers(days: number = 14): Promise<OverusedWorker[]> {
  const now = getNowUTC();
  const startDate = toDateString(subtractDays(now, days));
  const endDate = toDateString(now);

  const results = await db
    .select({
      workerId: shifts.workerUserId,
      workerName: users.fullName,
      shiftCount: count(shifts.id),
    })
    .from(shifts)
    .innerJoin(users, eq(shifts.workerUserId, users.id))
    .where(
      and(
        gte(shifts.date, startDate),
        lte(shifts.date, endDate),
        ne(shifts.status, "cancelled"),
        sql`${shifts.workerUserId} is not null`
      )
    )
    .groupBy(shifts.workerUserId, users.fullName)
    .orderBy(sql`count(${shifts.id}) desc`)
    .limit(20);

  return results.map((r) => ({
    workerId: r.workerId!,
    workerName: r.workerName,
    shiftCount: Number(r.shiftCount),
    period: `${days}d`,
  }));
}

async function getSchedulingConflicts(): Promise<SchedulingConflict[]> {
  const now = getNowUTC();
  const todayStr = toDateString(now);
  const futureStr = toDateString(addHours(now, 7 * 24));

  const upcomingShifts = await db
    .select({
      id: shifts.id,
      title: shifts.title,
      workerUserId: shifts.workerUserId,
      date: shifts.date,
      startTime: shifts.startTime,
      endTime: shifts.endTime,
      workerName: users.fullName,
    })
    .from(shifts)
    .leftJoin(users, eq(shifts.workerUserId, users.id))
    .where(
      and(
        gte(shifts.date, todayStr),
        lte(shifts.date, futureStr),
        eq(shifts.status, "scheduled"),
        sql`${shifts.workerUserId} is not null`
      )
    )
    .orderBy(shifts.workerUserId, shifts.date, shifts.startTime);

  const conflicts: SchedulingConflict[] = [];
  const byWorkerDate = new Map<string, typeof upcomingShifts>();

  for (const s of upcomingShifts) {
    const key = `${s.workerUserId}-${s.date}`;
    if (!byWorkerDate.has(key)) byWorkerDate.set(key, []);
    byWorkerDate.get(key)!.push(s);
  }

  for (const [, workerShifts] of byWorkerDate) {
    if (workerShifts.length < 2) continue;

    for (let i = 0; i < workerShifts.length; i++) {
      for (let j = i + 1; j < workerShifts.length; j++) {
        const a = workerShifts[i];
        const b = workerShifts[j];

        const aEnd = a.endTime ?? "23:59";
        const bEnd = b.endTime ?? "23:59";

        if (a.startTime < bEnd && b.startTime < aEnd) {
          conflicts.push({
            workerId: a.workerUserId!,
            workerName: a.workerName ?? "Unknown",
            shift1Id: a.id,
            shift1Title: a.title,
            shift2Id: b.id,
            shift2Title: b.title,
            date: a.date,
            overlapDescription: `${a.startTime}-${aEnd} overlaps with ${b.startTime}-${bEnd}`,
          });
        }
      }
    }
  }

  return conflicts;
}

async function getShiftOfferStats(days: number = 30): Promise<ShiftOfferStats> {
  const now = getNowUTC();
  const startDate = subtractDays(now, days);

  const results = await db
    .select({
      status: shiftOffers.status,
      count: count(shiftOffers.id),
    })
    .from(shiftOffers)
    .where(gte(shiftOffers.createdAt, startDate))
    .groupBy(shiftOffers.status);

  const statusCounts: Record<string, number> = {};
  let total = 0;
  for (const r of results) {
    statusCounts[r.status] = Number(r.count);
    total += Number(r.count);
  }

  const accepted = statusCounts["accepted"] ?? 0;
  const declined = statusCounts["declined"] ?? 0;
  const pending = statusCounts["pending"] ?? 0;
  const expired = statusCounts["expired"] ?? 0;

  return {
    totalOffers: total,
    accepted,
    declined,
    pending,
    expired,
    acceptanceRate: total > 0 ? Math.round((accepted / total) * 100) : 0,
    declineRate: total > 0 ? Math.round((declined / total) * 100) : 0,
  };
}

async function getProblematicSites(days: number = 30): Promise<ProblematicSite[]> {
  const now = getNowUTC();
  const startDate = toDateString(subtractDays(now, days));
  const endDate = toDateString(now);

  const siteStats = await db
    .select({
      workplaceId: shifts.workplaceId,
      workplaceName: workplaces.name,
      totalShifts: count(shifts.id),
      filledShifts: sql<number>`count(case when ${shifts.workerUserId} is not null and ${shifts.status} != 'cancelled' then 1 end)`.as("filled"),
      cancelledShifts: sql<number>`count(case when ${shifts.status} = 'cancelled' then 1 end)`.as("cancelled"),
    })
    .from(shifts)
    .leftJoin(workplaces, eq(shifts.workplaceId, workplaces.id))
    .where(
      and(
        gte(shifts.date, startDate),
        lte(shifts.date, endDate)
      )
    )
    .groupBy(shifts.workplaceId, workplaces.name);

  const problematic: ProblematicSite[] = [];

  for (const s of siteStats) {
    const total = Number(s.totalShifts);
    const filled = Number(s.filledShifts);
    const cancelled = Number(s.cancelledShifts);
    const fillRate = total > 0 ? Math.round((filled / total) * 100) : 100;
    const cancellationRate = total > 0 ? (cancelled / total) * 100 : 0;
    const issueScore = Math.round((100 - fillRate) * 0.6 + cancellationRate * 0.4);

    if (fillRate < 80 || cancelled > 2) {
      problematic.push({
        workplaceId: s.workplaceId,
        workplaceName: s.workplaceName ?? "Unknown",
        fillRate,
        cancellationCount: cancelled,
        issueScore,
      });
    }
  }

  return problematic.sort((a, b) => b.issueScore - a.issueScore);
}

export async function getStaffingMetrics(): Promise<StaffingMetrics> {
  const [
    unfilled12,
    unfilled24,
    unfilled48,
    fillRates7d,
    fillRates14d,
    fillRates30d,
    trends,
    overused,
    conflicts,
    offerStats,
    problematic,
  ] = await Promise.all([
    getUnfilledShifts(12),
    getUnfilledShifts(24),
    getUnfilledShifts(48),
    getFillRatesByWorkplace(7, "7-day"),
    getFillRatesByWorkplace(14, "14-day"),
    getFillRatesByWorkplace(30, "30-day"),
    getFillRateTrends(),
    getOverusedWorkers(14),
    getSchedulingConflicts(),
    getShiftOfferStats(30),
    getProblematicSites(30),
  ]);

  const avg7dFillRate =
    fillRates7d.length > 0
      ? Math.round(fillRates7d.reduce((sum, r) => sum + r.fillRate, 0) / fillRates7d.length)
      : 100;

  return {
    unfilledShifts: {
      next12Hours: unfilled12,
      next24Hours: unfilled24,
      next48Hours: unfilled48,
    },
    fillRates: {
      "7d": fillRates7d,
      "14d": fillRates14d,
      "30d": fillRates30d,
    },
    fillRateTrends: trends,
    overusedWorkers: overused,
    schedulingConflicts: conflicts,
    shiftOfferStats: offerStats,
    problematicSites: problematic,
    summary: {
      totalUpcomingShifts: unfilled48.length + (unfilled24.length - unfilled48.filter((s) => s.hoursUntilStart <= 24).length),
      totalUnfilledNext24h: unfilled24.length,
      averageFillRate7d: avg7dFillRate,
      totalConflicts: conflicts.length,
      totalProblematicSites: problematic.length,
    },
  };
}
