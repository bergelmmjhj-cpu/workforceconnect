import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

interface OnboardingContextType {
  hasCompletedOnboarding: boolean;
  isLoading: boolean;
  completeOnboarding: () => Promise<void>;
  resetOnboarding: () => Promise<void>;
}

const OnboardingContext = createContext<OnboardingContextType | undefined>(undefined);

const ONBOARDING_KEY = "@workforce_connect_onboarding";

export function OnboardingProvider({ children }: { children: ReactNode }) {
  const [hasCompletedOnboarding, setHasCompletedOnboarding] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadOnboardingStatus();
  }, []);

  const loadOnboardingStatus = async () => {
    try {
      const completed = await AsyncStorage.getItem(ONBOARDING_KEY);
      setHasCompletedOnboarding(completed === "true");
    } catch (error) {
      console.error("Failed to load onboarding status:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const completeOnboarding = async () => {
    try {
      await AsyncStorage.setItem(ONBOARDING_KEY, "true");
      setHasCompletedOnboarding(true);
    } catch (error) {
      console.error("Failed to save onboarding status:", error);
    }
  };

  const resetOnboarding = async () => {
    try {
      await AsyncStorage.removeItem(ONBOARDING_KEY);
      setHasCompletedOnboarding(false);
    } catch (error) {
      console.error("Failed to reset onboarding:", error);
    }
  };

  return (
    <OnboardingContext.Provider
      value={{
        hasCompletedOnboarding,
        isLoading,
        completeOnboarding,
        resetOnboarding,
      }}
    >
      {children}
    </OnboardingContext.Provider>
  );
}

export function useOnboarding() {
  const context = useContext(OnboardingContext);
  if (context === undefined) {
    throw new Error("useOnboarding must be used within an OnboardingProvider");
  }
  return context;
}
