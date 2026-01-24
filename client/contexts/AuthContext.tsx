import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { User, UserRole } from "@/types";

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, fullName: string, role: UserRole) => Promise<void>;
  logout: () => Promise<void>;
  switchRole: (role: UserRole) => Promise<void>;
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
    // Demo login - find matching demo user by email or use client as default
    const role = Object.keys(demoUsers).find(
      (r) => demoUsers[r as UserRole].email === email.toLowerCase()
    ) as UserRole | undefined;

    const loginUser = role ? demoUsers[role] : { ...demoUsers.client, email };
    
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(loginUser));
    setUser(loginUser);
  };

  const register = async (email: string, password: string, fullName: string, role: UserRole) => {
    const newUser: User = {
      id: `user-${Date.now()}`,
      email,
      fullName,
      role,
      timezone: "America/Toronto",
      createdAt: new Date().toISOString(),
    };

    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(newUser));
    setUser(newUser);
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
