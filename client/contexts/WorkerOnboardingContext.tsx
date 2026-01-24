import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";
import { useAuth } from "@/contexts/AuthContext";
import {
  WorkerOnboardingStatus,
  WorkerApplication,
  SubcontractorAgreementTemplate,
  SubcontractorAgreementAcceptance,
} from "@/types";
import {
  getWorkerApplicationByWorkerId,
  getActiveAgreementTemplate,
  getAgreementAcceptanceByWorkerId,
  initializeOnboardingData,
  isWorkerOnboardingComplete,
} from "@/storage";

interface WorkerOnboardingContextType {
  onboardingStatus: WorkerOnboardingStatus;
  isOnboardingComplete: boolean;
  isLoading: boolean;
  application: WorkerApplication | null;
  agreementTemplate: SubcontractorAgreementTemplate | null;
  acceptance: SubcontractorAgreementAcceptance | null;
  refreshOnboardingData: () => Promise<void>;
  requiresOnboarding: boolean;
}

const WorkerOnboardingContext = createContext<WorkerOnboardingContextType | undefined>(undefined);

export function WorkerOnboardingProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [application, setApplication] = useState<WorkerApplication | null>(null);
  const [agreementTemplate, setAgreementTemplate] = useState<SubcontractorAgreementTemplate | null>(null);
  const [acceptance, setAcceptance] = useState<SubcontractorAgreementAcceptance | null>(null);

  const onboardingStatus: WorkerOnboardingStatus = user?.onboardingStatus || "NOT_APPLIED";
  const isOnboardingComplete = isWorkerOnboardingComplete(onboardingStatus);
  const requiresOnboarding = user?.role === "worker" && !isOnboardingComplete;

  const refreshOnboardingData = useCallback(async () => {
    if (!user || user.role !== "worker") {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      await initializeOnboardingData();

      const [app, template, acc] = await Promise.all([
        getWorkerApplicationByWorkerId(user.id),
        getActiveAgreementTemplate(),
        getAgreementAcceptanceByWorkerId(user.id),
      ]);

      setApplication(app);
      setAgreementTemplate(template);
      setAcceptance(acc);
    } catch (error) {
      console.error("Failed to load onboarding data:", error);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    refreshOnboardingData();
  }, [refreshOnboardingData]);

  return (
    <WorkerOnboardingContext.Provider
      value={{
        onboardingStatus,
        isOnboardingComplete,
        isLoading,
        application,
        agreementTemplate,
        acceptance,
        refreshOnboardingData,
        requiresOnboarding,
      }}
    >
      {children}
    </WorkerOnboardingContext.Provider>
  );
}

export function useWorkerOnboarding() {
  const context = useContext(WorkerOnboardingContext);
  if (context === undefined) {
    throw new Error("useWorkerOnboarding must be used within a WorkerOnboardingProvider");
  }
  return context;
}
