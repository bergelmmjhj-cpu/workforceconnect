export type AssistantType = 
  | "executive"
  | "staffing"
  | "attendance"
  | "recruitment"
  | "payroll"
  | "client_risk"
  | "communication";

export interface Finding {
  title: string;
  detail: string;
  category: string;
  severity: "low" | "medium" | "high" | "critical";
}

export interface Risk {
  title: string;
  description: string;
  likelihood: "low" | "medium" | "high";
  impact: "low" | "medium" | "high" | "critical";
  affectedEntity?: string;
  affectedEntityId?: string;
}

export interface Evidence {
  metric: string;
  value: string | number;
  context: string;
  period?: string;
}

export interface Action {
  title: string;
  description: string;
  priority: "low" | "medium" | "high" | "urgent";
  category: string;
}

export interface AssistantOutput {
  assistantType: AssistantType;
  summary: string;
  keyFindings: Finding[];
  risks: Risk[];
  supportingEvidence: Evidence[];
  recommendedActions: Action[];
  confidenceScore: number;
  severityScore: number;
}

export interface OrchestrationRequest {
  userMessage: string;
  conversationHistory: Array<{ role: string; content: string }>;
  userId: string;
}

export interface OrchestrationResponse {
  response: string;
  assistantsInvoked: AssistantType[];
  assistantOutputs: AssistantOutput[];
  overallSeverity: number;
  metadata: {
    totalDurationMs: number;
    model: string;
  };
}

export interface AnalyticsTimeWindow {
  days: number;
  label: string;
}

export const TIME_WINDOWS: Record<string, AnalyticsTimeWindow> = {
  "7d": { days: 7, label: "7-day" },
  "14d": { days: 14, label: "14-day" },
  "30d": { days: 30, label: "30-day" },
};
