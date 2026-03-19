import { QueryClient, QueryFunction } from "@tanstack/react-query";
import AsyncStorage from "@react-native-async-storage/async-storage";

const STORAGE_KEY = "@workforce_connect_user";

let _cachedUser: { id: string; role: string } | null = null;
let _loadingFromStorage: Promise<void> | null = null;

export function setAuthUser(user: { id: string; role: string } | null) {
  _cachedUser = user;
  if (user) {
    console.log(`[AUTH] setAuthUser: id=${user.id}, role=${user.role}`);
  } else {
    console.log("[AUTH] setAuthUser: cleared");
  }
}

async function ensureAuthLoaded(): Promise<void> {
  if (_cachedUser) return;
  if (_loadingFromStorage) {
    await _loadingFromStorage;
    return;
  }
  _loadingFromStorage = (async () => {
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      if (stored && !_cachedUser) {
        const parsed = JSON.parse(stored);
        if (parsed?.id && parsed?.role) {
          _cachedUser = { id: parsed.id, role: parsed.role };
          console.log(`[AUTH] Loaded from storage fallback: id=${parsed.id}, role=${parsed.role}`);
        }
      }
    } catch (e) {
      console.error("[AUTH] Failed to load from storage:", e);
    }
  })();
  await _loadingFromStorage;
  _loadingFromStorage = null;
}

function getAuthHeaders(): Record<string, string> {
  if (_cachedUser) {
    return {
      "x-user-id": _cachedUser.id,
      "x-user-role": _cachedUser.role,
    };
  }
  console.warn("[AUTH] getAuthHeaders called but _cachedUser is null - no auth headers will be sent");
  return {};
}

export function getApiUrl(): string {
  let host = process.env.EXPO_PUBLIC_DOMAIN;

  if (!host) {
    host = "app.wfconnect.org";
  }

  const hostWithoutDevPort = host.replace(/:5000$/, "");

  let url = new URL(`https://${hostWithoutDevPort}`);

  return url.href;
}

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

export async function apiRequest(
  method: string,
  route: string,
  data?: unknown | undefined,
): Promise<Response> {
  await ensureAuthLoaded();

  const baseUrl = getApiUrl();
  const fullUrl = `${baseUrl.replace(/\/$/, '')}${route}`;

  const authHeaders = getAuthHeaders();
  const headers: Record<string, string> = {
    ...authHeaders,
    "Accept": "application/json",
  };
  if (data) {
    headers["Content-Type"] = "application/json";
  }

  console.log(`[API REQUEST] ${method} ${fullUrl} | userId=${authHeaders["x-user-id"] || "NONE"} role=${authHeaders["x-user-role"] || "NONE"}`);

  try {
    const res = await fetch(fullUrl, {
      method,
      headers,
      body: data ? JSON.stringify(data) : undefined,
    });

    console.log(`[API RESPONSE] ${method} ${route} => ${res.status}`);

    await throwIfResNotOk(res);
    return res;
  } catch (error: any) {
    console.error(`[API ERROR] ${method} ${route} => ${error.message}`);
    throw error;
  }
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    await ensureAuthLoaded();

    const baseUrl = getApiUrl();
    const path = queryKey.join("/") as string;
    const fullUrl = `${baseUrl.replace(/\/$/, '')}${path}`;

    const headers: Record<string, string> = {
      ...getAuthHeaders(),
      "Accept": "application/json",
    };

    const res = await fetch(fullUrl, {
      headers,
    });

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
    }

    await throwIfResNotOk(res);
    return await res.json();
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: true,
      staleTime: 30000,
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});
