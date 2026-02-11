import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { User, UserRole, WorkerOnboardingStatus } from "@/types";
import { apiRequest } from "@/lib/query-client";

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
    loadUser();
  }, []);

  const loadUser = async () => {
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      if (stored) {
        setUser(JSON.parse(stored));
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
      for (let attempt = 0; attempt < 3; attempt++) {
        try {
          await apiRequest("PATCH", "/api/users/me/onboarding-status", { onboardingStatus: status });
          serverUpdated = true;
          break;
        } catch (error) {
          lastError = error;
          console.error(`Failed to sync onboarding status (attempt ${attempt + 1}/3):`, error);
          if (attempt < 2) await new Promise(r => setTimeout(r, 1000 * (attempt + 1)));
        }
      }
      if (!serverUpdated) {
        throw lastError || new Error("Failed to update onboarding status on server");
      }
      const updatedUser = { ...user, onboardingStatus: status };
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updatedUser));
      setUser(updatedUser);
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
