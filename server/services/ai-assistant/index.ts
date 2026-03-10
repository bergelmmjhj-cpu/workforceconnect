import { runMonitorCycle } from "./monitor";
import { logAction } from "./logger";

const CYCLE_INTERVAL_MS = 5 * 60 * 1000;

let intervalHandle: ReturnType<typeof setInterval> | null = null;
let isPaused = false;
let isRunning = false;
let lastCycleAt: Date | null = null;
let lastCycleError: string | null = null;
let cycleCount = 0;

export function getStatus() {
  return {
    running: intervalHandle !== null,
    paused: isPaused,
    lastCycleAt,
    lastCycleError,
    cycleCount,
    cycleIntervalMinutes: CYCLE_INTERVAL_MS / 60000,
  };
}

export async function triggerManualCycle(): Promise<void> {
  if (isRunning) {
    throw new Error("A monitor cycle is already in progress");
  }
  await executeCycle();
}

export function pause(): void {
  isPaused = true;
}

export function resume(): void {
  isPaused = false;
}

async function executeCycle(): Promise<void> {
  if (isRunning) return;
  isRunning = true;
  try {
    await runMonitorCycle();
    lastCycleAt = new Date();
    lastCycleError = null;
    cycleCount++;
  } catch (err: any) {
    lastCycleError = err?.message ?? "Unknown error";
    console.error("[AI] Monitor cycle error:", lastCycleError);
    await logAction({
      monitorType: "system",
      signalSummary: "Monitor cycle failed",
      actionTaken: "error",
      errorMessage: lastCycleError,
    });
  } finally {
    isRunning = false;
  }
}

export async function startAssistant(): Promise<void> {
  if (intervalHandle) {
    console.log("[AI] Assistant already started");
    return;
  }

  console.log("[AI] Starting operations assistant...");

  await executeCycle();

  intervalHandle = setInterval(async () => {
    if (isPaused) {
      console.log("[AI] Cycle skipped — assistant is paused");
      return;
    }
    await executeCycle();
  }, CYCLE_INTERVAL_MS);

  console.log(`[AI] Assistant started — cycling every ${CYCLE_INTERVAL_MS / 60000} minutes`);
}
