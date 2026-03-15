import { db } from "../db";
import { workplaces, shifts, shiftRequests, crmSyncLogs, crmPushQueue, users } from "../../shared/schema";
import { eq, and, sql, isNull, ne, notInArray, lte, gte, count } from "drizzle-orm";
import * as crmClient from "./weekdays-crm";

let syncRunning = false;
let lastAutoSyncError: string | null = null;
let cachedConnectionStatus: { connected: boolean; error?: string; checkedAt: number } | null = null;
const CONNECTION_CACHE_TTL = 60000;

interface SyncResult {
  created: number;
  updated: number;
  skipped: number;
  errors: number;
  errorMessages: string[];
}

function emptySyncResult(): SyncResult {
  return { created: 0, updated: 0, skipped: 0, errors: 0, errorMessages: [] };
}

function acquireLock(): boolean {
  if (syncRunning) return false;
  syncRunning = true;
  return true;
}

function releaseLock(): void {
  syncRunning = false;
}

export function isSyncRunning(): boolean {
  return syncRunning;
}

export function getLastAutoSyncError(): string | null {
  return lastAutoSyncError;
}

export function clearAutoSyncError(): void {
  lastAutoSyncError = null;
}

export async function getCachedConnectionStatus(): Promise<{ connected: boolean; error?: string }> {
  const now = Date.now();
  if (cachedConnectionStatus && (now - cachedConnectionStatus.checkedAt) < CONNECTION_CACHE_TTL) {
    return { connected: cachedConnectionStatus.connected, error: cachedConnectionStatus.error };
  }
  const result = await crmClient.testConnection();
  cachedConnectionStatus = { connected: result.connected, error: result.error, checkedAt: now };
  return result;
}

async function createSyncLog(syncType: string, dryRun: boolean): Promise<string> {
  const [log] = await db.insert(crmSyncLogs).values({
    syncType,
    status: "running",
    dryRun,
    startedAt: new Date(),
  }).returning({ id: crmSyncLogs.id });
  return log.id;
}

async function completeSyncLog(logId: string, status: string, result: SyncResult): Promise<void> {
  await db.update(crmSyncLogs)
    .set({
      status,
      createdCount: result.created,
      updatedCount: result.updated,
      skippedCount: result.skipped,
      errorCount: result.errors,
      errorMessages: result.errorMessages.length > 0 ? result.errorMessages.join("\n") : null,
      completedAt: new Date(),
    })
    .where(eq(crmSyncLogs.id, logId));
}

function normalizeString(s: string | null | undefined): string {
  return (s || "").trim().toLowerCase().replace(/\s+/g, " ");
}

function normalizePhone(phone: string | null | undefined): string | null {
  if (!phone) return null;
  const digits = phone.replace(/\D/g, "");
  if (digits.length === 11 && digits.startsWith("1")) return digits.slice(1);
  if (digits.length === 10) return digits;
  return digits;
}

function getTimezoneForProvince(province: string | null | undefined): string {
  const p = normalizeString(province);
  if (p.includes("british columbia") || p.includes("bc")) return "America/Vancouver";
  if (p.includes("alberta") || p.includes("ab")) return "America/Edmonton";
  if (p.includes("saskatchewan") || p.includes("sk")) return "America/Regina";
  if (p.includes("manitoba") || p.includes("mb")) return "America/Winnipeg";
  if (p.includes("newfoundland") || p.includes("nl")) return "America/St_Johns";
  if (p.includes("atlantic") || p.includes("nova scotia") || p.includes("new brunswick") || p.includes("prince edward") || p.includes("ns") || p.includes("nb") || p.includes("pe")) return "America/Halifax";
  return "America/Toronto";
}

function utcToLocal(utcDateString: string, timezone: string): { date: string; time: string } {
  const d = new Date(utcDateString);
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  const parts = formatter.formatToParts(d);
  const get = (type: string) => parts.find(p => p.type === type)?.value || "";
  const date = `${get("year")}-${get("month")}-${get("day")}`;
  const time = `${get("hour")}:${get("minute")}`;
  return { date, time };
}

// CRM stores local Eastern times but incorrectly marks them with a Z (UTC) suffix.
// This function extracts the raw date/time without any timezone conversion.
function crmToLocal(isoString: string): { date: string; time: string } {
  const raw = (isoString || "").replace(/Z$/, "").replace(/[+-]\d{2}:\d{2}$/, "");
  const [datePart, timePart = ""] = raw.split("T");
  return {
    date: datePart || "",
    time: timePart.substring(0, 5) || "",
  };
}

export async function syncWorkplaces(dryRun = false, _skipLock = false): Promise<SyncResult> {
  if (!_skipLock && !acquireLock()) {
    throw new Error("A sync is already running. Please wait for it to complete.");
  }
  const result = emptySyncResult();
  const logId = await createSyncLog("workplaces", dryRun);

  try {
    const crmWorkplaces = await crmClient.getWorkplaces();
    const existingWorkplaces = await db.select().from(workplaces);

    const byExternalId = new Map(
      existingWorkplaces.filter(w => w.crmExternalId).map(w => [w.crmExternalId!, w])
    );
    const byNameAddress = new Map(
      existingWorkplaces.map(w => [
        `${normalizeString(w.name)}|${normalizeString(w.addressLine1)}`,
        w,
      ])
    );

    for (const crmWp of crmWorkplaces) {
      try {
        let existing = byExternalId.get(crmWp.id);

        if (!existing) {
          const key = `${normalizeString(crmWp.name)}|${normalizeString(crmWp.address)}`;
          existing = byNameAddress.get(key);
        }

        if (existing) {
          const needsUpdate =
            existing.name !== crmWp.name ||
            existing.addressLine1 !== (crmWp.address || null) ||
            existing.latitude !== (crmWp.latitude || null) ||
            existing.longitude !== (crmWp.longitude || null) ||
            existing.isActive !== crmWp.isActive ||
            existing.crmExternalId !== crmWp.id;

          if (needsUpdate) {
            if (!dryRun) {
              await db.update(workplaces)
                .set({
                  name: crmWp.name,
                  addressLine1: crmWp.address || existing.addressLine1,
                  city: crmWp.location || existing.city,
                  province: crmWp.province || existing.province,
                  latitude: crmWp.latitude ?? existing.latitude,
                  longitude: crmWp.longitude ?? existing.longitude,
                  isActive: crmWp.isActive,
                  crmExternalId: crmWp.id,
                  crmSource: existing.crmSource || true,
                  updatedAt: new Date(),
                })
                .where(eq(workplaces.id, existing.id));
            }
            result.updated++;
          } else {
            result.skipped++;
          }
        } else {
          if (!dryRun) {
            await db.insert(workplaces).values({
              name: crmWp.name,
              addressLine1: crmWp.address || null,
              city: crmWp.location || null,
              province: crmWp.province || null,
              latitude: crmWp.latitude ?? null,
              longitude: crmWp.longitude ?? null,
              isActive: crmWp.isActive,
              crmExternalId: crmWp.id,
              crmSource: true,
            });
          }
          result.created++;
        }
      } catch (err: any) {
        result.errors++;
        result.errorMessages.push(`Workplace "${crmWp.name}": ${err.message}`);
      }
    }

    await completeSyncLog(logId, "completed", result);
    console.log(`[CRM-SYNC] Workplaces: ${result.created} created, ${result.updated} updated, ${result.skipped} skipped, ${result.errors} errors${dryRun ? " (dry run)" : ""}`);
  } catch (err: any) {
    result.errors++;
    result.errorMessages.push(`Fatal: ${err.message}`);
    await completeSyncLog(logId, "failed", result);
    console.error("[CRM-SYNC] Workplaces sync failed:", err.message);
  } finally {
    if (!_skipLock) releaseLock();
  }

  return result;
}

export async function syncConfirmedShifts(dryRun = false, _skipLock = false): Promise<SyncResult> {
  if (!_skipLock && !acquireLock()) {
    throw new Error("A sync is already running. Please wait for it to complete.");
  }
  const result = emptySyncResult();
  const logId = await createSyncLog("shifts", dryRun);

  try {
    const crmShifts = await crmClient.getConfirmedShifts();
    const existingShifts = await db.select().from(shifts);
    const existingWorkplacesList = await db.select().from(workplaces);
    const allUsers = await db.select({ id: users.id, phone: users.phone, fullName: users.fullName }).from(users);

    const shiftByCrmId = new Map(
      existingShifts.filter(s => s.crmShiftId).map(s => [s.crmShiftId!, s])
    );
    const workplaceByName = new Map(
      existingWorkplacesList.map(w => [normalizeString(w.name), w])
    );
    const workplaceByExternalId = new Map(
      existingWorkplacesList.filter(w => w.crmExternalId).map(w => [w.crmExternalId!, w])
    );
    const userByPhone = new Map(
      allUsers.filter(u => u.phone).map(u => [normalizePhone(u.phone)!, u])
    );

    for (const crmShift of crmShifts) {
      try {
        let workplace = workplaceByName.get(normalizeString(crmShift.request.hotelName));
        if (!workplace) {
          for (const [, wp] of workplaceByExternalId) {
            if (normalizeString(wp.name) === normalizeString(crmShift.request.hotelName)) {
              workplace = wp;
              break;
            }
          }
        }

        if (!workplace) {
          if (!dryRun) {
            const [newWp] = await db.insert(workplaces).values({
              name: crmShift.request.hotelName,
              addressLine1: crmShift.request.address || null,
              city: crmShift.request.location || null,
              crmSource: true,
            }).returning();
            workplace = newWp;
            workplaceByName.set(normalizeString(newWp.name), newWp);
          } else {
            result.created++;
            continue;
          }
        }

        const start = crmToLocal(crmShift.scheduledStartAt);
        const end = crmToLocal(crmShift.scheduledEndAt);

        let workerUserId: string | null = null;
        if (crmShift.quoContactPhoneSnapshot) {
          const normalizedPhone = normalizePhone(crmShift.quoContactPhoneSnapshot);
          if (normalizedPhone) {
            const matchedUser = userByPhone.get(normalizedPhone);
            if (matchedUser) workerUserId = matchedUser.id;
          }
        }

        const statusMap: Record<string, string> = {
          CONFIRMED: "scheduled",
          COMPLETED: "completed",
        };
        const mappedStatus = statusMap[crmShift.confirmStatus] || "scheduled";

        const existing = shiftByCrmId.get(crmShift.id);
        if (existing) {
          if (!dryRun) {
            // Always use the freshly resolved workerUserId from CRM phone matching.
            // If the CRM no longer has a phone snapshot (or it no longer matches a user),
            // we clear the assignment rather than keeping a stale one.
            await db.update(shifts)
              .set({
                title: crmShift.request.hotelName,
                date: start.date,
                startTime: start.time,
                endTime: end.time,
                roleType: crmShift.request.roleNeeded,
                status: mappedStatus,
                workplaceId: workplace.id,
                workerUserId: workerUserId,
                category: "hotel",
                updatedAt: new Date(),
              })
              .where(eq(shifts.id, existing.id));
          }
          result.updated++;
        } else {
          if (!dryRun) {
            await db.insert(shifts).values({
              title: crmShift.request.hotelName,
              date: start.date,
              startTime: start.time,
              endTime: end.time,
              roleType: crmShift.request.roleNeeded,
              status: mappedStatus,
              workplaceId: workplace.id,
              workerUserId,
              category: "hotel",
              crmShiftId: crmShift.id,
              crmSource: true,
            });
          }
          result.created++;
        }
      } catch (err: any) {
        result.errors++;
        result.errorMessages.push(`Shift "${crmShift.request?.hotelName || crmShift.id}": ${err.message}`);
      }
    }

    // Cancel any CRM-sourced shifts that are no longer in the CRM feed
    try {
      const activeCrmShiftIds = crmShifts.map(s => s.id);
      const staleShifts = await db.select({ id: shifts.id, title: shifts.title })
        .from(shifts)
        .where(
          and(
            eq(shifts.crmSource, true),
            ne(shifts.status, "cancelled"),
            ne(shifts.status, "completed"),
            // crmShiftId must be set (non-null) and not in the active set
            sql`${shifts.crmShiftId} IS NOT NULL`,
            activeCrmShiftIds.length > 0
              ? notInArray(shifts.crmShiftId, activeCrmShiftIds)
              : sql`true`
          )
        );

      for (const stale of staleShifts) {
        if (!dryRun) {
          await db.update(shifts)
            .set({ status: "cancelled", updatedAt: new Date() })
            .where(eq(shifts.id, stale.id));
        }
        result.updated++;
        console.log(`[CRM-SYNC] Cancelled stale shift: "${stale.title}" (id=${stale.id})${dryRun ? " (dry run)" : ""}`);
      }
    } catch (err: any) {
      result.errorMessages.push(`Stale shift cleanup: ${err.message}`);
    }

    await completeSyncLog(logId, "completed", result);
    console.log(`[CRM-SYNC] Shifts: ${result.created} created, ${result.updated} updated, ${result.skipped} skipped, ${result.errors} errors${dryRun ? " (dry run)" : ""}`);
  } catch (err: any) {
    result.errors++;
    result.errorMessages.push(`Fatal: ${err.message}`);
    await completeSyncLog(logId, "failed", result);
    console.error("[CRM-SYNC] Shifts sync failed:", err.message);
  } finally {
    if (!_skipLock) releaseLock();
  }

  return result;
}

export async function syncHotelRequests(dryRun = false, _skipLock = false): Promise<SyncResult> {
  if (!_skipLock && !acquireLock()) {
    throw new Error("A sync is already running. Please wait for it to complete.");
  }
  const result = emptySyncResult();
  const logId = await createSyncLog("hotel-requests", dryRun);

  try {
    const crmRequests = await crmClient.getHotelRequests();
    const existingRequests = await db.select().from(shiftRequests);
    const existingWorkplacesList = await db.select().from(workplaces);

    const adminUsers = await db.select({ id: users.id })
      .from(users)
      .where(eq(users.role, "admin"))
      .limit(1);
    const adminId = adminUsers[0]?.id;
    if (!adminId) {
      throw new Error("No admin user found to assign as client for CRM shift requests");
    }

    const requestByCrmId = new Map(
      existingRequests.filter(r => r.crmRequestId).map(r => [r.crmRequestId!, r])
    );
    const workplaceByName = new Map(
      existingWorkplacesList.map(w => [normalizeString(w.name), w])
    );

    const activeRequests = crmRequests.filter(r => !r.isDeleted);
    const deletedRequestIds = new Set(
      crmRequests.filter(r => r.isDeleted).map(r => r.id)
    );

    for (const [crmId, existingReq] of requestByCrmId) {
      if (deletedRequestIds.has(crmId) && existingReq.status !== "cancelled") {
        if (!dryRun) {
          await db.update(shiftRequests)
            .set({ status: "cancelled", updatedAt: new Date() })
            .where(eq(shiftRequests.id, existingReq.id));
        }
        result.updated++;
      }
    }

    for (const crmReq of activeRequests) {
      try {
        let workplace = workplaceByName.get(normalizeString(crmReq.hotelName));

        if (!workplace) {
          if (!dryRun) {
            const [newWp] = await db.insert(workplaces).values({
              name: crmReq.hotelName,
              addressLine1: crmReq.address || null,
              city: crmReq.location || null,
              crmSource: true,
            }).returning();
            workplace = newWp;
            workplaceByName.set(normalizeString(newWp.name), newWp);
          } else {
            result.created++;
            continue;
          }
        }

        const start = crmToLocal(crmReq.shiftStartAt);
        const end = crmToLocal(crmReq.shiftEndAt);

        const statusMap: Record<string, string> = {
          NEW: "submitted",
          CONFIRMED: "filled",
        };
        const mappedStatus = statusMap[crmReq.status] || "submitted";

        const existing = requestByCrmId.get(crmReq.id);
        if (existing) {
          const needsUpdate =
            existing.status !== mappedStatus ||
            existing.roleType !== crmReq.roleNeeded;

          if (needsUpdate) {
            if (!dryRun) {
              await db.update(shiftRequests)
                .set({
                  roleType: crmReq.roleNeeded,
                  date: start.date,
                  startTime: start.time,
                  endTime: end.time,
                  status: mappedStatus,
                  notes: [crmReq.hotelName, crmReq.notes].filter(Boolean).join(" - "),
                  updatedAt: new Date(),
                })
                .where(eq(shiftRequests.id, existing.id));
            }
            result.updated++;
          } else {
            result.skipped++;
          }
        } else {
          if (!dryRun) {
            await db.insert(shiftRequests).values({
              clientId: adminId,
              workplaceId: workplace.id,
              roleType: crmReq.roleNeeded,
              date: start.date,
              startTime: start.time,
              endTime: end.time,
              notes: [crmReq.hotelName, crmReq.notes].filter(Boolean).join(" - "),
              status: mappedStatus,
              crmRequestId: crmReq.id,
              crmSource: true,
            });
          }
          result.created++;
        }
      } catch (err: any) {
        result.errors++;
        result.errorMessages.push(`Hotel request "${crmReq.hotelName}": ${err.message}`);
      }
    }

    await completeSyncLog(logId, "completed", result);
    console.log(`[CRM-SYNC] Hotel requests: ${result.created} created, ${result.updated} updated, ${result.skipped} skipped, ${result.errors} errors${dryRun ? " (dry run)" : ""}`);
  } catch (err: any) {
    result.errors++;
    result.errorMessages.push(`Fatal: ${err.message}`);
    await completeSyncLog(logId, "failed", result);
    console.error("[CRM-SYNC] Hotel requests sync failed:", err.message);
  } finally {
    if (!_skipLock) releaseLock();
  }

  return result;
}

export interface FullSyncResult {
  workplaces: SyncResult;
  shifts: SyncResult;
  hotelRequests: SyncResult;
  totalCreated: number;
  totalUpdated: number;
  totalErrors: number;
}

export async function syncAll(dryRun = false): Promise<FullSyncResult> {
  if (!acquireLock()) {
    throw new Error("A sync is already running. Please wait for it to complete.");
  }

  try {
    if (!dryRun) {
      try {
        await processCrmPushQueue();
      } catch (pushErr: any) {
        console.error("[CRM-SYNC] Push queue processing failed during syncAll:", pushErr?.message);
      }
    }

    const wpResult = await syncWorkplaces(dryRun, true);
    const shiftResult = await syncConfirmedShifts(dryRun, true);
    const hrResult = await syncHotelRequests(dryRun, true);

    const fullResult: FullSyncResult = {
      workplaces: wpResult,
      shifts: shiftResult,
      hotelRequests: hrResult,
      totalCreated: wpResult.created + shiftResult.created + hrResult.created,
      totalUpdated: wpResult.updated + shiftResult.updated + hrResult.updated,
      totalErrors: wpResult.errors + shiftResult.errors + hrResult.errors,
    };

    if (fullResult.totalErrors > 0) {
      lastAutoSyncError = [
        ...wpResult.errorMessages,
        ...shiftResult.errorMessages,
        ...hrResult.errorMessages,
      ].join("; ");
    } else {
      lastAutoSyncError = null;
    }

    return fullResult;
  } finally {
    releaseLock();
  }
}

export async function getSyncStatus(): Promise<{
  configured: boolean;
  connected: boolean;
  connectionError?: string;
  lastSyncError: string | null;
  syncRunning: boolean;
  lastSyncs: Record<string, any>;
}> {
  const connectionTest = crmClient.isConfigured()
    ? await getCachedConnectionStatus()
    : { connected: false, error: "Not configured" };

  const recentLogs = await db.select()
    .from(crmSyncLogs)
    .orderBy(sql`${crmSyncLogs.startedAt} DESC`)
    .limit(10);

  const lastSyncs: Record<string, any> = {};
  for (const syncType of ["workplaces", "shifts", "hotel-requests", "all"]) {
    const log = recentLogs.find(l => l.syncType === syncType);
    if (log) {
      lastSyncs[syncType] = {
        status: log.status,
        startedAt: log.startedAt,
        completedAt: log.completedAt,
        created: log.createdCount,
        updated: log.updatedCount,
        skipped: log.skippedCount,
        errors: log.errorCount,
        dryRun: log.dryRun,
      };
    }
  }

  return {
    configured: crmClient.isConfigured(),
    connected: connectionTest.connected,
    connectionError: connectionTest.error,
    lastSyncError: lastAutoSyncError,
    syncRunning,
    lastSyncs,
  };
}

export async function getSyncLogs(limit = 50): Promise<any[]> {
  return await db.select()
    .from(crmSyncLogs)
    .orderBy(sql`${crmSyncLogs.startedAt} DESC`)
    .limit(limit);
}

export async function backfillWorkplacesToCrm(): Promise<{ pushed: number; matched: number; failed: number; details: string[] }> {
  const result = { pushed: 0, matched: 0, failed: 0, details: [] as string[] };

  if (!crmClient.isConfigured()) {
    result.details.push("CRM not configured — skipping backfill");
    return result;
  }

  try {
    const unlinked = await db.select().from(workplaces).where(
      and(
        isNull(workplaces.crmExternalId),
        eq(workplaces.crmSource, false)
      )
    );

    if (unlinked.length === 0) {
      result.details.push("No unlinked workplaces found — nothing to backfill");
      console.log("[CRM-SYNC] Backfill: no unlinked workplaces");
      return result;
    }

    console.log(`[CRM-SYNC] Backfill: found ${unlinked.length} unlinked workplace(s)`);

    let crmWorkplaces: crmClient.CrmWorkplace[];
    try {
      crmWorkplaces = await crmClient.getWorkplaces();
    } catch (err: any) {
      result.details.push(`Failed to fetch CRM workplaces: ${err.message}`);
      result.failed = unlinked.length;
      return result;
    }

    const crmByName = new Map(
      crmWorkplaces.map(w => [normalizeString(w.name), w])
    );

    for (const wp of unlinked) {
      const normalizedName = normalizeString(wp.name);
      const existingCrm = crmByName.get(normalizedName);

      if (existingCrm) {
        try {
          await db.update(workplaces)
            .set({ crmExternalId: existingCrm.id, updatedAt: new Date() })
            .where(eq(workplaces.id, wp.id));
          result.matched++;
          result.details.push(`Matched "${wp.name}" → CRM ID ${existingCrm.id}`);
          console.log(`[CRM-SYNC] Backfill matched: "${wp.name}" → CRM ${existingCrm.id}`);
        } catch (err: any) {
          result.failed++;
          result.details.push(`Failed to link "${wp.name}": ${err.message}`);
        }
      } else {
        try {
          const fullAddress = [wp.addressLine1, wp.city, wp.province, wp.postalCode].filter(Boolean).join(", ");
          const crmResult = await crmClient.createCrmWorkplace({
            name: wp.name,
            address: fullAddress,
            location: wp.city || "",
            province: wp.province || "",
            latitude: wp.latitude ? Number(wp.latitude) : undefined,
            longitude: wp.longitude ? Number(wp.longitude) : undefined,
            isActive: wp.isActive !== false,
          });
          await db.update(workplaces)
            .set({ crmExternalId: crmResult.id, updatedAt: new Date() })
            .where(eq(workplaces.id, wp.id));
          result.pushed++;
          result.details.push(`Pushed "${wp.name}" → CRM ID ${crmResult.id}`);
          console.log(`[CRM-SYNC] Backfill pushed: "${wp.name}" → CRM ${crmResult.id}`);
        } catch (err: any) {
          result.failed++;
          result.details.push(`Failed to push "${wp.name}" to CRM: ${err.message}`);
          console.error(`[CRM-SYNC] Backfill failed for "${wp.name}":`, err.message);
        }
      }
    }

    console.log(`[CRM-SYNC] Backfill complete: ${result.pushed} pushed, ${result.matched} matched, ${result.failed} failed`);
    return result;
  } catch (err: any) {
    result.details.push(`Backfill error: ${err.message}`);
    console.error("[CRM-SYNC] Backfill error:", err.message);
    return result;
  }
}

export async function enqueueCrmPush(
  entityType: string,
  entityId: string,
  action: string,
  payload: Record<string, unknown>
): Promise<void> {
  try {
    await db.insert(crmPushQueue).values({
      entityType,
      entityId,
      action,
      payload: JSON.stringify(payload),
      status: "pending",
      attempts: 0,
      nextRetryAt: new Date(),
    });
    console.log(`[CRM-PUSH] Enqueued ${action} for ${entityType}/${entityId}`);
  } catch (err: any) {
    console.error(`[CRM-PUSH] Failed to enqueue ${action} for ${entityType}/${entityId}:`, err.message);
  }
}

export async function processCrmPushQueue(): Promise<{ processed: number; succeeded: number; failed: number }> {
  const result = { processed: 0, succeeded: 0, failed: 0 };
  if (!crmClient.isConfigured()) return result;

  try {
    const pending = await db
      .select()
      .from(crmPushQueue)
      .where(
        and(
          eq(crmPushQueue.status, "pending"),
          lte(crmPushQueue.nextRetryAt, new Date())
        )
      )
      .limit(20);

    for (const item of pending) {
      const [claimed] = await db
        .update(crmPushQueue)
        .set({ status: "processing" })
        .where(and(eq(crmPushQueue.id, item.id), eq(crmPushQueue.status, "pending")))
        .returning();
      if (!claimed) continue;

      result.processed++;
      try {
        const payload = JSON.parse(item.payload);
        await executeCrmPushAction(item.entityType, item.action, item.entityId, payload);

        await db
          .update(crmPushQueue)
          .set({ status: "completed", completedAt: new Date() })
          .where(eq(crmPushQueue.id, item.id));
        result.succeeded++;
        console.log(`[CRM-PUSH] Completed ${item.action} for ${item.entityType}/${item.entityId}`);
      } catch (err: any) {
        const newAttempts = item.attempts + 1;
        const backoffMs = Math.min(60000 * Math.pow(2, newAttempts), 3600000);
        const nextRetry = new Date(Date.now() + backoffMs);

        if (newAttempts >= item.maxAttempts) {
          await db
            .update(crmPushQueue)
            .set({ status: "failed", attempts: newAttempts, lastError: err.message, completedAt: new Date() })
            .where(eq(crmPushQueue.id, item.id));
          result.failed++;
          console.error(`[CRM-PUSH] Permanently failed ${item.action} for ${item.entityType}/${item.entityId}: ${err.message}`);
        } else {
          await db
            .update(crmPushQueue)
            .set({ status: "pending", attempts: newAttempts, lastError: err.message, nextRetryAt: nextRetry })
            .where(eq(crmPushQueue.id, item.id));
          console.warn(`[CRM-PUSH] Retry ${newAttempts}/${item.maxAttempts} for ${item.entityType}/${item.entityId}, next at ${nextRetry.toISOString()}`);
        }
      }
    }
  } catch (err: any) {
    console.error("[CRM-PUSH] Queue processing error:", err.message);
  }

  return result;
}

async function executeCrmPushAction(
  entityType: string,
  action: string,
  _entityId: string,
  payload: Record<string, unknown>
): Promise<void> {
  switch (`${entityType}:${action}`) {
    case "confirmed_shift:update": {
      const crmId = payload.crmExternalId as string;
      if (!crmId) throw new Error("Missing crmExternalId");
      const shiftUpdate: crmClient.UpdateCrmConfirmedShiftInput = {};
      if (payload.confirmStatus) shiftUpdate.confirmStatus = payload.confirmStatus as "CONFIRMED" | "COMPLETED";
      if (payload.checkedInAt) shiftUpdate.checkedInAt = payload.checkedInAt as string;
      if (payload.completedAt) shiftUpdate.completedAt = payload.completedAt as string;
      if (payload.notes) shiftUpdate.notes = payload.notes as string;
      await crmClient.updateCrmConfirmedShift(crmId, shiftUpdate);
      break;
    }
    case "hotel_request:create": {
      const hrInput: crmClient.CreateCrmHotelRequestInput = {
        hotelName: payload.hotelName as string,
        roleNeeded: payload.roleNeeded as string,
        shiftStartAt: payload.shiftStartAt as string,
        shiftEndAt: payload.shiftEndAt as string,
        location: payload.location as string | undefined,
        address: payload.address as string | undefined,
        quantityNeeded: payload.quantityNeeded as number | undefined,
        payRate: payload.payRate as number | undefined,
        notes: payload.notes as string | undefined,
      };
      await crmClient.createCrmHotelRequest(hrInput);
      break;
    }
    case "hotel_request:update": {
      const crmId = payload.crmExternalId as string;
      if (!crmId) throw new Error("Missing crmExternalId");
      const hrUpdate: crmClient.UpdateCrmHotelRequestInput = {};
      if (payload.hotelName) hrUpdate.hotelName = payload.hotelName as string;
      if (payload.roleNeeded) hrUpdate.roleNeeded = payload.roleNeeded as string;
      if (payload.quantityNeeded !== undefined) hrUpdate.quantityNeeded = payload.quantityNeeded as number;
      if (payload.shiftStartAt) hrUpdate.shiftStartAt = payload.shiftStartAt as string;
      if (payload.shiftEndAt) hrUpdate.shiftEndAt = payload.shiftEndAt as string;
      if (payload.payRate !== undefined) hrUpdate.payRate = payload.payRate as number;
      if (payload.notes) hrUpdate.notes = payload.notes as string;
      if (payload.status) hrUpdate.status = payload.status as "NEW" | "CONFIRMED";
      await crmClient.updateCrmHotelRequest(crmId, hrUpdate);
      break;
    }
    case "workplace:update": {
      const crmId = payload.crmExternalId as string;
      if (!crmId) throw new Error("Missing crmExternalId");
      const wpUpdate: crmClient.UpdateCrmWorkplaceInput = {};
      if (payload.name) wpUpdate.name = payload.name as string;
      if (payload.address) wpUpdate.address = payload.address as string;
      if (payload.location) wpUpdate.location = payload.location as string;
      if (payload.province) wpUpdate.province = payload.province as string;
      if (payload.isActive !== undefined) wpUpdate.isActive = payload.isActive as boolean;
      await crmClient.updateCrmWorkplace(crmId, wpUpdate);
      break;
    }
    default:
      throw new Error(`Unknown CRM push action: ${entityType}:${action}`);
  }
}

export async function getCrmPushQueueStats(): Promise<{
  pending: number;
  failed: number;
  completedToday: number;
}> {
  try {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const [pendingResult] = await db
      .select({ count: count() })
      .from(crmPushQueue)
      .where(eq(crmPushQueue.status, "pending"));

    const [failedResult] = await db
      .select({ count: count() })
      .from(crmPushQueue)
      .where(eq(crmPushQueue.status, "failed"));

    const [completedResult] = await db
      .select({ count: count() })
      .from(crmPushQueue)
      .where(
        and(
          eq(crmPushQueue.status, "completed"),
          gte(crmPushQueue.completedAt, todayStart)
        )
      );

    return {
      pending: pendingResult?.count ?? 0,
      failed: failedResult?.count ?? 0,
      completedToday: completedResult?.count ?? 0,
    };
  } catch {
    return { pending: 0, failed: 0, completedToday: 0 };
  }
}
