import type { Express, Request, Response } from "express";
import { createServer, type Server } from "node:http";
import { quoProvider } from "./integrations/quo";

type UserRole = "admin" | "hr" | "client" | "worker";

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

  const httpServer = createServer(app);

  return httpServer;
}
