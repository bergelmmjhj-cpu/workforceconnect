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
    const url = `https://${hostname}/api/connectors/get?connector_names=google-mail`;
    const res = await fetch(url, {
      headers: { "X-Replit-Token": xReplitToken },
    });

    if (!res.ok) {
      throw new Error(`Connector API error: ${res.statusText}`);
    }

    const data: any = await res.json();
    const connection = data?.connections?.[0];
    if (!connection) {
      throw new Error("No Gmail connection found");
    }

    const credentials = connection.settings?.oauth?.credentials || connection.settings;
    const accessToken = credentials?.access_token;
    if (!accessToken) {
      throw new Error("No access token in Gmail credentials");
    }

    cachedAccessToken = accessToken;
    cachedExpiresAt = Date.now() + (3500 * 1000);
    return accessToken;
  } catch (err: any) {
    console.error("[GOOGLE-GMAIL] Token fetch error:", err?.message);
    throw err;
  }
}

export async function getUncachableGmailClient() {
  const accessToken = await getAccessToken();
  const oauth2Client = new google.auth.OAuth2();
  oauth2Client.setCredentials({ access_token: accessToken });
  return google.gmail({ version: "v1", auth: oauth2Client });
}

export interface SendGmailInput {
  to: string;
  subject: string;
  body: string;
  isHtml?: boolean;
}

export async function sendGmail(input: SendGmailInput): Promise<{ messageId: string; success: boolean }> {
  try {
    const gmail = await getUncachableGmailClient();

    const contentType = input.isHtml ? "text/html" : "text/plain";
    const message = [
      `To: ${input.to}`,
      `Subject: ${input.subject}`,
      `Content-Type: ${contentType}; charset=utf-8`,
      "",
      input.body,
    ].join("\n");

    const encodedMessage = Buffer.from(message)
      .toString("base64")
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=/g, "");

    const res = await gmail.users.messages.send({
      userId: "me",
      requestBody: { raw: encodedMessage },
    });

    console.log(`[GOOGLE-GMAIL] Email sent to ${input.to} — ${input.subject}`);
    return {
      messageId: res.data.id || "",
      success: true,
    };
  } catch (err: any) {
    console.error("[GOOGLE-GMAIL] Send email failed:", err?.message);
    throw err;
  }
}

export interface GmailEmailResult {
  id: string;
  from: string;
  subject: string;
  snippet: string;
  date: string;
}

export async function readRecentGmailEmails(maxResults: number = 10, query?: string): Promise<GmailEmailResult[]> {
  try {
    const gmail = await getUncachableGmailClient();

    const listRes = await gmail.users.messages.list({
      userId: "me",
      maxResults,
      q: query || "is:unread",
    });

    const messageIds = listRes.data.messages || [];
    if (messageIds.length === 0) {
      console.log("[GOOGLE-GMAIL] No emails found");
      return [];
    }

    const messages = await Promise.all(
      messageIds.map((m: any) =>
        gmail.users.messages.get({
          userId: "me",
          id: m.id,
          format: "metadata",
          metadataHeaders: ["From", "Subject", "Date"],
        })
      )
    );

    const results = messages.map((res: any) => {
      const headers = res.data.payload?.headers || [];
      const from = headers.find((h: any) => h.name === "From")?.value || "Unknown";
      const subject = headers.find((h: any) => h.name === "Subject")?.value || "(No subject)";
      const date = headers.find((h: any) => h.name === "Date")?.value || "";
      return {
        id: res.data.id || "",
        from,
        subject,
        snippet: res.data.snippet || "",
        date,
      };
    });

    console.log(`[GOOGLE-GMAIL] Read ${results.length} emails`);
    return results;
  } catch (err: any) {
    console.error("[GOOGLE-GMAIL] Read emails failed:", err?.message);
    throw err;
  }
}
