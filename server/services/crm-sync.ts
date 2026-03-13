import { db } from "../db";
import { workplaces, shifts, shiftRequests, crmSyncLogs, users } from "../../shared/schema";
import { eq, and, sql, isNull, ne, notInArray } from "drizzle-orm";
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
    console.log(`[CRM Sync] Workplaces: ${result.created} created, ${result.updated} updated, ${result.skipped} skipped, ${result.errors} errors${dryRun ? " (dry run)" : ""}`);
  } catch (err: any) {
    result.errors++;
    result.errorMessages.push(`Fatal: ${err.message}`);
    await completeSyncLog(logId, "failed", result);
    console.error("[CRM Sync] Workplaces sync failed:", err.message);
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
        console.log(`[CRM Sync] Cancelled stale shift: "${stale.title}" (id=${stale.id})${dryRun ? " (dry run)" : ""}`);
      }
    } catch (err: any) {
      result.errorMessages.push(`Stale shift cleanup: ${err.message}`);
    }

    await completeSyncLog(logId, "completed", result);
    console.log(`[CRM Sync] Shifts: ${result.created} created, ${result.updated} updated, ${result.skipped} skipped, ${result.errors} errors${dryRun ? " (dry run)" : ""}`);
  } catch (err: any) {
    result.errors++;
    result.errorMessages.push(`Fatal: ${err.message}`);
    await completeSyncLog(logId, "failed", result);
    console.error("[CRM Sync] Shifts sync failed:", err.message);
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
    console.log(`[CRM Sync] Hotel requests: ${result.created} created, ${result.updated} updated, ${result.skipped} skipped, ${result.errors} errors${dryRun ? " (dry run)" : ""}`);
  } catch (err: any) {
    result.errors++;
    result.errorMessages.push(`Fatal: ${err.message}`);
    await completeSyncLog(logId, "failed", result);
    console.error("[CRM Sync] Hotel requests sync failed:", err.message);
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
