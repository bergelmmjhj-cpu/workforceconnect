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
    throw new Error("EXPO_PUBLIC_DOMAIN is not set");
  }

  let url = new URL(`https://${host}`);

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
  const url = new URL(route, baseUrl);

  const headers: Record<string, string> = {
    ...getAuthHeaders(),
  };
  if (data) {
    headers["Content-Type"] = "application/json";
  }

  console.log(`[API REQUEST] ${method} ${url.toString()} | hasAuth=${!!headers["x-user-id"]} role=${headers["x-user-role"] || "NONE"}`);

  const res = await fetch(url.toString(), {
    method,
    headers,
    body: data ? JSON.stringify(data) : undefined,
    credentials: "include",
  });

  console.log(`[API RESPONSE] ${method} ${route} => ${res.status}`);

  await throwIfResNotOk(res);
  return res;
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    await ensureAuthLoaded();

    const baseUrl = getApiUrl();
    const url = new URL(queryKey.join("/") as string, baseUrl);

    const headers = getAuthHeaders();

    const res = await fetch(url.toString(), {
      headers,
      credentials: "include",
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
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});
