import { Express, Request, Response } from "express";
import { db } from "./db";
import { titoLogs, users, workplaces, paymentProfiles, exportAuditLogs } from "../shared/schema";
import { eq, and, gte, lte, sql, inArray } from "drizzle-orm";
import * as XLSX from "xlsx";
import * as archiver from "archiver";
import { sendCSVEmail, sendXLSXEmail } from "./services/email";

type UserRole = "admin" | "hr" | "client" | "worker";

function checkAdminRole() {
  return (req: Request, res: Response, next: () => void) => {
    const role = req.headers["x-user-role"] as UserRole;
    if (role !== "admin") {
      res.status(403).json({ error: "Forbidden: Admin access required" });
      return;
    }
    next();
  };
}

export interface PayableHoursResult {
  rawMinutes: number;
  rawHours: number;
  deductionHours: number;
  netHours: number;
  netHoursRounded: number;
  isIncomplete: boolean;
}

export function calculatePayableHours(timeIn: Date | null, timeOut: Date | null): PayableHoursResult {
  if (!timeIn || !timeOut) {
    return { rawMinutes: 0, rawHours: 0, deductionHours: 0, netHours: 0, netHoursRounded: 0, isIncomplete: true };
  }

  const rawMinutes = (timeOut.getTime() - timeIn.getTime()) / (1000 * 60);

  if (rawMinutes <= 0) {
    return { rawMinutes: 0, rawHours: 0, deductionHours: 0, netHours: 0, netHoursRounded: 0, isIncomplete: true };
  }

  const rawHours = rawMinutes / 60;
  const deductionHours = rawHours >= 5.0 ? 0.5 : 0;
  const netHours = Math.max(0, rawHours - deductionHours);
  const netHoursRounded = Math.round(netHours * 4) / 4;

  return { rawMinutes, rawHours: Math.round(rawHours * 100) / 100, deductionHours, netHours: Math.round(netHours * 100) / 100, netHoursRounded, isIncomplete: false };
}

export interface CutoffPeriod {
  period: number;
  startDate: string;
  endDate: string;
  label: string;
}

export function getCutoffPeriods(year: number): CutoffPeriod[] {
  if (year !== 2026) {
    return [];
  }

  const periods: [number, string, string][] = [
    [1,  "2025-12-27", "2026-01-09"],
    [2,  "2026-01-10", "2026-01-23"],
    [3,  "2026-01-24", "2026-02-06"],
    [4,  "2026-02-07", "2026-02-20"],
    [5,  "2026-02-21", "2026-03-06"],
    [6,  "2026-03-07", "2026-03-20"],
    [7,  "2026-03-21", "2026-04-03"],
    [8,  "2026-04-04", "2026-04-17"],
    [9,  "2026-04-18", "2026-05-01"],
    [10, "2026-05-02", "2026-05-15"],
    [11, "2026-05-16", "2026-05-29"],
    [12, "2026-05-30", "2026-06-12"],
    [13, "2026-06-13", "2026-06-26"],
    [14, "2026-06-27", "2026-07-10"],
    [15, "2026-07-11", "2026-07-24"],
    [16, "2026-07-25", "2026-08-07"],
    [17, "2026-08-08", "2026-08-21"],
    [18, "2026-08-22", "2026-09-04"],
    [19, "2026-09-05", "2026-09-18"],
    [20, "2026-09-19", "2026-10-02"],
    [21, "2026-10-03", "2026-10-16"],
    [22, "2026-10-17", "2026-10-30"],
    [23, "2026-10-31", "2026-11-13"],
    [24, "2026-11-17", "2026-11-27"],
    [25, "2026-11-28", "2026-12-11"],
    [26, "2026-12-12", "2026-12-25"],
  ];

  return periods.map(([period, startDate, endDate]) => ({
    period,
    startDate,
    endDate,
    label: `Period ${period}: ${formatDateLabel(startDate)} - ${formatDateLabel(endDate)}`,
  }));
}

function formatDateLabel(dateStr: string): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return `${months[m - 1]} ${d}`;
}

export function getWeeklyWindow(weekStartStr: string): { start: string; end: string } {
  const startDate = new Date(weekStartStr + "T00:00:00");
  const endDate = new Date(startDate);
  endDate.setDate(endDate.getDate() + 6);
  const end = endDate.toISOString().split("T")[0];
  return { start: weekStartStr, end };
}

export function getMondaysForYear(year: number): string[] {
  const mondays: string[] = [];
  const date = new Date(year, 0, 1);
  while (date.getDay() !== 1) {
    date.setDate(date.getDate() + 1);
  }
  while (date.getFullYear() <= year) {
    const iso = date.toISOString().split("T")[0];
    mondays.push(iso);
    date.setDate(date.getDate() + 7);
    if (date.getFullYear() > year && date.getMonth() > 0) break;
  }
  return mondays;
}

interface WorkerLogRow {
  logId: string;
  workerId: string;
  workerName: string;
  workerEmail: string;
  workplaceId: string | null;
  workplaceName: string;
  timeIn: Date | null;
  timeOut: Date | null;
  logDate: string;
  status: string;
}

interface AggregatedWorker {
  workerId: string;
  workerName: string;
  workerEmail: string;
  totalHoursRounded: number;
  totalRawHours: number;
  logsCount: number;
  incompleteLogs: number;
  datesWorked: string[];
  etransferEmail: string | null;
  bankRef: string | null;
  logs: {
    logId: string;
    date: string;
    timeIn: string | null;
    timeOut: string | null;
    rawHours: number;
    deductionHours: number;
    netHoursRounded: number;
    isIncomplete: boolean;
  }[];
}

interface HotelGroup {
  workplaceId: string;
  workplaceName: string;
  workers: AggregatedWorker[];
  totalHours: number;
  totalLogs: number;
}

async function fetchLogsInRange(startDate: string, endDate: string, hotelId?: string): Promise<WorkerLogRow[]> {
  const startTs = new Date(startDate + "T00:00:00.000Z");
  const endTs = new Date(endDate + "T23:59:59.999Z");

  let conditions = [
    eq(titoLogs.status, "approved"),
    gte(titoLogs.timeIn, startTs),
    lte(titoLogs.timeIn, endTs),
  ];

  if (hotelId && hotelId !== "all") {
    conditions.push(eq(titoLogs.workplaceId, hotelId));
  }

  const rows = await db
    .select({
      logId: titoLogs.id,
      workerId: titoLogs.workerId,
      workerName: users.fullName,
      workerEmail: users.email,
      workplaceId: titoLogs.workplaceId,
      workplaceName: workplaces.name,
      timeIn: titoLogs.timeIn,
      timeOut: titoLogs.timeOut,
      status: titoLogs.status,
    })
    .from(titoLogs)
    .innerJoin(users, eq(titoLogs.workerId, users.id))
    .leftJoin(workplaces, eq(titoLogs.workplaceId, workplaces.id))
    .where(and(...conditions))
    .orderBy(titoLogs.timeIn);

  return rows.map(r => ({
    logId: r.logId,
    workerId: r.workerId,
    workerName: r.workerName,
    workerEmail: r.workerEmail,
    workplaceId: r.workplaceId,
    workplaceName: r.workplaceName || "Unassigned",
    timeIn: r.timeIn,
    timeOut: r.timeOut,
    logDate: r.timeIn ? r.timeIn.toISOString().split("T")[0] : "",
    status: r.status,
  }));
}

async function fetchPaymentProfiles(workerIds: string[]): Promise<Map<string, { etransferEmail: string | null; bankRef: string | null }>> {
  const map = new Map<string, { etransferEmail: string | null; bankRef: string | null }>();
  if (workerIds.length === 0) return map;

  const profiles = await db
    .select()
    .from(paymentProfiles)
    .where(inArray(paymentProfiles.workerUserId, workerIds));

  for (const p of profiles) {
    let bankRef: string | null = null;
    if (p.bankInstitution || p.bankTransit || p.bankAccount) {
      bankRef = [p.bankInstitution, p.bankTransit, p.bankAccount ? `****${p.bankAccount.slice(-4)}` : null].filter(Boolean).join("-");
    }
    if (p.voidChequeFileId) {
      bankRef = bankRef ? `${bankRef} (VC: ${p.voidChequeFileId})` : `VC: ${p.voidChequeFileId}`;
    }
    map.set(p.workerUserId, { etransferEmail: p.etransferEmail, bankRef });
  }
  return map;
}

async function fetchPaymentProfilesFull(workerIds: string[]): Promise<Map<string, { etransferEmail: string | null; bankRef: string | null }>> {
  const map = new Map<string, { etransferEmail: string | null; bankRef: string | null }>();
  if (workerIds.length === 0) return map;

  const profiles = await db
    .select()
    .from(paymentProfiles)
    .where(inArray(paymentProfiles.workerUserId, workerIds));

  for (const p of profiles) {
    let bankRef: string | null = null;
    if (p.bankInstitution || p.bankTransit || p.bankAccount) {
      bankRef = [p.bankInstitution, p.bankTransit, p.bankAccount].filter(Boolean).join("-");
    }
    if (p.voidChequeFileId) {
      bankRef = bankRef ? `${bankRef} (VC: ${p.voidChequeFileId})` : `VC: ${p.voidChequeFileId}`;
    }
    map.set(p.workerUserId, { etransferEmail: p.etransferEmail, bankRef });
  }
  return map;
}

function aggregateByHotel(logs: WorkerLogRow[], paymentMap: Map<string, { etransferEmail: string | null; bankRef: string | null }>): HotelGroup[] {
  const hotelMap = new Map<string, { workplaceId: string; workplaceName: string; workers: Map<string, AggregatedWorker> }>();

  for (const log of logs) {
    const hKey = log.workplaceId || "unassigned";
    if (!hotelMap.has(hKey)) {
      hotelMap.set(hKey, { workplaceId: hKey, workplaceName: log.workplaceName, workers: new Map() });
    }
    const hotel = hotelMap.get(hKey)!;

    if (!hotel.workers.has(log.workerId)) {
      const payment = paymentMap.get(log.workerId);
      hotel.workers.set(log.workerId, {
        workerId: log.workerId,
        workerName: log.workerName,
        workerEmail: log.workerEmail,
        totalHoursRounded: 0,
        totalRawHours: 0,
        logsCount: 0,
        incompleteLogs: 0,
        datesWorked: [],
        etransferEmail: payment?.etransferEmail || null,
        bankRef: payment?.bankRef || null,
        logs: [],
      });
    }
    const worker = hotel.workers.get(log.workerId)!;

    const calc = calculatePayableHours(log.timeIn, log.timeOut);
    worker.totalHoursRounded += calc.netHoursRounded;
    worker.totalRawHours += calc.rawHours;
    worker.logsCount += 1;
    if (calc.isIncomplete) worker.incompleteLogs += 1;
    if (log.logDate && !worker.datesWorked.includes(log.logDate)) {
      worker.datesWorked.push(log.logDate);
    }
    worker.logs.push({
      logId: log.logId,
      date: log.logDate,
      timeIn: log.timeIn ? log.timeIn.toISOString() : null,
      timeOut: log.timeOut ? log.timeOut.toISOString() : null,
      rawHours: calc.rawHours,
      deductionHours: calc.deductionHours,
      netHoursRounded: calc.netHoursRounded,
      isIncomplete: calc.isIncomplete,
    });
  }

  const groups: HotelGroup[] = [];
  for (const [, hotel] of hotelMap) {
    const workers = Array.from(hotel.workers.values()).map(w => ({
      ...w,
      totalHoursRounded: Math.round(w.totalHoursRounded * 100) / 100,
      totalRawHours: Math.round(w.totalRawHours * 100) / 100,
      datesWorked: w.datesWorked.sort(),
    }));
    groups.push({
      workplaceId: hotel.workplaceId,
      workplaceName: hotel.workplaceName,
      workers,
      totalHours: workers.reduce((s, w) => s + w.totalHoursRounded, 0),
      totalLogs: workers.reduce((s, w) => s + w.logsCount, 0),
    });
  }

  return groups.sort((a, b) => a.workplaceName.localeCompare(b.workplaceName));
}

function generateTimesheetRows(groups: HotelGroup[], windowLabel: string, startDate: string, endDate: string, generatedAt: string): any[][] {
  const header = ["Hotel", "Period", "PeriodStart", "PeriodEnd", "WorkerName", "WorkerId", "DatesWorked", "HoursWorked", "ShiftsWorked", "EtransferEmail", "VoidChequeOrBankRef", "GeneratedAt"];
  const rows: any[][] = [header];

  for (const hotel of groups) {
    for (const worker of hotel.workers) {
      rows.push([
        hotel.workplaceName,
        windowLabel,
        startDate,
        endDate,
        worker.workerName,
        worker.workerId,
        worker.datesWorked.join(", "),
        worker.totalHoursRounded,
        worker.logsCount,
        worker.etransferEmail || "",
        worker.bankRef || "",
        generatedAt,
      ]);
    }
  }
  return rows;
}

function generateDetailedRows(groups: HotelGroup[], windowLabel: string, startDate: string, endDate: string, generatedAt: string): any[][] {
  const header = ["Hotel", "Period", "PeriodStart", "PeriodEnd", "WorkerName", "WorkerId", "Date", "TimeIn", "TimeOut", "RawHours", "BreakDeduction", "NetHoursRounded", "Incomplete", "GeneratedAt"];
  const rows: any[][] = [header];

  for (const hotel of groups) {
    for (const worker of hotel.workers) {
      for (const log of worker.logs) {
        rows.push([
          hotel.workplaceName,
          windowLabel,
          startDate,
          endDate,
          worker.workerName,
          worker.workerId,
          log.date,
          log.timeIn || "",
          log.timeOut || "",
          log.rawHours,
          log.deductionHours,
          log.netHoursRounded,
          log.isIncomplete ? "Yes" : "No",
          generatedAt,
        ]);
      }
    }
  }
  return rows;
}

function generatePaymentSummaryRows(groups: HotelGroup[], windowLabel: string, startDate: string, endDate: string, generatedAt: string): any[][] {
  const header = ["Hotel", "Period", "PeriodStart", "PeriodEnd", "WorkerName", "WorkerId", "TotalHours", "ShiftsWorked", "EtransferEmail", "VoidChequeOrBankRef", "GeneratedAt"];
  const rows: any[][] = [header];

  for (const hotel of groups) {
    for (const worker of hotel.workers) {
      rows.push([
        hotel.workplaceName,
        windowLabel,
        startDate,
        endDate,
        worker.workerName,
        worker.workerId,
        worker.totalHoursRounded,
        worker.logsCount,
        worker.etransferEmail || "",
        worker.bankRef || "",
        generatedAt,
      ]);
    }
    rows.push([
      hotel.workplaceName,
      windowLabel,
      startDate,
      endDate,
      "=== HOTEL TOTAL ===",
      "",
      hotel.totalHours,
      hotel.totalLogs,
      "",
      "",
      generatedAt,
    ]);
  }
  return rows;
}

function generateInvoiceSummaryRows(groups: HotelGroup[], weekStart: string, weekEnd: string, generatedAt: string): any[][] {
  const header = ["Hotel", "WeekStart", "WeekEnd", "WorkerName", "WorkerId", "TotalHours", "LogsCount", "GeneratedAt"];
  const rows: any[][] = [header];

  for (const hotel of groups) {
    for (const worker of hotel.workers) {
      rows.push([
        hotel.workplaceName,
        weekStart,
        weekEnd,
        worker.workerName,
        worker.workerId,
        worker.totalHoursRounded,
        worker.logsCount,
        generatedAt,
      ]);
    }
    rows.push([
      hotel.workplaceName,
      weekStart,
      weekEnd,
      "=== HOTEL TOTAL ===",
      "",
      hotel.totalHours,
      hotel.totalLogs,
      generatedAt,
    ]);
  }
  return rows;
}

function rowsToBuffer(rows: any[][], format: "csv" | "xlsx", sheetName: string = "Sheet1"): Buffer {
  if (format === "csv") {
    const csvContent = rows.map(row =>
      row.map((cell: any) => {
        const str = String(cell ?? "");
        if (str.includes(",") || str.includes('"') || str.includes("\n")) {
          return `"${str.replace(/"/g, '""')}"`;
        }
        return str;
      }).join(",")
    ).join("\n");
    return Buffer.from(csvContent, "utf-8");
  }

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet(rows);
  XLSX.utils.book_append_sheet(wb, ws, sheetName);
  return Buffer.from(XLSX.write(wb, { bookType: "xlsx", type: "buffer" }));
}

function sanitizeFileName(name: string): string {
  return name.replace(/[^a-zA-Z0-9_-]/g, "_").replace(/_+/g, "_");
}

export function registerPayrollHoursRoutes(app: Express): void {

  app.get("/api/admin/hours/cutoffs", checkAdminRole(), async (req: Request, res: Response) => {
    try {
      const year = parseInt(req.query.year as string) || 2026;
      const periods = getCutoffPeriods(year);
      res.json({ year, periods });
    } catch (error) {
      console.error("Error fetching cutoffs:", error);
      res.status(500).json({ error: "Failed to fetch cutoff periods" });
    }
  });

  app.get("/api/admin/hours/weeks", checkAdminRole(), async (req: Request, res: Response) => {
    try {
      const year = parseInt(req.query.year as string) || 2026;
      const mondays = getMondaysForYear(year);
      const weeks = mondays.map((monday, i) => {
        const window = getWeeklyWindow(monday);
        return {
          weekNumber: i + 1,
          startDate: window.start,
          endDate: window.end,
          label: `Week ${i + 1}: ${formatDateLabel(window.start)} - ${formatDateLabel(window.end)}`,
        };
      });
      res.json({ year, weeks });
    } catch (error) {
      console.error("Error fetching weeks:", error);
      res.status(500).json({ error: "Failed to fetch weeks" });
    }
  });

  app.get("/api/admin/hours/hotels", checkAdminRole(), async (_req: Request, res: Response) => {
    try {
      const hotels = await db
        .select({ id: workplaces.id, name: workplaces.name, isActive: workplaces.isActive })
        .from(workplaces)
        .orderBy(workplaces.name);
      res.json({ hotels });
    } catch (error) {
      console.error("Error fetching hotels:", error);
      res.status(500).json({ error: "Failed to fetch hotels" });
    }
  });

  app.get("/api/admin/hours/aggregate", checkAdminRole(), async (req: Request, res: Response) => {
    try {
      const mode = req.query.mode as string;
      const hotelId = req.query.hotelId as string || "all";
      let startDate: string, endDate: string, windowLabel: string;

      if (mode === "weekly") {
        const weekStart = req.query.weekStart as string;
        if (!weekStart) {
          res.status(400).json({ error: "weekStart is required for weekly mode" });
          return;
        }
        const window = getWeeklyWindow(weekStart);
        startDate = window.start;
        endDate = window.end;
        windowLabel = `Week: ${formatDateLabel(startDate)} - ${formatDateLabel(endDate)}`;
      } else if (mode === "cutoff") {
        const year = parseInt(req.query.year as string) || 2026;
        const period = parseInt(req.query.period as string);
        if (!period || period < 1 || period > 26) {
          res.status(400).json({ error: "period (1-26) is required for cutoff mode" });
          return;
        }
        const periods = getCutoffPeriods(year);
        const p = periods.find(pp => pp.period === period);
        if (!p) {
          res.status(400).json({ error: `Period ${period} not found for year ${year}` });
          return;
        }
        startDate = p.startDate;
        endDate = p.endDate;
        windowLabel = `Period ${period}: ${formatDateLabel(startDate)} - ${formatDateLabel(endDate)}`;
      } else {
        res.status(400).json({ error: "mode must be 'weekly' or 'cutoff'" });
        return;
      }

      const logs = await fetchLogsInRange(startDate, endDate, hotelId);
      const workerIds = [...new Set(logs.map(l => l.workerId))];
      const paymentMap = await fetchPaymentProfiles(workerIds);
      const groups = aggregateByHotel(logs, paymentMap);

      const grandTotalHours = groups.reduce((s, g) => s + g.totalHours, 0);
      const grandTotalLogs = groups.reduce((s, g) => s + g.totalLogs, 0);

      res.json({
        mode,
        startDate,
        endDate,
        windowLabel,
        hotelId,
        hotels: groups,
        grandTotalHours: Math.round(grandTotalHours * 100) / 100,
        grandTotalLogs,
      });
    } catch (error) {
      console.error("Error in aggregation:", error);
      res.status(500).json({ error: "Failed to aggregate hours data" });
    }
  });

  app.get("/api/admin/hours/export", checkAdminRole(), async (req: Request, res: Response) => {
    try {
      const mode = req.query.mode as string;
      const format = (req.query.format as string) || "csv";
      const type = req.query.type as string;
      const hotelId = req.query.hotelId as string || "all";

      if (!["csv", "xlsx"].includes(format)) {
        res.status(400).json({ error: "format must be csv or xlsx" });
        return;
      }

      let startDate: string, endDate: string, windowLabel: string, filePrefix: string;
      let periodYear = 2026, periodNumber = 0;

      if (mode === "weekly") {
        const weekStart = req.query.weekStart as string;
        if (!weekStart) {
          res.status(400).json({ error: "weekStart required" });
          return;
        }
        const window = getWeeklyWindow(weekStart);
        startDate = window.start;
        endDate = window.end;
        windowLabel = `Week: ${formatDateLabel(startDate)} - ${formatDateLabel(endDate)}`;
        filePrefix = `WFC_Weekly_${weekStart}`;
        periodYear = parseInt(weekStart.substring(0, 4));
      } else if (mode === "cutoff") {
        const year = parseInt(req.query.year as string) || 2026;
        const period = parseInt(req.query.period as string);
        const periods = getCutoffPeriods(year);
        const p = periods.find(pp => pp.period === period);
        if (!p) {
          res.status(400).json({ error: `Period ${period} not found` });
          return;
        }
        startDate = p.startDate;
        endDate = p.endDate;
        windowLabel = `Period ${period}`;
        filePrefix = `WFC_Payroll_${year}_Period-${String(period).padStart(2, "0")}`;
        periodYear = year;
        periodNumber = period;
      } else {
        res.status(400).json({ error: "mode must be weekly or cutoff" });
        return;
      }

      const logs = await fetchLogsInRange(startDate, endDate, hotelId);
      const workerIds = [...new Set(logs.map(l => l.workerId))];
      const paymentMap = await fetchPaymentProfilesFull(workerIds);
      const groups = aggregateByHotel(logs, paymentMap);
      const generatedAt = new Date().toISOString();

      let rows: any[][];
      let sheetName: string;
      let typeSuffix: string;

      switch (type) {
        case "invoiceSummary":
          rows = generateInvoiceSummaryRows(groups, startDate, endDate, generatedAt);
          sheetName = "Invoice Summary";
          typeSuffix = "InvoiceSummary";
          break;
        case "invoiceDetailed":
          rows = generateDetailedRows(groups, windowLabel, startDate, endDate, generatedAt);
          sheetName = "Invoice Detailed";
          typeSuffix = "InvoiceDetailed";
          break;
        case "payrollTimesheet":
          rows = generateTimesheetRows(groups, windowLabel, startDate, endDate, generatedAt);
          sheetName = "Payroll Timesheet";
          typeSuffix = "Timesheet";
          break;
        case "payrollPaymentSummary":
          rows = generatePaymentSummaryRows(groups, windowLabel, startDate, endDate, generatedAt);
          sheetName = "Payment Summary";
          typeSuffix = "PaymentSummary";
          break;
        default:
          res.status(400).json({ error: "type must be invoiceSummary, invoiceDetailed, payrollTimesheet, or payrollPaymentSummary" });
          return;
      }

      const hotelName = hotelId === "all" ? "AllHotels" : sanitizeFileName(groups[0]?.workplaceName || "Hotel");
      const fileName = `${filePrefix}_${hotelName}_${typeSuffix}.${format}`;
      const buffer = rowsToBuffer(rows, format as "csv" | "xlsx", sheetName);

      try {
        await db.insert(exportAuditLogs).values({
          adminUserId: (req.headers["x-user-id"] as string) || "unknown",
          exportType: type,
          fileFormat: format,
          periodYear,
          periodNumber,
          workplaceId: hotelId === "all" ? null : hotelId,
          workplaceName: hotelId === "all" ? "All Hotels" : (groups[0]?.workplaceName || null),
          fileName,
        });
      } catch (auditErr) {
        console.error("Audit log error (non-blocking):", auditErr);
      }

      const contentType = format === "csv" ? "text/csv" : "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
      res.setHeader("Content-Type", contentType);
      res.setHeader("Content-Disposition", `attachment; filename="${fileName}"`);
      res.send(buffer);
    } catch (error) {
      console.error("Error in export:", error);
      res.status(500).json({ error: "Failed to generate export" });
    }
  });

  // Email hours export
  app.post("/api/admin/hours/email", checkAdminRole(), async (req: Request, res: Response) => {
    try {
      const { to, mode, format: fmt, type, hotelId: hId, weekStart, year: yr, period: pd, subject } = req.body;
      const format = fmt || "csv";

      if (!to || typeof to !== "string" || !to.includes("@")) {
        res.status(400).json({ error: "Valid email address is required" });
        return;
      }

      if (!["csv", "xlsx"].includes(format)) {
        res.status(400).json({ error: "format must be csv or xlsx" });
        return;
      }

      const hotelId = hId || "all";
      let startDate: string, endDate: string, windowLabel: string, filePrefix: string;
      let periodYear = 2026, periodNumber = 0;

      if (mode === "weekly") {
        if (!weekStart) {
          res.status(400).json({ error: "weekStart required" });
          return;
        }
        const window = getWeeklyWindow(weekStart);
        startDate = window.start;
        endDate = window.end;
        windowLabel = `Week: ${formatDateLabel(startDate)} - ${formatDateLabel(endDate)}`;
        filePrefix = `WFC_Weekly_${weekStart}`;
        periodYear = parseInt(weekStart.substring(0, 4));
      } else if (mode === "cutoff") {
        const year = parseInt(yr) || 2026;
        const period = parseInt(pd);
        const periods = getCutoffPeriods(year);
        const p = periods.find(pp => pp.period === period);
        if (!p) {
          res.status(400).json({ error: `Period ${period} not found` });
          return;
        }
        startDate = p.startDate;
        endDate = p.endDate;
        windowLabel = `Period ${period}`;
        filePrefix = `WFC_Payroll_${year}_Period-${String(period).padStart(2, "0")}`;
        periodYear = year;
        periodNumber = period;
      } else {
        res.status(400).json({ error: "mode must be weekly or cutoff" });
        return;
      }

      const logs = await fetchLogsInRange(startDate, endDate, hotelId);
      const workerIds = [...new Set(logs.map(l => l.workerId))];
      const paymentMap = await fetchPaymentProfilesFull(workerIds);
      const groups = aggregateByHotel(logs, paymentMap);
      const generatedAt = new Date().toISOString();

      let rows: any[][];
      let sheetName: string;
      let typeSuffix: string;

      switch (type) {
        case "invoiceSummary":
          rows = generateInvoiceSummaryRows(groups, startDate, endDate, generatedAt);
          sheetName = "Invoice Summary";
          typeSuffix = "InvoiceSummary";
          break;
        case "invoiceDetailed":
          rows = generateDetailedRows(groups, windowLabel, startDate, endDate, generatedAt);
          sheetName = "Invoice Detailed";
          typeSuffix = "InvoiceDetailed";
          break;
        case "payrollTimesheet":
          rows = generateTimesheetRows(groups, windowLabel, startDate, endDate, generatedAt);
          sheetName = "Payroll Timesheet";
          typeSuffix = "Timesheet";
          break;
        case "payrollPaymentSummary":
          rows = generatePaymentSummaryRows(groups, windowLabel, startDate, endDate, generatedAt);
          sheetName = "Payment Summary";
          typeSuffix = "PaymentSummary";
          break;
        default:
          res.status(400).json({ error: "type must be invoiceSummary, invoiceDetailed, payrollTimesheet, or payrollPaymentSummary" });
          return;
      }

      const hotelName = hotelId === "all" ? "AllHotels" : sanitizeFileName(groups[0]?.workplaceName || "Hotel");
      const fileName = `${filePrefix}_${hotelName}_${typeSuffix}.${format}`;
      const buffer = rowsToBuffer(rows, format as "csv" | "xlsx", sheetName);

      const emailSubject = subject || `WFConnect ${sheetName} - ${windowLabel} (${startDate} to ${endDate})`;
      const bodyText = `Please find attached the ${sheetName} report for ${windowLabel} (${startDate} to ${endDate}).\n\n- WFConnect`;

      let result;
      if (format === "csv") {
        result = await sendCSVEmail(to, emailSubject, bodyText, buffer.toString(), fileName);
      } else {
        result = await sendXLSXEmail(to, emailSubject, bodyText, buffer as Buffer, fileName);
      }

      if (result.success) {
        try {
          await db.insert(exportAuditLogs).values({
            adminUserId: (req.headers["x-user-id"] as string) || "unknown",
            exportType: type,
            fileFormat: format,
            periodYear,
            periodNumber,
            workplaceId: hotelId === "all" ? null : hotelId,
            workplaceName: hotelId === "all" ? "All Hotels" : (groups[0]?.workplaceName || null),
            fileName: `[EMAILED] ${fileName}`,
          });
        } catch (auditErr) {
          console.error("Audit log error (non-blocking):", auditErr);
        }

        res.json({ success: true, message: `${sheetName} sent to ${to}` });
      } else {
        res.status(500).json({ error: result.error || "Failed to send email" });
      }
    } catch (error) {
      console.error("Error emailing hours export:", error);
      res.status(500).json({ error: "Failed to email hours export" });
    }
  });

  app.get("/api/admin/hours/export/all", checkAdminRole(), async (req: Request, res: Response) => {
    try {
      const mode = req.query.mode as string;
      const format = (req.query.format as string) || "csv";
      const type = req.query.type as string;

      let startDate: string, endDate: string, windowLabel: string, filePrefix: string;
      let periodYear = 2026, periodNumber = 0;

      if (mode === "weekly") {
        const weekStart = req.query.weekStart as string;
        if (!weekStart) { res.status(400).json({ error: "weekStart required" }); return; }
        const window = getWeeklyWindow(weekStart);
        startDate = window.start;
        endDate = window.end;
        windowLabel = `Week: ${formatDateLabel(startDate)} - ${formatDateLabel(endDate)}`;
        filePrefix = `WFC_Weekly_${weekStart}`;
        periodYear = parseInt(weekStart.substring(0, 4));
      } else if (mode === "cutoff") {
        const year = parseInt(req.query.year as string) || 2026;
        const period = parseInt(req.query.period as string);
        const periods = getCutoffPeriods(year);
        const p = periods.find(pp => pp.period === period);
        if (!p) { res.status(400).json({ error: `Period ${period} not found` }); return; }
        startDate = p.startDate;
        endDate = p.endDate;
        windowLabel = `Period ${period}`;
        filePrefix = `WFC_Payroll_${year}_Period-${String(period).padStart(2, "0")}`;
        periodYear = year;
        periodNumber = period;
      } else {
        res.status(400).json({ error: "mode must be weekly or cutoff" }); return;
      }

      const allLogs = await fetchLogsInRange(startDate, endDate);
      const workerIds = [...new Set(allLogs.map(l => l.workerId))];
      const paymentMap = await fetchPaymentProfilesFull(workerIds);
      const allGroups = aggregateByHotel(allLogs, paymentMap);
      const generatedAt = new Date().toISOString();

      res.setHeader("Content-Type", "application/zip");
      res.setHeader("Content-Disposition", `attachment; filename="${filePrefix}_AllHotels.zip"`);

      const archive = archiver.default("zip", { zlib: { level: 9 } });
      archive.pipe(res);

      for (const hotel of allGroups) {
        const singleGroup = [hotel];
        let rows: any[][];
        let typeSuffix: string;

        switch (type) {
          case "invoiceSummary":
            rows = generateInvoiceSummaryRows(singleGroup, startDate, endDate, generatedAt);
            typeSuffix = "InvoiceSummary";
            break;
          case "invoiceDetailed":
            rows = generateDetailedRows(singleGroup, windowLabel, startDate, endDate, generatedAt);
            typeSuffix = "InvoiceDetailed";
            break;
          case "payrollTimesheet":
            rows = generateTimesheetRows(singleGroup, windowLabel, startDate, endDate, generatedAt);
            typeSuffix = "Timesheet";
            break;
          case "payrollPaymentSummary":
            rows = generatePaymentSummaryRows(singleGroup, windowLabel, startDate, endDate, generatedAt);
            typeSuffix = "PaymentSummary";
            break;
          default:
            rows = generateTimesheetRows(singleGroup, windowLabel, startDate, endDate, generatedAt);
            typeSuffix = "Timesheet";
        }

        const hotelFileName = `${filePrefix}_${sanitizeFileName(hotel.workplaceName)}_${typeSuffix}.${format}`;
        const buffer = rowsToBuffer(rows, format as "csv" | "xlsx", "Sheet1");
        archive.append(buffer, { name: hotelFileName });
      }

      try {
        await db.insert(exportAuditLogs).values({
          adminUserId: (req.headers["x-user-id"] as string) || "unknown",
          exportType: `${type}_allHotels`,
          fileFormat: "zip",
          periodYear,
          periodNumber,
          workplaceId: null,
          workplaceName: "All Hotels (ZIP)",
          fileName: `${filePrefix}_AllHotels.zip`,
        });
      } catch (auditErr) {
        console.error("Audit log error (non-blocking):", auditErr);
      }

      await archive.finalize();
    } catch (error) {
      console.error("Error in ZIP export:", error);
      res.status(500).json({ error: "Failed to generate ZIP export" });
    }
  });
}
