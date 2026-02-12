import { WebSocketServer, WebSocket } from "ws";
import type { Server } from "node:http";

const clients = new Set<WebSocket>();

let wss: WebSocketServer;

export function setupWebSocket(server: Server) {
  wss = new WebSocketServer({ server, path: "/ws" });
  
  wss.on("connection", (ws) => {
    clients.add(ws);
    console.log(`[WS] Client connected (total: ${clients.size})`);
    
    ws.on("close", () => {
      clients.delete(ws);
      console.log(`[WS] Client disconnected (total: ${clients.size})`);
    });
    
    ws.on("error", (err) => {
      console.error("[WS] Error:", err.message);
      clients.delete(ws);
    });

    ws.send(JSON.stringify({ type: "connected", timestamp: new Date().toISOString() }));
  });
  
  console.log("[WS] WebSocket server ready on /ws");
}

export function broadcast(event: { type: string; entity: string; id?: string; data?: any }) {
  const message = JSON.stringify({ ...event, timestamp: new Date().toISOString() });
  let sent = 0;
  clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(message);
      sent++;
    }
  });
  if (sent > 0) {
    console.log(`[WS] Broadcast ${event.type}:${event.entity} to ${sent} clients`);
  }
}

export function getConnectedClientsCount(): number {
  return clients.size;
}
