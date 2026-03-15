import { Client, GatewayIntentBits, type Message } from "discord.js";
import { db } from "../db";
import { discordAlerts, discordActionLogs, appConfig } from "../../shared/schema";
import { eq, desc } from "drizzle-orm";
import { executeDiscordAction, type DiscordActionContext } from "./discord-actions";

let botClient: Client | null = null;

export function getDiscordBot(): Client | null {
  return botClient;
}

const INTENT_PATTERNS: { intent: string; patterns: RegExp[]; extractArgs?: (msg: string) => Record<string, string> }[] = [
  {
    intent: "acknowledge",
    patterns: [
      /^\s*(ack|acknowledged?|got\s*it|noted|roger|copy)\s*$/i,
      /\back\s+(WFC-[A-Z0-9]+)/i,
    ],
  },
  {
    intent: "assign_worker",
    patterns: [
      /\b(assign|send|put|give|book)\s+(\w[\w\s]*?)$/i,
      /\bassign\s+(\w+)/i,
      /\bsend\s+(\w+)\s*(to|for|there)?\s*$/i,
    ],
    extractArgs: (msg: string) => {
      const m = msg.match(/\b(?:assign|send|put|give|book)\s+(.+?)(?:\s+(?:to|for|there))?$/i);
      return m ? { workerQuery: m[1].trim() } : {};
    },
  },
  {
    intent: "list_available",
    patterns: [
      /\bwho\s+is\s+available/i,
      /\bwho\s*(?:'s|is)\s*available/i,
      /\bavailable\s+workers?\b/i,
      /\blist\s+available\b/i,
      /\bwho\s+can\s+cover/i,
      /\bwho\s+can\s+work/i,
      /\boptions\b/i,
    ],
  },
  {
    intent: "resend_sms",
    patterns: [
      /\bresend\s+(sms|text|message)/i,
      /\bsend\s+again\b/i,
      /\bretry\s+(sms|text|alert)\b/i,
    ],
  },
  {
    intent: "notify_gm_lilee",
    patterns: [
      /\bnotify\s+(?:gm\s+)?lilee\b/i,
      /\b(?:resend|send)\s+to\s+(?:gm\s+)?lilee\b/i,
      /\blilee\b/i,
      /\bnotify\s+gm\b/i,
      /\balert\s+(?:gm\s+)?lilee\b/i,
    ],
  },
  {
    intent: "notify_client",
    patterns: [
      /\bnotify\s+(?:the\s+)?client\b/i,
      /\bmessage\s+(?:the\s+)?client\b/i,
      /\btell\s+(?:the\s+)?client\b/i,
      /\bupdate\s+(?:the\s+)?client\b/i,
    ],
  },
  {
    intent: "mark_resolved",
    patterns: [
      /\bmark\s+resolved\b/i,
      /\bresolve(?:d)?\s*$/i,
      /\bclose\s+(?:this|it|alert|issue)\b/i,
      /\bdone\s*$/i,
      /\bcovered\s*$/i,
      /\bhandled\s*$/i,
    ],
  },
  {
    intent: "mark_unresolved",
    patterns: [
      /\bmark\s+unresolved\b/i,
      /\breopen\b/i,
      /\bnot\s+resolved\b/i,
      /\bno\s+coverage\s+found\b/i,
    ],
  },
  {
    intent: "escalate",
    patterns: [
      /\bescalate\b/i,
      /\burgent\b/i,
      /\bneed\s+help\b/i,
    ],
  },
  {
    intent: "summarize",
    patterns: [
      /\bsummar(?:y|ize)\b/i,
      /\bwhat\s+(?:happened|is\s+this|site|shift)\b/i,
      /\bdetails?\b/i,
      /\bcontext\b/i,
      /\bwho\s+called\s+off\b/i,
    ],
  },
  {
    intent: "help",
    patterns: [
      /\bhelp\b/i,
      /\bcommands?\b/i,
      /\bwhat\s+can\s+(?:you|i)\b/i,
    ],
  },
];

interface ParsedCommand {
  intent: string;
  args: Record<string, string>;
  alertId: string | null;
  alertContext: typeof discordAlerts.$inferSelect | null;
  raw: string;
}

function parseSlashCommand(content: string): { intent: string; args: Record<string, string> } | null {
  const m = content.match(/^\/clawd\s+(\w+)\s*(.*)?$/i);
  if (!m) return null;
  const cmd = m[1].toLowerCase();
  const rest = (m[2] || "").trim();

  const cmdMap: Record<string, string> = {
    assign: "assign_worker",
    resolve: "mark_resolved",
    resolved: "mark_resolved",
    unresolve: "mark_unresolved",
    escalate: "escalate",
    whoisavailable: "list_available",
    available: "list_available",
    options: "list_available",
    summary: "summarize",
    summarize: "summarize",
    help: "help",
    ack: "acknowledge",
    notify: "notify_client",
    notifyclient: "notify_client",
    notifylilee: "notify_gm_lilee",
    lilee: "notify_gm_lilee",
    resend: "resend_sms",
  };

  const intent = cmdMap[cmd];
  if (!intent) return null;

  const args: Record<string, string> = {};
  if (intent === "assign_worker" && rest) {
    args.workerQuery = rest;
  }

  return { intent, args };
}

function parseNaturalLanguage(content: string): { intent: string; args: Record<string, string> } | null {
  for (const { intent, patterns, extractArgs } of INTENT_PATTERNS) {
    for (const pattern of patterns) {
      if (pattern.test(content)) {
        const args = extractArgs ? extractArgs(content) : {};
        return { intent, args };
      }
    }
  }
  return null;
}

async function getAuthorizedUserIds(): Promise<Set<string>> {
  try {
    const [row] = await db.select().from(appConfig).where(eq(appConfig.key, "discord_authorized_users"));
    if (!row?.value) return new Set();
    return new Set(row.value.split(",").map(id => id.trim()).filter(Boolean));
  } catch {
    return new Set();
  }
}

async function isOpenToAll(): Promise<boolean> {
  try {
    const [row] = await db.select().from(appConfig).where(eq(appConfig.key, "discord_open_to_all"));
    return row?.value === "true";
  } catch {
    return false;
  }
}

async function findAlertByDiscordMessageId(messageId: string): Promise<typeof discordAlerts.$inferSelect | null> {
  try {
    const [alert] = await db.select().from(discordAlerts)
      .where(eq(discordAlerts.discordMessageId, messageId));
    return alert || null;
  } catch {
    return null;
  }
}

async function findAlertByAlertId(alertId: string): Promise<typeof discordAlerts.$inferSelect | null> {
  try {
    const [alert] = await db.select().from(discordAlerts)
      .where(eq(discordAlerts.alertId, alertId));
    return alert || null;
  } catch {
    return null;
  }
}

async function findRecentAlert(): Promise<typeof discordAlerts.$inferSelect | null> {
  try {
    const [alert] = await db.select().from(discordAlerts)
      .orderBy(desc(discordAlerts.createdAt))
      .limit(1);
    return alert || null;
  } catch {
    return null;
  }
}

async function parseCommand(message: Message): Promise<ParsedCommand> {
  const content = message.content.trim();
  const result: ParsedCommand = {
    intent: "unknown",
    args: {},
    alertId: null,
    alertContext: null,
    raw: content,
  };

  const slashParsed = parseSlashCommand(content);
  if (slashParsed) {
    result.intent = slashParsed.intent;
    result.args = slashParsed.args;
  } else {
    const nlParsed = parseNaturalLanguage(content);
    if (nlParsed) {
      result.intent = nlParsed.intent;
      result.args = nlParsed.args;
    }
  }

  if (message.reference?.messageId) {
    const alert = await findAlertByDiscordMessageId(message.reference.messageId);
    if (alert) {
      result.alertId = alert.alertId;
      result.alertContext = alert;
    }
  }

  if (!result.alertContext) {
    const alertIdMatch = content.match(/WFC-[A-Z0-9]+/i);
    if (alertIdMatch) {
      const alert = await findAlertByAlertId(alertIdMatch[0].toUpperCase());
      if (alert) {
        result.alertId = alert.alertId;
        result.alertContext = alert;
      }
    }
  }

  const contextFreeIntents = new Set(["help", "unknown", "list_available", "notify_gm_lilee"]);
  if (!result.alertContext && !contextFreeIntents.has(result.intent)) {
    // No alert context found — do NOT fall back to recent alert for state-changing actions.
    // Only explicit reply-to-message or WFC-XXXX ID should link to an alert.
  }

  return result;
}

const HELP_MESSAGE = `**Oscar — WFConnect AI Assistant**

**Reply to any alert** with:
- \`assign [name]\` — Assign a worker to cover
- \`who is available?\` — List available workers
- \`mark resolved\` / \`done\` — Close the alert
- \`escalate\` — Flag as urgent + notify GM
- \`notify client\` — Send update to the client
- \`notify lilee\` / \`lilee\` — Alert GM Lilee
- \`resend sms\` — Resend the SMS alert
- \`summary\` / \`details\` — Get alert context
- \`ack\` / \`acknowledged\` — Acknowledge alert

**Slash-style commands:**
\`/clawd assign Nino\`
\`/clawd resolve\`
\`/clawd whoisavailable\`
\`/clawd help\`

Reply to an alert message for context-linked actions.`;

async function logAction(
  alertId: string | null,
  discordUserId: string,
  discordUsername: string,
  actionType: string,
  rawMessage: string,
  parsedIntent: string,
  result: string,
  success: boolean,
  failureReason?: string,
) {
  try {
    await db.insert(discordActionLogs).values({
      alertId,
      discordUserId,
      discordUsername,
      actionType,
      rawMessage,
      parsedIntent,
      result,
      success,
      failureReason: failureReason || null,
    });
  } catch (err: any) {
    console.error("[DISCORD BOT] Failed to log action:", err?.message);
  }
}

async function handleMessage(message: Message) {
  if (message.author.bot) return;
  if (!message.content.trim()) return;

  const content = message.content.trim();
  const isClawdCommand = content.startsWith("/clawd") || !!message.reference?.messageId;

  const hasAlertId = /WFC-[A-Z0-9]+/i.test(content);
  const hasKnownCommand = INTENT_PATTERNS.some(ip => ip.patterns.some(p => p.test(content)));

  if (!isClawdCommand && !hasAlertId && !hasKnownCommand) return;

  const openToAll = await isOpenToAll();
  if (!openToAll) {
    const authorizedIds = await getAuthorizedUserIds();
    if (authorizedIds.size === 0 || !authorizedIds.has(message.author.id)) {
      await message.reply("Not authorized to use Oscar. Contact an admin to add your Discord user ID in System Settings, or ask them to enable open access for all channel members.");
      await logAction(null, message.author.id, message.author.username, "unauthorized", content, "unauthorized", "rejected", false, authorizedIds.size === 0 ? "No authorized users configured" : "User not in authorized list");
      return;
    }
  }

  const parsed = await parseCommand(message);

  if (parsed.intent === "help") {
    await message.reply(HELP_MESSAGE);
    await logAction(null, message.author.id, message.author.username, "help", content, "help", "help sent", true);
    return;
  }

  if (parsed.intent === "unknown") {
    await message.reply("I didn't understand that command. Reply `/clawd help` to see what Oscar can do.");
    await logAction(null, message.author.id, message.author.username, "unknown", content, "unknown", "unrecognized", false, "No matching intent");
    return;
  }

  const actionContext: DiscordActionContext = {
    intent: parsed.intent,
    args: parsed.args,
    alertId: parsed.alertId,
    alert: parsed.alertContext,
    discordUserId: message.author.id,
    discordUsername: message.author.username,
    rawMessage: content,
  };

  try {
    const result = await executeDiscordAction(actionContext);

    await message.reply(result.message);

    await logAction(
      parsed.alertId,
      message.author.id,
      message.author.username,
      parsed.intent,
      content,
      parsed.intent,
      result.message.slice(0, 500),
      result.success,
      result.success ? undefined : result.message,
    );
  } catch (err: any) {
    const errorMsg = `**Understood:** ${parsed.intent}\n**Blocked:** ${err?.message || "Unknown error"}\n**Fallback:** No action taken\n**Still needed:** Manual intervention required`;
    await message.reply(errorMsg);
    await logAction(parsed.alertId, message.author.id, message.author.username, parsed.intent, content, parsed.intent, err?.message || "error", false, err?.message);
  }
}

export async function startDiscordBot(): Promise<boolean> {
  const token = process.env.DISCORD_BOT_TOKEN;
  if (!token) {
    console.log("[DISCORD BOT] No DISCORD_BOT_TOKEN set, skipping bot startup");
    return false;
  }

  try {
    const client = new Client({
      intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
      ],
    });

    client.on("ready", () => {
      console.log(`[DISCORD BOT] Logged in as ${client.user?.tag}`);
    });

    client.on("messageCreate", handleMessage);

    client.on("error", (error) => {
      console.error("[DISCORD BOT] Client error:", error.message);
    });

    await client.login(token);
    botClient = client;
    console.log("[DISCORD BOT] Bot started successfully");
    return true;
  } catch (err: any) {
    console.error("[DISCORD BOT] Failed to start:", err?.message);
    return false;
  }
}

export { parseSlashCommand, parseNaturalLanguage, INTENT_PATTERNS };
