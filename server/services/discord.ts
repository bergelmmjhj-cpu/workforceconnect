import { db } from "../db";
import { discordAlerts } from "../../shared/schema";
import { eq } from "drizzle-orm";
import { randomUUID } from "crypto";

const DISCORD_WEBHOOK_URL = process.env.DISCORD_WEBHOOK_URL;

const COLOR_MAP: Record<string, number> = {
  red: 0xEF4444,
  blue: 0x3B82F6,
  green: 0x22C55E,
  amber: 0xF59E0B,
  purple: 0x8B5CF6,
};

interface DiscordField {
  name: string;
  value: string;
  inline?: boolean;
}

interface SendDiscordNotificationOpts {
  title: string;
  message: string;
  color?: "red" | "blue" | "green" | "amber" | "purple";
  fields?: DiscordField[];
  type?: string;
  sourcePhone?: string;
  sourceWorkerId?: string;
  actionsTaken?: string;
}

export async function sendDiscordNotification(opts: SendDiscordNotificationOpts): Promise<{
  success: boolean;
  alertId?: string;
  error?: string;
}> {
  const alertId = `WFC-${Date.now().toString(36).toUpperCase()}`;

  if (!DISCORD_WEBHOOK_URL) {
    console.log("[DISCORD] Webhook URL not configured, skipping notification");
    return { success: false, error: "Webhook URL not configured" };
  }

  try {
    const embed = {
      title: opts.title,
      description: opts.message,
      color: COLOR_MAP[opts.color || "blue"] || COLOR_MAP.blue,
      fields: opts.fields || [],
      footer: { text: `Alert ID: ${alertId} | Reply "ACK ${alertId}" to acknowledge` },
      timestamp: new Date().toISOString(),
    };

    const response = await fetch(DISCORD_WEBHOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        username: "WFConnect Clawd AI",
        embeds: [embed],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[DISCORD] Send failed (${response.status}):`, errorText);
      return { success: false, alertId, error: `HTTP ${response.status}` };
    }

    try {
      await db.insert(discordAlerts).values({
        alertId,
        type: opts.type || "general",
        title: opts.title,
        message: opts.message,
        sourcePhone: opts.sourcePhone || null,
        sourceWorkerId: opts.sourceWorkerId || null,
        status: "pending",
        actionsTaken: opts.actionsTaken || null,
      });
    } catch (dbErr: any) {
      console.error("[DISCORD] Failed to log alert:", dbErr?.message);
    }

    console.log(`[DISCORD] Notification sent: ${opts.title} (${alertId})`);
    return { success: true, alertId };
  } catch (error: any) {
    console.error("[DISCORD] Send error:", error?.message || error);
    return { success: false, alertId, error: error?.message || "Unknown error" };
  }
}

export async function acknowledgeAlert(alertId: string, acknowledgedBy: string, responseNote?: string): Promise<boolean> {
  try {
    const [alert] = await db
      .select()
      .from(discordAlerts)
      .where(eq(discordAlerts.alertId, alertId));

    if (!alert) {
      console.log(`[DISCORD] Alert ${alertId} not found`);
      return false;
    }

    await db
      .update(discordAlerts)
      .set({
        status: "acknowledged",
        acknowledgedBy,
        acknowledgedAt: new Date(),
        responseNote: responseNote || null,
      })
      .where(eq(discordAlerts.alertId, alertId));

    console.log(`[DISCORD] Alert ${alertId} acknowledged by ${acknowledgedBy}`);
    return true;
  } catch (err: any) {
    console.error("[DISCORD] Acknowledge error:", err?.message);
    return false;
  }
}
