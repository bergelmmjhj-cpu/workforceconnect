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
  impact: "low" | "medium" | "critical";
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

export interface ToolCallLog {
  toolName: string;
  input: Record<string, unknown>;
  result: unknown;
  success: boolean;
  error?: string;
}

export interface OrchestrationResponse {
  response: string;
  assistantsInvoked: AssistantType[];
  assistantOutputs: AssistantOutput[];
  overallSeverity: number;
  isActionMode?: boolean;
  toolCalls?: ToolCallLog[];
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

// Pending shift draft — stored in memory while Clawd waits for missing info
export interface PendingShiftDraft {
  type: "create_shift";
  workerQuery: string | null;       // original worker name as typed
  workplaceId: string | null;       // resolved workplace DB id
  workplaceName: string | null;
  date: string | null;              // YYYY-MM-DD
  startTime: string | null;         // HH:MM
  endTime: string | null;
  missingFields: string[];          // e.g. ["worker"]
  lastAttempt: number;              // Date.now()
  userId: string;
}
