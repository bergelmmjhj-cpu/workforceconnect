export type UserRole = "admin" | "hr" | "client" | "worker";

export interface User {
  id: string;
  email: string;
  fullName: string;
  role: UserRole;
  timezone: string;
  avatarUrl?: string;
  createdAt: string;
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
