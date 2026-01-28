import type { Express, Request, Response } from "express";
import { createServer, type Server } from "node:http";
import { quoProvider } from "./integrations/quo";
import { db } from "./db";
import { contactLeads, users, registerUserSchema, loginUserSchema } from "../shared/schema";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";

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
  app.get(
    "/api/quo/conversations",
    checkRoles("admin", "hr"),
    async (_req: Request, res: Response) => {
      try {
        const conversations = await quoProvider.getConversations();
        res.json(conversations);
      } catch (error) {
        console.error("Error fetching conversations:", error);
        res.status(500).json({ error: "Failed to fetch conversations" });
      }
    }
  );

  app.get(
    "/api/quo/conversations/:id/messages",
    checkRoles("admin", "hr"),
    async (req: Request, res: Response) => {
      try {
        const { id } = req.params;
        const messages = await quoProvider.getMessages(id);
        res.json(messages);
      } catch (error) {
        console.error("Error fetching messages:", error);
        res.status(500).json({ error: "Failed to fetch messages" });
      }
    }
  );

  app.post(
    "/api/quo/messages",
    checkRoles("admin", "hr"),
    async (req: Request, res: Response) => {
      try {
        const { toNumber, body, conversationId } = req.body;
        if (!toNumber || !body) {
          res.status(400).json({ error: "toNumber and body are required" });
          return;
        }
        const message = await quoProvider.sendMessage({ toNumber, body, conversationId });
        res.json(message);
      } catch (error) {
        console.error("Error sending message:", error);
        res.status(500).json({ error: "Failed to send message" });
      }
    }
  );

  app.get(
    "/api/quo/calls",
    checkRoles("admin", "hr"),
    async (_req: Request, res: Response) => {
      try {
        const calls = await quoProvider.getCallLogs();
        res.json(calls);
      } catch (error) {
        console.error("Error fetching call logs:", error);
        res.status(500).json({ error: "Failed to fetch call logs" });
      }
    }
  );

  app.post(
    "/api/quo/calls",
    checkRoles("admin", "hr"),
    async (req: Request, res: Response) => {
      try {
        const { toNumber, participantName } = req.body;
        if (!toNumber) {
          res.status(400).json({ error: "toNumber is required" });
          return;
        }
        const call = await quoProvider.initiateCall({ toNumber, participantName });
        res.json(call);
      } catch (error) {
        console.error("Error initiating call:", error);
        res.status(500).json({ error: "Failed to initiate call" });
      }
    }
  );

  app.post(
    "/api/quo/dev/simulate-inbound",
    checkRoles("admin", "hr"),
    async (req: Request, res: Response) => {
      try {
        const { fromNumber, body } = req.body;
        if (!fromNumber || !body) {
          res.status(400).json({ error: "fromNumber and body are required" });
          return;
        }
        const message = await quoProvider.handleInboundMessage(fromNumber, body);
        res.json(message);
      } catch (error) {
        console.error("Error simulating inbound message:", error);
        res.status(500).json({ error: "Failed to simulate inbound message" });
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
      const { id } = req.params;
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
      const { id } = req.params;

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

  const httpServer = createServer(app);

  return httpServer;
}
