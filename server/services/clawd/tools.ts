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
import { getGuildMembers } from "../discord-bot";
import { createCalendarEvent, listCalendarEvents } from "../google-calendar";
import { sendGmail, readRecentGmailEmails } from "../google-gmail";
import * as crmClient from "../weekdays-crm";
import { enqueueCrmPush } from "../crm-sync";

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
    description: "Send a notification to the Discord channel for the team. Use for important operational events that the team should be aware of. Include context IDs when available so replies can link back to the relevant worker/client/workplace/shift.",
    input_schema: {
      type: "object" as const,
      properties: {
        title: { type: "string", description: "The notification title" },
        message: { type: "string", description: "The notification body" },
        urgency: { type: "string", description: "Urgency level: urgent (red), warning (amber), info (blue), success (green)" },
        type: { type: "string", description: "Alert type: sick_call, client_request, urgent_shift, auto_coverage, general" },
        workerId: { type: "number", description: "The worker user ID related to this alert (if applicable)" },
        clientId: { type: "number", description: "The client user ID related to this alert (if applicable)" },
        workplaceId: { type: "number", description: "The workplace ID related to this alert (if applicable)" },
        shiftId: { type: "number", description: "The shift ID related to this alert (if applicable)" },
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
    name: "lookup_discord_members",
    description: "Look up members of the WFConnect Discord server. Use to find who is in the Discord channel, check team availability, or identify Discord users.",
    input_schema: {
      type: "object" as const,
      properties: {
        query: { type: "string", description: "Name or partial name to search for (optional — omit to list all members)" },
        limit: { type: "number", description: "Max results to return (default 50, max 200)" },
      },
    },
  },
  {
    name: "create_workplace",
    description: "Create a new workplace/location in the system. This CREATES a real workplace record in the database. The address is automatically geocoded to get latitude/longitude coordinates for GPS verification.",
    input_schema: {
      type: "object" as const,
      properties: {
        name: { type: "string", description: "The workplace name (e.g. 'Four Points Oakville')" },
        address: { type: "string", description: "Street address (e.g. '1340 Speers Rd')" },
        city: { type: "string", description: "City (e.g. 'Oakville')" },
        province: { type: "string", description: "Province/state (e.g. 'Ontario' or 'ON')" },
        postalCode: { type: "string", description: "Postal code (e.g. 'L6L 5V3')" },
        country: { type: "string", description: "Country (default: Canada)" },
        geofenceRadiusMeters: { type: "number", description: "Geofence radius in meters for TITO (default: 150)" },
      },
      required: ["name", "address", "city", "province", "postalCode"],
    },
  },
  {
    name: "update_workplace",
    description: "Update an existing workplace's details. Only provide fields you want to change. If address fields change, coordinates will be re-geocoded automatically.",
    input_schema: {
      type: "object" as const,
      properties: {
        workplaceId: { type: "string", description: "The workplace ID to update (use lookup_workplaces to find it)" },
        name: { type: "string", description: "New name (optional)" },
        address: { type: "string", description: "New street address (optional)" },
        city: { type: "string", description: "New city (optional)" },
        province: { type: "string", description: "New province (optional)" },
        postalCode: { type: "string", description: "New postal code (optional)" },
        country: { type: "string", description: "New country (optional)" },
        geofenceRadiusMeters: { type: "number", description: "New geofence radius in meters (optional)" },
        isActive: { type: "boolean", description: "Set active/inactive status (optional)" },
      },
      required: ["workplaceId"],
    },
  },
  {
    name: "create_calendar_event",
    description: "Create an event in Google Calendar. Use for scheduling shift briefings, client meetings, availability blocks, or reminders.",
    input_schema: {
      type: "object" as const,
      properties: {
        summary: { type: "string", description: "Event title/name (e.g. 'Shift Briefing — Oakville')" },
        startDateTime: { type: "string", description: "Start time in ISO format (e.g. 2026-03-15T10:00:00-05:00)" },
        endDateTime: { type: "string", description: "End time in ISO format" },
        description: { type: "string", description: "Event description (optional)" },
        attendees: { type: "array", items: { type: "string" }, description: "Email addresses of attendees (optional)" },
      },
      required: ["summary", "startDateTime", "endDateTime"],
    },
  },
  {
    name: "list_calendar_events",
    description: "List upcoming Google Calendar events. Use to check schedule, availability, and planned operations.",
    input_schema: {
      type: "object" as const,
      properties: {
        maxResults: { type: "number", description: "Max events to return (default: 10)" },
        timeMin: { type: "string", description: "Start time in ISO format (optional, default: now)" },
      },
    },
  },
  {
    name: "send_email_gmail",
    description: "Send an email via Gmail. Use for worker approvals, shift confirmations, payroll notifications, or client communication.",
    input_schema: {
      type: "object" as const,
      properties: {
        to: { type: "string", description: "Recipient email address" },
        subject: { type: "string", description: "Email subject line" },
        body: { type: "string", description: "Email body/message" },
        isHtml: { type: "boolean", description: "Whether body is HTML (default: false)" },
      },
      required: ["to", "subject", "body"],
    },
  },
  {
    name: "read_recent_emails",
    description: "Read recent emails from Gmail inbox. Use to check for worker/client replies, process requests, or monitor important messages.",
    input_schema: {
      type: "object" as const,
      properties: {
        maxResults: { type: "number", description: "Max emails to fetch (default: 10)" },
        query: { type: "string", description: "Gmail query (e.g. 'is:unread', 'from:worker@gmail.com'). Default: unread emails" },
      },
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
  {
    name: "lookup_crm_workplaces",
    description: "Search the Weekdays CRM for workplaces. Returns CRM-side data including CRM IDs, addresses, and sync status. Use this to check what the CRM knows about a workplace.",
    input_schema: {
      type: "object",
      properties: {
        searchTerm: { type: "string", description: "Name or location to search for" },
        limit: { type: "number", description: "Max results (default 20)" },
      },
    },
  },
  {
    name: "lookup_crm_shifts",
    description: "Search the Weekdays CRM for confirmed shifts. Returns CRM-side shift data including worker assignments, dates, and status.",
    input_schema: {
      type: "object",
      properties: {
        workplaceName: { type: "string", description: "Filter by workplace/hotel name" },
        workerName: { type: "string", description: "Filter by worker name" },
        dateFrom: { type: "string", description: "Start date filter (YYYY-MM-DD)" },
        dateTo: { type: "string", description: "End date filter (YYYY-MM-DD)" },
        limit: { type: "number", description: "Max results (default 20)" },
      },
    },
  },
  {
    name: "lookup_crm_hotel_requests",
    description: "Search the Weekdays CRM for hotel/staffing requests. Returns CRM-side request data including hotel name, role needed, dates, and status.",
    input_schema: {
      type: "object",
      properties: {
        hotelName: { type: "string", description: "Filter by hotel name" },
        status: { type: "string", description: "Filter by status: NEW or CONFIRMED" },
        limit: { type: "number", description: "Max results (default 20)" },
      },
    },
  },
  {
    name: "create_crm_hotel_request",
    description: "Create a new hotel/staffing request in the Weekdays CRM. This pushes a request directly to the CRM system for tracking.",
    input_schema: {
      type: "object",
      properties: {
        hotelName: { type: "string", description: "Name of the hotel/client requesting staff" },
        roleNeeded: { type: "string", description: "Role needed (e.g., 'Housekeeper', 'Room Attendant')" },
        location: { type: "string", description: "City or area" },
        address: { type: "string", description: "Full address of the hotel" },
        quantityNeeded: { type: "number", description: "Number of workers needed (default 1)" },
        shiftStartAt: { type: "string", description: "Shift start datetime (ISO format)" },
        shiftEndAt: { type: "string", description: "Shift end datetime (ISO format)" },
        payRate: { type: "number", description: "Hourly pay rate" },
        notes: { type: "string", description: "Additional notes" },
      },
      required: ["hotelName", "roleNeeded", "shiftStartAt", "shiftEndAt"],
    },
  },
  {
    name: "update_crm_hotel_request",
    description: "Update an existing hotel/staffing request in the Weekdays CRM. Use lookup_crm_hotel_requests first to get the CRM ID.",
    input_schema: {
      type: "object",
      properties: {
        crmId: { type: "string", description: "CRM ID of the hotel request to update" },
        hotelName: { type: "string", description: "Updated hotel name" },
        roleNeeded: { type: "string", description: "Updated role" },
        quantityNeeded: { type: "number", description: "Updated quantity" },
        shiftStartAt: { type: "string", description: "Updated start datetime" },
        shiftEndAt: { type: "string", description: "Updated end datetime" },
        payRate: { type: "number", description: "Updated pay rate" },
        notes: { type: "string", description: "Updated notes" },
        status: { type: "string", description: "Status: NEW or CONFIRMED" },
      },
      required: ["crmId"],
    },
  },
  {
    name: "update_crm_confirmed_shift",
    description: "Update a confirmed shift in the Weekdays CRM. Use lookup_crm_shifts first to get the CRM ID. Can update status, check-in time, completion time.",
    input_schema: {
      type: "object",
      properties: {
        crmId: { type: "string", description: "CRM ID of the confirmed shift to update" },
        confirmStatus: { type: "string", description: "Status: CONFIRMED or COMPLETED" },
        checkedInAt: { type: "string", description: "Check-in datetime (ISO format)" },
        completedAt: { type: "string", description: "Completion datetime (ISO format)" },
        notes: { type: "string", description: "Notes about the shift" },
      },
      required: ["crmId"],
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
    case "create_workplace":
      return toolCreateWorkplace(input);
    case "update_workplace":
      return toolUpdateWorkplace(input);
    case "lookup_discord_members":
      return lookupDiscordMembers(input);
    case "create_calendar_event":
      return (async () => {
        try {
          const r = await createCalendarEvent({
            summary: input.summary as string,
            startDateTime: input.startDateTime as string,
            endDateTime: input.endDateTime as string,
            description: input.description as string | undefined,
            attendees: input.attendees as string[] | undefined,
          });
          return { success: true, ...r };
        } catch (e: any) {
          return { success: false, error: e?.message };
        }
      })();
    case "list_calendar_events":
      return (async () => {
        try {
          const r = await listCalendarEvents(Math.min((input.maxResults as number) || 10, 100), input.timeMin as string | undefined);
          return { success: true, events: r };
        } catch (e: any) {
          return { success: false, error: e?.message };
        }
      })();
    case "send_email_gmail":
      return (async () => {
        try {
          const r = await sendGmail({
            to: input.to as string,
            subject: input.subject as string,
            body: input.body as string,
            isHtml: input.isHtml as boolean | undefined,
          });
          return { success: true, ...r };
        } catch (e: any) {
          return { success: false, error: e?.message };
        }
      })();
    case "read_recent_emails":
      return (async () => {
        try {
          const r = await readRecentGmailEmails(Math.min((input.maxResults as number) || 10, 50), input.query as string | undefined);
          return { success: true, emails: r };
        } catch (e: any) {
          return { success: false, error: e?.message };
        }
      })();
    case "generate_replit_prompt":
      return generateReplitPrompt(input);
    case "lookup_crm_workplaces":
      return lookupCrmWorkplaces(input);
    case "lookup_crm_shifts":
      return lookupCrmShifts(input);
    case "lookup_crm_hotel_requests":
      return lookupCrmHotelRequests(input);
    case "create_crm_hotel_request":
      return toolCreateCrmHotelRequest(input);
    case "update_crm_hotel_request":
      return toolUpdateCrmHotelRequest(input);
    case "update_crm_confirmed_shift":
      return toolUpdateCrmConfirmedShift(input);
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
    workerId: input.workerId != null ? String(input.workerId) : undefined,
    clientId: input.clientId != null ? String(input.clientId) : undefined,
    workplaceId: input.workplaceId != null ? String(input.workplaceId) : undefined,
    shiftId: input.shiftId != null ? String(input.shiftId) : undefined,
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
          or(
            eq(shiftRequests.startTime, startTime),
            and(
              lte(shiftRequests.startTime, endTime),
              gte(shiftRequests.endTime, startTime)
            )
          ),
          or(
            eq(shiftRequests.status, "submitted"),
            eq(shiftRequests.status, "accepted")
          )
        )
      )
      .limit(3);

    if (existing.length > 0) {
      const dup = existing[0];
      const isExact = dup.startTime === startTime && dup.endTime === endTime;
      return {
        success: false,
        duplicate: true,
        error: isExact
          ? `Exact duplicate: a ${dup.status} shift request already exists for this workplace on ${date} at ${startTime}–${endTime} (ID: ${dup.id}). Use the existing one or cancel it first.`
          : `Overlapping shift: a ${dup.status} shift request exists for this workplace on ${date} at ${dup.startTime}–${dup.endTime} (ID: ${dup.id}). The requested time ${startTime}–${endTime} overlaps. Adjust the time or cancel the existing request.`,
        existingShiftId: dup.id,
        existingShift: { id: dup.id, status: dup.status, startTime: dup.startTime, endTime: dup.endTime },
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
      return { success: false, error: `Invalid workplace ID "${workplaceId}" or client ID "${clientId}" — one or both don't exist in the system. Use lookup_workplaces to find valid IDs.` };
    }
    if (msg.includes("not null") || msg.includes("violates")) {
      const missingFields = [];
      if (!date) missingFields.push("date");
      if (!startTime) missingFields.push("startTime");
      if (!endTime) missingFields.push("endTime");
      if (!workplaceId) missingFields.push("workplaceId");
      if (!clientId) missingFields.push("clientId");
      if (!roleType) missingFields.push("roleType");
      return { success: false, error: missingFields.length > 0
        ? `Missing required fields: ${missingFields.join(", ")}. All six fields are needed to create a shift request.`
        : `Database constraint error: ${msg}` };
    }
    return { success: false, error: `Shift creation failed: ${msg}. Try again or use generate_replit_prompt to escalate.` };
  }
}

async function lookupDiscordMembers(input: Record<string, unknown>) {
  const query = input.query as string | undefined;
  const limit = input.limit as number | undefined;
  const members = await getGuildMembers(query, limit);

  if (members.length === 0) {
    return {
      members: [],
      count: 0,
      message: query
        ? `No Discord members found matching "${query}". The bot may not have the Server Members intent enabled, or the member list hasn't been cached yet.`
        : "No Discord members found. The bot may not be connected or the Server Members intent may not be enabled in the Discord Developer Portal.",
    };
  }

  const nonBotMembers = members.filter(m => !m.isBot);
  return {
    members: nonBotMembers,
    count: nonBotMembers.length,
    botMembers: members.filter(m => m.isBot).length,
    searchedBy: query ? "name" : "all",
  };
}

async function geocodeAddress(address: string, city: string, province: string, postalCode?: string, country?: string): Promise<{ lat: number; lng: number } | null> {
  const parts = [address, city, province, postalCode, country || "Canada"].filter(Boolean);
  const fullAddress = parts.join(", ");
  try {
    const url = new URL("https://nominatim.openstreetmap.org/search");
    url.searchParams.set("q", fullAddress);
    url.searchParams.set("format", "json");
    url.searchParams.set("limit", "1");
    const res = await fetch(url.toString(), {
      headers: { "User-Agent": "WFConnect/1.0" },
    });
    if (!res.ok) {
      console.log(`[tools] Nominatim returned HTTP ${res.status} for "${fullAddress}"`);
      return null;
    }
    const data = await res.json() as Array<{ lat: string; lon: string; display_name: string }>;
    if (data.length > 0) {
      const lat = parseFloat(data[0].lat);
      const lng = parseFloat(data[0].lon);
      console.log(`[tools] Geocoded "${fullAddress}" → ${lat}, ${lng}`);
      return { lat, lng };
    }
    console.log(`[tools] Nominatim returned no results for "${fullAddress}"`);
    return null;
  } catch (err: any) {
    console.error("[tools] Geocoding error:", err?.message);
    return null;
  }
}

async function toolCreateWorkplace(input: Record<string, unknown>) {
  const name = input.name as string;
  const address = input.address as string;
  const city = input.city as string;
  const province = input.province as string;
  const postalCode = input.postalCode as string | undefined;
  const country = (input.country as string) || "Canada";
  const geofenceRadius = input.geofenceRadiusMeters as number | undefined;

  if (!name || !address || !city || !province || !postalCode) {
    const missing = [];
    if (!name) missing.push("name");
    if (!address) missing.push("address");
    if (!city) missing.push("city");
    if (!province) missing.push("province");
    if (!postalCode) missing.push("postalCode");
    return { success: false, error: `Missing required fields: ${missing.join(", ")}` };
  }

  try {
    const existing = await db.select({ id: workplaces.id, name: workplaces.name })
      .from(workplaces)
      .where(ilike(workplaces.name, name))
      .limit(1);
    if (existing.length > 0) {
      return {
        success: false,
        duplicate: true,
        error: `A workplace named "${existing[0].name}" already exists (ID: ${existing[0].id}). Use update_workplace to modify it.`,
        existingWorkplaceId: existing[0].id,
      };
    }

    if (crmClient.isConfigured()) {
      try {
        const crmWorkplaces = await crmClient.getWorkplaces();
        const normalizedName = name.trim().toLowerCase().replace(/\s+/g, " ");
        const crmMatch = crmWorkplaces.find(
          w => w.name.trim().toLowerCase().replace(/\s+/g, " ") === normalizedName
        );
        if (crmMatch) {
          return {
            success: false,
            duplicate: true,
            error: `A workplace named "${crmMatch.name}" already exists in the CRM (CRM ID: ${crmMatch.id}). It may not be in the local DB yet — run /api/admin/workplaces/sync-to-crm or wait for the next sync cycle.`,
          };
        }
      } catch (crmErr: any) {
        console.warn(`[CRM-SYNC] CRM duplicate check failed (proceeding): ${crmErr?.message}`);
      }
    }

    const geo = await geocodeAddress(address, city, province, postalCode, country);

    const [newWorkplace] = await db.insert(workplaces).values({
      name,
      addressLine1: address,
      city,
      province,
      postalCode,
      country,
      latitude: geo?.lat ?? null,
      longitude: geo?.lng ?? null,
      geofenceRadiusMeters: geofenceRadius || 150,
    }).returning();

    let crmSynced = false;
    let crmNote = "";
    if (crmClient.isConfigured()) {
      try {
        const fullAddress = [address, city, province, postalCode].filter(Boolean).join(", ");
        const crmResult = await crmClient.createCrmWorkplace({
          name,
          address: fullAddress,
          location: city,
          province,
          latitude: geo?.lat,
          longitude: geo?.lng,
          isActive: true,
        });
        await db.update(workplaces)
          .set({ crmExternalId: crmResult.id, updatedAt: new Date() })
          .where(eq(workplaces.id, newWorkplace.id));
        crmSynced = true;
        crmNote = `Created in mobile app and CRM (CRM ID: ${crmResult.id}).`;
        console.log(`[CRM-SYNC] Workplace "${name}" linked: local=${newWorkplace.id} → CRM=${crmResult.id}`);
      } catch (crmErr: any) {
        crmNote = `Created in mobile app only — CRM sync pending: ${crmErr?.message}. Use /api/admin/workplaces/sync-to-crm to retry.`;
        console.error(`[CRM-SYNC] Failed to push workplace "${name}" to CRM:`, crmErr?.message);
      }
    } else {
      crmNote = "Created in mobile app only — CRM not configured.";
    }

    const geoNote = geo ? `Coordinates resolved: ${geo.lat}, ${geo.lng}.` : "Address could not be geocoded — coordinates not set.";

    return {
      success: true,
      workplaceId: newWorkplace.id,
      workplace: {
        id: newWorkplace.id,
        name: newWorkplace.name,
        address: newWorkplace.addressLine1,
        city: newWorkplace.city,
        province: newWorkplace.province,
        postalCode: newWorkplace.postalCode,
        latitude: newWorkplace.latitude,
        longitude: newWorkplace.longitude,
        geofenceRadiusMeters: newWorkplace.geofenceRadiusMeters,
      },
      geocoded: !!geo,
      crmSynced,
      note: `${geoNote} ${crmNote}`,
    };
  } catch (err: any) {
    return { success: false, error: `Failed to create workplace: ${err?.message}` };
  }
}

async function toolUpdateWorkplace(input: Record<string, unknown>) {
  const workplaceId = input.workplaceId as string;
  if (!workplaceId) {
    return { success: false, error: "Missing required field: workplaceId. Use lookup_workplaces to find the ID." };
  }

  try {
    const [existing] = await db.select().from(workplaces).where(eq(workplaces.id, workplaceId));
    if (!existing) {
      return { success: false, error: `Workplace "${workplaceId}" not found. Use lookup_workplaces to find valid IDs.` };
    }

    const updates: Record<string, unknown> = { updatedAt: new Date() };
    if (input.name) updates.name = input.name;
    if (input.address) updates.addressLine1 = input.address;
    if (input.city) updates.city = input.city;
    if (input.province) updates.province = input.province;
    if (input.postalCode) updates.postalCode = input.postalCode;
    if (input.country) updates.country = input.country;
    if (input.geofenceRadiusMeters !== undefined) updates.geofenceRadiusMeters = input.geofenceRadiusMeters;
    if (input.isActive !== undefined) updates.isActive = input.isActive;

    const addressChanged = input.address || input.city || input.province || input.postalCode;
    let geocoded = false;
    if (addressChanged) {
      const addr = (input.address as string) || existing.addressLine1 || "";
      const city = (input.city as string) || existing.city || "";
      const prov = (input.province as string) || existing.province || "";
      const postal = (input.postalCode as string) || existing.postalCode || "";
      const country = (input.country as string) || existing.country || "Canada";
      const geo = await geocodeAddress(addr, city, prov, postal, country);
      if (geo) {
        updates.latitude = geo.lat;
        updates.longitude = geo.lng;
        geocoded = true;
      }
    }

    const [updated] = await db.update(workplaces)
      .set(updates)
      .where(eq(workplaces.id, workplaceId))
      .returning();

    let crmSyncNote = "";
    if (updated.crmExternalId && crmClient.isConfigured()) {
      try {
        const crmUpdates: crmClient.UpdateCrmWorkplaceInput = {};
        if (input.name) crmUpdates.name = input.name as string;
        if (addressChanged) {
          const fullAddress = [
            updated.addressLine1, updated.city, updated.province, updated.postalCode,
          ].filter(Boolean).join(", ");
          crmUpdates.address = fullAddress;
          crmUpdates.location = updated.city || undefined;
          crmUpdates.province = updated.province || undefined;
        }
        if (geocoded) {
          crmUpdates.latitude = updated.latitude ? Number(updated.latitude) : undefined;
          crmUpdates.longitude = updated.longitude ? Number(updated.longitude) : undefined;
        }
        if (input.isActive !== undefined) crmUpdates.isActive = input.isActive as boolean;

        const hasUpdates = Object.values(crmUpdates).some(v => v !== undefined);
        if (hasUpdates) {
          await crmClient.updateCrmWorkplace(updated.crmExternalId, crmUpdates);
          crmSyncNote = " CRM record updated.";
          console.log(`[CRM-SYNC] Workplace "${updated.name}" synced to CRM (${updated.crmExternalId})`);
        }
      } catch (crmErr: any) {
        crmSyncNote = ` CRM sync failed: ${crmErr?.message}.`;
        console.error(`[CRM-SYNC] Failed to update workplace "${updated.name}" in CRM:`, crmErr?.message);
      }
    }

    const baseNote = addressChanged
      ? (geocoded ? `Coordinates updated: ${updated.latitude}, ${updated.longitude}.` : "Address changed but geocoding failed — coordinates not updated.")
      : "Updated successfully.";

    return {
      success: true,
      workplace: {
        id: updated.id,
        name: updated.name,
        address: updated.addressLine1,
        city: updated.city,
        province: updated.province,
        postalCode: updated.postalCode,
        latitude: updated.latitude,
        longitude: updated.longitude,
        geofenceRadiusMeters: updated.geofenceRadiusMeters,
        isActive: updated.isActive,
      },
      geocoded,
      note: baseNote + crmSyncNote,
    };
  } catch (err: any) {
    return { success: false, error: `Failed to update workplace: ${err?.message}` };
  }
}

async function lookupCrmWorkplaces(input: Record<string, unknown>) {
  if (!crmClient.isConfigured()) {
    return { success: false, error: "CRM is not configured. WEEKDAYS_API_KEY and WEEKDAYS_TEAM_ID are required." };
  }
  try {
    const crmAll = await crmClient.getWorkplaces();
    const localAll = await db.select({ id: workplaces.id, crmExternalId: workplaces.crmExternalId }).from(workplaces);
    const localByCrmId = new Map(localAll.filter(w => w.crmExternalId).map(w => [w.crmExternalId!, w]));

    let results = crmAll;
    const searchTerm = (input.searchTerm as string)?.toLowerCase();
    if (searchTerm) {
      results = results.filter(w =>
        w.name.toLowerCase().includes(searchTerm) ||
        (w.location || "").toLowerCase().includes(searchTerm) ||
        (w.address || "").toLowerCase().includes(searchTerm)
      );
    }
    const limit = Math.min((input.limit as number) || 20, 50);
    return {
      success: true,
      count: results.length,
      workplaces: results.slice(0, limit).map(w => ({
        crmId: w.id,
        name: w.name,
        address: w.address,
        location: w.location,
        province: w.province,
        isActive: w.isActive,
        latitude: w.latitude,
        longitude: w.longitude,
        localMatch: localByCrmId.has(w.id),
        missingLocally: !localByCrmId.has(w.id),
      })),
    };
  } catch (err: any) {
    return { success: false, error: `CRM lookup failed: ${err?.message}` };
  }
}

async function lookupCrmShifts(input: Record<string, unknown>) {
  if (!crmClient.isConfigured()) {
    return { success: false, error: "CRM is not configured." };
  }
  try {
    const allShifts = await crmClient.getConfirmedShifts();
    let results = allShifts;
    const workplaceName = (input.workplaceName as string)?.toLowerCase();
    const workerName = (input.workerName as string)?.toLowerCase();
    const dateFrom = input.dateFrom as string;
    const dateTo = input.dateTo as string;

    if (workplaceName) {
      results = results.filter(s =>
        (s.request?.hotelName || "").toLowerCase().includes(workplaceName)
      );
    }
    if (workerName) {
      results = results.filter(s =>
        (s.quoContactNameSnapshot || "").toLowerCase().includes(workerName)
      );
    }
    if (dateFrom) {
      results = results.filter(s => s.scheduledStartAt >= dateFrom);
    }
    if (dateTo) {
      results = results.filter(s => s.scheduledStartAt <= dateTo);
    }

    const limit = Math.min((input.limit as number) || 20, 50);
    return {
      success: true,
      count: results.length,
      shifts: results.slice(0, limit).map(s => ({
        crmId: s.id,
        hotelName: s.request?.hotelName || "",
        roleNeeded: s.request?.roleNeeded || "",
        location: s.request?.location || "",
        workerContact: s.quoContactNameSnapshot || "",
        scheduledStart: s.scheduledStartAt,
        scheduledEnd: s.scheduledEndAt,
        confirmStatus: s.confirmStatus,
        confirmedAt: s.confirmedAt,
        checkedInAt: s.checkedInAt,
        completedAt: s.completedAt,
      })),
    };
  } catch (err: any) {
    return { success: false, error: `CRM lookup failed: ${err?.message}` };
  }
}

async function lookupCrmHotelRequests(input: Record<string, unknown>) {
  if (!crmClient.isConfigured()) {
    return { success: false, error: "CRM is not configured." };
  }
  try {
    const allRequests = await crmClient.getHotelRequests();
    let results = allRequests;
    const hotelName = (input.hotelName as string)?.toLowerCase();
    const status = (input.status as string)?.toUpperCase();

    if (hotelName) {
      results = results.filter(r =>
        (r.hotelName || "").toLowerCase().includes(hotelName)
      );
    }
    if (status) {
      results = results.filter(r => r.status === status);
    }

    const limit = Math.min((input.limit as number) || 20, 50);
    return {
      success: true,
      count: results.length,
      hotelRequests: results.slice(0, limit).map(r => ({
        crmId: r.id,
        hotelName: r.hotelName,
        roleNeeded: r.roleNeeded,
        quantityNeeded: r.quantityNeeded,
        shiftStartAt: r.shiftStartAt,
        shiftEndAt: r.shiftEndAt,
        payRate: r.payRate,
        status: r.status,
        notes: r.notes,
      })),
    };
  } catch (err: any) {
    return { success: false, error: `CRM lookup failed: ${err?.message}` };
  }
}

async function toolCreateCrmHotelRequest(input: Record<string, unknown>) {
  if (!crmClient.isConfigured()) {
    return { success: false, error: "CRM is not configured." };
  }
  const hotelName = input.hotelName as string;
  const roleNeeded = input.roleNeeded as string;
  const shiftStartAt = input.shiftStartAt as string;
  const shiftEndAt = input.shiftEndAt as string;
  if (!hotelName || !roleNeeded || !shiftStartAt || !shiftEndAt) {
    return { success: false, error: "Missing required fields: hotelName, roleNeeded, shiftStartAt, shiftEndAt" };
  }

  try {
    const result = await crmClient.createCrmHotelRequest({
      hotelName,
      roleNeeded,
      location: input.location as string,
      address: input.address as string,
      quantityNeeded: input.quantityNeeded as number,
      shiftStartAt,
      shiftEndAt,
      payRate: input.payRate as number,
      notes: input.notes as string,
    });
    return {
      success: true,
      hotelRequest: {
        crmId: result.id,
        hotelName: result.hotelName,
        roleNeeded: result.roleNeeded,
        status: result.status,
      },
      note: `Hotel request created in CRM with ID ${result.id}`,
    };
  } catch (err: any) {
    await enqueueCrmPush("hotel_request", "new", "create", {
      hotelName, roleNeeded, shiftStartAt, shiftEndAt,
      location: input.location, address: input.address,
      quantityNeeded: input.quantityNeeded, payRate: input.payRate, notes: input.notes,
    });
    return { success: false, error: `CRM push failed (queued for retry): ${err?.message}` };
  }
}

async function toolUpdateCrmHotelRequest(input: Record<string, unknown>) {
  if (!crmClient.isConfigured()) {
    return { success: false, error: "CRM is not configured." };
  }
  const crmId = input.crmId as string;
  if (!crmId) {
    return { success: false, error: "Missing required field: crmId. Use lookup_crm_hotel_requests to find the ID." };
  }

  try {
    const updates: crmClient.UpdateCrmHotelRequestInput = {};
    if (input.hotelName) updates.hotelName = input.hotelName as string;
    if (input.roleNeeded) updates.roleNeeded = input.roleNeeded as string;
    if (input.quantityNeeded !== undefined) updates.quantityNeeded = input.quantityNeeded as number;
    if (input.shiftStartAt) updates.shiftStartAt = input.shiftStartAt as string;
    if (input.shiftEndAt) updates.shiftEndAt = input.shiftEndAt as string;
    if (input.payRate !== undefined) updates.payRate = input.payRate as number;
    if (input.notes) updates.notes = input.notes as string;
    if (input.status) updates.status = input.status as "NEW" | "CONFIRMED";

    const result = await crmClient.updateCrmHotelRequest(crmId, updates);
    return {
      success: true,
      hotelRequest: {
        crmId: result.id,
        hotelName: result.hotelName,
        status: result.status,
      },
      note: `Hotel request ${crmId} updated in CRM`,
    };
  } catch (err: any) {
    await enqueueCrmPush("hotel_request", crmId, "update", { crmExternalId: crmId, ...input });
    return { success: false, error: `CRM update failed (queued for retry): ${err?.message}` };
  }
}

async function toolUpdateCrmConfirmedShift(input: Record<string, unknown>) {
  if (!crmClient.isConfigured()) {
    return { success: false, error: "CRM is not configured." };
  }
  const crmId = input.crmId as string;
  if (!crmId) {
    return { success: false, error: "Missing required field: crmId. Use lookup_crm_shifts to find the ID." };
  }

  try {
    const updates: crmClient.UpdateCrmConfirmedShiftInput = {};
    if (input.confirmStatus) updates.confirmStatus = input.confirmStatus as "CONFIRMED" | "COMPLETED";
    if (input.checkedInAt) updates.checkedInAt = input.checkedInAt as string;
    if (input.completedAt) updates.completedAt = input.completedAt as string;
    if (input.notes) updates.notes = input.notes as string;

    const result = await crmClient.updateCrmConfirmedShift(crmId, updates);
    return {
      success: true,
      shift: {
        crmId: result.id,
        confirmStatus: result.confirmStatus,
      },
      note: `Confirmed shift ${crmId} updated in CRM`,
    };
  } catch (err: any) {
    await enqueueCrmPush("confirmed_shift", crmId, "update", { crmExternalId: crmId, ...input });
    return { success: false, error: `CRM update failed (queued for retry): ${err?.message}` };
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
