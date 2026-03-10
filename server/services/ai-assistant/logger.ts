import { db } from "../../db";
import { aiActionLogs } from "../../../shared/schema";

export type ActionTaken =
  | "alert_sent"
  | "skipped_already_alerted"
  | "skipped_rule"
  | "error"
  | "activated"
  | "cycle_complete"
  | "paused"
  | "resumed";

export interface LogActionParams {
  monitorType: string;
  signalId?: string;
  signalSummary: string;
  actionTaken: ActionTaken;
  alertSentTo?: string;
  errorMessage?: string;
}

export async function logAction(params: LogActionParams): Promise<void> {
  try {
    await db.insert(aiActionLogs).values({
      monitorType: params.monitorType,
      signalId: params.signalId ?? null,
      signalSummary: params.signalSummary,
      actionTaken: params.actionTaken,
      alertSentTo: params.alertSentTo ?? null,
      errorMessage: params.errorMessage ?? null,
    });
  } catch (err: any) {
    console.error("[AI] Logger failed to write:", err?.message);
  }
}
