import { db } from "../../../db";
import { shifts, workplaces, titoLogs, shiftOffers, shiftRequests, workplaceAssignments, recurrenceExceptions } from "../../../../shared/schema";
import { eq, and, gte, lte, sql, count, isNull, isNotNull, ne } from "drizzle-orm";
import { TIME_WINDOWS } from "../types";

export interface SiteRiskScore {
  workplaceId: string;
  workplaceName: string;
  riskScore: number;
  cancellationRate: number;
  noShowRate: number;
  fillRate: number;
  gpsFailureRate: number;
  totalShifts: number;
  isActive: boolean;
}

export interface SiteCancellationData {
  workplaceId: string;
  workplaceName: string;
  cancellationCount: number;
  totalShifts: number;
  cancellationRate: number;
  period: string;
}

export interface SiteNoShowData {
  workplaceId: string;
  workplaceName: string;
  noShowCount: number;
  totalScheduledShifts: number;
  noShowRate: number;
}

export interface GpsFailureData {
  workplaceId: string;
  workplaceName: string;
  totalClockIns: number;
  gpsFailures: number;
  failureRate: number;
}

export interface SiteReliabilityTrend {
  workplaceId: string;
  workplaceName: string;
  currentPeriodScore: number;
  previousPeriodScore: number;
  trend: "improving" | "declining" | "stable";
  changePercent: number;
}

export interface SiteEscalation {
  workplaceId: string;
  workplaceName: string;
  riskScore: number;
  trend: "declining" | "stable";
  reasons: string[];
}

export interface ClientActivityData {
  totalSites: number;
  activeSites: number;
  inactiveSites: number;
  sitesWithRecentShifts: number;
  sitesWithNoRecentShifts: number;
}

export interface ClientRiskMetrics {
  siteRiskScores: SiteRiskScore[];
  siteCancellations: SiteCancellationData[];
  siteNoShows: SiteNoShowData[];
  gpsFailures: GpsFailureData[];
  reliabilityTrends: SiteReliabilityTrend[];
  sitesNeedingEscalation: SiteEscalation[];
  clientActivity: ClientActivityData;
  generatedAt: string;
}

function getWindowStart(days: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d;
}

async function computeSiteRiskScores(days: number): Promise<SiteRiskScore[]> {
  const windowStart = getWindowStart(days);
  const now = new Date();
  const windowStartStr = windowStart.toISOString().split("T")[0];
  const nowStr = now.toISOString().split("T")[0];

  const allWorkplaces = await db
    .select({ id: workplaces.id, name: workplaces.name, isActive: workplaces.isActive })
    .from(workplaces);

  const results: SiteRiskScore[] = [];

  for (const wp of allWorkplaces) {
    const totalShiftsResult = await db
      .select({ cnt: count() })
      .from(shifts)
      .where(and(eq(shifts.workplaceId, wp.id), gte(shifts.date, windowStartStr), lte(shifts.date, nowStr)));
    const totalShifts = totalShiftsResult[0]?.cnt ?? 0;

    if (totalShifts === 0) {
      results.push({
        workplaceId: wp.id,
        workplaceName: wp.name,
        riskScore: 0,
        cancellationRate: 0,
        noShowRate: 0,
        fillRate: 0,
        gpsFailureRate: 0,
        totalShifts: 0,
        isActive: wp.isActive ?? true,
      });
      continue;
    }

    const cancelledResult = await db
      .select({ cnt: count() })
      .from(shifts)
      .where(and(eq(shifts.workplaceId, wp.id), eq(shifts.status, "cancelled"), gte(shifts.date, windowStartStr), lte(shifts.date, nowStr)));
    const cancelledCount = cancelledResult[0]?.cnt ?? 0;
    const cancellationRate = totalShifts > 0 ? cancelledCount / totalShifts : 0;

    const completedWithNoClockIn = await db
      .select({ cnt: count() })
      .from(shifts)
      .leftJoin(titoLogs, and(eq(titoLogs.shiftId, shifts.id), isNotNull(titoLogs.timeIn)))
      .where(
        and(
          eq(shifts.workplaceId, wp.id),
          eq(shifts.status, "completed"),
          gte(shifts.date, windowStartStr),
          lte(shifts.date, nowStr),
          isNull(titoLogs.id),
        ),
      );
    const scheduledNonCancelledResult = await db
      .select({ cnt: count() })
      .from(shifts)
      .where(
        and(
          eq(shifts.workplaceId, wp.id),
          ne(shifts.status, "cancelled"),
          gte(shifts.date, windowStartStr),
          lte(shifts.date, nowStr),
        ),
      );
    const scheduledNonCancelled = scheduledNonCancelledResult[0]?.cnt ?? 0;
    const noShowCount = completedWithNoClockIn[0]?.cnt ?? 0;
    const noShowRate = scheduledNonCancelled > 0 ? noShowCount / scheduledNonCancelled : 0;

    const filledResult = await db
      .select({ cnt: count() })
      .from(shifts)
      .where(
        and(
          eq(shifts.workplaceId, wp.id),
          isNotNull(shifts.workerUserId),
          ne(shifts.status, "cancelled"),
          gte(shifts.date, windowStartStr),
          lte(shifts.date, nowStr),
        ),
      );
    const filledCount = filledResult[0]?.cnt ?? 0;
    const fillRate = scheduledNonCancelled > 0 ? filledCount / scheduledNonCancelled : 0;

    const totalClockInsResult = await db
      .select({ cnt: count() })
      .from(titoLogs)
      .where(and(eq(titoLogs.workplaceId, wp.id), isNotNull(titoLogs.timeIn), gte(titoLogs.timeIn, windowStart)));
    const totalClockIns = totalClockInsResult[0]?.cnt ?? 0;

    const gpsFailuresResult = await db
      .select({ cnt: count() })
      .from(titoLogs)
      .where(
        and(
          eq(titoLogs.workplaceId, wp.id),
          eq(titoLogs.timeInGpsVerified, false),
          isNotNull(titoLogs.timeIn),
          gte(titoLogs.timeIn, windowStart),
        ),
      );
    const gpsFailureCount = gpsFailuresResult[0]?.cnt ?? 0;
    const gpsFailureRate = totalClockIns > 0 ? gpsFailureCount / totalClockIns : 0;

    const riskScore =
      cancellationRate * 25 +
      noShowRate * 30 +
      (1 - fillRate) * 25 +
      gpsFailureRate * 20;

    results.push({
      workplaceId: wp.id,
      workplaceName: wp.name,
      riskScore: Math.round(riskScore * 100) / 100,
      cancellationRate: Math.round(cancellationRate * 1000) / 1000,
      noShowRate: Math.round(noShowRate * 1000) / 1000,
      fillRate: Math.round(fillRate * 1000) / 1000,
      gpsFailureRate: Math.round(gpsFailureRate * 1000) / 1000,
      totalShifts,
      isActive: wp.isActive ?? true,
    });
  }

  return results.sort((a, b) => b.riskScore - a.riskScore);
}

async function computeSiteCancellations(days: number): Promise<SiteCancellationData[]> {
  const windowStart = getWindowStart(days);
  const windowStartStr = windowStart.toISOString().split("T")[0];
  const nowStr = new Date().toISOString().split("T")[0];
  const label = TIME_WINDOWS[`${days}d`]?.label ?? `${days}-day`;

  const result = await db
    .select({
      workplaceId: shifts.workplaceId,
      workplaceName: workplaces.name,
      totalShifts: count(),
      cancelledCount: sql<number>`count(*) filter (where ${shifts.status} = 'cancelled')`,
    })
    .from(shifts)
    .innerJoin(workplaces, eq(shifts.workplaceId, workplaces.id))
    .where(and(gte(shifts.date, windowStartStr), lte(shifts.date, nowStr)))
    .groupBy(shifts.workplaceId, workplaces.name);

  return result
    .map((r) => ({
      workplaceId: r.workplaceId,
      workplaceName: r.workplaceName,
      cancellationCount: Number(r.cancelledCount),
      totalShifts: r.totalShifts,
      cancellationRate: r.totalShifts > 0 ? Math.round((Number(r.cancelledCount) / r.totalShifts) * 1000) / 1000 : 0,
      period: label,
    }))
    .sort((a, b) => b.cancellationRate - a.cancellationRate);
}

async function computeSiteNoShows(days: number): Promise<SiteNoShowData[]> {
  const windowStart = getWindowStart(days);
  const windowStartStr = windowStart.toISOString().split("T")[0];
  const nowStr = new Date().toISOString().split("T")[0];

  const scheduledShifts = await db
    .select({
      workplaceId: shifts.workplaceId,
      workplaceName: workplaces.name,
      totalScheduled: count(),
    })
    .from(shifts)
    .innerJoin(workplaces, eq(shifts.workplaceId, workplaces.id))
    .where(
      and(
        isNotNull(shifts.workerUserId),
        ne(shifts.status, "cancelled"),
        gte(shifts.date, windowStartStr),
        lte(shifts.date, nowStr),
      ),
    )
    .groupBy(shifts.workplaceId, workplaces.name);

  const shiftsWithClockIn = await db
    .select({
      workplaceId: shifts.workplaceId,
      clockedIn: count(),
    })
    .from(shifts)
    .innerJoin(titoLogs, and(eq(titoLogs.shiftId, shifts.id), isNotNull(titoLogs.timeIn)))
    .where(
      and(
        isNotNull(shifts.workerUserId),
        ne(shifts.status, "cancelled"),
        gte(shifts.date, windowStartStr),
        lte(shifts.date, nowStr),
      ),
    )
    .groupBy(shifts.workplaceId);

  const clockInMap = new Map(shiftsWithClockIn.map((s) => [s.workplaceId, s.clockedIn]));

  return scheduledShifts
    .map((s) => {
      const clockedIn = clockInMap.get(s.workplaceId) ?? 0;
      const noShowCount = Math.max(0, s.totalScheduled - clockedIn);
      return {
        workplaceId: s.workplaceId,
        workplaceName: s.workplaceName,
        noShowCount,
        totalScheduledShifts: s.totalScheduled,
        noShowRate: s.totalScheduled > 0 ? Math.round((noShowCount / s.totalScheduled) * 1000) / 1000 : 0,
      };
    })
    .sort((a, b) => b.noShowRate - a.noShowRate);
}

async function computeGpsFailures(days: number): Promise<GpsFailureData[]> {
  const windowStart = getWindowStart(days);

  const result = await db
    .select({
      workplaceId: titoLogs.workplaceId,
      workplaceName: workplaces.name,
      totalClockIns: count(),
      gpsFailures: sql<number>`count(*) filter (where ${titoLogs.timeInGpsVerified} = false)`,
    })
    .from(titoLogs)
    .innerJoin(workplaces, eq(titoLogs.workplaceId, workplaces.id))
    .where(and(isNotNull(titoLogs.timeIn), gte(titoLogs.timeIn, windowStart)))
    .groupBy(titoLogs.workplaceId, workplaces.name);

  return result
    .map((r) => ({
      workplaceId: r.workplaceId!,
      workplaceName: r.workplaceName,
      totalClockIns: r.totalClockIns,
      gpsFailures: Number(r.gpsFailures),
      failureRate: r.totalClockIns > 0 ? Math.round((Number(r.gpsFailures) / r.totalClockIns) * 1000) / 1000 : 0,
    }))
    .sort((a, b) => b.failureRate - a.failureRate);
}

async function computeReliabilityTrends(days: number): Promise<SiteReliabilityTrend[]> {
  const currentStart = getWindowStart(days);
  const previousStart = getWindowStart(days * 2);
  const currentStartStr = currentStart.toISOString().split("T")[0];
  const previousStartStr = previousStart.toISOString().split("T")[0];
  const nowStr = new Date().toISOString().split("T")[0];

  const allWorkplaces = await db
    .select({ id: workplaces.id, name: workplaces.name })
    .from(workplaces);

  const results: SiteReliabilityTrend[] = [];

  for (const wp of allWorkplaces) {
    const currentShifts = await db
      .select({
        total: count(),
        cancelled: sql<number>`count(*) filter (where ${shifts.status} = 'cancelled')`,
        filled: sql<number>`count(*) filter (where ${shifts.workerUserId} is not null and ${shifts.status} != 'cancelled')`,
      })
      .from(shifts)
      .where(and(eq(shifts.workplaceId, wp.id), gte(shifts.date, currentStartStr), lte(shifts.date, nowStr)));

    const prevShifts = await db
      .select({
        total: count(),
        cancelled: sql<number>`count(*) filter (where ${shifts.status} = 'cancelled')`,
        filled: sql<number>`count(*) filter (where ${shifts.workerUserId} is not null and ${shifts.status} != 'cancelled')`,
      })
      .from(shifts)
      .where(and(eq(shifts.workplaceId, wp.id), gte(shifts.date, previousStartStr), lte(shifts.date, currentStartStr)));

    const curTotal = currentShifts[0]?.total ?? 0;
    const prevTotal = prevShifts[0]?.total ?? 0;

    if (curTotal === 0 && prevTotal === 0) continue;

    const curNonCancelled = curTotal - Number(currentShifts[0]?.cancelled ?? 0);
    const prevNonCancelled = prevTotal - Number(prevShifts[0]?.cancelled ?? 0);

    const curFillRate = curNonCancelled > 0 ? Number(currentShifts[0]?.filled ?? 0) / curNonCancelled : 0;
    const prevFillRate = prevNonCancelled > 0 ? Number(prevShifts[0]?.filled ?? 0) / prevNonCancelled : 0;

    const curCancelRate = curTotal > 0 ? Number(currentShifts[0]?.cancelled ?? 0) / curTotal : 0;
    const prevCancelRate = prevTotal > 0 ? Number(prevShifts[0]?.cancelled ?? 0) / prevTotal : 0;

    const currentScore = curFillRate * 50 + (1 - curCancelRate) * 50;
    const previousScore = prevFillRate * 50 + (1 - prevCancelRate) * 50;

    const change = previousScore > 0 ? ((currentScore - previousScore) / previousScore) * 100 : 0;

    let trend: "improving" | "declining" | "stable" = "stable";
    if (change > 5) trend = "improving";
    else if (change < -5) trend = "declining";

    results.push({
      workplaceId: wp.id,
      workplaceName: wp.name,
      currentPeriodScore: Math.round(currentScore * 100) / 100,
      previousPeriodScore: Math.round(previousScore * 100) / 100,
      trend,
      changePercent: Math.round(change * 100) / 100,
    });
  }

  return results;
}

async function computeEscalations(riskScores: SiteRiskScore[], trends: SiteReliabilityTrend[]): Promise<SiteEscalation[]> {
  const trendMap = new Map(trends.map((t) => [t.workplaceId, t]));
  const escalations: SiteEscalation[] = [];

  for (const site of riskScores) {
    if (site.riskScore < 15 || site.totalShifts === 0) continue;

    const trend = trendMap.get(site.workplaceId);
    const sitetrend = trend?.trend === "declining" ? "declining" as const : "stable" as const;

    if (site.riskScore >= 30 || (site.riskScore >= 15 && sitetrend === "declining")) {
      const reasons: string[] = [];
      if (site.cancellationRate > 0.15) reasons.push(`High cancellation rate: ${(site.cancellationRate * 100).toFixed(1)}%`);
      if (site.noShowRate > 0.1) reasons.push(`High no-show rate: ${(site.noShowRate * 100).toFixed(1)}%`);
      if (site.fillRate < 0.8) reasons.push(`Low fill rate: ${(site.fillRate * 100).toFixed(1)}%`);
      if (site.gpsFailureRate > 0.2) reasons.push(`High GPS failure rate: ${(site.gpsFailureRate * 100).toFixed(1)}%`);
      if (sitetrend === "declining") reasons.push("Worsening trend compared to previous period");
      if (reasons.length === 0) reasons.push(`Elevated composite risk score: ${site.riskScore}`);

      escalations.push({
        workplaceId: site.workplaceId,
        workplaceName: site.workplaceName,
        riskScore: site.riskScore,
        trend: sitetrend,
        reasons,
      });
    }
  }

  return escalations.sort((a, b) => b.riskScore - a.riskScore);
}

async function computeClientActivity(days: number): Promise<ClientActivityData> {
  const windowStart = getWindowStart(days);
  const windowStartStr = windowStart.toISOString().split("T")[0];
  const nowStr = new Date().toISOString().split("T")[0];

  const allSites = await db.select({ cnt: count() }).from(workplaces);
  const activeSites = await db.select({ cnt: count() }).from(workplaces).where(eq(workplaces.isActive, true));
  const inactiveSites = await db.select({ cnt: count() }).from(workplaces).where(eq(workplaces.isActive, false));

  const sitesWithShifts = await db
    .select({ cnt: sql<number>`count(distinct ${shifts.workplaceId})` })
    .from(shifts)
    .where(and(gte(shifts.date, windowStartStr), lte(shifts.date, nowStr)));

  const totalSites = allSites[0]?.cnt ?? 0;
  const withShifts = Number(sitesWithShifts[0]?.cnt ?? 0);

  return {
    totalSites,
    activeSites: activeSites[0]?.cnt ?? 0,
    inactiveSites: inactiveSites[0]?.cnt ?? 0,
    sitesWithRecentShifts: withShifts,
    sitesWithNoRecentShifts: totalSites - withShifts,
  };
}

export async function getClientRiskMetrics(windowDays: number = 14): Promise<ClientRiskMetrics> {
  const [
    siteRiskScores,
    siteCancellations,
    siteNoShows,
    gpsFailures,
    reliabilityTrends,
    clientActivity,
  ] = await Promise.all([
    computeSiteRiskScores(windowDays),
    computeSiteCancellations(windowDays),
    computeSiteNoShows(windowDays),
    computeGpsFailures(windowDays),
    computeReliabilityTrends(windowDays),
    computeClientActivity(windowDays),
  ]);

  const sitesNeedingEscalation = await computeEscalations(siteRiskScores, reliabilityTrends);

  return {
    siteRiskScores,
    siteCancellations,
    siteNoShows,
    gpsFailures,
    reliabilityTrends,
    sitesNeedingEscalation,
    clientActivity,
    generatedAt: new Date().toISOString(),
  };
}
