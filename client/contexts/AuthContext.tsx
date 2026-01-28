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

const demoUsers: Record<UserRole, User> = {
  client: {
    id: "client-1",
    email: "client@example.com",
    fullName: "Sarah Mitchell",
    role: "client",
    timezone: "America/Toronto",
    createdAt: new Date().toISOString(),
  },
  worker: {
    id: "worker-1",
    email: "worker@example.com",
    fullName: "James Rodriguez",
    role: "worker",
    timezone: "America/Toronto",
    onboardingStatus: "ONBOARDED",
    workerRoles: ["Housekeeper", "Houseperson", "Server"],
    createdAt: new Date().toISOString(),
  },
  hr: {
    id: "hr-1",
    email: "hr@example.com",
    fullName: "Emily Chen",
    role: "hr",
    timezone: "America/Toronto",
    createdAt: new Date().toISOString(),
  },
  admin: {
    id: "admin-1",
    email: "admin@example.com",
    fullName: "Michael Thompson",
    role: "admin",
    timezone: "America/Toronto",
    createdAt: new Date().toISOString(),
  },
};

const additionalDemoUsers: Record<string, User> = {
  "worker_pending@example.com": {
    id: "worker-pending",
    email: "worker_pending@example.com",
    fullName: "Alex Johnson",
    role: "worker",
    timezone: "America/Toronto",
    onboardingStatus: "AGREEMENT_PENDING",
    createdAt: new Date().toISOString(),
  },
  "worker_submitted@example.com": {
    id: "worker-submitted",
    email: "worker_submitted@example.com",
    fullName: "Maria Garcia",
    role: "worker",
    timezone: "America/Toronto",
    onboardingStatus: "APPLICATION_SUBMITTED",
    createdAt: new Date().toISOString(),
  },
  "worker_new@example.com": {
    id: "worker-new",
    email: "worker_new@example.com",
    fullName: "New Worker",
    role: "worker",
    timezone: "America/Toronto",
    onboardingStatus: "NOT_APPLIED",
    createdAt: new Date().toISOString(),
  },
};

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
    
    // Try API login first
    try {
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
    } catch (error) {
      // If API fails, fall back to demo users for testing
      console.log("API login failed, falling back to demo users");
    }
    
    // Fallback to demo users
    if (additionalDemoUsers[lowerEmail]) {
      const loginUser = additionalDemoUsers[lowerEmail];
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(loginUser));
      setUser(loginUser);
      return;
    }
    
    const role = Object.keys(demoUsers).find(
      (r) => demoUsers[r as UserRole].email === lowerEmail
    ) as UserRole | undefined;

    const loginUser = role ? demoUsers[role] : { ...demoUsers.client, email };
    
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(loginUser));
    setUser(loginUser);
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
      const newUser = { ...demoUsers[role], id: user.id };
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(newUser));
      setUser(newUser);
    }
  };

  const updateOnboardingStatus = async (status: WorkerOnboardingStatus) => {
    if (user) {
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
