import { AppState, Platform } from "react-native";
import { queryClient, getApiUrl } from "./query-client";

let ws: WebSocket | null = null;
let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
let lastSyncTime: string | null = null;

const RECONNECT_DELAY = 3000;

type WSListener = (connected: boolean) => void;
const listeners = new Set<WSListener>();

export function addWSListener(fn: WSListener) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

function notifyListeners(connected: boolean) {
  listeners.forEach(fn => fn(connected));
}

export function getLastSyncTime(): string | null {
  return lastSyncTime;
}

export function isWSConnected(): boolean {
  return ws?.readyState === WebSocket.OPEN;
}

function getWSUrl(): string {
  const apiUrl = getApiUrl();
  const wsUrl = apiUrl.replace(/^https:/, "wss:").replace(/^http:/, "ws:").replace(/\/$/, "");
  return `${wsUrl}/ws`;
}

function handleMessage(data: string) {
  try {
    const event = JSON.parse(data);
    lastSyncTime = event.timestamp || new Date().toISOString();

    if (event.type === "connected") return;

    console.log(`[WS] Received: ${event.type}:${event.entity}`);

    const entity = event.entity;

    if (entity === "assignment") {
      queryClient.invalidateQueries({ queryKey: ["/api/workplaces"] });
      queryClient.invalidateQueries({ queryKey: ["/api/workers"] });
    } else if (entity === "workplace") {
      queryClient.invalidateQueries({ queryKey: ["/api/workplaces"] });
    } else if (entity === "user" || entity === "onboarding") {
      queryClient.invalidateQueries({ queryKey: ["/api/workers"] });
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
    } else if (entity === "shift") {
      queryClient.invalidateQueries({ queryKey: ["/api/shifts"] });
    } else {
      queryClient.invalidateQueries();
    }
  } catch (e) {
    console.error("[WS] Failed to parse message:", e);
  }
}

export function connectWebSocket() {
  if (ws && (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING)) {
    return;
  }

  try {
    const url = getWSUrl();
    console.log(`[WS] Connecting to ${url}`);
    ws = new WebSocket(url);

    ws.onopen = () => {
      console.log("[WS] Connected");
      notifyListeners(true);
      if (reconnectTimer) {
        clearTimeout(reconnectTimer);
        reconnectTimer = null;
      }
    };

    ws.onmessage = (event) => {
      handleMessage(typeof event.data === "string" ? event.data : "");
    };

    ws.onclose = () => {
      console.log("[WS] Disconnected");
      notifyListeners(false);
      ws = null;
      scheduleReconnect();
    };

    ws.onerror = (error) => {
      console.error("[WS] Error:", error);
      ws?.close();
    };
  } catch (e) {
    console.error("[WS] Connection failed:", e);
    scheduleReconnect();
  }
}

function scheduleReconnect() {
  if (reconnectTimer) return;
  reconnectTimer = setTimeout(() => {
    reconnectTimer = null;
    connectWebSocket();
  }, RECONNECT_DELAY);
}

export function disconnectWebSocket() {
  if (reconnectTimer) {
    clearTimeout(reconnectTimer);
    reconnectTimer = null;
  }
  if (ws) {
    ws.onclose = null;
    ws.close();
    ws = null;
    notifyListeners(false);
  }
}

export function setupAppStateSync() {
  const subscription = AppState.addEventListener("change", (nextAppState) => {
    if (nextAppState === "active") {
      console.log("[SYNC] App became active - refetching and reconnecting");
      queryClient.invalidateQueries();
      connectWebSocket();
    }
  });

  if (Platform.OS === "web") {
    const handleFocus = () => {
      console.log("[SYNC] Window focused - refetching");
      queryClient.invalidateQueries();
      if (!isWSConnected()) {
        connectWebSocket();
      }
    };
    
    const handleOnline = () => {
      console.log("[SYNC] Network online - reconnecting");
      connectWebSocket();
      queryClient.invalidateQueries();
    };

    window.addEventListener("focus", handleFocus);
    window.addEventListener("online", handleOnline);

    return () => {
      subscription.remove();
      window.removeEventListener("focus", handleFocus);
      window.removeEventListener("online", handleOnline);
    };
  }

  return () => subscription.remove();
}
