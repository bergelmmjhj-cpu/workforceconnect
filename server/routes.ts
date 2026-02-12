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
  shifts
} from "../shared/schema";
import { getPayPeriodsForYear, getPayPeriod } from "../shared/payPeriods2026";
import bcrypt from "bcryptjs";
import { eq, and, or, desc, isNull, sql, inArray } from "drizzle-orm";

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

    for (const chunk of chunks) {
      await fetch("https://exp.host/--/api/v2/push/send", {
        method: "POST",
        headers: {
          "Accept": "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify(chunk),
      }).catch(err => console.error("Push notification error:", err));
    }
  } catch (error) {
    console.error("Failed to send push notifications:", error);
  }
}

const rateLimitMap = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT_WINDOW = 60000;
const RATE_LIMIT_MAX = 5;

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

export async function registerRoutes(app: Express): Promise<Server> {
  app.get("/api/health", (_req: Request, res: Response) => {
    res.json({
      status: "ok",
      version: "1.0.0",
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

      // Return user without password
      const { password: _, ...userWithoutPassword } = user;
      res.json({ user: userWithoutPassword });
    } catch (error) {
      console.error("Error logging in:", error);
      res.status(500).json({ error: "Failed to login" });
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
      const { role, isActive, onboardingStatus, workerRoles } = req.body;

      const updateData: Record<string, unknown> = { updatedAt: new Date() };
      if (role !== undefined) updateData.role = role;
      if (isActive !== undefined) updateData.isActive = isActive;
      if (onboardingStatus !== undefined) updateData.onboardingStatus = onboardingStatus;
      if (workerRoles !== undefined) updateData.workerRoles = workerRoles;

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
          await db.update(users)
            .set({ 
              onboardingStatus: "AGREEMENT_PENDING",
              updatedAt: new Date()
            })
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

  app.get("/api/workplaces/:id", checkRoles("admin", "hr"), async (req: Request, res: Response) => {
    try {
      const [workplace] = await db.select().from(workplaces).where(eq(workplaces.id, req.params.id));
      if (!workplace) {
        res.status(404).json({ error: "Workplace not found" });
        return;
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
      .where(eq(workplaceAssignments.workplaceId, req.params.id))
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

      const { workplaceId, gpsLat, gpsLng, shiftId } = req.body;

      if (!workplaceId) {
        res.status(400).json({ error: "workplaceId is required" });
        return;
      }

      const [workplace] = await db.select().from(workplaces).where(eq(workplaces.id, workplaceId));
      if (!workplace) {
        res.status(404).json({ error: "Workplace not found" });
        return;
      }

      if (!workplace.isActive) {
        res.status(400).json({ error: "Workplace is not active" });
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
        res.status(403).json({ error: "You are not assigned to this workplace" });
        return;
      }

      if (workplace.latitude === null || workplace.longitude === null) {
        res.status(400).json({ error: "Workplace coordinates not configured. Contact admin." });
        return;
      }

      if (gpsLat === undefined || gpsLng === undefined) {
        res.status(400).json({ error: "Location permission required for TITO. Please enable GPS." });
        return;
      }

      const distance = haversineDistance(gpsLat, gpsLng, workplace.latitude, workplace.longitude);
      const radius = workplace.geofenceRadiusMeters || 150;
      const isWithinRadius = distance <= radius;

      if (!isWithinRadius) {
        const [titoLog] = await db.insert(titoLogs).values({
          workerId: userId,
          workplaceId,
          shiftId: shiftId || null,
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
        shiftId: shiftId || null,
        timeIn: new Date(),
        timeInGpsLat: gpsLat,
        timeInGpsLng: gpsLng,
        timeInDistanceMeters: distance,
        timeInGpsVerified: true,
        status: "pending",
      }).returning();

      res.json({
        success: true,
        message: "Successfully clocked in",
        titoLogId: titoLog.id,
        timeIn: titoLog.timeIn,
        distance: Math.round(distance),
        gpsVerified: true,
      });
    } catch (error) {
      console.error("Error clocking in:", error);
      res.status(500).json({ error: "Failed to clock in" });
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

      if (titoLog.timeOut) {
        res.status(400).json({ error: "Already clocked out" });
        return;
      }

      const [workplace] = await db.select().from(workplaces).where(eq(workplaces.id, titoLog.workplaceId!));
      if (!workplace) {
        res.status(404).json({ error: "Workplace not found" });
        return;
      }

      if (workplace.latitude === null || workplace.longitude === null) {
        res.status(400).json({ error: "Workplace coordinates not configured. Contact admin." });
        return;
      }

      if (gpsLat === undefined || gpsLng === undefined) {
        res.status(400).json({ error: "Location permission required for TITO. Please enable GPS." });
        return;
      }

      const distance = haversineDistance(gpsLat, gpsLng, workplace.latitude, workplace.longitude);
      const radius = workplace.geofenceRadiusMeters || 150;
      const isWithinRadius = distance <= radius;

      if (!isWithinRadius) {
        const [updated] = await db.update(titoLogs)
          .set({
            timeOut: new Date(),
            timeOutGpsLat: gpsLat,
            timeOutGpsLng: gpsLng,
            timeOutDistanceMeters: distance,
            timeOutGpsVerified: false,
            timeOutGpsFailureReason: `Outside geofence: ${Math.round(distance)}m from workplace (max ${radius}m)`,
            updatedAt: new Date(),
          })
          .where(eq(titoLogs.id, titoLogId))
          .returning();

        res.status(400).json({ 
          error: `You are not within the required GPS radius of the workplace. You are ${Math.round(distance)}m away, but must be within ${radius}m.`,
          distance: Math.round(distance),
          maxRadius: radius,
          gpsVerified: false,
        });
        return;
      }

      const [updated] = await db.update(titoLogs)
        .set({
          timeOut: new Date(),
          timeOutGpsLat: gpsLat,
          timeOutGpsLng: gpsLng,
          timeOutDistanceMeters: distance,
          timeOutGpsVerified: true,
          updatedAt: new Date(),
        })
        .where(eq(titoLogs.id, titoLogId))
        .returning();

      res.json({
        success: true,
        message: "Successfully clocked out",
        titoLogId: updated.id,
        timeIn: updated.timeIn,
        timeOut: updated.timeOut,
        distance: Math.round(distance),
        gpsVerified: true,
      });
    } catch (error) {
      console.error("Error clocking out:", error);
      res.status(500).json({ error: "Failed to clock out" });
    }
  });

  app.get("/api/tito/my-logs", async (req: Request, res: Response) => {
    try {
      const userId = req.headers["x-user-id"] as string;

      if (!userId) {
        res.status(401).json({ error: "Authentication required" });
        return;
      }

      const logs = await db.select({
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
        createdAt: titoLogs.createdAt,
        workplaceName: workplaces.name,
      })
      .from(titoLogs)
      .leftJoin(workplaces, eq(titoLogs.workplaceId, workplaces.id))
      .where(eq(titoLogs.workerId, userId))
      .orderBy(desc(titoLogs.createdAt))
      .limit(50);

      res.json(logs);
    } catch (error) {
      console.error("Error fetching TITO logs:", error);
      res.status(500).json({ error: "Failed to fetch TITO logs" });
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
        createdAt: users.createdAt,
      }).from(users).where(eq(users.role, "worker")).orderBy(desc(users.createdAt));
      res.json(workers);
    } catch (error) {
      console.error("Error fetching workers:", error);
      res.status(500).json({ error: "Failed to fetch workers" });
    }
  });

  // ========================================
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
      const { workplaceId, workerUserId, title, date, startTime, endTime, notes, frequencyType, category, recurringDays, recurringEndDate } = req.body;

      const freq = frequencyType || "one-time";
      const cat = category || "janitorial";
      const isOpenEnded = freq === "open-ended";

      if (!workplaceId || !workerUserId || !title || !date || !startTime) {
        res.status(400).json({ error: "workplaceId, workerUserId, title, date, and startTime are required" });
        return;
      }

      if (!isOpenEnded && !endTime) {
        res.status(400).json({ error: "endTime is required for non-open-ended shifts" });
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

      const [worker] = await db.select().from(users).where(and(eq(users.id, workerUserId), eq(users.role, "worker")));
      if (!worker) {
        res.status(404).json({ error: "Worker not found" });
        return;
      }

      if (freq === "recurring" && recurringDays) {
        const days: string[] = typeof recurringDays === "string" ? recurringDays.split(",") : recurringDays;
        const dayMap: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
        const endDateStr = recurringEndDate || (() => {
          const d = new Date(date);
          d.setDate(d.getDate() + 90);
          return d.toISOString().split("T")[0];
        })();

        const [parentShift] = await db.insert(shifts).values({
          workplaceId,
          workerUserId,
          title,
          date,
          startTime,
          endTime: endTime || null,
          notes: notes || null,
          status: "scheduled",
          frequencyType: freq,
          category: cat,
          recurringDays: days.join(","),
          recurringEndDate: endDateStr,
          createdByUserId: userId,
        }).returning();

        const instances: any[] = [];
        const startDate = new Date(date);
        const finalDate = new Date(endDateStr);
        const current = new Date(startDate);
        current.setDate(current.getDate() + 1);

        while (current <= finalDate) {
          const dayName = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][current.getDay()];
          if (days.includes(dayName)) {
            instances.push({
              workplaceId,
              workerUserId,
              title,
              date: current.toISOString().split("T")[0],
              startTime,
              endTime: endTime || null,
              notes: notes || null,
              status: "scheduled",
              frequencyType: "recurring",
              category: cat,
              recurringDays: days.join(","),
              parentShiftId: parentShift.id,
              createdByUserId: userId,
            });
          }
          current.setDate(current.getDate() + 1);
        }

        if (instances.length > 0) {
          await db.insert(shifts).values(instances);
        }

        broadcast({ type: "created", entity: "shift", id: parentShift.id, data: { workerUserId, workplaceId } });
        res.status(201).json(parentShift);
      } else {
        const [newShift] = await db.insert(shifts).values({
          workplaceId,
          workerUserId,
          title,
          date,
          startTime,
          endTime: isOpenEnded ? null : endTime,
          notes: notes || null,
          status: "scheduled",
          frequencyType: freq,
          category: cat,
          createdByUserId: userId,
        }).returning();

        broadcast({ type: "created", entity: "shift", id: newShift.id, data: { workerUserId, workplaceId } });
        res.status(201).json(newShift);
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

      await db.delete(shifts).where(eq(shifts.id, req.params.id));

      broadcast({ type: "deleted", entity: "shift", id: req.params.id, data: { workerUserId: existing.workerUserId, workplaceId: existing.workplaceId } });

      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting shift:", error);
      res.status(500).json({ error: "Failed to delete shift" });
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

  const httpServer = createServer(app);

  return httpServer;
}
