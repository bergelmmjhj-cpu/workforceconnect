import type Anthropic from "@anthropic-ai/sdk";
import { db } from "../../db";
import {
  users,
  shifts,
  shiftRequests,
  workplaces,
  workplaceAssignments,
  smsLogs,
  discordAlerts,
  conversations,
  messages,
} from "../../../shared/schema";
import { eq, and, ilike, or, desc, gte, lte, sql } from "drizzle-orm";
import { sendSMS, logSMS } from "../openphone";
import { sendDiscordNotification } from "../discord";

const GM_LILEE_PHONE = "+14166028038";

// ============================================
// Tool Schemas (Anthropic format)
// ============================================

export const CLAWD_TOOLS: Anthropic.Tool[] = [
  // ----- LOOKUP TOOLS -----
  {
    name: "lookup_workers",
    description: "Search for workers by name, phone number, role, or workplace. Supports fuzzy name matching — try partial names, first names, or camelCase compressed names like 'BergelMMJ'. Use phone parameter for phone number lookup.",
    input_schema: {
      type: "object" as const,
      properties: {
        query: { type: "string", description: "Name or partial name to search for. Supports fuzzy matching — try first name alone, last name alone, or compressed names like 'BergelMMJ'." },
        phone: { type: "string", description: "Phone number to search by (digits only or formatted). Use when user provides a phone number to identify a worker." },
        workplaceId: { type: "string", description: "Filter by workplace ID (optional)" },
        role: { type: "string", description: "Filter by role (optional)" },
        limit: { type: "number", description: "Max results to return (default 10)" },
      },
    },
  },
  {
    name: "lookup_workplaces",
    description: "List workplaces, optionally filtered by name. Use to find the right workplace ID.",
    input_schema: {
      type: "object" as const,
      properties: {
        query: { type: "string", description: "Name or partial name to search for (optional)" },
      },
    },
  },
  {
    name: "lookup_shifts",
    description: "Search for shifts by workplace, date, or status. Use to find shifts before assigning workers.",
    input_schema: {
      type: "object" as const,
      properties: {
        workplaceId: { type: "string", description: "Filter by workplace ID (optional)" },
        date: { type: "string", description: "Filter by date in YYYY-MM-DD format (optional)" },
        status: { type: "string", description: "Filter by status: scheduled, in_progress, completed, cancelled (optional)" },
        workerUserId: { type: "string", description: "Filter by assigned worker ID (optional)" },
        limit: { type: "number", description: "Max results (default 10)" },
      },
    },
  },
  {
    name: "lookup_shift_requests",
    description: "Search for shift requests by workplace, date, or status.",
    input_schema: {
      type: "object" as const,
      properties: {
        workplaceId: { type: "string", description: "Filter by workplace ID (optional)" },
        date: { type: "string", description: "Filter by date in YYYY-MM-DD format (optional)" },
        status: { type: "string", description: "Filter by status (optional)" },
        limit: { type: "number", description: "Max results (default 10)" },
      },
    },
  },
  {
    name: "read_recent_sms",
    description: "Read recent inbound or outbound SMS messages from the system. Use to see what workers or clients have texted in.",
    input_schema: {
      type: "object" as const,
      properties: {
        direction: { type: "string", description: "Filter by direction: inbound, outbound, or all (default: all)" },
        limit: { type: "number", description: "Max messages to return (default 20)" },
        phoneNumber: { type: "string", description: "Filter by specific phone number (optional)" },
        since: { type: "string", description: "Only show messages after this ISO date (optional)" },
      },
    },
  },
  {
    name: "find_available_workers",
    description: "Find workers who are available to cover a shift at a workplace. Returns workers assigned to the workplace who do NOT have overlapping shifts.",
    input_schema: {
      type: "object" as const,
      properties: {
        workplaceId: { type: "string", description: "The workplace ID to find workers for" },
        date: { type: "string", description: "The date in YYYY-MM-DD format" },
        startTime: { type: "string", description: "Shift start time (optional, e.g. '08:00')" },
        endTime: { type: "string", description: "Shift end time (optional, e.g. '16:00')" },
      },
      required: ["workplaceId", "date"],
    },
  },
  {
    name: "check_discord_alerts",
    description: "Check recent Discord alerts and their acknowledgment status. Use to see what events have been notified.",
    input_schema: {
      type: "object" as const,
      properties: {
        status: { type: "string", description: "Filter by status: pending, acknowledged, resolved, or all (default: all)" },
        type: { type: "string", description: "Filter by alert type (optional)" },
        limit: { type: "number", description: "Max alerts to return (default 10)" },
      },
    },
  },
  // ----- ACTION TOOLS -----
  {
    name: "send_sms",
    description: "Send an SMS text message to a phone number. This sends a REAL text message via OpenPhone. Use for worker outreach, coverage requests, or important notifications.",
    input_schema: {
      type: "object" as const,
      properties: {
        phoneNumber: { type: "string", description: "The recipient phone number (E.164 or 10-digit)" },
        message: { type: "string", description: "The text message content" },
        workerId: { type: "string", description: "The worker ID if sending to a worker (for logging)" },
      },
      required: ["phoneNumber", "message"],
    },
  },
  {
    name: "notify_gm_lilee",
    description: "Send an SMS alert to GM Lilee (+14166028038). Use for ALL critical events: sick calls, client requests, coverage actions, urgent shifts.",
    input_schema: {
      type: "object" as const,
      properties: {
        message: { type: "string", description: "The alert message to send to GM Lilee" },
      },
      required: ["message"],
    },
  },
  {
    name: "send_discord_notification",
    description: "Send a notification to the Discord channel for the team. Use for important operational events that the team should be aware of.",
    input_schema: {
      type: "object" as const,
      properties: {
        title: { type: "string", description: "The notification title" },
        message: { type: "string", description: "The notification body" },
        urgency: { type: "string", description: "Urgency level: urgent (red), warning (amber), info (blue), success (green)" },
        type: { type: "string", description: "Alert type: sick_call, client_request, urgent_shift, auto_coverage, general" },
      },
      required: ["title", "message"],
    },
  },
  {
    name: "send_worker_internal_message",
    description: "Send an internal app message to a worker through the WFConnect messaging system.",
    input_schema: {
      type: "object" as const,
      properties: {
        workerId: { type: "string", description: "The worker's user ID" },
        message: { type: "string", description: "The message to send" },
        senderUserId: { type: "string", description: "The sender's user ID (HR or admin)" },
      },
      required: ["workerId", "message", "senderUserId"],
    },
  },
  {
    name: "create_shift_request",
    description: "Create a new shift request for a workplace. This CREATES a real shift request in the system.",
    input_schema: {
      type: "object" as const,
      properties: {
        workplaceId: { type: "string", description: "The workplace ID" },
        roleType: { type: "string", description: "The role type needed" },
        date: { type: "string", description: "Shift date in YYYY-MM-DD format" },
        startTime: { type: "string", description: "Start time (e.g. '08:00')" },
        endTime: { type: "string", description: "End time (e.g. '16:00')" },
        notes: { type: "string", description: "Additional notes (optional)" },
        clientId: { type: "string", description: "The client user ID who is requesting" },
      },
      required: ["workplaceId", "roleType", "date", "startTime", "endTime", "clientId"],
    },
  },
  {
    name: "generate_replit_prompt",
    description: "When you cannot fulfill a user's request with the available tools, use this to generate a detailed, copy-ready prompt for Replit AI that describes the problem and solution needed. Always use this as a fallback when stuck.",
    input_schema: {
      type: "object" as const,
      properties: {
        userRequest: { type: "string", description: "What the user asked for" },
        whatWasAttempted: { type: "string", description: "What you tried to do and why it failed" },
        suggestedSolution: { type: "string", description: "Your suggestion for how Replit AI should solve it" },
        affectedFiles: { type: "string", description: "Comma-separated list of files that would likely need to change" },
        additionalContext: { type: "string", description: "Any additional technical context that would help Replit AI understand the codebase" },
      },
      required: ["userRequest", "suggestedSolution"],
    },
  },
];

// ============================================
// Tool Executor
// ============================================

export async function executeTool(toolName: string, input: Record<string, unknown>, callerUserId?: string): Promise<unknown> {
  switch (toolName) {
    case "lookup_workers":
      return lookupWorkers(input);
    case "lookup_workplaces":
      return lookupWorkplaces(input);
    case "lookup_shifts":
      return lookupShifts(input);
    case "lookup_shift_requests":
      return lookupShiftRequests(input);
    case "read_recent_sms":
      return readRecentSms(input);
    case "find_available_workers":
      return findAvailableWorkers(input);
    case "check_discord_alerts":
      return checkDiscordAlerts(input);
    case "send_sms":
      return toolSendSms(input);
    case "notify_gm_lilee":
      return notifyGmLilee(input);
    case "send_discord_notification":
      return toolSendDiscord(input);
    case "send_worker_internal_message":
      return sendWorkerInternalMessage(input, callerUserId);
    case "create_shift_request":
      return toolCreateShiftRequest(input);
    case "generate_replit_prompt":
      return generateReplitPrompt(input);
    default:
      throw new Error(`Unknown tool: ${toolName}`);
  }
}

// ============================================
// Lookup implementations
// ============================================

// Split a compressed/camelCase name into search tokens
// "BergelMMJ" → ["Bergel", "MMJ", "Berge"]
// "John Smith" → ["John", "Smith"]
function tokenizeName(query: string): string[] {
  // Strip common prefixes like "try ", "find ", "search "
  const cleaned = query.replace(/^\s*(try|find|search|look\s*up)\s+/i, "").trim();
  // Split on spaces
  const spaceParts = cleaned.split(/\s+/).filter(Boolean);
  // Also split camelCase / consecutive uppercase groups
  const allTokens = new Set<string>();
  for (const part of spaceParts) {
    allTokens.add(part);
    // Split camelCase: "BergelMMJ" → ["Bergel", "MMJ"]
    const camel = part.split(/(?=[A-Z][a-z])|(?<=[a-z])(?=[A-Z])/).filter(t => t.length >= 2);
    camel.forEach(t => allTokens.add(t));
    // Also add first 5 chars as prefix
    if (part.length > 4) allTokens.add(part.slice(0, 5));
  }
  return Array.from(allTokens).filter(t => t.length >= 2);
}

async function lookupWorkers(input: Record<string, unknown>) {
  const query = input.query as string | undefined;
  const phone = input.phone as string | undefined;
  const workplaceId = input.workplaceId as string | undefined;
  const role = input.role as string | undefined;
  const limit = (input.limit as number) || 10;

  const baseSelect = {
    id: users.id,
    fullName: users.fullName,
    email: users.email,
    phone: users.phone,
    role: users.role,
    workerRoles: users.workerRoles,
    isActive: users.isActive,
  };

  const workerActiveConditions = [eq(users.role, "worker"), eq(users.isActive, true)];

  // Phone lookup path
  if (phone) {
    const normalizedInput = phone.replace(/[^\d]/g, "");
    const allWorkers = await db.select(baseSelect).from(users).where(and(...workerActiveConditions));
    const phoneMatches = allWorkers.filter(w => {
      if (!w.phone) return false;
      const wNorm = w.phone.replace(/[^\d]/g, "");
      return wNorm === normalizedInput ||
        wNorm.endsWith(normalizedInput) ||
        normalizedInput.endsWith(wNorm) ||
        (normalizedInput.length >= 10 && wNorm.includes(normalizedInput.slice(-10)));
    });

    if (phoneMatches.length > 0) {
      return { workers: phoneMatches.slice(0, limit), count: phoneMatches.length, searchedBy: "phone" };
    }
    return { workers: [], count: 0, searchedBy: "phone", message: "No worker found with that phone number" };
  }

  // Name search — try primary match first, then fuzzy multi-token
  if (query) {
    const primaryConditions = [...workerActiveConditions, ilike(users.fullName, `%${query}%`)];
    if (role) primaryConditions.push(ilike(users.workerRoles, `%${role}%`));

    let results = await db.select(baseSelect).from(users).where(and(...primaryConditions)).limit(limit);

    // If primary search found nothing, try token-by-token fuzzy search
    if (results.length === 0) {
      const tokens = tokenizeName(query);
      const seen = new Set<string>();
      for (const token of tokens) {
        if (token.length < 2) continue;
        const tokenConditions = [...workerActiveConditions, ilike(users.fullName, `%${token}%`)];
        const tokenResults = await db.select(baseSelect).from(users).where(and(...tokenConditions)).limit(10);
        for (const r of tokenResults) {
          if (!seen.has(r.id)) {
            seen.add(r.id);
            results.push(r);
          }
        }
        if (results.length >= limit) break;
      }
      if (results.length > 0) {
        console.log(`[tools] Fuzzy worker lookup for "${query}" found ${results.length} via tokens: ${tokens.join(", ")}`);
      }
    }

    // Workplace filter
    if (workplaceId && results.length > 0) {
      const assigned = await db
        .select({ workerUserId: workplaceAssignments.workerUserId })
        .from(workplaceAssignments)
        .where(and(eq(workplaceAssignments.workplaceId, workplaceId), eq(workplaceAssignments.status, "active")));
      const assignedIds = new Set(assigned.map(a => a.workerUserId));
      results = results.filter(w => assignedIds.has(w.id));
    }

    return {
      workers: results.slice(0, limit),
      count: results.length,
      searchedBy: "name",
      searchQuery: query,
      note: results.length === 0 ? `No worker found matching "${query}". Try providing a phone number instead.` : undefined,
    };
  }

  // No query — list all workers (filtered by role/workplace)
  const conditions = [...workerActiveConditions];
  if (role) conditions.push(ilike(users.workerRoles, `%${role}%`));

  let results = await db.select(baseSelect).from(users).where(and(...conditions)).limit(limit);

  if (workplaceId) {
    const assigned = await db
      .select({ workerUserId: workplaceAssignments.workerUserId })
      .from(workplaceAssignments)
      .where(and(eq(workplaceAssignments.workplaceId, workplaceId), eq(workplaceAssignments.status, "active")));
    const assignedIds = new Set(assigned.map(a => a.workerUserId));
    results = results.filter(w => assignedIds.has(w.id));
  }

  return { workers: results, count: results.length };
}

// Common abbreviations to normalize before searching workplaces
const WORKPLACE_ALIAS_PAIRS: [RegExp, string][] = [
  [/\b4\s*points?\b/i, "four points"],
  [/\bh\.?i\.?\b(?!\s*\w{4,})/i, "holiday inn"],
  [/\bfour\s*pts?\b/i, "four points"],
  [/\bmarriot\b/i, "marriott"],
  [/\bshertaon\b/i, "sheraton"],
  [/\bhilton\b/i, "hilton"],
];

async function lookupWorkplaces(input: Record<string, unknown>) {
  const rawQuery = input.query as string | undefined;

  const selectFields = {
    id: workplaces.id,
    name: workplaces.name,
    addressLine1: workplaces.addressLine1,
    city: workplaces.city,
  };

  // No query — return all active workplaces
  if (!rawQuery || !rawQuery.trim()) {
    const results = await db.select(selectFields).from(workplaces)
      .where(eq(workplaces.isActive, true)).limit(20);
    return { workplaces: results, count: results.length };
  }

  // Normalize common alias abbreviations before searching
  let normalizedQuery = rawQuery.trim();
  for (const [pattern, replacement] of WORKPLACE_ALIAS_PAIRS) {
    normalizedQuery = normalizedQuery.replace(pattern, replacement).trim();
  }

  // Primary search — normalized query
  const primary = await db.select(selectFields).from(workplaces)
    .where(and(eq(workplaces.isActive, true), ilike(workplaces.name, `%${normalizedQuery}%`)))
    .limit(20);

  if (primary.length > 0) return { workplaces: primary, count: primary.length };

  // Also try original query if normalization changed it
  if (normalizedQuery.toLowerCase() !== rawQuery.toLowerCase().trim()) {
    const original = await db.select(selectFields).from(workplaces)
      .where(and(eq(workplaces.isActive, true), ilike(workplaces.name, `%${rawQuery.trim()}%`)))
      .limit(20);
    if (original.length > 0) return { workplaces: original, count: original.length };
  }

  // Token fallback: try each significant word in the query separately
  const tokens = normalizedQuery.split(/\s+/).filter(t => t.length >= 3);
  const seen = new Set<string>();
  const tokenResults: (typeof primary[0])[] = [];
  for (const token of tokens) {
    const rows = await db.select(selectFields).from(workplaces)
      .where(and(eq(workplaces.isActive, true), ilike(workplaces.name, `%${token}%`)))
      .limit(20);
    for (const row of rows) {
      const key = String(row.id);
      if (!seen.has(key)) {
        seen.add(key);
        tokenResults.push(row);
      }
    }
  }

  return { workplaces: tokenResults.slice(0, 20), count: tokenResults.length };
}

async function lookupShifts(input: Record<string, unknown>) {
  const limit = (input.limit as number) || 10;

  const conditions: ReturnType<typeof eq>[] = [];
  if (input.workplaceId) conditions.push(eq(shifts.workplaceId, input.workplaceId as string));
  if (input.status) conditions.push(eq(shifts.status, input.status as string));
  if (input.workerUserId) conditions.push(eq(shifts.workerUserId, input.workerUserId as string));
  if (input.date) conditions.push(eq(shifts.date, input.date as string));

  const results = await db
    .select({
      id: shifts.id,
      title: shifts.title,
      date: shifts.date,
      startTime: shifts.startTime,
      endTime: shifts.endTime,
      status: shifts.status,
      roleType: shifts.roleType,
      workplaceId: shifts.workplaceId,
      workerUserId: shifts.workerUserId,
    })
    .from(shifts)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(shifts.date))
    .limit(limit);

  return { shifts: results, count: results.length };
}

async function lookupShiftRequests(input: Record<string, unknown>) {
  const limit = (input.limit as number) || 10;

  const conditions: ReturnType<typeof eq>[] = [];
  if (input.workplaceId) conditions.push(eq(shiftRequests.workplaceId, input.workplaceId as string));
  if (input.status) conditions.push(eq(shiftRequests.status, input.status as string));
  if (input.date) conditions.push(eq(shiftRequests.date, input.date as string));

  const results = await db
    .select()
    .from(shiftRequests)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(shiftRequests.createdAt))
    .limit(limit);

  return { shiftRequests: results, count: results.length };
}

async function readRecentSms(input: Record<string, unknown>) {
  const direction = (input.direction as string) || "all";
  const limit = (input.limit as number) || 20;
  const phoneNumber = input.phoneNumber as string | undefined;
  const since = input.since as string | undefined;

  const conditions: ReturnType<typeof eq>[] = [];
  if (direction !== "all") conditions.push(eq(smsLogs.direction, direction));
  if (phoneNumber) conditions.push(eq(smsLogs.phoneNumber, phoneNumber));
  if (since) conditions.push(gte(smsLogs.createdAt, new Date(since)));

  const results = await db
    .select({
      id: smsLogs.id,
      phoneNumber: smsLogs.phoneNumber,
      direction: smsLogs.direction,
      message: smsLogs.message,
      workerId: smsLogs.workerId,
      classification: smsLogs.classification,
      status: smsLogs.status,
      createdAt: smsLogs.createdAt,
    })
    .from(smsLogs)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(smsLogs.createdAt))
    .limit(limit);

  // Attach worker names
  const workerIds = [...new Set(results.map((r) => r.workerId).filter(Boolean))] as string[];
  const workerMap: Record<string, string> = {};
  if (workerIds.length > 0) {
    const workers = await db.select({ id: users.id, fullName: users.fullName }).from(users).where(sql`${users.id} = ANY(${workerIds})`);
    workers.forEach((w) => { workerMap[w.id] = w.fullName; });
  }

  return {
    messages: results.map((r) => ({ ...r, workerName: r.workerId ? workerMap[r.workerId] || "Unknown" : null })),
    count: results.length,
  };
}

async function findAvailableWorkers(input: Record<string, unknown>) {
  const workplaceId = input.workplaceId as string;
  const date = input.date as string;

  // Get all workers assigned to this workplace
  const assignedWorkers = await db
    .select({ workerUserId: workplaceAssignments.workerUserId })
    .from(workplaceAssignments)
    .where(and(eq(workplaceAssignments.workplaceId, workplaceId), eq(workplaceAssignments.status, "active")));

  const assignedIds = assignedWorkers.map((a) => a.workerUserId);
  if (assignedIds.length === 0) {
    return {
      availableWorkers: [],
      count: 0,
      message: `No workers are assigned to workplace ${workplaceId}. Use lookup_workplaces to verify the workplace ID, or check workplace assignments in the admin panel.`,
    };
  }

  // Get workers already scheduled on that date at any workplace
  const busyWorkerRows = await db
    .select({ workerUserId: shifts.workerUserId })
    .from(shifts)
    .where(and(eq(shifts.date, date), sql`${shifts.workerUserId} = ANY(${assignedIds})`, sql`${shifts.status} != 'cancelled'`));

  const busyIds = new Set(busyWorkerRows.map((r) => r.workerUserId).filter(Boolean));
  const availableIds = assignedIds.filter((id) => !busyIds.has(id));

  if (availableIds.length === 0) {
    return {
      availableWorkers: [],
      count: 0,
      message: `All ${assignedIds.length} worker(s) assigned to this workplace are already scheduled on ${date}. Consider checking other dates or sending a shift offer blast to workers not assigned here.`,
    };
  }

  const workers = await db
    .select({ id: users.id, fullName: users.fullName, phone: users.phone, workerRoles: users.workerRoles, isActive: users.isActive })
    .from(users)
    .where(and(sql`${users.id} = ANY(${availableIds})`, eq(users.isActive, true)));

  return { availableWorkers: workers, count: workers.length };
}

async function checkDiscordAlerts(input: Record<string, unknown>) {
  const status = (input.status as string) || "all";
  const type = input.type as string | undefined;
  const limit = (input.limit as number) || 10;

  const conditions: ReturnType<typeof eq>[] = [];
  if (status !== "all") conditions.push(eq(discordAlerts.status, status));
  if (type) conditions.push(eq(discordAlerts.type, type));

  const results = await db
    .select()
    .from(discordAlerts)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(discordAlerts.createdAt))
    .limit(limit);

  return { alerts: results, count: results.length };
}

// ============================================
// Action implementations
// ============================================

async function toolSendSms(input: Record<string, unknown>) {
  const phoneNumber = input.phoneNumber as string;
  const message = input.message as string;
  const workerId = input.workerId as string | undefined;

  const result = await sendSMS(phoneNumber, message);

  await logSMS({
    phoneNumber,
    direction: "outbound",
    message,
    workerId,
    status: result.success ? "sent" : "failed",
    openphoneMessageId: result.messageId,
  });

  return { success: result.success, messageId: result.messageId, error: result.error };
}

async function notifyGmLilee(input: Record<string, unknown>) {
  const message = `[WFConnect] ${input.message as string}`;
  const result = await sendSMS(GM_LILEE_PHONE, message);

  await logSMS({
    phoneNumber: GM_LILEE_PHONE,
    direction: "outbound",
    message,
    status: result.success ? "sent" : "failed",
    openphoneMessageId: result.messageId,
  });

  return { success: result.success, recipient: "GM Lilee", error: result.error };
}

async function toolSendDiscord(input: Record<string, unknown>) {
  const urgencyToColor: Record<string, "red" | "amber" | "blue" | "green"> = {
    urgent: "red",
    warning: "amber",
    info: "blue",
    success: "green",
  };

  const urgency = (input.urgency as string) || "info";
  const color = urgencyToColor[urgency] || "blue";

  const result = await sendDiscordNotification({
    title: input.title as string,
    message: input.message as string,
    color,
    type: input.type as string | undefined,
  });

  return { success: result.success, alertId: result.alertId, error: result.error };
}

async function sendWorkerInternalMessage(input: Record<string, unknown>, callerUserId?: string) {
  const workerId = input.workerId as string;
  const messageBody = input.message as string;
  const senderUserId = (input.senderUserId as string) || callerUserId;

  if (!senderUserId) return { success: false, error: "senderUserId required" };

  try {
    // Find or create conversation
    let [conversation] = await db
      .select()
      .from(conversations)
      .where(and(eq(conversations.workerUserId, workerId), eq(conversations.isArchived, false)))
      .limit(1);

    if (!conversation) {
      const [newConv] = await db
        .insert(conversations)
        .values({ workerUserId: workerId, hrUserId: senderUserId, lastMessageAt: new Date(), lastMessagePreview: messageBody.slice(0, 100) })
        .returning();
      conversation = newConv;
    }

    await db.insert(messages).values({
      conversationId: conversation.id,
      senderUserId,
      recipientUserId: workerId,
      body: messageBody,
      messageType: "text",
      status: "delivered",
    });

    await db.update(conversations).set({ lastMessageAt: new Date(), lastMessagePreview: messageBody.slice(0, 100) }).where(eq(conversations.id, conversation.id));

    return { success: true, conversationId: conversation.id };
  } catch (err: any) {
    return { success: false, error: err?.message };
  }
}

async function toolCreateShiftRequest(input: Record<string, unknown>) {
  const workplaceId = input.workplaceId as string;
  const date = input.date as string;
  const clientId = input.clientId as string;
  const roleType = input.roleType as string;
  const startTime = input.startTime as string;
  const endTime = input.endTime as string;

  try {
    // Duplicate detection: check if an open shift request already exists for same workplace, date, and time
    const existing = await db
      .select()
      .from(shiftRequests)
      .where(
        and(
          eq(shiftRequests.workplaceId, workplaceId),
          eq(shiftRequests.date, date),
          eq(shiftRequests.startTime, startTime),
          eq(shiftRequests.status, "submitted")
        )
      )
      .limit(1);

    if (existing.length > 0) {
      const dup = existing[0];
      return {
        success: false,
        duplicate: true,
        error: `A shift request already exists for this workplace on ${date} at ${startTime} (Shift ID: ${dup.id}, status: ${dup.status}). To avoid duplicates, use the existing shift or choose a different time.`,
        existingShiftId: dup.id,
      };
    }

    const [newRequest] = await db
      .insert(shiftRequests)
      .values({
        clientId,
        workplaceId,
        roleType,
        date,
        startTime,
        endTime,
        notes: input.notes as string | undefined,
        status: "submitted",
      })
      .returning();

    return { success: true, shiftRequestId: newRequest.id, shiftRequest: newRequest };
  } catch (err: any) {
    const msg = err?.message || "Unknown database error";
    if (msg.includes("foreign key")) {
      return { success: false, error: "Invalid workplace or client ID — they may not exist in the system. Use lookup_workplaces to verify." };
    }
    if (msg.includes("not null") || msg.includes("violates")) {
      return { success: false, error: `Missing required field: ${msg}. Ensure all fields (date, startTime, endTime, workplaceId, clientId, roleType) are provided.` };
    }
    return { success: false, error: `Shift creation failed: ${msg}` };
  }
}

function generateReplitPrompt(input: Record<string, unknown>) {
  const userRequest = input.userRequest as string;
  const whatWasAttempted = input.whatWasAttempted as string | undefined;
  const suggestedSolution = input.suggestedSolution as string;
  const affectedFiles = input.affectedFiles as string | undefined;
  const additionalContext = input.additionalContext as string | undefined;

  const prompt = `# Replit AI Task Request

## What the user wants
${userRequest}

## Background / Context
This is the WFConnect workforce management app. It has:
- Express.js backend (TypeScript) in \`server/\`
- React Native (Expo) frontend in \`client/\`
- PostgreSQL database with Drizzle ORM, schema in \`shared/schema.ts\`
- Clawd AI multi-agent system in \`server/services/clawd/\`
- OpenPhone SMS integration in \`server/services/openphone.ts\`
- Discord notifications in \`server/services/discord.ts\`
${additionalContext ? `\n## Additional Context\n${additionalContext}` : ""}
${whatWasAttempted ? `\n## What was already attempted\n${whatWasAttempted}` : ""}

## Suggested solution
${suggestedSolution}

${affectedFiles ? `## Files likely to be affected\n${affectedFiles.split(",").map((f) => `- ${f.trim()}`).join("\n")}` : ""}

## Instructions
Please implement the above. Follow existing code patterns and conventions in the codebase. After implementing, restart the backend workflow to apply changes.`;

  return { prompt, isReplitAiPrompt: true };
}
