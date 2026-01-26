import type { Express, Request, Response } from "express";
import { createServer, type Server } from "node:http";
import { quoProvider } from "./integrations/quo";
import { db } from "./db";
import { contactLeads } from "../shared/schema";

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
