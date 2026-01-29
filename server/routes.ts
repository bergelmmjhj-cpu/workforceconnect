import type { Express, Request, Response } from "express";
import { createServer, type Server } from "node:http";
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
  insertWorkerApplicationSchema
} from "../shared/schema";
import bcrypt from "bcryptjs";
import { eq, and, or, desc, isNull, sql } from "drizzle-orm";

type UserRole = "admin" | "hr" | "client" | "worker";

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
    if (!role || !allowedRoles.includes(role)) {
      res.status(403).json({ error: "Forbidden: Insufficient permissions" });
      return;
    }
    next();
  };
}

export async function registerRoutes(app: Express): Promise<Server> {
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
          // Workers see only their conversations
          convos = await db.select()
            .from(conversationsTable)
            .where(and(
              eq(conversationsTable.workerUserId, userId),
              eq(conversationsTable.isArchived, false)
            ))
            .orderBy(desc(conversationsTable.lastMessageAt));
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

      // Create user
      const [newUser] = await db.insert(users).values({
        email: email.toLowerCase(),
        password: hashedPassword,
        fullName,
        role,
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

      // Check if user is active
      if (!user.isActive) {
        res.status(401).json({ error: "Account is deactivated" });
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
    } catch (error) {
      console.error("Error updating user:", error);
      res.status(500).json({ error: "Failed to update user" });
    }
  });

  app.delete("/api/users/:id", checkRoles("admin"), async (req: Request, res: Response) => {
    try {
      const id = req.params.id as string;

      const [deletedUser] = await db.delete(users)
        .where(eq(users.id, id))
        .returning();

      if (!deletedUser) {
        res.status(404).json({ error: "User not found" });
        return;
      }

      res.json({ message: "User deleted successfully" });
    } catch (error) {
      console.error("Error deleting user:", error);
      res.status(500).json({ error: "Failed to delete user" });
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

      res.json(updatedApplication);
    } catch (error) {
      console.error("Error updating application:", error);
      res.status(500).json({ error: "Failed to update application" });
    }
  });

  const httpServer = createServer(app);

  return httpServer;
}
