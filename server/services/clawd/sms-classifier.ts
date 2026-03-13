/**
 * Clawd SMS Classifier
 *
 * Classifies inbound SMS messages into operational categories with entity extraction.
 * Regex-first approach — no LLM cost, instant classification.
 */

export type SmsIntent =
  | "staff_absence"
  | "late_arrival"
  | "emergency"
  | "client_request"
  | "general_inquiry"
  | "unknown_staffing";

export type SmsConfidence = "high" | "moderate" | "low";
export type SmsUrgency = "critical" | "high" | "medium" | "low";

export interface SmsClassification {
  intent: SmsIntent;
  confidence: SmsConfidence;
  urgency: SmsUrgency;
  worker_name_mentioned: string | null;
  workplace_mentioned: string | null;
  role_requested: string | null;
  quantity_requested: number | null;
  shift_date: string | null;
  shift_time: string | null;
  reason: string | null;
  raw_message: string;
  is_staffing_related: boolean;
}

// ─── Pattern Banks ────────────────────────────────────────────────────────────

const STAFF_ABSENCE_PATTERNS: RegExp[] = [
  /\b(sick|unwell|not feeling (well|good|great|okay|ok))\b/i,
  /\b(can't|cannot|won't|will not)\s+(make it|come|attend|be there|come in|work|go)\b/i,
  /\b(calling in|call.*off|call.*sick|called in)\b/i,
  /\b(not coming|won't be coming|unable to (come|attend|make|work))\b/i,
  /\b(family emergency|personal emergency)\b/i,
  /\b(doctor|hospital|clinic|er\b|emergency room)\b/i,
  /\b(i'?m sick|i am sick|feeling sick|feeling ill|not well)\b/i,
  /\bi can'?t\s+(work|make|come|attend|go|be there)\b/i,
  /\b(won't be (able|in|at|there|coming))\b/i,
  /\b(have to\s+(miss|skip|cancel))\b/i,
  /\b(throwing up|vomiting|fever|flu|cold|migraine)\b/i,
  /\b(not going to (make it|be there|come))\b/i,
  /\bmy shift\b.*\b(can't|cannot|won't|won't be)\b/i,
  /\b(sorry|apologies).*\b(can't|cannot|won't|not (coming|making))\b/i,
];

const LATE_ARRIVAL_PATTERNS: RegExp[] = [
  /\brunning (a bit |little |very |super )?late\b/i,
  /\b(will be|going to be|gonna be|i'?m)\s+late\b/i,
  /\b(be there|arrive|coming|get there)\s+(in|at|around|by)\s+\d+/i,
  /\bdelayed\b/i,
  /\b(few|a couple|[\d]+)\s+minutes?\s+(late|behind|delayed)\b/i,
  /\b(traffic|subway|bus|transit|ttc|train|streetcar)\b.{0,40}\b(late|delay|slow|stuck|held)\b/i,
  /\b(stuck|held up|held back|running behind)\b/i,
  /\b([\d]+)\s*min(utes?)?\s+(behind|late)\b/i,
];

const EMERGENCY_PATTERNS: RegExp[] = [
  /\b(no.?show|noshow)\b/i,
  /\b(accident|injury|hurt|injured|in the hospital)\b/i,
  /\bnot going to make it (at all|today|tonight)\b/i,
  /\b(major emergency|urgent|asap)\b.*\b(shift|work|today|tonight)\b/i,
];

const CLIENT_REQUEST_PATTERNS: RegExp[] = [
  /\bcan i have\b/i,
  /\bcan you (have|send|get|spare|provide)\b/i,
  /\bi('d like| would like| need| want| require)\s+(\d+\s+)?(hk\b|housekeep\w*|server\b|bartender\b|cleaner\b|staff\b|worker\b|help\b|coverage\b|someone\b)/i,
  /\bneed\s+(\d+\s+)?(hk\b|housekeep\w*|server\b|bartender\b|cleaner\b|staff\b|worker\b|help\b|coverage\b|more\s+(staff|people|workers))/i,
  /\b(short staffed|need coverage|need someone)\b/i,
  /\bdo you have (someone|anyone|a worker|an extra|available)\b/i,
  /\bcan (someone|anyone) cover\b/i,
  /\b(extra (staff|worker|help|person|people))\b/i,
  /\b(send me|send over|send a|send an)\s+[a-z]/i,
  /\bavailable (for tomorrow|for tonight|tomorrow morning|tonight|for the shift)\b/i,
  /\bcoverage for\b/i,
  /\bcan i request\b/i,
  /\b(need|want|like)\s+(a|an|one|two|three|\d+)\s+(housekeeper|cleaner|server|bartender|worker|staff member|person)\b/i,
  /\bstaff for (tomorrow|tonight|today|monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/i,
  /\bworker for (tomorrow|tonight|today|monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/i,
  /\b(requesting|request)\s+(staff|coverage|worker|a worker|a person)\b/i,
];

// ─── Entity Extractors ────────────────────────────────────────────────────────

const ROLE_MAP: Record<string, string> = {
  hk: "housekeeping",
  housekeeper: "housekeeping",
  housekeep: "housekeeping",
  housekeeping: "housekeeping",
  cleaner: "housekeeping",
  cleaning: "housekeeping",
  server: "server",
  serving: "server",
  waitress: "server",
  waiter: "server",
  bartender: "bartender",
  "bar staff": "bartender",
  fb: "food & beverage",
  "f&b": "food & beverage",
  "food & beverage": "food & beverage",
  "food and beverage": "food & beverage",
  banquet: "banquet",
  security: "security",
  guard: "security",
  maintenance: "maintenance",
  porter: "porter",
  bellman: "porter",
  concierge: "concierge",
};

const WORD_TO_NUM: Record<string, number> = {
  one: 1, two: 2, three: 3, four: 4, five: 5,
  six: 6, seven: 7, eight: 8, nine: 9, ten: 10,
  a: 1, an: 1,
};

function extractQuantity(text: string): number | null {
  const m1 = text.match(/\b(\d+)\s+(hk|housekeep|server|bartender|cleaner|staff|worker|person|people|more)\b/i);
  if (m1) return parseInt(m1[1]);
  const m2 = text.match(/\b(one|two|three|four|five|six|seven|eight|nine|ten)\s+(hk|housekeep|server|bartender|cleaner|staff|worker|person|people)\b/i);
  if (m2) return WORD_TO_NUM[m2[1].toLowerCase()] || null;
  const m3 = text.match(/\b(a|an)\s+(hk|housekeep|server|bartender|cleaner|staff|worker)\b/i);
  if (m3) return 1;
  return null;
}

function extractRole(text: string): string | null {
  const lower = text.toLowerCase();
  for (const [keyword, role] of Object.entries(ROLE_MAP)) {
    if (lower.includes(keyword)) return role;
  }
  return null;
}

function extractDate(text: string): string | null {
  const torontoNow = new Date(new Date().toLocaleString("en-US", { timeZone: "America/Toronto" }));

  if (/\b(today|tonight|right now|this morning|this afternoon|this evening)\b/i.test(text)) {
    return torontoNow.toISOString().split("T")[0];
  }
  if (/\btomorrow\b/i.test(text)) {
    const d = new Date(torontoNow);
    d.setDate(d.getDate() + 1);
    return d.toISOString().split("T")[0];
  }
  const days = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
  const lower = text.toLowerCase();
  for (let i = 0; i < days.length; i++) {
    if (lower.includes(days[i])) {
      const d = new Date(torontoNow);
      const diff = ((i - d.getDay()) + 7) % 7 || 7;
      d.setDate(d.getDate() + diff);
      return d.toISOString().split("T")[0];
    }
  }
  // Explicit date patterns like "March 15", "3/15"
  const explicit = text.match(/\b(\d{1,2})[\/\-](\d{1,2})\b/);
  if (explicit) {
    const year = torontoNow.getFullYear();
    return `${year}-${String(parseInt(explicit[1])).padStart(2,"0")}-${String(parseInt(explicit[2])).padStart(2,"0")}`;
  }
  return null;
}

function extractTime(text: string): string | null {
  // Range: "8-4:30", "8am-4:30pm", "8 to 4:30"
  const range = text.match(/(\d{1,2}(?::\d{2})?\s*(?:am|pm)?)\s*(?:-|to|–|until)\s*(\d{1,2}(?::\d{2})?\s*(?:am|pm)?)/i);
  if (range) return `${range[1].trim()}-${range[2].trim()}`;
  // Single time
  const single = text.match(/\b(\d{1,2}:\d{2}\s*(?:am|pm)?|\d{1,2}\s*(?:am|pm))\b/i);
  if (single) return single[1].trim();
  return null;
}

function extractWorkerName(text: string): string | null {
  const SKIP_WORDS = new Set([
    "a","an","the","my","our","your","some","staff","worker","help","coverage",
    "someone","anyone","person","people","more","extra","available","please",
    "tomorrow","today","tonight","morning","afternoon","evening",
  ]);

  const patterns = [
    /\bcan i have\s+([a-z]{3,}(?:\s+[a-z]{2,})?)\b/i,
    /\brequest\s+([a-z]{3,}(?:\s+[a-z]{2,})?)\s+(for|tomorrow|tonight|today)/i,
    /\bi need\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)\b/,
    /\bi('d like| would like)\s+([a-z]{3,}(?:\s+[a-z]{2,})?)\s+(for|tomorrow|tonight|today)/i,
    /\bfor\s+([A-Z][a-z]{2,}(?:\s+[A-Z][a-z]{2,})?)\b/,
  ];

  for (const p of patterns) {
    const m = text.match(p);
    if (m) {
      const candidates = [m[2], m[1]].filter(Boolean);
      for (const c of candidates) {
        const name = c.trim();
        if (name && !SKIP_WORDS.has(name.toLowerCase()) && name.length > 2) {
          return name;
        }
      }
    }
  }
  return null;
}

function extractWorkplace(text: string): string | null {
  const known = [
    "hyatt place", "hyatt", "hilton", "marriott", "sheraton", "westin",
    "holiday inn", "best western", "four points", "hampton inn", "courtyard",
    "doubletree", "residence inn", "delta hotels", "fairmont", "crowne plaza",
    "radisson", "novotel", "ibis", "quality inn", "comfort inn",
  ];
  const lower = text.toLowerCase();
  for (const place of known) {
    if (lower.includes(place)) {
      return place
        .split(" ")
        .map(w => w.charAt(0).toUpperCase() + w.slice(1))
        .join(" ");
    }
  }
  return null;
}

function extractReason(text: string): string | null {
  const direct = text.match(
    /\b(sick|unwell|flu|fever|cold|stomach|vomiting|injury|accident|family emergency|personal emergency|doctor|hospital|migraine|covid|quarantine)\b/i
  );
  if (direct) return direct[1].toLowerCase();
  const because = text.match(/(?:because|due to|since|as)\s+(.{5,60?})(?:\.|,|$)/i);
  if (because) return because[1].trim();
  return null;
}

// ─── Main Classifier ──────────────────────────────────────────────────────────

export function classifySms(messageBody: string): SmsClassification {
  const absenceHits = STAFF_ABSENCE_PATTERNS.filter(p => p.test(messageBody)).length;
  const lateHits = LATE_ARRIVAL_PATTERNS.filter(p => p.test(messageBody)).length;
  const emergencyHits = EMERGENCY_PATTERNS.filter(p => p.test(messageBody)).length;
  const clientHits = CLIENT_REQUEST_PATTERNS.filter(p => p.test(messageBody)).length;

  let intent: SmsIntent = "general_inquiry";
  let confidence: SmsConfidence = "low";
  let urgency: SmsUrgency = "low";

  if (emergencyHits >= 1 && absenceHits >= 1) {
    intent = "emergency";
    confidence = "high";
    urgency = "critical";
  } else if (absenceHits >= 2) {
    intent = "staff_absence";
    confidence = "high";
    urgency = "critical";
  } else if (absenceHits === 1) {
    intent = "staff_absence";
    confidence = "moderate";
    urgency = "high";
  } else if (lateHits >= 1) {
    intent = "late_arrival";
    confidence = lateHits >= 2 ? "high" : "moderate";
    urgency = "high";
  } else if (clientHits >= 2) {
    intent = "client_request";
    confidence = "high";
    urgency = "high";
  } else if (clientHits === 1) {
    intent = "client_request";
    confidence = "moderate";
    urgency = "medium";
  } else {
    const generalStaffing = /\b(shift|work|staff|worker|schedule|cover|replace|available|roster|deployment)\b/i;
    if (generalStaffing.test(messageBody)) {
      intent = "unknown_staffing";
      confidence = "low";
      urgency = "medium";
    }
  }

  const isStaffingRelated = intent !== "general_inquiry";

  return {
    intent,
    confidence,
    urgency,
    worker_name_mentioned: extractWorkerName(messageBody),
    workplace_mentioned: extractWorkplace(messageBody),
    role_requested: extractRole(messageBody),
    quantity_requested: extractQuantity(messageBody),
    shift_date: extractDate(messageBody),
    shift_time: extractTime(messageBody),
    reason: extractReason(messageBody),
    raw_message: messageBody,
    is_staffing_related: isStaffingRelated,
  };
}
