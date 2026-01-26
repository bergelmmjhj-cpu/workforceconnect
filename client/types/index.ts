export type UserRole = "admin" | "hr" | "client" | "worker";

// Worker job roles
export const WORKER_ROLES = [
  "Housekeeper",
  "Houseperson",
  "Laundry Attendant",
  "Server",
  "Kitchen Helper",
  "Dishwasher",
  "Cook",
  "Lifeguard",
  "General Labor",
  "Other",
] as const;

export type WorkerRole = typeof WORKER_ROLES[number];

// Client business types
export const CLIENT_TYPES = [
  "Hotel",
  "Banquet Hall",
  "Janitorial",
  "Facilities",
  "Apartment Buildings",
] as const;

export type ClientType = typeof CLIENT_TYPES[number];

export type WorkerOnboardingStatus = 
  | "NOT_APPLIED"
  | "APPLICATION_SUBMITTED"
  | "APPLICATION_APPROVED"
  | "APPLICATION_REJECTED"
  | "AGREEMENT_PENDING"
  | "AGREEMENT_ACCEPTED"
  | "ONBOARDED";

export type WorkerApplicationStatus = "submitted" | "approved" | "rejected";

export type AgreementSubmissionStatus = "submitted" | "reviewed";

export interface User {
  id: string;
  email: string;
  fullName: string;
  role: UserRole;
  timezone: string;
  avatarUrl?: string;
  onboardingStatus?: WorkerOnboardingStatus;
  // Client-specific fields
  clientType?: ClientType;
  businessName?: string;
  businessAddress?: string;
  businessPhone?: string;
  // Worker-specific fields
  workerRoles?: WorkerRole[];
  createdAt: string;
}

export interface WorkerApplicationAddress {
  street: string;
  city: string;
  provinceState: string;
  postalZip: string;
  country: string;
}

export interface Certification {
  name: string;
  expiryDate?: string;
}

export interface Reference {
  name: string;
  relationship: string;
  contact: string;
}

export interface DocumentPlaceholder {
  docType: string;
  provided: boolean;
  notesOrLink?: string;
}

export interface PPESizes {
  gloves?: string;
  shirt?: string;
  shoeSize?: string;
}

export interface ComplianceChecklist {
  id?: boolean;
  workAuth?: boolean;
  certs?: boolean;
  references?: boolean;
}

export interface AgreementInitials {
  s19_1: string;
  s19_2: string;
  s19_3: string;
  s19_4: string;
  s19_5: string;
}

export interface WorkerApplication {
  id: string;
  workerId: string;
  submittedAtUtc: string;
  source?: string;
  recruiterReferrerCode?: string;
  
  legalFirstName: string;
  legalLastName: string;
  preferredName?: string;
  pronouns?: string;
  mobilePhone: string;
  emailAddress: string;
  currentAddress: WorkerApplicationAddress;
  primaryLanguage: string;
  otherLanguages?: string;
  timeZone: string;
  
  legallyEligibleToWork: boolean;
  workAuthorizationType?: string;
  workAuthorizationExpiry?: string;
  hasGovernmentPhotoId: boolean;
  hasDriversLicense: boolean;
  driversLicenseProvinceClass?: string;
  backgroundCheckConsent: "consent" | "do_not_consent";
  certifications?: Certification[];
  
  rolesInterestedIn: string[];
  rolesInterestedOtherText?: string;
  preferredWorkType: "full_time" | "part_time" | "casual_on_call";
  weeklyAvailabilityDays: string[];
  dailyTimeWindows?: string;
  earliestStartDate: string;
  distanceWillingToTravelKm?: number;
  reliableTransportation: "yes" | "no" | "sometimes";
  
  yearsExperiencePrimaryRole: number;
  relatedExperienceSummary: string;
  relevantSkills?: string[];
  equipmentOperationText?: string;
  technologyComfort?: string[];
  languagesCommunicationNotes?: string;
  
  shiftTypes: string[];
  minHoursPerShift?: number;
  maxHoursPerWeekPreference?: number;
  hourlyPayExpectation?: number;
  unionMembership?: string;
  
  emergencyContactName: string;
  emergencyContactRelationship: string;
  emergencyContactPhone: string;
  emergencyContactAlt?: string;
  
  allergiesMedicalAlerts?: string;
  ppeSizes?: PPESizes;
  accommodationRequests?: string;
  
  references?: { ref1?: Reference; ref2?: Reference };
  
  preferredContactChannels: string[];
  consentOperationalMessages: boolean;
  
  documents?: DocumentPlaceholder[];
  
  acknowledgeTitoAccuracyUtc: boolean;
  acknowledgeSiteRulesSafety: boolean;
  
  preAcknowledgeAgreementRequired: boolean;
  verificationMethodAtSigningPlaceholder: string;
  verificationMethodOtherText?: string;
  
  consentDataProcessing: boolean;
  optionalGpsAcknowledgement: boolean;
  privacyContactEmail: string;
  
  declareTrueComplete: boolean;
  declareFalseInfoConsequences: boolean;
  electronicSignatureFullLegalName: string;
  dateLocal: string;
  submitIp?: string;
  submitUserAgent?: string;
  
  initialReviewOutcome?: "proceed_interview" | "hold" | "decline";
  interviewerRecruiter?: string;
  officeUseDate?: string;
  officeNotes?: string;
  complianceChecklist?: ComplianceChecklist;
  nextSteps?: string[];
  
  formVersion: string;
  retentionNote?: string;
  
  status: WorkerApplicationStatus;
  reviewedById?: string;
  reviewedAt?: string;
  
  createdAt: string;
  updatedAt: string;
}

export interface SubcontractorAgreementTemplate {
  id: string;
  version: string;
  title: string;
  bodyText: string;
  lastUpdated: string;
  effectiveDate: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface SubcontractorAgreementAcceptance {
  id: string;
  workerId: string;
  templateId: string;
  templateVersion: string;
  templateBodySnapshot: string;
  acceptedAtUtc: string;
  acceptedFullName: string;
  initials: AgreementInitials;
  dateLocal: string;
  timeZone: string;
  acceptanceIp?: string;
  acceptanceUserAgent?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AgreementSubmission {
  id: string;
  acceptanceId: string;
  submittedToAdminAt: string;
  status: AgreementSubmissionStatus;
  adminReviewedById?: string;
  adminReviewedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export type RequestStatus = 
  | "draft" 
  | "submitted" 
  | "reviewing" 
  | "assigned" 
  | "in_progress" 
  | "completed" 
  | "cancelled";

export interface WorkerRequest {
  id: string;
  clientId: string;
  clientName: string;
  roleNeeded: string;
  shiftStartTime: string;
  shiftEndTime: string;
  locationMajorIntersection: string;
  payStructure: string;
  notes: string;
  status: RequestStatus;
  hrAssignedId?: string;
  hrAssignedName?: string;
  slaDeadline: string;
  createdAt: string;
  updatedAt: string;
}

export type ShiftStatus = "scheduled" | "in_progress" | "completed" | "cancelled";

export interface LocationCoordinates {
  latitude: number;
  longitude: number;
}

export interface Shift {
  id: string;
  workerRequestId: string;
  hrManagerId: string;
  hrManagerName: string;
  startTime: string;
  endTime: string;
  locationMajorIntersection: string;
  locationCoordinates?: LocationCoordinates;
  geofenceRadius: number;
  status: ShiftStatus;
  payRate: number;
  workerIds: string[];
  workerNames: string[];
  clientName: string;
  roleNeeded: string;
  createdAt: string;
}

export type TitoApprovalStatus = "pending" | "approved" | "disputed";

export interface TitoLog {
  id: string;
  shiftId: string;
  workerId: string;
  workerName: string;
  timeIn?: string;
  timeOut?: string;
  timeInLocation?: string;
  timeOutLocation?: string;
  timeInCoordinates?: LocationCoordinates;
  timeOutCoordinates?: LocationCoordinates;
  timeInDistance?: number;
  timeOutDistance?: number;
  verificationMethod: "gps" | "manual" | "selfie_placeholder" | "other";
  approvedBy?: string;
  approvedAt?: string;
  disputedBy?: string;
  disputedAt?: string;
  status: TitoApprovalStatus;
  shiftDate: string;
  createdAt: string;
}

export interface Conversation {
  id: string;
  type: "client_hr" | "hr_worker" | "admin_other";
  participants: ConversationParticipant[];
  lastMessage?: string;
  lastMessageAt?: string;
  unreadCount: number;
  createdAt: string;
}

export interface ConversationParticipant {
  id: string;
  name: string;
  role: UserRole;
  avatarUrl?: string;
}

export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  senderName: string;
  senderRole: UserRole;
  content: string;
  readAt?: string;
  createdAt: string;
}

export interface Notification {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: "request" | "shift" | "tito" | "message" | "approval" | "sla";
  isRead: boolean;
  actionUrl?: string;
  createdAt: string;
}

export interface DashboardStats {
  activeRequests: number;
  pendingApprovals: number;
  hoursThisWeek: number;
  upcomingShifts: number;
}

export interface TodoItem {
  id: string;
  title: string;
  description: string;
  type: "sla_breach" | "urgent" | "normal";
  actionUrl: string;
  dueAt?: string;
}

export interface QuoConversation {
  id: string;
  externalId: string | null;
  participantType: "worker" | "client" | "other";
  participantId: string | null;
  participantName: string | null;
  participantPhone: string;
  lastMessageAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface QuoMessage {
  id: string;
  conversationId: string;
  externalId: string | null;
  direction: "inbound" | "outbound";
  toNumber: string;
  fromNumber: string;
  body: string;
  status: "pending" | "sent" | "delivered" | "failed";
  sentAt: string | null;
  deliveredAt: string | null;
  createdAt: string;
}

export type QuoCallStatus = "initiated" | "ringing" | "in-progress" | "completed" | "failed" | "no-answer";

export interface QuoCallLog {
  id: string;
  externalId: string | null;
  direction: "inbound" | "outbound";
  toNumber: string;
  fromNumber: string;
  status: QuoCallStatus;
  startedAt: string;
  endedAt: string | null;
  durationSeconds: number | null;
  recordingUrl: string | null;
  participantName: string | null;
  createdAt: string;
}
