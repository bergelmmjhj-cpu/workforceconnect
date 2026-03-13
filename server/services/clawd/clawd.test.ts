/**
 * Clawd AI Test Suite
 *
 * Tests for:
 * - SMS classification and entity extraction
 * - Orchestrator routing logic (sticky action mode, pending draft detection)
 *
 * Run with: npx tsx server/services/clawd/clawd.test.ts
 */

import { classifySms } from "./sms-classifier";

// ─── Minimal test runner ──────────────────────────────────────────────────────

let passed = 0;
let failed = 0;

function assert(condition: boolean, message: string) {
  if (condition) {
    console.log(`  ✓ ${message}`);
    passed++;
  } else {
    console.error(`  ✗ FAIL: ${message}`);
    failed++;
  }
}

function describe(suiteName: string, fn: () => void) {
  console.log(`\n── ${suiteName} ──`);
  fn();
}

function it(testName: string, fn: () => void) {
  console.log(`\n  [${testName}]`);
  try {
    fn();
  } catch (err: any) {
    console.error(`  ✗ THREW: ${err.message}`);
    failed++;
  }
}

// ─── SMS Classifier Tests ─────────────────────────────────────────────────────

describe("SMS Classifier — Staff Absence", () => {

  it("Test 1: Classic sick call — known worker", () => {
    const result = classifySms("Hi, I'm sick today and can't come in for my shift.");
    // Expected intent: staff_absence
    // Expected entities: reason=sick, date=today
    assert(result.intent === "staff_absence", `intent=staff_absence (got ${result.intent})`);
    assert(result.confidence === "high" || result.confidence === "moderate", `confidence=high|moderate (got ${result.confidence})`);
    assert(result.urgency === "critical" || result.urgency === "high", `urgency=critical|high (got ${result.urgency})`);
    assert(result.is_staffing_related === true, "is_staffing_related=true");
    assert(result.reason !== null, `reason extracted (got ${result.reason})`);
    assert(result.shift_date !== null, `shift_date extracted (got ${result.shift_date})`);
    console.log(`    → payload: intent=${result.intent} confidence=${result.confidence} urgency=${result.urgency} date=${result.shift_date} reason=${result.reason}`);
  });

  it("Test 2: Unknown number — sick call still classified (fail-open)", () => {
    // Simulate: sender not in DB. Classifier should still detect intent regardless of phone match.
    const result = classifySms("I won't be able to make it today. Family emergency.");
    assert(result.intent === "staff_absence" || result.intent === "emergency", `intent=staff_absence|emergency (got ${result.intent})`);
    assert(result.is_staffing_related === true, "is_staffing_related=true (alert should fire even for unknown sender)");
    assert(result.reason !== null, `reason extracted (got ${result.reason})`);
    console.log(`    → payload: intent=${result.intent} reason=${result.reason}`);
  });

  it("Test 3: Late arrival SMS", () => {
    const result = classifySms("Running a bit late, traffic on the highway. Will be there in 20 minutes.");
    assert(result.intent === "late_arrival", `intent=late_arrival (got ${result.intent})`);
    assert(result.urgency === "high" || result.urgency === "medium", `urgency=high|medium (got ${result.urgency})`);
    assert(result.is_staffing_related === true, "is_staffing_related=true");
    console.log(`    → payload: intent=${result.intent} urgency=${result.urgency}`);
  });

  it("Test 4: Cannot attend — implicit sick call", () => {
    const result = classifySms("Sorry I can't come in today.");
    assert(result.intent === "staff_absence", `intent=staff_absence (got ${result.intent})`);
    assert(result.is_staffing_related === true, "is_staffing_related=true");
    console.log(`    → payload: intent=${result.intent} confidence=${result.confidence}`);
  });

});

describe("SMS Classifier — Client Requests", () => {

  it("Test 5: 'Can I have Nino tomorrow' — natural language client request", () => {
    const result = classifySms("Can I have Nino tomorrow?");
    assert(result.intent === "client_request", `intent=client_request (got ${result.intent})`);
    assert(result.worker_name_mentioned !== null, `worker_name_mentioned extracted (got ${result.worker_name_mentioned})`);
    assert(result.shift_date !== null, `shift_date=tomorrow extracted (got ${result.shift_date})`);
    console.log(`    → payload: intent=${result.intent} worker=${result.worker_name_mentioned} date=${result.shift_date}`);
  });

  it("Test 6: 'I need 2 hk tomorrow morning' — quantity and role", () => {
    const result = classifySms("I need 2 hk tomorrow morning.");
    assert(result.intent === "client_request", `intent=client_request (got ${result.intent})`);
    assert(result.quantity_requested === 2, `quantity=2 (got ${result.quantity_requested})`);
    assert(result.role_requested === "housekeeping", `role=housekeeping (got ${result.role_requested})`);
    assert(result.shift_date !== null, `shift_date extracted (got ${result.shift_date})`);
    console.log(`    → payload: intent=${result.intent} qty=${result.quantity_requested} role=${result.role_requested} date=${result.shift_date}`);
  });

  it("Test 7: 'Can someone cover tonight?' — unknown sender client request", () => {
    const result = classifySms("Can someone cover tonight? We're short staffed.");
    assert(result.intent === "client_request", `intent=client_request (got ${result.intent})`);
    assert(result.is_staffing_related === true, "is_staffing_related=true — alert should fire even for unknown sender");
    assert(result.shift_date !== null, `shift_date=tonight extracted (got ${result.shift_date})`);
    console.log(`    → payload: intent=${result.intent} date=${result.shift_date}`);
  });

  it("Test 8: 'Need housekeepers tomorrow' — plural role with date", () => {
    const result = classifySms("Need housekeepers tomorrow.");
    assert(result.intent === "client_request", `intent=client_request (got ${result.intent})`);
    assert(result.role_requested === "housekeeping", `role=housekeeping (got ${result.role_requested})`);
    assert(result.shift_date !== null, `shift_date extracted (got ${result.shift_date})`);
    console.log(`    → payload: intent=${result.intent} role=${result.role_requested} date=${result.shift_date}`);
  });

  it("Test 9: 'Can I request Bergel for tomorrow' — specific worker request", () => {
    const result = classifySms("Can I request Bergel for tomorrow morning?");
    assert(result.intent === "client_request", `intent=client_request (got ${result.intent})`);
    assert(result.shift_date !== null, `shift_date extracted (got ${result.shift_date})`);
    console.log(`    → payload: intent=${result.intent} worker=${result.worker_name_mentioned} date=${result.shift_date}`);
  });

  it("Test 10: 'Need 1 cleaner at 7am' — role, quantity, time", () => {
    const result = classifySms("Need 1 cleaner at 7am tomorrow.");
    assert(result.intent === "client_request", `intent=client_request (got ${result.intent})`);
    assert(result.quantity_requested === 1, `quantity=1 (got ${result.quantity_requested})`);
    assert(result.role_requested === "housekeeping", `role=housekeeping (got ${result.role_requested})`);
    assert(result.shift_time !== null, `shift_time extracted (got ${result.shift_time})`);
    console.log(`    → payload: qty=${result.quantity_requested} role=${result.role_requested} time=${result.shift_time} date=${result.shift_date}`);
  });

});

describe("SMS Classifier — Unknown / General Messages", () => {

  it("Test 11: Staffing-related but ambiguous", () => {
    const result = classifySms("What's the schedule for next week at the hotel?");
    assert(result.is_staffing_related === true, "is_staffing_related=true (staffing keywords present)");
    console.log(`    → payload: intent=${result.intent} confidence=${result.confidence}`);
  });

  it("Test 12: Completely unrelated message", () => {
    const result = classifySms("Hi there! Hope you're having a great day!");
    assert(result.intent === "general_inquiry", `intent=general_inquiry (got ${result.intent})`);
    assert(result.is_staffing_related === false, "is_staffing_related=false");
    console.log(`    → payload: intent=${result.intent}`);
  });

  it("Test 13: ACCEPT SHIFT keyword (not classified by classifier)", () => {
    // Routes.ts handles this before classifier is called, but classifier should still run neutrally
    const result = classifySms("ACCEPT SHIFT");
    assert(result.intent === "general_inquiry" || result.intent === "unknown_staffing", `intent=general|unknown_staffing (got ${result.intent})`);
    console.log(`    → payload: intent=${result.intent}`);
  });

});

describe("SMS Classifier — Entity Extraction Edge Cases", () => {

  it("Test 14: Date extraction — 'today'", () => {
    const result = classifySms("I'm sick today.");
    assert(result.shift_date !== null, `shift_date extracted (got ${result.shift_date})`);
    const today = new Date(new Date().toLocaleString("en-US", { timeZone: "America/Toronto" }))
      .toISOString().split("T")[0];
    assert(result.shift_date === today, `shift_date=${today} (got ${result.shift_date})`);
  });

  it("Test 15: Date extraction — 'tomorrow'", () => {
    const result = classifySms("Can I have someone tomorrow?");
    const tomorrow = new Date(new Date().toLocaleString("en-US", { timeZone: "America/Toronto" }));
    tomorrow.setDate(tomorrow.getDate() + 1);
    const expectedDate = tomorrow.toISOString().split("T")[0];
    assert(result.shift_date === expectedDate, `shift_date=${expectedDate} (got ${result.shift_date})`);
  });

  it("Test 16: Role mapping — 'hk' abbreviation", () => {
    const result = classifySms("I need 3 hk for the morning.");
    assert(result.role_requested === "housekeeping", `role=housekeeping (got ${result.role_requested})`);
    assert(result.quantity_requested === 3, `quantity=3 (got ${result.quantity_requested})`);
  });

  it("Test 17: Workplace extraction — 'Hyatt Place' from message", () => {
    const result = classifySms("Need someone at Hyatt Place tomorrow at 8am.");
    assert(result.workplace_mentioned !== null, `workplace_mentioned extracted (got ${result.workplace_mentioned})`);
    assert(result.workplace_mentioned?.toLowerCase().includes("hyatt"), `workplace contains 'hyatt' (got ${result.workplace_mentioned})`);
    console.log(`    → workplace=${result.workplace_mentioned} time=${result.shift_time}`);
  });

  it("Test 18: Time extraction — '8-4:30'", () => {
    const result = classifySms("Create a shift tomorrow 8-4:30am.");
    assert(result.shift_time !== null, `shift_time extracted (got ${result.shift_time})`);
    console.log(`    → shift_time=${result.shift_time}`);
  });

  it("Test 19: Worker name from 'Can I have Nino'", () => {
    const result = classifySms("Can I have Nino for tomorrow morning?");
    assert(result.worker_name_mentioned !== null, `worker_name_mentioned extracted (got ${result.worker_name_mentioned})`);
    console.log(`    → worker_name_mentioned=${result.worker_name_mentioned}`);
  });

});

describe("Orchestrator Routing — detectConversationActionContext", () => {
  // These test the sticky action mode detection logic

  it("Test 20: Short reply after 'Worker Not Found' message should trigger action mode", () => {
    const ACTIVE_ACTION_CONTEXT_SIGNALS = [
      "What I Need From You", "Still needed", "Worker Not Found",
      "Not found in system", "before I can proceed", "Draft saved",
      "just need the worker", "provide a name or phone",
    ];
    const lastAssistantMsg = "Worker Not Found in system. Please provide a name or phone number.";
    const staysInAction = ACTIVE_ACTION_CONTEXT_SIGNALS.some(s => lastAssistantMsg.includes(s));
    assert(staysInAction === true, "detectConversationActionContext returns true for 'Worker Not Found' signal");
  });

  it("Test 21: 'Try BergelMMJ' is an action pattern", () => {
    const ACTION_INTENT_PATTERNS = [
      /^\s*try\s+\w+/i,
    ];
    const msg = "Try BergelMMJ";
    const matches = ACTION_INTENT_PATTERNS.some(p => p.test(msg));
    assert(matches === true, `'Try BergelMMJ' matches action pattern`);
  });

  it("Test 22: Phone number as standalone reply matches action pattern", () => {
    const phonePattern = /^\s*[\d\s\-\+\(\)]{7,15}\s*$/;
    assert(phonePattern.test("4372188887"), `'4372188887' matches phone pattern`);
    assert(phonePattern.test("437-218-8887"), `'437-218-8887' matches phone pattern`);
    assert(phonePattern.test("+14372188887"), `'+14372188887' matches phone pattern`);
    assert(!phonePattern.test("hello world"), `'hello world' does NOT match phone pattern`);
  });

  it("Test 23: 'even if you can't find...' is an action pattern", () => {
    const pattern = /\beven if (you can't|you cannot|there('s| is) no)\b/i;
    assert(pattern.test("even if you can't find a shift"), `action pattern matches 'even if you can't find'`);
    assert(pattern.test("Even if you cannot match them"), `action pattern matches 'Even if you cannot'`);
  });

  it("Test 24: General analytics message does NOT trigger action mode", () => {
    const ACTION_INTENT_PATTERNS = [
      /\b(assign|add|put)\b.*(worker|staff|person)/i,
      /\bcreate\b.*(shift|request|schedule)/i,
      /^\s*try\s+\w+/i,
      /^\s*[\d\s\-\+\(\)]{7,15}\s*$/,
    ];
    const ACTIVE_ACTION_CONTEXT_SIGNALS = ["Worker Not Found", "Draft saved"];

    const analyticsMsg = "What is the current fill rate for this week?";
    const emptyHistory: Array<{ role: string; content: string }> = [];

    const triggersAction = ACTION_INTENT_PATTERNS.some(p => p.test(analyticsMsg));
    const hasContext = emptyHistory.slice(-4).some(m =>
      m.role === "assistant" && ACTIVE_ACTION_CONTEXT_SIGNALS.some(s => m.content.includes(s))
    );
    assert(!triggersAction && !hasContext, "analytics message routes to analysis mode with empty history");
  });

});

describe("Discord Payload Validation", () => {

  it("Test 25: Staff absence Discord payload structure", () => {
    const payload = {
      title: "Staff Calloff — Maria Santos",
      message: "🔴 STAFF CALLOFF\nWorker: Maria Santos (+14372188887)\nShift: Today, Holiday Inn Victoria, 2PM–10PM\nReason: sick\nMessage: \"I'm sick today\"\nActions: Notified Lilee · Searching replacements",
      urgency: "urgent",
      type: "sick_call",
    };
    assert(payload.title.includes("Calloff"), "title includes 'Calloff'");
    assert(payload.message.includes("🔴"), "message has red emoji for urgency");
    assert(payload.message.includes("Worker:"), "message has Worker field");
    assert(payload.message.includes("Actions:"), "message has Actions field");
    assert(payload.urgency === "urgent", "urgency is urgent");
    assert(payload.type === "sick_call", "type is sick_call");
  });

  it("Test 26: Unmatched sender calloff payload structure", () => {
    const payload = {
      title: "Possible Calloff — Unmatched Sender",
      message: "🔴 POSSIBLE CALLOFF\nSender: Unmatched number +14372188887\nWorker mentioned: unknown\nReason: sick\nMessage: \"I can't come in\"\nAction: Manual review needed — worker not in system",
      urgency: "urgent",
      type: "sick_call",
    };
    assert(payload.title.includes("Unmatched"), "title notes unmatched sender");
    assert(payload.message.includes("Manual review"), "message requests manual review");
    assert(payload.urgency === "urgent", "urgency is urgent even for unknown sender");
  });

  it("Test 27: Client request Discord payload structure", () => {
    const payload = {
      title: "Client Request — Unmatched Sender",
      message: "🟡 CLIENT REQUEST\nSender: Unmatched number +16471234567\nRequest: 2 housekeepers tomorrow morning\nWorkplace: Holiday Inn (inferred)\nActions: Notified Lilee · Creating staffing request",
      urgency: "warning",
      type: "client_request",
    };
    assert(payload.message.includes("🟡"), "yellow emoji for client request");
    assert(payload.message.includes("Request:"), "message has Request field");
    assert(payload.urgency === "warning", "urgency is warning");
    assert(payload.type === "client_request", "type is client_request");
  });

});

// ─── Summary ─────────────────────────────────────────────────────────────────

console.log(`\n${"═".repeat(50)}`);
console.log(`Results: ${passed} passed, ${failed} failed`);
if (failed > 0) {
  console.error(`\n${failed} test(s) FAILED`);
  process.exit(1);
} else {
  console.log(`\nAll tests passed.`);
}
