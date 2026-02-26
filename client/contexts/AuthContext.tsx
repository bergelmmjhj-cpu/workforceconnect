import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { User, UserRole, WorkerOnboardingStatus } from "@/types";
import { apiRequest, getApiUrl, setAuthUser } from "@/lib/query-client";
import { connectWebSocket, disconnectWebSocket, setupAppStateSync } from "@/lib/websocket";

export class TwoFactorRequiredError extends Error {
  userId: string;
  constructor(userId: string) {
    super("Two-factor authentication required");
    this.name = "TwoFactorRequiredError";
    this.userId = userId;
  }
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  complete2FALogin: (userId: string, code: string) => Promise<{ remainingRecoveryCodes?: number }>;
  register: (email: string, password: string, fullName: string, role: UserRole) => Promise<void>;
  logout: () => Promise<void>;
  switchRole: (role: UserRole) => Promise<void>;
  updateOnboardingStatus: (status: WorkerOnboardingStatus) => Promise<void>;
  updateUser: (updates: Partial<User>) => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const STORAGE_KEY = "@workforce_connect_user";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (user) {
      setAuthUser({ id: user.id, role: user.role });
    } else {
      setAuthUser(null);
    }
  }, [user]);

  useEffect(() => {
    loadUser();
  }, []);

  useEffect(() => {
    if (user) {
      const cleanup = setupAppStateSync();
      return cleanup;
    }
  }, [user]);

  const loadUser = async () => {
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        setUser(parsed);
        setAuthUser({ id: parsed.id, role: parsed.role });
        connectWebSocket();
      }
    } catch (error) {
      console.error("Failed to load user:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (email: string, password: string) => {
    const lowerEmail = email.toLowerCase();
    
    const response = await apiRequest("POST", "/api/auth/login", { email: lowerEmail, password });
    const data = await response.json();
    
    if (data.requires2FA) {
      throw new TwoFactorRequiredError(data.userId);
    }
    
    if (data.user) {
      const loginUser: User = {
        id: data.user.id,
        email: data.user.email,
        fullName: data.user.fullName,
        role: data.user.role as UserRole,
        timezone: data.user.timezone || "America/Toronto",
        phone: data.user.phone || undefined,
        onboardingStatus: data.user.onboardingStatus as WorkerOnboardingStatus | undefined,
        workerRoles: data.user.workerRoles ? JSON.parse(data.user.workerRoles) : undefined,
        businessName: data.user.businessName,
        businessAddress: data.user.businessAddress,
        businessPhone: data.user.businessPhone,
        createdAt: data.user.createdAt,
      };
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(loginUser));
      setUser(loginUser);
      connectWebSocket();
      return;
    }
    
    throw new Error(data.error || "Invalid email or password");
  };

  const complete2FALogin = async (userId: string, code: string) => {
    const response = await apiRequest("POST", "/api/2fa/verify", { userId, code });
    const data = await response.json();
    
    if (data.verified && data.user) {
      const loginUser: User = {
        id: data.user.id,
        email: data.user.email,
        fullName: data.user.fullName,
        role: data.user.role as UserRole,
        timezone: data.user.timezone || "America/Toronto",
        phone: data.user.phone || undefined,
        onboardingStatus: data.user.onboardingStatus as WorkerOnboardingStatus | undefined,
        workerRoles: data.user.workerRoles ? JSON.parse(data.user.workerRoles) : undefined,
        businessName: data.user.businessName,
        businessAddress: data.user.businessAddress,
        businessPhone: data.user.businessPhone,
        createdAt: data.user.createdAt,
      };
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(loginUser));
      setUser(loginUser);
      connectWebSocket();
      return { remainingRecoveryCodes: data.remainingRecoveryCodes };
    }
    
    throw new Error(data.error || "Invalid verification code");
  };

  const register = async (email: string, password: string, fullName: string, role: UserRole) => {
    try {
      const response = await apiRequest("POST", "/api/auth/register", { email, password, fullName, role });
      const data = await response.json();
      if (data.user) {
        const newUser: User = {
          id: data.user.id,
          email: data.user.email,
          fullName: data.user.fullName,
          role: data.user.role as UserRole,
          timezone: data.user.timezone || "America/Toronto",
          onboardingStatus: data.user.onboardingStatus as WorkerOnboardingStatus | undefined,
          createdAt: data.user.createdAt,
        };
        await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(newUser));
        setUser(newUser);
        return;
      }
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error("Failed to create account");
    }
  };

  const logout = async () => {
    disconnectWebSocket();
    await AsyncStorage.removeItem(STORAGE_KEY);
    setUser(null);
  };

  const switchRole = async (role: UserRole) => {
    if (user) {
      const updatedUser = { ...user, role };
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updatedUser));
      setUser(updatedUser);
    }
  };

  const updateOnboardingStatus = async (status: WorkerOnboardingStatus) => {
    if (user) {
      let serverUpdated = false;
      let lastError: unknown = null;
      let verifiedStatus: string | null = null;

      for (let attempt = 0; attempt < 3; attempt++) {
        try {
          console.log(`[ONBOARDING] Attempt ${attempt + 1}/3: PATCH /api/users/me/onboarding-status with status=${status}`);
          const res = await apiRequest("PATCH", "/api/users/me/onboarding-status", { onboardingStatus: status });
          const responseData = await res.json();
          console.log(`[ONBOARDING] Server response:`, JSON.stringify(responseData));

          if (responseData.onboardingStatus === status) {
            verifiedStatus = responseData.onboardingStatus;
            serverUpdated = true;
            console.log(`[ONBOARDING] Verified: server confirmed status=${verifiedStatus}`);
          } else {
            console.warn(`[ONBOARDING] Server returned unexpected status: ${responseData.onboardingStatus} (expected ${status})`);
            serverUpdated = true;
          }
          break;
        } catch (error) {
          lastError = error;
          const errMsg = error instanceof Error ? error.message : String(error);
          console.error(`[ONBOARDING] PATCH failed (attempt ${attempt + 1}/3): ${errMsg}`);
          if (attempt < 2) await new Promise(r => setTimeout(r, 1000 * (attempt + 1)));
        }
      }

      if (!serverUpdated) {
        console.error(`[ONBOARDING] All 3 attempts failed. Status NOT saved to server.`);
        throw lastError || new Error("Failed to update onboarding status on server after 3 attempts. Please try again.");
      }

      const updatedUser = { ...user, onboardingStatus: status };
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updatedUser));
      setUser(updatedUser);
      console.log(`[ONBOARDING] Local state updated to ${status}`);
    }
  };

  const updateUser = async (updates: Partial<User>) => {
    if (user) {
      const serverFields = ['fullName', 'email', 'phone', 'timezone', 'businessName', 'businessAddress', 'businessPhone'];
      const hasServerFields = serverFields.some(f => f in updates);

      if (hasServerFields) {
        try {
          const serverUpdates: Record<string, any> = {};
          for (const f of serverFields) {
            if (f in updates) serverUpdates[f] = (updates as any)[f];
          }
          const res = await apiRequest("PATCH", "/api/users/me/profile", serverUpdates);
          const serverData = await res.json();
          const updatedUser = {
            ...user,
            ...updates,
            fullName: serverData.fullName || user.fullName,
            email: serverData.email || user.email,
            phone: serverData.phone || undefined,
            timezone: serverData.timezone || user.timezone,
            businessName: serverData.businessName || undefined,
            businessAddress: serverData.businessAddress || undefined,
            businessPhone: serverData.businessPhone || undefined,
          };
          await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updatedUser));
          setUser(updatedUser);
        } catch (error) {
          console.error("[PROFILE] Failed to update profile on server:", error);
          throw error;
        }
      } else {
        const updatedUser = { ...user, ...updates };
        await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updatedUser));
        setUser(updatedUser);
      }
    }
  };

  const refreshUser = async () => {
    await loadUser();
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user,
        login,
        complete2FALogin,
        register,
        logout,
        switchRole,
        updateOnboardingStatus,
        updateUser,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
