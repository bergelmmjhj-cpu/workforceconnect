import { db } from "../../../db";
import { users, shifts, titoLogs, shiftOffers, workplaces } from "../../../../shared/schema";
import { eq, and, gte, lte, sql, isNull, isNotNull, desc } from "drizzle-orm";
import { AnalyticsTimeWindow, TIME_WINDOWS } from "../types";

export interface LateArrival {
  workerId: string;
  workerName: string;
  totalLateArrivals: number;
  totalLateMinutes: number;
  averageLateMinutes: number;
  worstLateMinutes: number;
}

export interface NoShowRecord {
  workerId: string;
  workerName: string;
  totalNoShows: number;
  noShowShifts: Array<{
    shiftId: string;
    date: string;
    workplaceName: string;
  }>;
}

export interface AcceptThenCancelRecord {
  workerId: string;
  workerName: string;
  totalCancellations: number;
  cancelledOffers: Array<{
    shiftId: string;
    acceptedAt: string;
    cancelledAt: string;
    cancelReason: string | null;
  }>;
}

export interface ReliabilityScore {
  workerId: string;
  workerName: string;
  score: number;
  latenessScore: number;
  noShowScore: number;
  cancellationScore: number;
  totalShiftsInPeriod: number;
  lateCount: number;
  noShowCount: number;
  cancellationCount: number;
}

export interface ReliabilityTrend {
  workerId: string;
  workerName: string;
  currentScore: number;
  previousScore: number;
  trend: "improving" | "declining" | "stable";
  scoreDelta: number;
}

export interface RiskBreakdown {
  byWorker: Array<{ workerId: string; workerName: string; riskLevel: "low" | "medium" | "high" | "critical"; score: number }>;
  bySite: Array<{ workplaceId: string; workplaceName: string; avgReliability: number; workerCount: number }>;
  byRole: Array<{ roleType: string; avgReliability: number; workerCount: number }>;
}

export interface AttendanceMetrics {
  periodLabel: string;
  periodDays: number;
  lateArrivals: LateArrival[];
  noShows: NoShowRecord[];
  acceptThenCancels: AcceptThenCancelRecord[];
  reliabilityScores: ReliabilityScore[];
  reliabilityTrends: ReliabilityTrend[];
  decliningWorkers: ReliabilityTrend[];
  riskBreakdown: RiskBreakdown;
  summary: {
    totalWorkersAnalyzed: number;
    totalLateArrivals: number;
    totalNoShows: number;
    totalCancellations: number;
    averageReliabilityScore: number;
    highRiskWorkerCount: number;
    decliningWorkerCount: number;
  };
}

function getWindowDates(window: AnalyticsTimeWindow): { start: Date; end: Date } {
  const end = new Date();
  const start = new Date();
  start.setDate(start.getDate() - window.days);
  return { start, end };
}

function getPreviousWindowDates(window: AnalyticsTimeWindow): { start: Date; end: Date } {
  const end = new Date();
  end.setDate(end.getDate() - window.days);
  const start = new Date();
  start.setDate(start.getDate() - window.days * 2);
  return { start, end };
}

async function getLateArrivals(windowDates: { start: Date; end: Date }): Promise<LateArrival[]> {
  const results = await db
    .select({
      workerId: titoLogs.workerId,
      workerName: users.fullName,
      totalLateArrivals: sql<number>`count(*)::int`,
      totalLateMinutes: sql<number>`coalesce(sum(${titoLogs.lateMinutes}), 0)::int`,
      averageLateMinutes: sql<number>`coalesce(avg(${titoLogs.lateMinutes}), 0)::float`,
      worstLateMinutes: sql<number>`coalesce(max(${titoLogs.lateMinutes}), 0)::int`,
    })
    .from(titoLogs)
    .innerJoin(users, eq(titoLogs.workerId, users.id))
    .where(
      and(
        eq(titoLogs.flaggedLate, true),
        gte(titoLogs.createdAt, windowDates.start),
        lte(titoLogs.createdAt, windowDates.end)
      )
    )
    .groupBy(titoLogs.workerId, users.fullName)
    .orderBy(desc(sql`count(*)`));

  return results;
}

async function getNoShows(windowDates: { start: Date; end: Date }): Promise<NoShowRecord[]> {
  const startDate = windowDates.start.toISOString().split("T")[0];
  const endDate = windowDates.end.toISOString().split("T")[0];

  const completedShiftsWithNoTito = await db
    .select({
      workerId: shifts.workerUserId,
      workerName: users.fullName,
      shiftId: shifts.id,
      shiftDate: shifts.date,
      workplaceName: workplaces.name,
    })
    .from(shifts)
    .innerJoin(users, eq(shifts.workerUserId, users.id))
    .innerJoin(workplaces, eq(shifts.workplaceId, workplaces.id))
    .leftJoin(
      titoLogs,
      and(
        eq(titoLogs.workerId, shifts.workerUserId),
        eq(titoLogs.shiftId, shifts.id)
      )
    )
    .where(
      and(
        isNotNull(shifts.workerUserId),
        gte(shifts.date, startDate),
        lte(shifts.date, endDate),
        eq(shifts.status, "completed"),
        isNull(titoLogs.id)
      )
    )
    .orderBy(shifts.workerUserId);

  const grouped = new Map<string, NoShowRecord>();
  for (const row of completedShiftsWithNoTito) {
    if (!row.workerId) continue;
    const existing = grouped.get(row.workerId);
    const shiftEntry = {
      shiftId: row.shiftId,
      date: row.shiftDate,
      workplaceName: row.workplaceName,
    };
    if (existing) {
      existing.totalNoShows++;
      existing.noShowShifts.push(shiftEntry);
    } else {
      grouped.set(row.workerId, {
        workerId: row.workerId,
        workerName: row.workerName,
        totalNoShows: 1,
        noShowShifts: [shiftEntry],
      });
    }
  }

  return Array.from(grouped.values()).sort((a, b) => b.totalNoShows - a.totalNoShows);
}

async function getAcceptThenCancels(windowDates: { start: Date; end: Date }): Promise<AcceptThenCancelRecord[]> {
  const results = await db
    .select({
      workerId: shiftOffers.workerId,
      workerName: users.fullName,
      shiftId: shiftOffers.shiftId,
      respondedAt: shiftOffers.respondedAt,
      cancelledAt: shiftOffers.cancelledAt,
      cancelReason: shiftOffers.cancelReason,
    })
    .from(shiftOffers)
    .innerJoin(users, eq(shiftOffers.workerId, users.id))
    .where(
      and(
        eq(shiftOffers.status, "cancelled"),
        isNotNull(shiftOffers.respondedAt),
        isNotNull(shiftOffers.cancelledAt),
        gte(shiftOffers.createdAt, windowDates.start),
        lte(shiftOffers.createdAt, windowDates.end)
      )
    )
    .orderBy(shiftOffers.workerId);

  const grouped = new Map<string, AcceptThenCancelRecord>();
  for (const row of results) {
    const existing = grouped.get(row.workerId);
    const cancelEntry = {
      shiftId: row.shiftId,
      acceptedAt: row.respondedAt?.toISOString() ?? "",
      cancelledAt: row.cancelledAt?.toISOString() ?? "",
      cancelReason: row.cancelReason,
    };
    if (existing) {
      existing.totalCancellations++;
      existing.cancelledOffers.push(cancelEntry);
    } else {
      grouped.set(row.workerId, {
        workerId: row.workerId,
        workerName: row.workerName,
        totalCancellations: 1,
        cancelledOffers: [cancelEntry],
      });
    }
  }

  return Array.from(grouped.values()).sort((a, b) => b.totalCancellations - a.totalCancellations);
}

async function getWorkerShiftCounts(windowDates: { start: Date; end: Date }): Promise<Map<string, { count: number; name: string }>> {
  const startDate = windowDates.start.toISOString().split("T")[0];
  const endDate = windowDates.end.toISOString().split("T")[0];

  const results = await db
    .select({
      workerId: shifts.workerUserId,
      workerName: users.fullName,
      shiftCount: sql<number>`count(*)::int`,
    })
    .from(shifts)
    .innerJoin(users, eq(shifts.workerUserId, users.id))
    .where(
      and(
        isNotNull(shifts.workerUserId),
        gte(shifts.date, startDate),
        lte(shifts.date, endDate)
      )
    )
    .groupBy(shifts.workerUserId, users.fullName);

  const map = new Map<string, { count: number; name: string }>();
  for (const r of results) {
    if (r.workerId) {
      map.set(r.workerId, { count: r.shiftCount, name: r.workerName });
    }
  }
  return map;
}

function computeReliabilityScores(
  shiftCounts: Map<string, { count: number; name: string }>,
  lateArrivals: LateArrival[],
  noShows: NoShowRecord[],
  cancels: AcceptThenCancelRecord[]
): ReliabilityScore[] {
  const lateMap = new Map(lateArrivals.map(l => [l.workerId, l]));
  const noShowMap = new Map(noShows.map(n => [n.workerId, n]));
  const cancelMap = new Map(cancels.map(c => [c.workerId, c]));

  const allWorkerIds = new Set([
    ...shiftCounts.keys(),
    ...lateMap.keys(),
    ...noShowMap.keys(),
    ...cancelMap.keys(),
  ]);

  const scores: ReliabilityScore[] = [];

  for (const workerId of allWorkerIds) {
    const workerInfo = shiftCounts.get(workerId);
    const totalShifts = workerInfo?.count ?? 0;
    const workerName = workerInfo?.name
      ?? lateMap.get(workerId)?.workerName
      ?? noShowMap.get(workerId)?.workerName
      ?? cancelMap.get(workerId)?.workerName
      ?? "Unknown";

    const lateCount = lateMap.get(workerId)?.totalLateArrivals ?? 0;
    const noShowCount = noShowMap.get(workerId)?.totalNoShows ?? 0;
    const cancellationCount = cancelMap.get(workerId)?.totalCancellations ?? 0;

    const denominator = Math.max(totalShifts, 1);

    const latenessScore = Math.max(0, 100 - (lateCount / denominator) * 100);
    const noShowScore = Math.max(0, 100 - (noShowCount / denominator) * 200);
    const cancellationScore = Math.max(0, 100 - (cancellationCount / denominator) * 150);

    const score = Math.round(
      (latenessScore * 0.3 + noShowScore * 0.4 + cancellationScore * 0.3) * 10
    ) / 10;

    scores.push({
      workerId,
      workerName,
      score: Math.max(0, Math.min(100, score)),
      latenessScore: Math.round(latenessScore * 10) / 10,
      noShowScore: Math.round(noShowScore * 10) / 10,
      cancellationScore: Math.round(cancellationScore * 10) / 10,
      totalShiftsInPeriod: totalShifts,
      lateCount,
      noShowCount,
      cancellationCount,
    });
  }

  return scores.sort((a, b) => a.score - b.score);
}

async function computeReliabilityTrends(
  window: AnalyticsTimeWindow
): Promise<ReliabilityTrend[]> {
  const currentDates = getWindowDates(window);
  const previousDates = getPreviousWindowDates(window);

  const [currentLate, currentNoShows, currentCancels, currentShifts] = await Promise.all([
    getLateArrivals(currentDates),
    getNoShows(currentDates),
    getAcceptThenCancels(currentDates),
    getWorkerShiftCounts(currentDates),
  ]);

  const [prevLate, prevNoShows, prevCancels, prevShifts] = await Promise.all([
    getLateArrivals(previousDates),
    getNoShows(previousDates),
    getAcceptThenCancels(previousDates),
    getWorkerShiftCounts(previousDates),
  ]);

  const currentScores = computeReliabilityScores(currentShifts, currentLate, currentNoShows, currentCancels);
  const previousScores = computeReliabilityScores(prevShifts, prevLate, prevNoShows, prevCancels);

  const prevScoreMap = new Map(previousScores.map(s => [s.workerId, s.score]));

  const trends: ReliabilityTrend[] = [];
  for (const current of currentScores) {
    const previousScore = prevScoreMap.get(current.workerId);
    if (previousScore === undefined) continue;

    const delta = current.score - previousScore;
    let trend: "improving" | "declining" | "stable" = "stable";
    if (delta > 5) trend = "improving";
    else if (delta < -5) trend = "declining";

    trends.push({
      workerId: current.workerId,
      workerName: current.workerName,
      currentScore: current.score,
      previousScore,
      trend,
      scoreDelta: Math.round(delta * 10) / 10,
    });
  }

  return trends.sort((a, b) => a.scoreDelta - b.scoreDelta);
}

async function getRiskBreakdownBySite(windowDates: { start: Date; end: Date }): Promise<RiskBreakdown["bySite"]> {
  const startDate = windowDates.start.toISOString().split("T")[0];
  const endDate = windowDates.end.toISOString().split("T")[0];

  const results = await db
    .select({
      workplaceId: shifts.workplaceId,
      workplaceName: workplaces.name,
      totalShifts: sql<number>`count(*)::int`,
      lateCount: sql<number>`count(case when ${titoLogs.flaggedLate} = true then 1 end)::int`,
      noTitoCount: sql<number>`count(case when ${titoLogs.id} is null and ${shifts.status} = 'completed' then 1 end)::int`,
    })
    .from(shifts)
    .innerJoin(workplaces, eq(shifts.workplaceId, workplaces.id))
    .leftJoin(
      titoLogs,
      and(
        eq(titoLogs.shiftId, shifts.id),
        eq(titoLogs.workerId, shifts.workerUserId)
      )
    )
    .where(
      and(
        isNotNull(shifts.workerUserId),
        gte(shifts.date, startDate),
        lte(shifts.date, endDate)
      )
    )
    .groupBy(shifts.workplaceId, workplaces.name);

  return results.map(r => {
    const totalIssues = r.lateCount + r.noTitoCount;
    const reliability = r.totalShifts > 0
      ? Math.round((1 - totalIssues / r.totalShifts) * 1000) / 10
      : 100;
    return {
      workplaceId: r.workplaceId,
      workplaceName: r.workplaceName,
      avgReliability: Math.max(0, reliability),
      workerCount: r.totalShifts,
    };
  }).sort((a, b) => a.avgReliability - b.avgReliability);
}

async function getRiskBreakdownByRole(windowDates: { start: Date; end: Date }): Promise<RiskBreakdown["byRole"]> {
  const startDate = windowDates.start.toISOString().split("T")[0];
  const endDate = windowDates.end.toISOString().split("T")[0];

  const results = await db
    .select({
      roleType: shifts.roleType,
      totalShifts: sql<number>`count(*)::int`,
      lateCount: sql<number>`count(case when ${titoLogs.flaggedLate} = true then 1 end)::int`,
      noTitoCount: sql<number>`count(case when ${titoLogs.id} is null and ${shifts.status} = 'completed' then 1 end)::int`,
    })
    .from(shifts)
    .leftJoin(
      titoLogs,
      and(
        eq(titoLogs.shiftId, shifts.id),
        eq(titoLogs.workerId, shifts.workerUserId)
      )
    )
    .where(
      and(
        isNotNull(shifts.workerUserId),
        isNotNull(shifts.roleType),
        gte(shifts.date, startDate),
        lte(shifts.date, endDate)
      )
    )
    .groupBy(shifts.roleType);

  return results.map(r => {
    const totalIssues = r.lateCount + r.noTitoCount;
    const reliability = r.totalShifts > 0
      ? Math.round((1 - totalIssues / r.totalShifts) * 1000) / 10
      : 100;
    return {
      roleType: r.roleType ?? "Unknown",
      avgReliability: Math.max(0, reliability),
      workerCount: r.totalShifts,
    };
  }).sort((a, b) => a.avgReliability - b.avgReliability);
}

export async function getAttendanceMetrics(
  windowKey: string = "30d"
): Promise<AttendanceMetrics> {
  const window = TIME_WINDOWS[windowKey] ?? TIME_WINDOWS["30d"];
  const windowDates = getWindowDates(window);

  const [lateArrivals, noShows, acceptThenCancels, shiftCounts, siteBd, roleBd, trends] = await Promise.all([
    getLateArrivals(windowDates),
    getNoShows(windowDates),
    getAcceptThenCancels(windowDates),
    getWorkerShiftCounts(windowDates),
    getRiskBreakdownBySite(windowDates),
    getRiskBreakdownByRole(windowDates),
    computeReliabilityTrends(window),
  ]);

  const reliabilityScores = computeReliabilityScores(shiftCounts, lateArrivals, noShows, acceptThenCancels);

  const workerRiskBreakdown = reliabilityScores.map(s => ({
    workerId: s.workerId,
    workerName: s.workerName,
    riskLevel: (s.score >= 80 ? "low" : s.score >= 60 ? "medium" : s.score >= 40 ? "high" : "critical") as "low" | "medium" | "high" | "critical",
    score: s.score,
  }));

  const decliningWorkers = trends.filter(t => t.trend === "declining");

  const totalLateArrivals = lateArrivals.reduce((sum, l) => sum + l.totalLateArrivals, 0);
  const totalNoShows = noShows.reduce((sum, n) => sum + n.totalNoShows, 0);
  const totalCancellations = acceptThenCancels.reduce((sum, c) => sum + c.totalCancellations, 0);
  const avgScore = reliabilityScores.length > 0
    ? Math.round(reliabilityScores.reduce((sum, s) => sum + s.score, 0) / reliabilityScores.length * 10) / 10
    : 100;
  const highRiskCount = workerRiskBreakdown.filter(w => w.riskLevel === "high" || w.riskLevel === "critical").length;

  return {
    periodLabel: window.label,
    periodDays: window.days,
    lateArrivals,
    noShows,
    acceptThenCancels,
    reliabilityScores,
    reliabilityTrends: trends,
    decliningWorkers,
    riskBreakdown: {
      byWorker: workerRiskBreakdown,
      bySite: siteBd,
      byRole: roleBd,
    },
    summary: {
      totalWorkersAnalyzed: reliabilityScores.length,
      totalLateArrivals,
      totalNoShows,
      totalCancellations,
      averageReliabilityScore: avgScore,
      highRiskWorkerCount: highRiskCount,
      decliningWorkerCount: decliningWorkers.length,
    },
  };
}
