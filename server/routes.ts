import type { Express, Request, Response } from "express";
import { createServer, type Server } from "node:http";
import { broadcast, getConnectedClientsCount } from "./websocket";
import { db } from "./db";
import { 
  contactLeads, 
  users, 
  registerUserSchema, 
  loginUserSchema, 
  conversations as conversationsTable, 
  messages as messagesTable, 
  messageLogs as messageLogsTable,
  workerApplications,
  insertWorkerApplicationSchema,
  workplaces,
  workplaceAssignments,
  titoLogs,
  timesheets,
  timesheetEntries,
  payrollBatches,
  payrollBatchItems,
  pushTokens,
  paymentProfiles,
  exportAuditLogs,
  shifts,
  shiftRequests,
  insertShiftRequestSchema,
  shiftOffers,
  insertShiftOfferSchema,
  appNotifications,
  insertAppNotificationSchema,
  shiftCheckins,
  insertShiftCheckinSchema,
  sentReminders,
  shiftSeries,
  insertShiftSeriesSchema,
  recurrenceExceptions,
  auditLog,
  userPhotos,
  smsLogs,
  titoCorrections,
} from "../shared/schema";
import type { ShiftRequest, ShiftOffer, AppNotification } from "../shared/schema";
import { getPayPeriodsForYear, getPayPeriod, getCurrentPayPeriod } from "../shared/payPeriods2026";
import bcrypt from "bcryptjs";
import * as OTPAuth from "otpauth";
import crypto from "crypto";
import { eq, and, or, desc, isNull, sql, inArray, ne, gte, lte, not, asc } from "drizzle-orm";
import { sendShiftOfferSMS, sendShiftAssignedSMS, sendConfirmationSMS, sendSMS, logSMS } from "./services/openphone";
import { sendCSVEmail } from "./services/email";

type UserRole = "admin" | "hr" | "client" | "worker";

function haversineDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371e3;
  const phi1 = (lat1 * Math.PI) / 180;
  const phi2 = (lat2 * Math.PI) / 180;
  const deltaPhi = ((lat2 - lat1) * Math.PI) / 180;
  const deltaLambda = ((lng2 - lng1) * Math.PI) / 180;
  const a = Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
    Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

async function sendPushNotifications(userIds: string[], title: string, body: string, data?: Record<string, string>) {
  try {
    const tokens = await db.select({ token: pushTokens.token })
      .from(pushTokens)
      .where(and(
        inArray(pushTokens.userId, userIds),
        eq(pushTokens.isActive, true)
      ));

    if (tokens.length === 0) return;

    const messages = tokens.map(t => ({
      to: t.token,
      sound: "default" as const,
      title,
      body,
      data: data || {},
    }));

    const chunks: typeof messages[] = [];
    for (let i = 0; i < messages.length; i += 100) {
      chunks.push(messages.slice(i, i + 100));
    }

    let pushSucceeded = 0;
    let pushFailed = 0;
    for (const chunk of chunks) {
      try {
        const pushRes = await fetch("https://exp.host/--/api/v2/push/send", {
          method: "POST",
          headers: {
            "Accept": "application/json",
            "Content-Type": "application/json",
          },
          body: JSON.stringify(chunk),
        });
        const pushResult = await pushRes.json();
        if (pushResult?.data) {
          for (const ticket of pushResult.data) {
            if (ticket.status === "ok") pushSucceeded++;
            else pushFailed++;
          }
        }
      } catch (err) {
        pushFailed += chunk.length;
        console.error("[PUSH] Notification error:", err);
      }
    }
    console.log(`[PUSH] Sent to ${userIds.length} users: ${pushSucceeded} succeeded, ${pushFailed} failed, ${tokens.length} tokens found`);
  } catch (error) {
    console.error("Failed to send push notifications:", error);
  }
}

const rateLimitMap = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT_WINDOW = 60000;
const RATE_LIMIT_MAX = 5;

const titoRateLimitMap = new Map<string, { count: number; resetTime: number }>();
const TITO_RATE_LIMIT_WINDOW = 60000;
const TITO_RATE_LIMIT_MAX = 10;

function checkTitoRateLimit(userId: string): boolean {
  const now = Date.now();
  const entry = titoRateLimitMap.get(userId);
  
  if (!entry || now > entry.resetTime) {
    titoRateLimitMap.set(userId, { count: 1, resetTime: now + TITO_RATE_LIMIT_WINDOW });
    return true;
  }
  
  if (entry.count >= TITO_RATE_LIMIT_MAX) {
    return false;
  }
  
  entry.count++;
  return true;
}

function getClientIp(req: Request): string {
  const forwarded = req.headers["x-forwarded-for"];
  if (typeof forwarded === "string") {
    return forwarded.split(",")[0].trim();
  }
  return req.socket?.remoteAddress || "unknown";
}

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);
  
  if (!entry || now > entry.resetTime) {
    rateLimitMap.set(ip, { count: 1, resetTime: now + RATE_LIMIT_WINDOW });
    return true;
  }
  
  if (entry.count >= RATE_LIMIT_MAX) {
    return false;
  }
  
  entry.count++;
  return true;
}

function checkRoles(...allowedRoles: UserRole[]) {
  return (req: Request, res: Response, next: () => void) => {
    const role = req.headers["x-user-role"] as UserRole;
    const userId = req.headers["x-user-id"] as string;
    if (!role || !allowedRoles.includes(role)) {
      console.log(`[AUTH REJECTED] ${req.method} ${req.path} - role="${role || 'MISSING'}" userId="${userId || 'MISSING'}" allowed=[${allowedRoles.join(",")}]`);
      res.status(403).json({ error: "Forbidden: Insufficient permissions" });
      return;
    }
    next();
  };
}

function expandSeriesOccurrences(series: any, exceptions: any[], rangeStart: string, rangeEnd: string) {
  const occurrences: any[] = [];
  const startDate = new Date(Math.max(new Date(series.startDate).getTime(), new Date(rangeStart).getTime()));
  let endDate: Date;

  if (series.endType === "date" && series.endDate) {
    endDate = new Date(Math.min(new Date(series.endDate).getTime(), new Date(rangeEnd).getTime()));
  } else {
    endDate = new Date(rangeEnd);
  }

  const days = series.recurringDays ? series.recurringDays.split(",") : [];
  const dayMap: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
  const dayNums = days.map((d: string) => dayMap[d]).filter((n: number | undefined) => n !== undefined);

  const exceptionMap = new Map<string, any>();
  exceptions.forEach(ex => exceptionMap.set(ex.date, ex));

  const current = new Date(startDate);
  let count = 0;
  const maxCount = series.endType === "count" ? (series.endAfterCount || 999) : 999;

  while (current <= endDate && count < maxCount) {
    const dateStr = current.toISOString().split("T")[0];
    let include = false;

    if (series.frequency === "daily") {
      include = true;
    } else if (series.frequency === "weekly" || series.frequency === "biweekly") {
      include = dayNums.includes(current.getDay());
      if (series.frequency === "biweekly" && include) {
        const weeksSinceStart = Math.floor((current.getTime() - new Date(series.startDate).getTime()) / (7 * 24 * 60 * 60 * 1000));
        include = weeksSinceStart % 2 === 0;
      }
    } else if (series.frequency === "monthly") {
      include = current.getDate() === new Date(series.startDate).getDate();
    }

    if (include && current >= new Date(series.startDate)) {
      const exception = exceptionMap.get(dateStr);
      if (exception && exception.type === "cancelled") {
        occurrences.push({
          seriesId: series.id,
          date: dateStr,
          startTime: series.startTime,
          endTime: series.endTime,
          status: "cancelled",
          isException: true,
          exceptionType: "cancelled",
          reason: exception.reason,
        });
      } else if (exception && exception.type === "modified") {
        occurrences.push({
          seriesId: series.id,
          date: dateStr,
          startTime: exception.overrideStartTime || series.startTime,
          endTime: exception.overrideEndTime || series.endTime,
          workerUserId: exception.overrideWorkerUserId || series.workerUserId,
          notes: exception.overrideNotes || series.notes,
          status: "scheduled",
          isException: true,
          exceptionType: "modified",
        });
      } else {
        occurrences.push({
          seriesId: series.id,
          date: dateStr,
          startTime: series.startTime,
          endTime: series.endTime,
          workerUserId: series.workerUserId,
          notes: series.notes,
          status: "scheduled",
          isException: false,
        });
      }
      count++;
    }

    current.setDate(current.getDate() + 1);
  }

  return occurrences;
}

export async function registerRoutes(app: Express): Promise<Server> {
  app.get("/api/health", (_req: Request, res: Response) => {
    res.json({
      status: "ok",
      version: "1.0.5",
      environment: process.env.DEMO_MODE === "false" ? "production" : "demo",
      dbIdentifier: process.env.PGDATABASE || "unknown",
      wsClients: getConnectedClientsCount(),
      timestamp: new Date().toISOString(),
    });
  });

  app.use("/api", (req: Request, _res: Response, next: () => void) => {
    const userId = req.headers["x-user-id"] as string;
    const role = req.headers["x-user-role"] as string;
    console.log(`[API] ${req.method} ${req.path} | userId=${userId || "NONE"} role=${role || "NONE"}`);
    next();
  });

  app.get("/api/debug/auth-test", (req: Request, res: Response) => {
    const userId = req.headers["x-user-id"] as string;
    const role = req.headers["x-user-role"] as string;
    const contentType = req.headers["content-type"] as string;
    const accept = req.headers["accept"] as string;
    const userAgent = req.headers["user-agent"] as string;
    console.log(`[DEBUG AUTH TEST] userId=${userId || "NONE"} role=${role || "NONE"} ua=${userAgent?.substring(0, 50) || "NONE"}`);
    res.json({
      authReceived: !!(userId && role),
      userId: userId || null,
      role: role || null,
      contentType: contentType || null,
      accept: accept || null,
      userAgent: userAgent?.substring(0, 100) || null,
      timestamp: new Date().toISOString(),
    });
  });

  // ========================================
  // Internal Communications API (HR ↔ Worker)
  // ========================================

  // Get all workers for HR to start conversations with
  app.get(
    "/api/communications/workers",
    checkRoles("admin", "hr"),
    async (_req: Request, res: Response) => {
      try {
        const workers = await db.select({
          id: users.id,
          email: users.email,
          fullName: users.fullName,
          onboardingStatus: users.onboardingStatus,
          workerRoles: users.workerRoles,
          isActive: users.isActive,
        }).from(users).where(eq(users.role, "worker"));
        res.json(workers);
      } catch (error) {
        console.error("Error fetching workers:", error);
        res.status(500).json({ error: "Failed to fetch workers" });
      }
    }
  );

  // Get or create a conversation with a worker
  app.post(
    "/api/communications/conversations",
    checkRoles("admin", "hr"),
    async (req: Request, res: Response) => {
      try {
        const { workerUserId } = req.body;
        const hrUserId = req.headers["x-user-id"] as string;
        
        if (!workerUserId) {
          res.status(400).json({ error: "workerUserId is required" });
          return;
        }

        // Check if conversation already exists
        const existing = await db.select()
          .from(conversationsTable)
          .where(eq(conversationsTable.workerUserId, workerUserId))
          .limit(1);

        if (existing.length > 0) {
          res.json(existing[0]);
          return;
        }

        // Create new conversation
        const [newConversation] = await db.insert(conversationsTable).values({
          type: "hr_worker",
          workerUserId,
          hrUserId: hrUserId || null,
        }).returning();

        res.json(newConversation);
      } catch (error) {
        console.error("Error creating conversation:", error);
        res.status(500).json({ error: "Failed to create conversation" });
      }
    }
  );

  // List all conversations (HR/Admin sees all, Worker sees only their own)
  app.get(
    "/api/communications/conversations",
    async (req: Request, res: Response) => {
      try {
        const role = req.headers["x-user-role"] as UserRole;
        const userId = req.headers["x-user-id"] as string;

        if (!role || !userId) {
          res.status(401).json({ error: "Authentication required" });
          return;
        }

        let convos;
        if (role === "admin" || role === "hr") {
          // HR/Admin see all conversations with worker details
          convos = await db.select({
            id: conversationsTable.id,
            type: conversationsTable.type,
            workerUserId: conversationsTable.workerUserId,
            hrUserId: conversationsTable.hrUserId,
            lastMessageAt: conversationsTable.lastMessageAt,
            lastMessagePreview: conversationsTable.lastMessagePreview,
            isArchived: conversationsTable.isArchived,
            createdAt: conversationsTable.createdAt,
            updatedAt: conversationsTable.updatedAt,
            workerName: users.fullName,
            workerEmail: users.email,
          })
          .from(conversationsTable)
          .leftJoin(users, eq(conversationsTable.workerUserId, users.id))
          .where(eq(conversationsTable.isArchived, false))
          .orderBy(desc(conversationsTable.lastMessageAt));
        } else if (role === "worker") {
          // Workers see only their conversations with HR name
          const workerConvos = await db.select({
            id: conversationsTable.id,
            type: conversationsTable.type,
            workerUserId: conversationsTable.workerUserId,
            hrUserId: conversationsTable.hrUserId,
            lastMessageAt: conversationsTable.lastMessageAt,
            lastMessagePreview: conversationsTable.lastMessagePreview,
            isArchived: conversationsTable.isArchived,
            createdAt: conversationsTable.createdAt,
            updatedAt: conversationsTable.updatedAt,
            hrName: users.fullName,
            hrEmail: users.email,
          })
          .from(conversationsTable)
          .leftJoin(users, eq(conversationsTable.hrUserId, users.id))
          .where(and(
            eq(conversationsTable.workerUserId, userId),
            eq(conversationsTable.isArchived, false)
          ))
          .orderBy(desc(conversationsTable.lastMessageAt));
          convos = workerConvos;
        } else {
          res.status(403).json({ error: "Access denied" });
          return;
        }

        // Get unread counts for each conversation
        const convosWithUnread = await Promise.all(convos.map(async (c) => {
          const unreadResult = await db.select({ count: sql<number>`count(*)` })
            .from(messagesTable)
            .where(and(
              eq(messagesTable.conversationId, c.id),
              eq(messagesTable.recipientUserId, userId),
              isNull(messagesTable.readAt)
            ));
          return { ...c, unreadCount: Number(unreadResult[0]?.count || 0) };
        }));

        res.json(convosWithUnread);
      } catch (error) {
        console.error("Error fetching conversations:", error);
        res.status(500).json({ error: "Failed to fetch conversations" });
      }
    }
  );

  // Get messages for a conversation
  app.get(
    "/api/communications/conversations/:id/messages",
    async (req: Request, res: Response) => {
      try {
        const role = req.headers["x-user-role"] as UserRole;
        const userId = req.headers["x-user-id"] as string;
        const conversationId = req.params.id;
        const limit = parseInt(req.query.limit as string) || 50;
        const offset = parseInt(req.query.offset as string) || 0;

        if (!role || !userId) {
          res.status(401).json({ error: "Authentication required" });
          return;
        }

        // Verify access to conversation
        const [convo] = await db.select().from(conversationsTable).where(eq(conversationsTable.id, conversationId));
        if (!convo) {
          res.status(404).json({ error: "Conversation not found" });
          return;
        }

        // Workers can only access their own conversations
        if (role === "worker" && convo.workerUserId !== userId) {
          res.status(403).json({ error: "Access denied" });
          return;
        }

        const msgs = await db.select({
          id: messagesTable.id,
          conversationId: messagesTable.conversationId,
          senderUserId: messagesTable.senderUserId,
          recipientUserId: messagesTable.recipientUserId,
          body: messagesTable.body,
          messageType: messagesTable.messageType,
          mediaUrl: messagesTable.mediaUrl,
          readAt: messagesTable.readAt,
          status: messagesTable.status,
          createdAt: messagesTable.createdAt,
          senderName: users.fullName,
        })
        .from(messagesTable)
        .leftJoin(users, eq(messagesTable.senderUserId, users.id))
        .where(and(
          eq(messagesTable.conversationId, conversationId),
          isNull(messagesTable.deletedAt)
        ))
        .orderBy(desc(messagesTable.createdAt))
        .limit(limit)
        .offset(offset);

        res.json(msgs.reverse()); // Return oldest first for display
      } catch (error) {
        console.error("Error fetching messages:", error);
        res.status(500).json({ error: "Failed to fetch messages" });
      }
    }
  );

  // Send a message
  app.post(
    "/api/communications/conversations/:id/messages",
    async (req: Request, res: Response) => {
      try {
        const role = req.headers["x-user-role"] as UserRole;
        const userId = req.headers["x-user-id"] as string;
        const conversationId = req.params.id;
        const { body, messageType = "text", mediaUrl } = req.body;

        if (!role || !userId) {
          res.status(401).json({ error: "Authentication required" });
          return;
        }

        if (!body || body.trim().length === 0) {
          res.status(400).json({ error: "Message body is required" });
          return;
        }

        // Verify access to conversation
        const [convo] = await db.select().from(conversationsTable).where(eq(conversationsTable.id, conversationId));
        if (!convo) {
          res.status(404).json({ error: "Conversation not found" });
          return;
        }

        // Workers can only send in their own conversations
        if (role === "worker" && convo.workerUserId !== userId) {
          res.status(403).json({ error: "Access denied" });
          return;
        }

        // Determine recipient
        let recipientUserId: string;
        if (role === "worker") {
          // Worker sending to HR - get any HR user or the assigned one
          if (convo.hrUserId) {
            recipientUserId = convo.hrUserId;
          } else {
            // Get first HR user as recipient
            const [hrUser] = await db.select({ id: users.id })
              .from(users)
              .where(or(eq(users.role, "hr"), eq(users.role, "admin")))
              .limit(1);
            if (!hrUser) {
              res.status(400).json({ error: "No HR available to receive message" });
              return;
            }
            recipientUserId = hrUser.id;
          }
        } else {
          // HR/Admin sending to worker
          recipientUserId = convo.workerUserId;
        }

        // Create message
        const [newMessage] = await db.insert(messagesTable).values({
          conversationId,
          senderUserId: userId,
          recipientUserId,
          body: body.trim(),
          messageType,
          mediaUrl,
          status: "delivered",
        }).returning();

        // Create message log
        await db.insert(messageLogsTable).values({
          messageId: newMessage.id,
          event: "created",
          actorUserId: userId,
        });

        // Update conversation with last message info
        await db.update(conversationsTable)
          .set({
            lastMessageAt: new Date(),
            lastMessagePreview: body.trim().substring(0, 100),
            updatedAt: new Date(),
          })
          .where(eq(conversationsTable.id, conversationId));

        // Get sender name for response
        const [sender] = await db.select({ fullName: users.fullName })
          .from(users)
          .where(eq(users.id, userId));

        sendPushNotifications(
          [recipientUserId],
          sender?.fullName || "New Message",
          body.trim().length > 100 ? body.trim().substring(0, 97) + "..." : body.trim(),
          { conversationId, type: "message" }
        );

        res.json({ ...newMessage, senderName: sender?.fullName || "Unknown" });
      } catch (error) {
        console.error("Error sending message:", error);
        res.status(500).json({ error: "Failed to send message" });
      }
    }
  );

  // Mark messages as read
  app.post(
    "/api/communications/conversations/:id/read",
    async (req: Request, res: Response) => {
      try {
        const userId = req.headers["x-user-id"] as string;
        const conversationId = req.params.id;

        if (!userId) {
          res.status(401).json({ error: "Authentication required" });
          return;
        }

        // Get unread messages addressed to current user
        const unreadMessages = await db.select({ id: messagesTable.id })
          .from(messagesTable)
          .where(and(
            eq(messagesTable.conversationId, conversationId),
            eq(messagesTable.recipientUserId, userId),
            isNull(messagesTable.readAt)
          ));

        const now = new Date();
        
        // Mark as read
        await db.update(messagesTable)
          .set({ readAt: now, status: "read" })
          .where(and(
            eq(messagesTable.conversationId, conversationId),
            eq(messagesTable.recipientUserId, userId),
            isNull(messagesTable.readAt)
          ));

        // Log read events
        for (const msg of unreadMessages) {
          await db.insert(messageLogsTable).values({
            messageId: msg.id,
            event: "read",
            actorUserId: userId,
          });
        }

        res.json({ marked: unreadMessages.length });
      } catch (error) {
        console.error("Error marking messages as read:", error);
        res.status(500).json({ error: "Failed to mark messages as read" });
      }
    }
  );

  // Auth endpoints
  app.post("/api/auth/register", async (req: Request, res: Response) => {
    try {
      const result = registerUserSchema.safeParse(req.body);
      if (!result.success) {
        res.status(400).json({ error: result.error.errors[0].message });
        return;
      }

      const { email, password, fullName, role } = result.data;

      // Check if user already exists
      const existingUser = await db.select().from(users).where(eq(users.email, email.toLowerCase()));
      if (existingUser.length > 0) {
        res.status(400).json({ error: "Email already registered" });
        return;
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(password, 10);

      // Create user - new users require admin approval (isActive: false)
      const [newUser] = await db.insert(users).values({
        email: email.toLowerCase(),
        password: hashedPassword,
        fullName,
        role,
        isActive: false,
        onboardingStatus: role === "worker" ? "NOT_APPLIED" : null,
      }).returning();

      // Return user without password
      const { password: _, ...userWithoutPassword } = newUser;
      res.json({ user: userWithoutPassword });
    } catch (error) {
      console.error("Error registering user:", error);
      res.status(500).json({ error: "Failed to register user" });
    }
  });

  app.post("/api/push-tokens", async (req: Request, res: Response) => {
    try {
      const userId = req.headers["x-user-id"] as string;
      const { token, platform } = req.body;

      if (!userId) {
        res.status(401).json({ error: "Authentication required" });
        return;
      }

      if (!token) {
        res.status(400).json({ error: "Token is required" });
        return;
      }

      const existing = await db.select().from(pushTokens).where(eq(pushTokens.token, token)).limit(1);
      
      if (existing.length > 0) {
        await db.update(pushTokens)
          .set({ userId, platform: platform || "unknown", isActive: true, updatedAt: new Date() })
          .where(eq(pushTokens.token, token));
      } else {
        await db.insert(pushTokens).values({
          userId,
          token,
          platform: platform || "unknown",
        });
      }

      res.json({ success: true });
    } catch (error) {
      console.error("Error registering push token:", error);
      res.status(500).json({ error: "Failed to register push token" });
    }
  });

  app.delete("/api/push-tokens", async (req: Request, res: Response) => {
    try {
      const { token } = req.body;
      
      if (!token) {
        res.status(400).json({ error: "Token is required" });
        return;
      }

      await db.update(pushTokens)
        .set({ isActive: false, updatedAt: new Date() })
        .where(eq(pushTokens.token, token));

      res.json({ success: true });
    } catch (error) {
      console.error("Error deactivating push token:", error);
      res.status(500).json({ error: "Failed to deactivate push token" });
    }
  });

  app.post("/api/auth/login", async (req: Request, res: Response) => {
    try {
      const result = loginUserSchema.safeParse(req.body);
      if (!result.success) {
        res.status(400).json({ error: result.error.errors[0].message });
        return;
      }

      const { email, password } = result.data;

      // Find user
      const [user] = await db.select().from(users).where(eq(users.email, email.toLowerCase()));
      if (!user) {
        res.status(401).json({ error: "Invalid email or password" });
        return;
      }

      // Check password
      const validPassword = await bcrypt.compare(password, user.password);
      if (!validPassword) {
        res.status(401).json({ error: "Invalid email or password" });
        return;
      }

      // Check if user is active (requires admin approval)
      if (!user.isActive) {
        res.status(401).json({ error: "Your account is pending approval. An admin will review and activate your account shortly." });
        return;
      }

      if (user.totpEnabled) {
        res.json({ requires2FA: true, userId: user.id });
        return;
      }

      const { password: _, totpSecret: __, recoveryCodes: ___, ...userWithoutSensitive } = user;
      res.json({ user: userWithoutSensitive });
    } catch (error) {
      console.error("Error logging in:", error);
      res.status(500).json({ error: "Failed to login" });
    }
  });

  // ========================================
  // Two-Factor Authentication (2FA) Endpoints
  // ========================================

  function generateRecoveryCodes(): string[] {
    const codes: string[] = [];
    for (let i = 0; i < 8; i++) {
      codes.push(crypto.randomBytes(4).toString("hex").toUpperCase());
    }
    return codes;
  }

  app.post("/api/2fa/setup", async (req: Request, res: Response) => {
    try {
      const userId = req.headers["x-user-id"] as string;
      if (!userId) {
        res.status(401).json({ error: "Authentication required" });
        return;
      }

      const [user] = await db.select().from(users).where(eq(users.id, userId));
      if (!user) {
        res.status(404).json({ error: "User not found" });
        return;
      }

      if (user.totpEnabled) {
        res.status(400).json({ error: "2FA is already enabled" });
        return;
      }

      const secret = new OTPAuth.Secret({ size: 20 });
      const totp = new OTPAuth.TOTP({
        issuer: "Workforce Connect",
        label: user.email,
        algorithm: "SHA1",
        digits: 6,
        period: 30,
        secret,
      });

      await db.update(users)
        .set({ totpSecret: secret.base32, updatedAt: new Date() })
        .where(eq(users.id, userId));

      res.json({
        secret: secret.base32,
        uri: totp.toString(),
      });
    } catch (error) {
      console.error("Error setting up 2FA:", error);
      res.status(500).json({ error: "Failed to setup 2FA" });
    }
  });

  app.post("/api/2fa/verify-setup", async (req: Request, res: Response) => {
    try {
      const userId = req.headers["x-user-id"] as string;
      if (!userId) {
        res.status(401).json({ error: "Authentication required" });
        return;
      }

      const { code } = req.body;
      if (!code) {
        res.status(400).json({ error: "Verification code is required" });
        return;
      }

      const [user] = await db.select().from(users).where(eq(users.id, userId));
      if (!user || !user.totpSecret) {
        res.status(400).json({ error: "2FA setup not initiated" });
        return;
      }

      const totp = new OTPAuth.TOTP({
        issuer: "Workforce Connect",
        label: user.email,
        algorithm: "SHA1",
        digits: 6,
        period: 30,
        secret: OTPAuth.Secret.fromBase32(user.totpSecret),
      });

      const delta = totp.validate({ token: code, window: 1 });
      if (delta === null) {
        res.status(400).json({ error: "Invalid verification code" });
        return;
      }

      const recoveryCodes = generateRecoveryCodes();

      await db.update(users)
        .set({
          totpEnabled: true,
          recoveryCodes: JSON.stringify(recoveryCodes),
          updatedAt: new Date(),
        })
        .where(eq(users.id, userId));

      res.json({
        enabled: true,
        recoveryCodes,
      });
    } catch (error) {
      console.error("Error verifying 2FA setup:", error);
      res.status(500).json({ error: "Failed to verify 2FA setup" });
    }
  });

  app.post("/api/2fa/disable", async (req: Request, res: Response) => {
    try {
      const userId = req.headers["x-user-id"] as string;
      if (!userId) {
        res.status(401).json({ error: "Authentication required" });
        return;
      }

      const { code } = req.body;
      if (!code) {
        res.status(400).json({ error: "Verification code is required" });
        return;
      }

      const [user] = await db.select().from(users).where(eq(users.id, userId));
      if (!user || !user.totpEnabled || !user.totpSecret) {
        res.status(400).json({ error: "2FA is not enabled" });
        return;
      }

      const totp = new OTPAuth.TOTP({
        issuer: "Workforce Connect",
        label: user.email,
        algorithm: "SHA1",
        digits: 6,
        period: 30,
        secret: OTPAuth.Secret.fromBase32(user.totpSecret),
      });

      const delta = totp.validate({ token: code, window: 1 });
      if (delta === null) {
        res.status(400).json({ error: "Invalid verification code" });
        return;
      }

      await db.update(users)
        .set({
          totpEnabled: false,
          totpSecret: null,
          recoveryCodes: null,
          updatedAt: new Date(),
        })
        .where(eq(users.id, userId));

      res.json({ disabled: true });
    } catch (error) {
      console.error("Error disabling 2FA:", error);
      res.status(500).json({ error: "Failed to disable 2FA" });
    }
  });

  app.post("/api/2fa/verify", async (req: Request, res: Response) => {
    try {
      const { userId, code } = req.body;
      if (!userId || !code) {
        res.status(400).json({ error: "User ID and code are required" });
        return;
      }

      const [user] = await db.select().from(users).where(eq(users.id, userId));
      if (!user || !user.totpEnabled || !user.totpSecret) {
        res.status(400).json({ error: "2FA is not enabled for this user" });
        return;
      }

      const totp = new OTPAuth.TOTP({
        issuer: "Workforce Connect",
        label: user.email,
        algorithm: "SHA1",
        digits: 6,
        period: 30,
        secret: OTPAuth.Secret.fromBase32(user.totpSecret),
      });

      const delta = totp.validate({ token: code, window: 1 });

      if (delta !== null) {
        const { password: _, totpSecret: __, recoveryCodes: ___, ...userWithoutSensitive } = user;
        res.json({ verified: true, user: userWithoutSensitive });
        return;
      }

      if (user.recoveryCodes) {
        const codes: string[] = JSON.parse(user.recoveryCodes);
        const codeIndex = codes.indexOf(code.toUpperCase());
        if (codeIndex !== -1) {
          codes.splice(codeIndex, 1);
          await db.update(users)
            .set({ recoveryCodes: JSON.stringify(codes), updatedAt: new Date() })
            .where(eq(users.id, userId));

          const { password: _, totpSecret: __, recoveryCodes: ___, ...userWithoutSensitive } = user;
          res.json({ verified: true, user: userWithoutSensitive, remainingRecoveryCodes: codes.length });
          return;
        }
      }

      res.status(400).json({ error: "Invalid verification code" });
    } catch (error) {
      console.error("Error verifying 2FA:", error);
      res.status(500).json({ error: "Failed to verify 2FA" });
    }
  });

  app.get("/api/2fa/status", async (req: Request, res: Response) => {
    try {
      const userId = req.headers["x-user-id"] as string;
      if (!userId) {
        res.status(401).json({ error: "Authentication required" });
        return;
      }

      const [user] = await db.select({ totpEnabled: users.totpEnabled }).from(users).where(eq(users.id, userId));
      if (!user) {
        res.status(404).json({ error: "User not found" });
        return;
      }

      res.json({ enabled: user.totpEnabled || false });
    } catch (error) {
      console.error("Error checking 2FA status:", error);
      res.status(500).json({ error: "Failed to check 2FA status" });
    }
  });

  // User management endpoints (admin only)
  app.get("/api/users", checkRoles("admin"), async (_req: Request, res: Response) => {
    try {
      const allUsers = await db.select({
        id: users.id,
        email: users.email,
        fullName: users.fullName,
        role: users.role,
        timezone: users.timezone,
        onboardingStatus: users.onboardingStatus,
        workerRoles: users.workerRoles,
        businessName: users.businessName,
        phone: users.phone,
        isActive: users.isActive,
        createdAt: users.createdAt,
        updatedAt: users.updatedAt,
      }).from(users);
      res.json(allUsers);
    } catch (error) {
      console.error("Error fetching users:", error);
      res.status(500).json({ error: "Failed to fetch users" });
    }
  });

  app.patch("/api/users/:id", checkRoles("admin"), async (req: Request, res: Response) => {
    try {
      const id = req.params.id as string;
      const { role, isActive, onboardingStatus, workerRoles, phone } = req.body;

      const updateData: Record<string, unknown> = { updatedAt: new Date() };
      if (role !== undefined) updateData.role = role;
      if (isActive !== undefined) updateData.isActive = isActive;
      if (onboardingStatus !== undefined) updateData.onboardingStatus = onboardingStatus;
      if (workerRoles !== undefined) updateData.workerRoles = workerRoles;
      if (phone !== undefined) updateData.phone = phone;

      // When activating a worker, auto-advance onboarding to AGREEMENT_PENDING
      if (isActive === true && onboardingStatus === undefined) {
        const [existingUser] = await db.select().from(users).where(eq(users.id, id));
        if (existingUser && existingUser.role === "worker" && 
            (existingUser.onboardingStatus === "APPLICATION_SUBMITTED" || existingUser.onboardingStatus === "NOT_APPLIED")) {
          updateData.onboardingStatus = "AGREEMENT_PENDING";
        }
      }

      const [updatedUser] = await db.update(users)
        .set(updateData)
        .where(eq(users.id, id))
        .returning();

      if (!updatedUser) {
        res.status(404).json({ error: "User not found" });
        return;
      }

      const { password: _, ...userWithoutPassword } = updatedUser;
      res.json(userWithoutPassword);
      broadcast({ type: "updated", entity: "user", id: req.params.id });
    } catch (error) {
      console.error("Error updating user:", error);
      res.status(500).json({ error: "Failed to update user" });
    }
  });

  app.patch("/api/users/me/profile", async (req: Request, res: Response) => {
    try {
      const userId = req.headers["x-user-id"] as string;
      const role = req.headers["x-user-role"] as string;

      if (!userId || !role) {
        res.status(401).json({ error: "Authentication required" });
        return;
      }

      const { fullName, email, phone, timezone, businessName, businessAddress, businessPhone } = req.body;

      const updateData: Record<string, unknown> = { updatedAt: new Date() };

      if (fullName !== undefined && typeof fullName === "string" && fullName.trim().length >= 2) {
        updateData.fullName = fullName.trim();
      }

      if (phone !== undefined) {
        updateData.phone = phone ? phone.trim() : null;
      }

      if (timezone !== undefined && typeof timezone === "string" && timezone.trim().length > 0) {
        updateData.timezone = timezone.trim();
      }

      if (email !== undefined && typeof email === "string") {
        const trimmedEmail = email.trim().toLowerCase();
        if (trimmedEmail.length === 0 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
          res.status(400).json({ error: "Invalid email address" });
          return;
        }
        const [existingUser] = await db.select({ id: users.id })
          .from(users)
          .where(and(eq(users.email, trimmedEmail), ne(users.id, userId)))
          .limit(1);
        if (existingUser) {
          res.status(409).json({ error: "Email is already in use by another account" });
          return;
        }
        updateData.email = trimmedEmail;
      }

      if (role === "client") {
        if (businessName !== undefined) updateData.businessName = businessName ? businessName.trim() : null;
        if (businessAddress !== undefined) updateData.businessAddress = businessAddress ? businessAddress.trim() : null;
        if (businessPhone !== undefined) updateData.businessPhone = businessPhone ? businessPhone.trim() : null;
      }

      const [updatedUser] = await db.update(users)
        .set(updateData)
        .where(eq(users.id, userId))
        .returning();

      if (!updatedUser) {
        res.status(404).json({ error: "User not found" });
        return;
      }

      const { password: _, totpSecret: _ts, recoveryCodes: _rc, ...safeUser } = updatedUser;
      res.json(safeUser);
      broadcast({ type: "updated", entity: "user", id: userId });
    } catch (error) {
      console.error("Error updating profile:", error);
      res.status(500).json({ error: "Failed to update profile" });
    }
  });

  // Worker self-service onboarding status update
  app.patch("/api/users/me/onboarding-status", async (req: Request, res: Response) => {
    try {
      const userId = req.headers["x-user-id"] as string;
      const role = req.headers["x-user-role"] as string;
      const { onboardingStatus } = req.body;

      console.log(`[ONBOARDING] Status update request: userId=${userId}, role=${role}, newStatus=${onboardingStatus}`);

      if (!userId || !role) {
        console.log(`[ONBOARDING] REJECTED: Missing auth headers (userId=${userId}, role=${role})`);
        res.status(401).json({ error: "Authentication required" });
        return;
      }

      if (role !== "worker") {
        console.log(`[ONBOARDING] REJECTED: Non-worker role (${role}) tried to update status`);
        res.status(403).json({ error: "Only workers can update their onboarding status" });
        return;
      }

      const validStatuses = ["NOT_APPLIED", "APPLICATION_SUBMITTED", "AGREEMENT_PENDING", "AGREEMENT_ACCEPTED"];
      if (!onboardingStatus || !validStatuses.includes(onboardingStatus)) {
        console.log(`[ONBOARDING] REJECTED: Invalid status value: ${onboardingStatus}`);
        res.status(400).json({ error: "Invalid onboarding status" });
        return;
      }

      const [updatedUser] = await db.update(users)
        .set({ onboardingStatus, updatedAt: new Date() })
        .where(eq(users.id, userId))
        .returning();

      if (!updatedUser) {
        console.log(`[ONBOARDING] REJECTED: User not found for id=${userId}`);
        res.status(404).json({ error: "User not found" });
        return;
      }

      console.log(`[ONBOARDING] SUCCESS: User ${updatedUser.email} (${userId}) status updated to ${updatedUser.onboardingStatus}`);
      res.json({ 
        id: updatedUser.id, 
        onboardingStatus: updatedUser.onboardingStatus 
      });
      broadcast({ type: "updated", entity: "onboarding", id: userId });
    } catch (error) {
      console.error("[ONBOARDING] ERROR updating onboarding status:", error);
      res.status(500).json({ error: "Failed to update onboarding status" });
    }
  });

  app.delete("/api/users/:id", checkRoles("admin"), async (req: Request, res: Response) => {
    try {
      const id = req.params.id as string;
      const adminId = req.headers["x-user-id"] as string;

      console.log(`[DELETE USER] Admin ${adminId} requesting to delete user ${id}`);

      if (id === adminId) {
        console.log(`[DELETE USER] REJECTED: Admin tried to delete themselves`);
        res.status(400).json({ error: "You cannot delete your own account" });
        return;
      }

      const [existingUser] = await db.select().from(users).where(eq(users.id, id)).limit(1);
      if (!existingUser) {
        console.log(`[DELETE USER] REJECTED: User ${id} not found`);
        res.status(404).json({ error: "User not found" });
        return;
      }

      console.log(`[DELETE USER] Deleting user: ${existingUser.email} (${existingUser.role})`);

      await db.execute(sql`DELETE FROM message_logs WHERE message_id IN (SELECT id FROM messages WHERE sender_user_id = ${id} OR recipient_user_id = ${id})`);
      await db.execute(sql`DELETE FROM message_logs WHERE actor_user_id = ${id}`);
      await db.execute(sql`DELETE FROM messages WHERE sender_user_id = ${id} OR recipient_user_id = ${id}`);
      await db.execute(sql`DELETE FROM conversations WHERE worker_user_id = ${id} OR hr_user_id = ${id}`);
      await db.execute(sql`DELETE FROM push_tokens WHERE user_id = ${id}`);
      await db.execute(sql`DELETE FROM app_notifications WHERE user_id = ${id}`);
      await db.execute(sql`DELETE FROM sent_reminders WHERE worker_id = ${id}`);
      await db.execute(sql`DELETE FROM shift_checkins WHERE worker_id = ${id}`);
      await db.execute(sql`DELETE FROM shift_offers WHERE worker_user_id = ${id}`);
      await db.execute(sql`DELETE FROM payroll_batch_items WHERE worker_user_id = ${id}`);
      await db.execute(sql`DELETE FROM timesheet_entries WHERE timesheet_id IN (SELECT id FROM timesheets WHERE worker_user_id = ${id})`);
      await db.execute(sql`UPDATE timesheets SET approved_by_user_id = NULL WHERE approved_by_user_id = ${id}`);
      await db.execute(sql`UPDATE timesheets SET disputed_by_user_id = NULL WHERE disputed_by_user_id = ${id}`);
      await db.execute(sql`DELETE FROM timesheets WHERE worker_user_id = ${id}`);
      await db.execute(sql`DELETE FROM tito_logs WHERE worker_id = ${id}`);
      await db.execute(sql`UPDATE workplace_assignments SET invited_by_user_id = NULL WHERE invited_by_user_id = ${id}`);
      await db.execute(sql`DELETE FROM workplace_assignments WHERE worker_user_id = ${id}`);
      await db.execute(sql`DELETE FROM payment_profiles WHERE worker_user_id = ${id}`);
      await db.execute(sql`DELETE FROM export_audit_logs WHERE admin_user_id = ${id}`);
      await db.execute(sql`UPDATE payroll_batches SET created_by_user_id = ${adminId} WHERE created_by_user_id = ${id}`);
      await db.execute(sql`UPDATE payroll_batches SET finalized_by_user_id = NULL WHERE finalized_by_user_id = ${id}`);
      await db.execute(sql`DELETE FROM recurrence_exceptions WHERE override_worker_user_id = ${id} OR cancelled_by_user_id = ${id}`);
      await db.execute(sql`UPDATE shift_series SET worker_user_id = NULL WHERE worker_user_id = ${id}`);
      await db.execute(sql`UPDATE shift_series SET created_by_user_id = NULL WHERE created_by_user_id = ${id}`);
      await db.execute(sql`UPDATE shifts SET worker_user_id = NULL WHERE worker_user_id = ${id}`);
      await db.execute(sql`UPDATE shifts SET created_by_user_id = NULL WHERE created_by_user_id = ${id}`);
      await db.execute(sql`UPDATE shift_requests SET requested_worker_id = NULL WHERE requested_worker_id = ${id}`);
      await db.execute(sql`DELETE FROM shift_requests WHERE client_id = ${id}`);
      await db.execute(sql`DELETE FROM user_photos WHERE user_id = ${id} OR reviewer_id = ${id}`);
      await db.execute(sql`DELETE FROM audit_log WHERE user_id = ${id}`);
      await db.execute(sql`DELETE FROM worker_applications WHERE email = ${existingUser.email}`);
      await db.execute(sql`DELETE FROM users WHERE id = ${id}`);

      console.log(`[DELETE USER] SUCCESS: User ${existingUser.email} (${id}) deleted by admin ${adminId}`);
      res.json({ message: "User deleted successfully" });
      broadcast({ type: "deleted", entity: "user", id });
    } catch (error: any) {
      console.error("[DELETE USER] ERROR:", error);
      const detail = error?.message || "Failed to delete user";
      res.status(500).json({ error: `Failed to delete user: ${detail}` });
    }
  });

  // Create new user (admin only)
  app.post("/api/users", checkRoles("admin"), async (req: Request, res: Response) => {
    try {
      const { email, password, fullName, role } = req.body;

      if (!email || !password || !fullName || !role) {
        res.status(400).json({ error: "Email, password, full name, and role are required" });
        return;
      }

      // Validate role
      const validRoles = ["admin", "hr", "client", "worker"];
      if (!validRoles.includes(role)) {
        res.status(400).json({ error: "Invalid role. Must be one of: admin, hr, client, worker" });
        return;
      }

      // Check if email already exists
      const existingUser = await db.select().from(users).where(eq(users.email, email.toLowerCase())).limit(1);
      if (existingUser.length > 0) {
        res.status(409).json({ error: "A user with this email already exists" });
        return;
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(password, 10);

      // Create user
      const [newUser] = await db.insert(users).values({
        email: email.toLowerCase(),
        password: hashedPassword,
        fullName,
        role,
        isActive: true,
        onboardingStatus: role === "worker" ? "NOT_APPLIED" : null,
      }).returning();

      const { password: _, ...userWithoutPassword } = newUser;
      res.status(201).json(userWithoutPassword);
      broadcast({ type: "created", entity: "user" });
    } catch (error) {
      console.error("Error creating user:", error);
      res.status(500).json({ error: "Failed to create user" });
    }
  });

  app.post("/public/contact", async (req: Request, res: Response) => {
    try {
      const ip = getClientIp(req);
      
      if (!checkRateLimit(ip)) {
        res.status(429).json({ ok: false, error: "Too many requests. Please try again later." });
        return;
      }

      const { name, email, company, phone, cityProvince, serviceNeeded, message } = req.body;
      
      if (!name || typeof name !== "string" || name.trim().length < 2) {
        res.status(400).json({ ok: false, error: "Name is required (minimum 2 characters)" });
        return;
      }
      
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!email || typeof email !== "string" || !emailRegex.test(email)) {
        res.status(400).json({ ok: false, error: "Valid email is required" });
        return;
      }
      
      if (!message || typeof message !== "string" || message.trim().length < 10) {
        res.status(400).json({ ok: false, error: "Message is required (minimum 10 characters)" });
        return;
      }

      const userAgent = req.headers["user-agent"] || null;

      await db.insert(contactLeads).values({
        name: name.trim(),
        email: email.trim().toLowerCase(),
        company: company?.trim() || null,
        phone: phone?.trim() || null,
        cityProvince: cityProvince?.trim() || null,
        serviceNeeded: serviceNeeded?.trim() || null,
        message: message.trim(),
        ip,
        userAgent,
      });

      console.log(`Contact form submission from: ${email}`);
      res.json({ ok: true });
    } catch (error) {
      console.error("Error saving contact lead:", error);
      res.status(500).json({ ok: false, error: "Failed to submit form. Please try again." });
    }
  });

  // Worker Application Form Submission
  app.post("/api/public/apply", async (req: Request, res: Response) => {
    try {
      const ip = getClientIp(req);
      
      if (!checkRateLimit(ip)) {
        res.status(429).json({ error: "Too many requests. Please try again later." });
        return;
      }

      const userAgent = req.headers["user-agent"] || null;

      const applicationData = {
        ...req.body,
        ip,
        userAgent,
      };

      const [newApplication] = await db.insert(workerApplications).values(applicationData).returning();

      console.log(`Worker application submitted from: ${req.body.email}`);
      res.json({ ok: true, id: newApplication.id });
    } catch (error) {
      console.error("Error saving worker application:", error);
      res.status(500).json({ error: "Failed to submit application. Please try again." });
    }
  });

  // Get all worker applications (admin only with basic auth)
  app.get("/api/admin/applications", async (req: Request, res: Response) => {
    try {
      const authHeader = req.headers.authorization;
      
      if (!authHeader || !authHeader.startsWith("Basic ")) {
        res.status(401).json({ error: "Authentication required" });
        return;
      }

      const base64Credentials = authHeader.split(" ")[1];
      const credentials = Buffer.from(base64Credentials, "base64").toString("utf-8");
      const [username, password] = credentials.split(":");

      if (username !== "wfconnect" || password !== "@2255Dundaswest") {
        res.status(401).json({ error: "Invalid credentials" });
        return;
      }

      const applications = await db.select().from(workerApplications).orderBy(desc(workerApplications.createdAt));
      res.json(applications);
    } catch (error) {
      console.error("Error fetching applications:", error);
      res.status(500).json({ error: "Failed to fetch applications" });
    }
  });

  // Get single worker application
  app.get("/api/admin/applications/:id", async (req: Request, res: Response) => {
    try {
      const authHeader = req.headers.authorization;
      
      if (!authHeader || !authHeader.startsWith("Basic ")) {
        res.status(401).json({ error: "Authentication required" });
        return;
      }

      const base64Credentials = authHeader.split(" ")[1];
      const credentials = Buffer.from(base64Credentials, "base64").toString("utf-8");
      const [username, password] = credentials.split(":");

      if (username !== "wfconnect" || password !== "@2255Dundaswest") {
        res.status(401).json({ error: "Invalid credentials" });
        return;
      }

      const [application] = await db.select().from(workerApplications).where(eq(workerApplications.id, req.params.id));
      
      if (!application) {
        res.status(404).json({ error: "Application not found" });
        return;
      }

      res.json(application);
    } catch (error) {
      console.error("Error fetching application:", error);
      res.status(500).json({ error: "Failed to fetch application" });
    }
  });

  // Update application status
  app.patch("/api/admin/applications/:id", async (req: Request, res: Response) => {
    try {
      const authHeader = req.headers.authorization;
      
      if (!authHeader || !authHeader.startsWith("Basic ")) {
        res.status(401).json({ error: "Authentication required" });
        return;
      }

      const base64Credentials = authHeader.split(" ")[1];
      const credentials = Buffer.from(base64Credentials, "base64").toString("utf-8");
      const [username, password] = credentials.split(":");

      if (username !== "wfconnect" || password !== "@2255Dundaswest") {
        res.status(401).json({ error: "Invalid credentials" });
        return;
      }

      const { status, notes } = req.body;

      const [updatedApplication] = await db.update(workerApplications)
        .set({
          status,
          notes,
          reviewedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(workerApplications.id, req.params.id))
        .returning();

      if (!updatedApplication) {
        res.status(404).json({ error: "Application not found" });
        return;
      }

      if (status === "approved" && updatedApplication.email) {
        try {
          const updateData: any = { 
            onboardingStatus: "AGREEMENT_PENDING",
            updatedAt: new Date()
          };
          if (updatedApplication.phone) {
            updateData.phone = updatedApplication.phone;
          }
          await db.update(users)
            .set(updateData)
            .where(eq(users.email, updatedApplication.email));
        } catch (linkError) {
          console.error("Failed to update user onboarding status on approval:", linkError);
        }
      }

      res.json(updatedApplication);
    } catch (error) {
      console.error("Error updating application:", error);
      res.status(500).json({ error: "Failed to update application" });
    }
  });

  // Delete worker application
  app.delete("/api/admin/applications/:id", async (req: Request, res: Response) => {
    try {
      const authHeader = req.headers.authorization;
      
      if (!authHeader || !authHeader.startsWith("Basic ")) {
        res.status(401).json({ error: "Authentication required" });
        return;
      }

      const base64Credentials = authHeader.split(" ")[1];
      const credentials = Buffer.from(base64Credentials, "base64").toString("utf-8");
      const [username, password] = credentials.split(":");

      if (username !== "wfconnect" || password !== "@2255Dundaswest") {
        res.status(401).json({ error: "Invalid credentials" });
        return;
      }

      const [deletedApplication] = await db.delete(workerApplications)
        .where(eq(workerApplications.id, req.params.id))
        .returning();

      if (!deletedApplication) {
        res.status(404).json({ error: "Application not found" });
        return;
      }

      res.json({ success: true, message: "Application deleted successfully" });
    } catch (error) {
      console.error("Error deleting application:", error);
      res.status(500).json({ error: "Failed to delete application" });
    }
  });

  // Download subcontractor agreement PDF for an application
  app.get("/api/admin/applications/:id/agreement-pdf", async (req: Request, res: Response) => {
    try {
      const authHeader = req.headers.authorization;
      
      if (!authHeader || !authHeader.startsWith("Basic ")) {
        res.status(401).json({ error: "Authentication required" });
        return;
      }

      const base64Credentials = authHeader.split(" ")[1];
      const credentials = Buffer.from(base64Credentials, "base64").toString("utf-8");
      const [username, password] = credentials.split(":");

      if (username !== "wfconnect" || password !== "@2255Dundaswest") {
        res.status(401).json({ error: "Invalid credentials" });
        return;
      }

      const [application] = await db.select().from(workerApplications)
        .where(eq(workerApplications.id, req.params.id));

      if (!application) {
        res.status(404).json({ error: "Application not found" });
        return;
      }

      const PDFDocument = (await import("pdfkit")).default;
      const doc = new PDFDocument({ size: "LETTER", margins: { top: 50, bottom: 50, left: 60, right: 60 } });

      const fileName = `Subcontractor_Agreement_${application.fullName.replace(/\s+/g, "_")}.pdf`;
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Disposition", `attachment; filename="${fileName}"`);
      doc.pipe(res);

      const pageWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;

      doc.fontSize(18).font("Helvetica-Bold").text("SUBCONTRACTOR AGREEMENT", { align: "center" });
      doc.moveDown(0.3);
      doc.fontSize(11).font("Helvetica").text("1001328662 Ontario Inc.", { align: "center" });
      doc.moveDown(0.2);
      doc.fontSize(9).fillColor("#666666").text("1900 Dundas St. West, Mississauga L5K 1P9", { align: "center" });
      doc.fillColor("#000000");
      doc.moveDown(1);

      doc.moveTo(doc.page.margins.left, doc.y).lineTo(doc.page.margins.left + pageWidth, doc.y).stroke("#cccccc");
      doc.moveDown(1);

      doc.fontSize(13).font("Helvetica-Bold").text("1. Contractor Information");
      doc.moveDown(0.5);

      const addField = (label: string, value: string | null | undefined) => {
        doc.fontSize(9).font("Helvetica-Bold").fillColor("#555555").text(label, { continued: true });
        doc.font("Helvetica").fillColor("#000000").text(`  ${value || "N/A"}`);
        doc.moveDown(0.2);
      };

      addField("Full Name:", application.fullName);
      addField("Email:", application.email);
      addField("Phone:", application.phone);
      addField("Address:", `${application.address}, ${application.city}, ${application.province} ${application.postalCode}`);
      if (application.dateOfBirth) addField("Date of Birth:", application.dateOfBirth);

      const workStatusMap: Record<string, string> = {
        citizen: "Canadian Citizen",
        permanent_resident: "Permanent Resident",
        work_permit: "Work Permit Holder"
      };
      addField("Work Status:", workStatusMap[application.workStatus] || application.workStatus);
      doc.moveDown(0.5);

      doc.fontSize(13).font("Helvetica-Bold").fillColor("#000000").text("2. Scope of Work");
      doc.moveDown(0.5);

      let roles: string[] = [];
      try { roles = JSON.parse(application.preferredRoles); } catch (e) { roles = [application.preferredRoles]; }
      addField("Preferred Roles:", roles.join(", "));

      let days: string[] = [];
      try { days = JSON.parse(application.availableDays); } catch (e) { days = [application.availableDays]; }
      addField("Available Days:", days.join(", "));

      let shifts: string[] = [];
      try { shifts = JSON.parse(application.preferredShifts); } catch (e) { shifts = [application.preferredShifts]; }
      addField("Preferred Shifts:", shifts.join(", "));
      doc.moveDown(0.5);

      doc.fontSize(13).font("Helvetica-Bold").text("3. Terms and Conditions");
      doc.moveDown(0.5);
      doc.fontSize(9).font("Helvetica").text(
        "This Subcontractor Agreement (the \"Agreement\") is entered into by and between 1001328662 Ontario Inc. (the \"Company\"), located at 1900 Dundas St. West, Mississauga L5K 1P9, and the above-named individual (the \"Contractor\"). The Contractor agrees to perform services as an independent subcontractor, NOT as an employee of the Company.",
        { lineGap: 3 }
      );
      doc.moveDown(0.3);
      doc.text(
        "The Contractor acknowledges that they are responsible for their own tax obligations, including but not limited to income tax and HST/GST remittances. The Company will not withhold taxes, provide benefits, or make contributions to employment insurance or the Canada Pension Plan on behalf of the Contractor.",
        { lineGap: 3 }
      );
      doc.moveDown(0.3);
      doc.text(
        "The Contractor agrees to comply with all applicable laws, regulations, and client site rules while performing services. The Contractor understands that failure to comply may result in immediate termination of this Agreement.",
        { lineGap: 3 }
      );
      doc.moveDown(0.3);
      doc.text(
        "Either party may terminate this Agreement at any time with or without cause. The Contractor will be compensated for all services performed up to the date of termination.",
        { lineGap: 3 }
      );
      doc.moveDown(0.5);

      doc.fontSize(13).font("Helvetica-Bold").text("4. Time Tracking (TITO)");
      doc.moveDown(0.5);
      doc.fontSize(9).font("Helvetica").text(
        "The Contractor acknowledges that they must accurately submit Time-In/Time-Out (TITO) records through the designated platform. GPS verification may be required to confirm presence at work sites. Falsification of time records may result in immediate termination of this Agreement and forfeiture of payment for the affected period.",
        { lineGap: 3 }
      );
      doc.moveDown(0.5);

      doc.fontSize(13).font("Helvetica-Bold").text("5. Acknowledgments");
      doc.moveDown(0.5);

      const addCheckbox = (label: string, checked: boolean) => {
        const checkmark = checked ? "[X]" : "[ ]";
        doc.fontSize(9).font("Helvetica").text(`${checkmark}  ${label}`);
        doc.moveDown(0.2);
      };

      addCheckbox("TITO System Acknowledgment - I understand that I must accurately submit Time-In/Time-Out records", application.titoAcknowledgment ?? false);
      addCheckbox("Site Rules Agreement - I agree to adhere to client site-specific rules and regulations", application.siteRulesAcknowledgment ?? false);
      addCheckbox("Worker Agreement - I understand I will be working as an independent subcontractor, NOT as an employee", application.workerAgreementConsent ?? false);
      addCheckbox("Privacy Policy - I consent to the collection and use of my personal data (GDPR & PIPEDA compliant)", application.privacyConsent ?? false);
      addCheckbox("Marketing Communications (optional)", application.marketingConsent ?? false);
      doc.moveDown(0.5);

      doc.fontSize(13).font("Helvetica-Bold").text("6. Emergency Contact");
      doc.moveDown(0.5);
      addField("Name:", application.emergencyContactName);
      addField("Relationship:", application.emergencyContactRelationship);
      addField("Phone:", application.emergencyContactPhone);
      doc.moveDown(0.5);

      doc.moveTo(doc.page.margins.left, doc.y).lineTo(doc.page.margins.left + pageWidth, doc.y).stroke("#cccccc");
      doc.moveDown(1);

      doc.fontSize(13).font("Helvetica-Bold").text("7. Electronic Signature");
      doc.moveDown(0.5);
      doc.fontSize(9).font("Helvetica").text(
        "By signing below, the Contractor confirms that all information provided is true and accurate to the best of their knowledge. This electronic signature has the same legal effect as a handwritten signature.",
        { lineGap: 3 }
      );
      doc.moveDown(0.8);

      doc.fontSize(11).font("Helvetica-Bold").text("Signed:");
      doc.moveDown(0.3);
      doc.fontSize(14).font("Helvetica-Oblique").fillColor("#1a3a5c").text(application.signature, { underline: true });
      doc.fillColor("#000000");
      doc.moveDown(0.5);
      addField("Date Signed:", application.signatureDate);
      addField("Application Status:", application.status.toUpperCase());
      addField("Submitted:", new Date(application.createdAt).toLocaleDateString("en-CA", { year: "numeric", month: "long", day: "numeric" }));

      doc.moveDown(1.5);
      doc.moveTo(doc.page.margins.left, doc.y).lineTo(doc.page.margins.left + pageWidth, doc.y).stroke("#cccccc");
      doc.moveDown(0.5);
      doc.fontSize(8).font("Helvetica").fillColor("#999999").text(
        "This document was generated by 1001328662 Ontario Inc., 1900 Dundas St. West, Mississauga L5K 1P9. For questions, contact admin@wfconnect.org",
        { align: "center" }
      );

      doc.end();
    } catch (error) {
      console.error("Error generating agreement PDF:", error);
      res.status(500).json({ error: "Failed to generate PDF" });
    }
  });

  // ========================================
  // Payment Profiles API
  // ========================================

  // Get current user's payment profile (authenticated)
  app.get("/api/payment-profile", async (req: Request, res: Response) => {
    try {
      const userId = (req as any).session?.userId;
      if (!userId) {
        res.status(401).json({ error: "Authentication required" });
        return;
      }

      const [profile] = await db.select().from(paymentProfiles).where(eq(paymentProfiles.workerUserId, userId));
      res.json(profile || null);
    } catch (error) {
      console.error("Error fetching payment profile:", error);
      res.status(500).json({ error: "Failed to fetch payment profile" });
    }
  });

  // Create or update current user's payment profile (authenticated)
  app.put("/api/payment-profile", async (req: Request, res: Response) => {
    try {
      const userId = (req as any).session?.userId;
      if (!userId) {
        res.status(401).json({ error: "Authentication required" });
        return;
      }

      const { bankName, bankInstitution, bankTransit, bankAccount, etransferEmail } = req.body;

      if (!bankName || !bankInstitution || !bankTransit || !bankAccount) {
        res.status(400).json({ error: "Bank details are required (bank name, institution, transit, account)" });
        return;
      }
      if (!etransferEmail) {
        res.status(400).json({ error: "E-Transfer email is required" });
        return;
      }

      const [existing] = await db.select().from(paymentProfiles).where(eq(paymentProfiles.workerUserId, userId));

      const paymentData = {
        paymentMethod: "both",
        bankName,
        bankInstitution,
        bankTransit,
        bankAccount,
        etransferEmail,
        updatedAt: new Date(),
      };

      if (existing) {
        const [updated] = await db.update(paymentProfiles)
          .set(paymentData)
          .where(eq(paymentProfiles.workerUserId, userId))
          .returning();
        res.json(updated);
      } else {
        const [created] = await db.insert(paymentProfiles)
          .values({ workerUserId: userId, ...paymentData })
          .returning();
        res.json(created);
      }
    } catch (error) {
      console.error("Error saving payment profile:", error);
      res.status(500).json({ error: "Failed to save payment profile" });
    }
  });

  // Public endpoint: Submit/update payment info by email (for existing workers)
  app.post("/api/public/payment-info", async (req: Request, res: Response) => {
    try {
      const ip = getClientIp(req);
      if (!checkRateLimit(ip)) {
        res.status(429).json({ error: "Too many requests. Please try again later." });
        return;
      }

      const { email, bankName, bankInstitution, bankTransit, bankAccount, etransferEmail } = req.body;

      if (!email) {
        res.status(400).json({ error: "Email is required" });
        return;
      }

      if (!bankName || !bankInstitution || !bankTransit || !bankAccount) {
        res.status(400).json({ error: "Bank details are required (bank name, institution, transit, account)" });
        return;
      }
      if (!etransferEmail) {
        res.status(400).json({ error: "E-Transfer email is required" });
        return;
      }

      const paymentData = {
        paymentMethod: "both" as const,
        bankName,
        bankInstitution,
        bankTransit,
        bankAccount,
        etransferEmail,
        updatedAt: new Date(),
      };

      // Find the user by email
      const [user] = await db.select().from(users).where(eq(users.email, email.trim().toLowerCase()));
      
      if (!user) {
        // Also check worker_applications
        const [application] = await db.select().from(workerApplications).where(eq(workerApplications.email, email.trim().toLowerCase()));
        
        if (application) {
          await db.update(workerApplications)
            .set(paymentData)
            .where(eq(workerApplications.id, application.id));
          
          res.json({ ok: true, message: "Payment information updated for your application" });
          return;
        }

        res.status(404).json({ error: "No account or application found with this email. Please apply first at /apply" });
        return;
      }

      // Create or update payment profile for the user
      const [existing] = await db.select().from(paymentProfiles).where(eq(paymentProfiles.workerUserId, user.id));

      if (existing) {
        await db.update(paymentProfiles)
          .set(paymentData)
          .where(eq(paymentProfiles.workerUserId, user.id));
      } else {
        await db.insert(paymentProfiles)
          .values({ workerUserId: user.id, ...paymentData });
      }

      res.json({ ok: true, message: "Payment information saved successfully" });
    } catch (error) {
      console.error("Error saving public payment info:", error);
      res.status(500).json({ error: "Failed to save payment information. Please try again." });
    }
  });

  // Admin: Get all payment profiles
  app.get("/api/admin/payment-profiles", async (req: Request, res: Response) => {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith("Basic ")) {
        res.status(401).json({ error: "Authentication required" });
        return;
      }
      const base64Credentials = authHeader.split(" ")[1];
      const credentials = Buffer.from(base64Credentials, "base64").toString("utf-8");
      const [username, password] = credentials.split(":");
      if (username !== "wfconnect" || password !== "@2255Dundaswest") {
        res.status(401).json({ error: "Invalid credentials" });
        return;
      }

      const profiles = await db.select({
        id: paymentProfiles.id,
        workerUserId: paymentProfiles.workerUserId,
        paymentMethod: paymentProfiles.paymentMethod,
        bankName: paymentProfiles.bankName,
        bankInstitution: paymentProfiles.bankInstitution,
        bankTransit: paymentProfiles.bankTransit,
        bankAccount: paymentProfiles.bankAccount,
        etransferEmail: paymentProfiles.etransferEmail,
        workerName: users.fullName,
        workerEmail: users.email,
        createdAt: paymentProfiles.createdAt,
        updatedAt: paymentProfiles.updatedAt,
      })
      .from(paymentProfiles)
      .leftJoin(users, eq(paymentProfiles.workerUserId, users.id))
      .orderBy(desc(paymentProfiles.updatedAt));

      res.json(profiles);
    } catch (error) {
      console.error("Error fetching payment profiles:", error);
      res.status(500).json({ error: "Failed to fetch payment profiles" });
    }
  });

  // ========================================
  // Workplaces API (Admin only)
  // ========================================

  app.get("/api/workplaces", checkRoles("admin", "hr"), async (_req: Request, res: Response) => {
    try {
      const allWorkplaces = await db.select().from(workplaces).orderBy(desc(workplaces.createdAt));
      res.json(allWorkplaces);
    } catch (error) {
      console.error("Error fetching workplaces:", error);
      res.status(500).json({ error: "Failed to fetch workplaces" });
    }
  });

  app.get("/api/workplaces/:id", async (req: Request, res: Response) => {
    try {
      const userId = req.headers["x-user-id"] as string;
      const role = req.headers["x-user-role"] as string;
      if (!userId) {
        res.status(401).json({ error: "Authentication required" });
        return;
      }

      const [workplace] = await db.select().from(workplaces).where(eq(workplaces.id, req.params.id));
      if (!workplace) {
        res.status(404).json({ error: "Workplace not found" });
        return;
      }

      if (role === "worker" || role === "client") {
        const [assignment] = await db.select().from(workplaceAssignments)
          .where(and(
            eq(workplaceAssignments.workplaceId, req.params.id),
            eq(workplaceAssignments.workerUserId, userId)
          ));
        const [assignedShift] = await db.select({ id: shifts.id }).from(shifts)
          .where(and(
            eq(shifts.workplaceId, req.params.id),
            eq(shifts.workerUserId, userId)
          )).limit(1);
        if (!assignment && !assignedShift) {
          res.json({
            id: workplace.id,
            name: workplace.name,
            latitude: workplace.latitude,
            longitude: workplace.longitude,
            geofenceRadiusMeters: workplace.geofenceRadiusMeters,
          });
          return;
        }
      }

      res.json(workplace);
    } catch (error) {
      console.error("Error fetching workplace:", error);
      res.status(500).json({ error: "Failed to fetch workplace" });
    }
  });

  app.post("/api/workplaces", checkRoles("admin", "hr"), async (req: Request, res: Response) => {
    try {
      const { name, addressLine1, city, province, postalCode, country, latitude, longitude, geofenceRadiusMeters, isActive } = req.body;
      
      if (!name || name.trim().length < 2) {
        res.status(400).json({ error: "Name is required (minimum 2 characters)" });
        return;
      }

      const [newWorkplace] = await db.insert(workplaces).values({
        name: name.trim(),
        addressLine1: addressLine1?.trim() || null,
        city: city?.trim() || null,
        province: province?.trim() || null,
        postalCode: postalCode?.trim() || null,
        country: country?.trim() || "Canada",
        latitude: latitude || null,
        longitude: longitude || null,
        geofenceRadiusMeters: geofenceRadiusMeters || 150,
        isActive: isActive !== false,
      }).returning();

      res.json(newWorkplace);
      broadcast({ type: "created", entity: "workplace" });
    } catch (error) {
      console.error("Error creating workplace:", error);
      res.status(500).json({ error: "Failed to create workplace" });
    }
  });

  app.put("/api/workplaces/:id", checkRoles("admin", "hr"), async (req: Request, res: Response) => {
    try {
      const { name, addressLine1, city, province, postalCode, country, latitude, longitude, geofenceRadiusMeters, isActive } = req.body;
      
      const updateData: Record<string, unknown> = { updatedAt: new Date() };
      if (name !== undefined) updateData.name = name.trim();
      if (addressLine1 !== undefined) updateData.addressLine1 = addressLine1?.trim() || null;
      if (city !== undefined) updateData.city = city?.trim() || null;
      if (province !== undefined) updateData.province = province?.trim() || null;
      if (postalCode !== undefined) updateData.postalCode = postalCode?.trim() || null;
      if (country !== undefined) updateData.country = country?.trim() || "Canada";
      if (latitude !== undefined) updateData.latitude = latitude;
      if (longitude !== undefined) updateData.longitude = longitude;
      if (geofenceRadiusMeters !== undefined) updateData.geofenceRadiusMeters = geofenceRadiusMeters;
      if (isActive !== undefined) updateData.isActive = isActive;

      const [updatedWorkplace] = await db.update(workplaces)
        .set(updateData)
        .where(eq(workplaces.id, req.params.id))
        .returning();

      if (!updatedWorkplace) {
        res.status(404).json({ error: "Workplace not found" });
        return;
      }

      res.json(updatedWorkplace);
      broadcast({ type: "updated", entity: "workplace", id: req.params.id });
    } catch (error) {
      console.error("Error updating workplace:", error);
      res.status(500).json({ error: "Failed to update workplace" });
    }
  });

  app.patch("/api/workplaces/:id/toggle-active", checkRoles("admin", "hr"), async (req: Request, res: Response) => {
    try {
      const [workplace] = await db.select().from(workplaces).where(eq(workplaces.id, req.params.id));
      if (!workplace) {
        res.status(404).json({ error: "Workplace not found" });
        return;
      }

      const [updatedWorkplace] = await db.update(workplaces)
        .set({ isActive: !workplace.isActive, updatedAt: new Date() })
        .where(eq(workplaces.id, req.params.id))
        .returning();

      res.json(updatedWorkplace);
      broadcast({ type: "updated", entity: "workplace", id: req.params.id });
    } catch (error) {
      console.error("Error toggling workplace status:", error);
      res.status(500).json({ error: "Failed to toggle workplace status" });
    }
  });

  app.delete("/api/workplaces/:id", checkRoles("admin"), async (req: Request, res: Response) => {
    try {
      const workplaceId = req.params.id;
      const [workplace] = await db.select().from(workplaces).where(eq(workplaces.id, workplaceId));
      if (!workplace) {
        res.status(404).json({ error: "Workplace not found" });
        return;
      }

      const workplaceShifts = await db.select({ id: shifts.id }).from(shifts).where(eq(shifts.workplaceId, workplaceId));
      if (workplaceShifts.length > 0) {
        const shiftIds = workplaceShifts.map(s => s.id);
        await db.delete(shiftOffers).where(inArray(shiftOffers.shiftId, shiftIds));
        await db.delete(shiftCheckins).where(inArray(shiftCheckins.shiftId, shiftIds));
        await db.delete(sentReminders).where(inArray(sentReminders.shiftId, shiftIds));
      }
      await db.delete(shifts).where(eq(shifts.workplaceId, workplaceId));

      await db.delete(shiftSeries).where(eq(shiftSeries.workplaceId, workplaceId));
      await db.delete(shiftRequests).where(eq(shiftRequests.workplaceId, workplaceId));
      await db.delete(workplaceAssignments).where(eq(workplaceAssignments.workplaceId, workplaceId));
      await db.delete(titoLogs).where(eq(titoLogs.workplaceId, workplaceId));
      await db.update(timesheetEntries).set({ workplaceId: null }).where(eq(timesheetEntries.workplaceId, workplaceId));
      await db.update(exportAuditLogs).set({ workplaceId: null }).where(eq(exportAuditLogs.workplaceId, workplaceId));

      await db.delete(workplaces).where(eq(workplaces.id, workplaceId));

      broadcast({ type: "deleted", entity: "workplace", id: workplaceId });
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting workplace:", error);
      res.status(500).json({ error: "Failed to delete workplace" });
    }
  });

  // ========================================
  // Workplace Assignments API (Admin only)
  // ========================================

  app.get("/api/workplaces/:id/workers", checkRoles("admin", "hr"), async (req: Request, res: Response) => {
    try {
      const assignments = await db.select({
        id: workplaceAssignments.id,
        workplaceId: workplaceAssignments.workplaceId,
        workerUserId: workplaceAssignments.workerUserId,
        status: workplaceAssignments.status,
        invitedAt: workplaceAssignments.invitedAt,
        acceptedAt: workplaceAssignments.acceptedAt,
        notes: workplaceAssignments.notes,
        createdAt: workplaceAssignments.createdAt,
        workerName: users.fullName,
        workerEmail: users.email,
        workerRoles: users.workerRoles,
      })
      .from(workplaceAssignments)
      .leftJoin(users, eq(workplaceAssignments.workerUserId, users.id))
      .where(and(eq(workplaceAssignments.workplaceId, req.params.id), eq(workplaceAssignments.status, "active")))
      .orderBy(desc(workplaceAssignments.createdAt));

      res.json(assignments);
    } catch (error) {
      console.error("Error fetching workplace workers:", error);
      res.status(500).json({ error: "Failed to fetch workplace workers" });
    }
  });

  app.post("/api/workplaces/:id/invite-worker", checkRoles("admin", "hr"), async (req: Request, res: Response) => {
    try {
      const { workerUserId, status, notes } = req.body;
      const invitedByUserId = req.headers["x-user-id"] as string;

      if (!workerUserId) {
        res.status(400).json({ error: "workerUserId is required" });
        return;
      }

      const [worker] = await db.select().from(users).where(and(eq(users.id, workerUserId), eq(users.role, "worker")));
      if (!worker) {
        res.status(404).json({ error: "Worker not found" });
        return;
      }

      const [workplace] = await db.select().from(workplaces).where(eq(workplaces.id, req.params.id));
      if (!workplace) {
        res.status(404).json({ error: "Workplace not found" });
        return;
      }

      const existing = await db.select().from(workplaceAssignments)
        .where(and(
          eq(workplaceAssignments.workplaceId, req.params.id),
          eq(workplaceAssignments.workerUserId, workerUserId)
        ))
        .limit(1);

      if (existing.length > 0) {
        if (existing[0].status === "removed") {
          const [updated] = await db.update(workplaceAssignments)
            .set({ status: status || "active", notes, updatedAt: new Date() })
            .where(eq(workplaceAssignments.id, existing[0].id))
            .returning();
          res.json(updated);
          return;
        }
        res.status(400).json({ error: "Worker is already assigned to this workplace" });
        return;
      }

      const [newAssignment] = await db.insert(workplaceAssignments).values({
        workplaceId: req.params.id,
        workerUserId,
        status: status || "active",
        invitedByUserId: invitedByUserId || null,
        notes: notes || null,
      }).returning();

      res.json(newAssignment);
      broadcast({ type: "created", entity: "assignment", id: newAssignment.id, data: { workplaceId: req.params.id, workerUserId } });
    } catch (error) {
      console.error("Error inviting worker:", error);
      res.status(500).json({ error: "Failed to invite worker" });
    }
  });

  app.patch("/api/workplace-assignments/:id", checkRoles("admin", "hr"), async (req: Request, res: Response) => {
    try {
      const { status, notes } = req.body;

      const updateData: Record<string, unknown> = { updatedAt: new Date() };
      if (status !== undefined) updateData.status = status;
      if (notes !== undefined) updateData.notes = notes;
      if (status === "active" && !req.body.acceptedAt) {
        updateData.acceptedAt = new Date();
      }

      const [updatedAssignment] = await db.update(workplaceAssignments)
        .set(updateData)
        .where(eq(workplaceAssignments.id, req.params.id))
        .returning();

      if (!updatedAssignment) {
        res.status(404).json({ error: "Assignment not found" });
        return;
      }

      res.json(updatedAssignment);
      broadcast({ type: "updated", entity: "assignment", id: req.params.id });
    } catch (error) {
      console.error("Error updating assignment:", error);
      res.status(500).json({ error: "Failed to update assignment" });
    }
  });

  app.delete("/api/workplace-assignments/:id", checkRoles("admin"), async (req: Request, res: Response) => {
    try {
      const [deleted] = await db.delete(workplaceAssignments)
        .where(eq(workplaceAssignments.id, req.params.id))
        .returning();

      if (!deleted) {
        res.status(404).json({ error: "Assignment not found" });
        return;
      }

      res.json({ message: "Assignment deleted successfully" });
    } catch (error) {
      console.error("Error deleting assignment:", error);
      res.status(500).json({ error: "Failed to delete assignment" });
    }
  });

  // ========================================
  // Worker Self-Service API
  // ========================================

  app.get("/api/me/workplaces", async (req: Request, res: Response) => {
    try {
      const userId = req.headers["x-user-id"] as string;
      const role = req.headers["x-user-role"] as UserRole;

      if (!userId) {
        res.status(401).json({ error: "Authentication required" });
        return;
      }

      if (role !== "worker") {
        res.status(403).json({ error: "Only workers can access this endpoint" });
        return;
      }

      const myWorkplaces = await db.select({
        assignmentId: workplaceAssignments.id,
        status: workplaceAssignments.status,
        invitedAt: workplaceAssignments.invitedAt,
        acceptedAt: workplaceAssignments.acceptedAt,
        workplaceId: workplaces.id,
        workplaceName: workplaces.name,
        addressLine1: workplaces.addressLine1,
        city: workplaces.city,
        province: workplaces.province,
        postalCode: workplaces.postalCode,
        latitude: workplaces.latitude,
        longitude: workplaces.longitude,
        geofenceRadiusMeters: workplaces.geofenceRadiusMeters,
        isActive: workplaces.isActive,
      })
      .from(workplaceAssignments)
      .leftJoin(workplaces, eq(workplaceAssignments.workplaceId, workplaces.id))
      .where(and(
        eq(workplaceAssignments.workerUserId, userId),
        or(eq(workplaceAssignments.status, "active"), eq(workplaceAssignments.status, "invited"))
      ))
      .orderBy(desc(workplaceAssignments.invitedAt));

      res.json(myWorkplaces);
    } catch (error) {
      console.error("Error fetching worker workplaces:", error);
      res.status(500).json({ error: "Failed to fetch workplaces" });
    }
  });

  // ========================================
  // TITO API with GPS Validation
  // ========================================

  app.post("/api/tito/time-in", async (req: Request, res: Response) => {
    try {
      const userId = req.headers["x-user-id"] as string;
      const role = req.headers["x-user-role"] as UserRole;

      if (!userId) {
        res.status(401).json({ error: "Authentication required" });
        return;
      }

      if (role !== "worker") {
        res.status(403).json({ error: "Only workers can clock in" });
        return;
      }

      if (!checkTitoRateLimit(userId)) {
        res.status(429).json({ error: "Too many requests. Please wait before trying again.", errorCode: "RATE_LIMITED" });
        return;
      }

      const { workplaceId, gpsLat, gpsLng, shiftId } = req.body;

      if (!workplaceId) {
        res.status(400).json({ error: "workplaceId is required" });
        return;
      }

      // Single Active Session: check for ANY open record across ALL workplaces
      const anyOpenLogs = await db.select().from(titoLogs)
        .where(and(
          eq(titoLogs.workerId, userId),
          isNull(titoLogs.timeOut),
          ne(titoLogs.status, "canceled"),
        ))
        .limit(1);

      if (anyOpenLogs.length > 0) {
        const existing = anyOpenLogs[0];
        // If the open log is for the same workplace (and same shift if provided), return idempotent response
        if (existing.workplaceId === workplaceId && (!shiftId || existing.shiftId === shiftId)) {
          console.log(`[TITO] Idempotent clock-in: worker ${userId} already clocked in (titoLogId=${existing.id})`);
          res.json({
            success: true,
            message: "Already clocked in",
            titoLogId: existing.id,
            timeIn: existing.timeIn,
            distance: existing.timeInDistanceMeters ? Math.round(existing.timeInDistanceMeters) : null,
            gpsVerified: existing.timeInGpsVerified,
            alreadyClockedIn: true,
          });
          return;
        }
        // Otherwise, reject - they have an active session at a different workplace
        console.log(`[TITO] Rejected clock-in: worker ${userId} has active session at workplace ${existing.workplaceId} (titoLogId=${existing.id})`);
        res.status(409).json({
          error: "You already have an active clock-in session. Please clock out first.",
          errorCode: "ACTIVE_SESSION_EXISTS",
          existingTitoLogId: existing.id,
          existingWorkplaceId: existing.workplaceId,
        });
        return;
      }

      const [workplace] = await db.select().from(workplaces).where(eq(workplaces.id, workplaceId));
      if (!workplace) {
        res.status(404).json({ error: "Workplace not found", errorCode: "WORKPLACE_NOT_FOUND" });
        return;
      }

      if (!workplace.isActive) {
        res.status(400).json({ error: "Workplace is not active", errorCode: "WORKPLACE_INACTIVE" });
        return;
      }

      const assignment = await db.select().from(workplaceAssignments)
        .where(and(
          eq(workplaceAssignments.workplaceId, workplaceId),
          eq(workplaceAssignments.workerUserId, userId),
          eq(workplaceAssignments.status, "active")
        ))
        .limit(1);

      if (assignment.length === 0) {
        res.status(403).json({ error: "You are not assigned to this workplace", errorCode: "NOT_ASSIGNED" });
        return;
      }

      if (!shiftId) {
        res.status(400).json({ error: "shiftId is required. You must clock in against a scheduled shift.", errorCode: "NO_SHIFT_ID" });
        return;
      }

      const [shiftRow] = await db.select().from(shifts).where(eq(shifts.id, shiftId));
      if (!shiftRow) {
        res.status(404).json({ error: "Shift not found", errorCode: "SHIFT_NOT_FOUND" });
        return;
      }
      const isAssignedWorker = shiftRow.workerUserId === userId;
      const [acceptedOffer] = isAssignedWorker
        ? [{ id: "assigned" }]
        : await db.select({ id: shiftOffers.id }).from(shiftOffers)
            .where(and(
              eq(shiftOffers.shiftId, shiftId),
              eq(shiftOffers.workerId, userId),
              eq(shiftOffers.status, "accepted")
            ))
            .limit(1);

      if (!isAssignedWorker && !acceptedOffer) {
        res.status(403).json({
          error: "You must have an accepted shift offer to clock in for this shift",
          errorCode: "NO_ACCEPTED_OFFER",
        });
        return;
      }

      // Shift-bound clock-in window validation
      {
        const now = new Date();
        const [sH, sM] = shiftRow.startTime.split(":").map(Number);
        const shiftStart = new Date(shiftRow.date + "T00:00:00");
        shiftStart.setHours(sH, sM, 0, 0);

        const windowOpen = new Date(shiftStart.getTime() - 15 * 60 * 1000);

        let windowClose: Date;
        if (shiftRow.endTime) {
          const [eH, eM] = shiftRow.endTime.split(":").map(Number);
          const shiftEnd = new Date(shiftRow.date + "T00:00:00");
          shiftEnd.setHours(eH, eM, 0, 0);
          if (shiftEnd <= shiftStart) {
            shiftEnd.setDate(shiftEnd.getDate() + 1);
          }
          windowClose = new Date(shiftEnd.getTime() + 30 * 60 * 1000);
        } else {
          windowClose = new Date(shiftStart.getTime() + 24 * 60 * 60 * 1000);
        }

        if (now < windowOpen || now > windowClose) {
          const fmtTime = (d: Date) => d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: true, timeZone: "America/Toronto" });
          res.status(400).json({
            error: "Clock-in is only allowed during your scheduled shift window.",
            errorCode: "OUTSIDE_SHIFT_WINDOW",
            windowOpen: windowOpen.toISOString(),
            windowClose: windowClose.toISOString(),
            windowDescription: `Clock-in available ${fmtTime(windowOpen)} - ${fmtTime(windowClose)}`,
          });
          return;
        }
      }

      if (workplace.latitude === null || workplace.longitude === null) {
        res.status(400).json({ error: "Workplace coordinates not configured. Contact admin." });
        return;
      }

      if (gpsLat === undefined || gpsLng === undefined) {
        res.status(400).json({ error: "Location permission required for TITO. Please enable GPS.", errorCode: "NO_GPS" });
        return;
      }

      const distance = haversineDistance(gpsLat, gpsLng, workplace.latitude, workplace.longitude);
      const radius = workplace.geofenceRadiusMeters || 150;
      const isWithinRadius = distance <= radius;

      if (!isWithinRadius) {
        const [titoLog] = await db.insert(titoLogs).values({
          workerId: userId,
          workplaceId,
          shiftId: shiftId,
          timeIn: new Date(),
          timeInGpsLat: gpsLat,
          timeInGpsLng: gpsLng,
          timeInDistanceMeters: distance,
          timeInGpsVerified: false,
          timeInGpsFailureReason: `Outside geofence: ${Math.round(distance)}m from workplace (max ${radius}m)`,
          status: "pending",
        }).returning();

        res.status(400).json({ 
          error: `You are not within the required GPS radius of the workplace. You are ${Math.round(distance)}m away, but must be within ${radius}m.`,
          errorCode: "TOO_FAR",
          distance: Math.round(distance),
          maxRadius: radius,
          titoLogId: titoLog.id,
          gpsVerified: false,
        });
        return;
      }

      const [titoLog] = await db.insert(titoLogs).values({
        workerId: userId,
        workplaceId,
        shiftId: shiftId,
        timeIn: new Date(),
        timeInGpsLat: gpsLat,
        timeInGpsLng: gpsLng,
        timeInDistanceMeters: distance,
        timeInGpsVerified: true,
        status: "pending",
      }).returning();

      await db.insert(auditLog).values({
        userId,
        action: "CLOCK_IN",
        entityType: "tito_log",
        entityId: titoLog.id,
        details: JSON.stringify({ workplaceId, shiftId, distance: Math.round(distance), gpsVerified: true }),
      });

      res.json({
        success: true,
        message: "Successfully clocked in",
        titoLogId: titoLog.id,
        timeIn: titoLog.timeIn,
        distance: Math.round(distance),
        gpsVerified: true,
      });

      try {
        const [worker] = await db.select({ fullName: users.fullName }).from(users).where(eq(users.id, userId));
        const workerName = worker?.fullName || "Worker";
        const nowToronto = new Date(new Date().toLocaleString("en-US", { timeZone: "America/Toronto" }));
        const currentHour = nowToronto.getHours();
        const hrAdmins = await db.select({ id: users.id }).from(users).where(
          and(inArray(users.role, ["admin", "hr"]), eq(users.isActive, true))
        );
        const hrAdminIds = hrAdmins.map(u => u.id);

        let isLate = false;
        if (shiftId) {
          const [shiftRow] = await db.select({ startTime: shifts.startTime, date: shifts.date }).from(shifts).where(eq(shifts.id, shiftId));
          if (shiftRow?.startTime && shiftRow?.date) {
            const [h, m] = shiftRow.startTime.split(":").map(Number);
            const shiftStart = new Date(shiftRow.date + "T00:00:00");
            shiftStart.setHours(h, m, 0, 0);
            const lateMinutes = Math.round((Date.now() - shiftStart.getTime()) / 60000);
            if (lateMinutes > 10) {
              isLate = true;
              await db.update(titoLogs)
                .set({ flaggedLate: true, lateMinutes: lateMinutes })
                .where(eq(titoLogs.id, titoLog.id));
              const lateMsg = `${workerName} clocked in ${lateMinutes} min late for shift at ${workplace.name}`;
              await db.insert(appNotifications).values({
                userId,
                type: "late_clock_in",
                title: "Late Clock-In Recorded",
                body: `You clocked in ${lateMinutes} minutes after your shift start time at ${workplace.name}.`,
              });
              sendPushNotifications([userId], "Late Clock-In", `You clocked in ${lateMinutes} min late at ${workplace.name}.`);
              for (const uid of hrAdminIds) {
                await db.insert(appNotifications).values({
                  userId: uid,
                  type: "late_clock_in",
                  title: "Late Clock-In Alert",
                  body: lateMsg,
                });
              }
              if (hrAdminIds.length > 0) {
                sendPushNotifications(hrAdminIds, "Late Clock-In Alert", lateMsg);
              }
              await db.insert(auditLog).values({
                userId: userId,
                action: "LATE_CLOCKIN",
                entityType: "tito_log",
                entityId: titoLog.id,
                details: JSON.stringify({ lateMinutes, shiftId, workplaceId, workerName }),
              });
            }
          }
        }

        if (currentHour < 5 || currentHour >= 23) {
          const unusualMsg = `${workerName} clocked in at unusual hours (${nowToronto.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}) at ${workplace.name}`;
          if (!isLate) {
            await db.insert(appNotifications).values({
              userId,
              type: "unusual_hours",
              title: "Unusual Hours Clock-In",
              body: `You clocked in outside normal hours at ${workplace.name}.`,
            });
            sendPushNotifications([userId], "Unusual Hours", `You clocked in at an unusual time at ${workplace.name}.`);
          }
          for (const uid of hrAdminIds) {
            await db.insert(appNotifications).values({
              userId: uid,
              type: "unusual_hours",
              title: "Unusual Hours Alert",
              body: unusualMsg,
            });
          }
          if (hrAdminIds.length > 0) {
            sendPushNotifications(hrAdminIds, "Unusual Hours Alert", unusualMsg);
          }
        }
      } catch (notifErr) {
        console.error("Late/unusual notification error (non-blocking):", notifErr);
      }

    } catch (error) {
      console.error("Error clocking in:", error);
      res.status(500).json({ error: "Failed to clock in" });
    }
  });

  app.post("/api/tito/:id/late-reason", async (req: Request, res: Response) => {
    try {
      const userId = req.headers["x-user-id"] as string;
      const titoLogId = req.params.id;
      const { lateReason, lateNote } = req.body;

      if (!lateReason) {
        res.status(400).json({ error: "lateReason is required" });
        return;
      }

      const [log] = await db.select().from(titoLogs).where(eq(titoLogs.id, titoLogId));
      if (!log) {
        res.status(404).json({ error: "TITO log not found" });
        return;
      }

      if (log.workerId !== userId) {
        res.status(403).json({ error: "Not your TITO log" });
        return;
      }

      await db.update(titoLogs)
        .set({ lateReason, lateNote: lateNote || null, updatedAt: new Date() })
        .where(eq(titoLogs.id, titoLogId));

      res.json({ success: true });
    } catch (error) {
      console.error("Error updating late reason:", error);
      res.status(500).json({ error: "Failed to update late reason" });
    }
  });

  app.post("/api/tito/time-out", async (req: Request, res: Response) => {
    try {
      const userId = req.headers["x-user-id"] as string;
      const role = req.headers["x-user-role"] as UserRole;

      if (!userId) {
        res.status(401).json({ error: "Authentication required" });
        return;
      }

      if (role !== "worker") {
        res.status(403).json({ error: "Only workers can clock out" });
        return;
      }

      if (!checkTitoRateLimit(userId)) {
        res.status(429).json({ error: "Too many requests. Please wait before trying again.", errorCode: "RATE_LIMITED" });
        return;
      }

      const { titoLogId, gpsLat, gpsLng } = req.body;

      if (!titoLogId) {
        res.status(400).json({ error: "titoLogId is required" });
        return;
      }

      const [titoLog] = await db.select().from(titoLogs).where(eq(titoLogs.id, titoLogId));
      if (!titoLog) {
        res.status(404).json({ error: "TITO record not found" });
        return;
      }

      if (titoLog.workerId !== userId) {
        res.status(403).json({ error: "You can only clock out of your own shift" });
        return;
      }

      // Prevent Double Clock-Out: if already clocked out, return existing data with flag
      if (titoLog.timeOut) {
        console.log(`[TITO] Double clock-out prevented: worker ${userId} already clocked out (titoLogId=${titoLog.id})`);
        const totalMs = new Date(titoLog.timeOut).getTime() - new Date(titoLog.timeIn!).getTime();
        const totalHours = Math.max(0, parseFloat((totalMs / 3600000).toFixed(2)));
        res.json({
          success: true,
          message: "Already clocked out",
          titoLogId: titoLog.id,
          timeIn: titoLog.timeIn,
          timeOut: titoLog.timeOut,
          totalHours,
          gpsVerified: titoLog.timeOutGpsVerified,
          flaggedForReview: titoLog.status === "flagged",
          alreadyClockedOut: true,
        });
        return;
      }

      if (!titoLog.timeIn) {
        res.status(400).json({ error: "Cannot clock out without a clock-in time" });
        return;
      }

      // Minimum Duration: reject clock-out if < 60 seconds since clock-in
      const elapsedSeconds = (Date.now() - new Date(titoLog.timeIn).getTime()) / 1000;
      if (elapsedSeconds < 60) {
        const remainingSeconds = Math.ceil(60 - elapsedSeconds);
        res.status(400).json({
          error: "Minimum shift duration is 1 minute.",
          errorCode: "MIN_DURATION",
          remainingSeconds,
        });
        return;
      }

      // Shift-bound clock-out window validation
      if (titoLog.shiftId) {
        const [clockOutShift] = await db.select().from(shifts).where(eq(shifts.id, titoLog.shiftId));
        if (clockOutShift) {
          const now = new Date();
          const [sH, sM] = clockOutShift.startTime.split(":").map(Number);
          const shiftStart = new Date(clockOutShift.date + "T00:00:00");
          shiftStart.setHours(sH, sM, 0, 0);

          let windowClose: Date;
          if (clockOutShift.endTime) {
            const [eH, eM] = clockOutShift.endTime.split(":").map(Number);
            const shiftEnd = new Date(clockOutShift.date + "T00:00:00");
            shiftEnd.setHours(eH, eM, 0, 0);
            if (shiftEnd <= shiftStart) {
              shiftEnd.setDate(shiftEnd.getDate() + 1);
            }
            windowClose = new Date(shiftEnd.getTime() + 30 * 60 * 1000);
          } else {
            windowClose = new Date(shiftStart.getTime() + 24 * 60 * 60 * 1000);
          }

          if (now < shiftStart || now > windowClose) {
            const fmtTime = (d: Date) => d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: true, timeZone: "America/Toronto" });
            res.status(400).json({
              error: "Clock-out must occur within your scheduled shift window.",
              errorCode: "OUTSIDE_SHIFT_WINDOW",
              windowDescription: `Clock-out allowed ${fmtTime(shiftStart)} - ${fmtTime(windowClose)}`,
            });
            return;
          }
        }
      }

      const [workplace] = titoLog.workplaceId
        ? await db.select().from(workplaces).where(eq(workplaces.id, titoLog.workplaceId))
        : [null];

      const hasGps = gpsLat != null && gpsLng != null && (gpsLat !== 0 || gpsLng !== 0);
      const hasWorkplaceCoords = workplace?.latitude != null && workplace?.longitude != null;

      let distance: number | null = null;
      let isWithinRadius = false;
      if (hasGps && hasWorkplaceCoords) {
        distance = haversineDistance(gpsLat, gpsLng, workplace!.latitude!, workplace!.longitude!);
        const radius = workplace!.geofenceRadiusMeters || 150;
        isWithinRadius = distance <= radius;
      }

      const isFlagged = hasGps && hasWorkplaceCoords && !isWithinRadius;
      const clockOutTime = new Date();

      const [updated] = await db.update(titoLogs)
        .set({
          timeOut: clockOutTime,
          timeOutGpsLat: hasGps ? gpsLat : null,
          timeOutGpsLng: hasGps ? gpsLng : null,
          timeOutDistanceMeters: distance,
          timeOutGpsVerified: hasGps ? isWithinRadius : false,
          timeOutGpsFailureReason: !hasGps
            ? "GPS unavailable at clock-out"
            : isFlagged
            ? `Outside geofence: ${Math.round(distance!)}m from workplace (max ${workplace!.geofenceRadiusMeters || 150}m)`
            : null,
          status: isFlagged || !hasGps ? "flagged" : undefined,
          updatedAt: new Date(),
        })
        .where(eq(titoLogs.id, titoLogId))
        .returning();

      // Calculate hours (server time as source of truth)
      const totalMs = clockOutTime.getTime() - new Date(titoLog.timeIn).getTime();
      const totalHours = Math.max(0, parseFloat((totalMs / 3600000).toFixed(2)));

      // Auto-create timesheet entry atomically
      let timesheetEntryCreated = false;
      try {
        const clockInDate = new Date(titoLog.timeIn);
        const dateLocalStr = clockInDate.toLocaleDateString("en-CA", { timeZone: "America/Toronto" });
        const payPeriod = getCurrentPayPeriod(new Date(dateLocalStr + "T12:00:00"));

        if (payPeriod && totalHours > 0) {
          const [existingTimesheet] = await db.select().from(timesheets)
            .where(and(
              eq(timesheets.workerUserId, userId),
              eq(timesheets.periodYear, payPeriod.year),
              eq(timesheets.periodNumber, payPeriod.periodNumber),
            ));

          let timesheetId: string;
          if (existingTimesheet) {
            timesheetId = existingTimesheet.id;
          } else {
            const [newTimesheet] = await db.insert(timesheets).values({
              workerUserId: userId,
              periodYear: payPeriod.year,
              periodNumber: payPeriod.periodNumber,
              status: "draft",
            }).returning();
            timesheetId = newTimesheet.id;
          }

          const defaultPayRate = 18.00;
          const amount = parseFloat((totalHours * defaultPayRate).toFixed(2));

          const existingEntry = await db.select().from(timesheetEntries)
            .where(eq(timesheetEntries.titoLogId, titoLogId))
            .limit(1);

          if (existingEntry.length === 0) {
            await db.insert(timesheetEntries).values({
              timesheetId,
              workplaceId: titoLog.workplaceId || null,
              titoLogId: titoLogId,
              dateLocal: dateLocalStr,
              timeInUtc: titoLog.timeIn,
              timeOutUtc: clockOutTime,
              hours: totalHours.toString(),
              payRate: defaultPayRate.toString(),
              amount: amount.toString(),
              notes: isFlagged ? "Flagged: clock-out outside geofence" : (!hasGps ? "GPS unavailable at clock-out" : null),
            });
            timesheetEntryCreated = true;

            // Recalculate timesheet totals
            const allEntries = await db.select({
              hours: timesheetEntries.hours,
              amount: timesheetEntries.amount,
            }).from(timesheetEntries).where(eq(timesheetEntries.timesheetId, timesheetId));

            const totalTimesheetHours = allEntries.reduce((sum, e) => sum + parseFloat(e.hours), 0);
            const totalTimesheetPay = allEntries.reduce((sum, e) => sum + parseFloat(e.amount), 0);

            await db.update(timesheets)
              .set({
                totalHours: totalTimesheetHours.toFixed(2),
                totalPay: totalTimesheetPay.toFixed(2),
                updatedAt: new Date(),
              })
              .where(eq(timesheets.id, timesheetId));

            console.log(`[TIMESHEET] Auto-created entry: worker=${userId}, titoLog=${titoLogId}, hours=${totalHours}, amount=${amount}, period=${payPeriod.year}-${payPeriod.periodNumber}`);
          }
        } else {
          console.warn(`[TIMESHEET] No pay period found for date ${dateLocalStr} or zero hours (${totalHours}h). Skipping auto-timesheet.`);
        }
      } catch (tsError) {
        console.error(`[TIMESHEET] Failed to auto-create timesheet entry for titoLog ${titoLogId}:`, tsError);
      }

      await db.insert(auditLog).values({
        userId,
        action: "CLOCK_OUT",
        entityType: "tito_log",
        entityId: titoLogId,
        details: JSON.stringify({
          workplaceId: titoLog.workplaceId,
          shiftId: titoLog.shiftId,
          timeIn: titoLog.timeIn,
          timeOut: clockOutTime,
          totalHours,
          gpsVerified: isWithinRadius,
          flagged: isFlagged || !hasGps,
          timesheetEntryCreated,
        }),
      });

      res.json({
        success: true,
        message: isWithinRadius ? "Successfully clocked out" : "Clocked out (flagged for admin review)",
        titoLogId: updated.id,
        timeIn: updated.timeIn,
        timeOut: updated.timeOut,
        totalHours,
        distance: distance != null ? Math.round(distance) : null,
        gpsVerified: isWithinRadius,
        flaggedForReview: isFlagged || !hasGps,
        timesheetEntryCreated,
      });

      try {
        const [worker] = await db.select({ fullName: users.fullName }).from(users).where(eq(users.id, userId));
        const workerName = worker?.fullName || "Worker";
        const nowToronto = new Date(new Date().toLocaleString("en-US", { timeZone: "America/Toronto" }));
        const currentHour = nowToronto.getHours();

        const wpName = workplace?.name || "work site";

        if (currentHour < 5 || currentHour >= 23) {
          const hrAdmins = await db.select({ id: users.id }).from(users).where(
            and(inArray(users.role, ["admin", "hr"]), eq(users.isActive, true))
          );
          const hrAdminIds = hrAdmins.map(u => u.id);
          const unusualMsg = `${workerName} clocked out at unusual hours (${nowToronto.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}) at ${wpName}`;

          await db.insert(appNotifications).values({
            userId,
            type: "unusual_hours",
            title: "Unusual Hours Clock-Out",
            body: `You clocked out outside normal hours at ${wpName}.`,
          });
          sendPushNotifications([userId], "Unusual Hours", `You clocked out at an unusual time at ${wpName}.`);

          for (const uid of hrAdminIds) {
            await db.insert(appNotifications).values({
              userId: uid,
              type: "unusual_hours",
              title: "Unusual Hours Alert",
              body: unusualMsg,
            });
          }
          if (hrAdminIds.length > 0) {
            sendPushNotifications(hrAdminIds, "Unusual Hours Alert", unusualMsg);
          }
        }

        if (isFlagged && distance != null) {
          const hrAdmins2 = await db.select({ id: users.id }).from(users).where(
            and(inArray(users.role, ["admin", "hr"]), eq(users.isActive, true))
          );
          const hrAdminIds2 = hrAdmins2.map(u => u.id);
          const flaggedMsg = `${workerName} clocked out ${Math.round(distance)}m away from ${wpName} (max ${workplace?.geofenceRadiusMeters || 150}m). Flagged for review.`;
          for (const uid of hrAdminIds2) {
            await db.insert(appNotifications).values({
              userId: uid,
              type: "flagged_clock_out",
              title: "Flagged Clock-Out",
              body: flaggedMsg,
            });
          }
          if (hrAdminIds2.length > 0) {
            sendPushNotifications(hrAdminIds2, "Flagged Clock-Out", flaggedMsg);
          }
        }
      } catch (notifErr) {
        console.error("Clock-out notification error (non-blocking):", notifErr);
      }

    } catch (error) {
      console.error("Error clocking out:", error);
      res.status(500).json({ error: "Failed to clock out" });
    }
  });

  app.get("/api/tito/my-logs", async (req: Request, res: Response) => {
    try {
      const userId = req.headers["x-user-id"] as string;
      const role = req.headers["x-user-role"] as string;

      if (!userId) {
        res.status(401).json({ error: "Authentication required" });
        return;
      }

      const isAdmin = role === "admin" || role === "hr" || role === "client";

      const baseSelect = {
        id: titoLogs.id,
        workerId: titoLogs.workerId,
        workplaceId: titoLogs.workplaceId,
        shiftId: titoLogs.shiftId,
        timeIn: titoLogs.timeIn,
        timeOut: titoLogs.timeOut,
        timeInGpsVerified: titoLogs.timeInGpsVerified,
        timeOutGpsVerified: titoLogs.timeOutGpsVerified,
        timeInDistanceMeters: titoLogs.timeInDistanceMeters,
        timeOutDistanceMeters: titoLogs.timeOutDistanceMeters,
        status: titoLogs.status,
        approvedBy: titoLogs.approvedBy,
        approvedAt: titoLogs.approvedAt,
        disputedBy: titoLogs.disputedBy,
        disputedAt: titoLogs.disputedAt,
        notes: titoLogs.notes,
        flaggedLate: titoLogs.flaggedLate,
        lateMinutes: titoLogs.lateMinutes,
        lateReason: titoLogs.lateReason,
        createdAt: titoLogs.createdAt,
        workplaceName: workplaces.name,
        workerName: users.fullName,
        shiftDate: shifts.date,
        shiftTitle: shifts.title,
      };

      let query;
      if (isAdmin) {
        query = db.select(baseSelect)
          .from(titoLogs)
          .leftJoin(workplaces, eq(titoLogs.workplaceId, workplaces.id))
          .leftJoin(users, eq(titoLogs.workerId, users.id))
          .leftJoin(shifts, eq(titoLogs.shiftId, shifts.id))
          .orderBy(desc(titoLogs.createdAt))
          .limit(100);
      } else {
        query = db.select(baseSelect)
          .from(titoLogs)
          .leftJoin(workplaces, eq(titoLogs.workplaceId, workplaces.id))
          .leftJoin(users, eq(titoLogs.workerId, users.id))
          .leftJoin(shifts, eq(titoLogs.shiftId, shifts.id))
          .where(eq(titoLogs.workerId, userId))
          .orderBy(desc(titoLogs.createdAt))
          .limit(50);
      }

      const logs = await query;

      const logIds = logs.map(l => l.id);
      let correctedLogIds = new Set<string>();
      if (logIds.length > 0) {
        const corrections = await db.select({ titoLogId: titoCorrections.titoLogId })
          .from(titoCorrections)
          .where(and(
            inArray(titoCorrections.titoLogId, logIds),
            eq(titoCorrections.status, "approved"),
          ));
        correctedLogIds = new Set(corrections.map(c => c.titoLogId));
      }

      const formattedLogs = logs.map(log => ({
        id: log.id,
        shiftId: log.shiftId || "",
        workerId: log.workerId,
        workerName: log.workerName || "Unknown Worker",
        timeIn: log.timeIn ? new Date(log.timeIn).toISOString() : undefined,
        timeOut: log.timeOut ? new Date(log.timeOut).toISOString() : undefined,
        timeInLocation: log.workplaceName || undefined,
        timeOutLocation: log.workplaceName || undefined,
        timeInDistance: log.timeInDistanceMeters ? Math.round(log.timeInDistanceMeters) : undefined,
        timeOutDistance: log.timeOutDistanceMeters ? Math.round(log.timeOutDistanceMeters) : undefined,
        verificationMethod: (log.timeInGpsVerified || log.timeOutGpsVerified) ? "gps" : "manual",
        approvedBy: log.approvedBy || undefined,
        approvedAt: log.approvedAt ? new Date(log.approvedAt).toISOString() : undefined,
        disputedBy: log.disputedBy || undefined,
        disputedAt: log.disputedAt ? new Date(log.disputedAt).toISOString() : undefined,
        status: log.status as "pending" | "approved" | "disputed" | "canceled" | "flagged",
        shiftDate: log.shiftDate || (log.timeIn ? new Date(log.timeIn).toLocaleDateString("en-CA", { timeZone: "America/Toronto" }) : new Date().toLocaleDateString("en-CA")),
        createdAt: log.createdAt ? new Date(log.createdAt).toISOString() : new Date().toISOString(),
        notes: log.notes || undefined,
        flaggedLate: log.flaggedLate || false,
        lateMinutes: log.lateMinutes || undefined,
        lateReason: log.lateReason || undefined,
        corrected: correctedLogIds.has(log.id),
        cancelReason: log.status === "canceled" ? (log.notes || "Accidental clock-in") : undefined,
        totalHours: log.timeIn && log.timeOut
          ? parseFloat(((new Date(log.timeOut).getTime() - new Date(log.timeIn).getTime()) / 3600000).toFixed(2))
          : undefined,
      }));

      res.json(formattedLogs);
    } catch (error) {
      console.error("Error fetching TITO logs:", error);
      res.status(500).json({ error: "Failed to fetch TITO logs" });
    }
  });

  app.post("/api/tito/email-timesheet", checkRoles("admin", "hr"), async (req: Request, res: Response) => {
    try {
      const { to, subject } = req.body;

      if (!to || typeof to !== "string" || !to.includes("@")) {
        res.status(400).json({ error: "Valid email address is required" });
        return;
      }

      const logs = await db.select({
        id: titoLogs.id,
        workerId: titoLogs.workerId,
        workerName: users.fullName,
        workplaceName: workplaces.name,
        shiftDate: shifts.date,
        shiftTitle: shifts.title,
        timeIn: titoLogs.timeIn,
        timeOut: titoLogs.timeOut,
        status: titoLogs.status,
      })
      .from(titoLogs)
      .leftJoin(users, eq(titoLogs.workerId, users.id))
      .leftJoin(workplaces, eq(titoLogs.workplaceId, workplaces.id))
      .leftJoin(shifts, eq(titoLogs.shiftId, shifts.id))
      .where(ne(titoLogs.status, "canceled"))
      .orderBy(desc(titoLogs.createdAt))
      .limit(500);

      const csvLines = [
        "Worker Name,Workplace,Shift Date,Time In,Time Out,Hours,Status",
        ...logs.map(log => {
          const timeIn = log.timeIn ? new Date(log.timeIn) : null;
          const timeOut = log.timeOut ? new Date(log.timeOut) : null;
          const hours = timeIn && timeOut
            ? ((timeOut.getTime() - timeIn.getTime()) / 3600000).toFixed(2)
            : "";
          const formatTime = (d: Date | null) => d ? d.toLocaleString("en-CA", { timeZone: "America/Toronto" }) : "";
          return `"${log.workerName || ""}","${log.workplaceName || ""}","${log.shiftDate || ""}","${formatTime(timeIn)}","${formatTime(timeOut)}",${hours},"${log.status}"`;
        })
      ];

      const csvContent = csvLines.join("\n");
      const now = new Date().toISOString().split("T")[0];
      const filename = `tito-timesheet-${now}.csv`;
      const emailSubject = subject || `WFConnect TITO Timesheet - ${now}`;
      const bodyText = `Please find attached the TITO timesheet report.\n\nThis report includes ${logs.length} time log(s).\n\n- WFConnect`;

      const result = await sendCSVEmail(to, emailSubject, bodyText, csvContent, filename);

      if (result.success) {
        res.json({ success: true, message: `Timesheet emailed to ${to}` });
      } else {
        res.status(500).json({ error: result.error || "Failed to send email" });
      }
    } catch (error) {
      console.error("Error emailing TITO timesheet:", error);
      res.status(500).json({ error: "Failed to email timesheet" });
    }
  });

  app.post("/api/tito/:id/approve", checkRoles("admin", "hr", "client"), async (req: Request, res: Response) => {
    try {
      const titoLogId = req.params.id;
      const userId = req.headers["x-user-id"] as string;

      const [log] = await db.select().from(titoLogs).where(eq(titoLogs.id, titoLogId));
      if (!log) {
        res.status(404).json({ error: "TITO log not found" });
        return;
      }

      await db.update(titoLogs)
        .set({ status: "approved", approvedBy: userId, approvedAt: new Date(), updatedAt: new Date() })
        .where(eq(titoLogs.id, titoLogId));

      await db.insert(auditLog).values({
        userId,
        action: "TITO_APPROVED",
        entityType: "tito_log",
        entityId: titoLogId,
        details: JSON.stringify({ workerId: log.workerId, previousStatus: log.status }),
      });

      res.json({ success: true, message: "TITO log approved" });
    } catch (error) {
      console.error("Error approving TITO log:", error);
      res.status(500).json({ error: "Failed to approve TITO log" });
    }
  });

  app.post("/api/tito/:id/dispute", checkRoles("admin", "hr", "client"), async (req: Request, res: Response) => {
    try {
      const titoLogId = req.params.id;
      const userId = req.headers["x-user-id"] as string;
      const { reason } = req.body;

      const [log] = await db.select().from(titoLogs).where(eq(titoLogs.id, titoLogId));
      if (!log) {
        res.status(404).json({ error: "TITO log not found" });
        return;
      }

      await db.update(titoLogs)
        .set({ status: "disputed", disputedBy: userId, disputedAt: new Date(), notes: reason || null, updatedAt: new Date() })
        .where(eq(titoLogs.id, titoLogId));

      await db.insert(auditLog).values({
        userId,
        action: "TITO_DISPUTED",
        entityType: "tito_log",
        entityId: titoLogId,
        details: JSON.stringify({ workerId: log.workerId, previousStatus: log.status, reason }),
      });

      res.json({ success: true, message: "TITO log disputed" });
    } catch (error) {
      console.error("Error disputing TITO log:", error);
      res.status(500).json({ error: "Failed to dispute TITO log" });
    }
  });

  app.post("/api/tito/:id/cancel", async (req: Request, res: Response) => {
    try {
      const userId = req.headers["x-user-id"] as string;
      const titoLogId = req.params.id;

      if (!userId) {
        res.status(401).json({ error: "Authentication required" });
        return;
      }

      const [log] = await db.select().from(titoLogs).where(eq(titoLogs.id, titoLogId));
      if (!log) {
        res.status(404).json({ error: "TITO log not found" });
        return;
      }

      if (log.workerId !== userId) {
        res.status(403).json({ error: "You can only cancel your own clock-in" });
        return;
      }

      if (log.timeOut) {
        res.status(400).json({ error: "Cannot cancel a completed clock-in/out record" });
        return;
      }

      if (log.status === "canceled") {
        res.json({ success: true, message: "Already canceled", alreadyCanceled: true });
        return;
      }

      const clockInTime = log.timeIn ? new Date(log.timeIn).getTime() : 0;
      const elapsed = Date.now() - clockInTime;
      const twoMinutes = 2 * 60 * 1000;
      if (elapsed > twoMinutes) {
        res.status(400).json({ error: "Cancel window has expired. You can only cancel within 2 minutes of clocking in." });
        return;
      }

      await db.update(titoLogs)
        .set({ status: "canceled", notes: "Accidental clock-in", updatedAt: new Date() })
        .where(eq(titoLogs.id, titoLogId));

      await db.insert(auditLog).values({
        userId,
        action: "TITO_CANCELED",
        entityType: "tito_log",
        entityId: titoLogId,
        details: JSON.stringify({ reason: "Accidental clock-in", elapsedMs: elapsed }),
      });

      console.log(`[TITO] Clock-in canceled: worker ${userId}, titoLogId=${titoLogId}, elapsed=${Math.round(elapsed / 1000)}s`);
      res.json({ success: true, message: "Clock-in canceled" });
    } catch (error) {
      console.error("Error canceling TITO log:", error);
      res.status(500).json({ error: "Failed to cancel clock-in" });
    }
  });

  app.post("/api/tito/:id/correction", async (req: Request, res: Response) => {
    try {
      const userId = req.headers["x-user-id"] as string;
      const titoLogId = req.params.id;
      const { reason, note } = req.body;

      if (!userId) {
        res.status(401).json({ error: "Authentication required" });
        return;
      }

      if (!reason) {
        res.status(400).json({ error: "Reason is required for correction requests" });
        return;
      }

      const [log] = await db.select().from(titoLogs).where(eq(titoLogs.id, titoLogId));
      if (!log) {
        res.status(404).json({ error: "TITO log not found" });
        return;
      }

      if (log.workerId !== userId) {
        res.status(403).json({ error: "You can only request corrections for your own records" });
        return;
      }

      const existingPending = await db.select().from(titoCorrections)
        .where(and(
          eq(titoCorrections.titoLogId, titoLogId),
          eq(titoCorrections.status, "pending"),
        ))
        .limit(1);

      if (existingPending.length > 0) {
        res.status(400).json({ error: "A correction request is already pending for this record" });
        return;
      }

      const [correction] = await db.insert(titoCorrections).values({
        titoLogId,
        requesterId: userId,
        originalTimeIn: log.timeIn,
        originalTimeOut: log.timeOut,
        reason,
        note: note || null,
        status: "pending",
      }).returning();

      await db.insert(auditLog).values({
        userId,
        action: "TITO_CORRECTION_REQUESTED",
        entityType: "tito_correction",
        entityId: correction.id,
        details: JSON.stringify({ titoLogId, reason, note }),
      });

      const hrAdmins = await db.select({ id: users.id }).from(users).where(
        and(inArray(users.role, ["admin", "hr"]), eq(users.isActive, true))
      );
      for (const admin of hrAdmins) {
        await db.insert(appNotifications).values({
          userId: admin.id,
          type: "tito_correction",
          title: "TITO Correction Request",
          body: `A worker has requested a time correction: ${reason}`,
        });
      }

      console.log(`[TITO] Correction requested: worker ${userId}, titoLogId=${titoLogId}, correctionId=${correction.id}`);
      res.json({ success: true, correctionId: correction.id });
    } catch (error) {
      console.error("Error requesting TITO correction:", error);
      res.status(500).json({ error: "Failed to submit correction request" });
    }
  });

  app.post("/api/tito/corrections/:id/review", checkRoles("admin", "hr"), async (req: Request, res: Response) => {
    try {
      const userId = req.headers["x-user-id"] as string;
      const correctionId = req.params.id;
      const { action, correctedTimeIn, correctedTimeOut } = req.body;

      if (!action || !["approved", "rejected"].includes(action)) {
        res.status(400).json({ error: "action must be 'approved' or 'rejected'" });
        return;
      }

      const [correction] = await db.select().from(titoCorrections).where(eq(titoCorrections.id, correctionId));
      if (!correction) {
        res.status(404).json({ error: "Correction request not found" });
        return;
      }

      if (correction.status !== "pending") {
        res.status(400).json({ error: "This correction has already been reviewed" });
        return;
      }

      const updateData: any = {
        status: action,
        approverId: userId,
        reviewedAt: new Date(),
      };

      if (action === "approved") {
        if (correctedTimeIn) updateData.correctedTimeIn = new Date(correctedTimeIn);
        if (correctedTimeOut) updateData.correctedTimeOut = new Date(correctedTimeOut);

        const titoUpdate: any = { updatedAt: new Date() };
        if (correctedTimeIn) titoUpdate.timeIn = new Date(correctedTimeIn);
        if (correctedTimeOut) titoUpdate.timeOut = new Date(correctedTimeOut);

        await db.update(titoLogs).set(titoUpdate).where(eq(titoLogs.id, correction.titoLogId));
      }

      await db.update(titoCorrections).set(updateData).where(eq(titoCorrections.id, correctionId));

      await db.insert(auditLog).values({
        userId,
        action: action === "approved" ? "TITO_CORRECTION_APPROVED" : "TITO_CORRECTION_REJECTED",
        entityType: "tito_correction",
        entityId: correctionId,
        details: JSON.stringify({ titoLogId: correction.titoLogId, correctedTimeIn, correctedTimeOut }),
      });

      await db.insert(appNotifications).values({
        userId: correction.requesterId,
        type: "tito_correction",
        title: `Correction ${action === "approved" ? "Approved" : "Rejected"}`,
        body: action === "approved"
          ? "Your time correction request has been approved."
          : "Your time correction request has been rejected.",
      });

      res.json({ success: true, message: `Correction ${action}` });
    } catch (error) {
      console.error("Error reviewing TITO correction:", error);
      res.status(500).json({ error: "Failed to review correction" });
    }
  });

  app.get("/api/workers", checkRoles("admin", "hr"), async (_req: Request, res: Response) => {
    try {
      const workers = await db.select({
        id: users.id,
        email: users.email,
        fullName: users.fullName,
        onboardingStatus: users.onboardingStatus,
        workerRoles: users.workerRoles,
        isActive: users.isActive,
        profilePhotoUrl: users.profilePhotoUrl,
        createdAt: users.createdAt,
      }).from(users).where(eq(users.role, "worker")).orderBy(desc(users.createdAt));
      res.json(workers);
    } catch (error) {
      console.error("Error fetching workers:", error);
      res.status(500).json({ error: "Failed to fetch workers" });
    }
  });

  // ========================================
  // My Today Dashboard API
  // ========================================

  app.get("/api/my-today", async (req: Request, res: Response) => {
    try {
      const userId = req.headers["x-user-id"] as string;
      const role = req.headers["x-user-role"] as UserRole;

      if (!userId) {
        res.status(401).json({ error: "Authentication required" });
        return;
      }

      const today = new Date().toLocaleDateString("en-CA", { timeZone: "America/Toronto" });

      let todayShiftsQuery = db
        .select({
          id: shifts.id,
          title: shifts.title,
          date: shifts.date,
          startTime: shifts.startTime,
          endTime: shifts.endTime,
          status: shifts.status,
          category: shifts.category,
          workplaceId: shifts.workplaceId,
          workerUserId: shifts.workerUserId,
          workplaceName: workplaces.name,
          workerName: users.fullName,
        })
        .from(shifts)
        .leftJoin(workplaces, eq(shifts.workplaceId, workplaces.id))
        .leftJoin(users, eq(shifts.workerUserId, users.id))
        .where(
          role === "worker"
            ? and(eq(shifts.date, today), eq(shifts.workerUserId, userId))
            : eq(shifts.date, today)
        )
        .orderBy(shifts.startTime);

      const todayShifts = await todayShiftsQuery;

      let pendingOffers: any[] = [];
      if (role === "worker") {
        pendingOffers = await db
          .select({
            id: shiftOffers.id,
            shiftId: shiftOffers.shiftId,
            status: shiftOffers.status,
            offeredAt: shiftOffers.offeredAt,
            shiftTitle: shifts.title,
            shiftDate: shifts.date,
            shiftStartTime: shifts.startTime,
            shiftEndTime: shifts.endTime,
            workplaceName: workplaces.name,
          })
          .from(shiftOffers)
          .innerJoin(shifts, eq(shiftOffers.shiftId, shifts.id))
          .leftJoin(workplaces, eq(shifts.workplaceId, workplaces.id))
          .where(
            and(
              eq(shiftOffers.workerId, userId),
              eq(shiftOffers.status, "pending")
            )
          )
          .orderBy(shifts.date);
      }

      let pendingRequestsCount = 0;
      let unfilledTodayCount = 0;
      if (role === "admin" || role === "hr") {
        const [reqCount] = await db
          .select({ count: sql<number>`count(*)::int` })
          .from(shiftRequests)
          .where(eq(shiftRequests.status, "pending"));
        pendingRequestsCount = reqCount?.count || 0;

        unfilledTodayCount = todayShifts.filter(
          (s) => !s.workerUserId && s.status !== "cancelled"
        ).length;
      }

      res.json({
        today,
        todayShifts,
        pendingOffers,
        pendingRequestsCount,
        unfilledTodayCount,
        totalTodayShifts: todayShifts.length,
      });
    } catch (error) {
      console.error("Error fetching my-today data:", error);
      res.status(500).json({ error: "Failed to fetch today data" });
    }
  });

  // Shifts API
  // ========================================

  app.get("/api/shifts", async (req: Request, res: Response) => {
    try {
      const userId = req.headers["x-user-id"] as string;
      const role = req.headers["x-user-role"] as UserRole;
      const workplaceId = req.query.workplaceId as string | undefined;

      if (!userId) {
        res.status(401).json({ error: "Authentication required" });
        return;
      }

      let conditions: any[] = [];

      const includePast = req.query.includePast === "true";
      if (!includePast) {
        const today = new Date().toLocaleDateString("en-CA", { timeZone: "America/Toronto" });
        conditions.push(gte(shifts.date, today));
      }

      if (role === "worker") {
        conditions.push(eq(shifts.workerUserId, userId));
      }

      if (workplaceId) {
        conditions.push(eq(shifts.workplaceId, workplaceId));
      }

      const result = await db
        .select({
          id: shifts.id,
          workplaceId: shifts.workplaceId,
          workerUserId: shifts.workerUserId,
          title: shifts.title,
          date: shifts.date,
          startTime: shifts.startTime,
          endTime: shifts.endTime,
          notes: shifts.notes,
          status: shifts.status,
          frequencyType: shifts.frequencyType,
          category: shifts.category,
          recurringDays: shifts.recurringDays,
          recurringEndDate: shifts.recurringEndDate,
          parentShiftId: shifts.parentShiftId,
          createdByUserId: shifts.createdByUserId,
          createdAt: shifts.createdAt,
          updatedAt: shifts.updatedAt,
          workplaceName: workplaces.name,
          workerName: users.fullName,
          workerEmail: users.email,
        })
        .from(shifts)
        .leftJoin(workplaces, eq(shifts.workplaceId, workplaces.id))
        .leftJoin(users, eq(shifts.workerUserId, users.id))
        .where(conditions.length > 0 ? and(...conditions) : undefined)
        .orderBy(desc(shifts.date));

      res.json(result);
    } catch (error) {
      console.error("Error fetching shifts:", error);
      res.status(500).json({ error: "Failed to fetch shifts" });
    }
  });

  app.post("/api/shifts", checkRoles("admin", "hr"), async (req: Request, res: Response) => {
    try {
      const userId = req.headers["x-user-id"] as string;
      const { workplaceId, workerUserId, title, date, startTime, endTime, notes, frequencyType, category, recurringDays, recurringEndDate, blastToAll, workersNeeded } = req.body;

      const freq = frequencyType || "one-time";
      const cat = category || "janitorial";
      const isOpenEnded = freq === "open-ended";

      if (!workplaceId || !title || !date || !startTime) {
        res.status(400).json({ error: "workplaceId, title, date, and startTime are required" });
        return;
      }

      if (!blastToAll && !workerUserId) {
        res.status(400).json({ error: "workerUserId is required when not blasting to all workers" });
        return;
      }

      if (freq === "recurring" && (!recurringDays || recurringDays.length === 0)) {
        res.status(400).json({ error: "recurringDays are required for recurring shifts" });
        return;
      }

      const [workplace] = await db.select().from(workplaces).where(eq(workplaces.id, workplaceId));
      if (!workplace) {
        res.status(404).json({ error: "Workplace not found" });
        return;
      }

      if (!blastToAll) {
        const [worker] = await db.select().from(users).where(and(eq(users.id, workerUserId), eq(users.role, "worker")));
        if (!worker) {
          res.status(404).json({ error: "Worker not found" });
          return;
        }
      }

      if (freq === "recurring" && recurringDays) {
        const days: string[] = typeof recurringDays === "string" ? recurringDays.split(",") : recurringDays;
        const endType = recurringEndDate ? "date" : "never";

        const [newSeries] = await db.insert(shiftSeries).values({
          workplaceId,
          workerUserId: blastToAll ? null : workerUserId,
          title,
          startTime,
          endTime: endTime || null,
          notes: notes || null,
          category: cat,
          frequency: "weekly",
          recurringDays: days.join(","),
          startDate: date,
          endType,
          endDate: recurringEndDate || null,
          status: "active",
          createdByUserId: userId,
        }).returning();

        await db.insert(auditLog).values({
          userId,
          action: "create_series",
          entityType: "shift_series",
          entityId: newSeries.id,
          details: JSON.stringify({ title, frequency: "weekly", workplaceId }),
        });

        broadcast({ type: "created", entity: "shift_series", id: newSeries.id, data: { workerUserId, workplaceId } });
        res.status(201).json({ ...newSeries, type: "series" });
      } else {
        const [newShift] = await db.insert(shifts).values({
          workplaceId,
          workerUserId: blastToAll ? null : workerUserId,
          title,
          date,
          startTime,
          endTime: isOpenEnded ? null : endTime,
          notes: notes || null,
          status: "scheduled",
          frequencyType: freq,
          category: cat,
          createdByUserId: userId,
          workersNeeded: blastToAll && workersNeeded ? workersNeeded : null,
        }).returning();

        if (blastToAll) {
          const eligibleWorkers = await db.select({ id: users.id, fullName: users.fullName, phone: users.phone })
            .from(users)
            .where(and(eq(users.role, "worker"), eq(users.isActive, true)));

          let offersCreated = 0;
          const offerIds: { workerId: string; offerId: string; phone: string | null }[] = [];
          for (const w of eligibleWorkers) {
            try {
              const [offer] = await db.insert(shiftOffers).values({
                shiftId: newShift.id,
                workerId: w.id,
                offeredByUserId: userId,
                status: "pending",
              }).returning();
              offersCreated++;
              offerIds.push({ workerId: w.id, offerId: offer.id, phone: w.phone });

              await db.insert(appNotifications).values({
                userId: w.id,
                type: "shift_offer",
                title: "New Shift Available",
                body: `A new ${cat} shift "${title}" on ${date} is available. Tap to view and accept.`,
                deepLink: `/shift-offers`,
              });
            } catch (e) {
              // skip duplicates
            }
          }

          sendPushNotifications(
            eligibleWorkers.map(w => w.id),
            "New Shift Available",
            `A new ${cat} shift "${title}" on ${date} is available.`,
            { type: "shift_offer", shiftId: newShift.id }
          );

          for (const o of offerIds) {
            const worker = eligibleWorkers.find(w => w.id === o.workerId);
            if (worker?.phone) {
              sendShiftOfferSMS(
                { id: worker.id, fullName: worker.fullName, phone: worker.phone },
                newShift,
                o.offerId
              ).catch(err => console.error(`[OPENPHONE] SMS error for worker ${worker.id}:`, err));
            }
          }

          broadcast({ type: "shift_blast", data: { shiftId: newShift.id, offersCreated } });
          broadcast({ type: "created", entity: "shift", id: newShift.id, data: { workplaceId, blasted: true } });
          res.status(201).json({ ...newShift, blasted: true, offersCreated, totalWorkers: eligibleWorkers.length });
        } else {
          broadcast({ type: "created", entity: "shift", id: newShift.id, data: { workerUserId, workplaceId } });
          res.status(201).json(newShift);
        }
      }
    } catch (error) {
      console.error("Error creating shift:", error);
      res.status(500).json({ error: "Failed to create shift" });
    }
  });

  app.patch("/api/shifts/:id", checkRoles("admin", "hr"), async (req: Request, res: Response) => {
    try {
      const { title, date, startTime, endTime, notes, status } = req.body;

      const [existing] = await db.select().from(shifts).where(eq(shifts.id, req.params.id));
      if (!existing) {
        res.status(404).json({ error: "Shift not found" });
        return;
      }

      const { frequencyType, category, recurringDays, recurringEndDate } = req.body;
      const updates: any = { updatedAt: new Date() };
      if (title !== undefined) updates.title = title;
      if (date !== undefined) updates.date = date;
      if (startTime !== undefined) updates.startTime = startTime;
      if (endTime !== undefined) updates.endTime = endTime;
      if (notes !== undefined) updates.notes = notes;
      if (status !== undefined) updates.status = status;
      if (frequencyType !== undefined) updates.frequencyType = frequencyType;
      if (category !== undefined) updates.category = category;
      if (recurringDays !== undefined) updates.recurringDays = recurringDays;
      if (recurringEndDate !== undefined) updates.recurringEndDate = recurringEndDate;

      const [updated] = await db.update(shifts).set(updates).where(eq(shifts.id, req.params.id)).returning();

      broadcast({ type: "updated", entity: "shift", id: updated.id, data: { workerUserId: existing.workerUserId, workplaceId: existing.workplaceId } });

      res.json(updated);
    } catch (error) {
      console.error("Error updating shift:", error);
      res.status(500).json({ error: "Failed to update shift" });
    }
  });

  app.delete("/api/shifts/:id", checkRoles("admin", "hr"), async (req: Request, res: Response) => {
    try {
      const [existing] = await db.select().from(shifts).where(eq(shifts.id, req.params.id));
      if (!existing) {
        res.status(404).json({ error: "Shift not found" });
        return;
      }

      await db.delete(shiftOffers).where(eq(shiftOffers.shiftId, req.params.id));
      await db.delete(shiftCheckins).where(eq(shiftCheckins.shiftId, req.params.id));

      const childShifts = await db.select({ id: shifts.id }).from(shifts).where(eq(shifts.parentShiftId, req.params.id));
      if (childShifts.length > 0) {
        const childIds = childShifts.map(c => c.id);
        await db.delete(shiftOffers).where(inArray(shiftOffers.shiftId, childIds));
        await db.delete(shiftCheckins).where(inArray(shiftCheckins.shiftId, childIds));
        await db.delete(shifts).where(eq(shifts.parentShiftId, req.params.id));
      }

      await db.delete(shifts).where(eq(shifts.id, req.params.id));

      broadcast({ type: "deleted", entity: "shift", id: req.params.id, data: { workerUserId: existing.workerUserId, workplaceId: existing.workplaceId } });

      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting shift:", error);
      res.status(500).json({ error: "Failed to delete shift" });
    }
  });

  // ========================================
  // Shift Series API
  // ========================================

  app.get("/api/shift-series", checkRoles("admin", "hr"), async (req: Request, res: Response) => {
    try {
      const workplaceIdFilter = req.query.workplaceId as string | undefined;
      const statusFilter = req.query.status as string || "active";

      const conditions: any[] = [eq(shiftSeries.status, statusFilter)];
      if (workplaceIdFilter) {
        conditions.push(eq(shiftSeries.workplaceId, workplaceIdFilter));
      }

      const results = await db.select({
        id: shiftSeries.id,
        workplaceId: shiftSeries.workplaceId,
        workerUserId: shiftSeries.workerUserId,
        title: shiftSeries.title,
        roleType: shiftSeries.roleType,
        startTime: shiftSeries.startTime,
        endTime: shiftSeries.endTime,
        notes: shiftSeries.notes,
        category: shiftSeries.category,
        frequency: shiftSeries.frequency,
        recurringDays: shiftSeries.recurringDays,
        startDate: shiftSeries.startDate,
        endType: shiftSeries.endType,
        endDate: shiftSeries.endDate,
        endAfterCount: shiftSeries.endAfterCount,
        status: shiftSeries.status,
        createdByUserId: shiftSeries.createdByUserId,
        createdAt: shiftSeries.createdAt,
        updatedAt: shiftSeries.updatedAt,
        workplaceName: workplaces.name,
        workerName: users.fullName,
      })
      .from(shiftSeries)
      .leftJoin(workplaces, eq(shiftSeries.workplaceId, workplaces.id))
      .leftJoin(users, eq(shiftSeries.workerUserId, users.id))
      .where(and(...conditions))
      .orderBy(desc(shiftSeries.startDate));

      res.json(results);
    } catch (error) {
      console.error("Error fetching shift series:", error);
      res.status(500).json({ error: "Failed to fetch shift series" });
    }
  });

  app.get("/api/shift-series/:id", checkRoles("admin", "hr"), async (req: Request, res: Response) => {
    try {
      const [series] = await db.select({
        id: shiftSeries.id,
        workplaceId: shiftSeries.workplaceId,
        workerUserId: shiftSeries.workerUserId,
        title: shiftSeries.title,
        roleType: shiftSeries.roleType,
        startTime: shiftSeries.startTime,
        endTime: shiftSeries.endTime,
        notes: shiftSeries.notes,
        category: shiftSeries.category,
        frequency: shiftSeries.frequency,
        recurringDays: shiftSeries.recurringDays,
        startDate: shiftSeries.startDate,
        endType: shiftSeries.endType,
        endDate: shiftSeries.endDate,
        endAfterCount: shiftSeries.endAfterCount,
        status: shiftSeries.status,
        createdByUserId: shiftSeries.createdByUserId,
        createdAt: shiftSeries.createdAt,
        updatedAt: shiftSeries.updatedAt,
        workplaceName: workplaces.name,
        workerName: users.fullName,
      })
      .from(shiftSeries)
      .leftJoin(workplaces, eq(shiftSeries.workplaceId, workplaces.id))
      .leftJoin(users, eq(shiftSeries.workerUserId, users.id))
      .where(eq(shiftSeries.id, req.params.id));

      if (!series) {
        res.status(404).json({ error: "Shift series not found" });
        return;
      }

      const exceptions = await db.select()
        .from(recurrenceExceptions)
        .where(eq(recurrenceExceptions.seriesId, req.params.id));

      res.json({ ...series, exceptions });
    } catch (error) {
      console.error("Error fetching shift series:", error);
      res.status(500).json({ error: "Failed to fetch shift series" });
    }
  });

  app.post("/api/shift-series", checkRoles("admin", "hr"), async (req: Request, res: Response) => {
    try {
      const userId = req.headers["x-user-id"] as string;
      const { workplaceId, workerUserId, title, roleType, startTime, endTime, notes, category, frequency, recurringDays, startDate, endType, endDate, endAfterCount } = req.body;

      if (!workplaceId || !title || !startTime || !startDate || !frequency) {
        res.status(400).json({ error: "workplaceId, title, startTime, startDate, and frequency are required" });
        return;
      }

      if ((frequency === "weekly" || frequency === "biweekly") && !recurringDays) {
        res.status(400).json({ error: "recurringDays is required for weekly/biweekly frequency" });
        return;
      }

      if (endType === "date" && !endDate) {
        res.status(400).json({ error: "endDate is required when endType is 'date'" });
        return;
      }

      if (endType === "count" && !endAfterCount) {
        res.status(400).json({ error: "endAfterCount is required when endType is 'count'" });
        return;
      }

      const [newSeries] = await db.insert(shiftSeries).values({
        workplaceId,
        workerUserId: workerUserId || null,
        title,
        roleType: roleType || null,
        startTime,
        endTime: endTime || null,
        notes: notes || null,
        category: category || "janitorial",
        frequency,
        recurringDays: recurringDays || null,
        startDate,
        endType: endType || "never",
        endDate: endDate || null,
        endAfterCount: endAfterCount || null,
        status: "active",
        createdByUserId: userId,
      }).returning();

      await db.insert(auditLog).values({
        userId,
        action: "create_series",
        entityType: "shift_series",
        entityId: newSeries.id,
        details: JSON.stringify({ title, frequency, workplaceId }),
      });

      broadcast({ type: "created", entity: "shift_series", id: newSeries.id, data: { workplaceId } });
      res.status(201).json(newSeries);
    } catch (error) {
      console.error("Error creating shift series:", error);
      res.status(500).json({ error: "Failed to create shift series" });
    }
  });

  app.patch("/api/shift-series/:id", checkRoles("admin", "hr"), async (req: Request, res: Response) => {
    try {
      const userId = req.headers["x-user-id"] as string;
      const { title, workerUserId, startTime, endTime, notes, category, recurringDays, endType, endDate, endAfterCount, status } = req.body;

      const [existing] = await db.select().from(shiftSeries).where(eq(shiftSeries.id, req.params.id));
      if (!existing) {
        res.status(404).json({ error: "Shift series not found" });
        return;
      }

      const updates: any = { updatedAt: new Date() };
      if (title !== undefined) updates.title = title;
      if (workerUserId !== undefined) updates.workerUserId = workerUserId;
      if (startTime !== undefined) updates.startTime = startTime;
      if (endTime !== undefined) updates.endTime = endTime;
      if (notes !== undefined) updates.notes = notes;
      if (category !== undefined) updates.category = category;
      if (recurringDays !== undefined) updates.recurringDays = recurringDays;
      if (endType !== undefined) updates.endType = endType;
      if (endDate !== undefined) updates.endDate = endDate;
      if (endAfterCount !== undefined) updates.endAfterCount = endAfterCount;
      if (status !== undefined) updates.status = status;

      const [updated] = await db.update(shiftSeries).set(updates).where(eq(shiftSeries.id, req.params.id)).returning();

      await db.insert(auditLog).values({
        userId,
        action: "update_series",
        entityType: "shift_series",
        entityId: req.params.id,
        details: JSON.stringify(updates),
      });

      broadcast({ type: "updated", entity: "shift_series", id: updated.id, data: { workplaceId: existing.workplaceId } });
      res.json(updated);
    } catch (error) {
      console.error("Error updating shift series:", error);
      res.status(500).json({ error: "Failed to update shift series" });
    }
  });

  app.delete("/api/shift-series/:id", checkRoles("admin"), async (req: Request, res: Response) => {
    try {
      const userId = req.headers["x-user-id"] as string;

      const [existing] = await db.select().from(shiftSeries).where(eq(shiftSeries.id, req.params.id));
      if (!existing) {
        res.status(404).json({ error: "Shift series not found" });
        return;
      }

      await db.delete(recurrenceExceptions).where(eq(recurrenceExceptions.seriesId, req.params.id));

      await db.delete(shiftSeries).where(eq(shiftSeries.id, req.params.id));

      await db.insert(auditLog).values({
        userId,
        action: "delete_series",
        entityType: "shift_series",
        entityId: req.params.id,
        details: JSON.stringify({ title: existing.title, workplaceId: existing.workplaceId }),
      });

      broadcast({ type: "deleted", entity: "shift_series", id: req.params.id, data: { workplaceId: existing.workplaceId } });
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting shift series:", error);
      res.status(500).json({ error: "Failed to delete shift series" });
    }
  });

  app.post("/api/shift-series/:id/cancel-occurrence", checkRoles("admin", "hr"), async (req: Request, res: Response) => {
    try {
      const userId = req.headers["x-user-id"] as string;
      const { date, reason } = req.body;

      if (!date) {
        res.status(400).json({ error: "date is required" });
        return;
      }

      const [existing] = await db.select().from(shiftSeries).where(eq(shiftSeries.id, req.params.id));
      if (!existing) {
        res.status(404).json({ error: "Shift series not found" });
        return;
      }

      const [exception] = await db.insert(recurrenceExceptions).values({
        seriesId: req.params.id,
        date,
        type: "cancelled",
        reason: reason || null,
        cancelledByUserId: userId,
      }).returning();

      await db.insert(auditLog).values({
        userId,
        action: "cancel_occurrence",
        entityType: "shift_series",
        entityId: req.params.id,
        details: JSON.stringify({ date, reason }),
      });

      broadcast({ type: "updated", entity: "shift_series", id: req.params.id, data: { workplaceId: existing.workplaceId } });
      res.json(exception);
    } catch (error) {
      console.error("Error cancelling occurrence:", error);
      res.status(500).json({ error: "Failed to cancel occurrence" });
    }
  });

  app.post("/api/shift-series/:id/delete-future", checkRoles("admin", "hr"), async (req: Request, res: Response) => {
    try {
      const userId = req.headers["x-user-id"] as string;
      const { fromDate } = req.body;

      if (!fromDate) {
        res.status(400).json({ error: "fromDate is required" });
        return;
      }

      const [existing] = await db.select().from(shiftSeries).where(eq(shiftSeries.id, req.params.id));
      if (!existing) {
        res.status(404).json({ error: "Shift series not found" });
        return;
      }

      const newEndDate = new Date(fromDate);
      newEndDate.setDate(newEndDate.getDate() - 1);
      const newEndDateStr = newEndDate.toISOString().split("T")[0];

      if (existing.endType === "never" || (existing.endDate && existing.endDate > fromDate)) {
        await db.update(shiftSeries).set({
          endType: "date",
          endDate: newEndDateStr,
          updatedAt: new Date(),
        }).where(eq(shiftSeries.id, req.params.id));
      }

      await db.delete(recurrenceExceptions).where(
        and(
          eq(recurrenceExceptions.seriesId, req.params.id),
          gte(recurrenceExceptions.date, fromDate)
        )
      );

      await db.insert(auditLog).values({
        userId,
        action: "delete_future_occurrences",
        entityType: "shift_series",
        entityId: req.params.id,
        details: JSON.stringify({ fromDate }),
      });

      const [updated] = await db.select().from(shiftSeries).where(eq(shiftSeries.id, req.params.id));
      broadcast({ type: "updated", entity: "shift_series", id: req.params.id, data: { workplaceId: existing.workplaceId } });
      res.json(updated);
    } catch (error) {
      console.error("Error deleting future occurrences:", error);
      res.status(500).json({ error: "Failed to delete future occurrences" });
    }
  });

  app.post("/api/shift-series/:id/modify-occurrence", checkRoles("admin", "hr"), async (req: Request, res: Response) => {
    try {
      const userId = req.headers["x-user-id"] as string;
      const { date, startTime, endTime, workerUserId, notes } = req.body;

      if (!date) {
        res.status(400).json({ error: "date is required" });
        return;
      }

      const [existing] = await db.select().from(shiftSeries).where(eq(shiftSeries.id, req.params.id));
      if (!existing) {
        res.status(404).json({ error: "Shift series not found" });
        return;
      }

      const [exception] = await db.insert(recurrenceExceptions).values({
        seriesId: req.params.id,
        date,
        type: "modified",
        overrideStartTime: startTime || null,
        overrideEndTime: endTime || null,
        overrideWorkerUserId: workerUserId || null,
        overrideNotes: notes || null,
      }).returning();

      await db.insert(auditLog).values({
        userId,
        action: "modify_occurrence",
        entityType: "shift_series",
        entityId: req.params.id,
        details: JSON.stringify({ date, startTime, endTime, workerUserId, notes }),
      });

      broadcast({ type: "updated", entity: "shift_series", id: req.params.id, data: { workplaceId: existing.workplaceId } });
      res.json(exception);
    } catch (error) {
      console.error("Error modifying occurrence:", error);
      res.status(500).json({ error: "Failed to modify occurrence" });
    }
  });

  app.get("/api/shift-series/:id/occurrences", checkRoles("admin", "hr"), async (req: Request, res: Response) => {
    try {
      const startDateParam = req.query.startDate as string;
      const endDateParam = req.query.endDate as string;

      if (!startDateParam || !endDateParam) {
        res.status(400).json({ error: "startDate and endDate query parameters are required" });
        return;
      }

      const [series] = await db.select({
        id: shiftSeries.id,
        workplaceId: shiftSeries.workplaceId,
        workerUserId: shiftSeries.workerUserId,
        title: shiftSeries.title,
        roleType: shiftSeries.roleType,
        startTime: shiftSeries.startTime,
        endTime: shiftSeries.endTime,
        notes: shiftSeries.notes,
        category: shiftSeries.category,
        frequency: shiftSeries.frequency,
        recurringDays: shiftSeries.recurringDays,
        startDate: shiftSeries.startDate,
        endType: shiftSeries.endType,
        endDate: shiftSeries.endDate,
        endAfterCount: shiftSeries.endAfterCount,
        status: shiftSeries.status,
        workerName: users.fullName,
      })
      .from(shiftSeries)
      .leftJoin(users, eq(shiftSeries.workerUserId, users.id))
      .where(eq(shiftSeries.id, req.params.id));

      if (!series) {
        res.status(404).json({ error: "Shift series not found" });
        return;
      }

      const exceptions = await db.select()
        .from(recurrenceExceptions)
        .where(eq(recurrenceExceptions.seriesId, req.params.id));

      const occurrences = expandSeriesOccurrences(series, exceptions, startDateParam, endDateParam);

      const enriched = occurrences.map(occ => ({
        ...occ,
        workerName: series.workerName,
        title: series.title,
        category: series.category,
      }));

      res.json(enriched);
    } catch (error) {
      console.error("Error fetching occurrences:", error);
      res.status(500).json({ error: "Failed to fetch occurrences" });
    }
  });

  app.get("/api/roster", checkRoles("admin", "hr"), async (req: Request, res: Response) => {
    try {
      const workplaceId = req.query.workplaceId as string;
      const startDateParam = req.query.startDate as string;
      const endDateParam = req.query.endDate as string;

      if (!workplaceId || !startDateParam || !endDateParam) {
        res.status(400).json({ error: "workplaceId, startDate, and endDate query parameters are required" });
        return;
      }

      const oneTimeShifts = await db.select({
        id: shifts.id,
        date: shifts.date,
        startTime: shifts.startTime,
        endTime: shifts.endTime,
        title: shifts.title,
        workerUserId: shifts.workerUserId,
        workerName: users.fullName,
        category: shifts.category,
        status: shifts.status,
        notes: shifts.notes,
      })
      .from(shifts)
      .leftJoin(users, eq(shifts.workerUserId, users.id))
      .where(and(
        eq(shifts.workplaceId, workplaceId),
        gte(shifts.date, startDateParam),
        lte(shifts.date, endDateParam)
      ))
      .orderBy(shifts.date, shifts.startTime);

      const shiftItems = oneTimeShifts.map(s => ({
        id: s.id,
        date: s.date,
        startTime: s.startTime,
        endTime: s.endTime,
        title: s.title,
        workerUserId: s.workerUserId,
        workerName: s.workerName,
        category: s.category,
        status: s.status,
        notes: s.notes,
        type: "shift" as const,
        seriesId: null,
      }));

      const activeSeries = await db.select({
        id: shiftSeries.id,
        workplaceId: shiftSeries.workplaceId,
        workerUserId: shiftSeries.workerUserId,
        title: shiftSeries.title,
        roleType: shiftSeries.roleType,
        startTime: shiftSeries.startTime,
        endTime: shiftSeries.endTime,
        notes: shiftSeries.notes,
        category: shiftSeries.category,
        frequency: shiftSeries.frequency,
        recurringDays: shiftSeries.recurringDays,
        startDate: shiftSeries.startDate,
        endType: shiftSeries.endType,
        endDate: shiftSeries.endDate,
        endAfterCount: shiftSeries.endAfterCount,
        status: shiftSeries.status,
        workerName: users.fullName,
      })
      .from(shiftSeries)
      .leftJoin(users, eq(shiftSeries.workerUserId, users.id))
      .where(and(
        eq(shiftSeries.workplaceId, workplaceId),
        eq(shiftSeries.status, "active")
      ));

      const seriesItems: any[] = [];
      for (const s of activeSeries) {
        const exceptions = await db.select()
          .from(recurrenceExceptions)
          .where(eq(recurrenceExceptions.seriesId, s.id));

        const occurrences = expandSeriesOccurrences(s, exceptions, startDateParam, endDateParam);
        for (const occ of occurrences) {
          let workerName = s.workerName;
          if (occ.isException && occ.exceptionType === "modified" && occ.workerUserId && occ.workerUserId !== s.workerUserId) {
            const [overrideWorker] = await db.select({ fullName: users.fullName })
              .from(users)
              .where(eq(users.id, occ.workerUserId));
            if (overrideWorker) workerName = overrideWorker.fullName;
          }
          seriesItems.push({
            id: null,
            date: occ.date,
            startTime: occ.startTime,
            endTime: occ.endTime,
            title: s.title,
            workerUserId: occ.workerUserId || s.workerUserId,
            workerName,
            category: s.category,
            status: occ.status,
            notes: occ.notes || s.notes,
            type: "series_occurrence" as const,
            seriesId: s.id,
            isException: occ.isException,
            exceptionType: occ.exceptionType || null,
          });
        }
      }

      const merged = [...shiftItems, ...seriesItems].sort((a, b) => {
        const dateCompare = (a.date || "").localeCompare(b.date || "");
        if (dateCompare !== 0) return dateCompare;
        return (a.startTime || "").localeCompare(b.startTime || "");
      });

      res.json(merged);
    } catch (error) {
      console.error("Error fetching roster:", error);
      res.status(500).json({ error: "Failed to fetch roster" });
    }
  });

  // ========================================
  // Timesheets & Payroll API
  // ========================================

  // Get pay periods for a year
  app.get("/api/payroll/periods", checkRoles("admin", "hr"), async (req: Request, res: Response) => {
    try {
      const year = parseInt(req.query.year as string) || 2026;
      const periods = getPayPeriodsForYear(year);
      res.json(periods);
    } catch (error) {
      console.error("Error fetching pay periods:", error);
      res.status(500).json({ error: "Failed to fetch pay periods" });
    }
  });

  // List timesheets with filters
  app.get("/api/timesheets", checkRoles("admin", "hr"), async (req: Request, res: Response) => {
    try {
      const year = parseInt(req.query.year as string) || 2026;
      const period = req.query.period ? parseInt(req.query.period as string) : undefined;
      const status = req.query.status as string | undefined;

      let query = db.select({
        id: timesheets.id,
        workerUserId: timesheets.workerUserId,
        periodYear: timesheets.periodYear,
        periodNumber: timesheets.periodNumber,
        status: timesheets.status,
        submittedAt: timesheets.submittedAt,
        approvedAt: timesheets.approvedAt,
        disputedAt: timesheets.disputedAt,
        disputeReason: timesheets.disputeReason,
        totalHours: timesheets.totalHours,
        totalPay: timesheets.totalPay,
        createdAt: timesheets.createdAt,
        workerName: users.fullName,
        workerEmail: users.email,
      })
      .from(timesheets)
      .leftJoin(users, eq(timesheets.workerUserId, users.id))
      .where(eq(timesheets.periodYear, year))
      .orderBy(desc(timesheets.submittedAt));

      const results = await query;

      // Apply filters in JS for simplicity
      let filtered = results;
      if (period) {
        filtered = filtered.filter(t => t.periodNumber === period);
      }
      if (status) {
        filtered = filtered.filter(t => t.status === status);
      }

      res.json(filtered);
    } catch (error) {
      console.error("Error fetching timesheets:", error);
      res.status(500).json({ error: "Failed to fetch timesheets" });
    }
  });

  // Get single timesheet with entries
  app.get("/api/timesheets/:id", checkRoles("admin", "hr"), async (req: Request, res: Response) => {
    try {
      const { id } = req.params;

      const [timesheet] = await db.select({
        id: timesheets.id,
        workerUserId: timesheets.workerUserId,
        periodYear: timesheets.periodYear,
        periodNumber: timesheets.periodNumber,
        status: timesheets.status,
        submittedAt: timesheets.submittedAt,
        approvedAt: timesheets.approvedAt,
        disputedAt: timesheets.disputedAt,
        disputeReason: timesheets.disputeReason,
        totalHours: timesheets.totalHours,
        totalPay: timesheets.totalPay,
        createdAt: timesheets.createdAt,
        workerName: users.fullName,
        workerEmail: users.email,
      })
      .from(timesheets)
      .leftJoin(users, eq(timesheets.workerUserId, users.id))
      .where(eq(timesheets.id, id));

      if (!timesheet) {
        res.status(404).json({ error: "Timesheet not found" });
        return;
      }

      // Get entries
      const entries = await db.select({
        id: timesheetEntries.id,
        timesheetId: timesheetEntries.timesheetId,
        workplaceId: timesheetEntries.workplaceId,
        titoLogId: timesheetEntries.titoLogId,
        dateLocal: timesheetEntries.dateLocal,
        timeInUtc: timesheetEntries.timeInUtc,
        timeOutUtc: timesheetEntries.timeOutUtc,
        breakMinutes: timesheetEntries.breakMinutes,
        hours: timesheetEntries.hours,
        payRate: timesheetEntries.payRate,
        amount: timesheetEntries.amount,
        notes: timesheetEntries.notes,
        workplaceName: workplaces.name,
      })
      .from(timesheetEntries)
      .leftJoin(workplaces, eq(timesheetEntries.workplaceId, workplaces.id))
      .where(eq(timesheetEntries.timesheetId, id))
      .orderBy(timesheetEntries.dateLocal);

      res.json({ ...timesheet, entries });
    } catch (error) {
      console.error("Error fetching timesheet:", error);
      res.status(500).json({ error: "Failed to fetch timesheet" });
    }
  });

  // Approve timesheet
  app.patch("/api/timesheets/:id/approve", checkRoles("admin", "hr"), async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const userId = req.headers["x-user-id"] as string;

      const [timesheet] = await db.select().from(timesheets).where(eq(timesheets.id, id));
      if (!timesheet) {
        res.status(404).json({ error: "Timesheet not found" });
        return;
      }

      if (timesheet.status !== "submitted") {
        res.status(400).json({ error: "Only submitted timesheets can be approved" });
        return;
      }

      const [updated] = await db.update(timesheets)
        .set({
          status: "approved",
          approvedByUserId: userId,
          approvedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(timesheets.id, id))
        .returning();

      res.json(updated);
    } catch (error) {
      console.error("Error approving timesheet:", error);
      res.status(500).json({ error: "Failed to approve timesheet" });
    }
  });

  // Dispute timesheet
  app.patch("/api/timesheets/:id/dispute", checkRoles("admin", "hr"), async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { reason } = req.body;
      const userId = req.headers["x-user-id"] as string;

      if (!reason || reason.trim().length === 0) {
        res.status(400).json({ error: "Dispute reason is required" });
        return;
      }

      const [timesheet] = await db.select().from(timesheets).where(eq(timesheets.id, id));
      if (!timesheet) {
        res.status(404).json({ error: "Timesheet not found" });
        return;
      }

      if (timesheet.status !== "submitted" && timesheet.status !== "approved") {
        res.status(400).json({ error: "Only submitted or approved timesheets can be disputed" });
        return;
      }

      const [updated] = await db.update(timesheets)
        .set({
          status: "disputed",
          disputedByUserId: userId,
          disputedAt: new Date(),
          disputeReason: reason.trim(),
          updatedAt: new Date(),
        })
        .where(eq(timesheets.id, id))
        .returning();

      res.json(updated);
    } catch (error) {
      console.error("Error disputing timesheet:", error);
      res.status(500).json({ error: "Failed to dispute timesheet" });
    }
  });

  // Create or get payroll batch for a period
  app.post("/api/payroll/batches", checkRoles("admin", "hr"), async (req: Request, res: Response) => {
    try {
      const { year, periodNumber } = req.body;
      const userId = req.headers["x-user-id"] as string;

      if (!year || !periodNumber) {
        res.status(400).json({ error: "Year and periodNumber are required" });
        return;
      }

      // Check if batch already exists
      const [existingBatch] = await db.select()
        .from(payrollBatches)
        .where(and(
          eq(payrollBatches.periodYear, year),
          eq(payrollBatches.periodNumber, periodNumber)
        ));

      if (existingBatch) {
        // Return existing batch with items
        const items = await db.select({
          id: payrollBatchItems.id,
          workerUserId: payrollBatchItems.workerUserId,
          timesheetId: payrollBatchItems.timesheetId,
          status: payrollBatchItems.status,
          hours: payrollBatchItems.hours,
          amount: payrollBatchItems.amount,
          workerName: users.fullName,
          workerEmail: users.email,
        })
        .from(payrollBatchItems)
        .leftJoin(users, eq(payrollBatchItems.workerUserId, users.id))
        .where(eq(payrollBatchItems.payrollBatchId, existingBatch.id));

        res.json({ ...existingBatch, items });
        return;
      }

      // Get all approved timesheets for this period
      const approvedTimesheets = await db.select()
        .from(timesheets)
        .where(and(
          eq(timesheets.periodYear, year),
          eq(timesheets.periodNumber, periodNumber),
          eq(timesheets.status, "approved")
        ));

      // Calculate totals
      let totalWorkers = approvedTimesheets.length;
      let totalHours = 0;
      let totalAmount = 0;

      for (const ts of approvedTimesheets) {
        totalHours += parseFloat(ts.totalHours || "0");
        totalAmount += parseFloat(ts.totalPay || "0");
      }

      // Create batch
      const [batch] = await db.insert(payrollBatches)
        .values({
          periodYear: year,
          periodNumber,
          status: "open",
          createdByUserId: userId,
          totalWorkers,
          totalHours: totalHours.toFixed(2),
          totalAmount: totalAmount.toFixed(2),
        })
        .returning();

      // Create batch items for each approved timesheet
      const items = [];
      for (const ts of approvedTimesheets) {
        const [item] = await db.insert(payrollBatchItems)
          .values({
            payrollBatchId: batch.id,
            workerUserId: ts.workerUserId,
            timesheetId: ts.id,
            status: "included",
            hours: ts.totalHours || "0",
            amount: ts.totalPay || "0",
          })
          .returning();
        items.push(item);
      }

      res.json({ ...batch, items });
    } catch (error) {
      console.error("Error creating payroll batch:", error);
      res.status(500).json({ error: "Failed to create payroll batch" });
    }
  });

  // Get payroll batches
  app.get("/api/payroll/batches", checkRoles("admin", "hr"), async (req: Request, res: Response) => {
    try {
      const year = parseInt(req.query.year as string) || 2026;
      const period = req.query.period ? parseInt(req.query.period as string) : undefined;

      let results = await db.select()
        .from(payrollBatches)
        .where(eq(payrollBatches.periodYear, year))
        .orderBy(desc(payrollBatches.createdAt));

      if (period) {
        results = results.filter(b => b.periodNumber === period);
      }

      res.json(results);
    } catch (error) {
      console.error("Error fetching payroll batches:", error);
      res.status(500).json({ error: "Failed to fetch payroll batches" });
    }
  });

  // Get single payroll batch with items
  app.get("/api/payroll/batches/:id", checkRoles("admin", "hr"), async (req: Request, res: Response) => {
    try {
      const { id } = req.params;

      const [batch] = await db.select().from(payrollBatches).where(eq(payrollBatches.id, id));
      if (!batch) {
        res.status(404).json({ error: "Payroll batch not found" });
        return;
      }

      const items = await db.select({
        id: payrollBatchItems.id,
        workerUserId: payrollBatchItems.workerUserId,
        timesheetId: payrollBatchItems.timesheetId,
        status: payrollBatchItems.status,
        hours: payrollBatchItems.hours,
        amount: payrollBatchItems.amount,
        workerName: users.fullName,
        workerEmail: users.email,
      })
      .from(payrollBatchItems)
      .leftJoin(users, eq(payrollBatchItems.workerUserId, users.id))
      .where(eq(payrollBatchItems.payrollBatchId, id));

      res.json({ ...batch, items });
    } catch (error) {
      console.error("Error fetching payroll batch:", error);
      res.status(500).json({ error: "Failed to fetch payroll batch" });
    }
  });

  // Finalize payroll batch (Admin only)
  app.patch("/api/payroll/batches/:id/finalize", checkRoles("admin"), async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const userId = req.headers["x-user-id"] as string;

      const [batch] = await db.select().from(payrollBatches).where(eq(payrollBatches.id, id));
      if (!batch) {
        res.status(404).json({ error: "Payroll batch not found" });
        return;
      }

      if (batch.status !== "open") {
        res.status(400).json({ error: "Only open batches can be finalized" });
        return;
      }

      // Get all included items
      const items = await db.select()
        .from(payrollBatchItems)
        .where(and(
          eq(payrollBatchItems.payrollBatchId, id),
          eq(payrollBatchItems.status, "included")
        ));

      // Mark all included timesheets as processed
      for (const item of items) {
        await db.update(timesheets)
          .set({ status: "processed", updatedAt: new Date() })
          .where(eq(timesheets.id, item.timesheetId));
      }

      // Update batch status
      const [updated] = await db.update(payrollBatches)
        .set({
          status: "finalized",
          finalizedByUserId: userId,
          finalizedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(payrollBatches.id, id))
        .returning();

      res.json(updated);
    } catch (error) {
      console.error("Error finalizing payroll batch:", error);
      res.status(500).json({ error: "Failed to finalize payroll batch" });
    }
  });

  // Export payroll batch as CSV (Admin only)
  app.get("/api/payroll/batches/:id/export.csv", checkRoles("admin"), async (req: Request, res: Response) => {
    try {
      const { id } = req.params;

      const [batch] = await db.select().from(payrollBatches).where(eq(payrollBatches.id, id));
      if (!batch) {
        res.status(404).json({ error: "Payroll batch not found" });
        return;
      }

      const period = getPayPeriod(batch.periodYear, batch.periodNumber);
      const dateRange = period ? `${period.startDate} to ${period.endDate}` : "Unknown";

      // Get items with worker info
      const items = await db.select({
        workerName: users.fullName,
        workerEmail: users.email,
        hours: payrollBatchItems.hours,
        amount: payrollBatchItems.amount,
        status: payrollBatchItems.status,
      })
      .from(payrollBatchItems)
      .leftJoin(users, eq(payrollBatchItems.workerUserId, users.id))
      .where(and(
        eq(payrollBatchItems.payrollBatchId, id),
        eq(payrollBatchItems.status, "included")
      ));

      // Generate CSV
      const csvLines = [
        "Worker Name,Worker Email,Hours,Amount,Period,Date Range",
        ...items.map(item => 
          `"${item.workerName || ""}","${item.workerEmail || ""}",${item.hours},${item.amount},Period ${batch.periodNumber},"${dateRange}"`
        )
      ];

      res.setHeader("Content-Type", "text/csv");
      res.setHeader("Content-Disposition", `attachment; filename="payroll-period-${batch.periodNumber}-${batch.periodYear}.csv"`);
      res.send(csvLines.join("\n"));
    } catch (error) {
      console.error("Error exporting payroll batch:", error);
      res.status(500).json({ error: "Failed to export payroll batch" });
    }
  });

  // Email payroll batch CSV
  app.post("/api/payroll/batches/:id/email", checkRoles("admin", "hr"), async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { to, subject } = req.body;

      if (!to || typeof to !== "string" || !to.includes("@")) {
        res.status(400).json({ error: "Valid email address is required" });
        return;
      }

      const [batch] = await db.select().from(payrollBatches).where(eq(payrollBatches.id, id));
      if (!batch) {
        res.status(404).json({ error: "Payroll batch not found" });
        return;
      }

      const period = getPayPeriod(batch.periodYear, batch.periodNumber);
      const dateRange = period ? `${period.startDate} to ${period.endDate}` : "Unknown";

      const items = await db.select({
        workerName: users.fullName,
        workerEmail: users.email,
        hours: payrollBatchItems.hours,
        amount: payrollBatchItems.amount,
        status: payrollBatchItems.status,
      })
      .from(payrollBatchItems)
      .leftJoin(users, eq(payrollBatchItems.workerUserId, users.id))
      .where(and(
        eq(payrollBatchItems.payrollBatchId, id),
        eq(payrollBatchItems.status, "included")
      ));

      const csvLines = [
        "Worker Name,Worker Email,Hours,Amount,Period,Date Range",
        ...items.map(item =>
          `"${item.workerName || ""}","${item.workerEmail || ""}",${item.hours},${item.amount},Period ${batch.periodNumber},"${dateRange}"`
        )
      ];

      const csvContent = csvLines.join("\n");
      const filename = `payroll-period-${batch.periodNumber}-${batch.periodYear}.csv`;
      const emailSubject = subject || `WFConnect Payroll - Period ${batch.periodNumber} (${dateRange})`;
      const bodyText = `Please find attached the payroll report for Period ${batch.periodNumber} (${dateRange}).\n\nThis report includes ${items.length} worker(s).\n\n- WFConnect`;

      const result = await sendCSVEmail(to, emailSubject, bodyText, csvContent, filename);

      if (result.success) {
        res.json({ success: true, message: `Payroll CSV sent to ${to}` });
      } else {
        res.status(500).json({ error: result.error || "Failed to send email" });
      }
    } catch (error) {
      console.error("Error emailing payroll batch:", error);
      res.status(500).json({ error: "Failed to email payroll batch" });
    }
  });

  // ========================================
  // Google Places API Proxy (Address Autocomplete)
  // ========================================

  app.get("/api/places/autocomplete", checkRoles("admin", "hr", "worker"), async (req: Request, res: Response) => {
    try {
      const { input } = req.query;
      
      if (!input || typeof input !== "string" || input.length < 2) {
        res.json({ predictions: [] });
        return;
      }

      const apiKey = process.env.GOOGLE_PLACES_API_KEY;
      if (!apiKey) {
        res.status(500).json({ error: "Google Places API key not configured" });
        return;
      }

      const url = new URL("https://maps.googleapis.com/maps/api/place/autocomplete/json");
      url.searchParams.set("input", input);
      url.searchParams.set("key", apiKey);
      url.searchParams.set("types", "address");
      url.searchParams.set("components", "country:ca|country:us");

      const response = await fetch(url.toString());
      const data = await response.json();

      if (data.status === "OK" || data.status === "ZERO_RESULTS") {
        res.json({ predictions: data.predictions || [] });
      } else {
        console.error("Google Places API error:", data.status, data.error_message);
        res.status(500).json({ error: "Failed to fetch address suggestions" });
      }
    } catch (error) {
      console.error("Error in address autocomplete:", error);
      res.status(500).json({ error: "Failed to fetch address suggestions" });
    }
  });

  app.get("/api/places/details/:placeId", checkRoles("admin", "hr", "worker"), async (req: Request, res: Response) => {
    try {
      const { placeId } = req.params;
      
      if (!placeId) {
        res.status(400).json({ error: "Place ID is required" });
        return;
      }

      const apiKey = process.env.GOOGLE_PLACES_API_KEY;
      if (!apiKey) {
        res.status(500).json({ error: "Google Places API key not configured" });
        return;
      }

      const url = new URL("https://maps.googleapis.com/maps/api/place/details/json");
      url.searchParams.set("place_id", placeId);
      url.searchParams.set("key", apiKey);
      url.searchParams.set("fields", "formatted_address,address_components,geometry");

      const response = await fetch(url.toString());
      const data = await response.json();

      if (data.status === "OK" && data.result) {
        const result = data.result;
        const components = result.address_components || [];
        
        const getComponent = (types: string[]): string => {
          const comp = components.find((c: { types: string[] }) => 
            types.some((t: string) => c.types.includes(t))
          );
          return comp?.long_name || "";
        };

        const getShortComponent = (types: string[]): string => {
          const comp = components.find((c: { types: string[] }) => 
            types.some((t: string) => c.types.includes(t))
          );
          return comp?.short_name || "";
        };

        const streetNumber = getComponent(["street_number"]);
        const streetName = getComponent(["route"]);
        const addressLine1 = streetNumber && streetName 
          ? `${streetNumber} ${streetName}` 
          : streetName || getComponent(["premise", "subpremise"]);

        const addressData = {
          formattedAddress: result.formatted_address,
          addressLine1,
          city: getComponent(["locality", "sublocality", "administrative_area_level_3"]),
          province: getShortComponent(["administrative_area_level_1"]),
          postalCode: getComponent(["postal_code"]),
          country: getComponent(["country"]),
          latitude: result.geometry?.location?.lat || null,
          longitude: result.geometry?.location?.lng || null,
        };

        res.json(addressData);
      } else {
        console.error("Google Places Details API error:", data.status, data.error_message);
        res.status(500).json({ error: "Failed to fetch address details" });
      }
    } catch (error) {
      console.error("Error in address details:", error);
      res.status(500).json({ error: "Failed to fetch address details" });
    }
  });

  app.get("/api/debug/whoami", (req: Request, res: Response) => {
    res.json({
      headers: {
        "x-user-id": req.headers["x-user-id"] || null,
        "x-user-role": req.headers["x-user-role"] || null,
        host: req.headers["host"] || null,
      },
      timestamp: new Date().toISOString(),
    });
  });

  // ========================================
  // Shift Requests CRUD
  // ========================================

  app.get("/api/shift-requests", async (req: Request, res: Response) => {
    try {
      const role = req.headers["x-user-role"] as UserRole;
      const userId = req.headers["x-user-id"] as string;

      if (!role || !userId) {
        res.status(401).json({ error: "Authentication required" });
        return;
      }

      let results;
      if (role === "admin" || role === "hr") {
        results = await db.select({
          id: shiftRequests.id,
          clientId: shiftRequests.clientId,
          workplaceId: shiftRequests.workplaceId,
          roleType: shiftRequests.roleType,
          date: shiftRequests.date,
          startTime: shiftRequests.startTime,
          endTime: shiftRequests.endTime,
          notes: shiftRequests.notes,
          requestedWorkerId: shiftRequests.requestedWorkerId,
          status: shiftRequests.status,
          createdAt: shiftRequests.createdAt,
          updatedAt: shiftRequests.updatedAt,
          workplaceName: workplaces.name,
          clientName: users.fullName,
        })
        .from(shiftRequests)
        .leftJoin(workplaces, eq(shiftRequests.workplaceId, workplaces.id))
        .leftJoin(users, eq(shiftRequests.clientId, users.id))
        .orderBy(desc(shiftRequests.createdAt));
      } else if (role === "client") {
        results = await db.select({
          id: shiftRequests.id,
          clientId: shiftRequests.clientId,
          workplaceId: shiftRequests.workplaceId,
          roleType: shiftRequests.roleType,
          date: shiftRequests.date,
          startTime: shiftRequests.startTime,
          endTime: shiftRequests.endTime,
          notes: shiftRequests.notes,
          requestedWorkerId: shiftRequests.requestedWorkerId,
          status: shiftRequests.status,
          createdAt: shiftRequests.createdAt,
          updatedAt: shiftRequests.updatedAt,
          workplaceName: workplaces.name,
          clientName: users.fullName,
        })
        .from(shiftRequests)
        .leftJoin(workplaces, eq(shiftRequests.workplaceId, workplaces.id))
        .leftJoin(users, eq(shiftRequests.clientId, users.id))
        .where(eq(shiftRequests.clientId, userId))
        .orderBy(desc(shiftRequests.createdAt));
      } else {
        res.status(403).json({ error: "Access denied" });
        return;
      }

      res.json(results);
    } catch (error) {
      console.error("Error fetching shift requests:", error);
      res.status(500).json({ error: "Failed to fetch shift requests" });
    }
  });

  app.post(
    "/api/shift-requests",
    checkRoles("admin", "hr", "client"),
    async (req: Request, res: Response) => {
      try {
        const userId = req.headers["x-user-id"] as string;
        const { clientId, workplaceId, roleType, date, startTime, endTime, notes, requestedWorkerId } = req.body;

        const effectiveClientId = clientId || userId;

        if (!workplaceId || !roleType || !date || !startTime || !endTime) {
          res.status(400).json({ error: "workplaceId, roleType, date, startTime, and endTime are required" });
          return;
        }

        const [newRequest] = await db.insert(shiftRequests).values({
          clientId: effectiveClientId,
          workplaceId,
          roleType,
          date,
          startTime,
          endTime,
          notes: notes || null,
          requestedWorkerId: requestedWorkerId || null,
          status: "submitted",
        }).returning();

        broadcast({ type: "shift_request_created", data: newRequest });

        const [wp] = newRequest.workplaceId ? await db.select().from(workplaces).where(eq(workplaces.id, newRequest.workplaceId)) : [null];
        const wpName = wp?.name || "a workplace";

        const adminsAndHR = await db.select({ id: users.id }).from(users)
          .where(and(
            or(eq(users.role, "admin"), eq(users.role, "hr")),
            eq(users.isActive, true),
            ne(users.id, userId)
          ));
        const notifyIds = adminsAndHR.map(u => u.id);

        if (notifyIds.length > 0) {
          for (const uid of notifyIds) {
            await db.insert(appNotifications).values({
              userId: uid,
              type: "shift_request_created",
              title: "New Shift Request",
              body: `A ${newRequest.roleType} shift has been requested at ${wpName} on ${newRequest.date}.`,
              deepLink: `/shift-requests/${newRequest.id}`,
            });
          }
          sendPushNotifications(
            notifyIds,
            "New Shift Request",
            `A ${newRequest.roleType} shift has been requested at ${wpName} on ${newRequest.date}.`,
            { type: "shift_request_created", requestId: newRequest.id }
          );
        }

        if (newRequest.requestedWorkerId) {
          await db.insert(appNotifications).values({
            userId: newRequest.requestedWorkerId,
            type: "shift_request_for_you",
            title: "Shift Requested For You",
            body: `A ${newRequest.roleType} shift at ${wpName} on ${newRequest.date} has been requested for you.`,
            deepLink: `/shift-requests/${newRequest.id}`,
          });
          sendPushNotifications(
            [newRequest.requestedWorkerId],
            "Shift Requested For You",
            `A ${newRequest.roleType} shift at ${wpName} on ${newRequest.date} has been requested for you.`,
            { type: "shift_request_for_you", requestId: newRequest.id }
          );
        }

        res.json(newRequest);
      } catch (error) {
        console.error("Error creating shift request:", error);
        res.status(500).json({ error: "Failed to create shift request" });
      }
    }
  );

  app.patch(
    "/api/shift-requests/:id",
    checkRoles("admin", "hr"),
    async (req: Request, res: Response) => {
      try {
        const requestId = req.params.id;
        const updates = req.body;

        const [existing] = await db.select().from(shiftRequests).where(eq(shiftRequests.id, requestId));
        if (!existing) {
          res.status(404).json({ error: "Shift request not found" });
          return;
        }

        const [updated] = await db.update(shiftRequests)
          .set({ ...updates, updatedAt: new Date() })
          .where(eq(shiftRequests.id, requestId))
          .returning();

        if (updates.status === "filled" && existing.status !== "filled") {
          await db.insert(appNotifications).values({
            userId: existing.clientId,
            type: "request_filled",
            title: "Shift Request Filled",
            body: `Your shift request for ${existing.roleType} on ${existing.date} has been filled.`,
            deepLink: `/shift-requests/${requestId}`,
          });

          sendPushNotifications(
            [existing.clientId],
            "Shift Request Filled",
            `Your shift request for ${existing.roleType} on ${existing.date} has been filled.`,
            { type: "request_filled", requestId }
          );
        }

        broadcast({ type: "shift_request_updated", data: updated });

        res.json(updated);
      } catch (error) {
        console.error("Error updating shift request:", error);
        res.status(500).json({ error: "Failed to update shift request" });
      }
    }
  );

  app.delete("/api/shift-requests/:id", async (req: Request, res: Response) => {
    try {
      const role = req.headers["x-user-role"] as UserRole;
      const userId = req.headers["x-user-id"] as string;
      const requestId = req.params.id;

      if (!role || !userId) {
        res.status(401).json({ error: "Authentication required" });
        return;
      }

      const [existing] = await db.select().from(shiftRequests).where(eq(shiftRequests.id, requestId));
      if (!existing) {
        res.status(404).json({ error: "Shift request not found" });
        return;
      }

      if (role === "client" && existing.clientId !== userId) {
        res.status(403).json({ error: "You can only delete your own requests" });
        return;
      }

      if (role !== "admin" && role !== "hr" && role !== "client") {
        res.status(403).json({ error: "Access denied" });
        return;
      }

      const associatedShifts = await db.select({ id: shifts.id }).from(shifts).where(eq(shifts.requestId, requestId));
      if (associatedShifts.length > 0) {
        const shiftIds = associatedShifts.map(s => s.id);
        await db.delete(shiftOffers).where(inArray(shiftOffers.shiftId, shiftIds));
        await db.delete(shiftCheckins).where(inArray(shiftCheckins.shiftId, shiftIds));
        await db.delete(shifts).where(eq(shifts.requestId, requestId));
      }

      await db.delete(shiftRequests).where(eq(shiftRequests.id, requestId));

      broadcast({ type: "shift_request_deleted", data: { id: requestId } });

      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting shift request:", error);
      res.status(500).json({ error: "Failed to delete shift request" });
    }
  });

  // ========================================
  // Smart Assign & Broadcasting
  // ========================================

  app.post(
    "/api/shift-requests/:id/assign",
    checkRoles("admin", "hr"),
    async (req: Request, res: Response) => {
      try {
        const requestId = req.params.id;
        const userId = req.headers["x-user-id"] as string;
        const { workerId } = req.body;

        const [request] = await db.select().from(shiftRequests).where(eq(shiftRequests.id, requestId));
        if (!request) {
          res.status(404).json({ error: "Shift request not found" });
          return;
        }

        const [workplace] = await db.select().from(workplaces).where(eq(workplaces.id, request.workplaceId!));

        if (workerId) {
          const [newShift] = await db.insert(shifts).values({
            requestId: requestId,
            workplaceId: request.workplaceId!,
            workerUserId: workerId,
            roleType: request.roleType,
            title: `${request.roleType} - ${workplace?.name || "Unknown"}`,
            date: request.date,
            startTime: request.startTime,
            endTime: request.endTime,
            notes: request.notes,
            status: "scheduled",
            createdByUserId: userId,
          }).returning();

          await db.update(shiftRequests)
            .set({ status: "filled", updatedAt: new Date() })
            .where(eq(shiftRequests.id, requestId));

          await db.insert(appNotifications).values({
            userId: workerId,
            type: "shift_assigned",
            title: "New Shift Assigned",
            body: `You have been assigned a ${request.roleType} shift at ${workplace?.name || "a workplace"} on ${request.date}.`,
            deepLink: `/shifts/${newShift.id}`,
          });

          sendPushNotifications(
            [workerId],
            "New Shift Assigned",
            `You have been assigned a ${request.roleType} shift at ${workplace?.name || "a workplace"} on ${request.date}.`,
            { type: "shift_assigned", shiftId: newShift.id }
          );

          db.select({ id: users.id, fullName: users.fullName, phone: users.phone })
            .from(users)
            .where(eq(users.id, workerId))
            .then(([worker]) => {
              if (worker?.phone) {
                sendShiftAssignedSMS(
                  { id: worker.id, fullName: worker.fullName, phone: worker.phone },
                  newShift
                ).catch(err => console.error(`[OPENPHONE] Assigned SMS error:`, err));
              }
            })
            .catch(err => console.error(`[OPENPHONE] Worker lookup error:`, err));

          await db.insert(appNotifications).values({
            userId: request.clientId,
            type: "request_filled",
            title: "Shift Request Filled",
            body: `Your shift request for ${request.roleType} on ${request.date} has been filled.`,
            deepLink: `/shift-requests/${requestId}`,
          });

          sendPushNotifications(
            [request.clientId],
            "Shift Request Filled",
            `Your shift request for ${request.roleType} on ${request.date} has been filled.`
          );

          broadcast({ type: "shift_created", data: newShift });
          broadcast({ type: "shift_request_updated", data: { id: requestId, status: "filled" } });

          res.json({ shift: newShift, assignedDirectly: true });
        } else {
          const [newShift] = await db.insert(shifts).values({
            requestId: requestId,
            workplaceId: request.workplaceId!,
            workerUserId: null,
            roleType: request.roleType,
            title: `${request.roleType} - ${workplace?.name || "Unknown"}`,
            date: request.date,
            startTime: request.startTime,
            endTime: request.endTime,
            notes: request.notes,
            status: "scheduled",
            createdByUserId: userId,
          }).returning();

          const allWorkers = await db.select({
            id: users.id,
            fullName: users.fullName,
            workerRoles: users.workerRoles,
            phone: users.phone,
          })
          .from(users)
          .where(and(
            eq(users.role, "worker"),
            eq(users.isActive, true)
          ));

          let eligibleWorkers = allWorkers.filter(w => {
            if (w.workerRoles) {
              try {
                const roles = JSON.parse(w.workerRoles);
                if (Array.isArray(roles) && roles.length > 0) {
                  return roles.some((r: string) => r.toLowerCase() === request.roleType.toLowerCase());
                }
              } catch {
                return true;
              }
            }
            return true;
          });

          const existingShifts = await db.select({
            workerUserId: shifts.workerUserId,
            startTime: shifts.startTime,
            endTime: shifts.endTime,
          })
          .from(shifts)
          .where(and(
            eq(shifts.date, request.date),
            not(isNull(shifts.workerUserId)),
            ne(shifts.status, "cancelled")
          ));

          const conflictWorkerIds = new Set<string>();
          for (const es of existingShifts) {
            if (es.workerUserId && es.startTime) {
              const existingEnd = es.endTime || "23:59";
              const requestEnd = request.endTime || "23:59";
              if (es.startTime < requestEnd && existingEnd > request.startTime) {
                conflictWorkerIds.add(es.workerUserId);
              }
            }
          }

          eligibleWorkers = eligibleWorkers.filter(w => !conflictWorkerIds.has(w.id));

          const offeredWorkerIds: string[] = [];
          const broadcastOfferIds: { workerId: string; offerId: string }[] = [];
          let offerErrors = 0;
          console.log(`[BROADCAST] Shift ${newShift.id}: ${eligibleWorkers.length} eligible workers found`);
          for (const worker of eligibleWorkers) {
            try {
              const [offer] = await db.insert(shiftOffers).values({
                shiftId: newShift.id,
                workerId: worker.id,
                status: "pending",
              }).returning();

              await db.insert(appNotifications).values({
                userId: worker.id,
                type: "shift_offer",
                title: "New Shift Available",
                body: `A ${request.roleType} shift at ${workplace?.name || "a workplace"} on ${request.date} is available. Tap to accept.`,
                deepLink: `/shift-offers`,
              });

              offeredWorkerIds.push(worker.id);
              broadcastOfferIds.push({ workerId: worker.id, offerId: offer.id });
            } catch (offerErr: any) {
              offerErrors++;
              console.error(`[BROADCAST] Failed to create offer for worker ${worker.id} (${worker.fullName}):`, offerErr?.message || offerErr);
            }
          }
          console.log(`[BROADCAST] Shift ${newShift.id}: ${offeredWorkerIds.length} offers created, ${offerErrors} errors`);

          if (offeredWorkerIds.length > 0) {
            sendPushNotifications(
              offeredWorkerIds,
              "New Shift Available",
              `A ${request.roleType} shift at ${workplace?.name || "a workplace"} on ${request.date} is available. Tap to accept.`,
              { type: "shift_offer", shiftId: newShift.id }
            );
          }

          for (const o of broadcastOfferIds) {
            const worker = eligibleWorkers.find(w => w.id === o.workerId);
            if (worker?.phone) {
              sendShiftOfferSMS(
                { id: worker.id, fullName: worker.fullName, phone: worker.phone },
                newShift,
                o.offerId
              ).catch(err => console.error(`[OPENPHONE] Broadcast SMS error for worker ${worker.id}:`, err));
            }
          }

          await db.insert(auditLog).values({
            userId: userId,
            action: "SHIFT_BROADCAST",
            entityType: "shift",
            entityId: newShift.id,
            details: JSON.stringify({
              requestId,
              eligibleCount: eligibleWorkers.length,
              offersCreated: offeredWorkerIds.length,
              offerErrors,
              workerIds: offeredWorkerIds,
            }),
          });

          await db.update(shiftRequests)
            .set({ status: "offered", updatedAt: new Date() })
            .where(eq(shiftRequests.id, requestId));

          broadcast({ type: "shift_request_updated", data: { id: requestId, status: "offered" } });

          res.json({
            shift: newShift,
            assignedDirectly: false,
            offeredWorkers: eligibleWorkers.map(w => ({ id: w.id, fullName: w.fullName })),
            offeredCount: eligibleWorkers.length,
          });
        }
      } catch (error) {
        console.error("Error assigning shift request:", error);
        res.status(500).json({ error: "Failed to assign shift request" });
      }
    }
  );

  app.get(
    "/api/shift-requests/:id/offers",
    checkRoles("admin", "hr"),
    async (req: Request, res: Response) => {
      try {
        const requestId = req.params.id;

        const requestShifts = await db.select({ id: shifts.id })
          .from(shifts)
          .where(eq(shifts.requestId, requestId));

        if (requestShifts.length === 0) {
          res.json({ offers: [], counts: { pending: 0, accepted: 0, declined: 0, cancelled: 0 } });
          return;
        }

        const shiftIds = requestShifts.map(s => s.id);

        const offers = await db.select({
          id: shiftOffers.id,
          shiftId: shiftOffers.shiftId,
          workerId: shiftOffers.workerId,
          status: shiftOffers.status,
          offeredAt: shiftOffers.offeredAt,
          respondedAt: shiftOffers.respondedAt,
          workerName: users.fullName,
          workerEmail: users.email,
        })
        .from(shiftOffers)
        .leftJoin(users, eq(shiftOffers.workerId, users.id))
        .where(inArray(shiftOffers.shiftId, shiftIds))
        .orderBy(desc(shiftOffers.offeredAt));

        const counts = {
          pending: offers.filter(o => o.status === "pending").length,
          accepted: offers.filter(o => o.status === "accepted").length,
          declined: offers.filter(o => o.status === "declined").length,
          cancelled: offers.filter(o => o.status === "cancelled").length,
        };

        res.json({ offers, counts });
      } catch (error) {
        console.error("Error fetching shift request offers:", error);
        res.status(500).json({ error: "Failed to fetch offers" });
      }
    }
  );

  // ========================================
  // Shift Offers for Workers
  // ========================================

  app.get("/api/shift-offers", async (req: Request, res: Response) => {
    try {
      const role = req.headers["x-user-role"] as UserRole;
      const userId = req.headers["x-user-id"] as string;

      if (!role || !userId) {
        res.status(401).json({ error: "Authentication required" });
        return;
      }

      const statusFilter = req.query.status as string | undefined;
      let results;
      if (role === "worker") {
        const conditions: any[] = [eq(shiftOffers.workerId, userId)];
        if (statusFilter && statusFilter !== "all") {
          conditions.push(eq(shiftOffers.status, statusFilter));
        }
        results = await db.select({
          id: shiftOffers.id,
          shiftId: shiftOffers.shiftId,
          workerId: shiftOffers.workerId,
          status: shiftOffers.status,
          offeredAt: shiftOffers.offeredAt,
          respondedAt: shiftOffers.respondedAt,
          cancelledAt: shiftOffers.cancelledAt,
          cancelReason: shiftOffers.cancelReason,
          shiftDate: shifts.date,
          shiftStartTime: shifts.startTime,
          shiftEndTime: shifts.endTime,
          shiftTitle: shifts.title,
          shiftRoleType: shifts.roleType,
          workplaceName: workplaces.name,
          workplaceCity: workplaces.city,
        })
        .from(shiftOffers)
        .innerJoin(shifts, eq(shiftOffers.shiftId, shifts.id))
        .leftJoin(workplaces, eq(shifts.workplaceId, workplaces.id))
        .where(and(...conditions))
        .orderBy(desc(shiftOffers.offeredAt));
      } else if (role === "admin" || role === "hr") {
        const conditions: any[] = [];
        if (statusFilter && statusFilter !== "all") {
          conditions.push(eq(shiftOffers.status, statusFilter));
        }
        results = await db.select({
          id: shiftOffers.id,
          shiftId: shiftOffers.shiftId,
          workerId: shiftOffers.workerId,
          status: shiftOffers.status,
          offeredAt: shiftOffers.offeredAt,
          respondedAt: shiftOffers.respondedAt,
          cancelledAt: shiftOffers.cancelledAt,
          cancelReason: shiftOffers.cancelReason,
          shiftDate: shifts.date,
          shiftStartTime: shifts.startTime,
          shiftEndTime: shifts.endTime,
          shiftTitle: shifts.title,
          shiftRoleType: shifts.roleType,
          workplaceName: workplaces.name,
          workplaceCity: workplaces.city,
          workerName: users.fullName,
        })
        .from(shiftOffers)
        .innerJoin(shifts, eq(shiftOffers.shiftId, shifts.id))
        .leftJoin(workplaces, eq(shifts.workplaceId, workplaces.id))
        .leftJoin(users, eq(shiftOffers.workerId, users.id))
        .where(conditions.length > 0 ? and(...conditions) : undefined)
        .orderBy(desc(shiftOffers.offeredAt));
      } else {
        res.status(403).json({ error: "Access denied" });
        return;
      }

      res.json(results || []);
    } catch (error) {
      console.error("Error fetching shift offers:", error);
      res.status(500).json({ error: "Failed to fetch shift offers" });
    }
  });

  app.post(
    "/api/shift-offers/:id/respond",
    checkRoles("worker"),
    async (req: Request, res: Response) => {
      try {
        const offerId = req.params.id;
        const userId = req.headers["x-user-id"] as string;
        const { response } = req.body;

        if (!response || !["accepted", "declined"].includes(response)) {
          res.status(400).json({ error: "response must be 'accepted' or 'declined'" });
          return;
        }

        const [offer] = await db.select().from(shiftOffers).where(eq(shiftOffers.id, offerId));
        if (!offer) {
          res.status(404).json({ error: "Shift offer not found" });
          return;
        }

        if (offer.workerId !== userId) {
          res.status(403).json({ error: "This offer is not for you" });
          return;
        }

        if (offer.status !== "pending") {
          res.json({ success: true, message: `Offer already ${offer.status}`, alreadyResponded: true, status: offer.status });
          return;
        }

        await db.insert(auditLog).values({
          userId,
          action: `OFFER_${response.toUpperCase()}`,
          entityType: "shift_offer",
          entityId: offerId,
          details: JSON.stringify({ shiftId: offer.shiftId, response }),
        });

        if (response === "accepted") {
          const [shift] = await db.select().from(shifts).where(eq(shifts.id, offer.shiftId));
          if (!shift) {
            res.status(404).json({ error: "Associated shift not found" });
            return;
          }

          const existingAccepted = await db.select({ count: sql<number>`count(*)::int` })
            .from(shiftOffers)
            .where(and(
              eq(shiftOffers.shiftId, offer.shiftId),
              eq(shiftOffers.status, "accepted")
            ));
          const currentAccepted = existingAccepted[0]?.count || 0;
          const neededForShift = shift.workersNeeded || 1;

          if (currentAccepted >= neededForShift) {
            res.status(409).json({ error: "This shift has already been filled with enough workers" });
            return;
          }

          await db.update(shiftOffers)
            .set({ status: "accepted", respondedAt: new Date() })
            .where(eq(shiftOffers.id, offerId));

          if (!shift.workerUserId) {
            await db.update(shifts)
              .set({ workerUserId: userId, updatedAt: new Date() })
              .where(eq(shifts.id, offer.shiftId));
          }

          const acceptedCount = await db.select({ count: sql<number>`count(*)::int` })
            .from(shiftOffers)
            .where(and(
              eq(shiftOffers.shiftId, offer.shiftId),
              eq(shiftOffers.status, "accepted")
            ));
          const totalAccepted = acceptedCount[0]?.count || 0;
          const neededCount = shift.workersNeeded || 1;
          const shiftFilled = totalAccepted >= neededCount;

          const cancelledWorkerIds: string[] = [];

          if (shiftFilled) {
            const otherOffers = await db.select().from(shiftOffers)
              .where(and(
                eq(shiftOffers.shiftId, offer.shiftId),
                ne(shiftOffers.id, offerId),
                eq(shiftOffers.status, "pending")
              ));

            for (const otherOffer of otherOffers) {
              await db.update(shiftOffers)
                .set({ status: "cancelled", respondedAt: new Date(), cancelledAt: new Date(), cancelledBy: userId, cancelReason: "Shift filled - enough workers accepted" })
                .where(eq(shiftOffers.id, otherOffer.id));
              cancelledWorkerIds.push(otherOffer.workerId);
              await db.insert(auditLog).values({
                userId,
                action: "OFFER_CANCELLED_AUTO",
                entityType: "shift_offer",
                entityId: otherOffer.id,
                details: JSON.stringify({ shiftId: offer.shiftId, cancelledWorkerId: otherOffer.workerId, reason: "Shift filled - enough workers accepted" }),
              });
            }
          }

          if (shift.requestId && shiftFilled) {
            await db.update(shiftRequests)
              .set({ status: "filled", updatedAt: new Date() })
              .where(eq(shiftRequests.id, shift.requestId));
          }

          const hrAdmins = await db.select({ id: users.id })
            .from(users)
            .where(or(eq(users.role, "admin"), eq(users.role, "hr")));

          const [worker] = await db.select({ fullName: users.fullName })
            .from(users)
            .where(eq(users.id, userId));

          for (const ha of hrAdmins) {
            await db.insert(appNotifications).values({
              userId: ha.id,
              type: "offer_accepted",
              title: "Shift Offer Accepted",
              body: `${worker?.fullName || "A worker"} accepted the ${shift.roleType || ""} shift at ${shift.title} on ${shift.date}.`,
              deepLink: `/shifts/${shift.id}`,
            });
          }

          sendPushNotifications(
            hrAdmins.map(ha => ha.id),
            "Shift Offer Accepted",
            `${worker?.fullName || "A worker"} accepted the shift on ${shift.date}.`,
            { type: "offer_accepted", shiftId: shift.id }
          );

          if (cancelledWorkerIds.length > 0) {
            for (const cwId of cancelledWorkerIds) {
              await db.insert(appNotifications).values({
                userId: cwId,
                type: "offer_cancelled",
                title: "Shift Offer Cancelled",
                body: `The ${shift.roleType || ""} shift at ${shift.title} on ${shift.date} has been filled by another worker.`,
                deepLink: `/shift-offers`,
              });
            }

            sendPushNotifications(
              cancelledWorkerIds,
              "Shift Offer Cancelled",
              `The shift on ${shift.date} has been filled by another worker.`,
              { type: "offer_cancelled", shiftId: shift.id }
            );
          }

          if (shift.requestId) {
            const [req2] = await db.select().from(shiftRequests).where(eq(shiftRequests.id, shift.requestId));
            if (req2) {
              await db.insert(appNotifications).values({
                userId: req2.clientId,
                type: "request_filled",
                title: "Shift Request Filled",
                body: `Your shift request for ${req2.roleType} on ${req2.date} has been filled.`,
                deepLink: `/shift-requests/${req2.id}`,
              });
              sendPushNotifications(
                [req2.clientId],
                "Shift Request Filled",
                `Your shift request for ${req2.roleType} on ${req2.date} has been filled.`
              );
            }
          }

          await db.insert(auditLog).values({
            userId: userId,
            action: "OFFER_ACCEPTED",
            entityType: "shift_offer",
            entityId: offerId,
            details: JSON.stringify({ shiftId: offer.shiftId, cancelledOffers: cancelledWorkerIds.length }),
          });

          broadcast({ type: "shift_offer_accepted", data: { offerId, shiftId: offer.shiftId } });

          res.json({ success: true, status: "accepted" });
        } else {
          await db.update(shiftOffers)
            .set({ status: "declined", respondedAt: new Date() })
            .where(eq(shiftOffers.id, offerId));

          const [shift] = await db.select().from(shifts).where(eq(shifts.id, offer.shiftId));

          const hrAdmins = await db.select({ id: users.id })
            .from(users)
            .where(or(eq(users.role, "admin"), eq(users.role, "hr")));

          const [worker] = await db.select({ fullName: users.fullName })
            .from(users)
            .where(eq(users.id, userId));

          for (const ha of hrAdmins) {
            await db.insert(appNotifications).values({
              userId: ha.id,
              type: "offer_declined",
              title: "Shift Offer Declined",
              body: `${worker?.fullName || "A worker"} declined the ${shift?.roleType || ""} shift on ${shift?.date || "unknown date"}.`,
              deepLink: `/shifts/${offer.shiftId}`,
            });
          }

          sendPushNotifications(
            hrAdmins.map(ha => ha.id),
            "Shift Offer Declined",
            `${worker?.fullName || "A worker"} declined a shift offer.`,
            { type: "offer_declined", shiftId: offer.shiftId }
          );

          await db.insert(auditLog).values({
            userId: userId,
            action: "OFFER_DECLINED",
            entityType: "shift_offer",
            entityId: offerId,
            details: JSON.stringify({ shiftId: offer.shiftId }),
          });

          broadcast({ type: "shift_offer_declined", data: { offerId, shiftId: offer.shiftId } });

          res.json({ success: true, status: "declined" });
        }
      } catch (error) {
        console.error("Error responding to shift offer:", error);
        res.status(500).json({ error: "Failed to respond to shift offer" });
      }
    }
  );

  app.get(
    "/api/admin/debug/broadcast/:shiftId",
    checkRoles("admin", "hr"),
    async (req: Request, res: Response) => {
      try {
        const shiftId = req.params.shiftId;
        
        const [shift] = await db.select().from(shifts).where(eq(shifts.id, shiftId));
        if (!shift) {
          res.status(404).json({ error: "Shift not found" });
          return;
        }

        const offers = await db.select().from(shiftOffers).where(eq(shiftOffers.shiftId, shiftId));
        
        const workerIds = offers.map(o => o.workerId);
        let tokensCount = 0;
        if (workerIds.length > 0) {
          const tokens = await db.select({ token: pushTokens.token })
            .from(pushTokens)
            .where(and(inArray(pushTokens.userId, workerIds), eq(pushTokens.isActive, true)));
          tokensCount = tokens.length;
        }

        const auditEntries = await db.select().from(auditLog)
          .where(and(eq(auditLog.entityType, "shift"), eq(auditLog.entityId, shiftId)))
          .orderBy(desc(auditLog.createdAt));

        res.json({
          shiftId,
          shiftStatus: shift.status,
          workerUserId: shift.workerUserId,
          totalOffers: offers.length,
          offersByStatus: {
            pending: offers.filter(o => o.status === "pending").length,
            accepted: offers.filter(o => o.status === "accepted").length,
            declined: offers.filter(o => o.status === "declined").length,
            cancelled: offers.filter(o => o.status === "cancelled").length,
          },
          pushTokensFound: tokensCount,
          auditTrail: auditEntries.map(a => ({
            action: a.action,
            details: a.details ? JSON.parse(a.details) : null,
            createdAt: a.createdAt,
          })),
        });
      } catch (error) {
        console.error("Error in debug broadcast:", error);
        res.status(500).json({ error: "Failed to fetch broadcast debug info" });
      }
    }
  );

  app.post("/api/shifts/:id/blast", checkRoles("admin", "hr"), async (req: Request, res: Response) => {
    try {
      const shiftId = req.params.id;
      const userId = req.headers["x-user-id"] as string;
      const { workersNeeded } = req.body || {};

      const [shift] = await db.select().from(shifts).where(eq(shifts.id, shiftId));
      if (!shift) {
        res.status(404).json({ error: "Shift not found" });
        return;
      }

      if (workersNeeded && typeof workersNeeded === "number" && workersNeeded > 0) {
        await db.update(shifts).set({ workersNeeded, updatedAt: new Date() }).where(eq(shifts.id, shiftId));
      }

      const [workplace] = shift.workplaceId
        ? await db.select().from(workplaces).where(eq(workplaces.id, shift.workplaceId))
        : [null];

      const allWorkers = await db.select({
        id: users.id,
        fullName: users.fullName,
        workerRoles: users.workerRoles,
      })
      .from(users)
      .where(and(
        eq(users.role, "worker"),
        eq(users.isActive, true)
      ));

      let eligibleWorkers = allWorkers.filter(w => {
        if (shift.roleType && w.workerRoles) {
          try {
            const roles = JSON.parse(w.workerRoles);
            if (Array.isArray(roles) && roles.length > 0) {
              return roles.some((r: string) => r.toLowerCase() === shift.roleType!.toLowerCase());
            }
          } catch {
            return true;
          }
        }
        return true;
      });

      if (shift.workerUserId) {
        eligibleWorkers = eligibleWorkers.filter(w => w.id !== shift.workerUserId);
      }

      const existingOffers = await db.select({ workerId: shiftOffers.workerId })
        .from(shiftOffers)
        .where(and(
          eq(shiftOffers.shiftId, shiftId),
          inArray(shiftOffers.status, ["pending", "accepted"])
        ));
      const alreadyOffered = new Set(existingOffers.map(o => o.workerId));
      eligibleWorkers = eligibleWorkers.filter(w => !alreadyOffered.has(w.id));

      if (shift.date) {
        const existingShifts = await db.select({
          workerUserId: shifts.workerUserId,
          startTime: shifts.startTime,
          endTime: shifts.endTime,
        })
        .from(shifts)
        .where(and(
          eq(shifts.date, shift.date),
          not(isNull(shifts.workerUserId)),
          ne(shifts.status, "cancelled"),
          ne(shifts.id, shiftId)
        ));

        const conflictWorkerIds = new Set<string>();
        for (const es of existingShifts) {
          if (es.workerUserId && es.startTime && shift.startTime) {
            const existingEnd = es.endTime || "23:59";
            const shiftEnd = shift.endTime || "23:59";
            if (es.startTime < shiftEnd && existingEnd > shift.startTime) {
              conflictWorkerIds.add(es.workerUserId);
            }
          }
        }
        eligibleWorkers = eligibleWorkers.filter(w => !conflictWorkerIds.has(w.id));
      }

      const offeredWorkerIds: string[] = [];
      let offerErrors = 0;
      console.log(`[BLAST] Shift ${shiftId}: ${eligibleWorkers.length} eligible workers found`);

      for (const worker of eligibleWorkers) {
        try {
          await db.insert(shiftOffers).values({
            shiftId,
            workerId: worker.id,
            status: "pending",
          });

          await db.insert(appNotifications).values({
            userId: worker.id,
            type: "shift_offer",
            title: "New Shift Available",
            body: `A ${shift.roleType || shift.category || ""} shift at ${workplace?.name || shift.title || "a workplace"} on ${shift.date} is available. Tap to accept.`,
            deepLink: `/shift-offers`,
          });

          offeredWorkerIds.push(worker.id);
        } catch (offerErr: any) {
          offerErrors++;
          if (offerErr?.message?.includes("unique_shift_worker_offer")) {
            console.log(`[BLAST] Skipped duplicate offer for worker ${worker.id}`);
          } else {
            console.error(`[BLAST] Failed to create offer for worker ${worker.id}:`, offerErr?.message || offerErr);
          }
        }
      }

      if (offeredWorkerIds.length > 0) {
        sendPushNotifications(
          offeredWorkerIds,
          "New Shift Available",
          `A ${shift.roleType || shift.category || ""} shift at ${workplace?.name || shift.title || "a workplace"} on ${shift.date} is available.`,
          { type: "shift_offer", shiftId }
        );
      }

      await db.insert(auditLog).values({
        userId,
        action: "SHIFT_BLAST_ALL",
        entityType: "shift",
        entityId: shiftId,
        details: JSON.stringify({
          totalEligible: eligibleWorkers.length,
          offersCreated: offeredWorkerIds.length,
          offerErrors,
          alreadyOffered: alreadyOffered.size,
        }),
      });

      broadcast({ type: "shift_blast", data: { shiftId, offersCreated: offeredWorkerIds.length } });

      res.json({
        success: true,
        offersCreated: offeredWorkerIds.length,
        totalEligible: eligibleWorkers.length + alreadyOffered.size,
        alreadyOffered: alreadyOffered.size,
        errors: offerErrors,
        workersNeeded: workersNeeded || null,
      });
    } catch (error) {
      console.error("Error blasting shift to all workers:", error);
      res.status(500).json({ error: "Failed to blast shift to workers" });
    }
  });

  // ========================================
  // In-App Notifications
  // ========================================

  // ========================================
  // Profile Photo API
  // ========================================

  app.post("/api/profile-photo", async (req: Request, res: Response) => {
    try {
      const userId = req.headers["x-user-id"] as string;
      if (!userId) {
        res.status(401).json({ error: "Authentication required" });
        return;
      }

      const { photoData } = req.body;
      if (!photoData || typeof photoData !== "string") {
        res.status(400).json({ error: "Photo data is required" });
        return;
      }

      if (!photoData.startsWith("data:image/")) {
        res.status(400).json({ error: "Invalid image format. Must be a base64 data URI." });
        return;
      }

      const sizeInBytes = Buffer.byteLength(photoData, "utf8");
      if (sizeInBytes > 5 * 1024 * 1024) {
        res.status(400).json({ error: "Photo is too large. Maximum 5MB allowed." });
        return;
      }

      const [photo] = await db.insert(userPhotos).values({
        userId,
        url: photoData,
        status: "pending_review",
      }).returning();

      res.json({ photo: { id: photo.id, status: photo.status, createdAt: photo.createdAt } });
    } catch (error) {
      console.error("Error uploading profile photo:", error);
      res.status(500).json({ error: "Failed to upload photo" });
    }
  });

  app.get("/api/profile-photo", async (req: Request, res: Response) => {
    try {
      const userId = req.headers["x-user-id"] as string;
      const targetUserId = (req.query.userId as string) || userId;
      if (!userId) {
        res.status(401).json({ error: "Authentication required" });
        return;
      }

      const photos = await db
        .select()
        .from(userPhotos)
        .where(eq(userPhotos.userId, targetUserId))
        .orderBy(desc(userPhotos.createdAt))
        .limit(1);

      res.json({ photo: photos[0] || null });
    } catch (error) {
      console.error("Error fetching profile photo:", error);
      res.status(500).json({ error: "Failed to fetch photo" });
    }
  });

  app.get("/api/admin/photos-pending", async (req: Request, res: Response) => {
    try {
      const role = req.headers["x-user-role"] as string;
      if (role !== "admin" && role !== "hr") {
        res.status(403).json({ error: "Admin or HR access required" });
        return;
      }

      const pendingPhotos = await db
        .select({
          id: userPhotos.id,
          userId: userPhotos.userId,
          url: userPhotos.url,
          status: userPhotos.status,
          createdAt: userPhotos.createdAt,
          userName: users.fullName,
          userEmail: users.email,
        })
        .from(userPhotos)
        .innerJoin(users, eq(userPhotos.userId, users.id))
        .where(eq(userPhotos.status, "pending_review"))
        .orderBy(desc(userPhotos.createdAt));

      res.json({ photos: pendingPhotos });
    } catch (error) {
      console.error("Error fetching pending photos:", error);
      res.status(500).json({ error: "Failed to fetch pending photos" });
    }
  });

  app.patch("/api/admin/photos/:photoId/review", async (req: Request, res: Response) => {
    try {
      const userId = req.headers["x-user-id"] as string;
      const role = req.headers["x-user-role"] as string;
      if (role !== "admin" && role !== "hr") {
        res.status(403).json({ error: "Admin or HR access required" });
        return;
      }

      const { photoId } = req.params;
      const { action, rejectionReason } = req.body;

      if (!["approve", "reject"].includes(action)) {
        res.status(400).json({ error: "Action must be 'approve' or 'reject'" });
        return;
      }

      const newStatus = action === "approve" ? "approved" : "rejected";

      const [updated] = await db.update(userPhotos)
        .set({
          status: newStatus,
          reviewerId: userId,
          reviewedAt: new Date(),
          rejectionReason: action === "reject" ? (rejectionReason || "Photo does not meet requirements") : null,
        })
        .where(eq(userPhotos.id, photoId))
        .returning();

      if (!updated) {
        res.status(404).json({ error: "Photo not found" });
        return;
      }

      if (action === "approve") {
        await db.update(users)
          .set({ profilePhotoUrl: updated.url })
          .where(eq(users.id, updated.userId));
      }

      const notifTitle = action === "approve" ? "Photo Approved" : "Photo Rejected";
      const notifBody = action === "approve"
        ? "Your profile photo has been approved."
        : `Your profile photo was rejected: ${rejectionReason || "Does not meet requirements"}`;

      await db.insert(appNotifications).values({
        userId: updated.userId,
        title: notifTitle,
        body: notifBody,
        type: "photo_review",
      });

      sendPushNotifications([updated.userId], notifTitle, notifBody, { type: "photo_review" });

      broadcast({ type: "update", entity: "photo", id: updated.userId });

      res.json({ photo: { id: updated.id, status: updated.status } });
    } catch (error) {
      console.error("Error reviewing photo:", error);
      res.status(500).json({ error: "Failed to review photo" });
    }
  });

  // ========================================
  // Notifications API
  // ========================================

  app.get("/api/notifications", async (req: Request, res: Response) => {
    try {
      const userId = req.headers["x-user-id"] as string;
      if (!userId) {
        res.status(401).json({ error: "Authentication required" });
        return;
      }

      const limit = parseInt(req.query.limit as string) || 50;
      const offset = parseInt(req.query.offset as string) || 0;

      const notifications = await db.select()
        .from(appNotifications)
        .where(eq(appNotifications.userId, userId))
        .orderBy(desc(appNotifications.createdAt))
        .limit(limit)
        .offset(offset);

      const [unreadCount] = await db.select({ count: sql<number>`count(*)` })
        .from(appNotifications)
        .where(and(
          eq(appNotifications.userId, userId),
          isNull(appNotifications.readAt)
        ));

      res.json({ notifications, unreadCount: Number(unreadCount?.count || 0) });
    } catch (error) {
      console.error("Error fetching notifications:", error);
      res.status(500).json({ error: "Failed to fetch notifications" });
    }
  });

  app.patch("/api/notifications/:id/read", async (req: Request, res: Response) => {
    try {
      const userId = req.headers["x-user-id"] as string;
      const notifId = req.params.id;

      if (!userId) {
        res.status(401).json({ error: "Authentication required" });
        return;
      }

      const [updated] = await db.update(appNotifications)
        .set({ readAt: new Date() })
        .where(and(
          eq(appNotifications.id, notifId),
          eq(appNotifications.userId, userId)
        ))
        .returning();

      if (!updated) {
        res.status(404).json({ error: "Notification not found" });
        return;
      }

      res.json(updated);
    } catch (error) {
      console.error("Error marking notification as read:", error);
      res.status(500).json({ error: "Failed to mark notification as read" });
    }
  });

  app.post("/api/notifications/read-all", async (req: Request, res: Response) => {
    try {
      const userId = req.headers["x-user-id"] as string;

      if (!userId) {
        res.status(401).json({ error: "Authentication required" });
        return;
      }

      await db.update(appNotifications)
        .set({ readAt: new Date() })
        .where(and(
          eq(appNotifications.userId, userId),
          isNull(appNotifications.readAt)
        ));

      res.json({ success: true });
    } catch (error) {
      console.error("Error marking all notifications as read:", error);
      res.status(500).json({ error: "Failed to mark all notifications as read" });
    }
  });

  // ========================================
  // Shift Check-ins
  // ========================================

  app.post(
    "/api/shifts/:id/checkin",
    checkRoles("worker"),
    async (req: Request, res: Response) => {
      try {
        const shiftId = req.params.id;
        const userId = req.headers["x-user-id"] as string;
        const { status, note } = req.body;

        if (!status || !["on_my_way", "issue", "checked_in", "checked_out"].includes(status)) {
          res.status(400).json({ error: "status must be 'on_my_way', 'issue', 'checked_in', or 'checked_out'" });
          return;
        }

        const [shift] = await db.select().from(shifts).where(eq(shifts.id, shiftId));
        if (!shift) {
          res.status(404).json({ error: "Shift not found" });
          return;
        }

        const [checkin] = await db.insert(shiftCheckins).values({
          shiftId,
          workerId: userId,
          status,
          note: note || null,
        }).returning();

        const [worker] = await db.select({ fullName: users.fullName })
          .from(users)
          .where(eq(users.id, userId));

        const statusLabels: Record<string, string> = {
          on_my_way: "is on their way",
          issue: "reported an issue",
          checked_in: "has checked in",
          checked_out: "has checked out",
        };

        if (status === "issue") {
          const hrAdmins = await db.select({ id: users.id })
            .from(users)
            .where(or(eq(users.role, "admin"), eq(users.role, "hr")));

          for (const ha of hrAdmins) {
            await db.insert(appNotifications).values({
              userId: ha.id,
              type: "checkin_issue",
              title: "Worker Reported Issue",
              body: `${worker?.fullName || "A worker"} reported an issue for shift on ${shift.date}${note ? ": " + note : ""}.`,
              deepLink: `/shifts/${shiftId}`,
            });
          }

          sendPushNotifications(
            hrAdmins.map(ha => ha.id),
            "Worker Reported Issue",
            `${worker?.fullName || "A worker"} reported an issue${note ? ": " + note : ""}.`,
            { type: "checkin_issue", shiftId }
          );
        } else {
          const hrAdmins = await db.select({ id: users.id })
            .from(users)
            .where(or(eq(users.role, "admin"), eq(users.role, "hr")));

          sendPushNotifications(
            hrAdmins.map(ha => ha.id),
            "Shift Status Update",
            `${worker?.fullName || "A worker"} ${statusLabels[status] || status} for shift on ${shift.date}.`,
            { type: "shift_checkin", shiftId }
          );
        }

        broadcast({ type: "shift_checkin", data: checkin });

        res.json(checkin);
      } catch (error) {
        console.error("Error creating shift checkin:", error);
        res.status(500).json({ error: "Failed to create shift checkin" });
      }
    }
  );

  app.get("/api/shifts/:id/checkins", async (req: Request, res: Response) => {
    try {
      const shiftId = req.params.id;
      const userId = req.headers["x-user-id"] as string;

      if (!userId) {
        res.status(401).json({ error: "Authentication required" });
        return;
      }

      const checkins = await db.select({
        id: shiftCheckins.id,
        shiftId: shiftCheckins.shiftId,
        workerId: shiftCheckins.workerId,
        status: shiftCheckins.status,
        note: shiftCheckins.note,
        createdAt: shiftCheckins.createdAt,
        workerName: users.fullName,
      })
      .from(shiftCheckins)
      .leftJoin(users, eq(shiftCheckins.workerId, users.id))
      .where(eq(shiftCheckins.shiftId, shiftId))
      .orderBy(desc(shiftCheckins.createdAt));

      res.json(checkins);
    } catch (error) {
      console.error("Error fetching shift checkins:", error);
      res.status(500).json({ error: "Failed to fetch shift checkins" });
    }
  });

  // ========================================
  // Worker Eligibility
  // ========================================

  app.get(
    "/api/shift-requests/:id/eligible-workers",
    checkRoles("admin", "hr"),
    async (req: Request, res: Response) => {
      try {
        const requestId = req.params.id;

        const [request] = await db.select().from(shiftRequests).where(eq(shiftRequests.id, requestId));
        if (!request) {
          res.status(404).json({ error: "Shift request not found" });
          return;
        }

        const allWorkers = await db.select({
          id: users.id,
          fullName: users.fullName,
          email: users.email,
          workerRoles: users.workerRoles,
        })
        .from(users)
        .where(and(
          eq(users.role, "worker"),
          eq(users.isActive, true)
        ));

        const existingShifts = await db.select({
          workerUserId: shifts.workerUserId,
          startTime: shifts.startTime,
          endTime: shifts.endTime,
        })
        .from(shifts)
        .where(and(
          eq(shifts.date, request.date),
          not(isNull(shifts.workerUserId)),
          ne(shifts.status, "cancelled")
        ));

        const conflictMap = new Map<string, boolean>();
        for (const es of existingShifts) {
          if (es.workerUserId && es.startTime && es.endTime) {
            if (es.startTime < request.endTime && es.endTime > request.startTime) {
              conflictMap.set(es.workerUserId, true);
            }
          }
        }

        const result = allWorkers.map(w => {
          let roleMatch = true;
          if (w.workerRoles) {
            try {
              const roles = JSON.parse(w.workerRoles);
              if (Array.isArray(roles) && roles.length > 0) {
                roleMatch = roles.some((r: string) => r.toLowerCase() === request.roleType.toLowerCase());
              }
            } catch {
              roleMatch = true;
            }
          }

          return {
            id: w.id,
            fullName: w.fullName,
            email: w.email,
            workerRoles: w.workerRoles,
            roleMatch,
            hasConflict: conflictMap.has(w.id),
            eligible: roleMatch && !conflictMap.has(w.id),
          };
        });

        const eligibleOnly = result.filter(w => w.eligible);
        res.json({
          workers: result,
          eligibleWorkers: eligibleOnly,
          eligibleCount: eligibleOnly.length,
          totalEligible: eligibleOnly.length,
          totalWorkers: result.length,
          totalActive: result.length,
        });
      } catch (error) {
        console.error("Error fetching eligible workers:", error);
        res.status(500).json({ error: "Failed to fetch eligible workers" });
      }
    }
  );

  // ========================================
  // Safe Trial Reset API
  // ========================================

  app.post("/api/trial-reset/dry-run", checkRoles("admin"), async (_req: Request, res: Response) => {
    try {
      const counts: Record<string, number> = {};

      const tables = [
        { name: "shift_checkins", table: shiftCheckins },
        { name: "shift_offers", table: shiftOffers },
        { name: "shift_requests", table: shiftRequests },
        { name: "shifts", table: shifts },
        { name: "recurrence_exceptions", table: recurrenceExceptions },
        { name: "shift_series", table: shiftSeries },
        { name: "sent_reminders", table: sentReminders },
        { name: "app_notifications", table: appNotifications },
        { name: "tito_logs", table: titoLogs },
        { name: "timesheet_entries", table: timesheetEntries },
        { name: "timesheets", table: timesheets },
        { name: "payroll_batch_items", table: payrollBatchItems },
        { name: "payroll_batches", table: payrollBatches },
        { name: "messages", table: messages },
        { name: "conversations", table: conversations },
        { name: "workplace_assignments", table: workplaceAssignments },
        { name: "user_photos", table: userPhotos },
        { name: "audit_log", table: auditLog },
      ];

      for (const { name, table } of tables) {
        const result = await db.select({ count: sql<number>`count(*)::int` }).from(table);
        counts[name] = result[0]?.count || 0;
      }

      const nonAdminUsers = await db.select({ count: sql<number>`count(*)::int` }).from(users).where(ne(users.role, "admin"));
      counts["non_admin_users"] = nonAdminUsers[0]?.count || 0;

      const adminUsers = await db.select({ count: sql<number>`count(*)::int` }).from(users).where(eq(users.role, "admin"));
      counts["admin_users_preserved"] = adminUsers[0]?.count || 0;

      const totalRecords = Object.entries(counts)
        .filter(([k]) => k !== "admin_users_preserved")
        .reduce((sum, [, v]) => sum + v, 0);

      res.json({ counts, totalRecords, adminUsersPreserved: counts["admin_users_preserved"] });
    } catch (error) {
      console.error("Error in trial reset dry run:", error);
      res.status(500).json({ error: "Failed to perform dry run" });
    }
  });

  app.post("/api/trial-reset/execute", checkRoles("admin"), async (req: Request, res: Response) => {
    try {
      const userId = req.headers["x-user-id"] as string;
      const { confirmPhrase } = req.body;

      if (confirmPhrase !== "RESET TRIAL DATA") {
        res.status(400).json({ error: "Invalid confirmation phrase. Type 'RESET TRIAL DATA' to proceed." });
        return;
      }

      const deletionOrder = [
        { name: "export_audit_logs", q: sql`DELETE FROM export_audit_logs` },
        { name: "shift_checkins", q: sql`DELETE FROM shift_checkins` },
        { name: "shift_offers", q: sql`DELETE FROM shift_offers` },
        { name: "shift_requests", q: sql`DELETE FROM shift_requests` },
        { name: "shifts", q: sql`DELETE FROM shifts` },
        { name: "recurrence_exceptions", q: sql`DELETE FROM recurrence_exceptions` },
        { name: "shift_series", q: sql`DELETE FROM shift_series` },
        { name: "sent_reminders", q: sql`DELETE FROM sent_reminders` },
        { name: "app_notifications", q: sql`DELETE FROM app_notifications` },
        { name: "tito_logs", q: sql`DELETE FROM tito_logs` },
        { name: "timesheet_entries", q: sql`DELETE FROM timesheet_entries` },
        { name: "timesheets", q: sql`DELETE FROM timesheets` },
        { name: "payroll_batch_items", q: sql`DELETE FROM payroll_batch_items` },
        { name: "payroll_batches", q: sql`DELETE FROM payroll_batches` },
        { name: "messages", q: sql`DELETE FROM messages` },
        { name: "message_logs", q: sql`DELETE FROM message_logs` },
        { name: "conversations", q: sql`DELETE FROM conversations` },
        { name: "workplace_assignments", q: sql`DELETE FROM workplace_assignments` },
        { name: "user_photos", q: sql`DELETE FROM user_photos` },
        { name: "push_tokens", q: sql`DELETE FROM push_tokens WHERE user_id NOT IN (SELECT id FROM users WHERE role = 'admin')` },
        { name: "worker_applications", q: sql`DELETE FROM worker_applications` },
        { name: "payment_profiles", q: sql`DELETE FROM payment_profiles WHERE user_id NOT IN (SELECT id FROM users WHERE role = 'admin')` },
        { name: "non_admin_users", q: sql`DELETE FROM users WHERE role != 'admin'` },
        { name: "audit_log", q: sql`DELETE FROM audit_log` },
      ];

      const results: Record<string, string> = {};

      for (const { name, q } of deletionOrder) {
        try {
          await db.execute(q);
          results[name] = "cleared";
        } catch (e: any) {
          results[name] = `error: ${e.message}`;
        }
      }

      await db.insert(auditLog).values({
        userId,
        action: "trial_reset",
        entityType: "system",
        details: JSON.stringify({ results, timestamp: new Date().toISOString() }),
      });

      res.json({ success: true, results, message: "Trial data has been reset. Admin accounts are preserved." });
    } catch (error) {
      console.error("Error executing trial reset:", error);
      res.status(500).json({ error: "Failed to execute trial reset" });
    }
  });

  // ========================================
  // Automated Shift Reminders (runs every 15 minutes)
  // ========================================

  async function processShiftReminders() {
    try {
      const now = new Date();
      const today = now.toISOString().split("T")[0];
      const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString().split("T")[0];

      const upcomingShifts = await db
        .select({
          id: shifts.id,
          title: shifts.title,
          date: shifts.date,
          startTime: shifts.startTime,
          workerUserId: shifts.workerUserId,
          workplaceName: workplaces.name,
        })
        .from(shifts)
        .leftJoin(workplaces, eq(shifts.workplaceId, workplaces.id))
        .where(
          and(
            or(eq(shifts.date, today), eq(shifts.date, tomorrow)),
            eq(shifts.status, "scheduled"),
            sql`${shifts.workerUserId} IS NOT NULL`
          )
        );

      for (const shift of upcomingShifts) {
        if (!shift.workerUserId) continue;

        const isToday = shift.date === today;
        const reminderType = isToday ? "day_of" : "day_before";

        const existing = await db
          .select()
          .from(sentReminders)
          .where(
            and(
              eq(sentReminders.shiftId, shift.id),
              eq(sentReminders.workerId, shift.workerUserId),
              eq(sentReminders.reminderType, reminderType)
            )
          )
          .limit(1);

        if (existing.length > 0) continue;

        const title = isToday ? "Shift Today" : "Shift Tomorrow";
        const body = `${shift.title} at ${shift.workplaceName || "workplace"} - ${shift.startTime}`;

        try {
          await sendPushNotifications([shift.workerUserId], title, body, {
            type: "shift_reminder",
            shiftId: shift.id,
          });

          await db.insert(sentReminders).values({
            shiftId: shift.id,
            workerId: shift.workerUserId,
            reminderType,
          });

          await db.insert(appNotifications).values({
            userId: shift.workerUserId,
            title,
            body,
            type: "shift_reminder",
            data: JSON.stringify({ shiftId: shift.id }),
          });
        } catch (err) {
          console.error(`Failed to send reminder for shift ${shift.id}:`, err);
        }
      }
    } catch (error) {
      console.error("Error processing shift reminders:", error);
    }
  }

  async function processMissedShiftDetection() {
    try {
      const nowToronto = new Date(new Date().toLocaleString("en-US", { timeZone: "America/Toronto" }));
      const todayStr = nowToronto.toISOString().split("T")[0];
      const currentHour = nowToronto.getHours();
      const currentMin = nowToronto.getMinutes();
      const currentTimeMinutes = currentHour * 60 + currentMin;

      const todayShifts = await db.select().from(shifts).where(
        and(
          eq(shifts.date, todayStr),
          eq(shifts.status, "scheduled"),
          not(isNull(shifts.workerUserId))
        )
      );

      for (const shift of todayShifts) {
        if (!shift.startTime || !shift.workerUserId) continue;
        const [h, m] = shift.startTime.split(":").map(Number);
        const shiftStartMinutes = h * 60 + m;
        const minutesLate = currentTimeMinutes - shiftStartMinutes;

        if (minutesLate < 15 || minutesLate > 120) continue;

        const existingTito = await db.select({ id: titoLogs.id }).from(titoLogs)
          .where(and(
            eq(titoLogs.shiftId, shift.id),
            eq(titoLogs.workerId, shift.workerUserId),
            not(isNull(titoLogs.timeIn))
          ))
          .limit(1);

        if (existingTito.length > 0) continue;

        const alreadyNotified = await db.select({ id: sentReminders.id }).from(sentReminders)
          .where(and(
            eq(sentReminders.shiftId, shift.id),
            eq(sentReminders.workerId, shift.workerUserId),
            eq(sentReminders.reminderType, minutesLate >= 30 ? "noshow_hr" : "missed_worker")
          ))
          .limit(1);

        if (alreadyNotified.length > 0) continue;

        const [worker] = await db.select({ fullName: users.fullName }).from(users).where(eq(users.id, shift.workerUserId));
        const [workplace] = shift.workplaceId ? await db.select({ name: workplaces.name }).from(workplaces).where(eq(workplaces.id, shift.workplaceId)) : [null];
        const workerName = worker?.fullName || "Worker";
        const wpName = workplace?.name || "workplace";

        if (minutesLate >= 30) {
          const hrAdmins = await db.select({ id: users.id }).from(users)
            .where(and(inArray(users.role, ["admin", "hr"]), eq(users.isActive, true)));
          const hrIds = hrAdmins.map(u => u.id);

          for (const hrId of hrIds) {
            await db.insert(appNotifications).values({
              userId: hrId,
              type: "no_show_risk",
              title: "Possible No-Show",
              body: `${workerName} has not clocked in for their ${shift.startTime} shift at ${wpName}. ${minutesLate} minutes overdue.`,
              deepLink: `/shifts/${shift.id}`,
            });
          }

          sendPushNotifications(
            hrIds,
            "Possible No-Show",
            `${workerName} has not clocked in for their shift at ${wpName}. ${minutesLate} min overdue.`,
            { type: "no_show_risk", shiftId: shift.id }
          );

          await db.insert(sentReminders).values({
            shiftId: shift.id,
            workerId: shift.workerUserId,
            reminderType: "noshow_hr",
          }).onConflictDoNothing();

          await db.insert(auditLog).values({
            userId: shift.workerUserId,
            action: "NO_SHOW_RISK",
            entityType: "shift",
            entityId: shift.id,
            details: JSON.stringify({ minutesLate, workerName, workplaceName: wpName }),
          });

          console.log(`[MISSED-SHIFT] No-show alert for ${workerName}, shift ${shift.id}, ${minutesLate} min late`);
        } else if (minutesLate >= 15) {
          await db.insert(appNotifications).values({
            userId: shift.workerUserId,
            type: "missed_shift_prompt",
            title: "Shift Started",
            body: `Your shift at ${wpName} started ${minutesLate} minutes ago. Please clock in or contact HR if you have an issue.`,
            deepLink: `/clock-in`,
          });

          sendPushNotifications(
            [shift.workerUserId],
            "Shift Started",
            `Your shift at ${wpName} started ${minutesLate} minutes ago. Please clock in.`,
            { type: "missed_shift_prompt", shiftId: shift.id }
          );

          await db.insert(sentReminders).values({
            shiftId: shift.id,
            workerId: shift.workerUserId,
            reminderType: "missed_worker",
          }).onConflictDoNothing();

          console.log(`[MISSED-SHIFT] Worker prompt for ${workerName}, shift ${shift.id}, ${minutesLate} min late`);
        }
      }
    } catch (error) {
      console.error("[MISSED-SHIFT] Detection error:", error);
    }
  }

  setInterval(processMissedShiftDetection, 5 * 60 * 1000);
  processMissedShiftDetection();

  processShiftReminders();
  setInterval(processShiftReminders, 15 * 60 * 1000);

  // ========================================
  // OPENPHONE WEBHOOK - Incoming SMS Replies
  // ========================================

  const KNOWN_OPENPHONE_IDS = new Set(["PNo1n737XV", "PNCQJAOZa0"]);

  app.post("/api/webhooks/openphone", async (req: Request, res: Response) => {
    try {
      const payload = req.body;
      console.log("[OPENPHONE WEBHOOK] Received:", JSON.stringify(payload).substring(0, 500));

      res.status(200).json({ received: true });

      if (!payload?.type || payload.type !== "message.received") {
        console.log("[OPENPHONE WEBHOOK] Ignoring non-message event:", payload?.type);
        return;
      }

      const messageData = payload?.data?.object;
      if (!messageData) {
        console.log("[OPENPHONE WEBHOOK] No message data in payload");
        return;
      }

      const phoneNumberId = messageData.phoneNumberId;
      if (phoneNumberId && !KNOWN_OPENPHONE_IDS.has(phoneNumberId)) {
        console.log(`[OPENPHONE WEBHOOK] Unknown phoneNumberId: ${phoneNumberId}, rejecting`);
        return;
      }

      if (messageData.direction === "outgoing") {
        console.log("[OPENPHONE WEBHOOK] Ignoring outgoing message");
        return;
      }

      const senderPhone = messageData.from;
      const messageBody = (messageData.body || messageData.content || messageData.text || "").trim();
      const openphoneMessageId = messageData.id;

      if (!senderPhone || !messageBody) {
        console.log("[OPENPHONE WEBHOOK] Missing sender phone or message body");
        return;
      }

      console.log(`[OPENPHONE WEBHOOK] From: ${senderPhone}, Body: "${messageBody}"`);

      const normalizedPhone = senderPhone.replace(/[^\d]/g, "");
      const phoneVariants = [
        senderPhone,
        `+${normalizedPhone}`,
        `+1${normalizedPhone}`,
        normalizedPhone,
        normalizedPhone.startsWith("1") ? normalizedPhone.substring(1) : normalizedPhone,
      ];

      let worker: any = null;
      for (const variant of phoneVariants) {
        const [found] = await db.select({ id: users.id, fullName: users.fullName, phone: users.phone })
          .from(users)
          .where(and(eq(users.phone, variant), eq(users.role, "worker")));
        if (found) {
          worker = found;
          break;
        }
      }

      if (!worker) {
        const allWorkers = await db.select({ id: users.id, fullName: users.fullName, phone: users.phone })
          .from(users)
          .where(and(
            eq(users.role, "worker"),
            eq(users.isActive, true)
          ));

        worker = allWorkers.find(w => {
          if (!w.phone) return false;
          const cleaned = w.phone.replace(/[^\d]/g, "");
          return phoneVariants.some(v => {
            const vCleaned = v.replace(/[^\d]/g, "");
            return cleaned === vCleaned || cleaned.endsWith(vCleaned) || vCleaned.endsWith(cleaned);
          });
        });
      }

      await logSMS({
        phoneNumber: senderPhone,
        direction: "inbound",
        message: messageBody,
        workerId: worker?.id || null,
        status: worker ? "received" : "unknown_sender",
        openphoneMessageId,
      });

      const upperBody = messageBody.toUpperCase().trim();
      const isShiftKeyword = ["ACCEPT SHIFT", "ACCEPT", "DECLINE SHIFT", "DECLINE"].includes(upperBody);

      if (!isShiftKeyword) {
        console.log(`[OPENPHONE WEBHOOK] Non-keyword message from ${senderPhone}: "${messageBody}" - ignoring`);
        return;
      }

      if (!worker) {
        console.log(`[OPENPHONE WEBHOOK] Unknown sender ${senderPhone} sent shift keyword: "${messageBody}"`);
        sendSMS(senderPhone, "Sorry, we couldn't identify your account. Please contact HR directly or use the WFConnect app.")
          .catch(err => console.error("[OPENPHONE] Reply SMS error:", err));
        return;
      }

      let responseAction: "accepted" | "declined" | null = null;

      if (["ACCEPT SHIFT", "ACCEPT"].includes(upperBody)) {
        responseAction = "accepted";
      } else if (["DECLINE SHIFT", "DECLINE"].includes(upperBody)) {
        responseAction = "declined";
      }

      const pendingOffers = await db.select({
        offerId: shiftOffers.id,
        shiftId: shiftOffers.shiftId,
        status: shiftOffers.status,
        shiftTitle: shifts.title,
        shiftDate: shifts.date,
        shiftStartTime: shifts.startTime,
        workersNeeded: shifts.workersNeeded,
        workplaceId: shifts.workplaceId,
      })
        .from(shiftOffers)
        .innerJoin(shifts, eq(shiftOffers.shiftId, shifts.id))
        .where(and(
          eq(shiftOffers.workerId, worker.id),
          eq(shiftOffers.status, "pending")
        ))
        .orderBy(desc(shiftOffers.offeredAt))
        .limit(1);

      if (pendingOffers.length === 0) {
        sendConfirmationSMS(
          senderPhone,
          `Hi ${worker.fullName}, you don't have any pending shift offers right now. Check the WFConnect app for more details.`,
          worker.id
        ).catch(err => console.error("[OPENPHONE] Reply SMS error:", err));
        return;
      }

      const offer = pendingOffers[0];

      if (responseAction === "accepted") {
        const acceptedCount = await db.select({ id: shiftOffers.id })
          .from(shiftOffers)
          .where(and(
            eq(shiftOffers.shiftId, offer.shiftId),
            eq(shiftOffers.status, "accepted"),
            ne(shiftOffers.id, offer.offerId)
          ));

        const needed = offer.workersNeeded || 1;
        if (acceptedCount.length >= needed) {
          await db.update(shiftOffers)
            .set({ status: "cancelled", cancelReason: "Shift filled before SMS reply", cancelledAt: new Date() })
            .where(eq(shiftOffers.id, offer.offerId));

          sendConfirmationSMS(
            senderPhone,
            `Sorry ${worker.fullName}, the shift "${offer.shiftTitle}" on ${offer.shiftDate} has already been filled.`,
            worker.id
          ).catch(err => console.error("[OPENPHONE] Reply SMS error:", err));
          return;
        }

        await db.update(shiftOffers)
          .set({ status: "accepted", respondedAt: new Date() })
          .where(eq(shiftOffers.id, offer.offerId));

        const [currentShift] = await db.select().from(shifts).where(eq(shifts.id, offer.shiftId));
        if (currentShift && !currentShift.workerUserId) {
          await db.update(shifts)
            .set({ workerUserId: worker.id, updatedAt: new Date() })
            .where(eq(shifts.id, offer.shiftId));
        }

        const newAcceptedCount = acceptedCount.length + 1;
        if (newAcceptedCount >= needed) {
          await db.update(shiftOffers)
            .set({ status: "cancelled", cancelReason: "Shift filled - enough workers accepted", cancelledAt: new Date() })
            .where(and(
              eq(shiftOffers.shiftId, offer.shiftId),
              eq(shiftOffers.status, "pending")
            ));
        }

        await db.insert(auditLog).values({
          userId: worker.id,
          action: "OFFER_ACCEPTED_VIA_SMS",
          entityType: "shift_offer",
          entityId: offer.offerId,
          details: JSON.stringify({ shiftId: offer.shiftId, method: "sms" }),
        });

        const adminUsers = await db.select({ id: users.id }).from(users)
          .where(or(eq(users.role, "admin"), eq(users.role, "hr")));

        for (const admin of adminUsers) {
          await db.insert(appNotifications).values({
            userId: admin.id,
            type: "offer_accepted",
            title: "Shift Offer Accepted (SMS)",
            body: `${worker.fullName} accepted the shift "${offer.shiftTitle}" on ${offer.shiftDate} via SMS.`,
            deepLink: `/shifts/${offer.shiftId}`,
          });
        }

        broadcast({ type: "offer_responded", data: { offerId: offer.offerId, status: "accepted", workerId: worker.id, method: "sms" } });

        sendConfirmationSMS(
          senderPhone,
          `Confirmed! You've accepted the shift "${offer.shiftTitle}" on ${offer.shiftDate} at ${offer.shiftStartTime}. See the WFConnect app for details.`,
          worker.id
        ).catch(err => console.error("[OPENPHONE] Reply SMS error:", err));

      } else {
        await db.update(shiftOffers)
          .set({ status: "declined", respondedAt: new Date() })
          .where(eq(shiftOffers.id, offer.offerId));

        await db.insert(auditLog).values({
          userId: worker.id,
          action: "OFFER_DECLINED_VIA_SMS",
          entityType: "shift_offer",
          entityId: offer.offerId,
          details: JSON.stringify({ shiftId: offer.shiftId, method: "sms" }),
        });

        broadcast({ type: "offer_responded", data: { offerId: offer.offerId, status: "declined", workerId: worker.id, method: "sms" } });

        sendConfirmationSMS(
          senderPhone,
          `Got it, ${worker.fullName}. You've declined the shift "${offer.shiftTitle}" on ${offer.shiftDate}.`,
          worker.id
        ).catch(err => console.error("[OPENPHONE] Reply SMS error:", err));
      }

    } catch (error) {
      console.error("[OPENPHONE WEBHOOK] Error processing webhook:", error);
      if (!res.headersSent) {
        res.status(200).json({ received: true });
      }
    }
  });

  const httpServer = createServer(app);

  return httpServer;
}
