import { Client, GatewayIntentBits, PresenceUpdateStatus, type Message, type GuildMember } from "discord.js";
import { db } from "../db";
import { discordAlerts, discordActionLogs, appConfig } from "../../shared/schema";
import { eq, desc } from "drizzle-orm";
import { executeDiscordAction, type DiscordActionContext } from "./discord-actions";
import { orchestrate } from "./clawd/orchestrator";

let botClient: Client | null = null;

export function getDiscordBot(): Client | null {
  return botClient;
}

export interface DiscordMemberInfo {
  discordId: string;
  username: string;
  displayName: string;
  roles: string[];
  joinedAt: string | null;
  isBot: boolean;
}

export async function getGuildMembers(query?: string, limit?: number): Promise<DiscordMemberInfo[]> {
  if (!botClient) return [];
  const guild = botClient.guilds.cache.first();
  if (!guild) return [];

  try {
    await guild.members.fetch({ time: 10_000 });
  } catch (err: any) {
    console.warn("[DISCORD BOT] Failed to fetch guild members, using cache:", err?.message);
  }

  let members = Array.from(guild.members.cache.values());

  if (query) {
    const q = query.toLowerCase();
    members = members.filter(m =>
      m.user.username.toLowerCase().includes(q) ||
      m.displayName.toLowerCase().includes(q) ||
      m.nickname?.toLowerCase().includes(q)
    );
  }

  const maxResults = limit && limit > 0 ? Math.min(limit, 200) : 50;

  return members.slice(0, maxResults).map(m => ({
    discordId: m.user.id,
    username: m.user.username,
    displayName: m.displayName,
    roles: m.roles.cache.filter(r => r.name !== "@everyone").map(r => r.name),
    joinedAt: m.joinedAt?.toISOString() || null,
    isBot: m.user.bot,
  }));
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
    if (!row) return true;
    return row.value !== "false";
  } catch {
    return true;
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
  const isMention = botClient?.user ? message.mentions.users.has(botClient.user.id) : false;
  const isClawdCommand = content.startsWith("/clawd") || !!message.reference?.messageId;

  const hasAlertId = /WFC-[A-Z0-9]+/i.test(content);
  const hasKnownCommand = INTENT_PATTERNS.some(ip => ip.patterns.some(p => p.test(content)));

  if (!isClawdCommand && !hasAlertId && !hasKnownCommand && !isMention) return;

  const openToAll = await isOpenToAll();
  if (!openToAll) {
    const authorizedIds = await getAuthorizedUserIds();
    if (authorizedIds.size === 0 || !authorizedIds.has(message.author.id)) {
      await message.reply("Not authorized to use Oscar. Contact an admin to add your Discord user ID in System Settings, or ask them to enable open access for all channel members.");
      await logAction(null, message.author.id, message.author.username, "unauthorized", content, "unauthorized", "rejected", false, authorizedIds.size === 0 ? "No authorized users configured" : "User not in authorized list");
      return;
    }
  }

  if (isMention && !content.startsWith("/clawd")) {
    const cleanContent = content.replace(/<@!?\d+>/g, "").trim();
    if (!cleanContent) {
      await message.reply("Hey! I'm Oscar, WFConnect's AI assistant. Ask me anything — shifts, workers, availability, operations. Or type `/clawd help` for the command list.");
      await logAction(null, message.author.id, message.author.username, "mention_empty", content, "mention", "greeting sent", true);
      return;
    }

    // Short-circuit simple greetings — no API call needed
    const simpleGreetings = /^(hi|hey|hello|yo|sup|test|ping|hiya|heya|howdy|what'?s up)[\s!?.]*$/i;
    if (simpleGreetings.test(cleanContent)) {
      const greeting = `Hey ${message.author.displayName || message.author.username}! I'm Oscar, WFConnect's AI assistant. Ask me anything — shifts, workers, availability, SMS alerts, or daily reports. What can I do for you?`;
      await message.reply(greeting);
      await logAction(null, message.author.id, message.author.username, "mention_greeting", content, "mention", greeting, true);
      return;
    }

    try {
      console.log(`[DISCORD BOT] @mention from ${message.author.username}: "${cleanContent.slice(0, 80)}"`);
      const response = await orchestrate({
        userMessage: cleanContent,
        conversationHistory: [],
        userId: `discord-${message.author.id}`,
        forceActionMode: true,
      });

      const reply = response.response || "I couldn't process that right now. Try `/clawd help` for available commands.";
      await message.reply(reply.slice(0, 2000));
      await logAction(null, message.author.id, message.author.username, "mention_ai", content, "mention_ai", reply.slice(0, 500), true);
    } catch (err: any) {
      console.error("[DISCORD BOT] Clawd AI error on mention:", err?.message);
      await message.reply("Something went wrong processing that. Try again or use `/clawd help` for commands.");
      await logAction(null, message.author.id, message.author.username, "mention_ai", content, "mention_ai", err?.message || "error", false, err?.message);
    }
    return;
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

function setOnlinePresence(client: Client) {
  try {
    client.user?.setPresence({
      status: PresenceUpdateStatus.Online,
      activities: [],
    });
    console.log("[DISCORD BOT] Presence set to online");
  } catch (err: any) {
    console.error("[DISCORD BOT] Failed to set presence:", err?.message);
  }
}

export async function startDiscordBot(): Promise<boolean> {
  if (process.env.DISCORD_BOT_ENABLED === "false") {
    console.log("[DISCORD BOT] DISCORD_BOT_ENABLED=false, skipping bot startup (production-only mode)");
    return false;
  }

  const token = process.env.DISCORD_BOT_TOKEN;
  if (!token) {
    console.log("[DISCORD BOT] No DISCORD_BOT_TOKEN set, skipping bot startup");
    return false;
  }

  const MAX_RETRIES = 3;
  const BASE_DELAY_MS = 5000;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const client = new Client({
        intents: [
          GatewayIntentBits.Guilds,
          GatewayIntentBits.GuildMessages,
          GatewayIntentBits.MessageContent,
          GatewayIntentBits.GuildMembers,
        ],
      });

      client.on("clientReady", () => {
        console.log(`[DISCORD BOT] Logged in as ${client.user?.tag}`);
        setOnlinePresence(client);
      });

      client.on("messageCreate", handleMessage);

      client.on("error", (error) => {
        console.error("[DISCORD BOT] Client error:", error.message);
      });

      client.on("shardDisconnect", (event, shardId) => {
        console.warn(`[DISCORD BOT] Shard ${shardId} disconnected (code ${event.code}). Will auto-reconnect.`);
      });

      client.on("shardReconnecting", (shardId) => {
        console.log(`[DISCORD BOT] Shard ${shardId} reconnecting...`);
      });

      client.on("shardResume", (shardId, replayedEvents) => {
        console.log(`[DISCORD BOT] Shard ${shardId} resumed (replayed ${replayedEvents} events)`);
        setOnlinePresence(client);
      });

      client.on("shardError", (error, shardId) => {
        console.error(`[DISCORD BOT] Shard ${shardId} error:`, error.message);
      });

      await client.login(token);
      botClient = client;
      console.log("[DISCORD BOT] Bot started successfully");
      return true;
    } catch (err: any) {
      const delay = BASE_DELAY_MS * Math.pow(2, attempt - 1);
      console.error(`[DISCORD BOT] Login attempt ${attempt}/${MAX_RETRIES} failed:`, err?.message);
      if (attempt < MAX_RETRIES) {
        console.log(`[DISCORD BOT] Retrying in ${delay / 1000}s...`);
        await new Promise(r => setTimeout(r, delay));
      }
    }
  }

  console.error("[DISCORD BOT] All login attempts failed");
  return false;
}

export { parseSlashCommand, parseNaturalLanguage, INTENT_PATTERNS };
