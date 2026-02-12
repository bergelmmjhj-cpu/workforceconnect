import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { User, UserRole, WorkerOnboardingStatus } from "@/types";
import { apiRequest, getApiUrl, setAuthUser } from "@/lib/query-client";

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
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

  const loadUser = async () => {
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        setUser(parsed);
        setAuthUser({ id: parsed.id, role: parsed.role });
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
    
    if (data.user) {
      const loginUser: User = {
        id: data.user.id,
        email: data.user.email,
        fullName: data.user.fullName,
        role: data.user.role as UserRole,
        timezone: data.user.timezone || "America/Toronto",
        onboardingStatus: data.user.onboardingStatus as WorkerOnboardingStatus | undefined,
        workerRoles: data.user.workerRoles ? JSON.parse(data.user.workerRoles) : undefined,
        businessName: data.user.businessName,
        businessAddress: data.user.businessAddress,
        businessPhone: data.user.businessPhone,
        createdAt: data.user.createdAt,
      };
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(loginUser));
      setUser(loginUser);
      return;
    }
    
    throw new Error(data.error || "Invalid email or password");
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
      const updatedUser = { ...user, ...updates };
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updatedUser));
      setUser(updatedUser);
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
