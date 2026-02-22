var __defProp = Object.defineProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// server/index.ts
import express from "express";

// server/routes.ts
import { createServer } from "node:http";

// server/websocket.ts
import { WebSocketServer, WebSocket } from "ws";
var clients = /* @__PURE__ */ new Set();
var wss;
function setupWebSocket(server) {
  wss = new WebSocketServer({ server, path: "/ws" });
  wss.on("connection", (ws) => {
    clients.add(ws);
    console.log(`[WS] Client connected (total: ${clients.size})`);
    ws.on("close", () => {
      clients.delete(ws);
      console.log(`[WS] Client disconnected (total: ${clients.size})`);
    });
    ws.on("error", (err) => {
      console.error("[WS] Error:", err.message);
      clients.delete(ws);
    });
    ws.send(JSON.stringify({ type: "connected", timestamp: (/* @__PURE__ */ new Date()).toISOString() }));
  });
  console.log("[WS] WebSocket server ready on /ws");
}
function broadcast(event) {
  const message = JSON.stringify({ ...event, timestamp: (/* @__PURE__ */ new Date()).toISOString() });
  let sent = 0;
  clients.forEach((client2) => {
    if (client2.readyState === WebSocket.OPEN) {
      client2.send(message);
      sent++;
    }
  });
  if (sent > 0) {
    console.log(`[WS] Broadcast ${event.type}:${event.entity} to ${sent} clients`);
  }
}
function getConnectedClientsCount() {
  return clients.size;
}

// server/db.ts
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

// shared/schema.ts
var schema_exports = {};
__export(schema_exports, {
  appNotifications: () => appNotifications,
  auditLog: () => auditLog,
  contactLeads: () => contactLeads,
  conversations: () => conversations2,
  exportAuditLogs: () => exportAuditLogs,
  insertAppNotificationSchema: () => insertAppNotificationSchema,
  insertContactLeadSchema: () => insertContactLeadSchema,
  insertConversationSchema: () => insertConversationSchema,
  insertExportAuditLogSchema: () => insertExportAuditLogSchema,
  insertMessageLogSchema: () => insertMessageLogSchema,
  insertMessageSchema: () => insertMessageSchema,
  insertPaymentProfileSchema: () => insertPaymentProfileSchema,
  insertPayrollBatchItemSchema: () => insertPayrollBatchItemSchema,
  insertPayrollBatchSchema: () => insertPayrollBatchSchema,
  insertShiftCheckinSchema: () => insertShiftCheckinSchema,
  insertShiftOfferSchema: () => insertShiftOfferSchema,
  insertShiftRequestSchema: () => insertShiftRequestSchema,
  insertShiftSchema: () => insertShiftSchema,
  insertShiftSeriesSchema: () => insertShiftSeriesSchema,
  insertTimesheetEntrySchema: () => insertTimesheetEntrySchema,
  insertTimesheetSchema: () => insertTimesheetSchema,
  insertTitoLogSchema: () => insertTitoLogSchema,
  insertUserSchema: () => insertUserSchema,
  insertWorkerApplicationSchema: () => insertWorkerApplicationSchema,
  insertWorkplaceAssignmentSchema: () => insertWorkplaceAssignmentSchema,
  insertWorkplaceSchema: () => insertWorkplaceSchema,
  loginUserSchema: () => loginUserSchema,
  messageLogs: () => messageLogs,
  messages: () => messages2,
  paymentProfiles: () => paymentProfiles,
  payrollBatchItemStatusEnum: () => payrollBatchItemStatusEnum,
  payrollBatchItems: () => payrollBatchItems,
  payrollBatchStatusEnum: () => payrollBatchStatusEnum,
  payrollBatches: () => payrollBatches,
  pushTokens: () => pushTokens,
  recurrenceExceptions: () => recurrenceExceptions,
  registerUserSchema: () => registerUserSchema,
  sentReminders: () => sentReminders,
  seriesEndTypeEnum: () => seriesEndTypeEnum,
  seriesFrequencyEnum: () => seriesFrequencyEnum,
  shiftCategoryEnum: () => shiftCategoryEnum,
  shiftCheckinStatusEnum: () => shiftCheckinStatusEnum,
  shiftCheckins: () => shiftCheckins,
  shiftFrequencyEnum: () => shiftFrequencyEnum,
  shiftOfferStatusEnum: () => shiftOfferStatusEnum,
  shiftOffers: () => shiftOffers,
  shiftRequestStatusEnum: () => shiftRequestStatusEnum,
  shiftRequests: () => shiftRequests,
  shiftSeries: () => shiftSeries,
  shiftStatusEnum: () => shiftStatusEnum,
  shifts: () => shifts,
  timesheetEntries: () => timesheetEntries,
  timesheetStatusEnum: () => timesheetStatusEnum,
  timesheets: () => timesheets,
  titoLogs: () => titoLogs,
  userPhotos: () => userPhotos,
  users: () => users,
  workerApplications: () => workerApplications,
  workplaceAssignmentStatusEnum: () => workplaceAssignmentStatusEnum,
  workplaceAssignments: () => workplaceAssignments,
  workplaces: () => workplaces
});
import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, integer, boolean, doublePrecision, uniqueIndex, date, numeric } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
var users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  fullName: text("full_name").notNull(),
  role: text("role").notNull().default("worker"),
  // admin, hr, client, worker
  timezone: text("timezone").default("America/Toronto"),
  onboardingStatus: text("onboarding_status"),
  // For workers: NOT_APPLIED, APPLICATION_SUBMITTED, etc.
  workerRoles: text("worker_roles"),
  // JSON array of worker roles
  businessName: text("business_name"),
  // For clients
  businessAddress: text("business_address"),
  businessPhone: text("business_phone"),
  profilePhotoUrl: text("profile_photo_url"),
  totpSecret: text("totp_secret"),
  totpEnabled: boolean("totp_enabled").default(false),
  recoveryCodes: text("recovery_codes"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull()
});
var insertUserSchema = createInsertSchema(users).pick({
  email: true,
  password: true,
  fullName: true,
  role: true,
  timezone: true,
  onboardingStatus: true,
  workerRoles: true,
  businessName: true,
  businessAddress: true,
  businessPhone: true,
  isActive: true
});
var registerUserSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  fullName: z.string().min(2),
  role: z.enum(["admin", "hr", "client", "worker"])
});
var loginUserSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1)
});
var conversations2 = pgTable("conversations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  type: text("type").notNull().default("hr_worker"),
  // Only "hr_worker" type
  workerUserId: varchar("worker_user_id").notNull().references(() => users.id),
  hrUserId: varchar("hr_user_id").references(() => users.id),
  // Optional - can be null if multiple HR
  lastMessageAt: timestamp("last_message_at"),
  lastMessagePreview: text("last_message_preview"),
  isArchived: boolean("is_archived").default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull()
});
var messages2 = pgTable("messages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  conversationId: varchar("conversation_id").notNull().references(() => conversations2.id),
  senderUserId: varchar("sender_user_id").notNull().references(() => users.id),
  recipientUserId: varchar("recipient_user_id").notNull().references(() => users.id),
  body: text("body").notNull(),
  messageType: text("message_type").notNull().default("text"),
  // "text" | "image" | "file"
  mediaUrl: text("media_url"),
  readAt: timestamp("read_at"),
  status: text("status").notNull().default("delivered"),
  // "sent" | "delivered" | "read"
  deletedAt: timestamp("deleted_at"),
  createdAt: timestamp("created_at").defaultNow().notNull()
});
var messageLogs = pgTable("message_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  messageId: varchar("message_id").notNull().references(() => messages2.id),
  event: text("event").notNull(),
  // "created" | "delivered" | "read" | "edited" | "deleted"
  actorUserId: varchar("actor_user_id").notNull().references(() => users.id),
  metadata: text("metadata"),
  // JSON string for additional data
  createdAt: timestamp("created_at").defaultNow().notNull()
});
var insertConversationSchema = createInsertSchema(conversations2);
var insertMessageSchema = createInsertSchema(messages2);
var insertMessageLogSchema = createInsertSchema(messageLogs);
var pushTokens = pgTable("push_tokens", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  token: text("token").notNull(),
  platform: text("platform").notNull().default("unknown"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull()
}, (table) => [
  uniqueIndex("push_tokens_token_idx").on(table.token)
]);
var contactLeads = pgTable("contact_leads", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  email: text("email").notNull(),
  company: text("company"),
  phone: text("phone"),
  cityProvince: text("city_province"),
  serviceNeeded: text("service_needed"),
  message: text("message").notNull(),
  ip: text("ip"),
  userAgent: text("user_agent"),
  createdAt: timestamp("created_at").defaultNow().notNull()
});
var insertContactLeadSchema = createInsertSchema(contactLeads).pick({
  name: true,
  email: true,
  company: true,
  phone: true,
  cityProvince: true,
  serviceNeeded: true,
  message: true,
  ip: true,
  userAgent: true
});
var workerApplications = pgTable("worker_applications", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  // Personal Details
  fullName: text("full_name").notNull(),
  phone: text("phone").notNull(),
  email: text("email").notNull(),
  address: text("address").notNull(),
  city: text("city").notNull(),
  province: text("province").notNull(),
  postalCode: text("postal_code").notNull(),
  dateOfBirth: text("date_of_birth"),
  // Work Eligibility
  workStatus: text("work_status").notNull(),
  // citizen, permanent_resident, work_permit
  backgroundCheckConsent: boolean("background_check_consent").default(false),
  // Role Interests
  preferredRoles: text("preferred_roles").notNull(),
  // JSON array
  otherRole: text("other_role"),
  // Availability
  availableDays: text("available_days").notNull(),
  // JSON array
  preferredShifts: text("preferred_shifts").notNull(),
  // JSON array (morning, afternoon, evening)
  unavailablePeriods: text("unavailable_periods"),
  // Experience
  yearsExperience: text("years_experience"),
  workHistory: text("work_history"),
  // JSON array of job objects
  experienceSummary: text("experience_summary"),
  // Skills
  skills: text("skills"),
  // JSON array
  certifications: text("certifications"),
  // JSON array
  // Shift Preferences
  shiftTypePreference: text("shift_type_preference"),
  // day, night, flexible
  desiredShiftLength: text("desired_shift_length"),
  // 4, 8, flexible
  maxTravelDistance: text("max_travel_distance"),
  // Emergency Contact
  emergencyContactName: text("emergency_contact_name").notNull(),
  emergencyContactRelationship: text("emergency_contact_relationship").notNull(),
  emergencyContactPhone: text("emergency_contact_phone").notNull(),
  // Payment Information
  paymentMethod: text("payment_method"),
  // direct_deposit, etransfer
  bankName: text("bank_name"),
  bankInstitution: text("bank_institution"),
  bankTransit: text("bank_transit"),
  bankAccount: text("bank_account"),
  etransferEmail: text("etransfer_email"),
  // Acknowledgments
  titoAcknowledgment: boolean("tito_acknowledgment").default(false),
  siteRulesAcknowledgment: boolean("site_rules_acknowledgment").default(false),
  workerAgreementConsent: boolean("worker_agreement_consent").default(false),
  privacyConsent: boolean("privacy_consent").default(false),
  marketingConsent: boolean("marketing_consent").default(false),
  // Electronic Signature
  signature: text("signature").notNull(),
  // Typed full name as signature
  signatureDate: text("signature_date").notNull(),
  // Status
  status: text("status").notNull().default("pending"),
  // pending, reviewed, approved, rejected
  reviewedBy: varchar("reviewed_by"),
  reviewedAt: timestamp("reviewed_at"),
  notes: text("notes"),
  // Metadata
  ip: text("ip"),
  userAgent: text("user_agent"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull()
});
var insertWorkerApplicationSchema = createInsertSchema(workerApplications).omit({
  id: true,
  status: true,
  reviewedBy: true,
  reviewedAt: true,
  notes: true,
  createdAt: true,
  updatedAt: true
});
var workplaces = pgTable("workplaces", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  addressLine1: text("address_line1"),
  city: text("city"),
  province: text("province"),
  postalCode: text("postal_code"),
  country: text("country").default("Canada"),
  latitude: doublePrecision("latitude"),
  longitude: doublePrecision("longitude"),
  geofenceRadiusMeters: integer("geofence_radius_meters").default(150),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull()
});
var insertWorkplaceSchema = createInsertSchema(workplaces).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});
var workplaceAssignmentStatusEnum = z.enum(["invited", "active", "suspended", "removed"]);
var workplaceAssignments = pgTable("workplace_assignments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  workplaceId: varchar("workplace_id").notNull().references(() => workplaces.id),
  workerUserId: varchar("worker_user_id").notNull().references(() => users.id),
  status: text("status").notNull().default("active"),
  // invited, active, suspended, removed
  invitedByUserId: varchar("invited_by_user_id").references(() => users.id),
  invitedAt: timestamp("invited_at").defaultNow().notNull(),
  acceptedAt: timestamp("accepted_at"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull()
}, (table) => ({
  uniqueWorkerWorkplace: uniqueIndex("unique_worker_workplace").on(table.workplaceId, table.workerUserId)
}));
var insertWorkplaceAssignmentSchema = createInsertSchema(workplaceAssignments).omit({
  id: true,
  invitedAt: true,
  createdAt: true,
  updatedAt: true
});
var titoLogs = pgTable("tito_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  workerId: varchar("worker_id").notNull().references(() => users.id),
  workplaceId: varchar("workplace_id").references(() => workplaces.id),
  shiftId: varchar("shift_id"),
  // Time tracking
  timeIn: timestamp("time_in"),
  timeOut: timestamp("time_out"),
  // GPS verification - Time In
  timeInGpsLat: doublePrecision("time_in_gps_lat"),
  timeInGpsLng: doublePrecision("time_in_gps_lng"),
  timeInDistanceMeters: doublePrecision("time_in_distance_meters"),
  timeInGpsVerified: boolean("time_in_gps_verified").default(false),
  timeInGpsFailureReason: text("time_in_gps_failure_reason"),
  // GPS verification - Time Out
  timeOutGpsLat: doublePrecision("time_out_gps_lat"),
  timeOutGpsLng: doublePrecision("time_out_gps_lng"),
  timeOutDistanceMeters: doublePrecision("time_out_distance_meters"),
  timeOutGpsVerified: boolean("time_out_gps_verified").default(false),
  timeOutGpsFailureReason: text("time_out_gps_failure_reason"),
  // Approval
  status: text("status").notNull().default("pending"),
  // pending, approved, disputed
  approvedBy: varchar("approved_by"),
  approvedAt: timestamp("approved_at"),
  disputedBy: varchar("disputed_by"),
  disputedAt: timestamp("disputed_at"),
  notes: text("notes"),
  lateReason: text("late_reason"),
  lateNote: text("late_note"),
  flaggedLate: boolean("flagged_late").default(false),
  lateMinutes: integer("late_minutes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull()
});
var insertTitoLogSchema = createInsertSchema(titoLogs).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});
var timesheetStatusEnum = z.enum(["draft", "submitted", "approved", "disputed", "processed"]);
var timesheets = pgTable("timesheets", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  workerUserId: varchar("worker_user_id").notNull().references(() => users.id),
  periodYear: integer("period_year").notNull(),
  periodNumber: integer("period_number").notNull(),
  status: text("status").notNull().default("draft"),
  // draft, submitted, approved, disputed, processed
  submittedAt: timestamp("submitted_at"),
  approvedByUserId: varchar("approved_by_user_id").references(() => users.id),
  approvedAt: timestamp("approved_at"),
  disputedByUserId: varchar("disputed_by_user_id").references(() => users.id),
  disputedAt: timestamp("disputed_at"),
  disputeReason: text("dispute_reason"),
  totalHours: numeric("total_hours", { precision: 10, scale: 2 }).default("0"),
  totalPay: numeric("total_pay", { precision: 12, scale: 2 }).default("0"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull()
}, (table) => ({
  uniqueWorkerPeriod: uniqueIndex("unique_worker_period").on(table.workerUserId, table.periodYear, table.periodNumber)
}));
var insertTimesheetSchema = createInsertSchema(timesheets).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});
var timesheetEntries = pgTable("timesheet_entries", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  timesheetId: varchar("timesheet_id").notNull().references(() => timesheets.id, { onDelete: "cascade" }),
  workplaceId: varchar("workplace_id").references(() => workplaces.id),
  titoLogId: varchar("tito_log_id").references(() => titoLogs.id),
  dateLocal: date("date_local").notNull(),
  timeInUtc: timestamp("time_in_utc").notNull(),
  timeOutUtc: timestamp("time_out_utc").notNull(),
  breakMinutes: integer("break_minutes").default(0),
  hours: numeric("hours", { precision: 5, scale: 2 }).notNull(),
  payRate: numeric("pay_rate", { precision: 10, scale: 2 }).notNull(),
  amount: numeric("amount", { precision: 10, scale: 2 }).notNull(),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull()
}, (table) => ({
  uniqueTitoLog: uniqueIndex("unique_timesheet_tito_log").on(table.titoLogId)
}));
var insertTimesheetEntrySchema = createInsertSchema(timesheetEntries).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});
var payrollBatchStatusEnum = z.enum(["open", "finalized", "exported"]);
var payrollBatches = pgTable("payroll_batches", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  periodYear: integer("period_year").notNull(),
  periodNumber: integer("period_number").notNull(),
  status: text("status").notNull().default("open"),
  // open, finalized, exported
  createdByUserId: varchar("created_by_user_id").notNull().references(() => users.id),
  finalizedByUserId: varchar("finalized_by_user_id").references(() => users.id),
  finalizedAt: timestamp("finalized_at"),
  totalWorkers: integer("total_workers").default(0),
  totalHours: numeric("total_hours", { precision: 10, scale: 2 }).default("0"),
  totalAmount: numeric("total_amount", { precision: 12, scale: 2 }).default("0"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull()
}, (table) => ({
  uniquePeriodBatch: uniqueIndex("unique_period_batch").on(table.periodYear, table.periodNumber)
}));
var insertPayrollBatchSchema = createInsertSchema(payrollBatches).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});
var payrollBatchItemStatusEnum = z.enum(["included", "excluded"]);
var payrollBatchItems = pgTable("payroll_batch_items", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  payrollBatchId: varchar("payroll_batch_id").notNull().references(() => payrollBatches.id, { onDelete: "cascade" }),
  workerUserId: varchar("worker_user_id").notNull().references(() => users.id),
  timesheetId: varchar("timesheet_id").notNull().references(() => timesheets.id),
  status: text("status").notNull().default("included"),
  // included, excluded
  hours: numeric("hours", { precision: 10, scale: 2 }).notNull(),
  amount: numeric("amount", { precision: 12, scale: 2 }).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull()
});
var insertPayrollBatchItemSchema = createInsertSchema(payrollBatchItems).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});
var paymentProfiles = pgTable("payment_profiles", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  workerUserId: varchar("worker_user_id").notNull().references(() => users.id).unique(),
  paymentMethod: text("payment_method"),
  // direct_deposit, etransfer
  bankName: text("bank_name"),
  etransferEmail: text("etransfer_email"),
  bankInstitution: text("bank_institution"),
  bankTransit: text("bank_transit"),
  bankAccount: text("bank_account"),
  voidChequeFileId: text("void_cheque_file_id"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull()
});
var insertPaymentProfileSchema = createInsertSchema(paymentProfiles).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});
var shiftStatusEnum = z.enum(["scheduled", "in_progress", "completed", "cancelled"]);
var shiftFrequencyEnum = z.enum(["one-time", "recurring", "open-ended"]);
var shiftCategoryEnum = z.enum(["hotel", "banquet", "janitorial"]);
var seriesFrequencyEnum = z.enum(["daily", "weekly", "biweekly", "monthly"]);
var seriesEndTypeEnum = z.enum(["date", "count", "never"]);
var shiftSeries = pgTable("shift_series", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  workplaceId: varchar("workplace_id").notNull().references(() => workplaces.id),
  workerUserId: varchar("worker_user_id").references(() => users.id),
  title: text("title").notNull(),
  roleType: text("role_type"),
  startTime: text("start_time").notNull(),
  endTime: text("end_time"),
  notes: text("notes"),
  category: text("category").notNull().default("janitorial"),
  frequency: text("frequency").notNull().default("weekly"),
  recurringDays: text("recurring_days"),
  startDate: date("start_date").notNull(),
  endType: text("end_type").notNull().default("never"),
  endDate: date("end_date"),
  endAfterCount: integer("end_after_count"),
  status: text("status").notNull().default("active"),
  createdByUserId: varchar("created_by_user_id").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull()
});
var insertShiftSeriesSchema = createInsertSchema(shiftSeries).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});
var recurrenceExceptions = pgTable("recurrence_exceptions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  seriesId: varchar("series_id").notNull().references(() => shiftSeries.id),
  date: date("date").notNull(),
  type: text("type").notNull().default("cancelled"),
  overrideStartTime: text("override_start_time"),
  overrideEndTime: text("override_end_time"),
  overrideWorkerUserId: varchar("override_worker_user_id").references(() => users.id),
  overrideNotes: text("override_notes"),
  reason: text("reason"),
  cancelledByUserId: varchar("cancelled_by_user_id").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull()
});
var auditLog = pgTable("audit_log", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id),
  action: text("action").notNull(),
  entityType: text("entity_type").notNull(),
  entityId: varchar("entity_id"),
  details: text("details"),
  createdAt: timestamp("created_at").defaultNow().notNull()
});
var userPhotos = pgTable("user_photos", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  url: text("url").notNull(),
  status: text("status").notNull().default("pending_review"),
  reviewerId: varchar("reviewer_id").references(() => users.id),
  reviewedAt: timestamp("reviewed_at"),
  rejectionReason: text("rejection_reason"),
  createdAt: timestamp("created_at").defaultNow().notNull()
});
var shifts = pgTable("shifts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  requestId: varchar("request_id"),
  workplaceId: varchar("workplace_id").notNull().references(() => workplaces.id),
  workerUserId: varchar("worker_user_id").references(() => users.id),
  roleType: text("role_type"),
  title: text("title").notNull(),
  date: date("date").notNull(),
  startTime: text("start_time").notNull(),
  endTime: text("end_time"),
  notes: text("notes"),
  status: text("status").notNull().default("scheduled"),
  frequencyType: text("frequency_type").notNull().default("one-time"),
  category: text("category").notNull().default("janitorial"),
  recurringDays: text("recurring_days"),
  recurringEndDate: date("recurring_end_date"),
  parentShiftId: varchar("parent_shift_id"),
  createdByUserId: varchar("created_by_user_id").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull()
});
var insertShiftSchema = createInsertSchema(shifts).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});
var shiftRequestStatusEnum = z.enum(["draft", "submitted", "offered", "filled", "cancelled", "expired"]);
var shiftRequests = pgTable("shift_requests", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  clientId: varchar("client_id").notNull().references(() => users.id),
  workplaceId: varchar("workplace_id").references(() => workplaces.id),
  roleType: text("role_type").notNull(),
  date: date("date").notNull(),
  startTime: text("start_time").notNull(),
  endTime: text("end_time").notNull(),
  notes: text("notes"),
  requestedWorkerId: varchar("requested_worker_id").references(() => users.id),
  status: text("status").notNull().default("draft"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull()
});
var insertShiftRequestSchema = createInsertSchema(shiftRequests).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});
var shiftOfferStatusEnum = z.enum(["pending", "accepted", "declined", "expired", "cancelled"]);
var shiftOffers = pgTable("shift_offers", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  shiftId: varchar("shift_id").notNull().references(() => shifts.id),
  workerId: varchar("worker_id").notNull().references(() => users.id),
  status: text("status").notNull().default("pending"),
  offeredAt: timestamp("offered_at").defaultNow().notNull(),
  respondedAt: timestamp("responded_at"),
  cancelledAt: timestamp("cancelled_at"),
  cancelledBy: varchar("cancelled_by"),
  cancelReason: text("cancel_reason"),
  createdAt: timestamp("created_at").defaultNow().notNull()
}, (table) => ({
  uniqueShiftWorker: uniqueIndex("unique_shift_worker_offer").on(table.shiftId, table.workerId)
}));
var insertShiftOfferSchema = createInsertSchema(shiftOffers).omit({
  id: true,
  offeredAt: true,
  createdAt: true
});
var appNotifications = pgTable("app_notifications", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  type: text("type").notNull(),
  title: text("title").notNull(),
  body: text("body").notNull(),
  deepLink: text("deep_link"),
  metadata: text("metadata"),
  readAt: timestamp("read_at"),
  createdAt: timestamp("created_at").defaultNow().notNull()
});
var insertAppNotificationSchema = createInsertSchema(appNotifications).omit({
  id: true,
  createdAt: true
});
var shiftCheckinStatusEnum = z.enum(["on_my_way", "issue", "checked_in", "checked_out"]);
var shiftCheckins = pgTable("shift_checkins", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  shiftId: varchar("shift_id").notNull().references(() => shifts.id),
  workerId: varchar("worker_id").notNull().references(() => users.id),
  status: text("status").notNull(),
  note: text("note"),
  createdAt: timestamp("created_at").defaultNow().notNull()
});
var insertShiftCheckinSchema = createInsertSchema(shiftCheckins).omit({
  id: true,
  createdAt: true
});
var sentReminders = pgTable("sent_reminders", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  shiftId: varchar("shift_id").notNull().references(() => shifts.id),
  workerId: varchar("worker_id").notNull().references(() => users.id),
  reminderType: text("reminder_type").notNull(),
  sentAt: timestamp("sent_at").defaultNow().notNull()
}, (table) => ({
  uniqueReminder: uniqueIndex("unique_shift_worker_reminder").on(table.shiftId, table.workerId, table.reminderType)
}));
var exportAuditLogs = pgTable("export_audit_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  adminUserId: varchar("admin_user_id").notNull().references(() => users.id),
  exportType: text("export_type").notNull(),
  // timesheet, paymentSummary, allHotels
  fileFormat: text("file_format").notNull(),
  // csv, xlsx, zip
  periodYear: integer("period_year").notNull(),
  periodNumber: integer("period_number").notNull(),
  workplaceId: varchar("workplace_id").references(() => workplaces.id),
  workplaceName: text("workplace_name"),
  fileName: text("file_name").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull()
});
var insertExportAuditLogSchema = createInsertSchema(exportAuditLogs).omit({
  id: true,
  createdAt: true
});

// server/db.ts
if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL environment variable is required");
}
var client = postgres(process.env.DATABASE_URL);
var db = drizzle(client, { schema: schema_exports });

// shared/payPeriods2026.ts
var PAY_PERIODS_2026 = [
  { year: 2026, periodNumber: 1, startDate: "2025-12-27", endDate: "2026-01-09", label: "Period 1 (Dec 27 - Jan 9)" },
  { year: 2026, periodNumber: 2, startDate: "2026-01-10", endDate: "2026-01-23", label: "Period 2 (Jan 10 - Jan 23)" },
  { year: 2026, periodNumber: 3, startDate: "2026-01-24", endDate: "2026-02-06", label: "Period 3 (Jan 24 - Feb 6)" },
  { year: 2026, periodNumber: 4, startDate: "2026-02-07", endDate: "2026-02-20", label: "Period 4 (Feb 7 - Feb 20)" },
  { year: 2026, periodNumber: 5, startDate: "2026-02-21", endDate: "2026-03-06", label: "Period 5 (Feb 21 - Mar 6)" },
  { year: 2026, periodNumber: 6, startDate: "2026-03-07", endDate: "2026-03-20", label: "Period 6 (Mar 7 - Mar 20)" },
  { year: 2026, periodNumber: 7, startDate: "2026-03-21", endDate: "2026-04-03", label: "Period 7 (Mar 21 - Apr 3)" },
  { year: 2026, periodNumber: 8, startDate: "2026-04-04", endDate: "2026-04-17", label: "Period 8 (Apr 4 - Apr 17)" },
  { year: 2026, periodNumber: 9, startDate: "2026-04-18", endDate: "2026-05-01", label: "Period 9 (Apr 18 - May 1)" },
  { year: 2026, periodNumber: 10, startDate: "2026-05-02", endDate: "2026-05-15", label: "Period 10 (May 2 - May 15)" },
  { year: 2026, periodNumber: 11, startDate: "2026-05-16", endDate: "2026-05-29", label: "Period 11 (May 16 - May 29)" },
  { year: 2026, periodNumber: 12, startDate: "2026-05-30", endDate: "2026-06-12", label: "Period 12 (May 30 - Jun 12)" },
  { year: 2026, periodNumber: 13, startDate: "2026-06-13", endDate: "2026-06-26", label: "Period 13 (Jun 13 - Jun 26)" },
  { year: 2026, periodNumber: 14, startDate: "2026-06-27", endDate: "2026-07-10", label: "Period 14 (Jun 27 - Jul 10)" },
  { year: 2026, periodNumber: 15, startDate: "2026-07-11", endDate: "2026-07-24", label: "Period 15 (Jul 11 - Jul 24)" },
  { year: 2026, periodNumber: 16, startDate: "2026-07-25", endDate: "2026-08-07", label: "Period 16 (Jul 25 - Aug 7)" },
  { year: 2026, periodNumber: 17, startDate: "2026-08-08", endDate: "2026-08-21", label: "Period 17 (Aug 8 - Aug 21)" },
  { year: 2026, periodNumber: 18, startDate: "2026-08-22", endDate: "2026-09-04", label: "Period 18 (Aug 22 - Sep 4)" },
  { year: 2026, periodNumber: 19, startDate: "2026-09-05", endDate: "2026-09-18", label: "Period 19 (Sep 5 - Sep 18)" },
  { year: 2026, periodNumber: 20, startDate: "2026-09-19", endDate: "2026-10-02", label: "Period 20 (Sep 19 - Oct 2)" },
  { year: 2026, periodNumber: 21, startDate: "2026-10-03", endDate: "2026-10-16", label: "Period 21 (Oct 3 - Oct 16)" },
  { year: 2026, periodNumber: 22, startDate: "2026-10-17", endDate: "2026-10-30", label: "Period 22 (Oct 17 - Oct 30)" },
  { year: 2026, periodNumber: 23, startDate: "2026-10-31", endDate: "2026-11-13", label: "Period 23 (Oct 31 - Nov 13)" },
  { year: 2026, periodNumber: 24, startDate: "2026-11-14", endDate: "2026-11-27", label: "Period 24 (Nov 14 - Nov 27)" },
  { year: 2026, periodNumber: 25, startDate: "2026-11-28", endDate: "2026-12-11", label: "Period 25 (Nov 28 - Dec 11)" },
  { year: 2026, periodNumber: 26, startDate: "2026-12-12", endDate: "2026-12-25", label: "Period 26 (Dec 12 - Dec 25)" }
];
function getPayPeriodsForYear(year) {
  if (year === 2026) {
    return PAY_PERIODS_2026;
  }
  return [];
}
function getPayPeriod(year, periodNumber) {
  const periods = getPayPeriodsForYear(year);
  return periods.find((p) => p.periodNumber === periodNumber);
}
function getCurrentPayPeriod(date2 = /* @__PURE__ */ new Date()) {
  const dateStr = date2.toISOString().slice(0, 10);
  const year = date2.getFullYear();
  const yearsToCheck = [year, year + 1];
  for (const y of yearsToCheck) {
    const periods = getPayPeriodsForYear(y);
    for (const period of periods) {
      if (dateStr >= period.startDate && dateStr <= period.endDate) {
        return period;
      }
    }
  }
  return void 0;
}

// server/routes.ts
import bcrypt from "bcryptjs";
import * as OTPAuth from "otpauth";
import crypto2 from "crypto";
import { eq, and, or, desc, isNull, sql as sql2, inArray, ne, gte, lte, not } from "drizzle-orm";
function haversineDistance(lat1, lng1, lat2, lng2) {
  const R = 6371e3;
  const phi1 = lat1 * Math.PI / 180;
  const phi2 = lat2 * Math.PI / 180;
  const deltaPhi = (lat2 - lat1) * Math.PI / 180;
  const deltaLambda = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) + Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}
async function sendPushNotifications(userIds, title, body, data) {
  try {
    const tokens = await db.select({ token: pushTokens.token }).from(pushTokens).where(and(
      inArray(pushTokens.userId, userIds),
      eq(pushTokens.isActive, true)
    ));
    if (tokens.length === 0) return;
    const messages3 = tokens.map((t) => ({
      to: t.token,
      sound: "default",
      title,
      body,
      data: data || {}
    }));
    const chunks = [];
    for (let i = 0; i < messages3.length; i += 100) {
      chunks.push(messages3.slice(i, i + 100));
    }
    let pushSucceeded = 0;
    let pushFailed = 0;
    for (const chunk of chunks) {
      try {
        const pushRes = await fetch("https://exp.host/--/api/v2/push/send", {
          method: "POST",
          headers: {
            "Accept": "application/json",
            "Content-Type": "application/json"
          },
          body: JSON.stringify(chunk)
        });
        const pushResult = await pushRes.json();
        if (pushResult?.data) {
          for (const ticket of pushResult.data) {
            if (ticket.status === "ok") pushSucceeded++;
            else pushFailed++;
          }
        }
      } catch (err) {
        pushFailed += chunk.length;
        console.error("[PUSH] Notification error:", err);
      }
    }
    console.log(`[PUSH] Sent to ${userIds.length} users: ${pushSucceeded} succeeded, ${pushFailed} failed, ${tokens.length} tokens found`);
  } catch (error) {
    console.error("Failed to send push notifications:", error);
  }
}
var rateLimitMap = /* @__PURE__ */ new Map();
var RATE_LIMIT_WINDOW = 6e4;
var RATE_LIMIT_MAX = 5;
function getClientIp(req) {
  const forwarded = req.headers["x-forwarded-for"];
  if (typeof forwarded === "string") {
    return forwarded.split(",")[0].trim();
  }
  return req.socket?.remoteAddress || "unknown";
}
function checkRateLimit(ip) {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);
  if (!entry || now > entry.resetTime) {
    rateLimitMap.set(ip, { count: 1, resetTime: now + RATE_LIMIT_WINDOW });
    return true;
  }
  if (entry.count >= RATE_LIMIT_MAX) {
    return false;
  }
  entry.count++;
  return true;
}
function checkRoles(...allowedRoles) {
  return (req, res, next) => {
    const role = req.headers["x-user-role"];
    const userId = req.headers["x-user-id"];
    if (!role || !allowedRoles.includes(role)) {
      console.log(`[AUTH REJECTED] ${req.method} ${req.path} - role="${role || "MISSING"}" userId="${userId || "MISSING"}" allowed=[${allowedRoles.join(",")}]`);
      res.status(403).json({ error: "Forbidden: Insufficient permissions" });
      return;
    }
    next();
  };
}
function expandSeriesOccurrences(series, exceptions, rangeStart, rangeEnd) {
  const occurrences = [];
  const startDate = new Date(Math.max(new Date(series.startDate).getTime(), new Date(rangeStart).getTime()));
  let endDate;
  if (series.endType === "date" && series.endDate) {
    endDate = new Date(Math.min(new Date(series.endDate).getTime(), new Date(rangeEnd).getTime()));
  } else {
    endDate = new Date(rangeEnd);
  }
  const days = series.recurringDays ? series.recurringDays.split(",") : [];
  const dayMap = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
  const dayNums = days.map((d) => dayMap[d]).filter((n) => n !== void 0);
  const exceptionMap = /* @__PURE__ */ new Map();
  exceptions.forEach((ex) => exceptionMap.set(ex.date, ex));
  const current = new Date(startDate);
  let count = 0;
  const maxCount = series.endType === "count" ? series.endAfterCount || 999 : 999;
  while (current <= endDate && count < maxCount) {
    const dateStr = current.toISOString().split("T")[0];
    let include = false;
    if (series.frequency === "daily") {
      include = true;
    } else if (series.frequency === "weekly" || series.frequency === "biweekly") {
      include = dayNums.includes(current.getDay());
      if (series.frequency === "biweekly" && include) {
        const weeksSinceStart = Math.floor((current.getTime() - new Date(series.startDate).getTime()) / (7 * 24 * 60 * 60 * 1e3));
        include = weeksSinceStart % 2 === 0;
      }
    } else if (series.frequency === "monthly") {
      include = current.getDate() === new Date(series.startDate).getDate();
    }
    if (include && current >= new Date(series.startDate)) {
      const exception = exceptionMap.get(dateStr);
      if (exception && exception.type === "cancelled") {
        occurrences.push({
          seriesId: series.id,
          date: dateStr,
          startTime: series.startTime,
          endTime: series.endTime,
          status: "cancelled",
          isException: true,
          exceptionType: "cancelled",
          reason: exception.reason
        });
      } else if (exception && exception.type === "modified") {
        occurrences.push({
          seriesId: series.id,
          date: dateStr,
          startTime: exception.overrideStartTime || series.startTime,
          endTime: exception.overrideEndTime || series.endTime,
          workerUserId: exception.overrideWorkerUserId || series.workerUserId,
          notes: exception.overrideNotes || series.notes,
          status: "scheduled",
          isException: true,
          exceptionType: "modified"
        });
      } else {
        occurrences.push({
          seriesId: series.id,
          date: dateStr,
          startTime: series.startTime,
          endTime: series.endTime,
          workerUserId: series.workerUserId,
          notes: series.notes,
          status: "scheduled",
          isException: false
        });
      }
      count++;
    }
    current.setDate(current.getDate() + 1);
  }
  return occurrences;
}
async function registerRoutes(app2) {
  app2.get("/api/health", (_req, res) => {
    res.json({
      status: "ok",
      version: "1.1.0",
      environment: process.env.DEMO_MODE === "false" ? "production" : "demo",
      dbIdentifier: process.env.PGDATABASE || "unknown",
      wsClients: getConnectedClientsCount(),
      timestamp: (/* @__PURE__ */ new Date()).toISOString()
    });
  });
  app2.use("/api", (req, _res, next) => {
    const userId = req.headers["x-user-id"];
    const role = req.headers["x-user-role"];
    console.log(`[API] ${req.method} ${req.path} | userId=${userId || "NONE"} role=${role || "NONE"}`);
    next();
  });
  app2.get("/api/debug/auth-test", (req, res) => {
    const userId = req.headers["x-user-id"];
    const role = req.headers["x-user-role"];
    const contentType = req.headers["content-type"];
    const accept = req.headers["accept"];
    const userAgent = req.headers["user-agent"];
    console.log(`[DEBUG AUTH TEST] userId=${userId || "NONE"} role=${role || "NONE"} ua=${userAgent?.substring(0, 50) || "NONE"}`);
    res.json({
      authReceived: !!(userId && role),
      userId: userId || null,
      role: role || null,
      contentType: contentType || null,
      accept: accept || null,
      userAgent: userAgent?.substring(0, 100) || null,
      timestamp: (/* @__PURE__ */ new Date()).toISOString()
    });
  });
  app2.get(
    "/api/communications/workers",
    checkRoles("admin", "hr"),
    async (_req, res) => {
      try {
        const workers = await db.select({
          id: users.id,
          email: users.email,
          fullName: users.fullName,
          onboardingStatus: users.onboardingStatus,
          workerRoles: users.workerRoles,
          isActive: users.isActive
        }).from(users).where(eq(users.role, "worker"));
        res.json(workers);
      } catch (error) {
        console.error("Error fetching workers:", error);
        res.status(500).json({ error: "Failed to fetch workers" });
      }
    }
  );
  app2.post(
    "/api/communications/conversations",
    checkRoles("admin", "hr"),
    async (req, res) => {
      try {
        const { workerUserId } = req.body;
        const hrUserId = req.headers["x-user-id"];
        if (!workerUserId) {
          res.status(400).json({ error: "workerUserId is required" });
          return;
        }
        const existing = await db.select().from(conversations2).where(eq(conversations2.workerUserId, workerUserId)).limit(1);
        if (existing.length > 0) {
          res.json(existing[0]);
          return;
        }
        const [newConversation] = await db.insert(conversations2).values({
          type: "hr_worker",
          workerUserId,
          hrUserId: hrUserId || null
        }).returning();
        res.json(newConversation);
      } catch (error) {
        console.error("Error creating conversation:", error);
        res.status(500).json({ error: "Failed to create conversation" });
      }
    }
  );
  app2.get(
    "/api/communications/conversations",
    async (req, res) => {
      try {
        const role = req.headers["x-user-role"];
        const userId = req.headers["x-user-id"];
        if (!role || !userId) {
          res.status(401).json({ error: "Authentication required" });
          return;
        }
        let convos;
        if (role === "admin" || role === "hr") {
          convos = await db.select({
            id: conversations2.id,
            type: conversations2.type,
            workerUserId: conversations2.workerUserId,
            hrUserId: conversations2.hrUserId,
            lastMessageAt: conversations2.lastMessageAt,
            lastMessagePreview: conversations2.lastMessagePreview,
            isArchived: conversations2.isArchived,
            createdAt: conversations2.createdAt,
            updatedAt: conversations2.updatedAt,
            workerName: users.fullName,
            workerEmail: users.email
          }).from(conversations2).leftJoin(users, eq(conversations2.workerUserId, users.id)).where(eq(conversations2.isArchived, false)).orderBy(desc(conversations2.lastMessageAt));
        } else if (role === "worker") {
          const workerConvos = await db.select({
            id: conversations2.id,
            type: conversations2.type,
            workerUserId: conversations2.workerUserId,
            hrUserId: conversations2.hrUserId,
            lastMessageAt: conversations2.lastMessageAt,
            lastMessagePreview: conversations2.lastMessagePreview,
            isArchived: conversations2.isArchived,
            createdAt: conversations2.createdAt,
            updatedAt: conversations2.updatedAt,
            hrName: users.fullName,
            hrEmail: users.email
          }).from(conversations2).leftJoin(users, eq(conversations2.hrUserId, users.id)).where(and(
            eq(conversations2.workerUserId, userId),
            eq(conversations2.isArchived, false)
          )).orderBy(desc(conversations2.lastMessageAt));
          convos = workerConvos;
        } else {
          res.status(403).json({ error: "Access denied" });
          return;
        }
        const convosWithUnread = await Promise.all(convos.map(async (c) => {
          const unreadResult = await db.select({ count: sql2`count(*)` }).from(messages2).where(and(
            eq(messages2.conversationId, c.id),
            eq(messages2.recipientUserId, userId),
            isNull(messages2.readAt)
          ));
          return { ...c, unreadCount: Number(unreadResult[0]?.count || 0) };
        }));
        res.json(convosWithUnread);
      } catch (error) {
        console.error("Error fetching conversations:", error);
        res.status(500).json({ error: "Failed to fetch conversations" });
      }
    }
  );
  app2.get(
    "/api/communications/conversations/:id/messages",
    async (req, res) => {
      try {
        const role = req.headers["x-user-role"];
        const userId = req.headers["x-user-id"];
        const conversationId = req.params.id;
        const limit = parseInt(req.query.limit) || 50;
        const offset = parseInt(req.query.offset) || 0;
        if (!role || !userId) {
          res.status(401).json({ error: "Authentication required" });
          return;
        }
        const [convo] = await db.select().from(conversations2).where(eq(conversations2.id, conversationId));
        if (!convo) {
          res.status(404).json({ error: "Conversation not found" });
          return;
        }
        if (role === "worker" && convo.workerUserId !== userId) {
          res.status(403).json({ error: "Access denied" });
          return;
        }
        const msgs = await db.select({
          id: messages2.id,
          conversationId: messages2.conversationId,
          senderUserId: messages2.senderUserId,
          recipientUserId: messages2.recipientUserId,
          body: messages2.body,
          messageType: messages2.messageType,
          mediaUrl: messages2.mediaUrl,
          readAt: messages2.readAt,
          status: messages2.status,
          createdAt: messages2.createdAt,
          senderName: users.fullName
        }).from(messages2).leftJoin(users, eq(messages2.senderUserId, users.id)).where(and(
          eq(messages2.conversationId, conversationId),
          isNull(messages2.deletedAt)
        )).orderBy(desc(messages2.createdAt)).limit(limit).offset(offset);
        res.json(msgs.reverse());
      } catch (error) {
        console.error("Error fetching messages:", error);
        res.status(500).json({ error: "Failed to fetch messages" });
      }
    }
  );
  app2.post(
    "/api/communications/conversations/:id/messages",
    async (req, res) => {
      try {
        const role = req.headers["x-user-role"];
        const userId = req.headers["x-user-id"];
        const conversationId = req.params.id;
        const { body, messageType = "text", mediaUrl } = req.body;
        if (!role || !userId) {
          res.status(401).json({ error: "Authentication required" });
          return;
        }
        if (!body || body.trim().length === 0) {
          res.status(400).json({ error: "Message body is required" });
          return;
        }
        const [convo] = await db.select().from(conversations2).where(eq(conversations2.id, conversationId));
        if (!convo) {
          res.status(404).json({ error: "Conversation not found" });
          return;
        }
        if (role === "worker" && convo.workerUserId !== userId) {
          res.status(403).json({ error: "Access denied" });
          return;
        }
        let recipientUserId;
        if (role === "worker") {
          if (convo.hrUserId) {
            recipientUserId = convo.hrUserId;
          } else {
            const [hrUser] = await db.select({ id: users.id }).from(users).where(or(eq(users.role, "hr"), eq(users.role, "admin"))).limit(1);
            if (!hrUser) {
              res.status(400).json({ error: "No HR available to receive message" });
              return;
            }
            recipientUserId = hrUser.id;
          }
        } else {
          recipientUserId = convo.workerUserId;
        }
        const [newMessage] = await db.insert(messages2).values({
          conversationId,
          senderUserId: userId,
          recipientUserId,
          body: body.trim(),
          messageType,
          mediaUrl,
          status: "delivered"
        }).returning();
        await db.insert(messageLogs).values({
          messageId: newMessage.id,
          event: "created",
          actorUserId: userId
        });
        await db.update(conversations2).set({
          lastMessageAt: /* @__PURE__ */ new Date(),
          lastMessagePreview: body.trim().substring(0, 100),
          updatedAt: /* @__PURE__ */ new Date()
        }).where(eq(conversations2.id, conversationId));
        const [sender] = await db.select({ fullName: users.fullName }).from(users).where(eq(users.id, userId));
        sendPushNotifications(
          [recipientUserId],
          sender?.fullName || "New Message",
          body.trim().length > 100 ? body.trim().substring(0, 97) + "..." : body.trim(),
          { conversationId, type: "message" }
        );
        res.json({ ...newMessage, senderName: sender?.fullName || "Unknown" });
      } catch (error) {
        console.error("Error sending message:", error);
        res.status(500).json({ error: "Failed to send message" });
      }
    }
  );
  app2.post(
    "/api/communications/conversations/:id/read",
    async (req, res) => {
      try {
        const userId = req.headers["x-user-id"];
        const conversationId = req.params.id;
        if (!userId) {
          res.status(401).json({ error: "Authentication required" });
          return;
        }
        const unreadMessages = await db.select({ id: messages2.id }).from(messages2).where(and(
          eq(messages2.conversationId, conversationId),
          eq(messages2.recipientUserId, userId),
          isNull(messages2.readAt)
        ));
        const now = /* @__PURE__ */ new Date();
        await db.update(messages2).set({ readAt: now, status: "read" }).where(and(
          eq(messages2.conversationId, conversationId),
          eq(messages2.recipientUserId, userId),
          isNull(messages2.readAt)
        ));
        for (const msg of unreadMessages) {
          await db.insert(messageLogs).values({
            messageId: msg.id,
            event: "read",
            actorUserId: userId
          });
        }
        res.json({ marked: unreadMessages.length });
      } catch (error) {
        console.error("Error marking messages as read:", error);
        res.status(500).json({ error: "Failed to mark messages as read" });
      }
    }
  );
  app2.post("/api/auth/register", async (req, res) => {
    try {
      const result = registerUserSchema.safeParse(req.body);
      if (!result.success) {
        res.status(400).json({ error: result.error.errors[0].message });
        return;
      }
      const { email, password, fullName, role } = result.data;
      const existingUser = await db.select().from(users).where(eq(users.email, email.toLowerCase()));
      if (existingUser.length > 0) {
        res.status(400).json({ error: "Email already registered" });
        return;
      }
      const hashedPassword = await bcrypt.hash(password, 10);
      const [newUser] = await db.insert(users).values({
        email: email.toLowerCase(),
        password: hashedPassword,
        fullName,
        role,
        isActive: false,
        onboardingStatus: role === "worker" ? "NOT_APPLIED" : null
      }).returning();
      const { password: _, ...userWithoutPassword } = newUser;
      res.json({ user: userWithoutPassword });
    } catch (error) {
      console.error("Error registering user:", error);
      res.status(500).json({ error: "Failed to register user" });
    }
  });
  app2.post("/api/push-tokens", async (req, res) => {
    try {
      const userId = req.headers["x-user-id"];
      const { token, platform } = req.body;
      if (!userId) {
        res.status(401).json({ error: "Authentication required" });
        return;
      }
      if (!token) {
        res.status(400).json({ error: "Token is required" });
        return;
      }
      const existing = await db.select().from(pushTokens).where(eq(pushTokens.token, token)).limit(1);
      if (existing.length > 0) {
        await db.update(pushTokens).set({ userId, platform: platform || "unknown", isActive: true, updatedAt: /* @__PURE__ */ new Date() }).where(eq(pushTokens.token, token));
      } else {
        await db.insert(pushTokens).values({
          userId,
          token,
          platform: platform || "unknown"
        });
      }
      res.json({ success: true });
    } catch (error) {
      console.error("Error registering push token:", error);
      res.status(500).json({ error: "Failed to register push token" });
    }
  });
  app2.delete("/api/push-tokens", async (req, res) => {
    try {
      const { token } = req.body;
      if (!token) {
        res.status(400).json({ error: "Token is required" });
        return;
      }
      await db.update(pushTokens).set({ isActive: false, updatedAt: /* @__PURE__ */ new Date() }).where(eq(pushTokens.token, token));
      res.json({ success: true });
    } catch (error) {
      console.error("Error deactivating push token:", error);
      res.status(500).json({ error: "Failed to deactivate push token" });
    }
  });
  app2.post("/api/auth/login", async (req, res) => {
    try {
      const result = loginUserSchema.safeParse(req.body);
      if (!result.success) {
        res.status(400).json({ error: result.error.errors[0].message });
        return;
      }
      const { email, password } = result.data;
      const [user] = await db.select().from(users).where(eq(users.email, email.toLowerCase()));
      if (!user) {
        res.status(401).json({ error: "Invalid email or password" });
        return;
      }
      const validPassword = await bcrypt.compare(password, user.password);
      if (!validPassword) {
        res.status(401).json({ error: "Invalid email or password" });
        return;
      }
      if (!user.isActive) {
        res.status(401).json({ error: "Your account is pending approval. An admin will review and activate your account shortly." });
        return;
      }
      if (user.totpEnabled) {
        res.json({ requires2FA: true, userId: user.id });
        return;
      }
      const { password: _, totpSecret: __, recoveryCodes: ___, ...userWithoutSensitive } = user;
      res.json({ user: userWithoutSensitive });
    } catch (error) {
      console.error("Error logging in:", error);
      res.status(500).json({ error: "Failed to login" });
    }
  });
  function generateRecoveryCodes() {
    const codes = [];
    for (let i = 0; i < 8; i++) {
      codes.push(crypto2.randomBytes(4).toString("hex").toUpperCase());
    }
    return codes;
  }
  app2.post("/api/2fa/setup", async (req, res) => {
    try {
      const userId = req.headers["x-user-id"];
      if (!userId) {
        res.status(401).json({ error: "Authentication required" });
        return;
      }
      const [user] = await db.select().from(users).where(eq(users.id, userId));
      if (!user) {
        res.status(404).json({ error: "User not found" });
        return;
      }
      if (user.totpEnabled) {
        res.status(400).json({ error: "2FA is already enabled" });
        return;
      }
      const secret = new OTPAuth.Secret({ size: 20 });
      const totp = new OTPAuth.TOTP({
        issuer: "Workforce Connect",
        label: user.email,
        algorithm: "SHA1",
        digits: 6,
        period: 30,
        secret
      });
      await db.update(users).set({ totpSecret: secret.base32, updatedAt: /* @__PURE__ */ new Date() }).where(eq(users.id, userId));
      res.json({
        secret: secret.base32,
        uri: totp.toString()
      });
    } catch (error) {
      console.error("Error setting up 2FA:", error);
      res.status(500).json({ error: "Failed to setup 2FA" });
    }
  });
  app2.post("/api/2fa/verify-setup", async (req, res) => {
    try {
      const userId = req.headers["x-user-id"];
      if (!userId) {
        res.status(401).json({ error: "Authentication required" });
        return;
      }
      const { code } = req.body;
      if (!code) {
        res.status(400).json({ error: "Verification code is required" });
        return;
      }
      const [user] = await db.select().from(users).where(eq(users.id, userId));
      if (!user || !user.totpSecret) {
        res.status(400).json({ error: "2FA setup not initiated" });
        return;
      }
      const totp = new OTPAuth.TOTP({
        issuer: "Workforce Connect",
        label: user.email,
        algorithm: "SHA1",
        digits: 6,
        period: 30,
        secret: OTPAuth.Secret.fromBase32(user.totpSecret)
      });
      const delta = totp.validate({ token: code, window: 1 });
      if (delta === null) {
        res.status(400).json({ error: "Invalid verification code" });
        return;
      }
      const recoveryCodes = generateRecoveryCodes();
      await db.update(users).set({
        totpEnabled: true,
        recoveryCodes: JSON.stringify(recoveryCodes),
        updatedAt: /* @__PURE__ */ new Date()
      }).where(eq(users.id, userId));
      res.json({
        enabled: true,
        recoveryCodes
      });
    } catch (error) {
      console.error("Error verifying 2FA setup:", error);
      res.status(500).json({ error: "Failed to verify 2FA setup" });
    }
  });
  app2.post("/api/2fa/disable", async (req, res) => {
    try {
      const userId = req.headers["x-user-id"];
      if (!userId) {
        res.status(401).json({ error: "Authentication required" });
        return;
      }
      const { code } = req.body;
      if (!code) {
        res.status(400).json({ error: "Verification code is required" });
        return;
      }
      const [user] = await db.select().from(users).where(eq(users.id, userId));
      if (!user || !user.totpEnabled || !user.totpSecret) {
        res.status(400).json({ error: "2FA is not enabled" });
        return;
      }
      const totp = new OTPAuth.TOTP({
        issuer: "Workforce Connect",
        label: user.email,
        algorithm: "SHA1",
        digits: 6,
        period: 30,
        secret: OTPAuth.Secret.fromBase32(user.totpSecret)
      });
      const delta = totp.validate({ token: code, window: 1 });
      if (delta === null) {
        res.status(400).json({ error: "Invalid verification code" });
        return;
      }
      await db.update(users).set({
        totpEnabled: false,
        totpSecret: null,
        recoveryCodes: null,
        updatedAt: /* @__PURE__ */ new Date()
      }).where(eq(users.id, userId));
      res.json({ disabled: true });
    } catch (error) {
      console.error("Error disabling 2FA:", error);
      res.status(500).json({ error: "Failed to disable 2FA" });
    }
  });
  app2.post("/api/2fa/verify", async (req, res) => {
    try {
      const { userId, code } = req.body;
      if (!userId || !code) {
        res.status(400).json({ error: "User ID and code are required" });
        return;
      }
      const [user] = await db.select().from(users).where(eq(users.id, userId));
      if (!user || !user.totpEnabled || !user.totpSecret) {
        res.status(400).json({ error: "2FA is not enabled for this user" });
        return;
      }
      const totp = new OTPAuth.TOTP({
        issuer: "Workforce Connect",
        label: user.email,
        algorithm: "SHA1",
        digits: 6,
        period: 30,
        secret: OTPAuth.Secret.fromBase32(user.totpSecret)
      });
      const delta = totp.validate({ token: code, window: 1 });
      if (delta !== null) {
        const { password: _, totpSecret: __, recoveryCodes: ___, ...userWithoutSensitive } = user;
        res.json({ verified: true, user: userWithoutSensitive });
        return;
      }
      if (user.recoveryCodes) {
        const codes = JSON.parse(user.recoveryCodes);
        const codeIndex = codes.indexOf(code.toUpperCase());
        if (codeIndex !== -1) {
          codes.splice(codeIndex, 1);
          await db.update(users).set({ recoveryCodes: JSON.stringify(codes), updatedAt: /* @__PURE__ */ new Date() }).where(eq(users.id, userId));
          const { password: _, totpSecret: __, recoveryCodes: ___, ...userWithoutSensitive } = user;
          res.json({ verified: true, user: userWithoutSensitive, remainingRecoveryCodes: codes.length });
          return;
        }
      }
      res.status(400).json({ error: "Invalid verification code" });
    } catch (error) {
      console.error("Error verifying 2FA:", error);
      res.status(500).json({ error: "Failed to verify 2FA" });
    }
  });
  app2.get("/api/2fa/status", async (req, res) => {
    try {
      const userId = req.headers["x-user-id"];
      if (!userId) {
        res.status(401).json({ error: "Authentication required" });
        return;
      }
      const [user] = await db.select({ totpEnabled: users.totpEnabled }).from(users).where(eq(users.id, userId));
      if (!user) {
        res.status(404).json({ error: "User not found" });
        return;
      }
      res.json({ enabled: user.totpEnabled || false });
    } catch (error) {
      console.error("Error checking 2FA status:", error);
      res.status(500).json({ error: "Failed to check 2FA status" });
    }
  });
  app2.get("/api/users", checkRoles("admin"), async (_req, res) => {
    try {
      const allUsers = await db.select({
        id: users.id,
        email: users.email,
        fullName: users.fullName,
        role: users.role,
        timezone: users.timezone,
        onboardingStatus: users.onboardingStatus,
        workerRoles: users.workerRoles,
        businessName: users.businessName,
        isActive: users.isActive,
        createdAt: users.createdAt,
        updatedAt: users.updatedAt
      }).from(users);
      res.json(allUsers);
    } catch (error) {
      console.error("Error fetching users:", error);
      res.status(500).json({ error: "Failed to fetch users" });
    }
  });
  app2.patch("/api/users/:id", checkRoles("admin"), async (req, res) => {
    try {
      const id = req.params.id;
      const { role, isActive, onboardingStatus, workerRoles } = req.body;
      const updateData = { updatedAt: /* @__PURE__ */ new Date() };
      if (role !== void 0) updateData.role = role;
      if (isActive !== void 0) updateData.isActive = isActive;
      if (onboardingStatus !== void 0) updateData.onboardingStatus = onboardingStatus;
      if (workerRoles !== void 0) updateData.workerRoles = workerRoles;
      if (isActive === true && onboardingStatus === void 0) {
        const [existingUser] = await db.select().from(users).where(eq(users.id, id));
        if (existingUser && existingUser.role === "worker" && (existingUser.onboardingStatus === "APPLICATION_SUBMITTED" || existingUser.onboardingStatus === "NOT_APPLIED")) {
          updateData.onboardingStatus = "AGREEMENT_PENDING";
        }
      }
      const [updatedUser] = await db.update(users).set(updateData).where(eq(users.id, id)).returning();
      if (!updatedUser) {
        res.status(404).json({ error: "User not found" });
        return;
      }
      const { password: _, ...userWithoutPassword } = updatedUser;
      res.json(userWithoutPassword);
      broadcast({ type: "updated", entity: "user", id: req.params.id });
    } catch (error) {
      console.error("Error updating user:", error);
      res.status(500).json({ error: "Failed to update user" });
    }
  });
  app2.patch("/api/users/me/onboarding-status", async (req, res) => {
    try {
      const userId = req.headers["x-user-id"];
      const role = req.headers["x-user-role"];
      const { onboardingStatus } = req.body;
      console.log(`[ONBOARDING] Status update request: userId=${userId}, role=${role}, newStatus=${onboardingStatus}`);
      if (!userId || !role) {
        console.log(`[ONBOARDING] REJECTED: Missing auth headers (userId=${userId}, role=${role})`);
        res.status(401).json({ error: "Authentication required" });
        return;
      }
      if (role !== "worker") {
        console.log(`[ONBOARDING] REJECTED: Non-worker role (${role}) tried to update status`);
        res.status(403).json({ error: "Only workers can update their onboarding status" });
        return;
      }
      const validStatuses = ["NOT_APPLIED", "APPLICATION_SUBMITTED", "AGREEMENT_PENDING", "AGREEMENT_ACCEPTED"];
      if (!onboardingStatus || !validStatuses.includes(onboardingStatus)) {
        console.log(`[ONBOARDING] REJECTED: Invalid status value: ${onboardingStatus}`);
        res.status(400).json({ error: "Invalid onboarding status" });
        return;
      }
      const [updatedUser] = await db.update(users).set({ onboardingStatus, updatedAt: /* @__PURE__ */ new Date() }).where(eq(users.id, userId)).returning();
      if (!updatedUser) {
        console.log(`[ONBOARDING] REJECTED: User not found for id=${userId}`);
        res.status(404).json({ error: "User not found" });
        return;
      }
      console.log(`[ONBOARDING] SUCCESS: User ${updatedUser.email} (${userId}) status updated to ${updatedUser.onboardingStatus}`);
      res.json({
        id: updatedUser.id,
        onboardingStatus: updatedUser.onboardingStatus
      });
      broadcast({ type: "updated", entity: "onboarding", id: userId });
    } catch (error) {
      console.error("[ONBOARDING] ERROR updating onboarding status:", error);
      res.status(500).json({ error: "Failed to update onboarding status" });
    }
  });
  app2.delete("/api/users/:id", checkRoles("admin"), async (req, res) => {
    try {
      const id = req.params.id;
      const adminId = req.headers["x-user-id"];
      console.log(`[DELETE USER] Admin ${adminId} requesting to delete user ${id}`);
      if (id === adminId) {
        console.log(`[DELETE USER] REJECTED: Admin tried to delete themselves`);
        res.status(400).json({ error: "You cannot delete your own account" });
        return;
      }
      const [existingUser] = await db.select().from(users).where(eq(users.id, id)).limit(1);
      if (!existingUser) {
        console.log(`[DELETE USER] REJECTED: User ${id} not found`);
        res.status(404).json({ error: "User not found" });
        return;
      }
      console.log(`[DELETE USER] Deleting user: ${existingUser.email} (${existingUser.role})`);
      await db.execute(sql2`DELETE FROM message_logs WHERE message_id IN (SELECT id FROM messages WHERE sender_user_id = ${id} OR recipient_user_id = ${id})`);
      await db.execute(sql2`DELETE FROM message_logs WHERE actor_user_id = ${id}`);
      await db.execute(sql2`DELETE FROM messages WHERE sender_user_id = ${id} OR recipient_user_id = ${id}`);
      await db.execute(sql2`DELETE FROM conversations WHERE worker_user_id = ${id} OR hr_user_id = ${id}`);
      await db.execute(sql2`DELETE FROM push_tokens WHERE user_id = ${id}`);
      await db.execute(sql2`DELETE FROM app_notifications WHERE user_id = ${id}`);
      await db.execute(sql2`DELETE FROM sent_reminders WHERE worker_id = ${id}`);
      await db.execute(sql2`DELETE FROM shift_checkins WHERE worker_id = ${id}`);
      await db.execute(sql2`DELETE FROM shift_offers WHERE worker_user_id = ${id}`);
      await db.execute(sql2`DELETE FROM payroll_batch_items WHERE worker_user_id = ${id}`);
      await db.execute(sql2`DELETE FROM timesheet_entries WHERE timesheet_id IN (SELECT id FROM timesheets WHERE worker_user_id = ${id})`);
      await db.execute(sql2`UPDATE timesheets SET approved_by_user_id = NULL WHERE approved_by_user_id = ${id}`);
      await db.execute(sql2`UPDATE timesheets SET disputed_by_user_id = NULL WHERE disputed_by_user_id = ${id}`);
      await db.execute(sql2`DELETE FROM timesheets WHERE worker_user_id = ${id}`);
      await db.execute(sql2`DELETE FROM tito_logs WHERE worker_id = ${id}`);
      await db.execute(sql2`UPDATE workplace_assignments SET invited_by_user_id = NULL WHERE invited_by_user_id = ${id}`);
      await db.execute(sql2`DELETE FROM workplace_assignments WHERE worker_user_id = ${id}`);
      await db.execute(sql2`DELETE FROM payment_profiles WHERE worker_user_id = ${id}`);
      await db.execute(sql2`DELETE FROM export_audit_logs WHERE admin_user_id = ${id}`);
      await db.execute(sql2`UPDATE payroll_batches SET created_by_user_id = ${adminId} WHERE created_by_user_id = ${id}`);
      await db.execute(sql2`UPDATE payroll_batches SET finalized_by_user_id = NULL WHERE finalized_by_user_id = ${id}`);
      await db.execute(sql2`DELETE FROM recurrence_exceptions WHERE override_worker_user_id = ${id} OR cancelled_by_user_id = ${id}`);
      await db.execute(sql2`UPDATE shift_series SET worker_user_id = NULL WHERE worker_user_id = ${id}`);
      await db.execute(sql2`UPDATE shift_series SET created_by_user_id = NULL WHERE created_by_user_id = ${id}`);
      await db.execute(sql2`UPDATE shifts SET worker_user_id = NULL WHERE worker_user_id = ${id}`);
      await db.execute(sql2`UPDATE shifts SET created_by_user_id = NULL WHERE created_by_user_id = ${id}`);
      await db.execute(sql2`UPDATE shift_requests SET requested_worker_id = NULL WHERE requested_worker_id = ${id}`);
      await db.execute(sql2`DELETE FROM shift_requests WHERE client_id = ${id}`);
      await db.execute(sql2`DELETE FROM user_photos WHERE user_id = ${id} OR reviewer_id = ${id}`);
      await db.execute(sql2`DELETE FROM audit_log WHERE user_id = ${id}`);
      await db.execute(sql2`DELETE FROM worker_applications WHERE email = ${existingUser.email}`);
      await db.execute(sql2`DELETE FROM users WHERE id = ${id}`);
      console.log(`[DELETE USER] SUCCESS: User ${existingUser.email} (${id}) deleted by admin ${adminId}`);
      res.json({ message: "User deleted successfully" });
      broadcast({ type: "deleted", entity: "user", id });
    } catch (error) {
      console.error("[DELETE USER] ERROR:", error);
      const detail = error?.message || "Failed to delete user";
      res.status(500).json({ error: `Failed to delete user: ${detail}` });
    }
  });
  app2.post("/api/users", checkRoles("admin"), async (req, res) => {
    try {
      const { email, password, fullName, role } = req.body;
      if (!email || !password || !fullName || !role) {
        res.status(400).json({ error: "Email, password, full name, and role are required" });
        return;
      }
      const validRoles = ["admin", "hr", "client", "worker"];
      if (!validRoles.includes(role)) {
        res.status(400).json({ error: "Invalid role. Must be one of: admin, hr, client, worker" });
        return;
      }
      const existingUser = await db.select().from(users).where(eq(users.email, email.toLowerCase())).limit(1);
      if (existingUser.length > 0) {
        res.status(409).json({ error: "A user with this email already exists" });
        return;
      }
      const hashedPassword = await bcrypt.hash(password, 10);
      const [newUser] = await db.insert(users).values({
        email: email.toLowerCase(),
        password: hashedPassword,
        fullName,
        role,
        isActive: true,
        onboardingStatus: role === "worker" ? "NOT_APPLIED" : null
      }).returning();
      const { password: _, ...userWithoutPassword } = newUser;
      res.status(201).json(userWithoutPassword);
      broadcast({ type: "created", entity: "user" });
    } catch (error) {
      console.error("Error creating user:", error);
      res.status(500).json({ error: "Failed to create user" });
    }
  });
  app2.post("/public/contact", async (req, res) => {
    try {
      const ip = getClientIp(req);
      if (!checkRateLimit(ip)) {
        res.status(429).json({ ok: false, error: "Too many requests. Please try again later." });
        return;
      }
      const { name, email, company, phone, cityProvince, serviceNeeded, message } = req.body;
      if (!name || typeof name !== "string" || name.trim().length < 2) {
        res.status(400).json({ ok: false, error: "Name is required (minimum 2 characters)" });
        return;
      }
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!email || typeof email !== "string" || !emailRegex.test(email)) {
        res.status(400).json({ ok: false, error: "Valid email is required" });
        return;
      }
      if (!message || typeof message !== "string" || message.trim().length < 10) {
        res.status(400).json({ ok: false, error: "Message is required (minimum 10 characters)" });
        return;
      }
      const userAgent = req.headers["user-agent"] || null;
      await db.insert(contactLeads).values({
        name: name.trim(),
        email: email.trim().toLowerCase(),
        company: company?.trim() || null,
        phone: phone?.trim() || null,
        cityProvince: cityProvince?.trim() || null,
        serviceNeeded: serviceNeeded?.trim() || null,
        message: message.trim(),
        ip,
        userAgent
      });
      console.log(`Contact form submission from: ${email}`);
      res.json({ ok: true });
    } catch (error) {
      console.error("Error saving contact lead:", error);
      res.status(500).json({ ok: false, error: "Failed to submit form. Please try again." });
    }
  });
  app2.post("/api/public/apply", async (req, res) => {
    try {
      const ip = getClientIp(req);
      if (!checkRateLimit(ip)) {
        res.status(429).json({ error: "Too many requests. Please try again later." });
        return;
      }
      const userAgent = req.headers["user-agent"] || null;
      const applicationData = {
        ...req.body,
        ip,
        userAgent
      };
      const [newApplication] = await db.insert(workerApplications).values(applicationData).returning();
      console.log(`Worker application submitted from: ${req.body.email}`);
      res.json({ ok: true, id: newApplication.id });
    } catch (error) {
      console.error("Error saving worker application:", error);
      res.status(500).json({ error: "Failed to submit application. Please try again." });
    }
  });
  app2.get("/api/admin/applications", async (req, res) => {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith("Basic ")) {
        res.status(401).json({ error: "Authentication required" });
        return;
      }
      const base64Credentials = authHeader.split(" ")[1];
      const credentials = Buffer.from(base64Credentials, "base64").toString("utf-8");
      const [username, password] = credentials.split(":");
      if (username !== "wfconnect" || password !== "@2255Dundaswest") {
        res.status(401).json({ error: "Invalid credentials" });
        return;
      }
      const applications = await db.select().from(workerApplications).orderBy(desc(workerApplications.createdAt));
      res.json(applications);
    } catch (error) {
      console.error("Error fetching applications:", error);
      res.status(500).json({ error: "Failed to fetch applications" });
    }
  });
  app2.get("/api/admin/applications/:id", async (req, res) => {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith("Basic ")) {
        res.status(401).json({ error: "Authentication required" });
        return;
      }
      const base64Credentials = authHeader.split(" ")[1];
      const credentials = Buffer.from(base64Credentials, "base64").toString("utf-8");
      const [username, password] = credentials.split(":");
      if (username !== "wfconnect" || password !== "@2255Dundaswest") {
        res.status(401).json({ error: "Invalid credentials" });
        return;
      }
      const [application] = await db.select().from(workerApplications).where(eq(workerApplications.id, req.params.id));
      if (!application) {
        res.status(404).json({ error: "Application not found" });
        return;
      }
      res.json(application);
    } catch (error) {
      console.error("Error fetching application:", error);
      res.status(500).json({ error: "Failed to fetch application" });
    }
  });
  app2.patch("/api/admin/applications/:id", async (req, res) => {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith("Basic ")) {
        res.status(401).json({ error: "Authentication required" });
        return;
      }
      const base64Credentials = authHeader.split(" ")[1];
      const credentials = Buffer.from(base64Credentials, "base64").toString("utf-8");
      const [username, password] = credentials.split(":");
      if (username !== "wfconnect" || password !== "@2255Dundaswest") {
        res.status(401).json({ error: "Invalid credentials" });
        return;
      }
      const { status, notes } = req.body;
      const [updatedApplication] = await db.update(workerApplications).set({
        status,
        notes,
        reviewedAt: /* @__PURE__ */ new Date(),
        updatedAt: /* @__PURE__ */ new Date()
      }).where(eq(workerApplications.id, req.params.id)).returning();
      if (!updatedApplication) {
        res.status(404).json({ error: "Application not found" });
        return;
      }
      if (status === "approved" && updatedApplication.email) {
        try {
          await db.update(users).set({
            onboardingStatus: "AGREEMENT_PENDING",
            updatedAt: /* @__PURE__ */ new Date()
          }).where(eq(users.email, updatedApplication.email));
        } catch (linkError) {
          console.error("Failed to update user onboarding status on approval:", linkError);
        }
      }
      res.json(updatedApplication);
    } catch (error) {
      console.error("Error updating application:", error);
      res.status(500).json({ error: "Failed to update application" });
    }
  });
  app2.delete("/api/admin/applications/:id", async (req, res) => {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith("Basic ")) {
        res.status(401).json({ error: "Authentication required" });
        return;
      }
      const base64Credentials = authHeader.split(" ")[1];
      const credentials = Buffer.from(base64Credentials, "base64").toString("utf-8");
      const [username, password] = credentials.split(":");
      if (username !== "wfconnect" || password !== "@2255Dundaswest") {
        res.status(401).json({ error: "Invalid credentials" });
        return;
      }
      const [deletedApplication] = await db.delete(workerApplications).where(eq(workerApplications.id, req.params.id)).returning();
      if (!deletedApplication) {
        res.status(404).json({ error: "Application not found" });
        return;
      }
      res.json({ success: true, message: "Application deleted successfully" });
    } catch (error) {
      console.error("Error deleting application:", error);
      res.status(500).json({ error: "Failed to delete application" });
    }
  });
  app2.get("/api/admin/applications/:id/agreement-pdf", async (req, res) => {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith("Basic ")) {
        res.status(401).json({ error: "Authentication required" });
        return;
      }
      const base64Credentials = authHeader.split(" ")[1];
      const credentials = Buffer.from(base64Credentials, "base64").toString("utf-8");
      const [username, password] = credentials.split(":");
      if (username !== "wfconnect" || password !== "@2255Dundaswest") {
        res.status(401).json({ error: "Invalid credentials" });
        return;
      }
      const [application] = await db.select().from(workerApplications).where(eq(workerApplications.id, req.params.id));
      if (!application) {
        res.status(404).json({ error: "Application not found" });
        return;
      }
      const PDFDocument = (await import("pdfkit")).default;
      const doc = new PDFDocument({ size: "LETTER", margins: { top: 50, bottom: 50, left: 60, right: 60 } });
      const fileName = `Subcontractor_Agreement_${application.fullName.replace(/\s+/g, "_")}.pdf`;
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Disposition", `attachment; filename="${fileName}"`);
      doc.pipe(res);
      const pageWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;
      doc.fontSize(18).font("Helvetica-Bold").text("SUBCONTRACTOR AGREEMENT", { align: "center" });
      doc.moveDown(0.3);
      doc.fontSize(11).font("Helvetica").text("1001328662 Ontario Inc.", { align: "center" });
      doc.moveDown(0.2);
      doc.fontSize(9).fillColor("#666666").text("1900 Dundas St. West, Mississauga L5K 1P9", { align: "center" });
      doc.fillColor("#000000");
      doc.moveDown(1);
      doc.moveTo(doc.page.margins.left, doc.y).lineTo(doc.page.margins.left + pageWidth, doc.y).stroke("#cccccc");
      doc.moveDown(1);
      doc.fontSize(13).font("Helvetica-Bold").text("1. Contractor Information");
      doc.moveDown(0.5);
      const addField = (label, value) => {
        doc.fontSize(9).font("Helvetica-Bold").fillColor("#555555").text(label, { continued: true });
        doc.font("Helvetica").fillColor("#000000").text(`  ${value || "N/A"}`);
        doc.moveDown(0.2);
      };
      addField("Full Name:", application.fullName);
      addField("Email:", application.email);
      addField("Phone:", application.phone);
      addField("Address:", `${application.address}, ${application.city}, ${application.province} ${application.postalCode}`);
      if (application.dateOfBirth) addField("Date of Birth:", application.dateOfBirth);
      const workStatusMap = {
        citizen: "Canadian Citizen",
        permanent_resident: "Permanent Resident",
        work_permit: "Work Permit Holder"
      };
      addField("Work Status:", workStatusMap[application.workStatus] || application.workStatus);
      doc.moveDown(0.5);
      doc.fontSize(13).font("Helvetica-Bold").fillColor("#000000").text("2. Scope of Work");
      doc.moveDown(0.5);
      let roles = [];
      try {
        roles = JSON.parse(application.preferredRoles);
      } catch (e) {
        roles = [application.preferredRoles];
      }
      addField("Preferred Roles:", roles.join(", "));
      let days = [];
      try {
        days = JSON.parse(application.availableDays);
      } catch (e) {
        days = [application.availableDays];
      }
      addField("Available Days:", days.join(", "));
      let shifts2 = [];
      try {
        shifts2 = JSON.parse(application.preferredShifts);
      } catch (e) {
        shifts2 = [application.preferredShifts];
      }
      addField("Preferred Shifts:", shifts2.join(", "));
      doc.moveDown(0.5);
      doc.fontSize(13).font("Helvetica-Bold").text("3. Terms and Conditions");
      doc.moveDown(0.5);
      doc.fontSize(9).font("Helvetica").text(
        'This Subcontractor Agreement (the "Agreement") is entered into by and between 1001328662 Ontario Inc. (the "Company"), located at 1900 Dundas St. West, Mississauga L5K 1P9, and the above-named individual (the "Contractor"). The Contractor agrees to perform services as an independent subcontractor, NOT as an employee of the Company.',
        { lineGap: 3 }
      );
      doc.moveDown(0.3);
      doc.text(
        "The Contractor acknowledges that they are responsible for their own tax obligations, including but not limited to income tax and HST/GST remittances. The Company will not withhold taxes, provide benefits, or make contributions to employment insurance or the Canada Pension Plan on behalf of the Contractor.",
        { lineGap: 3 }
      );
      doc.moveDown(0.3);
      doc.text(
        "The Contractor agrees to comply with all applicable laws, regulations, and client site rules while performing services. The Contractor understands that failure to comply may result in immediate termination of this Agreement.",
        { lineGap: 3 }
      );
      doc.moveDown(0.3);
      doc.text(
        "Either party may terminate this Agreement at any time with or without cause. The Contractor will be compensated for all services performed up to the date of termination.",
        { lineGap: 3 }
      );
      doc.moveDown(0.5);
      doc.fontSize(13).font("Helvetica-Bold").text("4. Time Tracking (TITO)");
      doc.moveDown(0.5);
      doc.fontSize(9).font("Helvetica").text(
        "The Contractor acknowledges that they must accurately submit Time-In/Time-Out (TITO) records through the designated platform. GPS verification may be required to confirm presence at work sites. Falsification of time records may result in immediate termination of this Agreement and forfeiture of payment for the affected period.",
        { lineGap: 3 }
      );
      doc.moveDown(0.5);
      doc.fontSize(13).font("Helvetica-Bold").text("5. Acknowledgments");
      doc.moveDown(0.5);
      const addCheckbox = (label, checked) => {
        const checkmark = checked ? "[X]" : "[ ]";
        doc.fontSize(9).font("Helvetica").text(`${checkmark}  ${label}`);
        doc.moveDown(0.2);
      };
      addCheckbox("TITO System Acknowledgment - I understand that I must accurately submit Time-In/Time-Out records", application.titoAcknowledgment ?? false);
      addCheckbox("Site Rules Agreement - I agree to adhere to client site-specific rules and regulations", application.siteRulesAcknowledgment ?? false);
      addCheckbox("Worker Agreement - I understand I will be working as an independent subcontractor, NOT as an employee", application.workerAgreementConsent ?? false);
      addCheckbox("Privacy Policy - I consent to the collection and use of my personal data (GDPR & PIPEDA compliant)", application.privacyConsent ?? false);
      addCheckbox("Marketing Communications (optional)", application.marketingConsent ?? false);
      doc.moveDown(0.5);
      doc.fontSize(13).font("Helvetica-Bold").text("6. Emergency Contact");
      doc.moveDown(0.5);
      addField("Name:", application.emergencyContactName);
      addField("Relationship:", application.emergencyContactRelationship);
      addField("Phone:", application.emergencyContactPhone);
      doc.moveDown(0.5);
      doc.moveTo(doc.page.margins.left, doc.y).lineTo(doc.page.margins.left + pageWidth, doc.y).stroke("#cccccc");
      doc.moveDown(1);
      doc.fontSize(13).font("Helvetica-Bold").text("7. Electronic Signature");
      doc.moveDown(0.5);
      doc.fontSize(9).font("Helvetica").text(
        "By signing below, the Contractor confirms that all information provided is true and accurate to the best of their knowledge. This electronic signature has the same legal effect as a handwritten signature.",
        { lineGap: 3 }
      );
      doc.moveDown(0.8);
      doc.fontSize(11).font("Helvetica-Bold").text("Signed:");
      doc.moveDown(0.3);
      doc.fontSize(14).font("Helvetica-Oblique").fillColor("#1a3a5c").text(application.signature, { underline: true });
      doc.fillColor("#000000");
      doc.moveDown(0.5);
      addField("Date Signed:", application.signatureDate);
      addField("Application Status:", application.status.toUpperCase());
      addField("Submitted:", new Date(application.createdAt).toLocaleDateString("en-CA", { year: "numeric", month: "long", day: "numeric" }));
      doc.moveDown(1.5);
      doc.moveTo(doc.page.margins.left, doc.y).lineTo(doc.page.margins.left + pageWidth, doc.y).stroke("#cccccc");
      doc.moveDown(0.5);
      doc.fontSize(8).font("Helvetica").fillColor("#999999").text(
        "This document was generated by 1001328662 Ontario Inc., 1900 Dundas St. West, Mississauga L5K 1P9. For questions, contact admin@wfconnect.org",
        { align: "center" }
      );
      doc.end();
    } catch (error) {
      console.error("Error generating agreement PDF:", error);
      res.status(500).json({ error: "Failed to generate PDF" });
    }
  });
  app2.get("/api/payment-profile", async (req, res) => {
    try {
      const userId = req.session?.userId;
      if (!userId) {
        res.status(401).json({ error: "Authentication required" });
        return;
      }
      const [profile] = await db.select().from(paymentProfiles).where(eq(paymentProfiles.workerUserId, userId));
      res.json(profile || null);
    } catch (error) {
      console.error("Error fetching payment profile:", error);
      res.status(500).json({ error: "Failed to fetch payment profile" });
    }
  });
  app2.put("/api/payment-profile", async (req, res) => {
    try {
      const userId = req.session?.userId;
      if (!userId) {
        res.status(401).json({ error: "Authentication required" });
        return;
      }
      const { bankName, bankInstitution, bankTransit, bankAccount, etransferEmail } = req.body;
      if (!bankName || !bankInstitution || !bankTransit || !bankAccount) {
        res.status(400).json({ error: "Bank details are required (bank name, institution, transit, account)" });
        return;
      }
      if (!etransferEmail) {
        res.status(400).json({ error: "E-Transfer email is required" });
        return;
      }
      const [existing] = await db.select().from(paymentProfiles).where(eq(paymentProfiles.workerUserId, userId));
      const paymentData = {
        paymentMethod: "both",
        bankName,
        bankInstitution,
        bankTransit,
        bankAccount,
        etransferEmail,
        updatedAt: /* @__PURE__ */ new Date()
      };
      if (existing) {
        const [updated] = await db.update(paymentProfiles).set(paymentData).where(eq(paymentProfiles.workerUserId, userId)).returning();
        res.json(updated);
      } else {
        const [created] = await db.insert(paymentProfiles).values({ workerUserId: userId, ...paymentData }).returning();
        res.json(created);
      }
    } catch (error) {
      console.error("Error saving payment profile:", error);
      res.status(500).json({ error: "Failed to save payment profile" });
    }
  });
  app2.post("/api/public/payment-info", async (req, res) => {
    try {
      const ip = getClientIp(req);
      if (!checkRateLimit(ip)) {
        res.status(429).json({ error: "Too many requests. Please try again later." });
        return;
      }
      const { email, bankName, bankInstitution, bankTransit, bankAccount, etransferEmail } = req.body;
      if (!email) {
        res.status(400).json({ error: "Email is required" });
        return;
      }
      if (!bankName || !bankInstitution || !bankTransit || !bankAccount) {
        res.status(400).json({ error: "Bank details are required (bank name, institution, transit, account)" });
        return;
      }
      if (!etransferEmail) {
        res.status(400).json({ error: "E-Transfer email is required" });
        return;
      }
      const paymentData = {
        paymentMethod: "both",
        bankName,
        bankInstitution,
        bankTransit,
        bankAccount,
        etransferEmail,
        updatedAt: /* @__PURE__ */ new Date()
      };
      const [user] = await db.select().from(users).where(eq(users.email, email.trim().toLowerCase()));
      if (!user) {
        const [application] = await db.select().from(workerApplications).where(eq(workerApplications.email, email.trim().toLowerCase()));
        if (application) {
          await db.update(workerApplications).set(paymentData).where(eq(workerApplications.id, application.id));
          res.json({ ok: true, message: "Payment information updated for your application" });
          return;
        }
        res.status(404).json({ error: "No account or application found with this email. Please apply first at /apply" });
        return;
      }
      const [existing] = await db.select().from(paymentProfiles).where(eq(paymentProfiles.workerUserId, user.id));
      if (existing) {
        await db.update(paymentProfiles).set(paymentData).where(eq(paymentProfiles.workerUserId, user.id));
      } else {
        await db.insert(paymentProfiles).values({ workerUserId: user.id, ...paymentData });
      }
      res.json({ ok: true, message: "Payment information saved successfully" });
    } catch (error) {
      console.error("Error saving public payment info:", error);
      res.status(500).json({ error: "Failed to save payment information. Please try again." });
    }
  });
  app2.get("/api/admin/payment-profiles", async (req, res) => {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith("Basic ")) {
        res.status(401).json({ error: "Authentication required" });
        return;
      }
      const base64Credentials = authHeader.split(" ")[1];
      const credentials = Buffer.from(base64Credentials, "base64").toString("utf-8");
      const [username, password] = credentials.split(":");
      if (username !== "wfconnect" || password !== "@2255Dundaswest") {
        res.status(401).json({ error: "Invalid credentials" });
        return;
      }
      const profiles = await db.select({
        id: paymentProfiles.id,
        workerUserId: paymentProfiles.workerUserId,
        paymentMethod: paymentProfiles.paymentMethod,
        bankName: paymentProfiles.bankName,
        bankInstitution: paymentProfiles.bankInstitution,
        bankTransit: paymentProfiles.bankTransit,
        bankAccount: paymentProfiles.bankAccount,
        etransferEmail: paymentProfiles.etransferEmail,
        workerName: users.fullName,
        workerEmail: users.email,
        createdAt: paymentProfiles.createdAt,
        updatedAt: paymentProfiles.updatedAt
      }).from(paymentProfiles).leftJoin(users, eq(paymentProfiles.workerUserId, users.id)).orderBy(desc(paymentProfiles.updatedAt));
      res.json(profiles);
    } catch (error) {
      console.error("Error fetching payment profiles:", error);
      res.status(500).json({ error: "Failed to fetch payment profiles" });
    }
  });
  app2.get("/api/workplaces", checkRoles("admin", "hr"), async (_req, res) => {
    try {
      const allWorkplaces = await db.select().from(workplaces).orderBy(desc(workplaces.createdAt));
      res.json(allWorkplaces);
    } catch (error) {
      console.error("Error fetching workplaces:", error);
      res.status(500).json({ error: "Failed to fetch workplaces" });
    }
  });
  app2.get("/api/workplaces/:id", async (req, res) => {
    try {
      const userId = req.headers["x-user-id"];
      const role = req.headers["x-user-role"];
      if (!userId) {
        res.status(401).json({ error: "Authentication required" });
        return;
      }
      const [workplace] = await db.select().from(workplaces).where(eq(workplaces.id, req.params.id));
      if (!workplace) {
        res.status(404).json({ error: "Workplace not found" });
        return;
      }
      if (role === "worker" || role === "client") {
        const [assignment] = await db.select().from(workplaceAssignments).where(and(
          eq(workplaceAssignments.workplaceId, req.params.id),
          eq(workplaceAssignments.workerUserId, userId)
        ));
        const [assignedShift] = await db.select({ id: shifts.id }).from(shifts).where(and(
          eq(shifts.workplaceId, req.params.id),
          eq(shifts.workerUserId, userId)
        )).limit(1);
        if (!assignment && !assignedShift) {
          res.json({
            id: workplace.id,
            name: workplace.name,
            latitude: workplace.latitude,
            longitude: workplace.longitude,
            geofenceRadiusMeters: workplace.geofenceRadiusMeters
          });
          return;
        }
      }
      res.json(workplace);
    } catch (error) {
      console.error("Error fetching workplace:", error);
      res.status(500).json({ error: "Failed to fetch workplace" });
    }
  });
  app2.post("/api/workplaces", checkRoles("admin", "hr"), async (req, res) => {
    try {
      const { name, addressLine1, city, province, postalCode, country, latitude, longitude, geofenceRadiusMeters, isActive } = req.body;
      if (!name || name.trim().length < 2) {
        res.status(400).json({ error: "Name is required (minimum 2 characters)" });
        return;
      }
      const [newWorkplace] = await db.insert(workplaces).values({
        name: name.trim(),
        addressLine1: addressLine1?.trim() || null,
        city: city?.trim() || null,
        province: province?.trim() || null,
        postalCode: postalCode?.trim() || null,
        country: country?.trim() || "Canada",
        latitude: latitude || null,
        longitude: longitude || null,
        geofenceRadiusMeters: geofenceRadiusMeters || 150,
        isActive: isActive !== false
      }).returning();
      res.json(newWorkplace);
      broadcast({ type: "created", entity: "workplace" });
    } catch (error) {
      console.error("Error creating workplace:", error);
      res.status(500).json({ error: "Failed to create workplace" });
    }
  });
  app2.put("/api/workplaces/:id", checkRoles("admin", "hr"), async (req, res) => {
    try {
      const { name, addressLine1, city, province, postalCode, country, latitude, longitude, geofenceRadiusMeters, isActive } = req.body;
      const updateData = { updatedAt: /* @__PURE__ */ new Date() };
      if (name !== void 0) updateData.name = name.trim();
      if (addressLine1 !== void 0) updateData.addressLine1 = addressLine1?.trim() || null;
      if (city !== void 0) updateData.city = city?.trim() || null;
      if (province !== void 0) updateData.province = province?.trim() || null;
      if (postalCode !== void 0) updateData.postalCode = postalCode?.trim() || null;
      if (country !== void 0) updateData.country = country?.trim() || "Canada";
      if (latitude !== void 0) updateData.latitude = latitude;
      if (longitude !== void 0) updateData.longitude = longitude;
      if (geofenceRadiusMeters !== void 0) updateData.geofenceRadiusMeters = geofenceRadiusMeters;
      if (isActive !== void 0) updateData.isActive = isActive;
      const [updatedWorkplace] = await db.update(workplaces).set(updateData).where(eq(workplaces.id, req.params.id)).returning();
      if (!updatedWorkplace) {
        res.status(404).json({ error: "Workplace not found" });
        return;
      }
      res.json(updatedWorkplace);
      broadcast({ type: "updated", entity: "workplace", id: req.params.id });
    } catch (error) {
      console.error("Error updating workplace:", error);
      res.status(500).json({ error: "Failed to update workplace" });
    }
  });
  app2.patch("/api/workplaces/:id/toggle-active", checkRoles("admin", "hr"), async (req, res) => {
    try {
      const [workplace] = await db.select().from(workplaces).where(eq(workplaces.id, req.params.id));
      if (!workplace) {
        res.status(404).json({ error: "Workplace not found" });
        return;
      }
      const [updatedWorkplace] = await db.update(workplaces).set({ isActive: !workplace.isActive, updatedAt: /* @__PURE__ */ new Date() }).where(eq(workplaces.id, req.params.id)).returning();
      res.json(updatedWorkplace);
      broadcast({ type: "updated", entity: "workplace", id: req.params.id });
    } catch (error) {
      console.error("Error toggling workplace status:", error);
      res.status(500).json({ error: "Failed to toggle workplace status" });
    }
  });
  app2.delete("/api/workplaces/:id", checkRoles("admin"), async (req, res) => {
    try {
      const workplaceId = req.params.id;
      const [workplace] = await db.select().from(workplaces).where(eq(workplaces.id, workplaceId));
      if (!workplace) {
        res.status(404).json({ error: "Workplace not found" });
        return;
      }
      const workplaceShifts = await db.select({ id: shifts.id }).from(shifts).where(eq(shifts.workplaceId, workplaceId));
      if (workplaceShifts.length > 0) {
        const shiftIds = workplaceShifts.map((s) => s.id);
        await db.delete(shiftOffers).where(inArray(shiftOffers.shiftId, shiftIds));
        await db.delete(shiftCheckins).where(inArray(shiftCheckins.shiftId, shiftIds));
        await db.delete(sentReminders).where(inArray(sentReminders.shiftId, shiftIds));
      }
      await db.delete(shifts).where(eq(shifts.workplaceId, workplaceId));
      await db.delete(shiftSeries).where(eq(shiftSeries.workplaceId, workplaceId));
      await db.delete(shiftRequests).where(eq(shiftRequests.workplaceId, workplaceId));
      await db.delete(workplaceAssignments).where(eq(workplaceAssignments.workplaceId, workplaceId));
      await db.delete(titoLogs).where(eq(titoLogs.workplaceId, workplaceId));
      await db.update(timesheetEntries).set({ workplaceId: null }).where(eq(timesheetEntries.workplaceId, workplaceId));
      await db.update(exportAuditLogs).set({ workplaceId: null }).where(eq(exportAuditLogs.workplaceId, workplaceId));
      await db.delete(workplaces).where(eq(workplaces.id, workplaceId));
      broadcast({ type: "deleted", entity: "workplace", id: workplaceId });
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting workplace:", error);
      res.status(500).json({ error: "Failed to delete workplace" });
    }
  });
  app2.get("/api/workplaces/:id/workers", checkRoles("admin", "hr"), async (req, res) => {
    try {
      const assignments = await db.select({
        id: workplaceAssignments.id,
        workplaceId: workplaceAssignments.workplaceId,
        workerUserId: workplaceAssignments.workerUserId,
        status: workplaceAssignments.status,
        invitedAt: workplaceAssignments.invitedAt,
        acceptedAt: workplaceAssignments.acceptedAt,
        notes: workplaceAssignments.notes,
        createdAt: workplaceAssignments.createdAt,
        workerName: users.fullName,
        workerEmail: users.email,
        workerRoles: users.workerRoles
      }).from(workplaceAssignments).leftJoin(users, eq(workplaceAssignments.workerUserId, users.id)).where(eq(workplaceAssignments.workplaceId, req.params.id)).orderBy(desc(workplaceAssignments.createdAt));
      res.json(assignments);
    } catch (error) {
      console.error("Error fetching workplace workers:", error);
      res.status(500).json({ error: "Failed to fetch workplace workers" });
    }
  });
  app2.post("/api/workplaces/:id/invite-worker", checkRoles("admin", "hr"), async (req, res) => {
    try {
      const { workerUserId, status, notes } = req.body;
      const invitedByUserId = req.headers["x-user-id"];
      if (!workerUserId) {
        res.status(400).json({ error: "workerUserId is required" });
        return;
      }
      const [worker] = await db.select().from(users).where(and(eq(users.id, workerUserId), eq(users.role, "worker")));
      if (!worker) {
        res.status(404).json({ error: "Worker not found" });
        return;
      }
      const [workplace] = await db.select().from(workplaces).where(eq(workplaces.id, req.params.id));
      if (!workplace) {
        res.status(404).json({ error: "Workplace not found" });
        return;
      }
      const existing = await db.select().from(workplaceAssignments).where(and(
        eq(workplaceAssignments.workplaceId, req.params.id),
        eq(workplaceAssignments.workerUserId, workerUserId)
      )).limit(1);
      if (existing.length > 0) {
        if (existing[0].status === "removed") {
          const [updated] = await db.update(workplaceAssignments).set({ status: status || "active", notes, updatedAt: /* @__PURE__ */ new Date() }).where(eq(workplaceAssignments.id, existing[0].id)).returning();
          res.json(updated);
          return;
        }
        res.status(400).json({ error: "Worker is already assigned to this workplace" });
        return;
      }
      const [newAssignment] = await db.insert(workplaceAssignments).values({
        workplaceId: req.params.id,
        workerUserId,
        status: status || "active",
        invitedByUserId: invitedByUserId || null,
        notes: notes || null
      }).returning();
      res.json(newAssignment);
      broadcast({ type: "created", entity: "assignment", id: newAssignment.id, data: { workplaceId: req.params.id, workerUserId } });
    } catch (error) {
      console.error("Error inviting worker:", error);
      res.status(500).json({ error: "Failed to invite worker" });
    }
  });
  app2.patch("/api/workplace-assignments/:id", checkRoles("admin", "hr"), async (req, res) => {
    try {
      const { status, notes } = req.body;
      const updateData = { updatedAt: /* @__PURE__ */ new Date() };
      if (status !== void 0) updateData.status = status;
      if (notes !== void 0) updateData.notes = notes;
      if (status === "active" && !req.body.acceptedAt) {
        updateData.acceptedAt = /* @__PURE__ */ new Date();
      }
      const [updatedAssignment] = await db.update(workplaceAssignments).set(updateData).where(eq(workplaceAssignments.id, req.params.id)).returning();
      if (!updatedAssignment) {
        res.status(404).json({ error: "Assignment not found" });
        return;
      }
      res.json(updatedAssignment);
      broadcast({ type: "updated", entity: "assignment", id: req.params.id });
    } catch (error) {
      console.error("Error updating assignment:", error);
      res.status(500).json({ error: "Failed to update assignment" });
    }
  });
  app2.delete("/api/workplace-assignments/:id", checkRoles("admin"), async (req, res) => {
    try {
      const [deleted] = await db.delete(workplaceAssignments).where(eq(workplaceAssignments.id, req.params.id)).returning();
      if (!deleted) {
        res.status(404).json({ error: "Assignment not found" });
        return;
      }
      res.json({ message: "Assignment deleted successfully" });
    } catch (error) {
      console.error("Error deleting assignment:", error);
      res.status(500).json({ error: "Failed to delete assignment" });
    }
  });
  app2.get("/api/me/workplaces", async (req, res) => {
    try {
      const userId = req.headers["x-user-id"];
      const role = req.headers["x-user-role"];
      if (!userId) {
        res.status(401).json({ error: "Authentication required" });
        return;
      }
      if (role !== "worker") {
        res.status(403).json({ error: "Only workers can access this endpoint" });
        return;
      }
      const myWorkplaces = await db.select({
        assignmentId: workplaceAssignments.id,
        status: workplaceAssignments.status,
        invitedAt: workplaceAssignments.invitedAt,
        acceptedAt: workplaceAssignments.acceptedAt,
        workplaceId: workplaces.id,
        workplaceName: workplaces.name,
        addressLine1: workplaces.addressLine1,
        city: workplaces.city,
        province: workplaces.province,
        postalCode: workplaces.postalCode,
        latitude: workplaces.latitude,
        longitude: workplaces.longitude,
        geofenceRadiusMeters: workplaces.geofenceRadiusMeters,
        isActive: workplaces.isActive
      }).from(workplaceAssignments).leftJoin(workplaces, eq(workplaceAssignments.workplaceId, workplaces.id)).where(and(
        eq(workplaceAssignments.workerUserId, userId),
        or(eq(workplaceAssignments.status, "active"), eq(workplaceAssignments.status, "invited"))
      )).orderBy(desc(workplaceAssignments.invitedAt));
      res.json(myWorkplaces);
    } catch (error) {
      console.error("Error fetching worker workplaces:", error);
      res.status(500).json({ error: "Failed to fetch workplaces" });
    }
  });
  app2.post("/api/tito/time-in", async (req, res) => {
    try {
      const userId = req.headers["x-user-id"];
      const role = req.headers["x-user-role"];
      if (!userId) {
        res.status(401).json({ error: "Authentication required" });
        return;
      }
      if (role !== "worker") {
        res.status(403).json({ error: "Only workers can clock in" });
        return;
      }
      const { workplaceId, gpsLat, gpsLng, shiftId } = req.body;
      if (!workplaceId) {
        res.status(400).json({ error: "workplaceId is required" });
        return;
      }
      const existingConditions = [
        eq(titoLogs.workerId, userId),
        eq(titoLogs.workplaceId, workplaceId),
        isNull(titoLogs.timeOut)
      ];
      if (shiftId) {
        existingConditions.push(eq(titoLogs.shiftId, shiftId));
      }
      const existingLogs = await db.select().from(titoLogs).where(and(...existingConditions)).limit(1);
      if (existingLogs.length > 0) {
        const existing = existingLogs[0];
        console.log(`[TITO] Idempotent clock-in: worker ${userId} already clocked in (titoLogId=${existing.id})`);
        res.json({
          success: true,
          message: "Already clocked in",
          titoLogId: existing.id,
          timeIn: existing.timeIn,
          distance: existing.timeInDistanceMeters ? Math.round(existing.timeInDistanceMeters) : null,
          gpsVerified: existing.timeInGpsVerified,
          alreadyClockedIn: true
        });
        return;
      }
      const [workplace] = await db.select().from(workplaces).where(eq(workplaces.id, workplaceId));
      if (!workplace) {
        res.status(404).json({ error: "Workplace not found", errorCode: "WORKPLACE_NOT_FOUND" });
        return;
      }
      if (!workplace.isActive) {
        res.status(400).json({ error: "Workplace is not active", errorCode: "WORKPLACE_INACTIVE" });
        return;
      }
      const assignment = await db.select().from(workplaceAssignments).where(and(
        eq(workplaceAssignments.workplaceId, workplaceId),
        eq(workplaceAssignments.workerUserId, userId),
        eq(workplaceAssignments.status, "active")
      )).limit(1);
      if (assignment.length === 0) {
        res.status(403).json({ error: "You are not assigned to this workplace", errorCode: "NOT_ASSIGNED" });
        return;
      }
      if (shiftId) {
        const [shiftRow] = await db.select().from(shifts).where(eq(shifts.id, shiftId));
        if (!shiftRow) {
          res.status(404).json({ error: "Shift not found", errorCode: "SHIFT_NOT_FOUND" });
          return;
        }
        const isAssignedWorker = shiftRow.workerUserId === userId;
        const [acceptedOffer] = isAssignedWorker ? [{ id: "assigned" }] : await db.select({ id: shiftOffers.id }).from(shiftOffers).where(and(
          eq(shiftOffers.shiftId, shiftId),
          eq(shiftOffers.workerId, userId),
          eq(shiftOffers.status, "accepted")
        )).limit(1);
        if (!isAssignedWorker && !acceptedOffer) {
          res.status(403).json({
            error: "You must have an accepted shift offer to clock in for this shift",
            errorCode: "NO_ACCEPTED_OFFER"
          });
          return;
        }
      } else {
        const todayStr = (/* @__PURE__ */ new Date()).toLocaleDateString("en-CA", { timeZone: "America/Toronto" });
        const todayShifts = await db.select({ id: shifts.id }).from(shifts).where(and(
          eq(shifts.workplaceId, workplaceId),
          eq(shifts.date, todayStr),
          or(
            eq(shifts.workerUserId, userId),
            sql2`EXISTS (SELECT 1 FROM shift_offers WHERE shift_offers.shift_id = shifts.id AND shift_offers.worker_id = ${userId} AND shift_offers.status = 'accepted')`
          )
        )).limit(1);
        if (todayShifts.length === 0) {
          res.status(403).json({
            error: "No shift scheduled for you today at this workplace. Accept a shift offer first.",
            errorCode: "NO_SHIFT_TODAY"
          });
          return;
        }
      }
      if (workplace.latitude === null || workplace.longitude === null) {
        res.status(400).json({ error: "Workplace coordinates not configured. Contact admin." });
        return;
      }
      if (gpsLat === void 0 || gpsLng === void 0) {
        res.status(400).json({ error: "Location permission required for TITO. Please enable GPS.", errorCode: "NO_GPS" });
        return;
      }
      const distance = haversineDistance(gpsLat, gpsLng, workplace.latitude, workplace.longitude);
      const radius = workplace.geofenceRadiusMeters || 150;
      const isWithinRadius = distance <= radius;
      if (!isWithinRadius) {
        const [titoLog2] = await db.insert(titoLogs).values({
          workerId: userId,
          workplaceId,
          shiftId: shiftId || null,
          timeIn: /* @__PURE__ */ new Date(),
          timeInGpsLat: gpsLat,
          timeInGpsLng: gpsLng,
          timeInDistanceMeters: distance,
          timeInGpsVerified: false,
          timeInGpsFailureReason: `Outside geofence: ${Math.round(distance)}m from workplace (max ${radius}m)`,
          status: "pending"
        }).returning();
        res.status(400).json({
          error: `You are not within the required GPS radius of the workplace. You are ${Math.round(distance)}m away, but must be within ${radius}m.`,
          errorCode: "TOO_FAR",
          distance: Math.round(distance),
          maxRadius: radius,
          titoLogId: titoLog2.id,
          gpsVerified: false
        });
        return;
      }
      const [titoLog] = await db.insert(titoLogs).values({
        workerId: userId,
        workplaceId,
        shiftId: shiftId || null,
        timeIn: /* @__PURE__ */ new Date(),
        timeInGpsLat: gpsLat,
        timeInGpsLng: gpsLng,
        timeInDistanceMeters: distance,
        timeInGpsVerified: true,
        status: "pending"
      }).returning();
      await db.insert(auditLog).values({
        userId,
        action: "CLOCK_IN",
        entityType: "tito_log",
        entityId: titoLog.id,
        details: JSON.stringify({ workplaceId, shiftId, distance: Math.round(distance), gpsVerified: true })
      });
      res.json({
        success: true,
        message: "Successfully clocked in",
        titoLogId: titoLog.id,
        timeIn: titoLog.timeIn,
        distance: Math.round(distance),
        gpsVerified: true
      });
      try {
        const [worker] = await db.select({ fullName: users.fullName }).from(users).where(eq(users.id, userId));
        const workerName = worker?.fullName || "Worker";
        const nowToronto = new Date((/* @__PURE__ */ new Date()).toLocaleString("en-US", { timeZone: "America/Toronto" }));
        const currentHour = nowToronto.getHours();
        const hrAdmins = await db.select({ id: users.id }).from(users).where(
          and(inArray(users.role, ["admin", "hr"]), eq(users.isActive, true))
        );
        const hrAdminIds = hrAdmins.map((u) => u.id);
        let isLate = false;
        if (shiftId) {
          const [shiftRow] = await db.select({ startTime: shifts.startTime, date: shifts.date }).from(shifts).where(eq(shifts.id, shiftId));
          if (shiftRow?.startTime && shiftRow?.date) {
            const [h, m] = shiftRow.startTime.split(":").map(Number);
            const shiftStart = /* @__PURE__ */ new Date(shiftRow.date + "T00:00:00");
            shiftStart.setHours(h, m, 0, 0);
            const lateMinutes = Math.round((Date.now() - shiftStart.getTime()) / 6e4);
            if (lateMinutes > 10) {
              isLate = true;
              await db.update(titoLogs).set({ flaggedLate: true, lateMinutes }).where(eq(titoLogs.id, titoLog.id));
              const lateMsg = `${workerName} clocked in ${lateMinutes} min late for shift at ${workplace.name}`;
              await db.insert(appNotifications).values({
                userId,
                type: "late_clock_in",
                title: "Late Clock-In Recorded",
                body: `You clocked in ${lateMinutes} minutes after your shift start time at ${workplace.name}.`
              });
              sendPushNotifications([userId], "Late Clock-In", `You clocked in ${lateMinutes} min late at ${workplace.name}.`);
              for (const uid of hrAdminIds) {
                await db.insert(appNotifications).values({
                  userId: uid,
                  type: "late_clock_in",
                  title: "Late Clock-In Alert",
                  body: lateMsg
                });
              }
              if (hrAdminIds.length > 0) {
                sendPushNotifications(hrAdminIds, "Late Clock-In Alert", lateMsg);
              }
              await db.insert(auditLog).values({
                userId,
                action: "LATE_CLOCKIN",
                entityType: "tito_log",
                entityId: titoLog.id,
                details: JSON.stringify({ lateMinutes, shiftId, workplaceId, workerName })
              });
            }
          }
        }
        if (currentHour < 5 || currentHour >= 23) {
          const unusualMsg = `${workerName} clocked in at unusual hours (${nowToronto.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}) at ${workplace.name}`;
          if (!isLate) {
            await db.insert(appNotifications).values({
              userId,
              type: "unusual_hours",
              title: "Unusual Hours Clock-In",
              body: `You clocked in outside normal hours at ${workplace.name}.`
            });
            sendPushNotifications([userId], "Unusual Hours", `You clocked in at an unusual time at ${workplace.name}.`);
          }
          for (const uid of hrAdminIds) {
            await db.insert(appNotifications).values({
              userId: uid,
              type: "unusual_hours",
              title: "Unusual Hours Alert",
              body: unusualMsg
            });
          }
          if (hrAdminIds.length > 0) {
            sendPushNotifications(hrAdminIds, "Unusual Hours Alert", unusualMsg);
          }
        }
      } catch (notifErr) {
        console.error("Late/unusual notification error (non-blocking):", notifErr);
      }
    } catch (error) {
      console.error("Error clocking in:", error);
      res.status(500).json({ error: "Failed to clock in" });
    }
  });
  app2.post("/api/tito/:id/late-reason", async (req, res) => {
    try {
      const userId = req.headers["x-user-id"];
      const titoLogId = req.params.id;
      const { lateReason, lateNote } = req.body;
      if (!lateReason) {
        res.status(400).json({ error: "lateReason is required" });
        return;
      }
      const [log2] = await db.select().from(titoLogs).where(eq(titoLogs.id, titoLogId));
      if (!log2) {
        res.status(404).json({ error: "TITO log not found" });
        return;
      }
      if (log2.workerId !== userId) {
        res.status(403).json({ error: "Not your TITO log" });
        return;
      }
      await db.update(titoLogs).set({ lateReason, lateNote: lateNote || null, updatedAt: /* @__PURE__ */ new Date() }).where(eq(titoLogs.id, titoLogId));
      res.json({ success: true });
    } catch (error) {
      console.error("Error updating late reason:", error);
      res.status(500).json({ error: "Failed to update late reason" });
    }
  });
  app2.post("/api/tito/time-out", async (req, res) => {
    try {
      const userId = req.headers["x-user-id"];
      const role = req.headers["x-user-role"];
      if (!userId) {
        res.status(401).json({ error: "Authentication required" });
        return;
      }
      if (role !== "worker") {
        res.status(403).json({ error: "Only workers can clock out" });
        return;
      }
      const { titoLogId, gpsLat, gpsLng } = req.body;
      if (!titoLogId) {
        res.status(400).json({ error: "titoLogId is required" });
        return;
      }
      const [titoLog] = await db.select().from(titoLogs).where(eq(titoLogs.id, titoLogId));
      if (!titoLog) {
        res.status(404).json({ error: "TITO record not found" });
        return;
      }
      if (titoLog.workerId !== userId) {
        res.status(403).json({ error: "You can only clock out of your own shift" });
        return;
      }
      if (titoLog.timeOut) {
        console.log(`[TITO] Idempotent clock-out: worker ${userId} already clocked out (titoLogId=${titoLog.id})`);
        const totalMs2 = new Date(titoLog.timeOut).getTime() - new Date(titoLog.timeIn).getTime();
        const totalHours2 = Math.max(0, parseFloat((totalMs2 / 36e5).toFixed(2)));
        res.json({
          success: true,
          message: "Already clocked out",
          titoLogId: titoLog.id,
          timeIn: titoLog.timeIn,
          timeOut: titoLog.timeOut,
          totalHours: totalHours2,
          gpsVerified: titoLog.timeOutGpsVerified,
          flaggedForReview: titoLog.status === "flagged",
          alreadyClockedOut: true
        });
        return;
      }
      if (!titoLog.timeIn) {
        res.status(400).json({ error: "Cannot clock out without a clock-in time" });
        return;
      }
      const [workplace] = titoLog.workplaceId ? await db.select().from(workplaces).where(eq(workplaces.id, titoLog.workplaceId)) : [null];
      const hasGps = gpsLat != null && gpsLng != null && (gpsLat !== 0 || gpsLng !== 0);
      const hasWorkplaceCoords = workplace?.latitude != null && workplace?.longitude != null;
      let distance = null;
      let isWithinRadius = false;
      if (hasGps && hasWorkplaceCoords) {
        distance = haversineDistance(gpsLat, gpsLng, workplace.latitude, workplace.longitude);
        const radius = workplace.geofenceRadiusMeters || 150;
        isWithinRadius = distance <= radius;
      }
      const isFlagged = hasGps && hasWorkplaceCoords && !isWithinRadius;
      const clockOutTime = /* @__PURE__ */ new Date();
      const [updated] = await db.update(titoLogs).set({
        timeOut: clockOutTime,
        timeOutGpsLat: hasGps ? gpsLat : null,
        timeOutGpsLng: hasGps ? gpsLng : null,
        timeOutDistanceMeters: distance,
        timeOutGpsVerified: hasGps ? isWithinRadius : false,
        timeOutGpsFailureReason: !hasGps ? "GPS unavailable at clock-out" : isFlagged ? `Outside geofence: ${Math.round(distance)}m from workplace (max ${workplace.geofenceRadiusMeters || 150}m)` : null,
        status: isFlagged || !hasGps ? "flagged" : void 0,
        updatedAt: /* @__PURE__ */ new Date()
      }).where(eq(titoLogs.id, titoLogId)).returning();
      const totalMs = clockOutTime.getTime() - new Date(titoLog.timeIn).getTime();
      const totalHours = Math.max(0, parseFloat((totalMs / 36e5).toFixed(2)));
      let timesheetEntryCreated = false;
      try {
        const clockInDate = new Date(titoLog.timeIn);
        const dateLocalStr = clockInDate.toLocaleDateString("en-CA", { timeZone: "America/Toronto" });
        const payPeriod = getCurrentPayPeriod(/* @__PURE__ */ new Date(dateLocalStr + "T12:00:00"));
        if (payPeriod && totalHours > 0) {
          const [existingTimesheet] = await db.select().from(timesheets).where(and(
            eq(timesheets.workerUserId, userId),
            eq(timesheets.periodYear, payPeriod.year),
            eq(timesheets.periodNumber, payPeriod.periodNumber)
          ));
          let timesheetId;
          if (existingTimesheet) {
            timesheetId = existingTimesheet.id;
          } else {
            const [newTimesheet] = await db.insert(timesheets).values({
              workerUserId: userId,
              periodYear: payPeriod.year,
              periodNumber: payPeriod.periodNumber,
              status: "draft"
            }).returning();
            timesheetId = newTimesheet.id;
          }
          const defaultPayRate = 18;
          const amount = parseFloat((totalHours * defaultPayRate).toFixed(2));
          const existingEntry = await db.select().from(timesheetEntries).where(eq(timesheetEntries.titoLogId, titoLogId)).limit(1);
          if (existingEntry.length === 0) {
            await db.insert(timesheetEntries).values({
              timesheetId,
              workplaceId: titoLog.workplaceId || null,
              titoLogId,
              dateLocal: dateLocalStr,
              timeInUtc: titoLog.timeIn,
              timeOutUtc: clockOutTime,
              hours: totalHours.toString(),
              payRate: defaultPayRate.toString(),
              amount: amount.toString(),
              notes: isFlagged ? "Flagged: clock-out outside geofence" : !hasGps ? "GPS unavailable at clock-out" : null
            });
            timesheetEntryCreated = true;
            const allEntries = await db.select({
              hours: timesheetEntries.hours,
              amount: timesheetEntries.amount
            }).from(timesheetEntries).where(eq(timesheetEntries.timesheetId, timesheetId));
            const totalTimesheetHours = allEntries.reduce((sum, e) => sum + parseFloat(e.hours), 0);
            const totalTimesheetPay = allEntries.reduce((sum, e) => sum + parseFloat(e.amount), 0);
            await db.update(timesheets).set({
              totalHours: totalTimesheetHours.toFixed(2),
              totalPay: totalTimesheetPay.toFixed(2),
              updatedAt: /* @__PURE__ */ new Date()
            }).where(eq(timesheets.id, timesheetId));
            console.log(`[TIMESHEET] Auto-created entry: worker=${userId}, titoLog=${titoLogId}, hours=${totalHours}, amount=${amount}, period=${payPeriod.year}-${payPeriod.periodNumber}`);
          }
        } else {
          console.warn(`[TIMESHEET] No pay period found for date ${dateLocalStr} or zero hours (${totalHours}h). Skipping auto-timesheet.`);
        }
      } catch (tsError) {
        console.error(`[TIMESHEET] Failed to auto-create timesheet entry for titoLog ${titoLogId}:`, tsError);
      }
      await db.insert(auditLog).values({
        userId,
        action: "CLOCK_OUT",
        entityType: "tito_log",
        entityId: titoLogId,
        details: JSON.stringify({
          workplaceId: titoLog.workplaceId,
          shiftId: titoLog.shiftId,
          timeIn: titoLog.timeIn,
          timeOut: clockOutTime,
          totalHours,
          gpsVerified: isWithinRadius,
          flagged: isFlagged || !hasGps,
          timesheetEntryCreated
        })
      });
      res.json({
        success: true,
        message: isWithinRadius ? "Successfully clocked out" : "Clocked out (flagged for admin review)",
        titoLogId: updated.id,
        timeIn: updated.timeIn,
        timeOut: updated.timeOut,
        totalHours,
        distance: distance != null ? Math.round(distance) : null,
        gpsVerified: isWithinRadius,
        flaggedForReview: isFlagged || !hasGps,
        timesheetEntryCreated
      });
      try {
        const [worker] = await db.select({ fullName: users.fullName }).from(users).where(eq(users.id, userId));
        const workerName = worker?.fullName || "Worker";
        const nowToronto = new Date((/* @__PURE__ */ new Date()).toLocaleString("en-US", { timeZone: "America/Toronto" }));
        const currentHour = nowToronto.getHours();
        const wpName = workplace?.name || "work site";
        if (currentHour < 5 || currentHour >= 23) {
          const hrAdmins = await db.select({ id: users.id }).from(users).where(
            and(inArray(users.role, ["admin", "hr"]), eq(users.isActive, true))
          );
          const hrAdminIds = hrAdmins.map((u) => u.id);
          const unusualMsg = `${workerName} clocked out at unusual hours (${nowToronto.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}) at ${wpName}`;
          await db.insert(appNotifications).values({
            userId,
            type: "unusual_hours",
            title: "Unusual Hours Clock-Out",
            body: `You clocked out outside normal hours at ${wpName}.`
          });
          sendPushNotifications([userId], "Unusual Hours", `You clocked out at an unusual time at ${wpName}.`);
          for (const uid of hrAdminIds) {
            await db.insert(appNotifications).values({
              userId: uid,
              type: "unusual_hours",
              title: "Unusual Hours Alert",
              body: unusualMsg
            });
          }
          if (hrAdminIds.length > 0) {
            sendPushNotifications(hrAdminIds, "Unusual Hours Alert", unusualMsg);
          }
        }
        if (isFlagged && distance != null) {
          const hrAdmins2 = await db.select({ id: users.id }).from(users).where(
            and(inArray(users.role, ["admin", "hr"]), eq(users.isActive, true))
          );
          const hrAdminIds2 = hrAdmins2.map((u) => u.id);
          const flaggedMsg = `${workerName} clocked out ${Math.round(distance)}m away from ${wpName} (max ${workplace?.geofenceRadiusMeters || 150}m). Flagged for review.`;
          for (const uid of hrAdminIds2) {
            await db.insert(appNotifications).values({
              userId: uid,
              type: "flagged_clock_out",
              title: "Flagged Clock-Out",
              body: flaggedMsg
            });
          }
          if (hrAdminIds2.length > 0) {
            sendPushNotifications(hrAdminIds2, "Flagged Clock-Out", flaggedMsg);
          }
        }
      } catch (notifErr) {
        console.error("Clock-out notification error (non-blocking):", notifErr);
      }
    } catch (error) {
      console.error("Error clocking out:", error);
      res.status(500).json({ error: "Failed to clock out" });
    }
  });
  app2.get("/api/tito/my-logs", async (req, res) => {
    try {
      const userId = req.headers["x-user-id"];
      const role = req.headers["x-user-role"];
      if (!userId) {
        res.status(401).json({ error: "Authentication required" });
        return;
      }
      const isAdmin = role === "admin" || role === "hr" || role === "client";
      const baseSelect = {
        id: titoLogs.id,
        workerId: titoLogs.workerId,
        workplaceId: titoLogs.workplaceId,
        shiftId: titoLogs.shiftId,
        timeIn: titoLogs.timeIn,
        timeOut: titoLogs.timeOut,
        timeInGpsVerified: titoLogs.timeInGpsVerified,
        timeOutGpsVerified: titoLogs.timeOutGpsVerified,
        timeInDistanceMeters: titoLogs.timeInDistanceMeters,
        timeOutDistanceMeters: titoLogs.timeOutDistanceMeters,
        status: titoLogs.status,
        approvedBy: titoLogs.approvedBy,
        approvedAt: titoLogs.approvedAt,
        disputedBy: titoLogs.disputedBy,
        disputedAt: titoLogs.disputedAt,
        notes: titoLogs.notes,
        flaggedLate: titoLogs.flaggedLate,
        lateMinutes: titoLogs.lateMinutes,
        lateReason: titoLogs.lateReason,
        createdAt: titoLogs.createdAt,
        workplaceName: workplaces.name,
        workerName: users.fullName,
        shiftDate: shifts.date,
        shiftTitle: shifts.title
      };
      let query;
      if (isAdmin) {
        query = db.select(baseSelect).from(titoLogs).leftJoin(workplaces, eq(titoLogs.workplaceId, workplaces.id)).leftJoin(users, eq(titoLogs.workerId, users.id)).leftJoin(shifts, eq(titoLogs.shiftId, shifts.id)).orderBy(desc(titoLogs.createdAt)).limit(100);
      } else {
        query = db.select(baseSelect).from(titoLogs).leftJoin(workplaces, eq(titoLogs.workplaceId, workplaces.id)).leftJoin(users, eq(titoLogs.workerId, users.id)).leftJoin(shifts, eq(titoLogs.shiftId, shifts.id)).where(eq(titoLogs.workerId, userId)).orderBy(desc(titoLogs.createdAt)).limit(50);
      }
      const logs = await query;
      const formattedLogs = logs.map((log2) => ({
        id: log2.id,
        shiftId: log2.shiftId || "",
        workerId: log2.workerId,
        workerName: log2.workerName || "Unknown Worker",
        timeIn: log2.timeIn ? new Date(log2.timeIn).toISOString() : void 0,
        timeOut: log2.timeOut ? new Date(log2.timeOut).toISOString() : void 0,
        timeInLocation: log2.workplaceName || void 0,
        timeOutLocation: log2.workplaceName || void 0,
        timeInDistance: log2.timeInDistanceMeters ? Math.round(log2.timeInDistanceMeters) : void 0,
        timeOutDistance: log2.timeOutDistanceMeters ? Math.round(log2.timeOutDistanceMeters) : void 0,
        verificationMethod: log2.timeInGpsVerified || log2.timeOutGpsVerified ? "gps" : "manual",
        approvedBy: log2.approvedBy || void 0,
        approvedAt: log2.approvedAt ? new Date(log2.approvedAt).toISOString() : void 0,
        disputedBy: log2.disputedBy || void 0,
        disputedAt: log2.disputedAt ? new Date(log2.disputedAt).toISOString() : void 0,
        status: log2.status,
        shiftDate: log2.shiftDate || (log2.timeIn ? new Date(log2.timeIn).toLocaleDateString("en-CA", { timeZone: "America/Toronto" }) : (/* @__PURE__ */ new Date()).toLocaleDateString("en-CA")),
        createdAt: log2.createdAt ? new Date(log2.createdAt).toISOString() : (/* @__PURE__ */ new Date()).toISOString(),
        notes: log2.notes || void 0,
        flaggedLate: log2.flaggedLate || false,
        lateMinutes: log2.lateMinutes || void 0,
        lateReason: log2.lateReason || void 0,
        totalHours: log2.timeIn && log2.timeOut ? parseFloat(((new Date(log2.timeOut).getTime() - new Date(log2.timeIn).getTime()) / 36e5).toFixed(2)) : void 0
      }));
      res.json(formattedLogs);
    } catch (error) {
      console.error("Error fetching TITO logs:", error);
      res.status(500).json({ error: "Failed to fetch TITO logs" });
    }
  });
  app2.post("/api/tito/:id/approve", checkRoles("admin", "hr", "client"), async (req, res) => {
    try {
      const titoLogId = req.params.id;
      const userId = req.headers["x-user-id"];
      const [log2] = await db.select().from(titoLogs).where(eq(titoLogs.id, titoLogId));
      if (!log2) {
        res.status(404).json({ error: "TITO log not found" });
        return;
      }
      await db.update(titoLogs).set({ status: "approved", approvedBy: userId, approvedAt: /* @__PURE__ */ new Date(), updatedAt: /* @__PURE__ */ new Date() }).where(eq(titoLogs.id, titoLogId));
      await db.insert(auditLog).values({
        userId,
        action: "TITO_APPROVED",
        entityType: "tito_log",
        entityId: titoLogId,
        details: JSON.stringify({ workerId: log2.workerId, previousStatus: log2.status })
      });
      res.json({ success: true, message: "TITO log approved" });
    } catch (error) {
      console.error("Error approving TITO log:", error);
      res.status(500).json({ error: "Failed to approve TITO log" });
    }
  });
  app2.post("/api/tito/:id/dispute", checkRoles("admin", "hr", "client"), async (req, res) => {
    try {
      const titoLogId = req.params.id;
      const userId = req.headers["x-user-id"];
      const { reason } = req.body;
      const [log2] = await db.select().from(titoLogs).where(eq(titoLogs.id, titoLogId));
      if (!log2) {
        res.status(404).json({ error: "TITO log not found" });
        return;
      }
      await db.update(titoLogs).set({ status: "disputed", disputedBy: userId, disputedAt: /* @__PURE__ */ new Date(), notes: reason || null, updatedAt: /* @__PURE__ */ new Date() }).where(eq(titoLogs.id, titoLogId));
      await db.insert(auditLog).values({
        userId,
        action: "TITO_DISPUTED",
        entityType: "tito_log",
        entityId: titoLogId,
        details: JSON.stringify({ workerId: log2.workerId, previousStatus: log2.status, reason })
      });
      res.json({ success: true, message: "TITO log disputed" });
    } catch (error) {
      console.error("Error disputing TITO log:", error);
      res.status(500).json({ error: "Failed to dispute TITO log" });
    }
  });
  app2.get("/api/workers", checkRoles("admin", "hr"), async (_req, res) => {
    try {
      const workers = await db.select({
        id: users.id,
        email: users.email,
        fullName: users.fullName,
        onboardingStatus: users.onboardingStatus,
        workerRoles: users.workerRoles,
        isActive: users.isActive,
        createdAt: users.createdAt
      }).from(users).where(eq(users.role, "worker")).orderBy(desc(users.createdAt));
      res.json(workers);
    } catch (error) {
      console.error("Error fetching workers:", error);
      res.status(500).json({ error: "Failed to fetch workers" });
    }
  });
  app2.get("/api/my-today", async (req, res) => {
    try {
      const userId = req.headers["x-user-id"];
      const role = req.headers["x-user-role"];
      if (!userId) {
        res.status(401).json({ error: "Authentication required" });
        return;
      }
      const today = (/* @__PURE__ */ new Date()).toLocaleDateString("en-CA", { timeZone: "America/Toronto" });
      let todayShiftsQuery = db.select({
        id: shifts.id,
        title: shifts.title,
        date: shifts.date,
        startTime: shifts.startTime,
        endTime: shifts.endTime,
        status: shifts.status,
        category: shifts.category,
        workplaceId: shifts.workplaceId,
        workerUserId: shifts.workerUserId,
        workplaceName: workplaces.name,
        workerName: users.fullName
      }).from(shifts).leftJoin(workplaces, eq(shifts.workplaceId, workplaces.id)).leftJoin(users, eq(shifts.workerUserId, users.id)).where(
        role === "worker" ? and(eq(shifts.date, today), eq(shifts.workerUserId, userId)) : eq(shifts.date, today)
      ).orderBy(shifts.startTime);
      const todayShifts = await todayShiftsQuery;
      let pendingOffers = [];
      if (role === "worker") {
        pendingOffers = await db.select({
          id: shiftOffers.id,
          shiftId: shiftOffers.shiftId,
          status: shiftOffers.status,
          offeredAt: shiftOffers.offeredAt,
          shiftTitle: shifts.title,
          shiftDate: shifts.date,
          shiftStartTime: shifts.startTime,
          shiftEndTime: shifts.endTime,
          workplaceName: workplaces.name
        }).from(shiftOffers).innerJoin(shifts, eq(shiftOffers.shiftId, shifts.id)).leftJoin(workplaces, eq(shifts.workplaceId, workplaces.id)).where(
          and(
            eq(shiftOffers.workerId, userId),
            eq(shiftOffers.status, "pending")
          )
        ).orderBy(shifts.date);
      }
      let pendingRequestsCount = 0;
      let unfilledTodayCount = 0;
      if (role === "admin" || role === "hr") {
        const [reqCount] = await db.select({ count: sql2`count(*)::int` }).from(shiftRequests).where(eq(shiftRequests.status, "pending"));
        pendingRequestsCount = reqCount?.count || 0;
        unfilledTodayCount = todayShifts.filter(
          (s) => !s.workerUserId && s.status !== "cancelled"
        ).length;
      }
      res.json({
        today,
        todayShifts,
        pendingOffers,
        pendingRequestsCount,
        unfilledTodayCount,
        totalTodayShifts: todayShifts.length
      });
    } catch (error) {
      console.error("Error fetching my-today data:", error);
      res.status(500).json({ error: "Failed to fetch today data" });
    }
  });
  app2.get("/api/shifts", async (req, res) => {
    try {
      const userId = req.headers["x-user-id"];
      const role = req.headers["x-user-role"];
      const workplaceId = req.query.workplaceId;
      if (!userId) {
        res.status(401).json({ error: "Authentication required" });
        return;
      }
      let conditions = [];
      const includePast = req.query.includePast === "true";
      if (!includePast) {
        const today = (/* @__PURE__ */ new Date()).toLocaleDateString("en-CA", { timeZone: "America/Toronto" });
        conditions.push(gte(shifts.date, today));
      }
      if (role === "worker") {
        conditions.push(eq(shifts.workerUserId, userId));
      }
      if (workplaceId) {
        conditions.push(eq(shifts.workplaceId, workplaceId));
      }
      const result = await db.select({
        id: shifts.id,
        workplaceId: shifts.workplaceId,
        workerUserId: shifts.workerUserId,
        title: shifts.title,
        date: shifts.date,
        startTime: shifts.startTime,
        endTime: shifts.endTime,
        notes: shifts.notes,
        status: shifts.status,
        frequencyType: shifts.frequencyType,
        category: shifts.category,
        recurringDays: shifts.recurringDays,
        recurringEndDate: shifts.recurringEndDate,
        parentShiftId: shifts.parentShiftId,
        createdByUserId: shifts.createdByUserId,
        createdAt: shifts.createdAt,
        updatedAt: shifts.updatedAt,
        workplaceName: workplaces.name,
        workerName: users.fullName,
        workerEmail: users.email
      }).from(shifts).leftJoin(workplaces, eq(shifts.workplaceId, workplaces.id)).leftJoin(users, eq(shifts.workerUserId, users.id)).where(conditions.length > 0 ? and(...conditions) : void 0).orderBy(desc(shifts.date));
      res.json(result);
    } catch (error) {
      console.error("Error fetching shifts:", error);
      res.status(500).json({ error: "Failed to fetch shifts" });
    }
  });
  app2.post("/api/shifts", checkRoles("admin", "hr"), async (req, res) => {
    try {
      const userId = req.headers["x-user-id"];
      const { workplaceId, workerUserId, title, date: date2, startTime, endTime, notes, frequencyType, category, recurringDays, recurringEndDate } = req.body;
      const freq = frequencyType || "one-time";
      const cat = category || "janitorial";
      const isOpenEnded = freq === "open-ended";
      if (!workplaceId || !workerUserId || !title || !date2 || !startTime) {
        res.status(400).json({ error: "workplaceId, workerUserId, title, date, and startTime are required" });
        return;
      }
      if (freq === "recurring" && (!recurringDays || recurringDays.length === 0)) {
        res.status(400).json({ error: "recurringDays are required for recurring shifts" });
        return;
      }
      const [workplace] = await db.select().from(workplaces).where(eq(workplaces.id, workplaceId));
      if (!workplace) {
        res.status(404).json({ error: "Workplace not found" });
        return;
      }
      const [worker] = await db.select().from(users).where(and(eq(users.id, workerUserId), eq(users.role, "worker")));
      if (!worker) {
        res.status(404).json({ error: "Worker not found" });
        return;
      }
      if (freq === "recurring" && recurringDays) {
        const days = typeof recurringDays === "string" ? recurringDays.split(",") : recurringDays;
        const endType = recurringEndDate ? "date" : "never";
        const [newSeries] = await db.insert(shiftSeries).values({
          workplaceId,
          workerUserId,
          title,
          startTime,
          endTime: endTime || null,
          notes: notes || null,
          category: cat,
          frequency: "weekly",
          recurringDays: days.join(","),
          startDate: date2,
          endType,
          endDate: recurringEndDate || null,
          status: "active",
          createdByUserId: userId
        }).returning();
        await db.insert(auditLog).values({
          userId,
          action: "create_series",
          entityType: "shift_series",
          entityId: newSeries.id,
          details: JSON.stringify({ title, frequency: "weekly", workplaceId })
        });
        broadcast({ type: "created", entity: "shift_series", id: newSeries.id, data: { workerUserId, workplaceId } });
        res.status(201).json({ ...newSeries, type: "series" });
      } else {
        const [newShift] = await db.insert(shifts).values({
          workplaceId,
          workerUserId,
          title,
          date: date2,
          startTime,
          endTime: isOpenEnded ? null : endTime,
          notes: notes || null,
          status: "scheduled",
          frequencyType: freq,
          category: cat,
          createdByUserId: userId
        }).returning();
        broadcast({ type: "created", entity: "shift", id: newShift.id, data: { workerUserId, workplaceId } });
        res.status(201).json(newShift);
      }
    } catch (error) {
      console.error("Error creating shift:", error);
      res.status(500).json({ error: "Failed to create shift" });
    }
  });
  app2.patch("/api/shifts/:id", checkRoles("admin", "hr"), async (req, res) => {
    try {
      const { title, date: date2, startTime, endTime, notes, status } = req.body;
      const [existing] = await db.select().from(shifts).where(eq(shifts.id, req.params.id));
      if (!existing) {
        res.status(404).json({ error: "Shift not found" });
        return;
      }
      const { frequencyType, category, recurringDays, recurringEndDate } = req.body;
      const updates = { updatedAt: /* @__PURE__ */ new Date() };
      if (title !== void 0) updates.title = title;
      if (date2 !== void 0) updates.date = date2;
      if (startTime !== void 0) updates.startTime = startTime;
      if (endTime !== void 0) updates.endTime = endTime;
      if (notes !== void 0) updates.notes = notes;
      if (status !== void 0) updates.status = status;
      if (frequencyType !== void 0) updates.frequencyType = frequencyType;
      if (category !== void 0) updates.category = category;
      if (recurringDays !== void 0) updates.recurringDays = recurringDays;
      if (recurringEndDate !== void 0) updates.recurringEndDate = recurringEndDate;
      const [updated] = await db.update(shifts).set(updates).where(eq(shifts.id, req.params.id)).returning();
      broadcast({ type: "updated", entity: "shift", id: updated.id, data: { workerUserId: existing.workerUserId, workplaceId: existing.workplaceId } });
      res.json(updated);
    } catch (error) {
      console.error("Error updating shift:", error);
      res.status(500).json({ error: "Failed to update shift" });
    }
  });
  app2.delete("/api/shifts/:id", checkRoles("admin", "hr"), async (req, res) => {
    try {
      const [existing] = await db.select().from(shifts).where(eq(shifts.id, req.params.id));
      if (!existing) {
        res.status(404).json({ error: "Shift not found" });
        return;
      }
      await db.delete(shiftOffers).where(eq(shiftOffers.shiftId, req.params.id));
      await db.delete(shiftCheckins).where(eq(shiftCheckins.shiftId, req.params.id));
      const childShifts = await db.select({ id: shifts.id }).from(shifts).where(eq(shifts.parentShiftId, req.params.id));
      if (childShifts.length > 0) {
        const childIds = childShifts.map((c) => c.id);
        await db.delete(shiftOffers).where(inArray(shiftOffers.shiftId, childIds));
        await db.delete(shiftCheckins).where(inArray(shiftCheckins.shiftId, childIds));
        await db.delete(shifts).where(eq(shifts.parentShiftId, req.params.id));
      }
      await db.delete(shifts).where(eq(shifts.id, req.params.id));
      broadcast({ type: "deleted", entity: "shift", id: req.params.id, data: { workerUserId: existing.workerUserId, workplaceId: existing.workplaceId } });
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting shift:", error);
      res.status(500).json({ error: "Failed to delete shift" });
    }
  });
  app2.get("/api/shift-series", checkRoles("admin", "hr"), async (req, res) => {
    try {
      const workplaceIdFilter = req.query.workplaceId;
      const statusFilter = req.query.status || "active";
      const conditions = [eq(shiftSeries.status, statusFilter)];
      if (workplaceIdFilter) {
        conditions.push(eq(shiftSeries.workplaceId, workplaceIdFilter));
      }
      const results = await db.select({
        id: shiftSeries.id,
        workplaceId: shiftSeries.workplaceId,
        workerUserId: shiftSeries.workerUserId,
        title: shiftSeries.title,
        roleType: shiftSeries.roleType,
        startTime: shiftSeries.startTime,
        endTime: shiftSeries.endTime,
        notes: shiftSeries.notes,
        category: shiftSeries.category,
        frequency: shiftSeries.frequency,
        recurringDays: shiftSeries.recurringDays,
        startDate: shiftSeries.startDate,
        endType: shiftSeries.endType,
        endDate: shiftSeries.endDate,
        endAfterCount: shiftSeries.endAfterCount,
        status: shiftSeries.status,
        createdByUserId: shiftSeries.createdByUserId,
        createdAt: shiftSeries.createdAt,
        updatedAt: shiftSeries.updatedAt,
        workplaceName: workplaces.name,
        workerName: users.fullName
      }).from(shiftSeries).leftJoin(workplaces, eq(shiftSeries.workplaceId, workplaces.id)).leftJoin(users, eq(shiftSeries.workerUserId, users.id)).where(and(...conditions)).orderBy(desc(shiftSeries.startDate));
      res.json(results);
    } catch (error) {
      console.error("Error fetching shift series:", error);
      res.status(500).json({ error: "Failed to fetch shift series" });
    }
  });
  app2.get("/api/shift-series/:id", checkRoles("admin", "hr"), async (req, res) => {
    try {
      const [series] = await db.select({
        id: shiftSeries.id,
        workplaceId: shiftSeries.workplaceId,
        workerUserId: shiftSeries.workerUserId,
        title: shiftSeries.title,
        roleType: shiftSeries.roleType,
        startTime: shiftSeries.startTime,
        endTime: shiftSeries.endTime,
        notes: shiftSeries.notes,
        category: shiftSeries.category,
        frequency: shiftSeries.frequency,
        recurringDays: shiftSeries.recurringDays,
        startDate: shiftSeries.startDate,
        endType: shiftSeries.endType,
        endDate: shiftSeries.endDate,
        endAfterCount: shiftSeries.endAfterCount,
        status: shiftSeries.status,
        createdByUserId: shiftSeries.createdByUserId,
        createdAt: shiftSeries.createdAt,
        updatedAt: shiftSeries.updatedAt,
        workplaceName: workplaces.name,
        workerName: users.fullName
      }).from(shiftSeries).leftJoin(workplaces, eq(shiftSeries.workplaceId, workplaces.id)).leftJoin(users, eq(shiftSeries.workerUserId, users.id)).where(eq(shiftSeries.id, req.params.id));
      if (!series) {
        res.status(404).json({ error: "Shift series not found" });
        return;
      }
      const exceptions = await db.select().from(recurrenceExceptions).where(eq(recurrenceExceptions.seriesId, req.params.id));
      res.json({ ...series, exceptions });
    } catch (error) {
      console.error("Error fetching shift series:", error);
      res.status(500).json({ error: "Failed to fetch shift series" });
    }
  });
  app2.post("/api/shift-series", checkRoles("admin", "hr"), async (req, res) => {
    try {
      const userId = req.headers["x-user-id"];
      const { workplaceId, workerUserId, title, roleType, startTime, endTime, notes, category, frequency, recurringDays, startDate, endType, endDate, endAfterCount } = req.body;
      if (!workplaceId || !title || !startTime || !startDate || !frequency) {
        res.status(400).json({ error: "workplaceId, title, startTime, startDate, and frequency are required" });
        return;
      }
      if ((frequency === "weekly" || frequency === "biweekly") && !recurringDays) {
        res.status(400).json({ error: "recurringDays is required for weekly/biweekly frequency" });
        return;
      }
      if (endType === "date" && !endDate) {
        res.status(400).json({ error: "endDate is required when endType is 'date'" });
        return;
      }
      if (endType === "count" && !endAfterCount) {
        res.status(400).json({ error: "endAfterCount is required when endType is 'count'" });
        return;
      }
      const [newSeries] = await db.insert(shiftSeries).values({
        workplaceId,
        workerUserId: workerUserId || null,
        title,
        roleType: roleType || null,
        startTime,
        endTime: endTime || null,
        notes: notes || null,
        category: category || "janitorial",
        frequency,
        recurringDays: recurringDays || null,
        startDate,
        endType: endType || "never",
        endDate: endDate || null,
        endAfterCount: endAfterCount || null,
        status: "active",
        createdByUserId: userId
      }).returning();
      await db.insert(auditLog).values({
        userId,
        action: "create_series",
        entityType: "shift_series",
        entityId: newSeries.id,
        details: JSON.stringify({ title, frequency, workplaceId })
      });
      broadcast({ type: "created", entity: "shift_series", id: newSeries.id, data: { workplaceId } });
      res.status(201).json(newSeries);
    } catch (error) {
      console.error("Error creating shift series:", error);
      res.status(500).json({ error: "Failed to create shift series" });
    }
  });
  app2.patch("/api/shift-series/:id", checkRoles("admin", "hr"), async (req, res) => {
    try {
      const userId = req.headers["x-user-id"];
      const { title, workerUserId, startTime, endTime, notes, category, recurringDays, endType, endDate, endAfterCount, status } = req.body;
      const [existing] = await db.select().from(shiftSeries).where(eq(shiftSeries.id, req.params.id));
      if (!existing) {
        res.status(404).json({ error: "Shift series not found" });
        return;
      }
      const updates = { updatedAt: /* @__PURE__ */ new Date() };
      if (title !== void 0) updates.title = title;
      if (workerUserId !== void 0) updates.workerUserId = workerUserId;
      if (startTime !== void 0) updates.startTime = startTime;
      if (endTime !== void 0) updates.endTime = endTime;
      if (notes !== void 0) updates.notes = notes;
      if (category !== void 0) updates.category = category;
      if (recurringDays !== void 0) updates.recurringDays = recurringDays;
      if (endType !== void 0) updates.endType = endType;
      if (endDate !== void 0) updates.endDate = endDate;
      if (endAfterCount !== void 0) updates.endAfterCount = endAfterCount;
      if (status !== void 0) updates.status = status;
      const [updated] = await db.update(shiftSeries).set(updates).where(eq(shiftSeries.id, req.params.id)).returning();
      await db.insert(auditLog).values({
        userId,
        action: "update_series",
        entityType: "shift_series",
        entityId: req.params.id,
        details: JSON.stringify(updates)
      });
      broadcast({ type: "updated", entity: "shift_series", id: updated.id, data: { workplaceId: existing.workplaceId } });
      res.json(updated);
    } catch (error) {
      console.error("Error updating shift series:", error);
      res.status(500).json({ error: "Failed to update shift series" });
    }
  });
  app2.delete("/api/shift-series/:id", checkRoles("admin"), async (req, res) => {
    try {
      const userId = req.headers["x-user-id"];
      const [existing] = await db.select().from(shiftSeries).where(eq(shiftSeries.id, req.params.id));
      if (!existing) {
        res.status(404).json({ error: "Shift series not found" });
        return;
      }
      await db.delete(recurrenceExceptions).where(eq(recurrenceExceptions.seriesId, req.params.id));
      await db.delete(shiftSeries).where(eq(shiftSeries.id, req.params.id));
      await db.insert(auditLog).values({
        userId,
        action: "delete_series",
        entityType: "shift_series",
        entityId: req.params.id,
        details: JSON.stringify({ title: existing.title, workplaceId: existing.workplaceId })
      });
      broadcast({ type: "deleted", entity: "shift_series", id: req.params.id, data: { workplaceId: existing.workplaceId } });
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting shift series:", error);
      res.status(500).json({ error: "Failed to delete shift series" });
    }
  });
  app2.post("/api/shift-series/:id/cancel-occurrence", checkRoles("admin", "hr"), async (req, res) => {
    try {
      const userId = req.headers["x-user-id"];
      const { date: date2, reason } = req.body;
      if (!date2) {
        res.status(400).json({ error: "date is required" });
        return;
      }
      const [existing] = await db.select().from(shiftSeries).where(eq(shiftSeries.id, req.params.id));
      if (!existing) {
        res.status(404).json({ error: "Shift series not found" });
        return;
      }
      const [exception] = await db.insert(recurrenceExceptions).values({
        seriesId: req.params.id,
        date: date2,
        type: "cancelled",
        reason: reason || null,
        cancelledByUserId: userId
      }).returning();
      await db.insert(auditLog).values({
        userId,
        action: "cancel_occurrence",
        entityType: "shift_series",
        entityId: req.params.id,
        details: JSON.stringify({ date: date2, reason })
      });
      broadcast({ type: "updated", entity: "shift_series", id: req.params.id, data: { workplaceId: existing.workplaceId } });
      res.json(exception);
    } catch (error) {
      console.error("Error cancelling occurrence:", error);
      res.status(500).json({ error: "Failed to cancel occurrence" });
    }
  });
  app2.post("/api/shift-series/:id/delete-future", checkRoles("admin", "hr"), async (req, res) => {
    try {
      const userId = req.headers["x-user-id"];
      const { fromDate } = req.body;
      if (!fromDate) {
        res.status(400).json({ error: "fromDate is required" });
        return;
      }
      const [existing] = await db.select().from(shiftSeries).where(eq(shiftSeries.id, req.params.id));
      if (!existing) {
        res.status(404).json({ error: "Shift series not found" });
        return;
      }
      const newEndDate = new Date(fromDate);
      newEndDate.setDate(newEndDate.getDate() - 1);
      const newEndDateStr = newEndDate.toISOString().split("T")[0];
      if (existing.endType === "never" || existing.endDate && existing.endDate > fromDate) {
        await db.update(shiftSeries).set({
          endType: "date",
          endDate: newEndDateStr,
          updatedAt: /* @__PURE__ */ new Date()
        }).where(eq(shiftSeries.id, req.params.id));
      }
      await db.delete(recurrenceExceptions).where(
        and(
          eq(recurrenceExceptions.seriesId, req.params.id),
          gte(recurrenceExceptions.date, fromDate)
        )
      );
      await db.insert(auditLog).values({
        userId,
        action: "delete_future_occurrences",
        entityType: "shift_series",
        entityId: req.params.id,
        details: JSON.stringify({ fromDate })
      });
      const [updated] = await db.select().from(shiftSeries).where(eq(shiftSeries.id, req.params.id));
      broadcast({ type: "updated", entity: "shift_series", id: req.params.id, data: { workplaceId: existing.workplaceId } });
      res.json(updated);
    } catch (error) {
      console.error("Error deleting future occurrences:", error);
      res.status(500).json({ error: "Failed to delete future occurrences" });
    }
  });
  app2.post("/api/shift-series/:id/modify-occurrence", checkRoles("admin", "hr"), async (req, res) => {
    try {
      const userId = req.headers["x-user-id"];
      const { date: date2, startTime, endTime, workerUserId, notes } = req.body;
      if (!date2) {
        res.status(400).json({ error: "date is required" });
        return;
      }
      const [existing] = await db.select().from(shiftSeries).where(eq(shiftSeries.id, req.params.id));
      if (!existing) {
        res.status(404).json({ error: "Shift series not found" });
        return;
      }
      const [exception] = await db.insert(recurrenceExceptions).values({
        seriesId: req.params.id,
        date: date2,
        type: "modified",
        overrideStartTime: startTime || null,
        overrideEndTime: endTime || null,
        overrideWorkerUserId: workerUserId || null,
        overrideNotes: notes || null
      }).returning();
      await db.insert(auditLog).values({
        userId,
        action: "modify_occurrence",
        entityType: "shift_series",
        entityId: req.params.id,
        details: JSON.stringify({ date: date2, startTime, endTime, workerUserId, notes })
      });
      broadcast({ type: "updated", entity: "shift_series", id: req.params.id, data: { workplaceId: existing.workplaceId } });
      res.json(exception);
    } catch (error) {
      console.error("Error modifying occurrence:", error);
      res.status(500).json({ error: "Failed to modify occurrence" });
    }
  });
  app2.get("/api/shift-series/:id/occurrences", checkRoles("admin", "hr"), async (req, res) => {
    try {
      const startDateParam = req.query.startDate;
      const endDateParam = req.query.endDate;
      if (!startDateParam || !endDateParam) {
        res.status(400).json({ error: "startDate and endDate query parameters are required" });
        return;
      }
      const [series] = await db.select({
        id: shiftSeries.id,
        workplaceId: shiftSeries.workplaceId,
        workerUserId: shiftSeries.workerUserId,
        title: shiftSeries.title,
        roleType: shiftSeries.roleType,
        startTime: shiftSeries.startTime,
        endTime: shiftSeries.endTime,
        notes: shiftSeries.notes,
        category: shiftSeries.category,
        frequency: shiftSeries.frequency,
        recurringDays: shiftSeries.recurringDays,
        startDate: shiftSeries.startDate,
        endType: shiftSeries.endType,
        endDate: shiftSeries.endDate,
        endAfterCount: shiftSeries.endAfterCount,
        status: shiftSeries.status,
        workerName: users.fullName
      }).from(shiftSeries).leftJoin(users, eq(shiftSeries.workerUserId, users.id)).where(eq(shiftSeries.id, req.params.id));
      if (!series) {
        res.status(404).json({ error: "Shift series not found" });
        return;
      }
      const exceptions = await db.select().from(recurrenceExceptions).where(eq(recurrenceExceptions.seriesId, req.params.id));
      const occurrences = expandSeriesOccurrences(series, exceptions, startDateParam, endDateParam);
      const enriched = occurrences.map((occ) => ({
        ...occ,
        workerName: series.workerName,
        title: series.title,
        category: series.category
      }));
      res.json(enriched);
    } catch (error) {
      console.error("Error fetching occurrences:", error);
      res.status(500).json({ error: "Failed to fetch occurrences" });
    }
  });
  app2.get("/api/roster", checkRoles("admin", "hr"), async (req, res) => {
    try {
      const workplaceId = req.query.workplaceId;
      const startDateParam = req.query.startDate;
      const endDateParam = req.query.endDate;
      if (!workplaceId || !startDateParam || !endDateParam) {
        res.status(400).json({ error: "workplaceId, startDate, and endDate query parameters are required" });
        return;
      }
      const oneTimeShifts = await db.select({
        id: shifts.id,
        date: shifts.date,
        startTime: shifts.startTime,
        endTime: shifts.endTime,
        title: shifts.title,
        workerUserId: shifts.workerUserId,
        workerName: users.fullName,
        category: shifts.category,
        status: shifts.status,
        notes: shifts.notes
      }).from(shifts).leftJoin(users, eq(shifts.workerUserId, users.id)).where(and(
        eq(shifts.workplaceId, workplaceId),
        gte(shifts.date, startDateParam),
        lte(shifts.date, endDateParam)
      )).orderBy(shifts.date, shifts.startTime);
      const shiftItems = oneTimeShifts.map((s) => ({
        id: s.id,
        date: s.date,
        startTime: s.startTime,
        endTime: s.endTime,
        title: s.title,
        workerUserId: s.workerUserId,
        workerName: s.workerName,
        category: s.category,
        status: s.status,
        notes: s.notes,
        type: "shift",
        seriesId: null
      }));
      const activeSeries = await db.select({
        id: shiftSeries.id,
        workplaceId: shiftSeries.workplaceId,
        workerUserId: shiftSeries.workerUserId,
        title: shiftSeries.title,
        roleType: shiftSeries.roleType,
        startTime: shiftSeries.startTime,
        endTime: shiftSeries.endTime,
        notes: shiftSeries.notes,
        category: shiftSeries.category,
        frequency: shiftSeries.frequency,
        recurringDays: shiftSeries.recurringDays,
        startDate: shiftSeries.startDate,
        endType: shiftSeries.endType,
        endDate: shiftSeries.endDate,
        endAfterCount: shiftSeries.endAfterCount,
        status: shiftSeries.status,
        workerName: users.fullName
      }).from(shiftSeries).leftJoin(users, eq(shiftSeries.workerUserId, users.id)).where(and(
        eq(shiftSeries.workplaceId, workplaceId),
        eq(shiftSeries.status, "active")
      ));
      const seriesItems = [];
      for (const s of activeSeries) {
        const exceptions = await db.select().from(recurrenceExceptions).where(eq(recurrenceExceptions.seriesId, s.id));
        const occurrences = expandSeriesOccurrences(s, exceptions, startDateParam, endDateParam);
        for (const occ of occurrences) {
          let workerName = s.workerName;
          if (occ.isException && occ.exceptionType === "modified" && occ.workerUserId && occ.workerUserId !== s.workerUserId) {
            const [overrideWorker] = await db.select({ fullName: users.fullName }).from(users).where(eq(users.id, occ.workerUserId));
            if (overrideWorker) workerName = overrideWorker.fullName;
          }
          seriesItems.push({
            id: null,
            date: occ.date,
            startTime: occ.startTime,
            endTime: occ.endTime,
            title: s.title,
            workerUserId: occ.workerUserId || s.workerUserId,
            workerName,
            category: s.category,
            status: occ.status,
            notes: occ.notes || s.notes,
            type: "series_occurrence",
            seriesId: s.id,
            isException: occ.isException,
            exceptionType: occ.exceptionType || null
          });
        }
      }
      const merged = [...shiftItems, ...seriesItems].sort((a, b) => {
        const dateCompare = (a.date || "").localeCompare(b.date || "");
        if (dateCompare !== 0) return dateCompare;
        return (a.startTime || "").localeCompare(b.startTime || "");
      });
      res.json(merged);
    } catch (error) {
      console.error("Error fetching roster:", error);
      res.status(500).json({ error: "Failed to fetch roster" });
    }
  });
  app2.get("/api/payroll/periods", checkRoles("admin", "hr"), async (req, res) => {
    try {
      const year = parseInt(req.query.year) || 2026;
      const periods = getPayPeriodsForYear(year);
      res.json(periods);
    } catch (error) {
      console.error("Error fetching pay periods:", error);
      res.status(500).json({ error: "Failed to fetch pay periods" });
    }
  });
  app2.get("/api/timesheets", checkRoles("admin", "hr"), async (req, res) => {
    try {
      const year = parseInt(req.query.year) || 2026;
      const period = req.query.period ? parseInt(req.query.period) : void 0;
      const status = req.query.status;
      let query = db.select({
        id: timesheets.id,
        workerUserId: timesheets.workerUserId,
        periodYear: timesheets.periodYear,
        periodNumber: timesheets.periodNumber,
        status: timesheets.status,
        submittedAt: timesheets.submittedAt,
        approvedAt: timesheets.approvedAt,
        disputedAt: timesheets.disputedAt,
        disputeReason: timesheets.disputeReason,
        totalHours: timesheets.totalHours,
        totalPay: timesheets.totalPay,
        createdAt: timesheets.createdAt,
        workerName: users.fullName,
        workerEmail: users.email
      }).from(timesheets).leftJoin(users, eq(timesheets.workerUserId, users.id)).where(eq(timesheets.periodYear, year)).orderBy(desc(timesheets.submittedAt));
      const results = await query;
      let filtered = results;
      if (period) {
        filtered = filtered.filter((t) => t.periodNumber === period);
      }
      if (status) {
        filtered = filtered.filter((t) => t.status === status);
      }
      res.json(filtered);
    } catch (error) {
      console.error("Error fetching timesheets:", error);
      res.status(500).json({ error: "Failed to fetch timesheets" });
    }
  });
  app2.get("/api/timesheets/:id", checkRoles("admin", "hr"), async (req, res) => {
    try {
      const { id } = req.params;
      const [timesheet] = await db.select({
        id: timesheets.id,
        workerUserId: timesheets.workerUserId,
        periodYear: timesheets.periodYear,
        periodNumber: timesheets.periodNumber,
        status: timesheets.status,
        submittedAt: timesheets.submittedAt,
        approvedAt: timesheets.approvedAt,
        disputedAt: timesheets.disputedAt,
        disputeReason: timesheets.disputeReason,
        totalHours: timesheets.totalHours,
        totalPay: timesheets.totalPay,
        createdAt: timesheets.createdAt,
        workerName: users.fullName,
        workerEmail: users.email
      }).from(timesheets).leftJoin(users, eq(timesheets.workerUserId, users.id)).where(eq(timesheets.id, id));
      if (!timesheet) {
        res.status(404).json({ error: "Timesheet not found" });
        return;
      }
      const entries = await db.select({
        id: timesheetEntries.id,
        timesheetId: timesheetEntries.timesheetId,
        workplaceId: timesheetEntries.workplaceId,
        titoLogId: timesheetEntries.titoLogId,
        dateLocal: timesheetEntries.dateLocal,
        timeInUtc: timesheetEntries.timeInUtc,
        timeOutUtc: timesheetEntries.timeOutUtc,
        breakMinutes: timesheetEntries.breakMinutes,
        hours: timesheetEntries.hours,
        payRate: timesheetEntries.payRate,
        amount: timesheetEntries.amount,
        notes: timesheetEntries.notes,
        workplaceName: workplaces.name
      }).from(timesheetEntries).leftJoin(workplaces, eq(timesheetEntries.workplaceId, workplaces.id)).where(eq(timesheetEntries.timesheetId, id)).orderBy(timesheetEntries.dateLocal);
      res.json({ ...timesheet, entries });
    } catch (error) {
      console.error("Error fetching timesheet:", error);
      res.status(500).json({ error: "Failed to fetch timesheet" });
    }
  });
  app2.patch("/api/timesheets/:id/approve", checkRoles("admin", "hr"), async (req, res) => {
    try {
      const { id } = req.params;
      const userId = req.headers["x-user-id"];
      const [timesheet] = await db.select().from(timesheets).where(eq(timesheets.id, id));
      if (!timesheet) {
        res.status(404).json({ error: "Timesheet not found" });
        return;
      }
      if (timesheet.status !== "submitted") {
        res.status(400).json({ error: "Only submitted timesheets can be approved" });
        return;
      }
      const [updated] = await db.update(timesheets).set({
        status: "approved",
        approvedByUserId: userId,
        approvedAt: /* @__PURE__ */ new Date(),
        updatedAt: /* @__PURE__ */ new Date()
      }).where(eq(timesheets.id, id)).returning();
      res.json(updated);
    } catch (error) {
      console.error("Error approving timesheet:", error);
      res.status(500).json({ error: "Failed to approve timesheet" });
    }
  });
  app2.patch("/api/timesheets/:id/dispute", checkRoles("admin", "hr"), async (req, res) => {
    try {
      const { id } = req.params;
      const { reason } = req.body;
      const userId = req.headers["x-user-id"];
      if (!reason || reason.trim().length === 0) {
        res.status(400).json({ error: "Dispute reason is required" });
        return;
      }
      const [timesheet] = await db.select().from(timesheets).where(eq(timesheets.id, id));
      if (!timesheet) {
        res.status(404).json({ error: "Timesheet not found" });
        return;
      }
      if (timesheet.status !== "submitted" && timesheet.status !== "approved") {
        res.status(400).json({ error: "Only submitted or approved timesheets can be disputed" });
        return;
      }
      const [updated] = await db.update(timesheets).set({
        status: "disputed",
        disputedByUserId: userId,
        disputedAt: /* @__PURE__ */ new Date(),
        disputeReason: reason.trim(),
        updatedAt: /* @__PURE__ */ new Date()
      }).where(eq(timesheets.id, id)).returning();
      res.json(updated);
    } catch (error) {
      console.error("Error disputing timesheet:", error);
      res.status(500).json({ error: "Failed to dispute timesheet" });
    }
  });
  app2.post("/api/payroll/batches", checkRoles("admin", "hr"), async (req, res) => {
    try {
      const { year, periodNumber } = req.body;
      const userId = req.headers["x-user-id"];
      if (!year || !periodNumber) {
        res.status(400).json({ error: "Year and periodNumber are required" });
        return;
      }
      const [existingBatch] = await db.select().from(payrollBatches).where(and(
        eq(payrollBatches.periodYear, year),
        eq(payrollBatches.periodNumber, periodNumber)
      ));
      if (existingBatch) {
        const items2 = await db.select({
          id: payrollBatchItems.id,
          workerUserId: payrollBatchItems.workerUserId,
          timesheetId: payrollBatchItems.timesheetId,
          status: payrollBatchItems.status,
          hours: payrollBatchItems.hours,
          amount: payrollBatchItems.amount,
          workerName: users.fullName,
          workerEmail: users.email
        }).from(payrollBatchItems).leftJoin(users, eq(payrollBatchItems.workerUserId, users.id)).where(eq(payrollBatchItems.payrollBatchId, existingBatch.id));
        res.json({ ...existingBatch, items: items2 });
        return;
      }
      const approvedTimesheets = await db.select().from(timesheets).where(and(
        eq(timesheets.periodYear, year),
        eq(timesheets.periodNumber, periodNumber),
        eq(timesheets.status, "approved")
      ));
      let totalWorkers = approvedTimesheets.length;
      let totalHours = 0;
      let totalAmount = 0;
      for (const ts of approvedTimesheets) {
        totalHours += parseFloat(ts.totalHours || "0");
        totalAmount += parseFloat(ts.totalPay || "0");
      }
      const [batch] = await db.insert(payrollBatches).values({
        periodYear: year,
        periodNumber,
        status: "open",
        createdByUserId: userId,
        totalWorkers,
        totalHours: totalHours.toFixed(2),
        totalAmount: totalAmount.toFixed(2)
      }).returning();
      const items = [];
      for (const ts of approvedTimesheets) {
        const [item] = await db.insert(payrollBatchItems).values({
          payrollBatchId: batch.id,
          workerUserId: ts.workerUserId,
          timesheetId: ts.id,
          status: "included",
          hours: ts.totalHours || "0",
          amount: ts.totalPay || "0"
        }).returning();
        items.push(item);
      }
      res.json({ ...batch, items });
    } catch (error) {
      console.error("Error creating payroll batch:", error);
      res.status(500).json({ error: "Failed to create payroll batch" });
    }
  });
  app2.get("/api/payroll/batches", checkRoles("admin", "hr"), async (req, res) => {
    try {
      const year = parseInt(req.query.year) || 2026;
      const period = req.query.period ? parseInt(req.query.period) : void 0;
      let results = await db.select().from(payrollBatches).where(eq(payrollBatches.periodYear, year)).orderBy(desc(payrollBatches.createdAt));
      if (period) {
        results = results.filter((b) => b.periodNumber === period);
      }
      res.json(results);
    } catch (error) {
      console.error("Error fetching payroll batches:", error);
      res.status(500).json({ error: "Failed to fetch payroll batches" });
    }
  });
  app2.get("/api/payroll/batches/:id", checkRoles("admin", "hr"), async (req, res) => {
    try {
      const { id } = req.params;
      const [batch] = await db.select().from(payrollBatches).where(eq(payrollBatches.id, id));
      if (!batch) {
        res.status(404).json({ error: "Payroll batch not found" });
        return;
      }
      const items = await db.select({
        id: payrollBatchItems.id,
        workerUserId: payrollBatchItems.workerUserId,
        timesheetId: payrollBatchItems.timesheetId,
        status: payrollBatchItems.status,
        hours: payrollBatchItems.hours,
        amount: payrollBatchItems.amount,
        workerName: users.fullName,
        workerEmail: users.email
      }).from(payrollBatchItems).leftJoin(users, eq(payrollBatchItems.workerUserId, users.id)).where(eq(payrollBatchItems.payrollBatchId, id));
      res.json({ ...batch, items });
    } catch (error) {
      console.error("Error fetching payroll batch:", error);
      res.status(500).json({ error: "Failed to fetch payroll batch" });
    }
  });
  app2.patch("/api/payroll/batches/:id/finalize", checkRoles("admin"), async (req, res) => {
    try {
      const { id } = req.params;
      const userId = req.headers["x-user-id"];
      const [batch] = await db.select().from(payrollBatches).where(eq(payrollBatches.id, id));
      if (!batch) {
        res.status(404).json({ error: "Payroll batch not found" });
        return;
      }
      if (batch.status !== "open") {
        res.status(400).json({ error: "Only open batches can be finalized" });
        return;
      }
      const items = await db.select().from(payrollBatchItems).where(and(
        eq(payrollBatchItems.payrollBatchId, id),
        eq(payrollBatchItems.status, "included")
      ));
      for (const item of items) {
        await db.update(timesheets).set({ status: "processed", updatedAt: /* @__PURE__ */ new Date() }).where(eq(timesheets.id, item.timesheetId));
      }
      const [updated] = await db.update(payrollBatches).set({
        status: "finalized",
        finalizedByUserId: userId,
        finalizedAt: /* @__PURE__ */ new Date(),
        updatedAt: /* @__PURE__ */ new Date()
      }).where(eq(payrollBatches.id, id)).returning();
      res.json(updated);
    } catch (error) {
      console.error("Error finalizing payroll batch:", error);
      res.status(500).json({ error: "Failed to finalize payroll batch" });
    }
  });
  app2.get("/api/payroll/batches/:id/export.csv", checkRoles("admin"), async (req, res) => {
    try {
      const { id } = req.params;
      const [batch] = await db.select().from(payrollBatches).where(eq(payrollBatches.id, id));
      if (!batch) {
        res.status(404).json({ error: "Payroll batch not found" });
        return;
      }
      const period = getPayPeriod(batch.periodYear, batch.periodNumber);
      const dateRange = period ? `${period.startDate} to ${period.endDate}` : "Unknown";
      const items = await db.select({
        workerName: users.fullName,
        workerEmail: users.email,
        hours: payrollBatchItems.hours,
        amount: payrollBatchItems.amount,
        status: payrollBatchItems.status
      }).from(payrollBatchItems).leftJoin(users, eq(payrollBatchItems.workerUserId, users.id)).where(and(
        eq(payrollBatchItems.payrollBatchId, id),
        eq(payrollBatchItems.status, "included")
      ));
      const csvLines = [
        "Worker Name,Worker Email,Hours,Amount,Period,Date Range",
        ...items.map(
          (item) => `"${item.workerName || ""}","${item.workerEmail || ""}",${item.hours},${item.amount},Period ${batch.periodNumber},"${dateRange}"`
        )
      ];
      res.setHeader("Content-Type", "text/csv");
      res.setHeader("Content-Disposition", `attachment; filename="payroll-period-${batch.periodNumber}-${batch.periodYear}.csv"`);
      res.send(csvLines.join("\n"));
    } catch (error) {
      console.error("Error exporting payroll batch:", error);
      res.status(500).json({ error: "Failed to export payroll batch" });
    }
  });
  app2.get("/api/places/autocomplete", checkRoles("admin", "hr", "worker"), async (req, res) => {
    try {
      const { input } = req.query;
      if (!input || typeof input !== "string" || input.length < 2) {
        res.json({ predictions: [] });
        return;
      }
      const apiKey = process.env.GOOGLE_PLACES_API_KEY;
      if (!apiKey) {
        res.status(500).json({ error: "Google Places API key not configured" });
        return;
      }
      const url = new URL("https://maps.googleapis.com/maps/api/place/autocomplete/json");
      url.searchParams.set("input", input);
      url.searchParams.set("key", apiKey);
      url.searchParams.set("types", "address");
      url.searchParams.set("components", "country:ca|country:us");
      const response = await fetch(url.toString());
      const data = await response.json();
      if (data.status === "OK" || data.status === "ZERO_RESULTS") {
        res.json({ predictions: data.predictions || [] });
      } else {
        console.error("Google Places API error:", data.status, data.error_message);
        res.status(500).json({ error: "Failed to fetch address suggestions" });
      }
    } catch (error) {
      console.error("Error in address autocomplete:", error);
      res.status(500).json({ error: "Failed to fetch address suggestions" });
    }
  });
  app2.get("/api/places/details/:placeId", checkRoles("admin", "hr", "worker"), async (req, res) => {
    try {
      const { placeId } = req.params;
      if (!placeId) {
        res.status(400).json({ error: "Place ID is required" });
        return;
      }
      const apiKey = process.env.GOOGLE_PLACES_API_KEY;
      if (!apiKey) {
        res.status(500).json({ error: "Google Places API key not configured" });
        return;
      }
      const url = new URL("https://maps.googleapis.com/maps/api/place/details/json");
      url.searchParams.set("place_id", placeId);
      url.searchParams.set("key", apiKey);
      url.searchParams.set("fields", "formatted_address,address_components,geometry");
      const response = await fetch(url.toString());
      const data = await response.json();
      if (data.status === "OK" && data.result) {
        const result = data.result;
        const components = result.address_components || [];
        const getComponent = (types) => {
          const comp = components.find(
            (c) => types.some((t) => c.types.includes(t))
          );
          return comp?.long_name || "";
        };
        const getShortComponent = (types) => {
          const comp = components.find(
            (c) => types.some((t) => c.types.includes(t))
          );
          return comp?.short_name || "";
        };
        const streetNumber = getComponent(["street_number"]);
        const streetName = getComponent(["route"]);
        const addressLine1 = streetNumber && streetName ? `${streetNumber} ${streetName}` : streetName || getComponent(["premise", "subpremise"]);
        const addressData = {
          formattedAddress: result.formatted_address,
          addressLine1,
          city: getComponent(["locality", "sublocality", "administrative_area_level_3"]),
          province: getShortComponent(["administrative_area_level_1"]),
          postalCode: getComponent(["postal_code"]),
          country: getComponent(["country"]),
          latitude: result.geometry?.location?.lat || null,
          longitude: result.geometry?.location?.lng || null
        };
        res.json(addressData);
      } else {
        console.error("Google Places Details API error:", data.status, data.error_message);
        res.status(500).json({ error: "Failed to fetch address details" });
      }
    } catch (error) {
      console.error("Error in address details:", error);
      res.status(500).json({ error: "Failed to fetch address details" });
    }
  });
  app2.get("/api/debug/whoami", (req, res) => {
    res.json({
      headers: {
        "x-user-id": req.headers["x-user-id"] || null,
        "x-user-role": req.headers["x-user-role"] || null,
        host: req.headers["host"] || null
      },
      timestamp: (/* @__PURE__ */ new Date()).toISOString()
    });
  });
  app2.get("/api/shift-requests", async (req, res) => {
    try {
      const role = req.headers["x-user-role"];
      const userId = req.headers["x-user-id"];
      if (!role || !userId) {
        res.status(401).json({ error: "Authentication required" });
        return;
      }
      let results;
      if (role === "admin" || role === "hr") {
        results = await db.select({
          id: shiftRequests.id,
          clientId: shiftRequests.clientId,
          workplaceId: shiftRequests.workplaceId,
          roleType: shiftRequests.roleType,
          date: shiftRequests.date,
          startTime: shiftRequests.startTime,
          endTime: shiftRequests.endTime,
          notes: shiftRequests.notes,
          requestedWorkerId: shiftRequests.requestedWorkerId,
          status: shiftRequests.status,
          createdAt: shiftRequests.createdAt,
          updatedAt: shiftRequests.updatedAt,
          workplaceName: workplaces.name,
          clientName: users.fullName
        }).from(shiftRequests).leftJoin(workplaces, eq(shiftRequests.workplaceId, workplaces.id)).leftJoin(users, eq(shiftRequests.clientId, users.id)).orderBy(desc(shiftRequests.createdAt));
      } else if (role === "client") {
        results = await db.select({
          id: shiftRequests.id,
          clientId: shiftRequests.clientId,
          workplaceId: shiftRequests.workplaceId,
          roleType: shiftRequests.roleType,
          date: shiftRequests.date,
          startTime: shiftRequests.startTime,
          endTime: shiftRequests.endTime,
          notes: shiftRequests.notes,
          requestedWorkerId: shiftRequests.requestedWorkerId,
          status: shiftRequests.status,
          createdAt: shiftRequests.createdAt,
          updatedAt: shiftRequests.updatedAt,
          workplaceName: workplaces.name,
          clientName: users.fullName
        }).from(shiftRequests).leftJoin(workplaces, eq(shiftRequests.workplaceId, workplaces.id)).leftJoin(users, eq(shiftRequests.clientId, users.id)).where(eq(shiftRequests.clientId, userId)).orderBy(desc(shiftRequests.createdAt));
      } else {
        res.status(403).json({ error: "Access denied" });
        return;
      }
      res.json(results);
    } catch (error) {
      console.error("Error fetching shift requests:", error);
      res.status(500).json({ error: "Failed to fetch shift requests" });
    }
  });
  app2.post(
    "/api/shift-requests",
    checkRoles("admin", "hr", "client"),
    async (req, res) => {
      try {
        const userId = req.headers["x-user-id"];
        const { clientId, workplaceId, roleType, date: date2, startTime, endTime, notes, requestedWorkerId } = req.body;
        const effectiveClientId = clientId || userId;
        if (!workplaceId || !roleType || !date2 || !startTime || !endTime) {
          res.status(400).json({ error: "workplaceId, roleType, date, startTime, and endTime are required" });
          return;
        }
        const [newRequest] = await db.insert(shiftRequests).values({
          clientId: effectiveClientId,
          workplaceId,
          roleType,
          date: date2,
          startTime,
          endTime,
          notes: notes || null,
          requestedWorkerId: requestedWorkerId || null,
          status: "submitted"
        }).returning();
        broadcast({ type: "shift_request_created", data: newRequest });
        const [wp] = newRequest.workplaceId ? await db.select().from(workplaces).where(eq(workplaces.id, newRequest.workplaceId)) : [null];
        const wpName = wp?.name || "a workplace";
        const adminsAndHR = await db.select({ id: users.id }).from(users).where(and(
          or(eq(users.role, "admin"), eq(users.role, "hr")),
          eq(users.isActive, true),
          ne(users.id, userId)
        ));
        const notifyIds = adminsAndHR.map((u) => u.id);
        if (notifyIds.length > 0) {
          for (const uid of notifyIds) {
            await db.insert(appNotifications).values({
              userId: uid,
              type: "shift_request_created",
              title: "New Shift Request",
              body: `A ${newRequest.roleType} shift has been requested at ${wpName} on ${newRequest.date}.`,
              deepLink: `/shift-requests/${newRequest.id}`
            });
          }
          sendPushNotifications(
            notifyIds,
            "New Shift Request",
            `A ${newRequest.roleType} shift has been requested at ${wpName} on ${newRequest.date}.`,
            { type: "shift_request_created", requestId: newRequest.id }
          );
        }
        if (newRequest.requestedWorkerId) {
          await db.insert(appNotifications).values({
            userId: newRequest.requestedWorkerId,
            type: "shift_request_for_you",
            title: "Shift Requested For You",
            body: `A ${newRequest.roleType} shift at ${wpName} on ${newRequest.date} has been requested for you.`,
            deepLink: `/shift-requests/${newRequest.id}`
          });
          sendPushNotifications(
            [newRequest.requestedWorkerId],
            "Shift Requested For You",
            `A ${newRequest.roleType} shift at ${wpName} on ${newRequest.date} has been requested for you.`,
            { type: "shift_request_for_you", requestId: newRequest.id }
          );
        }
        res.json(newRequest);
      } catch (error) {
        console.error("Error creating shift request:", error);
        res.status(500).json({ error: "Failed to create shift request" });
      }
    }
  );
  app2.patch(
    "/api/shift-requests/:id",
    checkRoles("admin", "hr"),
    async (req, res) => {
      try {
        const requestId = req.params.id;
        const updates = req.body;
        const [existing] = await db.select().from(shiftRequests).where(eq(shiftRequests.id, requestId));
        if (!existing) {
          res.status(404).json({ error: "Shift request not found" });
          return;
        }
        const [updated] = await db.update(shiftRequests).set({ ...updates, updatedAt: /* @__PURE__ */ new Date() }).where(eq(shiftRequests.id, requestId)).returning();
        if (updates.status === "filled" && existing.status !== "filled") {
          await db.insert(appNotifications).values({
            userId: existing.clientId,
            type: "request_filled",
            title: "Shift Request Filled",
            body: `Your shift request for ${existing.roleType} on ${existing.date} has been filled.`,
            deepLink: `/shift-requests/${requestId}`
          });
          sendPushNotifications(
            [existing.clientId],
            "Shift Request Filled",
            `Your shift request for ${existing.roleType} on ${existing.date} has been filled.`,
            { type: "request_filled", requestId }
          );
        }
        broadcast({ type: "shift_request_updated", data: updated });
        res.json(updated);
      } catch (error) {
        console.error("Error updating shift request:", error);
        res.status(500).json({ error: "Failed to update shift request" });
      }
    }
  );
  app2.delete("/api/shift-requests/:id", async (req, res) => {
    try {
      const role = req.headers["x-user-role"];
      const userId = req.headers["x-user-id"];
      const requestId = req.params.id;
      if (!role || !userId) {
        res.status(401).json({ error: "Authentication required" });
        return;
      }
      const [existing] = await db.select().from(shiftRequests).where(eq(shiftRequests.id, requestId));
      if (!existing) {
        res.status(404).json({ error: "Shift request not found" });
        return;
      }
      if (role === "client" && existing.clientId !== userId) {
        res.status(403).json({ error: "You can only delete your own requests" });
        return;
      }
      if (role !== "admin" && role !== "hr" && role !== "client") {
        res.status(403).json({ error: "Access denied" });
        return;
      }
      const associatedShifts = await db.select({ id: shifts.id }).from(shifts).where(eq(shifts.requestId, requestId));
      if (associatedShifts.length > 0) {
        const shiftIds = associatedShifts.map((s) => s.id);
        await db.delete(shiftOffers).where(inArray(shiftOffers.shiftId, shiftIds));
        await db.delete(shiftCheckins).where(inArray(shiftCheckins.shiftId, shiftIds));
        await db.delete(shifts).where(eq(shifts.requestId, requestId));
      }
      await db.delete(shiftRequests).where(eq(shiftRequests.id, requestId));
      broadcast({ type: "shift_request_deleted", data: { id: requestId } });
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting shift request:", error);
      res.status(500).json({ error: "Failed to delete shift request" });
    }
  });
  app2.post(
    "/api/shift-requests/:id/assign",
    checkRoles("admin", "hr"),
    async (req, res) => {
      try {
        const requestId = req.params.id;
        const userId = req.headers["x-user-id"];
        const { workerId } = req.body;
        const [request] = await db.select().from(shiftRequests).where(eq(shiftRequests.id, requestId));
        if (!request) {
          res.status(404).json({ error: "Shift request not found" });
          return;
        }
        const [workplace] = await db.select().from(workplaces).where(eq(workplaces.id, request.workplaceId));
        if (workerId) {
          const [newShift] = await db.insert(shifts).values({
            requestId,
            workplaceId: request.workplaceId,
            workerUserId: workerId,
            roleType: request.roleType,
            title: `${request.roleType} - ${workplace?.name || "Unknown"}`,
            date: request.date,
            startTime: request.startTime,
            endTime: request.endTime,
            notes: request.notes,
            status: "scheduled",
            createdByUserId: userId
          }).returning();
          await db.update(shiftRequests).set({ status: "filled", updatedAt: /* @__PURE__ */ new Date() }).where(eq(shiftRequests.id, requestId));
          await db.insert(appNotifications).values({
            userId: workerId,
            type: "shift_assigned",
            title: "New Shift Assigned",
            body: `You have been assigned a ${request.roleType} shift at ${workplace?.name || "a workplace"} on ${request.date}.`,
            deepLink: `/shifts/${newShift.id}`
          });
          sendPushNotifications(
            [workerId],
            "New Shift Assigned",
            `You have been assigned a ${request.roleType} shift at ${workplace?.name || "a workplace"} on ${request.date}.`,
            { type: "shift_assigned", shiftId: newShift.id }
          );
          await db.insert(appNotifications).values({
            userId: request.clientId,
            type: "request_filled",
            title: "Shift Request Filled",
            body: `Your shift request for ${request.roleType} on ${request.date} has been filled.`,
            deepLink: `/shift-requests/${requestId}`
          });
          sendPushNotifications(
            [request.clientId],
            "Shift Request Filled",
            `Your shift request for ${request.roleType} on ${request.date} has been filled.`
          );
          broadcast({ type: "shift_created", data: newShift });
          broadcast({ type: "shift_request_updated", data: { id: requestId, status: "filled" } });
          res.json({ shift: newShift, assignedDirectly: true });
        } else {
          const [newShift] = await db.insert(shifts).values({
            requestId,
            workplaceId: request.workplaceId,
            workerUserId: null,
            roleType: request.roleType,
            title: `${request.roleType} - ${workplace?.name || "Unknown"}`,
            date: request.date,
            startTime: request.startTime,
            endTime: request.endTime,
            notes: request.notes,
            status: "scheduled",
            createdByUserId: userId
          }).returning();
          const allWorkers = await db.select({
            id: users.id,
            fullName: users.fullName,
            workerRoles: users.workerRoles
          }).from(users).where(and(
            eq(users.role, "worker"),
            eq(users.isActive, true)
          ));
          let eligibleWorkers = allWorkers.filter((w) => {
            if (w.workerRoles) {
              try {
                const roles = JSON.parse(w.workerRoles);
                if (Array.isArray(roles) && roles.length > 0) {
                  return roles.some((r) => r.toLowerCase() === request.roleType.toLowerCase());
                }
              } catch {
                return true;
              }
            }
            return true;
          });
          const existingShifts = await db.select({
            workerUserId: shifts.workerUserId,
            startTime: shifts.startTime,
            endTime: shifts.endTime
          }).from(shifts).where(and(
            eq(shifts.date, request.date),
            not(isNull(shifts.workerUserId)),
            ne(shifts.status, "cancelled")
          ));
          const conflictWorkerIds = /* @__PURE__ */ new Set();
          for (const es of existingShifts) {
            if (es.workerUserId && es.startTime) {
              const existingEnd = es.endTime || "23:59";
              const requestEnd = request.endTime || "23:59";
              if (es.startTime < requestEnd && existingEnd > request.startTime) {
                conflictWorkerIds.add(es.workerUserId);
              }
            }
          }
          eligibleWorkers = eligibleWorkers.filter((w) => !conflictWorkerIds.has(w.id));
          const offeredWorkerIds = [];
          let offerErrors = 0;
          console.log(`[BROADCAST] Shift ${newShift.id}: ${eligibleWorkers.length} eligible workers found`);
          for (const worker of eligibleWorkers) {
            try {
              await db.insert(shiftOffers).values({
                shiftId: newShift.id,
                workerId: worker.id,
                status: "pending"
              });
              await db.insert(appNotifications).values({
                userId: worker.id,
                type: "shift_offer",
                title: "New Shift Available",
                body: `A ${request.roleType} shift at ${workplace?.name || "a workplace"} on ${request.date} is available. Tap to accept.`,
                deepLink: `/shift-offers`
              });
              offeredWorkerIds.push(worker.id);
            } catch (offerErr) {
              offerErrors++;
              console.error(`[BROADCAST] Failed to create offer for worker ${worker.id} (${worker.fullName}):`, offerErr?.message || offerErr);
            }
          }
          console.log(`[BROADCAST] Shift ${newShift.id}: ${offeredWorkerIds.length} offers created, ${offerErrors} errors`);
          if (offeredWorkerIds.length > 0) {
            sendPushNotifications(
              offeredWorkerIds,
              "New Shift Available",
              `A ${request.roleType} shift at ${workplace?.name || "a workplace"} on ${request.date} is available. Tap to accept.`,
              { type: "shift_offer", shiftId: newShift.id }
            );
          }
          await db.insert(auditLog).values({
            userId,
            action: "SHIFT_BROADCAST",
            entityType: "shift",
            entityId: newShift.id,
            details: JSON.stringify({
              requestId,
              eligibleCount: eligibleWorkers.length,
              offersCreated: offeredWorkerIds.length,
              offerErrors,
              workerIds: offeredWorkerIds
            })
          });
          await db.update(shiftRequests).set({ status: "offered", updatedAt: /* @__PURE__ */ new Date() }).where(eq(shiftRequests.id, requestId));
          broadcast({ type: "shift_request_updated", data: { id: requestId, status: "offered" } });
          res.json({
            shift: newShift,
            assignedDirectly: false,
            offeredWorkers: eligibleWorkers.map((w) => ({ id: w.id, fullName: w.fullName })),
            offeredCount: eligibleWorkers.length
          });
        }
      } catch (error) {
        console.error("Error assigning shift request:", error);
        res.status(500).json({ error: "Failed to assign shift request" });
      }
    }
  );
  app2.get(
    "/api/shift-requests/:id/offers",
    checkRoles("admin", "hr"),
    async (req, res) => {
      try {
        const requestId = req.params.id;
        const requestShifts = await db.select({ id: shifts.id }).from(shifts).where(eq(shifts.requestId, requestId));
        if (requestShifts.length === 0) {
          res.json({ offers: [], counts: { pending: 0, accepted: 0, declined: 0, cancelled: 0 } });
          return;
        }
        const shiftIds = requestShifts.map((s) => s.id);
        const offers = await db.select({
          id: shiftOffers.id,
          shiftId: shiftOffers.shiftId,
          workerId: shiftOffers.workerId,
          status: shiftOffers.status,
          offeredAt: shiftOffers.offeredAt,
          respondedAt: shiftOffers.respondedAt,
          workerName: users.fullName,
          workerEmail: users.email
        }).from(shiftOffers).leftJoin(users, eq(shiftOffers.workerId, users.id)).where(inArray(shiftOffers.shiftId, shiftIds)).orderBy(desc(shiftOffers.offeredAt));
        const counts = {
          pending: offers.filter((o) => o.status === "pending").length,
          accepted: offers.filter((o) => o.status === "accepted").length,
          declined: offers.filter((o) => o.status === "declined").length,
          cancelled: offers.filter((o) => o.status === "cancelled").length
        };
        res.json({ offers, counts });
      } catch (error) {
        console.error("Error fetching shift request offers:", error);
        res.status(500).json({ error: "Failed to fetch offers" });
      }
    }
  );
  app2.get("/api/shift-offers", async (req, res) => {
    try {
      const role = req.headers["x-user-role"];
      const userId = req.headers["x-user-id"];
      if (!role || !userId) {
        res.status(401).json({ error: "Authentication required" });
        return;
      }
      const statusFilter = req.query.status;
      let results;
      if (role === "worker") {
        const conditions = [eq(shiftOffers.workerId, userId)];
        if (statusFilter && statusFilter !== "all") {
          conditions.push(eq(shiftOffers.status, statusFilter));
        }
        results = await db.select({
          id: shiftOffers.id,
          shiftId: shiftOffers.shiftId,
          workerId: shiftOffers.workerId,
          status: shiftOffers.status,
          offeredAt: shiftOffers.offeredAt,
          respondedAt: shiftOffers.respondedAt,
          cancelledAt: shiftOffers.cancelledAt,
          cancelReason: shiftOffers.cancelReason,
          shiftDate: shifts.date,
          shiftStartTime: shifts.startTime,
          shiftEndTime: shifts.endTime,
          shiftTitle: shifts.title,
          shiftRoleType: shifts.roleType,
          workplaceName: workplaces.name,
          workplaceCity: workplaces.city
        }).from(shiftOffers).innerJoin(shifts, eq(shiftOffers.shiftId, shifts.id)).leftJoin(workplaces, eq(shifts.workplaceId, workplaces.id)).where(and(...conditions)).orderBy(desc(shiftOffers.offeredAt));
      } else if (role === "admin" || role === "hr") {
        const conditions = [];
        if (statusFilter && statusFilter !== "all") {
          conditions.push(eq(shiftOffers.status, statusFilter));
        }
        results = await db.select({
          id: shiftOffers.id,
          shiftId: shiftOffers.shiftId,
          workerId: shiftOffers.workerId,
          status: shiftOffers.status,
          offeredAt: shiftOffers.offeredAt,
          respondedAt: shiftOffers.respondedAt,
          cancelledAt: shiftOffers.cancelledAt,
          cancelReason: shiftOffers.cancelReason,
          shiftDate: shifts.date,
          shiftStartTime: shifts.startTime,
          shiftEndTime: shifts.endTime,
          shiftTitle: shifts.title,
          shiftRoleType: shifts.roleType,
          workplaceName: workplaces.name,
          workplaceCity: workplaces.city,
          workerName: users.fullName
        }).from(shiftOffers).innerJoin(shifts, eq(shiftOffers.shiftId, shifts.id)).leftJoin(workplaces, eq(shifts.workplaceId, workplaces.id)).leftJoin(users, eq(shiftOffers.workerId, users.id)).where(conditions.length > 0 ? and(...conditions) : void 0).orderBy(desc(shiftOffers.offeredAt));
      } else {
        res.status(403).json({ error: "Access denied" });
        return;
      }
      res.json(results || []);
    } catch (error) {
      console.error("Error fetching shift offers:", error);
      res.status(500).json({ error: "Failed to fetch shift offers" });
    }
  });
  app2.post(
    "/api/shift-offers/:id/respond",
    checkRoles("worker"),
    async (req, res) => {
      try {
        const offerId = req.params.id;
        const userId = req.headers["x-user-id"];
        const { response } = req.body;
        if (!response || !["accepted", "declined"].includes(response)) {
          res.status(400).json({ error: "response must be 'accepted' or 'declined'" });
          return;
        }
        const [offer] = await db.select().from(shiftOffers).where(eq(shiftOffers.id, offerId));
        if (!offer) {
          res.status(404).json({ error: "Shift offer not found" });
          return;
        }
        if (offer.workerId !== userId) {
          res.status(403).json({ error: "This offer is not for you" });
          return;
        }
        if (offer.status !== "pending") {
          res.json({ success: true, message: `Offer already ${offer.status}`, alreadyResponded: true, status: offer.status });
          return;
        }
        await db.insert(auditLog).values({
          userId,
          action: `OFFER_${response.toUpperCase()}`,
          entityType: "shift_offer",
          entityId: offerId,
          details: JSON.stringify({ shiftId: offer.shiftId, response })
        });
        if (response === "accepted") {
          const [shift] = await db.select().from(shifts).where(eq(shifts.id, offer.shiftId));
          if (!shift) {
            res.status(404).json({ error: "Associated shift not found" });
            return;
          }
          if (shift.workerUserId) {
            res.status(409).json({ error: "This shift has already been accepted by another worker" });
            return;
          }
          await db.update(shifts).set({ workerUserId: userId, updatedAt: /* @__PURE__ */ new Date() }).where(and(eq(shifts.id, offer.shiftId), isNull(shifts.workerUserId)));
          const [updatedShift] = await db.select().from(shifts).where(eq(shifts.id, offer.shiftId));
          if (!updatedShift || updatedShift.workerUserId !== userId) {
            res.status(409).json({ error: "This shift has already been accepted by another worker" });
            return;
          }
          await db.update(shiftOffers).set({ status: "accepted", respondedAt: /* @__PURE__ */ new Date() }).where(eq(shiftOffers.id, offerId));
          const otherOffers = await db.select().from(shiftOffers).where(and(
            eq(shiftOffers.shiftId, offer.shiftId),
            ne(shiftOffers.id, offerId),
            eq(shiftOffers.status, "pending")
          ));
          const cancelledWorkerIds = [];
          for (const otherOffer of otherOffers) {
            await db.update(shiftOffers).set({ status: "cancelled", respondedAt: /* @__PURE__ */ new Date(), cancelledAt: /* @__PURE__ */ new Date(), cancelledBy: userId, cancelReason: "Shift filled by another worker" }).where(eq(shiftOffers.id, otherOffer.id));
            cancelledWorkerIds.push(otherOffer.workerId);
            await db.insert(auditLog).values({
              userId,
              action: "OFFER_CANCELLED_AUTO",
              entityType: "shift_offer",
              entityId: otherOffer.id,
              details: JSON.stringify({ shiftId: offer.shiftId, cancelledWorkerId: otherOffer.workerId, reason: "Shift filled by another worker" })
            });
          }
          if (shift.requestId) {
            await db.update(shiftRequests).set({ status: "filled", updatedAt: /* @__PURE__ */ new Date() }).where(eq(shiftRequests.id, shift.requestId));
          }
          const hrAdmins = await db.select({ id: users.id }).from(users).where(or(eq(users.role, "admin"), eq(users.role, "hr")));
          const [worker] = await db.select({ fullName: users.fullName }).from(users).where(eq(users.id, userId));
          for (const ha of hrAdmins) {
            await db.insert(appNotifications).values({
              userId: ha.id,
              type: "offer_accepted",
              title: "Shift Offer Accepted",
              body: `${worker?.fullName || "A worker"} accepted the ${shift.roleType || ""} shift at ${shift.title} on ${shift.date}.`,
              deepLink: `/shifts/${shift.id}`
            });
          }
          sendPushNotifications(
            hrAdmins.map((ha) => ha.id),
            "Shift Offer Accepted",
            `${worker?.fullName || "A worker"} accepted the shift on ${shift.date}.`,
            { type: "offer_accepted", shiftId: shift.id }
          );
          if (cancelledWorkerIds.length > 0) {
            for (const cwId of cancelledWorkerIds) {
              await db.insert(appNotifications).values({
                userId: cwId,
                type: "offer_cancelled",
                title: "Shift Offer Cancelled",
                body: `The ${shift.roleType || ""} shift at ${shift.title} on ${shift.date} has been filled by another worker.`,
                deepLink: `/shift-offers`
              });
            }
            sendPushNotifications(
              cancelledWorkerIds,
              "Shift Offer Cancelled",
              `The shift on ${shift.date} has been filled by another worker.`,
              { type: "offer_cancelled", shiftId: shift.id }
            );
          }
          if (shift.requestId) {
            const [req2] = await db.select().from(shiftRequests).where(eq(shiftRequests.id, shift.requestId));
            if (req2) {
              await db.insert(appNotifications).values({
                userId: req2.clientId,
                type: "request_filled",
                title: "Shift Request Filled",
                body: `Your shift request for ${req2.roleType} on ${req2.date} has been filled.`,
                deepLink: `/shift-requests/${req2.id}`
              });
              sendPushNotifications(
                [req2.clientId],
                "Shift Request Filled",
                `Your shift request for ${req2.roleType} on ${req2.date} has been filled.`
              );
            }
          }
          await db.insert(auditLog).values({
            userId,
            action: "OFFER_ACCEPTED",
            entityType: "shift_offer",
            entityId: offerId,
            details: JSON.stringify({ shiftId: offer.shiftId, cancelledOffers: cancelledWorkerIds.length })
          });
          broadcast({ type: "shift_offer_accepted", data: { offerId, shiftId: offer.shiftId } });
          res.json({ success: true, status: "accepted" });
        } else {
          await db.update(shiftOffers).set({ status: "declined", respondedAt: /* @__PURE__ */ new Date() }).where(eq(shiftOffers.id, offerId));
          const [shift] = await db.select().from(shifts).where(eq(shifts.id, offer.shiftId));
          const hrAdmins = await db.select({ id: users.id }).from(users).where(or(eq(users.role, "admin"), eq(users.role, "hr")));
          const [worker] = await db.select({ fullName: users.fullName }).from(users).where(eq(users.id, userId));
          for (const ha of hrAdmins) {
            await db.insert(appNotifications).values({
              userId: ha.id,
              type: "offer_declined",
              title: "Shift Offer Declined",
              body: `${worker?.fullName || "A worker"} declined the ${shift?.roleType || ""} shift on ${shift?.date || "unknown date"}.`,
              deepLink: `/shifts/${offer.shiftId}`
            });
          }
          sendPushNotifications(
            hrAdmins.map((ha) => ha.id),
            "Shift Offer Declined",
            `${worker?.fullName || "A worker"} declined a shift offer.`,
            { type: "offer_declined", shiftId: offer.shiftId }
          );
          await db.insert(auditLog).values({
            userId,
            action: "OFFER_DECLINED",
            entityType: "shift_offer",
            entityId: offerId,
            details: JSON.stringify({ shiftId: offer.shiftId })
          });
          broadcast({ type: "shift_offer_declined", data: { offerId, shiftId: offer.shiftId } });
          res.json({ success: true, status: "declined" });
        }
      } catch (error) {
        console.error("Error responding to shift offer:", error);
        res.status(500).json({ error: "Failed to respond to shift offer" });
      }
    }
  );
  app2.get(
    "/api/admin/debug/broadcast/:shiftId",
    checkRoles("admin", "hr"),
    async (req, res) => {
      try {
        const shiftId = req.params.shiftId;
        const [shift] = await db.select().from(shifts).where(eq(shifts.id, shiftId));
        if (!shift) {
          res.status(404).json({ error: "Shift not found" });
          return;
        }
        const offers = await db.select().from(shiftOffers).where(eq(shiftOffers.shiftId, shiftId));
        const workerIds = offers.map((o) => o.workerId);
        let tokensCount = 0;
        if (workerIds.length > 0) {
          const tokens = await db.select({ token: pushTokens.token }).from(pushTokens).where(and(inArray(pushTokens.userId, workerIds), eq(pushTokens.isActive, true)));
          tokensCount = tokens.length;
        }
        const auditEntries = await db.select().from(auditLog).where(and(eq(auditLog.entityType, "shift"), eq(auditLog.entityId, shiftId))).orderBy(desc(auditLog.createdAt));
        res.json({
          shiftId,
          shiftStatus: shift.status,
          workerUserId: shift.workerUserId,
          totalOffers: offers.length,
          offersByStatus: {
            pending: offers.filter((o) => o.status === "pending").length,
            accepted: offers.filter((o) => o.status === "accepted").length,
            declined: offers.filter((o) => o.status === "declined").length,
            cancelled: offers.filter((o) => o.status === "cancelled").length
          },
          pushTokensFound: tokensCount,
          auditTrail: auditEntries.map((a) => ({
            action: a.action,
            details: a.details ? JSON.parse(a.details) : null,
            createdAt: a.createdAt
          }))
        });
      } catch (error) {
        console.error("Error in debug broadcast:", error);
        res.status(500).json({ error: "Failed to fetch broadcast debug info" });
      }
    }
  );
  app2.post("/api/shifts/:id/blast", checkRoles("admin", "hr"), async (req, res) => {
    try {
      const shiftId = req.params.id;
      const userId = req.headers["x-user-id"];
      const [shift] = await db.select().from(shifts).where(eq(shifts.id, shiftId));
      if (!shift) {
        res.status(404).json({ error: "Shift not found" });
        return;
      }
      const [workplace] = shift.workplaceId ? await db.select().from(workplaces).where(eq(workplaces.id, shift.workplaceId)) : [null];
      const allWorkers = await db.select({
        id: users.id,
        fullName: users.fullName,
        workerRoles: users.workerRoles
      }).from(users).where(and(
        eq(users.role, "worker"),
        eq(users.isActive, true)
      ));
      let eligibleWorkers = allWorkers.filter((w) => {
        if (shift.roleType && w.workerRoles) {
          try {
            const roles = JSON.parse(w.workerRoles);
            if (Array.isArray(roles) && roles.length > 0) {
              return roles.some((r) => r.toLowerCase() === shift.roleType.toLowerCase());
            }
          } catch {
            return true;
          }
        }
        return true;
      });
      if (shift.workerUserId) {
        eligibleWorkers = eligibleWorkers.filter((w) => w.id !== shift.workerUserId);
      }
      const existingOffers = await db.select({ workerId: shiftOffers.workerId }).from(shiftOffers).where(and(
        eq(shiftOffers.shiftId, shiftId),
        inArray(shiftOffers.status, ["pending", "accepted"])
      ));
      const alreadyOffered = new Set(existingOffers.map((o) => o.workerId));
      eligibleWorkers = eligibleWorkers.filter((w) => !alreadyOffered.has(w.id));
      if (shift.date) {
        const existingShifts = await db.select({
          workerUserId: shifts.workerUserId,
          startTime: shifts.startTime,
          endTime: shifts.endTime
        }).from(shifts).where(and(
          eq(shifts.date, shift.date),
          not(isNull(shifts.workerUserId)),
          ne(shifts.status, "cancelled"),
          ne(shifts.id, shiftId)
        ));
        const conflictWorkerIds = /* @__PURE__ */ new Set();
        for (const es of existingShifts) {
          if (es.workerUserId && es.startTime && shift.startTime) {
            const existingEnd = es.endTime || "23:59";
            const shiftEnd = shift.endTime || "23:59";
            if (es.startTime < shiftEnd && existingEnd > shift.startTime) {
              conflictWorkerIds.add(es.workerUserId);
            }
          }
        }
        eligibleWorkers = eligibleWorkers.filter((w) => !conflictWorkerIds.has(w.id));
      }
      const offeredWorkerIds = [];
      let offerErrors = 0;
      console.log(`[BLAST] Shift ${shiftId}: ${eligibleWorkers.length} eligible workers found`);
      for (const worker of eligibleWorkers) {
        try {
          await db.insert(shiftOffers).values({
            shiftId,
            workerId: worker.id,
            status: "pending"
          });
          await db.insert(appNotifications).values({
            userId: worker.id,
            type: "shift_offer",
            title: "New Shift Available",
            body: `A ${shift.roleType || shift.category || ""} shift at ${workplace?.name || shift.title || "a workplace"} on ${shift.date} is available. Tap to accept.`,
            deepLink: `/shift-offers`
          });
          offeredWorkerIds.push(worker.id);
        } catch (offerErr) {
          offerErrors++;
          if (offerErr?.message?.includes("unique_shift_worker_offer")) {
            console.log(`[BLAST] Skipped duplicate offer for worker ${worker.id}`);
          } else {
            console.error(`[BLAST] Failed to create offer for worker ${worker.id}:`, offerErr?.message || offerErr);
          }
        }
      }
      if (offeredWorkerIds.length > 0) {
        sendPushNotifications(
          offeredWorkerIds,
          "New Shift Available",
          `A ${shift.roleType || shift.category || ""} shift at ${workplace?.name || shift.title || "a workplace"} on ${shift.date} is available.`,
          { type: "shift_offer", shiftId }
        );
      }
      await db.insert(auditLog).values({
        userId,
        action: "SHIFT_BLAST_ALL",
        entityType: "shift",
        entityId: shiftId,
        details: JSON.stringify({
          totalEligible: eligibleWorkers.length,
          offersCreated: offeredWorkerIds.length,
          offerErrors,
          alreadyOffered: alreadyOffered.size
        })
      });
      broadcast({ type: "shift_blast", data: { shiftId, offersCreated: offeredWorkerIds.length } });
      res.json({
        success: true,
        offersCreated: offeredWorkerIds.length,
        totalEligible: eligibleWorkers.length + alreadyOffered.size,
        alreadyOffered: alreadyOffered.size,
        errors: offerErrors
      });
    } catch (error) {
      console.error("Error blasting shift to all workers:", error);
      res.status(500).json({ error: "Failed to blast shift to workers" });
    }
  });
  app2.post("/api/profile-photo", async (req, res) => {
    try {
      const userId = req.headers["x-user-id"];
      if (!userId) {
        res.status(401).json({ error: "Authentication required" });
        return;
      }
      const { photoData } = req.body;
      if (!photoData || typeof photoData !== "string") {
        res.status(400).json({ error: "Photo data is required" });
        return;
      }
      if (!photoData.startsWith("data:image/")) {
        res.status(400).json({ error: "Invalid image format. Must be a base64 data URI." });
        return;
      }
      const sizeInBytes = Buffer.byteLength(photoData, "utf8");
      if (sizeInBytes > 5 * 1024 * 1024) {
        res.status(400).json({ error: "Photo is too large. Maximum 5MB allowed." });
        return;
      }
      const [photo] = await db.insert(userPhotos).values({
        userId,
        url: photoData,
        status: "pending_review"
      }).returning();
      res.json({ photo: { id: photo.id, status: photo.status, createdAt: photo.createdAt } });
    } catch (error) {
      console.error("Error uploading profile photo:", error);
      res.status(500).json({ error: "Failed to upload photo" });
    }
  });
  app2.get("/api/profile-photo", async (req, res) => {
    try {
      const userId = req.headers["x-user-id"];
      const targetUserId = req.query.userId || userId;
      if (!userId) {
        res.status(401).json({ error: "Authentication required" });
        return;
      }
      const photos = await db.select().from(userPhotos).where(eq(userPhotos.userId, targetUserId)).orderBy(desc(userPhotos.createdAt)).limit(1);
      res.json({ photo: photos[0] || null });
    } catch (error) {
      console.error("Error fetching profile photo:", error);
      res.status(500).json({ error: "Failed to fetch photo" });
    }
  });
  app2.get("/api/admin/photos-pending", async (req, res) => {
    try {
      const role = req.headers["x-user-role"];
      if (role !== "admin" && role !== "hr") {
        res.status(403).json({ error: "Admin or HR access required" });
        return;
      }
      const pendingPhotos = await db.select({
        id: userPhotos.id,
        userId: userPhotos.userId,
        url: userPhotos.url,
        status: userPhotos.status,
        createdAt: userPhotos.createdAt,
        userName: users.fullName,
        userEmail: users.email
      }).from(userPhotos).innerJoin(users, eq(userPhotos.userId, users.id)).where(eq(userPhotos.status, "pending_review")).orderBy(desc(userPhotos.createdAt));
      res.json({ photos: pendingPhotos });
    } catch (error) {
      console.error("Error fetching pending photos:", error);
      res.status(500).json({ error: "Failed to fetch pending photos" });
    }
  });
  app2.patch("/api/admin/photos/:photoId/review", async (req, res) => {
    try {
      const userId = req.headers["x-user-id"];
      const role = req.headers["x-user-role"];
      if (role !== "admin" && role !== "hr") {
        res.status(403).json({ error: "Admin or HR access required" });
        return;
      }
      const { photoId } = req.params;
      const { action, rejectionReason } = req.body;
      if (!["approve", "reject"].includes(action)) {
        res.status(400).json({ error: "Action must be 'approve' or 'reject'" });
        return;
      }
      const newStatus = action === "approve" ? "approved" : "rejected";
      const [updated] = await db.update(userPhotos).set({
        status: newStatus,
        reviewerId: userId,
        reviewedAt: /* @__PURE__ */ new Date(),
        rejectionReason: action === "reject" ? rejectionReason || "Photo does not meet requirements" : null
      }).where(eq(userPhotos.id, photoId)).returning();
      if (!updated) {
        res.status(404).json({ error: "Photo not found" });
        return;
      }
      if (action === "approve") {
        await db.update(users).set({ profilePhotoUrl: updated.url }).where(eq(users.id, updated.userId));
      }
      const notifTitle = action === "approve" ? "Photo Approved" : "Photo Rejected";
      const notifBody = action === "approve" ? "Your profile photo has been approved." : `Your profile photo was rejected: ${rejectionReason || "Does not meet requirements"}`;
      await db.insert(appNotifications).values({
        userId: updated.userId,
        title: notifTitle,
        body: notifBody,
        type: "photo_review"
      });
      sendPushNotifications([updated.userId], notifTitle, notifBody, { type: "photo_review" });
      res.json({ photo: { id: updated.id, status: updated.status } });
    } catch (error) {
      console.error("Error reviewing photo:", error);
      res.status(500).json({ error: "Failed to review photo" });
    }
  });
  app2.get("/api/notifications", async (req, res) => {
    try {
      const userId = req.headers["x-user-id"];
      if (!userId) {
        res.status(401).json({ error: "Authentication required" });
        return;
      }
      const limit = parseInt(req.query.limit) || 50;
      const offset = parseInt(req.query.offset) || 0;
      const notifications = await db.select().from(appNotifications).where(eq(appNotifications.userId, userId)).orderBy(desc(appNotifications.createdAt)).limit(limit).offset(offset);
      const [unreadCount] = await db.select({ count: sql2`count(*)` }).from(appNotifications).where(and(
        eq(appNotifications.userId, userId),
        isNull(appNotifications.readAt)
      ));
      res.json({ notifications, unreadCount: Number(unreadCount?.count || 0) });
    } catch (error) {
      console.error("Error fetching notifications:", error);
      res.status(500).json({ error: "Failed to fetch notifications" });
    }
  });
  app2.patch("/api/notifications/:id/read", async (req, res) => {
    try {
      const userId = req.headers["x-user-id"];
      const notifId = req.params.id;
      if (!userId) {
        res.status(401).json({ error: "Authentication required" });
        return;
      }
      const [updated] = await db.update(appNotifications).set({ readAt: /* @__PURE__ */ new Date() }).where(and(
        eq(appNotifications.id, notifId),
        eq(appNotifications.userId, userId)
      )).returning();
      if (!updated) {
        res.status(404).json({ error: "Notification not found" });
        return;
      }
      res.json(updated);
    } catch (error) {
      console.error("Error marking notification as read:", error);
      res.status(500).json({ error: "Failed to mark notification as read" });
    }
  });
  app2.post("/api/notifications/read-all", async (req, res) => {
    try {
      const userId = req.headers["x-user-id"];
      if (!userId) {
        res.status(401).json({ error: "Authentication required" });
        return;
      }
      await db.update(appNotifications).set({ readAt: /* @__PURE__ */ new Date() }).where(and(
        eq(appNotifications.userId, userId),
        isNull(appNotifications.readAt)
      ));
      res.json({ success: true });
    } catch (error) {
      console.error("Error marking all notifications as read:", error);
      res.status(500).json({ error: "Failed to mark all notifications as read" });
    }
  });
  app2.post(
    "/api/shifts/:id/checkin",
    checkRoles("worker"),
    async (req, res) => {
      try {
        const shiftId = req.params.id;
        const userId = req.headers["x-user-id"];
        const { status, note } = req.body;
        if (!status || !["on_my_way", "issue", "checked_in", "checked_out"].includes(status)) {
          res.status(400).json({ error: "status must be 'on_my_way', 'issue', 'checked_in', or 'checked_out'" });
          return;
        }
        const [shift] = await db.select().from(shifts).where(eq(shifts.id, shiftId));
        if (!shift) {
          res.status(404).json({ error: "Shift not found" });
          return;
        }
        const [checkin] = await db.insert(shiftCheckins).values({
          shiftId,
          workerId: userId,
          status,
          note: note || null
        }).returning();
        const [worker] = await db.select({ fullName: users.fullName }).from(users).where(eq(users.id, userId));
        const statusLabels = {
          on_my_way: "is on their way",
          issue: "reported an issue",
          checked_in: "has checked in",
          checked_out: "has checked out"
        };
        if (status === "issue") {
          const hrAdmins = await db.select({ id: users.id }).from(users).where(or(eq(users.role, "admin"), eq(users.role, "hr")));
          for (const ha of hrAdmins) {
            await db.insert(appNotifications).values({
              userId: ha.id,
              type: "checkin_issue",
              title: "Worker Reported Issue",
              body: `${worker?.fullName || "A worker"} reported an issue for shift on ${shift.date}${note ? ": " + note : ""}.`,
              deepLink: `/shifts/${shiftId}`
            });
          }
          sendPushNotifications(
            hrAdmins.map((ha) => ha.id),
            "Worker Reported Issue",
            `${worker?.fullName || "A worker"} reported an issue${note ? ": " + note : ""}.`,
            { type: "checkin_issue", shiftId }
          );
        } else {
          const hrAdmins = await db.select({ id: users.id }).from(users).where(or(eq(users.role, "admin"), eq(users.role, "hr")));
          sendPushNotifications(
            hrAdmins.map((ha) => ha.id),
            "Shift Status Update",
            `${worker?.fullName || "A worker"} ${statusLabels[status] || status} for shift on ${shift.date}.`,
            { type: "shift_checkin", shiftId }
          );
        }
        broadcast({ type: "shift_checkin", data: checkin });
        res.json(checkin);
      } catch (error) {
        console.error("Error creating shift checkin:", error);
        res.status(500).json({ error: "Failed to create shift checkin" });
      }
    }
  );
  app2.get("/api/shifts/:id/checkins", async (req, res) => {
    try {
      const shiftId = req.params.id;
      const userId = req.headers["x-user-id"];
      if (!userId) {
        res.status(401).json({ error: "Authentication required" });
        return;
      }
      const checkins = await db.select({
        id: shiftCheckins.id,
        shiftId: shiftCheckins.shiftId,
        workerId: shiftCheckins.workerId,
        status: shiftCheckins.status,
        note: shiftCheckins.note,
        createdAt: shiftCheckins.createdAt,
        workerName: users.fullName
      }).from(shiftCheckins).leftJoin(users, eq(shiftCheckins.workerId, users.id)).where(eq(shiftCheckins.shiftId, shiftId)).orderBy(desc(shiftCheckins.createdAt));
      res.json(checkins);
    } catch (error) {
      console.error("Error fetching shift checkins:", error);
      res.status(500).json({ error: "Failed to fetch shift checkins" });
    }
  });
  app2.get(
    "/api/shift-requests/:id/eligible-workers",
    checkRoles("admin", "hr"),
    async (req, res) => {
      try {
        const requestId = req.params.id;
        const [request] = await db.select().from(shiftRequests).where(eq(shiftRequests.id, requestId));
        if (!request) {
          res.status(404).json({ error: "Shift request not found" });
          return;
        }
        const allWorkers = await db.select({
          id: users.id,
          fullName: users.fullName,
          email: users.email,
          workerRoles: users.workerRoles
        }).from(users).where(and(
          eq(users.role, "worker"),
          eq(users.isActive, true)
        ));
        const existingShifts = await db.select({
          workerUserId: shifts.workerUserId,
          startTime: shifts.startTime,
          endTime: shifts.endTime
        }).from(shifts).where(and(
          eq(shifts.date, request.date),
          not(isNull(shifts.workerUserId)),
          ne(shifts.status, "cancelled")
        ));
        const conflictMap = /* @__PURE__ */ new Map();
        for (const es of existingShifts) {
          if (es.workerUserId && es.startTime && es.endTime) {
            if (es.startTime < request.endTime && es.endTime > request.startTime) {
              conflictMap.set(es.workerUserId, true);
            }
          }
        }
        const result = allWorkers.map((w) => {
          let roleMatch = true;
          if (w.workerRoles) {
            try {
              const roles = JSON.parse(w.workerRoles);
              if (Array.isArray(roles) && roles.length > 0) {
                roleMatch = roles.some((r) => r.toLowerCase() === request.roleType.toLowerCase());
              }
            } catch {
              roleMatch = true;
            }
          }
          return {
            id: w.id,
            fullName: w.fullName,
            email: w.email,
            workerRoles: w.workerRoles,
            roleMatch,
            hasConflict: conflictMap.has(w.id),
            eligible: roleMatch && !conflictMap.has(w.id)
          };
        });
        const eligibleOnly = result.filter((w) => w.eligible);
        res.json({
          workers: result,
          eligibleWorkers: eligibleOnly,
          eligibleCount: eligibleOnly.length,
          totalEligible: eligibleOnly.length,
          totalWorkers: result.length,
          totalActive: result.length
        });
      } catch (error) {
        console.error("Error fetching eligible workers:", error);
        res.status(500).json({ error: "Failed to fetch eligible workers" });
      }
    }
  );
  app2.post("/api/trial-reset/dry-run", checkRoles("admin"), async (_req, res) => {
    try {
      const counts = {};
      const tables = [
        { name: "shift_checkins", table: shiftCheckins },
        { name: "shift_offers", table: shiftOffers },
        { name: "shift_requests", table: shiftRequests },
        { name: "shifts", table: shifts },
        { name: "recurrence_exceptions", table: recurrenceExceptions },
        { name: "shift_series", table: shiftSeries },
        { name: "sent_reminders", table: sentReminders },
        { name: "app_notifications", table: appNotifications },
        { name: "tito_logs", table: titoLogs },
        { name: "timesheet_entries", table: timesheetEntries },
        { name: "timesheets", table: timesheets },
        { name: "payroll_batch_items", table: payrollBatchItems },
        { name: "payroll_batches", table: payrollBatches },
        { name: "messages", table: messages },
        { name: "conversations", table: conversations },
        { name: "workplace_assignments", table: workplaceAssignments },
        { name: "user_photos", table: userPhotos },
        { name: "audit_log", table: auditLog }
      ];
      for (const { name, table } of tables) {
        const result = await db.select({ count: sql2`count(*)::int` }).from(table);
        counts[name] = result[0]?.count || 0;
      }
      const nonAdminUsers = await db.select({ count: sql2`count(*)::int` }).from(users).where(ne(users.role, "admin"));
      counts["non_admin_users"] = nonAdminUsers[0]?.count || 0;
      const adminUsers = await db.select({ count: sql2`count(*)::int` }).from(users).where(eq(users.role, "admin"));
      counts["admin_users_preserved"] = adminUsers[0]?.count || 0;
      const totalRecords = Object.entries(counts).filter(([k]) => k !== "admin_users_preserved").reduce((sum, [, v]) => sum + v, 0);
      res.json({ counts, totalRecords, adminUsersPreserved: counts["admin_users_preserved"] });
    } catch (error) {
      console.error("Error in trial reset dry run:", error);
      res.status(500).json({ error: "Failed to perform dry run" });
    }
  });
  app2.post("/api/trial-reset/execute", checkRoles("admin"), async (req, res) => {
    try {
      const userId = req.headers["x-user-id"];
      const { confirmPhrase } = req.body;
      if (confirmPhrase !== "RESET TRIAL DATA") {
        res.status(400).json({ error: "Invalid confirmation phrase. Type 'RESET TRIAL DATA' to proceed." });
        return;
      }
      const deletionOrder = [
        { name: "export_audit_logs", q: sql2`DELETE FROM export_audit_logs` },
        { name: "shift_checkins", q: sql2`DELETE FROM shift_checkins` },
        { name: "shift_offers", q: sql2`DELETE FROM shift_offers` },
        { name: "shift_requests", q: sql2`DELETE FROM shift_requests` },
        { name: "shifts", q: sql2`DELETE FROM shifts` },
        { name: "recurrence_exceptions", q: sql2`DELETE FROM recurrence_exceptions` },
        { name: "shift_series", q: sql2`DELETE FROM shift_series` },
        { name: "sent_reminders", q: sql2`DELETE FROM sent_reminders` },
        { name: "app_notifications", q: sql2`DELETE FROM app_notifications` },
        { name: "tito_logs", q: sql2`DELETE FROM tito_logs` },
        { name: "timesheet_entries", q: sql2`DELETE FROM timesheet_entries` },
        { name: "timesheets", q: sql2`DELETE FROM timesheets` },
        { name: "payroll_batch_items", q: sql2`DELETE FROM payroll_batch_items` },
        { name: "payroll_batches", q: sql2`DELETE FROM payroll_batches` },
        { name: "messages", q: sql2`DELETE FROM messages` },
        { name: "message_logs", q: sql2`DELETE FROM message_logs` },
        { name: "conversations", q: sql2`DELETE FROM conversations` },
        { name: "workplace_assignments", q: sql2`DELETE FROM workplace_assignments` },
        { name: "user_photos", q: sql2`DELETE FROM user_photos` },
        { name: "push_tokens", q: sql2`DELETE FROM push_tokens WHERE user_id NOT IN (SELECT id FROM users WHERE role = 'admin')` },
        { name: "worker_applications", q: sql2`DELETE FROM worker_applications` },
        { name: "payment_profiles", q: sql2`DELETE FROM payment_profiles WHERE user_id NOT IN (SELECT id FROM users WHERE role = 'admin')` },
        { name: "non_admin_users", q: sql2`DELETE FROM users WHERE role != 'admin'` },
        { name: "audit_log", q: sql2`DELETE FROM audit_log` }
      ];
      const results = {};
      for (const { name, q } of deletionOrder) {
        try {
          await db.execute(q);
          results[name] = "cleared";
        } catch (e) {
          results[name] = `error: ${e.message}`;
        }
      }
      await db.insert(auditLog).values({
        userId,
        action: "trial_reset",
        entityType: "system",
        details: JSON.stringify({ results, timestamp: (/* @__PURE__ */ new Date()).toISOString() })
      });
      res.json({ success: true, results, message: "Trial data has been reset. Admin accounts are preserved." });
    } catch (error) {
      console.error("Error executing trial reset:", error);
      res.status(500).json({ error: "Failed to execute trial reset" });
    }
  });
  async function processShiftReminders() {
    try {
      const now = /* @__PURE__ */ new Date();
      const today = now.toISOString().split("T")[0];
      const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1e3).toISOString().split("T")[0];
      const upcomingShifts = await db.select({
        id: shifts.id,
        title: shifts.title,
        date: shifts.date,
        startTime: shifts.startTime,
        workerUserId: shifts.workerUserId,
        workplaceName: workplaces.name
      }).from(shifts).leftJoin(workplaces, eq(shifts.workplaceId, workplaces.id)).where(
        and(
          or(eq(shifts.date, today), eq(shifts.date, tomorrow)),
          eq(shifts.status, "scheduled"),
          sql2`${shifts.workerUserId} IS NOT NULL`
        )
      );
      for (const shift of upcomingShifts) {
        if (!shift.workerUserId) continue;
        const isToday = shift.date === today;
        const reminderType = isToday ? "day_of" : "day_before";
        const existing = await db.select().from(sentReminders).where(
          and(
            eq(sentReminders.shiftId, shift.id),
            eq(sentReminders.workerId, shift.workerUserId),
            eq(sentReminders.reminderType, reminderType)
          )
        ).limit(1);
        if (existing.length > 0) continue;
        const title = isToday ? "Shift Today" : "Shift Tomorrow";
        const body = `${shift.title} at ${shift.workplaceName || "workplace"} - ${shift.startTime}`;
        try {
          await sendPushNotifications([shift.workerUserId], title, body, {
            type: "shift_reminder",
            shiftId: shift.id
          });
          await db.insert(sentReminders).values({
            shiftId: shift.id,
            workerId: shift.workerUserId,
            reminderType
          });
          await db.insert(appNotifications).values({
            userId: shift.workerUserId,
            title,
            body,
            type: "shift_reminder",
            data: JSON.stringify({ shiftId: shift.id })
          });
        } catch (err) {
          console.error(`Failed to send reminder for shift ${shift.id}:`, err);
        }
      }
    } catch (error) {
      console.error("Error processing shift reminders:", error);
    }
  }
  async function processMissedShiftDetection() {
    try {
      const nowToronto = new Date((/* @__PURE__ */ new Date()).toLocaleString("en-US", { timeZone: "America/Toronto" }));
      const todayStr = nowToronto.toISOString().split("T")[0];
      const currentHour = nowToronto.getHours();
      const currentMin = nowToronto.getMinutes();
      const currentTimeMinutes = currentHour * 60 + currentMin;
      const todayShifts = await db.select().from(shifts).where(
        and(
          eq(shifts.date, todayStr),
          eq(shifts.status, "scheduled"),
          not(isNull(shifts.workerUserId))
        )
      );
      for (const shift of todayShifts) {
        if (!shift.startTime || !shift.workerUserId) continue;
        const [h, m] = shift.startTime.split(":").map(Number);
        const shiftStartMinutes = h * 60 + m;
        const minutesLate = currentTimeMinutes - shiftStartMinutes;
        if (minutesLate < 15 || minutesLate > 120) continue;
        const existingTito = await db.select({ id: titoLogs.id }).from(titoLogs).where(and(
          eq(titoLogs.shiftId, shift.id),
          eq(titoLogs.workerId, shift.workerUserId),
          not(isNull(titoLogs.timeIn))
        )).limit(1);
        if (existingTito.length > 0) continue;
        const alreadyNotified = await db.select({ id: sentReminders.id }).from(sentReminders).where(and(
          eq(sentReminders.shiftId, shift.id),
          eq(sentReminders.workerId, shift.workerUserId),
          eq(sentReminders.reminderType, minutesLate >= 30 ? "noshow_hr" : "missed_worker")
        )).limit(1);
        if (alreadyNotified.length > 0) continue;
        const [worker] = await db.select({ fullName: users.fullName }).from(users).where(eq(users.id, shift.workerUserId));
        const [workplace] = shift.workplaceId ? await db.select({ name: workplaces.name }).from(workplaces).where(eq(workplaces.id, shift.workplaceId)) : [null];
        const workerName = worker?.fullName || "Worker";
        const wpName = workplace?.name || "workplace";
        if (minutesLate >= 30) {
          const hrAdmins = await db.select({ id: users.id }).from(users).where(and(inArray(users.role, ["admin", "hr"]), eq(users.isActive, true)));
          const hrIds = hrAdmins.map((u) => u.id);
          for (const hrId of hrIds) {
            await db.insert(appNotifications).values({
              userId: hrId,
              type: "no_show_risk",
              title: "Possible No-Show",
              body: `${workerName} has not clocked in for their ${shift.startTime} shift at ${wpName}. ${minutesLate} minutes overdue.`,
              deepLink: `/shifts/${shift.id}`
            });
          }
          sendPushNotifications(
            hrIds,
            "Possible No-Show",
            `${workerName} has not clocked in for their shift at ${wpName}. ${minutesLate} min overdue.`,
            { type: "no_show_risk", shiftId: shift.id }
          );
          await db.insert(sentReminders).values({
            shiftId: shift.id,
            workerId: shift.workerUserId,
            reminderType: "noshow_hr"
          }).onConflictDoNothing();
          await db.insert(auditLog).values({
            userId: shift.workerUserId,
            action: "NO_SHOW_RISK",
            entityType: "shift",
            entityId: shift.id,
            details: JSON.stringify({ minutesLate, workerName, workplaceName: wpName })
          });
          console.log(`[MISSED-SHIFT] No-show alert for ${workerName}, shift ${shift.id}, ${minutesLate} min late`);
        } else if (minutesLate >= 15) {
          await db.insert(appNotifications).values({
            userId: shift.workerUserId,
            type: "missed_shift_prompt",
            title: "Shift Started",
            body: `Your shift at ${wpName} started ${minutesLate} minutes ago. Please clock in or contact HR if you have an issue.`,
            deepLink: `/clock-in`
          });
          sendPushNotifications(
            [shift.workerUserId],
            "Shift Started",
            `Your shift at ${wpName} started ${minutesLate} minutes ago. Please clock in.`,
            { type: "missed_shift_prompt", shiftId: shift.id }
          );
          await db.insert(sentReminders).values({
            shiftId: shift.id,
            workerId: shift.workerUserId,
            reminderType: "missed_worker"
          }).onConflictDoNothing();
          console.log(`[MISSED-SHIFT] Worker prompt for ${workerName}, shift ${shift.id}, ${minutesLate} min late`);
        }
      }
    } catch (error) {
      console.error("[MISSED-SHIFT] Detection error:", error);
    }
  }
  setInterval(processMissedShiftDetection, 5 * 60 * 1e3);
  processMissedShiftDetection();
  processShiftReminders();
  setInterval(processShiftReminders, 15 * 60 * 1e3);
  const httpServer = createServer(app2);
  return httpServer;
}

// server/payroll-hours.ts
import { eq as eq2, and as and2, gte as gte2, lte as lte2, inArray as inArray2 } from "drizzle-orm";
import * as XLSX from "xlsx";
import * as archiver from "archiver";
function checkAdminRole() {
  return (req, res, next) => {
    const role = req.headers["x-user-role"];
    if (role !== "admin") {
      res.status(403).json({ error: "Forbidden: Admin access required" });
      return;
    }
    next();
  };
}
function calculatePayableHours(timeIn, timeOut) {
  if (!timeIn || !timeOut) {
    return { rawMinutes: 0, rawHours: 0, deductionHours: 0, netHours: 0, netHoursRounded: 0, isIncomplete: true };
  }
  const rawMinutes = (timeOut.getTime() - timeIn.getTime()) / (1e3 * 60);
  if (rawMinutes <= 0) {
    return { rawMinutes: 0, rawHours: 0, deductionHours: 0, netHours: 0, netHoursRounded: 0, isIncomplete: true };
  }
  const rawHours = rawMinutes / 60;
  const deductionHours = rawHours >= 5 ? 0.5 : 0;
  const netHours = Math.max(0, rawHours - deductionHours);
  const netHoursRounded = Math.round(netHours * 4) / 4;
  return { rawMinutes, rawHours: Math.round(rawHours * 100) / 100, deductionHours, netHours: Math.round(netHours * 100) / 100, netHoursRounded, isIncomplete: false };
}
function getCutoffPeriods(year) {
  if (year !== 2026) {
    return [];
  }
  const periods = [
    [1, "2025-12-27", "2026-01-09"],
    [2, "2026-01-10", "2026-01-23"],
    [3, "2026-01-24", "2026-02-06"],
    [4, "2026-02-07", "2026-02-20"],
    [5, "2026-02-21", "2026-03-06"],
    [6, "2026-03-07", "2026-03-20"],
    [7, "2026-03-21", "2026-04-03"],
    [8, "2026-04-04", "2026-04-17"],
    [9, "2026-04-18", "2026-05-01"],
    [10, "2026-05-02", "2026-05-15"],
    [11, "2026-05-16", "2026-05-29"],
    [12, "2026-05-30", "2026-06-12"],
    [13, "2026-06-13", "2026-06-26"],
    [14, "2026-06-27", "2026-07-10"],
    [15, "2026-07-11", "2026-07-24"],
    [16, "2026-07-25", "2026-08-07"],
    [17, "2026-08-08", "2026-08-21"],
    [18, "2026-08-22", "2026-09-04"],
    [19, "2026-09-05", "2026-09-18"],
    [20, "2026-09-19", "2026-10-02"],
    [21, "2026-10-03", "2026-10-16"],
    [22, "2026-10-17", "2026-10-30"],
    [23, "2026-10-31", "2026-11-13"],
    [24, "2026-11-17", "2026-11-27"],
    [25, "2026-11-28", "2026-12-11"],
    [26, "2026-12-12", "2026-12-25"]
  ];
  return periods.map(([period, startDate, endDate]) => ({
    period,
    startDate,
    endDate,
    label: `Period ${period}: ${formatDateLabel(startDate)} - ${formatDateLabel(endDate)}`
  }));
}
function formatDateLabel(dateStr) {
  const [y, m, d] = dateStr.split("-").map(Number);
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return `${months[m - 1]} ${d}`;
}
function getWeeklyWindow(weekStartStr) {
  const startDate = /* @__PURE__ */ new Date(weekStartStr + "T00:00:00");
  const endDate = new Date(startDate);
  endDate.setDate(endDate.getDate() + 6);
  const end = endDate.toISOString().split("T")[0];
  return { start: weekStartStr, end };
}
function getMondaysForYear(year) {
  const mondays = [];
  const date2 = new Date(year, 0, 1);
  while (date2.getDay() !== 1) {
    date2.setDate(date2.getDate() + 1);
  }
  while (date2.getFullYear() <= year) {
    const iso = date2.toISOString().split("T")[0];
    mondays.push(iso);
    date2.setDate(date2.getDate() + 7);
    if (date2.getFullYear() > year && date2.getMonth() > 0) break;
  }
  return mondays;
}
async function fetchLogsInRange(startDate, endDate, hotelId) {
  const startTs = /* @__PURE__ */ new Date(startDate + "T00:00:00.000Z");
  const endTs = /* @__PURE__ */ new Date(endDate + "T23:59:59.999Z");
  let conditions = [
    eq2(titoLogs.status, "approved"),
    gte2(titoLogs.timeIn, startTs),
    lte2(titoLogs.timeIn, endTs)
  ];
  if (hotelId && hotelId !== "all") {
    conditions.push(eq2(titoLogs.workplaceId, hotelId));
  }
  const rows = await db.select({
    logId: titoLogs.id,
    workerId: titoLogs.workerId,
    workerName: users.fullName,
    workerEmail: users.email,
    workplaceId: titoLogs.workplaceId,
    workplaceName: workplaces.name,
    timeIn: titoLogs.timeIn,
    timeOut: titoLogs.timeOut,
    status: titoLogs.status
  }).from(titoLogs).innerJoin(users, eq2(titoLogs.workerId, users.id)).leftJoin(workplaces, eq2(titoLogs.workplaceId, workplaces.id)).where(and2(...conditions)).orderBy(titoLogs.timeIn);
  return rows.map((r) => ({
    logId: r.logId,
    workerId: r.workerId,
    workerName: r.workerName,
    workerEmail: r.workerEmail,
    workplaceId: r.workplaceId,
    workplaceName: r.workplaceName || "Unassigned",
    timeIn: r.timeIn,
    timeOut: r.timeOut,
    logDate: r.timeIn ? r.timeIn.toISOString().split("T")[0] : "",
    status: r.status
  }));
}
async function fetchPaymentProfiles(workerIds) {
  const map = /* @__PURE__ */ new Map();
  if (workerIds.length === 0) return map;
  const profiles = await db.select().from(paymentProfiles).where(inArray2(paymentProfiles.workerUserId, workerIds));
  for (const p of profiles) {
    let bankRef = null;
    if (p.bankInstitution || p.bankTransit || p.bankAccount) {
      bankRef = [p.bankInstitution, p.bankTransit, p.bankAccount ? `****${p.bankAccount.slice(-4)}` : null].filter(Boolean).join("-");
    }
    if (p.voidChequeFileId) {
      bankRef = bankRef ? `${bankRef} (VC: ${p.voidChequeFileId})` : `VC: ${p.voidChequeFileId}`;
    }
    map.set(p.workerUserId, { etransferEmail: p.etransferEmail, bankRef });
  }
  return map;
}
async function fetchPaymentProfilesFull(workerIds) {
  const map = /* @__PURE__ */ new Map();
  if (workerIds.length === 0) return map;
  const profiles = await db.select().from(paymentProfiles).where(inArray2(paymentProfiles.workerUserId, workerIds));
  for (const p of profiles) {
    let bankRef = null;
    if (p.bankInstitution || p.bankTransit || p.bankAccount) {
      bankRef = [p.bankInstitution, p.bankTransit, p.bankAccount].filter(Boolean).join("-");
    }
    if (p.voidChequeFileId) {
      bankRef = bankRef ? `${bankRef} (VC: ${p.voidChequeFileId})` : `VC: ${p.voidChequeFileId}`;
    }
    map.set(p.workerUserId, { etransferEmail: p.etransferEmail, bankRef });
  }
  return map;
}
function aggregateByHotel(logs, paymentMap) {
  const hotelMap = /* @__PURE__ */ new Map();
  for (const log2 of logs) {
    const hKey = log2.workplaceId || "unassigned";
    if (!hotelMap.has(hKey)) {
      hotelMap.set(hKey, { workplaceId: hKey, workplaceName: log2.workplaceName, workers: /* @__PURE__ */ new Map() });
    }
    const hotel = hotelMap.get(hKey);
    if (!hotel.workers.has(log2.workerId)) {
      const payment = paymentMap.get(log2.workerId);
      hotel.workers.set(log2.workerId, {
        workerId: log2.workerId,
        workerName: log2.workerName,
        workerEmail: log2.workerEmail,
        totalHoursRounded: 0,
        totalRawHours: 0,
        logsCount: 0,
        incompleteLogs: 0,
        datesWorked: [],
        etransferEmail: payment?.etransferEmail || null,
        bankRef: payment?.bankRef || null,
        logs: []
      });
    }
    const worker = hotel.workers.get(log2.workerId);
    const calc = calculatePayableHours(log2.timeIn, log2.timeOut);
    worker.totalHoursRounded += calc.netHoursRounded;
    worker.totalRawHours += calc.rawHours;
    worker.logsCount += 1;
    if (calc.isIncomplete) worker.incompleteLogs += 1;
    if (log2.logDate && !worker.datesWorked.includes(log2.logDate)) {
      worker.datesWorked.push(log2.logDate);
    }
    worker.logs.push({
      logId: log2.logId,
      date: log2.logDate,
      timeIn: log2.timeIn ? log2.timeIn.toISOString() : null,
      timeOut: log2.timeOut ? log2.timeOut.toISOString() : null,
      rawHours: calc.rawHours,
      deductionHours: calc.deductionHours,
      netHoursRounded: calc.netHoursRounded,
      isIncomplete: calc.isIncomplete
    });
  }
  const groups = [];
  for (const [, hotel] of hotelMap) {
    const workers = Array.from(hotel.workers.values()).map((w) => ({
      ...w,
      totalHoursRounded: Math.round(w.totalHoursRounded * 100) / 100,
      totalRawHours: Math.round(w.totalRawHours * 100) / 100,
      datesWorked: w.datesWorked.sort()
    }));
    groups.push({
      workplaceId: hotel.workplaceId,
      workplaceName: hotel.workplaceName,
      workers,
      totalHours: workers.reduce((s, w) => s + w.totalHoursRounded, 0),
      totalLogs: workers.reduce((s, w) => s + w.logsCount, 0)
    });
  }
  return groups.sort((a, b) => a.workplaceName.localeCompare(b.workplaceName));
}
function generateTimesheetRows(groups, windowLabel, startDate, endDate, generatedAt) {
  const header = ["Hotel", "Period", "PeriodStart", "PeriodEnd", "WorkerName", "WorkerId", "DatesWorked", "HoursWorked", "ShiftsWorked", "EtransferEmail", "VoidChequeOrBankRef", "GeneratedAt"];
  const rows = [header];
  for (const hotel of groups) {
    for (const worker of hotel.workers) {
      rows.push([
        hotel.workplaceName,
        windowLabel,
        startDate,
        endDate,
        worker.workerName,
        worker.workerId,
        worker.datesWorked.join(", "),
        worker.totalHoursRounded,
        worker.logsCount,
        worker.etransferEmail || "",
        worker.bankRef || "",
        generatedAt
      ]);
    }
  }
  return rows;
}
function generateDetailedRows(groups, windowLabel, startDate, endDate, generatedAt) {
  const header = ["Hotel", "Period", "PeriodStart", "PeriodEnd", "WorkerName", "WorkerId", "Date", "TimeIn", "TimeOut", "RawHours", "BreakDeduction", "NetHoursRounded", "Incomplete", "GeneratedAt"];
  const rows = [header];
  for (const hotel of groups) {
    for (const worker of hotel.workers) {
      for (const log2 of worker.logs) {
        rows.push([
          hotel.workplaceName,
          windowLabel,
          startDate,
          endDate,
          worker.workerName,
          worker.workerId,
          log2.date,
          log2.timeIn || "",
          log2.timeOut || "",
          log2.rawHours,
          log2.deductionHours,
          log2.netHoursRounded,
          log2.isIncomplete ? "Yes" : "No",
          generatedAt
        ]);
      }
    }
  }
  return rows;
}
function generatePaymentSummaryRows(groups, windowLabel, startDate, endDate, generatedAt) {
  const header = ["Hotel", "Period", "PeriodStart", "PeriodEnd", "WorkerName", "WorkerId", "TotalHours", "ShiftsWorked", "EtransferEmail", "VoidChequeOrBankRef", "GeneratedAt"];
  const rows = [header];
  for (const hotel of groups) {
    for (const worker of hotel.workers) {
      rows.push([
        hotel.workplaceName,
        windowLabel,
        startDate,
        endDate,
        worker.workerName,
        worker.workerId,
        worker.totalHoursRounded,
        worker.logsCount,
        worker.etransferEmail || "",
        worker.bankRef || "",
        generatedAt
      ]);
    }
    rows.push([
      hotel.workplaceName,
      windowLabel,
      startDate,
      endDate,
      "=== HOTEL TOTAL ===",
      "",
      hotel.totalHours,
      hotel.totalLogs,
      "",
      "",
      generatedAt
    ]);
  }
  return rows;
}
function generateInvoiceSummaryRows(groups, weekStart, weekEnd, generatedAt) {
  const header = ["Hotel", "WeekStart", "WeekEnd", "WorkerName", "WorkerId", "TotalHours", "LogsCount", "GeneratedAt"];
  const rows = [header];
  for (const hotel of groups) {
    for (const worker of hotel.workers) {
      rows.push([
        hotel.workplaceName,
        weekStart,
        weekEnd,
        worker.workerName,
        worker.workerId,
        worker.totalHoursRounded,
        worker.logsCount,
        generatedAt
      ]);
    }
    rows.push([
      hotel.workplaceName,
      weekStart,
      weekEnd,
      "=== HOTEL TOTAL ===",
      "",
      hotel.totalHours,
      hotel.totalLogs,
      generatedAt
    ]);
  }
  return rows;
}
function rowsToBuffer(rows, format, sheetName = "Sheet1") {
  if (format === "csv") {
    const csvContent = rows.map(
      (row) => row.map((cell) => {
        const str = String(cell ?? "");
        if (str.includes(",") || str.includes('"') || str.includes("\n")) {
          return `"${str.replace(/"/g, '""')}"`;
        }
        return str;
      }).join(",")
    ).join("\n");
    return Buffer.from(csvContent, "utf-8");
  }
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet(rows);
  XLSX.utils.book_append_sheet(wb, ws, sheetName);
  return Buffer.from(XLSX.write(wb, { bookType: "xlsx", type: "buffer" }));
}
function sanitizeFileName(name) {
  return name.replace(/[^a-zA-Z0-9_-]/g, "_").replace(/_+/g, "_");
}
function registerPayrollHoursRoutes(app2) {
  app2.get("/api/admin/hours/cutoffs", checkAdminRole(), async (req, res) => {
    try {
      const year = parseInt(req.query.year) || 2026;
      const periods = getCutoffPeriods(year);
      res.json({ year, periods });
    } catch (error) {
      console.error("Error fetching cutoffs:", error);
      res.status(500).json({ error: "Failed to fetch cutoff periods" });
    }
  });
  app2.get("/api/admin/hours/weeks", checkAdminRole(), async (req, res) => {
    try {
      const year = parseInt(req.query.year) || 2026;
      const mondays = getMondaysForYear(year);
      const weeks = mondays.map((monday, i) => {
        const window = getWeeklyWindow(monday);
        return {
          weekNumber: i + 1,
          startDate: window.start,
          endDate: window.end,
          label: `Week ${i + 1}: ${formatDateLabel(window.start)} - ${formatDateLabel(window.end)}`
        };
      });
      res.json({ year, weeks });
    } catch (error) {
      console.error("Error fetching weeks:", error);
      res.status(500).json({ error: "Failed to fetch weeks" });
    }
  });
  app2.get("/api/admin/hours/hotels", checkAdminRole(), async (_req, res) => {
    try {
      const hotels = await db.select({ id: workplaces.id, name: workplaces.name, isActive: workplaces.isActive }).from(workplaces).orderBy(workplaces.name);
      res.json({ hotels });
    } catch (error) {
      console.error("Error fetching hotels:", error);
      res.status(500).json({ error: "Failed to fetch hotels" });
    }
  });
  app2.get("/api/admin/hours/aggregate", checkAdminRole(), async (req, res) => {
    try {
      const mode = req.query.mode;
      const hotelId = req.query.hotelId || "all";
      let startDate, endDate, windowLabel;
      if (mode === "weekly") {
        const weekStart = req.query.weekStart;
        if (!weekStart) {
          res.status(400).json({ error: "weekStart is required for weekly mode" });
          return;
        }
        const window = getWeeklyWindow(weekStart);
        startDate = window.start;
        endDate = window.end;
        windowLabel = `Week: ${formatDateLabel(startDate)} - ${formatDateLabel(endDate)}`;
      } else if (mode === "cutoff") {
        const year = parseInt(req.query.year) || 2026;
        const period = parseInt(req.query.period);
        if (!period || period < 1 || period > 26) {
          res.status(400).json({ error: "period (1-26) is required for cutoff mode" });
          return;
        }
        const periods = getCutoffPeriods(year);
        const p = periods.find((pp) => pp.period === period);
        if (!p) {
          res.status(400).json({ error: `Period ${period} not found for year ${year}` });
          return;
        }
        startDate = p.startDate;
        endDate = p.endDate;
        windowLabel = `Period ${period}: ${formatDateLabel(startDate)} - ${formatDateLabel(endDate)}`;
      } else {
        res.status(400).json({ error: "mode must be 'weekly' or 'cutoff'" });
        return;
      }
      const logs = await fetchLogsInRange(startDate, endDate, hotelId);
      const workerIds = [...new Set(logs.map((l) => l.workerId))];
      const paymentMap = await fetchPaymentProfiles(workerIds);
      const groups = aggregateByHotel(logs, paymentMap);
      const grandTotalHours = groups.reduce((s, g) => s + g.totalHours, 0);
      const grandTotalLogs = groups.reduce((s, g) => s + g.totalLogs, 0);
      res.json({
        mode,
        startDate,
        endDate,
        windowLabel,
        hotelId,
        hotels: groups,
        grandTotalHours: Math.round(grandTotalHours * 100) / 100,
        grandTotalLogs
      });
    } catch (error) {
      console.error("Error in aggregation:", error);
      res.status(500).json({ error: "Failed to aggregate hours data" });
    }
  });
  app2.get("/api/admin/hours/export", checkAdminRole(), async (req, res) => {
    try {
      const mode = req.query.mode;
      const format = req.query.format || "csv";
      const type = req.query.type;
      const hotelId = req.query.hotelId || "all";
      if (!["csv", "xlsx"].includes(format)) {
        res.status(400).json({ error: "format must be csv or xlsx" });
        return;
      }
      let startDate, endDate, windowLabel, filePrefix;
      let periodYear = 2026, periodNumber = 0;
      if (mode === "weekly") {
        const weekStart = req.query.weekStart;
        if (!weekStart) {
          res.status(400).json({ error: "weekStart required" });
          return;
        }
        const window = getWeeklyWindow(weekStart);
        startDate = window.start;
        endDate = window.end;
        windowLabel = `Week: ${formatDateLabel(startDate)} - ${formatDateLabel(endDate)}`;
        filePrefix = `WFC_Weekly_${weekStart}`;
        periodYear = parseInt(weekStart.substring(0, 4));
      } else if (mode === "cutoff") {
        const year = parseInt(req.query.year) || 2026;
        const period = parseInt(req.query.period);
        const periods = getCutoffPeriods(year);
        const p = periods.find((pp) => pp.period === period);
        if (!p) {
          res.status(400).json({ error: `Period ${period} not found` });
          return;
        }
        startDate = p.startDate;
        endDate = p.endDate;
        windowLabel = `Period ${period}`;
        filePrefix = `WFC_Payroll_${year}_Period-${String(period).padStart(2, "0")}`;
        periodYear = year;
        periodNumber = period;
      } else {
        res.status(400).json({ error: "mode must be weekly or cutoff" });
        return;
      }
      const logs = await fetchLogsInRange(startDate, endDate, hotelId);
      const workerIds = [...new Set(logs.map((l) => l.workerId))];
      const paymentMap = await fetchPaymentProfilesFull(workerIds);
      const groups = aggregateByHotel(logs, paymentMap);
      const generatedAt = (/* @__PURE__ */ new Date()).toISOString();
      let rows;
      let sheetName;
      let typeSuffix;
      switch (type) {
        case "invoiceSummary":
          rows = generateInvoiceSummaryRows(groups, startDate, endDate, generatedAt);
          sheetName = "Invoice Summary";
          typeSuffix = "InvoiceSummary";
          break;
        case "invoiceDetailed":
          rows = generateDetailedRows(groups, windowLabel, startDate, endDate, generatedAt);
          sheetName = "Invoice Detailed";
          typeSuffix = "InvoiceDetailed";
          break;
        case "payrollTimesheet":
          rows = generateTimesheetRows(groups, windowLabel, startDate, endDate, generatedAt);
          sheetName = "Payroll Timesheet";
          typeSuffix = "Timesheet";
          break;
        case "payrollPaymentSummary":
          rows = generatePaymentSummaryRows(groups, windowLabel, startDate, endDate, generatedAt);
          sheetName = "Payment Summary";
          typeSuffix = "PaymentSummary";
          break;
        default:
          res.status(400).json({ error: "type must be invoiceSummary, invoiceDetailed, payrollTimesheet, or payrollPaymentSummary" });
          return;
      }
      const hotelName = hotelId === "all" ? "AllHotels" : sanitizeFileName(groups[0]?.workplaceName || "Hotel");
      const fileName = `${filePrefix}_${hotelName}_${typeSuffix}.${format}`;
      const buffer = rowsToBuffer(rows, format, sheetName);
      try {
        await db.insert(exportAuditLogs).values({
          adminUserId: req.headers["x-user-id"] || "unknown",
          exportType: type,
          fileFormat: format,
          periodYear,
          periodNumber,
          workplaceId: hotelId === "all" ? null : hotelId,
          workplaceName: hotelId === "all" ? "All Hotels" : groups[0]?.workplaceName || null,
          fileName
        });
      } catch (auditErr) {
        console.error("Audit log error (non-blocking):", auditErr);
      }
      const contentType = format === "csv" ? "text/csv" : "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
      res.setHeader("Content-Type", contentType);
      res.setHeader("Content-Disposition", `attachment; filename="${fileName}"`);
      res.send(buffer);
    } catch (error) {
      console.error("Error in export:", error);
      res.status(500).json({ error: "Failed to generate export" });
    }
  });
  app2.get("/api/admin/hours/export/all", checkAdminRole(), async (req, res) => {
    try {
      const mode = req.query.mode;
      const format = req.query.format || "csv";
      const type = req.query.type;
      let startDate, endDate, windowLabel, filePrefix;
      let periodYear = 2026, periodNumber = 0;
      if (mode === "weekly") {
        const weekStart = req.query.weekStart;
        if (!weekStart) {
          res.status(400).json({ error: "weekStart required" });
          return;
        }
        const window = getWeeklyWindow(weekStart);
        startDate = window.start;
        endDate = window.end;
        windowLabel = `Week: ${formatDateLabel(startDate)} - ${formatDateLabel(endDate)}`;
        filePrefix = `WFC_Weekly_${weekStart}`;
        periodYear = parseInt(weekStart.substring(0, 4));
      } else if (mode === "cutoff") {
        const year = parseInt(req.query.year) || 2026;
        const period = parseInt(req.query.period);
        const periods = getCutoffPeriods(year);
        const p = periods.find((pp) => pp.period === period);
        if (!p) {
          res.status(400).json({ error: `Period ${period} not found` });
          return;
        }
        startDate = p.startDate;
        endDate = p.endDate;
        windowLabel = `Period ${period}`;
        filePrefix = `WFC_Payroll_${year}_Period-${String(period).padStart(2, "0")}`;
        periodYear = year;
        periodNumber = period;
      } else {
        res.status(400).json({ error: "mode must be weekly or cutoff" });
        return;
      }
      const allLogs = await fetchLogsInRange(startDate, endDate);
      const workerIds = [...new Set(allLogs.map((l) => l.workerId))];
      const paymentMap = await fetchPaymentProfilesFull(workerIds);
      const allGroups = aggregateByHotel(allLogs, paymentMap);
      const generatedAt = (/* @__PURE__ */ new Date()).toISOString();
      res.setHeader("Content-Type", "application/zip");
      res.setHeader("Content-Disposition", `attachment; filename="${filePrefix}_AllHotels.zip"`);
      const archive = archiver.default("zip", { zlib: { level: 9 } });
      archive.pipe(res);
      for (const hotel of allGroups) {
        const singleGroup = [hotel];
        let rows;
        let typeSuffix;
        switch (type) {
          case "invoiceSummary":
            rows = generateInvoiceSummaryRows(singleGroup, startDate, endDate, generatedAt);
            typeSuffix = "InvoiceSummary";
            break;
          case "invoiceDetailed":
            rows = generateDetailedRows(singleGroup, windowLabel, startDate, endDate, generatedAt);
            typeSuffix = "InvoiceDetailed";
            break;
          case "payrollTimesheet":
            rows = generateTimesheetRows(singleGroup, windowLabel, startDate, endDate, generatedAt);
            typeSuffix = "Timesheet";
            break;
          case "payrollPaymentSummary":
            rows = generatePaymentSummaryRows(singleGroup, windowLabel, startDate, endDate, generatedAt);
            typeSuffix = "PaymentSummary";
            break;
          default:
            rows = generateTimesheetRows(singleGroup, windowLabel, startDate, endDate, generatedAt);
            typeSuffix = "Timesheet";
        }
        const hotelFileName = `${filePrefix}_${sanitizeFileName(hotel.workplaceName)}_${typeSuffix}.${format}`;
        const buffer = rowsToBuffer(rows, format, "Sheet1");
        archive.append(buffer, { name: hotelFileName });
      }
      try {
        await db.insert(exportAuditLogs).values({
          adminUserId: req.headers["x-user-id"] || "unknown",
          exportType: `${type}_allHotels`,
          fileFormat: "zip",
          periodYear,
          periodNumber,
          workplaceId: null,
          workplaceName: "All Hotels (ZIP)",
          fileName: `${filePrefix}_AllHotels.zip`
        });
      } catch (auditErr) {
        console.error("Audit log error (non-blocking):", auditErr);
      }
      await archive.finalize();
    } catch (error) {
      console.error("Error in ZIP export:", error);
      res.status(500).json({ error: "Failed to generate ZIP export" });
    }
  });
}

// server/index.ts
import * as fs from "fs";
import * as path from "path";
import bcrypt2 from "bcryptjs";
import { eq as eq3 } from "drizzle-orm";
var app = express();
var log = console.log;
var DEMO_USERS = [
  {
    id: "client-1",
    email: "client@example.com",
    fullName: "Sarah Mitchell",
    role: "client",
    password: "password123"
  },
  {
    id: "worker-1",
    email: "worker@example.com",
    fullName: "James Rodriguez",
    role: "worker",
    password: "password123",
    onboardingStatus: "ONBOARDED",
    workerRoles: ["Housekeeper", "Houseperson", "Server"]
  },
  {
    id: "hr-1",
    email: "hr@example.com",
    fullName: "Emily Chen",
    role: "hr",
    password: "password123"
  },
  {
    id: "admin-1",
    email: "admin@example.com",
    fullName: "Michael Thompson",
    role: "admin",
    password: "password123"
  }
];
async function seedDemoUsers() {
  try {
    for (const demoUser of DEMO_USERS) {
      const existing = await db.select().from(users).where(eq3(users.id, demoUser.id)).limit(1);
      if (existing.length === 0) {
        const hashedPassword = await bcrypt2.hash(demoUser.password, 10);
        await db.insert(users).values({
          id: demoUser.id,
          email: demoUser.email,
          fullName: demoUser.fullName,
          password: hashedPassword,
          role: demoUser.role,
          isActive: true,
          onboardingStatus: demoUser.onboardingStatus,
          workerRoles: demoUser.workerRoles ? JSON.stringify(demoUser.workerRoles) : null
        });
        log(`Seeded demo user: ${demoUser.email}`);
      }
    }
  } catch (error) {
    log("Error seeding demo users:", error);
  }
}
var CAE_WORKPLACE = {
  id: "workplace-cae-1",
  name: "CAE Aviation Training & Services Toronto",
  addressLine1: "2025 Logistics Dr",
  city: "Mississauga",
  province: "ON",
  postalCode: "L5S 1Z9",
  country: "Canada",
  latitude: 43.6894,
  longitude: -79.6355,
  geofenceRadiusMeters: 150,
  isActive: true
};
async function seedWorkplaces() {
  try {
    const existing = await db.select().from(workplaces).where(eq3(workplaces.id, CAE_WORKPLACE.id)).limit(1);
    if (existing.length === 0) {
      await db.insert(workplaces).values(CAE_WORKPLACE);
      log(`Seeded workplace: ${CAE_WORKPLACE.name}`);
      const adminExists = await db.select().from(users).where(eq3(users.id, "admin-1")).limit(1);
      const workerExists = await db.select().from(users).where(eq3(users.id, "worker-1")).limit(1);
      if (adminExists.length > 0 && workerExists.length > 0) {
        const assignmentExists = await db.select().from(workplaceAssignments).where(eq3(workplaceAssignments.workplaceId, CAE_WORKPLACE.id)).limit(1);
        if (assignmentExists.length === 0) {
          await db.insert(workplaceAssignments).values({
            id: "assignment-1",
            workplaceId: CAE_WORKPLACE.id,
            workerUserId: "worker-1",
            status: "active",
            invitedByUserId: "admin-1",
            notes: "Demo assignment for testing"
          });
          log(`Seeded workplace assignment: worker-1 to CAE Aviation`);
        }
      }
    }
  } catch (error) {
    log("Error seeding workplaces:", error);
  }
}
async function seedTimesheets() {
  try {
    const existingTs = await db.select().from(timesheets).where(eq3(timesheets.id, "timesheet-demo-1")).limit(1);
    if (existingTs.length === 0) {
      await db.insert(timesheets).values({
        id: "timesheet-demo-1",
        workerUserId: "worker-1",
        periodYear: 2026,
        periodNumber: 2,
        status: "submitted",
        submittedAt: /* @__PURE__ */ new Date("2026-01-24T09:00:00Z"),
        totalHours: "32.50",
        totalPay: "650.00"
      });
      const entries = [
        {
          id: "entry-1",
          timesheetId: "timesheet-demo-1",
          workplaceId: "workplace-cae-1",
          dateLocal: "2026-01-12",
          timeInUtc: /* @__PURE__ */ new Date("2026-01-12T13:00:00Z"),
          timeOutUtc: /* @__PURE__ */ new Date("2026-01-12T21:00:00Z"),
          breakMinutes: 30,
          hours: "7.50",
          payRate: "20.00",
          amount: "150.00",
          notes: "Regular shift"
        },
        {
          id: "entry-2",
          timesheetId: "timesheet-demo-1",
          workplaceId: "workplace-cae-1",
          dateLocal: "2026-01-13",
          timeInUtc: /* @__PURE__ */ new Date("2026-01-13T13:00:00Z"),
          timeOutUtc: /* @__PURE__ */ new Date("2026-01-13T21:00:00Z"),
          breakMinutes: 30,
          hours: "7.50",
          payRate: "20.00",
          amount: "150.00"
        },
        {
          id: "entry-3",
          timesheetId: "timesheet-demo-1",
          workplaceId: "workplace-cae-1",
          dateLocal: "2026-01-14",
          timeInUtc: /* @__PURE__ */ new Date("2026-01-14T14:00:00Z"),
          timeOutUtc: /* @__PURE__ */ new Date("2026-01-14T22:30:00Z"),
          breakMinutes: 30,
          hours: "8.00",
          payRate: "20.00",
          amount: "160.00"
        },
        {
          id: "entry-4",
          timesheetId: "timesheet-demo-1",
          workplaceId: "workplace-cae-1",
          dateLocal: "2026-01-19",
          timeInUtc: /* @__PURE__ */ new Date("2026-01-19T09:00:00Z"),
          timeOutUtc: /* @__PURE__ */ new Date("2026-01-19T17:30:00Z"),
          breakMinutes: 30,
          hours: "8.00",
          payRate: "20.00",
          amount: "160.00"
        }
      ];
      for (const entry of entries) {
        await db.insert(timesheetEntries).values(entry);
      }
      log("Seeded demo timesheet: worker-1 Period 2 (submitted, 32.5h, $650)");
    }
    const existingTs2 = await db.select().from(timesheets).where(eq3(timesheets.id, "timesheet-demo-2")).limit(1);
    if (existingTs2.length === 0) {
      await db.insert(timesheets).values({
        id: "timesheet-demo-2",
        workerUserId: "worker-1",
        periodYear: 2026,
        periodNumber: 3,
        status: "approved",
        submittedAt: /* @__PURE__ */ new Date("2026-02-07T09:00:00Z"),
        approvedByUserId: "admin-1",
        approvedAt: /* @__PURE__ */ new Date("2026-02-08T10:00:00Z"),
        totalHours: "40.00",
        totalPay: "800.00"
      });
      const entries2 = [
        {
          id: "entry-5",
          timesheetId: "timesheet-demo-2",
          workplaceId: "workplace-cae-1",
          dateLocal: "2026-01-26",
          timeInUtc: /* @__PURE__ */ new Date("2026-01-26T09:00:00Z"),
          timeOutUtc: /* @__PURE__ */ new Date("2026-01-26T17:30:00Z"),
          breakMinutes: 30,
          hours: "8.00",
          payRate: "20.00",
          amount: "160.00"
        },
        {
          id: "entry-6",
          timesheetId: "timesheet-demo-2",
          workplaceId: "workplace-cae-1",
          dateLocal: "2026-01-27",
          timeInUtc: /* @__PURE__ */ new Date("2026-01-27T09:00:00Z"),
          timeOutUtc: /* @__PURE__ */ new Date("2026-01-27T17:30:00Z"),
          breakMinutes: 30,
          hours: "8.00",
          payRate: "20.00",
          amount: "160.00"
        },
        {
          id: "entry-7",
          timesheetId: "timesheet-demo-2",
          workplaceId: "workplace-cae-1",
          dateLocal: "2026-01-28",
          timeInUtc: /* @__PURE__ */ new Date("2026-01-28T09:00:00Z"),
          timeOutUtc: /* @__PURE__ */ new Date("2026-01-28T17:30:00Z"),
          breakMinutes: 30,
          hours: "8.00",
          payRate: "20.00",
          amount: "160.00"
        },
        {
          id: "entry-8",
          timesheetId: "timesheet-demo-2",
          workplaceId: "workplace-cae-1",
          dateLocal: "2026-02-02",
          timeInUtc: /* @__PURE__ */ new Date("2026-02-02T09:00:00Z"),
          timeOutUtc: /* @__PURE__ */ new Date("2026-02-02T17:30:00Z"),
          breakMinutes: 30,
          hours: "8.00",
          payRate: "20.00",
          amount: "160.00"
        },
        {
          id: "entry-9",
          timesheetId: "timesheet-demo-2",
          workplaceId: "workplace-cae-1",
          dateLocal: "2026-02-03",
          timeInUtc: /* @__PURE__ */ new Date("2026-02-03T09:00:00Z"),
          timeOutUtc: /* @__PURE__ */ new Date("2026-02-03T17:30:00Z"),
          breakMinutes: 30,
          hours: "8.00",
          payRate: "20.00",
          amount: "160.00"
        }
      ];
      for (const entry of entries2) {
        await db.insert(timesheetEntries).values(entry);
      }
      log("Seeded demo timesheet: worker-1 Period 3 (approved, 40h, $800)");
    }
  } catch (error) {
    log("Error seeding timesheets:", error);
  }
}
async function seedProductionAdmin() {
  try {
    const existingAdmin = await db.select().from(users).where(eq3(users.email, "admin@wfconnect.org")).limit(1);
    if (existingAdmin.length === 0) {
      const hashedPassword = await bcrypt2.hash("@1900Dundas", 10);
      await db.insert(users).values({
        id: crypto.randomUUID(),
        email: "admin@wfconnect.org",
        password: hashedPassword,
        fullName: "Admin User",
        role: "admin",
        timezone: "America/Toronto",
        isActive: true
      });
      log("Created production admin user: admin@wfconnect.org");
    } else {
      log("Production admin user already exists");
    }
  } catch (error) {
    log("Error seeding production admin:", error);
  }
}
function setupCors(app2) {
  app2.use((req, res, next) => {
    const origins = /* @__PURE__ */ new Set();
    if (process.env.REPLIT_DEV_DOMAIN) {
      origins.add(`https://${process.env.REPLIT_DEV_DOMAIN}`);
    }
    if (process.env.REPLIT_DOMAINS) {
      process.env.REPLIT_DOMAINS.split(",").forEach((d) => {
        origins.add(`https://${d.trim()}`);
      });
    }
    const origin = req.header("origin");
    const isLocalhost = origin?.startsWith("http://localhost:") || origin?.startsWith("http://127.0.0.1:");
    if (origin && (origins.has(origin) || isLocalhost)) {
      res.header("Access-Control-Allow-Origin", origin);
      res.header(
        "Access-Control-Allow-Methods",
        "GET, POST, PUT, PATCH, DELETE, OPTIONS"
      );
      res.header("Access-Control-Allow-Headers", "Content-Type, x-user-role, x-user-id");
      res.header("Access-Control-Allow-Credentials", "true");
    }
    if (req.method === "OPTIONS") {
      return res.sendStatus(200);
    }
    next();
  });
}
function setupBodyParsing(app2) {
  app2.use(
    express.json({
      verify: (req, _res, buf) => {
        req.rawBody = buf;
      }
    })
  );
  app2.use(express.urlencoded({ extended: false }));
}
function setupRequestLogging(app2) {
  app2.use((req, res, next) => {
    const start = Date.now();
    const path2 = req.path;
    let capturedJsonResponse = void 0;
    const originalResJson = res.json;
    res.json = function(bodyJson, ...args) {
      capturedJsonResponse = bodyJson;
      return originalResJson.apply(res, [bodyJson, ...args]);
    };
    res.on("finish", () => {
      if (!path2.startsWith("/api")) return;
      const duration = Date.now() - start;
      let logLine = `${req.method} ${path2} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }
      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "\u2026";
      }
      log(logLine);
    });
    next();
  });
}
function getAppName() {
  try {
    const appJsonPath = path.resolve(process.cwd(), "app.json");
    const appJsonContent = fs.readFileSync(appJsonPath, "utf-8");
    const appJson = JSON.parse(appJsonContent);
    return appJson.expo?.name || "App Landing Page";
  } catch {
    return "App Landing Page";
  }
}
function serveExpoManifest(platform, res) {
  const manifestPath = path.resolve(
    process.cwd(),
    "static-build",
    platform,
    "manifest.json"
  );
  if (!fs.existsSync(manifestPath)) {
    return res.status(404).json({ error: `Manifest not found for platform: ${platform}` });
  }
  res.setHeader("expo-protocol-version", "1");
  res.setHeader("expo-sfv-version", "0");
  res.setHeader("content-type", "application/json");
  res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate");
  res.setHeader("Pragma", "no-cache");
  res.setHeader("Expires", "0");
  const manifest = fs.readFileSync(manifestPath, "utf-8");
  res.send(manifest);
}
function serveLandingPage({
  req,
  res,
  landingPageTemplate,
  appName
}) {
  const forwardedProto = req.header("x-forwarded-proto");
  const protocol = forwardedProto || req.protocol || "https";
  const forwardedHost = req.header("x-forwarded-host");
  const host = forwardedHost || req.get("host");
  const baseUrl = `${protocol}://${host}`;
  const expsUrl = `${host}`;
  log(`baseUrl`, baseUrl);
  log(`expsUrl`, expsUrl);
  const html = landingPageTemplate.replace(/BASE_URL_PLACEHOLDER/g, baseUrl).replace(/EXPS_URL_PLACEHOLDER/g, expsUrl).replace(/APP_NAME_PLACEHOLDER/g, appName);
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.status(200).send(html);
}
function configureExpoAndLanding(app2) {
  const templatePath = path.resolve(
    process.cwd(),
    "server",
    "templates",
    "landing-page.html"
  );
  const landingPageTemplate = fs.readFileSync(templatePath, "utf-8");
  const appName = getAppName();
  const sitemapPath = path.resolve(process.cwd(), "server", "templates", "sitemap.xml");
  const robotsPath = path.resolve(process.cwd(), "server", "templates", "robots.txt");
  app2.get("/sitemap.xml", (_req, res) => {
    res.setHeader("Content-Type", "application/xml; charset=utf-8");
    res.setHeader("Cache-Control", "public, max-age=86400");
    res.sendFile(sitemapPath);
  });
  app2.get("/robots.txt", (_req, res) => {
    res.setHeader("Content-Type", "text/plain; charset=utf-8");
    res.setHeader("Cache-Control", "public, max-age=86400");
    res.sendFile(robotsPath);
  });
  const logoPath = path.resolve(process.cwd(), "server", "templates", "logo.png");
  const faviconPath = path.resolve(process.cwd(), "server", "templates", "favicon.png");
  app2.get("/logo.png", (_req, res) => {
    res.setHeader("Content-Type", "image/png");
    res.setHeader("Cache-Control", "public, max-age=86400");
    res.sendFile(logoPath);
  });
  app2.get("/favicon.png", (_req, res) => {
    res.setHeader("Content-Type", "image/png");
    res.setHeader("Cache-Control", "public, max-age=86400");
    res.sendFile(faviconPath);
  });
  app2.get("/favicon.ico", (_req, res) => {
    res.setHeader("Content-Type", "image/png");
    res.setHeader("Cache-Control", "public, max-age=86400");
    res.sendFile(faviconPath);
  });
  const contractorGuidePath = path.resolve(process.cwd(), "server", "templates", "contractor-guide.html");
  const contractorGuideTemplate = fs.readFileSync(contractorGuidePath, "utf-8");
  app2.get("/guide", (_req, res) => {
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.setHeader("Cache-Control", "public, max-age=3600");
    res.status(200).send(contractorGuideTemplate);
  });
  app2.get("/contractor-guide", (_req, res) => {
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.setHeader("Cache-Control", "public, max-age=3600");
    res.status(200).send(contractorGuideTemplate);
  });
  const supportPath = path.resolve(process.cwd(), "server", "templates", "support.html");
  const supportTemplate = fs.readFileSync(supportPath, "utf-8");
  app2.get("/support", (_req, res) => {
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.setHeader("Cache-Control", "public, max-age=3600");
    res.status(200).send(supportTemplate);
  });
  const privacyPath = path.resolve(process.cwd(), "server", "templates", "privacy.html");
  const privacyTemplate = fs.readFileSync(privacyPath, "utf-8");
  app2.get("/privacy", (_req, res) => {
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.setHeader("Cache-Control", "public, max-age=3600");
    res.status(200).send(privacyTemplate);
  });
  const accountDeletionPath = path.resolve(process.cwd(), "server", "templates", "account-deletion.html");
  const accountDeletionTemplate = fs.readFileSync(accountDeletionPath, "utf-8");
  app2.get("/account-deletion", (_req, res) => {
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.setHeader("Cache-Control", "public, max-age=3600");
    res.status(200).send(accountDeletionTemplate);
  });
  const applyPath = path.resolve(process.cwd(), "server", "templates", "apply.html");
  const applyTemplate = fs.readFileSync(applyPath, "utf-8");
  app2.get("/apply", (_req, res) => {
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.setHeader("Cache-Control", "public, max-age=3600");
    res.status(200).send(applyTemplate);
  });
  const paymentInfoPath = path.resolve(process.cwd(), "server", "templates", "payment-info.html");
  const paymentInfoTemplate = fs.readFileSync(paymentInfoPath, "utf-8");
  app2.get("/payment-info", (_req, res) => {
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.setHeader("Cache-Control", "public, max-age=3600");
    res.status(200).send(paymentInfoTemplate);
  });
  const adminAppsPath = path.resolve(process.cwd(), "server", "templates", "admin-applications.html");
  const adminAppsTemplate = fs.readFileSync(adminAppsPath, "utf-8");
  app2.get("/admin/applications", (_req, res) => {
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.setHeader("Cache-Control", "no-cache");
    res.status(200).send(adminAppsTemplate);
  });
  const adminTimesheetsPath = path.resolve(process.cwd(), "server", "templates", "admin-timesheets.html");
  const adminTimesheetsTemplate = fs.readFileSync(adminTimesheetsPath, "utf-8");
  app2.get("/admin/timesheets", (_req, res) => {
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.setHeader("Cache-Control", "no-cache");
    res.status(200).send(adminTimesheetsTemplate);
  });
  const adminHoursPath = path.resolve(process.cwd(), "server", "templates", "admin-hours.html");
  const adminHoursTemplate = fs.readFileSync(adminHoursPath, "utf-8");
  app2.get("/admin/hours", (_req, res) => {
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.setHeader("Cache-Control", "no-cache");
    res.status(200).send(adminHoursTemplate);
  });
  log("Serving static Expo files with dynamic manifest routing");
  const webDistPath = path.resolve(process.cwd(), "web-dist");
  const webDistIndexPath = path.join(webDistPath, "index.html");
  const webBuildExists = fs.existsSync(webDistIndexPath);
  if (webBuildExists) {
    log("Web build found at web-dist/index.html - app subdomain routing enabled");
  } else {
    log("WARNING: web-dist/index.html not found - app subdomain will return 500 error");
  }
  function isAppSubdomain(req) {
    const host = (req.hostname || req.headers.host || "").toLowerCase();
    return host.startsWith("app.") || host.includes("app.wfconnect");
  }
  function isGuideSubdomain(req) {
    const host = (req.hostname || req.headers.host || "").toLowerCase();
    return host.startsWith("guide.") || host.includes("guide.wfconnect");
  }
  app2.use((req, res, next) => {
    if (isAppSubdomain(req) && webBuildExists) {
      if (req.path.startsWith("/api")) {
        return next();
      }
      const filePath = path.join(webDistPath, req.path);
      if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
        if (req.path.includes("/_expo/") || req.path.includes("/assets/")) {
          res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
        }
        return res.sendFile(filePath);
      }
    }
    next();
  });
  app2.get("/", (req, res) => {
    const platform = req.header("expo-platform");
    if (platform && (platform === "ios" || platform === "android")) {
      return serveExpoManifest(platform, res);
    }
    if (isAppSubdomain(req)) {
      if (!webBuildExists) {
        return res.status(500).json({
          error: "Web build not available",
          message: "The Expo web build (web-dist/index.html) was not found. Please ensure the web build step completed successfully."
        });
      }
      res.setHeader("Content-Type", "text/html; charset=utf-8");
      res.setHeader("Cache-Control", "no-cache");
      return res.sendFile(webDistIndexPath);
    }
    if (isGuideSubdomain(req)) {
      res.setHeader("Content-Type", "text/html; charset=utf-8");
      res.setHeader("Cache-Control", "public, max-age=3600");
      return res.status(200).send(contractorGuideTemplate);
    }
    return serveLandingPage({
      req,
      res,
      landingPageTemplate,
      appName
    });
  });
  app2.get("/manifest", (req, res, next) => {
    const platform = req.header("expo-platform");
    if (platform && (platform === "ios" || platform === "android")) {
      return serveExpoManifest(platform, res);
    }
    next();
  });
  app2.use("/assets", express.static(path.resolve(process.cwd(), "assets")));
  app2.use(express.static(path.resolve(process.cwd(), "static-build"), { index: false }));
  app2.use((req, res, next) => {
    if (req.method !== "GET") {
      return next();
    }
    if (req.path.startsWith("/api")) {
      return next();
    }
    if (isAppSubdomain(req) && webBuildExists) {
      if (path.extname(req.path)) {
        return next();
      }
      res.setHeader("Content-Type", "text/html; charset=utf-8");
      res.setHeader("Cache-Control", "no-cache");
      return res.sendFile(webDistIndexPath);
    }
    next();
  });
  log("Expo routing: Checking expo-platform header on / and /manifest");
  log("Domain routing: app.wfconnect.org -> web-dist/, wfconnect.org -> landing page");
}
function setupErrorHandler(app2) {
  app2.use((err, _req, res, next) => {
    const error = err;
    const status = error.status || error.statusCode || 500;
    const message = error.message || "Internal Server Error";
    console.error("Internal Server Error:", err);
    if (res.headersSent) {
      return next(err);
    }
    return res.status(status).json({ message });
  });
}
var isDemoMode = process.env.DEMO_MODE !== "false";
(async () => {
  if (isDemoMode) {
    log("DEMO MODE enabled - seeding demo data...");
    await seedDemoUsers();
    await seedWorkplaces();
    await seedTimesheets();
  } else {
    log("PRODUCTION MODE - skipping demo data seeding");
    await seedProductionAdmin();
  }
  setupCors(app);
  setupBodyParsing(app);
  setupRequestLogging(app);
  configureExpoAndLanding(app);
  registerPayrollHoursRoutes(app);
  const server = await registerRoutes(app);
  setupWebSocket(server);
  setupErrorHandler(app);
  const port = parseInt(process.env.PORT || "5000", 10);
  server.listen(
    {
      port,
      host: "0.0.0.0",
      reusePort: true
    },
    () => {
      log(`express server serving on port ${port}`);
    }
  );
})();
