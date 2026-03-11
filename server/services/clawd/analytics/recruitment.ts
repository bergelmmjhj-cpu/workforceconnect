import { db } from "../../../db";
import { workerApplications, shifts, users, workplaces } from "../../../../shared/schema";
import { eq, sql, and, gte, lte, count, isNull, isNotNull, desc } from "drizzle-orm";
import { TIME_WINDOWS, type AnalyticsTimeWindow } from "../types";

export interface StageCount {
  stage: string;
  count: number;
  percentage: number;
}

export interface StalledApplicant {
  applicationId: string;
  fullName: string;
  email: string;
  currentStage: string;
  daysSinceLastChange: number;
  appliedAt: Date;
}

export interface StageTimingMetrics {
  stage: string;
  averageDaysInStage: number;
  medianDaysInStage: number;
  totalApplicantsInStage: number;
}

export interface ConversionRate {
  fromStage: string;
  toStage: string;
  rate: number;
  total: number;
  converted: number;
}

export interface RoleDemand {
  role: string;
  applicantCount: number;
  activeWorkerCount: number;
  unfilledShiftCount: number;
  gap: number;
}

export interface ChronicShortageRole {
  role: string;
  unfilledShiftCount: number;
  activeWorkerCount: number;
  applicantsInPipeline: number;
  shortageScore: number;
}

export interface PipelineVelocity {
  week: string;
  applicationCount: number;
  trend: "increasing" | "decreasing" | "stable";
}

export interface RecruitmentMetrics {
  applicantsByStage: StageCount[];
  totalApplicants: number;
  stalledApplicants: StalledApplicant[];
  stageTimings: StageTimingMetrics[];
  conversionRates: ConversionRate[];
  roleDemandAnalysis: RoleDemand[];
  chronicShortageRoles: ChronicShortageRole[];
  pipelineVelocity: PipelineVelocity[];
  summary: {
    totalActive: number;
    pendingCount: number;
    approvedLast30Days: number;
    rejectedLast30Days: number;
    averageTimeToDecision: number;
    pipelineHealthScore: number;
  };
}

const STAGES = ["pending", "reviewed", "approved", "rejected"] as const;
const STALLED_THRESHOLD_DAYS = 7;

export async function getRecruitmentMetrics(): Promise<RecruitmentMetrics> {
  const [
    applicantsByStage,
    stalledApplicants,
    stageTimings,
    conversionRates,
    roleDemandAnalysis,
    chronicShortageRoles,
    pipelineVelocity,
    summaryData,
  ] = await Promise.all([
    computeApplicantsByStage(),
    computeStalledApplicants(),
    computeStageTimings(),
    computeConversionRates(),
    computeRoleDemandAnalysis(),
    computeChronicShortageRoles(),
    computePipelineVelocity(),
    computeSummary(),
  ]);

  return {
    applicantsByStage,
    totalApplicants: applicantsByStage.reduce((sum, s) => sum + s.count, 0),
    stalledApplicants,
    stageTimings,
    conversionRates,
    roleDemandAnalysis,
    chronicShortageRoles,
    pipelineVelocity,
    summary: summaryData,
  };
}

async function computeApplicantsByStage(): Promise<StageCount[]> {
  const results = await db
    .select({
      stage: workerApplications.status,
      count: count(),
    })
    .from(workerApplications)
    .groupBy(workerApplications.status);

  const total = results.reduce((sum, r) => sum + Number(r.count), 0);

  return STAGES.map((stage) => {
    const found = results.find((r) => r.stage === stage);
    const cnt = found ? Number(found.count) : 0;
    return {
      stage,
      count: cnt,
      percentage: total > 0 ? Math.round((cnt / total) * 100 * 10) / 10 : 0,
    };
  });
}

async function computeStalledApplicants(): Promise<StalledApplicant[]> {
  const thresholdDate = new Date();
  thresholdDate.setDate(thresholdDate.getDate() - STALLED_THRESHOLD_DAYS);

  const results = await db
    .select({
      id: workerApplications.id,
      fullName: workerApplications.fullName,
      email: workerApplications.email,
      status: workerApplications.status,
      updatedAt: workerApplications.updatedAt,
      createdAt: workerApplications.createdAt,
    })
    .from(workerApplications)
    .where(
      and(
        sql`${workerApplications.status} IN ('pending', 'reviewed')`,
        lte(workerApplications.updatedAt, thresholdDate)
      )
    )
    .orderBy(workerApplications.updatedAt);

  const now = new Date();
  return results.map((r) => ({
    applicationId: r.id,
    fullName: r.fullName,
    email: r.email,
    currentStage: r.status,
    daysSinceLastChange: Math.floor(
      (now.getTime() - new Date(r.updatedAt).getTime()) / (1000 * 60 * 60 * 24)
    ),
    appliedAt: new Date(r.createdAt),
  }));
}

async function computeStageTimings(): Promise<StageTimingMetrics[]> {
  const timings: StageTimingMetrics[] = [];

  const pendingApps = await db
    .select({
      createdAt: workerApplications.createdAt,
      updatedAt: workerApplications.updatedAt,
      status: workerApplications.status,
      reviewedAt: workerApplications.reviewedAt,
    })
    .from(workerApplications);

  const pendingDurations: number[] = [];
  const reviewedDurations: number[] = [];
  let pendingCount = 0;
  let reviewedCount = 0;

  for (const app of pendingApps) {
    const created = new Date(app.createdAt).getTime();
    const updated = new Date(app.updatedAt).getTime();

    if (app.status === "pending") {
      pendingCount++;
      const days = (Date.now() - created) / (1000 * 60 * 60 * 24);
      pendingDurations.push(days);
    } else {
      const reviewedDate = app.reviewedAt
        ? new Date(app.reviewedAt).getTime()
        : updated;
      const daysInPending = (reviewedDate - created) / (1000 * 60 * 60 * 24);
      pendingDurations.push(daysInPending);

      if (app.status === "reviewed") {
        reviewedCount++;
        const days = (Date.now() - reviewedDate) / (1000 * 60 * 60 * 24);
        reviewedDurations.push(days);
      } else if (app.status === "approved" || app.status === "rejected") {
        const daysInReviewed = (updated - reviewedDate) / (1000 * 60 * 60 * 24);
        if (daysInReviewed > 0) {
          reviewedDurations.push(daysInReviewed);
        }
      }
    }
  }

  timings.push({
    stage: "pending",
    averageDaysInStage: computeAverage(pendingDurations),
    medianDaysInStage: computeMedian(pendingDurations),
    totalApplicantsInStage: pendingCount,
  });

  timings.push({
    stage: "reviewed",
    averageDaysInStage: computeAverage(reviewedDurations),
    medianDaysInStage: computeMedian(reviewedDurations),
    totalApplicantsInStage: reviewedCount,
  });

  return timings;
}

async function computeConversionRates(): Promise<ConversionRate[]> {
  const stageCounts = await db
    .select({
      status: workerApplications.status,
      count: count(),
    })
    .from(workerApplications)
    .groupBy(workerApplications.status);

  const countMap: Record<string, number> = {};
  let totalAll = 0;
  for (const r of stageCounts) {
    countMap[r.status] = Number(r.count);
    totalAll += Number(r.count);
  }

  const rates: ConversionRate[] = [];

  const pendingTotal = totalAll;
  const reviewedTotal = (countMap["reviewed"] || 0) + (countMap["approved"] || 0) + (countMap["rejected"] || 0);
  const approvedTotal = countMap["approved"] || 0;

  rates.push({
    fromStage: "pending",
    toStage: "reviewed",
    total: pendingTotal,
    converted: reviewedTotal,
    rate: pendingTotal > 0 ? Math.round((reviewedTotal / pendingTotal) * 100 * 10) / 10 : 0,
  });

  rates.push({
    fromStage: "reviewed",
    toStage: "approved",
    total: reviewedTotal,
    converted: approvedTotal,
    rate: reviewedTotal > 0 ? Math.round((approvedTotal / reviewedTotal) * 100 * 10) / 10 : 0,
  });

  rates.push({
    fromStage: "pending",
    toStage: "approved",
    total: pendingTotal,
    converted: approvedTotal,
    rate: pendingTotal > 0 ? Math.round((approvedTotal / pendingTotal) * 100 * 10) / 10 : 0,
  });

  return rates;
}

async function computeRoleDemandAnalysis(): Promise<RoleDemand[]> {
  const now = new Date();
  const thirtyDaysFromNow = new Date();
  thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

  const applicantRoles = await db
    .select({
      preferredRoles: workerApplications.preferredRoles,
      status: workerApplications.status,
    })
    .from(workerApplications)
    .where(sql`${workerApplications.status} IN ('pending', 'reviewed')`);

  const roleCounts: Record<string, number> = {};
  for (const app of applicantRoles) {
    try {
      const roles: string[] = JSON.parse(app.preferredRoles);
      for (const role of roles) {
        const normalized = role.toLowerCase().trim();
        roleCounts[normalized] = (roleCounts[normalized] || 0) + 1;
      }
    } catch {
      const normalized = app.preferredRoles.toLowerCase().trim();
      roleCounts[normalized] = (roleCounts[normalized] || 0) + 1;
    }
  }

  const activeWorkers = await db
    .select({
      workerRoles: users.workerRoles,
    })
    .from(users)
    .where(
      and(
        eq(users.role, "worker"),
        eq(users.isActive, true)
      )
    );

  const workerRoleCounts: Record<string, number> = {};
  for (const worker of activeWorkers) {
    if (worker.workerRoles) {
      try {
        const roles: string[] = JSON.parse(worker.workerRoles);
        for (const role of roles) {
          const normalized = role.toLowerCase().trim();
          workerRoleCounts[normalized] = (workerRoleCounts[normalized] || 0) + 1;
        }
      } catch {
        const normalized = worker.workerRoles.toLowerCase().trim();
        workerRoleCounts[normalized] = (workerRoleCounts[normalized] || 0) + 1;
      }
    }
  }

  const unfilledShifts = await db
    .select({
      roleType: shifts.roleType,
      cnt: count(),
    })
    .from(shifts)
    .where(
      and(
        eq(shifts.status, "scheduled"),
        isNull(shifts.workerUserId),
        gte(shifts.date, now.toISOString().split("T")[0]),
        lte(shifts.date, thirtyDaysFromNow.toISOString().split("T")[0])
      )
    )
    .groupBy(shifts.roleType);

  const unfilledByRole: Record<string, number> = {};
  for (const s of unfilledShifts) {
    if (s.roleType) {
      const normalized = s.roleType.toLowerCase().trim();
      unfilledByRole[normalized] = Number(s.cnt);
    }
  }

  const allRoles = new Set([
    ...Object.keys(roleCounts),
    ...Object.keys(workerRoleCounts),
    ...Object.keys(unfilledByRole),
  ]);

  return Array.from(allRoles).map((role) => {
    const applicantCount = roleCounts[role] || 0;
    const activeWorkerCount = workerRoleCounts[role] || 0;
    const unfilledShiftCount = unfilledByRole[role] || 0;
    return {
      role,
      applicantCount,
      activeWorkerCount,
      unfilledShiftCount,
      gap: unfilledShiftCount - applicantCount,
    };
  });
}

async function computeChronicShortageRoles(): Promise<ChronicShortageRole[]> {
  const sixtyDaysAgo = new Date();
  sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);

  const unfilledShifts = await db
    .select({
      roleType: shifts.roleType,
      cnt: count(),
    })
    .from(shifts)
    .where(
      and(
        isNull(shifts.workerUserId),
        gte(shifts.date, sixtyDaysAgo.toISOString().split("T")[0])
      )
    )
    .groupBy(shifts.roleType);

  const activeWorkers = await db
    .select({
      workerRoles: users.workerRoles,
    })
    .from(users)
    .where(
      and(
        eq(users.role, "worker"),
        eq(users.isActive, true)
      )
    );

  const workerRoleCounts: Record<string, number> = {};
  for (const worker of activeWorkers) {
    if (worker.workerRoles) {
      try {
        const roles: string[] = JSON.parse(worker.workerRoles);
        for (const role of roles) {
          const normalized = role.toLowerCase().trim();
          workerRoleCounts[normalized] = (workerRoleCounts[normalized] || 0) + 1;
        }
      } catch {
        const normalized = worker.workerRoles.toLowerCase().trim();
        workerRoleCounts[normalized] = (workerRoleCounts[normalized] || 0) + 1;
      }
    }
  }

  const applicantRoles = await db
    .select({
      preferredRoles: workerApplications.preferredRoles,
    })
    .from(workerApplications)
    .where(sql`${workerApplications.status} IN ('pending', 'reviewed')`);

  const applicantRoleCounts: Record<string, number> = {};
  for (const app of applicantRoles) {
    try {
      const roles: string[] = JSON.parse(app.preferredRoles);
      for (const role of roles) {
        const normalized = role.toLowerCase().trim();
        applicantRoleCounts[normalized] = (applicantRoleCounts[normalized] || 0) + 1;
      }
    } catch {
      const normalized = app.preferredRoles.toLowerCase().trim();
      applicantRoleCounts[normalized] = (applicantRoleCounts[normalized] || 0) + 1;
    }
  }

  const shortages: ChronicShortageRole[] = [];
  for (const row of unfilledShifts) {
    if (!row.roleType) continue;
    const normalized = row.roleType.toLowerCase().trim();
    const unfilledCount = Number(row.cnt);
    const workerCount = workerRoleCounts[normalized] || 0;
    const applicantsInPipeline = applicantRoleCounts[normalized] || 0;

    const shortageScore = unfilledCount * 2 - workerCount - applicantsInPipeline;
    if (shortageScore > 0) {
      shortages.push({
        role: normalized,
        unfilledShiftCount: unfilledCount,
        activeWorkerCount: workerCount,
        applicantsInPipeline,
        shortageScore,
      });
    }
  }

  return shortages.sort((a, b) => b.shortageScore - a.shortageScore);
}

async function computePipelineVelocity(): Promise<PipelineVelocity[]> {
  const eightWeeksAgo = new Date();
  eightWeeksAgo.setDate(eightWeeksAgo.getDate() - 56);

  const results = await db
    .select({
      week: sql<string>`to_char(date_trunc('week', ${workerApplications.createdAt}), 'YYYY-MM-DD')`,
      count: count(),
    })
    .from(workerApplications)
    .where(gte(workerApplications.createdAt, eightWeeksAgo))
    .groupBy(sql`date_trunc('week', ${workerApplications.createdAt})`)
    .orderBy(sql`date_trunc('week', ${workerApplications.createdAt})`);

  const velocities: PipelineVelocity[] = results.map((r, i) => {
    let trend: "increasing" | "decreasing" | "stable" = "stable";
    if (i > 0) {
      const prevCount = Number(results[i - 1].count);
      const currCount = Number(r.count);
      if (currCount > prevCount * 1.1) trend = "increasing";
      else if (currCount < prevCount * 0.9) trend = "decreasing";
    }
    return {
      week: r.week,
      applicationCount: Number(r.count),
      trend,
    };
  });

  return velocities;
}

async function computeSummary(): Promise<RecruitmentMetrics["summary"]> {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const [activeResult, approvedResult, rejectedResult, pendingResult, decisionTimeResult] =
    await Promise.all([
      db
        .select({ count: count() })
        .from(workerApplications)
        .where(sql`${workerApplications.status} IN ('pending', 'reviewed')`),

      db
        .select({ count: count() })
        .from(workerApplications)
        .where(
          and(
            eq(workerApplications.status, "approved"),
            gte(workerApplications.updatedAt, thirtyDaysAgo)
          )
        ),

      db
        .select({ count: count() })
        .from(workerApplications)
        .where(
          and(
            eq(workerApplications.status, "rejected"),
            gte(workerApplications.updatedAt, thirtyDaysAgo)
          )
        ),

      db
        .select({ count: count() })
        .from(workerApplications)
        .where(eq(workerApplications.status, "pending")),

      db
        .select({
          avgDays: sql<number>`COALESCE(AVG(EXTRACT(EPOCH FROM (${workerApplications.reviewedAt} - ${workerApplications.createdAt})) / 86400), 0)`,
        })
        .from(workerApplications)
        .where(isNotNull(workerApplications.reviewedAt)),
    ]);

  const totalActive = Number(activeResult[0]?.count || 0);
  const pendingCount = Number(pendingResult[0]?.count || 0);
  const approvedLast30 = Number(approvedResult[0]?.count || 0);
  const rejectedLast30 = Number(rejectedResult[0]?.count || 0);
  const avgTimeToDecision = Math.round((Number(decisionTimeResult[0]?.avgDays) || 0) * 10) / 10;

  const totalProcessed = approvedLast30 + rejectedLast30;
  const approvalRate = totalProcessed > 0 ? approvedLast30 / totalProcessed : 0;
  const stalledRatio = totalActive > 0 ? Math.max(0, 1 - pendingCount / (totalActive * 2)) : 1;
  const speedScore = avgTimeToDecision > 0 ? Math.max(0, 1 - avgTimeToDecision / 30) : 0.5;

  const pipelineHealthScore = Math.round(
    ((approvalRate * 0.3 + stalledRatio * 0.3 + speedScore * 0.4) * 100)
  );

  return {
    totalActive,
    pendingCount,
    approvedLast30Days: approvedLast30,
    rejectedLast30Days: rejectedLast30,
    averageTimeToDecision: avgTimeToDecision,
    pipelineHealthScore: Math.min(100, Math.max(0, pipelineHealthScore)),
  };
}

function computeAverage(values: number[]): number {
  if (values.length === 0) return 0;
  const sum = values.reduce((a, b) => a + b, 0);
  return Math.round((sum / values.length) * 10) / 10;
}

function computeMedian(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  const median = sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
  return Math.round(median * 10) / 10;
}
