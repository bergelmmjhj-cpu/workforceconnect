import { google } from "googleapis";

let cachedAccessToken: string | null = null;
let cachedExpiresAt: number = 0;

async function getAccessToken(): Promise<string> {
  if (cachedAccessToken && Date.now() < cachedExpiresAt) {
    return cachedAccessToken;
  }

  const hostname = process.env.REPLIT_CONNECTORS_HOSTNAME || "connectors.replit.com";
  const xReplitToken = process.env.REPL_IDENTITY
    ? "repl " + process.env.REPL_IDENTITY
    : process.env.WEB_REPL_RENEWAL
    ? "depl " + process.env.WEB_REPL_RENEWAL
    : null;

  if (!xReplitToken) {
    throw new Error("No Replit token available for connector authentication");
  }

  try {
    const url = `https://${hostname}/api/connectors/get?connector_names=google-calendar`;
    const res = await fetch(url, {
      headers: { "X-Replit-Token": xReplitToken },
    });

    if (!res.ok) {
      throw new Error(`Connector API error: ${res.statusText}`);
    }

    const data: any = await res.json();
    const connection = data?.connections?.[0];
    if (!connection) {
      throw new Error("No Google Calendar connection found");
    }

    const credentials = connection.settings?.oauth?.credentials || connection.settings;
    const accessToken = credentials?.access_token;
    if (!accessToken) {
      throw new Error("No access token in Calendar credentials");
    }

    cachedAccessToken = accessToken;
    cachedExpiresAt = Date.now() + (3500 * 1000);
    return accessToken;
  } catch (err: any) {
    console.error("[GOOGLE-CALENDAR] Token fetch error:", err?.message);
    throw err;
  }
}

export async function getUncachableGoogleCalendarClient() {
  const accessToken = await getAccessToken();
  const oauth2Client = new google.auth.OAuth2();
  oauth2Client.setCredentials({ access_token: accessToken });
  return google.calendar({ version: "v3", auth: oauth2Client });
}

export interface CreateEventInput {
  summary: string;
  startDateTime: string;
  endDateTime: string;
  description?: string;
  attendees?: string[];
}

export async function createCalendarEvent(input: CreateEventInput): Promise<{ eventId: string; htmlLink: string }> {
  try {
    const calendar = await getUncachableGoogleCalendarClient();

    const event = {
      summary: input.summary,
      description: input.description || "",
      start: { dateTime: input.startDateTime },
      end: { dateTime: input.endDateTime },
      attendees: (input.attendees || []).map(email => ({ email })),
    };

    const res = await calendar.events.insert({
      calendarId: "primary",
      requestBody: event,
    });

    console.log(`[GOOGLE-CALENDAR] Event created: ${res.data.id} — ${input.summary}`);
    return {
      eventId: res.data.id || "",
      htmlLink: res.data.htmlLink || "",
    };
  } catch (err: any) {
    console.error("[GOOGLE-CALENDAR] Create event failed:", err?.message);
    throw err;
  }
}

export interface CalendarEventResult {
  id: string;
  summary: string;
  start: string;
  end: string;
  htmlLink: string;
}

export async function listCalendarEvents(maxResults: number = 10, timeMin?: string): Promise<CalendarEventResult[]> {
  try {
    const calendar = await getUncachableGoogleCalendarClient();

    const now = new Date();
    const queryTimeMin = timeMin || now.toISOString();

    const res = await calendar.events.list({
      calendarId: "primary",
      timeMin: queryTimeMin,
      singleEvents: true,
      orderBy: "startTime",
      maxResults,
    });

    const events = res.data.items || [];
    const results = events.map((e: any) => ({
      id: e.id || "",
      summary: e.summary || "(No title)",
      start: e.start?.dateTime || e.start?.date || "",
      end: e.end?.dateTime || e.end?.date || "",
      htmlLink: e.htmlLink || "",
    }));

    console.log(`[GOOGLE-CALENDAR] Listed ${results.length} events`);
    return results;
  } catch (err: any) {
    console.error("[GOOGLE-CALENDAR] List events failed:", err?.message);
    throw err;
  }
}
