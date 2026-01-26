import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  User,
  WorkerRequest,
  Shift,
  TitoLog,
  Conversation,
  Message,
  Notification,
  RequestStatus,
  ShiftStatus,
  WorkerApplication,
  SubcontractorAgreementTemplate,
  SubcontractorAgreementAcceptance,
  AgreementSubmission,
  WorkerOnboardingStatus,
} from "@/types";

const KEYS = {
  REQUESTS: "@wc_requests",
  SHIFTS: "@wc_shifts",
  TITO: "@wc_tito",
  CONVERSATIONS: "@wc_conversations",
  MESSAGES: "@wc_messages",
  NOTIFICATIONS: "@wc_notifications",
  WORKER_APPLICATIONS: "@wc_worker_applications",
  AGREEMENT_TEMPLATES: "@wc_agreement_templates",
  AGREEMENT_ACCEPTANCES: "@wc_agreement_acceptances",
  AGREEMENT_SUBMISSIONS: "@wc_agreement_submissions",
};

// Helper to generate IDs
const generateId = () => `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

// Get current date plus offset in days
const getDate = (daysOffset: number = 0, hoursOffset: number = 0) => {
  const date = new Date();
  date.setDate(date.getDate() + daysOffset);
  date.setHours(date.getHours() + hoursOffset);
  return date.toISOString();
};

// Sample data generation
const generateSampleData = () => {
  const requests: WorkerRequest[] = [
    {
      id: "req-1",
      clientId: "client-1",
      clientName: "Sarah Mitchell",
      roleNeeded: "General Labor",
      shiftStartTime: getDate(1, 8),
      shiftEndTime: getDate(1, 16),
      locationMajorIntersection: "King & Bay, Toronto",
      payStructure: "$25/hour",
      notes: "Corporate office security, professional attire required",
      status: "submitted",
      slaDeadline: getDate(0, 4),
      createdAt: getDate(-1),
      updatedAt: getDate(-1),
    },
    {
      id: "req-2",
      clientId: "client-1",
      clientName: "Sarah Mitchell",
      roleNeeded: "Server",
      shiftStartTime: getDate(3, 18),
      shiftEndTime: getDate(3, 23),
      locationMajorIntersection: "Front & Spadina, Toronto",
      payStructure: "$22/hour",
      notes: "Gala event, black attire",
      status: "assigned",
      hrAssignedId: "hr-1",
      hrAssignedName: "Emily Chen",
      slaDeadline: getDate(2),
      createdAt: getDate(-2),
      updatedAt: getDate(-1),
    },
    {
      id: "req-3",
      clientId: "client-2",
      clientName: "Tech Solutions Inc",
      roleNeeded: "Houseperson",
      shiftStartTime: getDate(0, 6),
      shiftEndTime: getDate(0, 14),
      locationMajorIntersection: "Airport & Derry, Mississauga",
      payStructure: "$20/hour",
      notes: "Heavy lifting required",
      status: "in_progress",
      hrAssignedId: "hr-1",
      hrAssignedName: "Emily Chen",
      slaDeadline: getDate(-1),
      createdAt: getDate(-3),
      updatedAt: getDate(0),
    },
    {
      id: "req-4",
      clientId: "client-1",
      clientName: "Sarah Mitchell",
      roleNeeded: "Housekeeper",
      shiftStartTime: getDate(-2, 9),
      shiftEndTime: getDate(-2, 17),
      locationMajorIntersection: "Yonge & Bloor, Toronto",
      payStructure: "$23/hour",
      notes: "Front desk coverage",
      status: "completed",
      hrAssignedId: "hr-1",
      hrAssignedName: "Emily Chen",
      slaDeadline: getDate(-3),
      createdAt: getDate(-5),
      updatedAt: getDate(-2),
    },
  ];

  const shifts: Shift[] = [
    {
      id: "shift-1",
      workerRequestId: "req-2",
      hrManagerId: "hr-1",
      hrManagerName: "Emily Chen",
      startTime: getDate(3, 18),
      endTime: getDate(3, 23),
      locationMajorIntersection: "Front & Spadina, Toronto",
      locationCoordinates: { latitude: 43.6426, longitude: -79.3871 },
      geofenceRadius: 100,
      status: "scheduled",
      payRate: 22,
      workerIds: ["worker-1"],
      workerNames: ["James Rodriguez"],
      clientName: "Sarah Mitchell",
      roleNeeded: "Server",
      createdAt: getDate(-1),
    },
    {
      id: "shift-2",
      workerRequestId: "req-3",
      hrManagerId: "hr-1",
      hrManagerName: "Emily Chen",
      startTime: getDate(0, 6),
      endTime: getDate(0, 14),
      locationMajorIntersection: "Airport & Derry, Mississauga",
      locationCoordinates: { latitude: 43.6777, longitude: -79.6248 },
      geofenceRadius: 100,
      status: "in_progress",
      payRate: 20,
      workerIds: ["worker-1", "worker-2"],
      workerNames: ["James Rodriguez", "Alex Johnson"],
      clientName: "Tech Solutions Inc",
      roleNeeded: "Houseperson",
      createdAt: getDate(-2),
    },
    {
      id: "shift-3",
      workerRequestId: "req-4",
      hrManagerId: "hr-1",
      hrManagerName: "Emily Chen",
      startTime: getDate(-2, 9),
      endTime: getDate(-2, 17),
      locationMajorIntersection: "Yonge & Bloor, Toronto",
      locationCoordinates: { latitude: 43.6709, longitude: -79.3857 },
      geofenceRadius: 100,
      status: "completed",
      payRate: 23,
      workerIds: ["worker-1"],
      workerNames: ["James Rodriguez"],
      clientName: "Sarah Mitchell",
      roleNeeded: "Housekeeper",
      createdAt: getDate(-4),
    },
  ];

  const titoLogs: TitoLog[] = [
    {
      id: "tito-1",
      shiftId: "shift-2",
      workerId: "worker-1",
      workerName: "James Rodriguez",
      timeIn: getDate(0, 6),
      timeInLocation: "Airport & Derry",
      verificationMethod: "gps",
      status: "pending",
      shiftDate: getDate(0),
      createdAt: getDate(0, 6),
    },
    {
      id: "tito-2",
      shiftId: "shift-3",
      workerId: "worker-1",
      workerName: "James Rodriguez",
      timeIn: getDate(-2, 9),
      timeOut: getDate(-2, 17),
      timeInLocation: "Yonge & Bloor",
      timeOutLocation: "Yonge & Bloor",
      verificationMethod: "gps",
      approvedBy: "client-1",
      approvedAt: getDate(-2, 18),
      status: "approved",
      shiftDate: getDate(-2),
      createdAt: getDate(-2, 9),
    },
  ];

  const conversations: Conversation[] = [
    {
      id: "conv-1",
      type: "client_hr",
      participants: [
        { id: "hr-1", name: "Emily Chen", role: "hr" },
        { id: "client-1", name: "Sarah Mitchell", role: "client" },
      ],
      lastMessage: "The event staff has been confirmed for Saturday",
      lastMessageAt: getDate(0, -2),
      unreadCount: 1,
      createdAt: getDate(-5),
    },
    {
      id: "conv-2",
      type: "hr_worker",
      participants: [
        { id: "hr-1", name: "Emily Chen", role: "hr" },
        { id: "worker-1", name: "James Rodriguez", role: "worker" },
      ],
      lastMessage: "Reminder: Your shift starts at 6 AM tomorrow",
      lastMessageAt: getDate(-1, 10),
      unreadCount: 0,
      createdAt: getDate(-10),
    },
  ];

  const messages: Message[] = [
    {
      id: "msg-1",
      conversationId: "conv-1",
      senderId: "hr-1",
      senderName: "Emily Chen",
      senderRole: "hr",
      content: "Hi Sarah, I wanted to confirm the details for your event staffing request.",
      createdAt: getDate(-1, -5),
    },
    {
      id: "msg-2",
      conversationId: "conv-1",
      senderId: "client-1",
      senderName: "Sarah Mitchell",
      senderRole: "client",
      content: "Yes, we need 2 staff members for the gala on Saturday evening.",
      readAt: getDate(-1, -4),
      createdAt: getDate(-1, -4),
    },
    {
      id: "msg-3",
      conversationId: "conv-1",
      senderId: "hr-1",
      senderName: "Emily Chen",
      senderRole: "hr",
      content: "The event staff has been confirmed for Saturday",
      createdAt: getDate(0, -2),
    },
    {
      id: "msg-4",
      conversationId: "conv-2",
      senderId: "hr-1",
      senderName: "Emily Chen",
      senderRole: "hr",
      content: "Reminder: Your shift starts at 6 AM tomorrow",
      readAt: getDate(-1, 12),
      createdAt: getDate(-1, 10),
    },
  ];

  const notifications: Notification[] = [
    {
      id: "notif-1",
      userId: "worker-1",
      title: "Shift Reminder",
      message: "Your warehouse shift starts in 2 hours",
      type: "shift",
      isRead: false,
      actionUrl: "/shifts/shift-2",
      createdAt: getDate(0, 4),
    },
    {
      id: "notif-2",
      userId: "hr-1",
      title: "New Request",
      message: "Sarah Mitchell submitted a new worker request",
      type: "request",
      isRead: false,
      actionUrl: "/requests/req-1",
      createdAt: getDate(-1),
    },
    {
      id: "notif-3",
      userId: "client-1",
      title: "TITO Pending",
      message: "James Rodriguez submitted time for approval",
      type: "tito",
      isRead: false,
      actionUrl: "/tito/tito-1",
      createdAt: getDate(0, 6),
    },
  ];

  return { requests, shifts, titoLogs, conversations, messages, notifications };
};

// Initialize storage with sample data
export async function initializeStorage() {
  try {
    const existingRequests = await AsyncStorage.getItem(KEYS.REQUESTS);
    if (!existingRequests) {
      const data = generateSampleData();
      await Promise.all([
        AsyncStorage.setItem(KEYS.REQUESTS, JSON.stringify(data.requests)),
        AsyncStorage.setItem(KEYS.SHIFTS, JSON.stringify(data.shifts)),
        AsyncStorage.setItem(KEYS.TITO, JSON.stringify(data.titoLogs)),
        AsyncStorage.setItem(KEYS.CONVERSATIONS, JSON.stringify(data.conversations)),
        AsyncStorage.setItem(KEYS.MESSAGES, JSON.stringify(data.messages)),
        AsyncStorage.setItem(KEYS.NOTIFICATIONS, JSON.stringify(data.notifications)),
      ]);
    }
  } catch (error) {
    console.error("Failed to initialize storage:", error);
  }
}

// Requests
export async function getRequests(userId?: string, role?: string): Promise<WorkerRequest[]> {
  try {
    const data = await AsyncStorage.getItem(KEYS.REQUESTS);
    let requests: WorkerRequest[] = data ? JSON.parse(data) : [];
    
    if (role === "client" && userId) {
      requests = requests.filter(r => r.clientId === userId);
    }
    
    return requests.sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  } catch {
    return [];
  }
}

export async function getRequest(id: string): Promise<WorkerRequest | null> {
  const requests = await getRequests();
  return requests.find(r => r.id === id) || null;
}

export async function createRequest(request: Omit<WorkerRequest, "id" | "createdAt" | "updatedAt">): Promise<WorkerRequest> {
  const requests = await getRequests();
  const newRequest: WorkerRequest = {
    ...request,
    id: generateId(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  requests.unshift(newRequest);
  await AsyncStorage.setItem(KEYS.REQUESTS, JSON.stringify(requests));
  return newRequest;
}

export async function updateRequest(id: string, updates: Partial<WorkerRequest>): Promise<WorkerRequest | null> {
  const requests = await getRequests();
  const index = requests.findIndex(r => r.id === id);
  if (index === -1) return null;
  
  requests[index] = {
    ...requests[index],
    ...updates,
    updatedAt: new Date().toISOString(),
  };
  await AsyncStorage.setItem(KEYS.REQUESTS, JSON.stringify(requests));
  return requests[index];
}

// Shifts
export async function getShifts(userId?: string, role?: string, workerRoles?: string[]): Promise<Shift[]> {
  try {
    const data = await AsyncStorage.getItem(KEYS.SHIFTS);
    let shifts: Shift[] = data ? JSON.parse(data) : [];
    
    if (role === "worker" && userId) {
      shifts = shifts.filter(s => s.workerIds.includes(userId));
    }
    
    return shifts.sort((a, b) => 
      new Date(b.startTime).getTime() - new Date(a.startTime).getTime()
    );
  } catch {
    return [];
  }
}

// Get available shifts for workers based on their roles
export async function getAvailableShiftsForWorker(workerRoles: string[]): Promise<Shift[]> {
  try {
    const data = await AsyncStorage.getItem(KEYS.SHIFTS);
    let shifts: Shift[] = data ? JSON.parse(data) : [];
    
    // Filter to only show scheduled shifts that match the worker's roles
    shifts = shifts.filter(s => 
      s.status === "scheduled" && 
      workerRoles.includes(s.roleNeeded)
    );
    
    return shifts.sort((a, b) => 
      new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
    );
  } catch {
    return [];
  }
}

export async function getShift(id: string): Promise<Shift | null> {
  const shifts = await getShifts();
  return shifts.find(s => s.id === id) || null;
}

export async function createShift(shift: Omit<Shift, "id" | "createdAt">): Promise<Shift> {
  const shifts = await getShifts();
  const newShift: Shift = {
    ...shift,
    id: generateId(),
    createdAt: new Date().toISOString(),
  };
  shifts.unshift(newShift);
  await AsyncStorage.setItem(KEYS.SHIFTS, JSON.stringify(shifts));
  return newShift;
}

export async function updateShift(id: string, updates: Partial<Shift>): Promise<Shift | null> {
  const shifts = await getShifts();
  const index = shifts.findIndex(s => s.id === id);
  if (index === -1) return null;
  
  shifts[index] = { ...shifts[index], ...updates };
  await AsyncStorage.setItem(KEYS.SHIFTS, JSON.stringify(shifts));
  return shifts[index];
}

// TITO
export async function getTitoLogs(userId?: string, role?: string): Promise<TitoLog[]> {
  try {
    const data = await AsyncStorage.getItem(KEYS.TITO);
    let logs: TitoLog[] = data ? JSON.parse(data) : [];
    
    if (role === "worker" && userId) {
      logs = logs.filter(t => t.workerId === userId);
    }
    
    return logs.sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  } catch {
    return [];
  }
}

export async function createTitoLog(log: Omit<TitoLog, "id" | "createdAt">): Promise<TitoLog> {
  const logs = await getTitoLogs();
  const newLog: TitoLog = {
    ...log,
    id: generateId(),
    createdAt: new Date().toISOString(),
  };
  logs.unshift(newLog);
  await AsyncStorage.setItem(KEYS.TITO, JSON.stringify(logs));
  return newLog;
}

export async function updateTitoLog(id: string, updates: Partial<TitoLog>): Promise<TitoLog | null> {
  const logs = await getTitoLogs();
  const index = logs.findIndex(t => t.id === id);
  if (index === -1) return null;
  
  logs[index] = { ...logs[index], ...updates };
  await AsyncStorage.setItem(KEYS.TITO, JSON.stringify(logs));
  return logs[index];
}

// Conversations
export async function getConversations(userId: string): Promise<Conversation[]> {
  try {
    const data = await AsyncStorage.getItem(KEYS.CONVERSATIONS);
    const conversations: Conversation[] = data ? JSON.parse(data) : [];
    return conversations
      .filter(c => c.participants.some(p => p.id === userId))
      .sort((a, b) => 
        new Date(b.lastMessageAt || b.createdAt).getTime() - 
        new Date(a.lastMessageAt || a.createdAt).getTime()
      );
  } catch {
    return [];
  }
}

export async function getConversation(id: string): Promise<Conversation | null> {
  try {
    const data = await AsyncStorage.getItem(KEYS.CONVERSATIONS);
    const conversations: Conversation[] = data ? JSON.parse(data) : [];
    return conversations.find(c => c.id === id) || null;
  } catch {
    return null;
  }
}

// Messages
export async function getMessages(conversationId: string): Promise<Message[]> {
  try {
    const data = await AsyncStorage.getItem(KEYS.MESSAGES);
    const messages: Message[] = data ? JSON.parse(data) : [];
    return messages
      .filter(m => m.conversationId === conversationId)
      .sort((a, b) => 
        new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      );
  } catch {
    return [];
  }
}

export async function sendMessage(message: Omit<Message, "id" | "createdAt">): Promise<Message> {
  const messages = await AsyncStorage.getItem(KEYS.MESSAGES);
  const allMessages: Message[] = messages ? JSON.parse(messages) : [];
  
  const newMessage: Message = {
    ...message,
    id: generateId(),
    createdAt: new Date().toISOString(),
  };
  allMessages.push(newMessage);
  await AsyncStorage.setItem(KEYS.MESSAGES, JSON.stringify(allMessages));
  
  // Update conversation last message
  const convData = await AsyncStorage.getItem(KEYS.CONVERSATIONS);
  const conversations: Conversation[] = convData ? JSON.parse(convData) : [];
  const convIndex = conversations.findIndex(c => c.id === message.conversationId);
  if (convIndex !== -1) {
    conversations[convIndex].lastMessage = message.content;
    conversations[convIndex].lastMessageAt = newMessage.createdAt;
    await AsyncStorage.setItem(KEYS.CONVERSATIONS, JSON.stringify(conversations));
  }
  
  return newMessage;
}

// Notifications
export async function getNotifications(userId: string): Promise<Notification[]> {
  try {
    const data = await AsyncStorage.getItem(KEYS.NOTIFICATIONS);
    const notifications: Notification[] = data ? JSON.parse(data) : [];
    return notifications
      .filter(n => n.userId === userId)
      .sort((a, b) => 
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
  } catch {
    return [];
  }
}

export async function markNotificationRead(id: string): Promise<void> {
  try {
    const data = await AsyncStorage.getItem(KEYS.NOTIFICATIONS);
    const notifications: Notification[] = data ? JSON.parse(data) : [];
    const index = notifications.findIndex(n => n.id === id);
    if (index !== -1) {
      notifications[index].isRead = true;
      await AsyncStorage.setItem(KEYS.NOTIFICATIONS, JSON.stringify(notifications));
    }
  } catch {}
}

export async function getUnreadNotificationCount(userId: string): Promise<number> {
  const notifications = await getNotifications(userId);
  return notifications.filter(n => !n.isRead).length;
}

// Clear all data
export async function clearStorage(): Promise<void> {
  await AsyncStorage.multiRemove(Object.values(KEYS));
}

// ============ ONBOARDING STORAGE ============

// Default agreement template
const defaultAgreementTemplate: SubcontractorAgreementTemplate = {
  id: "template-v2",
  version: "v2.0",
  title: "Subcontractor Agreement",
  bodyText: `SUBCONTRACTOR AGREEMENT

1. SUBCONTRACTOR STATUS (NOT EMPLOYMENT)

1.1 The Subcontractor acknowledges and agrees that all individuals providing services through Workforce Connect do so strictly as INDEPENDENT SUBCONTRACTORS.

1.2 This Agreement does NOT create an employer-employee relationship. The Subcontractor understands and agrees that:
- You are NOT an employee
- You are NOT on payroll
- You do NOT receive employee benefits
- There are NO deductions from your pay (NO CPP, NO EI, NO income tax)

1.3 The Subcontractor is fully and solely responsible for:
- Reporting all income to the Canada Revenue Agency (CRA)
- Paying all applicable taxes, CPP, EI (if applicable), HST/GST/QST
- Maintaining any required tax registrations or filings

2. SCOPE OF SERVICES

2.1 The Subcontractor provides housekeeping, janitorial, hospitality, or related services on a shift-based or project-based basis for Workforce Connect and/or its hotel and janitorial clients ("Clients").

2.2 The Subcontractor agrees to:
- Perform services professionally and safely
- Follow all Client site rules, hotel policies, and safety procedures
- Comply with all applicable laws and regulations

2.3 The Subcontractor controls the manner and means of performing the services, subject only to Client site standards and agreed outcomes.

3. PAY STRUCTURE & PAYMENT RELEASE

3.1 Bi-Weekly Reporting Period (Hotel Workers Only)
Work performed for hotel-based assignments follows a bi-weekly reporting cutoff period.

3.2 Client-Dependent Payment Release
Payment to the Subcontractor is released ONLY AFTER Workforce Connect receives payment from the hotel or janitorial Client.

3.3 Once Client funds are received and cleared:
- The Subcontractor's corresponding payment will be processed and released immediately

3.4 Payment timing may vary due to:
- Client accounting and approval schedules
- Banking settlement timelines
- Holidays
- System maintenance or operational delays

3.5 For transparency, proof of Client payment may be provided upon request via email.

4. NO GUARANTEED PAYMENT DATE

4.1 The Subcontractor understands and agrees that:
- There is NO guaranteed pay date
- Payment release depends entirely on Client remittance
- Workforce Connect is not responsible for delays caused by Clients or banking institutions

5. PAYMENT METHODS

5.1 Workforce Connect supports ONLY the following payment methods:

A. Direct Deposit (EFT)
- Requires valid banking details or a void cheque

B. Interac E-Transfer
- Subject to bank-imposed sending limits

C. Company Cheque
- Available to GTA-based subcontractors only

6. PAYMENT INFORMATION REQUIREMENT

6.1 The Subcontractor understands that payment cannot be processed until valid payment details are submitted and approved.

6.2 The Subcontractor must complete the official Payment Information Form provided by Workforce Connect.

6.3 Incorrect, incomplete, or missing payment information will result in payment delays, for which Workforce Connect is not liable.

7. TIMEKEEPING & VERIFICATION (TITO)

7.1 The Subcontractor must accurately submit Time-In / Time-Out (TITO) records through the Workforce Connect platform.

7.2 Server-recorded UTC timestamps are authoritative. Corrections require valid justification.

7.3 Coarse location data or simple verification methods (checkbox or typed name) may be required for audit and client verification purposes.

8. CONFIDENTIALITY & CONDUCT

8.1 The Subcontractor agrees to maintain confidentiality of all non-public Company or Client information.

8.2 Misconduct, falsification of records, safety violations, or breach of policies may result in immediate termination of access to the platform.

9. TERMINATION

9.1 Either Party may terminate this Agreement with written notice.

9.2 Workforce Connect may immediately terminate access for:
- Fraud or misrepresentation
- Safety or policy violations
- Breach of this Agreement

9.3 Upon termination, the Subcontractor is entitled only to payment for approved and completed work up to the termination date, subject to Client payment.

10. GOVERNING LAW

10.1 This Agreement is governed by the laws of the Province of Ontario and the federal laws of Canada applicable therein.

11. ELECTRONIC ACCEPTANCE

11.1 The Subcontractor agrees that:
- Clicking "I Agree"
- Typing their full legal name
- Submitting this Agreement electronically
constitutes a legally binding electronic signature.

REQUIRED INITIALS

Please provide your initials to confirm your understanding and acceptance of the following key sections:

A. Subcontractor Status (Section 1) - I understand that I am an independent subcontractor, NOT an employee, and I am responsible for my own taxes.

B. Pay Structure (Section 3 & 4) - I understand that payment is released only after Workforce Connect receives payment from the Client, and there is no guaranteed pay date.

C. TITO Accuracy (Section 7) - I agree to accurately submit all Time-In / Time-Out records and understand that falsification may result in termination.

D. Confidentiality & Conduct (Section 8) - I agree to maintain confidentiality and understand that misconduct may result in immediate termination.

E. Termination (Section 9) - I understand the termination terms and that payment upon termination is subject to Client payment.

Version: v2.0
Last Updated: 2026-01-24
Effective Date: 2026-01-24`,
  lastUpdated: "2026-01-24T00:00:00.000Z",
  effectiveDate: "2026-01-24T00:00:00.000Z",
  isActive: true,
  createdAt: "2026-01-24T00:00:00.000Z",
  updatedAt: "2026-01-24T00:00:00.000Z",
};

// Sample worker application for testing
const sampleWorkerApplication: WorkerApplication = {
  id: "app-pending-1",
  workerId: "worker-pending",
  submittedAtUtc: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
  source: "website",
  legalFirstName: "Alex",
  legalLastName: "Johnson",
  preferredName: "Alex",
  mobilePhone: "416-555-0123",
  emailAddress: "worker_pending@example.com",
  currentAddress: {
    street: "123 Main Street",
    city: "Toronto",
    provinceState: "Ontario",
    postalZip: "M5V 1A1",
    country: "Canada",
  },
  primaryLanguage: "English",
  timeZone: "America/Toronto",
  legallyEligibleToWork: true,
  hasGovernmentPhotoId: true,
  hasDriversLicense: true,
  driversLicenseProvinceClass: "G",
  backgroundCheckConsent: "consent",
  rolesInterestedIn: ["Housekeeper", "GeneralLabor"],
  preferredWorkType: "part_time",
  weeklyAvailabilityDays: ["Mon", "Tue", "Wed", "Thu", "Fri"],
  dailyTimeWindows: "8:00 AM - 6:00 PM",
  earliestStartDate: new Date().toISOString().split("T")[0],
  reliableTransportation: "yes",
  yearsExperiencePrimaryRole: 3,
  relatedExperienceSummary: "3 years experience in hospitality and general labor",
  relevantSkills: ["deep_cleaning", "heavy_lifting", "customer_service"],
  shiftTypes: ["day", "evening"],
  emergencyContactName: "Jane Johnson",
  emergencyContactRelationship: "Spouse",
  emergencyContactPhone: "416-555-0124",
  preferredContactChannels: ["email", "sms"],
  consentOperationalMessages: true,
  acknowledgeTitoAccuracyUtc: true,
  acknowledgeSiteRulesSafety: true,
  preAcknowledgeAgreementRequired: true,
  verificationMethodAtSigningPlaceholder: "typed_name",
  consentDataProcessing: true,
  optionalGpsAcknowledgement: true,
  privacyContactEmail: "privacy@company.com",
  declareTrueComplete: true,
  declareFalseInfoConsequences: true,
  electronicSignatureFullLegalName: "Alex Johnson",
  dateLocal: new Date().toISOString().split("T")[0],
  formVersion: "v1.0",
  status: "approved",
  createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
  updatedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
};

const sampleSubmittedApplication: WorkerApplication = {
  ...sampleWorkerApplication,
  id: "app-submitted-1",
  workerId: "worker-submitted",
  legalFirstName: "Maria",
  legalLastName: "Garcia",
  emailAddress: "worker_submitted@example.com",
  electronicSignatureFullLegalName: "Maria Garcia",
  status: "submitted",
};

// Initialize onboarding data
export async function initializeOnboardingData() {
  try {
    const existingTemplates = await AsyncStorage.getItem(KEYS.AGREEMENT_TEMPLATES);
    if (!existingTemplates) {
      await AsyncStorage.setItem(KEYS.AGREEMENT_TEMPLATES, JSON.stringify([defaultAgreementTemplate]));
    }
    
    const existingApps = await AsyncStorage.getItem(KEYS.WORKER_APPLICATIONS);
    if (!existingApps) {
      await AsyncStorage.setItem(KEYS.WORKER_APPLICATIONS, JSON.stringify([sampleWorkerApplication, sampleSubmittedApplication]));
    }
  } catch (error) {
    console.error("Failed to initialize onboarding data:", error);
  }
}

// Worker Applications
export async function getWorkerApplications(): Promise<WorkerApplication[]> {
  try {
    const data = await AsyncStorage.getItem(KEYS.WORKER_APPLICATIONS);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

export async function getWorkerApplicationById(id: string): Promise<WorkerApplication | null> {
  const apps = await getWorkerApplications();
  return apps.find(a => a.id === id) || null;
}

export async function getWorkerApplicationByWorkerId(workerId: string): Promise<WorkerApplication | null> {
  const apps = await getWorkerApplications();
  return apps.find(a => a.workerId === workerId) || null;
}

export async function createWorkerApplication(application: Omit<WorkerApplication, "id" | "createdAt" | "updatedAt" | "submittedAtUtc">): Promise<WorkerApplication> {
  const apps = await getWorkerApplications();
  const existing = apps.find(a => a.workerId === application.workerId);
  
  if (existing) {
    return updateWorkerApplication(existing.id, application);
  }
  
  const now = new Date().toISOString();
  const newApp: WorkerApplication = {
    ...application,
    id: generateId(),
    submittedAtUtc: now,
    createdAt: now,
    updatedAt: now,
  };
  
  apps.push(newApp);
  await AsyncStorage.setItem(KEYS.WORKER_APPLICATIONS, JSON.stringify(apps));
  return newApp;
}

export async function updateWorkerApplication(id: string, updates: Partial<WorkerApplication>): Promise<WorkerApplication> {
  const apps = await getWorkerApplications();
  const index = apps.findIndex(a => a.id === id);
  
  if (index === -1) {
    throw new Error("Application not found");
  }
  
  apps[index] = {
    ...apps[index],
    ...updates,
    updatedAt: new Date().toISOString(),
  };
  
  await AsyncStorage.setItem(KEYS.WORKER_APPLICATIONS, JSON.stringify(apps));
  return apps[index];
}

// Agreement Templates
export async function getActiveAgreementTemplate(): Promise<SubcontractorAgreementTemplate | null> {
  try {
    const data = await AsyncStorage.getItem(KEYS.AGREEMENT_TEMPLATES);
    const templates: SubcontractorAgreementTemplate[] = data ? JSON.parse(data) : [];
    return templates.find(t => t.isActive) || null;
  } catch {
    return null;
  }
}

// Agreement Acceptances
export async function getAgreementAcceptances(): Promise<SubcontractorAgreementAcceptance[]> {
  try {
    const data = await AsyncStorage.getItem(KEYS.AGREEMENT_ACCEPTANCES);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

export async function getAgreementAcceptanceByWorkerId(workerId: string): Promise<SubcontractorAgreementAcceptance | null> {
  const acceptances = await getAgreementAcceptances();
  return acceptances.find(a => a.workerId === workerId) || null;
}

export async function createAgreementAcceptance(acceptance: Omit<SubcontractorAgreementAcceptance, "id" | "createdAt" | "updatedAt">): Promise<SubcontractorAgreementAcceptance> {
  const acceptances = await getAgreementAcceptances();
  const now = new Date().toISOString();
  
  const newAcceptance: SubcontractorAgreementAcceptance = {
    ...acceptance,
    id: generateId(),
    createdAt: now,
    updatedAt: now,
  };
  
  acceptances.push(newAcceptance);
  await AsyncStorage.setItem(KEYS.AGREEMENT_ACCEPTANCES, JSON.stringify(acceptances));
  return newAcceptance;
}

// Agreement Submissions
export async function getAgreementSubmissions(): Promise<AgreementSubmission[]> {
  try {
    const data = await AsyncStorage.getItem(KEYS.AGREEMENT_SUBMISSIONS);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

export async function getAgreementSubmissionByAcceptanceId(acceptanceId: string): Promise<AgreementSubmission | null> {
  const submissions = await getAgreementSubmissions();
  return submissions.find(s => s.acceptanceId === acceptanceId) || null;
}

export async function createAgreementSubmission(submission: Omit<AgreementSubmission, "id" | "createdAt" | "updatedAt">): Promise<AgreementSubmission> {
  const submissions = await getAgreementSubmissions();
  const now = new Date().toISOString();
  
  const newSubmission: AgreementSubmission = {
    ...submission,
    id: generateId(),
    createdAt: now,
    updatedAt: now,
  };
  
  submissions.push(newSubmission);
  await AsyncStorage.setItem(KEYS.AGREEMENT_SUBMISSIONS, JSON.stringify(submissions));
  return newSubmission;
}

export async function updateAgreementSubmission(id: string, updates: Partial<AgreementSubmission>): Promise<AgreementSubmission> {
  const submissions = await getAgreementSubmissions();
  const index = submissions.findIndex(s => s.id === id);
  
  if (index === -1) {
    throw new Error("Submission not found");
  }
  
  submissions[index] = {
    ...submissions[index],
    ...updates,
    updatedAt: new Date().toISOString(),
  };
  
  await AsyncStorage.setItem(KEYS.AGREEMENT_SUBMISSIONS, JSON.stringify(submissions));
  return submissions[index];
}

// Helper to check if worker has completed onboarding
export function isWorkerOnboardingComplete(status?: WorkerOnboardingStatus): boolean {
  return status === "AGREEMENT_ACCEPTED" || status === "ONBOARDED";
}
