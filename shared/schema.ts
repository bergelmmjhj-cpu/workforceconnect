import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, integer, boolean, doublePrecision, uniqueIndex, date, numeric } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  fullName: text("full_name").notNull(),
  role: text("role").notNull().default("worker"), // admin, hr, client, worker
  timezone: text("timezone").default("America/Toronto"),
  onboardingStatus: text("onboarding_status"), // For workers: NOT_APPLIED, APPLICATION_SUBMITTED, etc.
  workerRoles: text("worker_roles"), // JSON array of worker roles
  businessName: text("business_name"), // For clients
  businessAddress: text("business_address"),
  businessPhone: text("business_phone"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertUserSchema = createInsertSchema(users).pick({
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
  isActive: true,
});

export const registerUserSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  fullName: z.string().min(2),
  role: z.enum(["admin", "hr", "client", "worker"]),
});

export const loginUserSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type RegisterUser = z.infer<typeof registerUserSchema>;
export type LoginUser = z.infer<typeof loginUserSchema>;

// Internal Communications Schema (HR ↔ Worker messaging)

export const conversations = pgTable("conversations", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  type: text("type").notNull().default("hr_worker"), // Only "hr_worker" type
  workerUserId: varchar("worker_user_id")
    .notNull()
    .references(() => users.id),
  hrUserId: varchar("hr_user_id")
    .references(() => users.id), // Optional - can be null if multiple HR
  lastMessageAt: timestamp("last_message_at"),
  lastMessagePreview: text("last_message_preview"),
  isArchived: boolean("is_archived").default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const messages = pgTable("messages", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  conversationId: varchar("conversation_id")
    .notNull()
    .references(() => conversations.id),
  senderUserId: varchar("sender_user_id")
    .notNull()
    .references(() => users.id),
  recipientUserId: varchar("recipient_user_id")
    .notNull()
    .references(() => users.id),
  body: text("body").notNull(),
  messageType: text("message_type").notNull().default("text"), // "text" | "image" | "file"
  mediaUrl: text("media_url"),
  readAt: timestamp("read_at"),
  status: text("status").notNull().default("delivered"), // "sent" | "delivered" | "read"
  deletedAt: timestamp("deleted_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const messageLogs = pgTable("message_logs", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  messageId: varchar("message_id")
    .notNull()
    .references(() => messages.id),
  event: text("event").notNull(), // "created" | "delivered" | "read" | "edited" | "deleted"
  actorUserId: varchar("actor_user_id")
    .notNull()
    .references(() => users.id),
  metadata: text("metadata"), // JSON string for additional data
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertConversationSchema = createInsertSchema(conversations);
export const insertMessageSchema = createInsertSchema(messages);
export const insertMessageLogSchema = createInsertSchema(messageLogs);

export type Conversation = typeof conversations.$inferSelect;
export type InsertConversation = z.infer<typeof insertConversationSchema>;
export type Message = typeof messages.$inferSelect;
export type InsertMessage = z.infer<typeof insertMessageSchema>;
export type MessageLog = typeof messageLogs.$inferSelect;
export type InsertMessageLog = z.infer<typeof insertMessageLogSchema>;

// Contact Lead Schema (for business website contact form)

export const contactLeads = pgTable("contact_leads", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  email: text("email").notNull(),
  company: text("company"),
  phone: text("phone"),
  cityProvince: text("city_province"),
  serviceNeeded: text("service_needed"),
  message: text("message").notNull(),
  ip: text("ip"),
  userAgent: text("user_agent"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertContactLeadSchema = createInsertSchema(contactLeads).pick({
  name: true,
  email: true,
  company: true,
  phone: true,
  cityProvince: true,
  serviceNeeded: true,
  message: true,
  ip: true,
  userAgent: true,
});

export type ContactLead = typeof contactLeads.$inferSelect;
export type InsertContactLead = z.infer<typeof insertContactLeadSchema>;

// Worker Application Schema (from public website form)

export const workerApplications = pgTable("worker_applications", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  
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
  workStatus: text("work_status").notNull(), // citizen, permanent_resident, work_permit
  backgroundCheckConsent: boolean("background_check_consent").default(false),
  
  // Role Interests
  preferredRoles: text("preferred_roles").notNull(), // JSON array
  otherRole: text("other_role"),
  
  // Availability
  availableDays: text("available_days").notNull(), // JSON array
  preferredShifts: text("preferred_shifts").notNull(), // JSON array (morning, afternoon, evening)
  unavailablePeriods: text("unavailable_periods"),
  
  // Experience
  yearsExperience: text("years_experience"),
  workHistory: text("work_history"), // JSON array of job objects
  experienceSummary: text("experience_summary"),
  
  // Skills
  skills: text("skills"), // JSON array
  certifications: text("certifications"), // JSON array
  
  // Shift Preferences
  shiftTypePreference: text("shift_type_preference"), // day, night, flexible
  desiredShiftLength: text("desired_shift_length"), // 4, 8, flexible
  maxTravelDistance: text("max_travel_distance"),
  
  // Emergency Contact
  emergencyContactName: text("emergency_contact_name").notNull(),
  emergencyContactRelationship: text("emergency_contact_relationship").notNull(),
  emergencyContactPhone: text("emergency_contact_phone").notNull(),
  
  // Acknowledgments
  titoAcknowledgment: boolean("tito_acknowledgment").default(false),
  siteRulesAcknowledgment: boolean("site_rules_acknowledgment").default(false),
  workerAgreementConsent: boolean("worker_agreement_consent").default(false),
  privacyConsent: boolean("privacy_consent").default(false),
  marketingConsent: boolean("marketing_consent").default(false),
  
  // Electronic Signature
  signature: text("signature").notNull(), // Typed full name as signature
  signatureDate: text("signature_date").notNull(),
  
  // Status
  status: text("status").notNull().default("pending"), // pending, reviewed, approved, rejected
  reviewedBy: varchar("reviewed_by"),
  reviewedAt: timestamp("reviewed_at"),
  notes: text("notes"),
  
  // Metadata
  ip: text("ip"),
  userAgent: text("user_agent"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertWorkerApplicationSchema = createInsertSchema(workerApplications).omit({
  id: true,
  status: true,
  reviewedBy: true,
  reviewedAt: true,
  notes: true,
  createdAt: true,
  updatedAt: true,
});

export type WorkerApplication = typeof workerApplications.$inferSelect;
export type InsertWorkerApplication = z.infer<typeof insertWorkerApplicationSchema>;

// Workplaces Schema (Deployment locations)

export const workplaces = pgTable("workplaces", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
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
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertWorkplaceSchema = createInsertSchema(workplaces).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type Workplace = typeof workplaces.$inferSelect;
export type InsertWorkplace = z.infer<typeof insertWorkplaceSchema>;

// Workplace Assignments Schema (Worker ↔ Workplace)

export const workplaceAssignmentStatusEnum = z.enum(["invited", "active", "suspended", "removed"]);
export type WorkplaceAssignmentStatus = z.infer<typeof workplaceAssignmentStatusEnum>;

export const workplaceAssignments = pgTable("workplace_assignments", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  workplaceId: varchar("workplace_id")
    .notNull()
    .references(() => workplaces.id),
  workerUserId: varchar("worker_user_id")
    .notNull()
    .references(() => users.id),
  status: text("status").notNull().default("active"), // invited, active, suspended, removed
  invitedByUserId: varchar("invited_by_user_id")
    .references(() => users.id),
  invitedAt: timestamp("invited_at").defaultNow().notNull(),
  acceptedAt: timestamp("accepted_at"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({
  uniqueWorkerWorkplace: uniqueIndex("unique_worker_workplace").on(table.workplaceId, table.workerUserId),
}));

export const insertWorkplaceAssignmentSchema = createInsertSchema(workplaceAssignments).omit({
  id: true,
  invitedAt: true,
  createdAt: true,
  updatedAt: true,
});

export type WorkplaceAssignment = typeof workplaceAssignments.$inferSelect;
export type InsertWorkplaceAssignment = z.infer<typeof insertWorkplaceAssignmentSchema>;

// TITO Logs Schema (Time In/Time Out with GPS verification)

export const titoLogs = pgTable("tito_logs", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  workerId: varchar("worker_id")
    .notNull()
    .references(() => users.id),
  workplaceId: varchar("workplace_id")
    .references(() => workplaces.id),
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
  status: text("status").notNull().default("pending"), // pending, approved, disputed
  approvedBy: varchar("approved_by"),
  approvedAt: timestamp("approved_at"),
  disputedBy: varchar("disputed_by"),
  disputedAt: timestamp("disputed_at"),
  notes: text("notes"),
  
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertTitoLogSchema = createInsertSchema(titoLogs).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type TitoLogDB = typeof titoLogs.$inferSelect;
export type InsertTitoLog = z.infer<typeof insertTitoLogSchema>;

// ============================================
// Timesheets & Payroll Schema
// ============================================

// Timesheet status enum
export const timesheetStatusEnum = z.enum(["draft", "submitted", "approved", "disputed", "processed"]);
export type TimesheetStatus = z.infer<typeof timesheetStatusEnum>;

// Timesheets table - aggregates work entries for a pay period
export const timesheets = pgTable("timesheets", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  workerUserId: varchar("worker_user_id")
    .notNull()
    .references(() => users.id),
  periodYear: integer("period_year").notNull(),
  periodNumber: integer("period_number").notNull(),
  status: text("status").notNull().default("draft"), // draft, submitted, approved, disputed, processed
  submittedAt: timestamp("submitted_at"),
  approvedByUserId: varchar("approved_by_user_id")
    .references(() => users.id),
  approvedAt: timestamp("approved_at"),
  disputedByUserId: varchar("disputed_by_user_id")
    .references(() => users.id),
  disputedAt: timestamp("disputed_at"),
  disputeReason: text("dispute_reason"),
  totalHours: numeric("total_hours", { precision: 10, scale: 2 }).default("0"),
  totalPay: numeric("total_pay", { precision: 12, scale: 2 }).default("0"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({
  uniqueWorkerPeriod: uniqueIndex("unique_worker_period").on(table.workerUserId, table.periodYear, table.periodNumber),
}));

export const insertTimesheetSchema = createInsertSchema(timesheets).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type Timesheet = typeof timesheets.$inferSelect;
export type InsertTimesheet = z.infer<typeof insertTimesheetSchema>;

// Timesheet Entries table - individual work entries within a timesheet
export const timesheetEntries = pgTable("timesheet_entries", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  timesheetId: varchar("timesheet_id")
    .notNull()
    .references(() => timesheets.id, { onDelete: "cascade" }),
  workplaceId: varchar("workplace_id")
    .references(() => workplaces.id),
  titoLogId: varchar("tito_log_id")
    .references(() => titoLogs.id),
  dateLocal: date("date_local").notNull(), // Work date (YYYY-MM-DD)
  timeInUtc: timestamp("time_in_utc").notNull(),
  timeOutUtc: timestamp("time_out_utc").notNull(),
  breakMinutes: integer("break_minutes").default(0),
  hours: numeric("hours", { precision: 5, scale: 2 }).notNull(),
  payRate: numeric("pay_rate", { precision: 10, scale: 2 }).notNull(), // Snapshot rate at time of work
  amount: numeric("amount", { precision: 10, scale: 2 }).notNull(), // hours * payRate
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertTimesheetEntrySchema = createInsertSchema(timesheetEntries).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type TimesheetEntry = typeof timesheetEntries.$inferSelect;
export type InsertTimesheetEntry = z.infer<typeof insertTimesheetEntrySchema>;

// Payroll Batch status enum
export const payrollBatchStatusEnum = z.enum(["open", "finalized", "exported"]);
export type PayrollBatchStatus = z.infer<typeof payrollBatchStatusEnum>;

// Payroll Batches table - groups approved timesheets for payment processing
export const payrollBatches = pgTable("payroll_batches", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  periodYear: integer("period_year").notNull(),
  periodNumber: integer("period_number").notNull(),
  status: text("status").notNull().default("open"), // open, finalized, exported
  createdByUserId: varchar("created_by_user_id")
    .notNull()
    .references(() => users.id),
  finalizedByUserId: varchar("finalized_by_user_id")
    .references(() => users.id),
  finalizedAt: timestamp("finalized_at"),
  totalWorkers: integer("total_workers").default(0),
  totalHours: numeric("total_hours", { precision: 10, scale: 2 }).default("0"),
  totalAmount: numeric("total_amount", { precision: 12, scale: 2 }).default("0"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({
  uniquePeriodBatch: uniqueIndex("unique_period_batch").on(table.periodYear, table.periodNumber),
}));

export const insertPayrollBatchSchema = createInsertSchema(payrollBatches).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type PayrollBatch = typeof payrollBatches.$inferSelect;
export type InsertPayrollBatch = z.infer<typeof insertPayrollBatchSchema>;

// Payroll Batch Items status enum
export const payrollBatchItemStatusEnum = z.enum(["included", "excluded"]);
export type PayrollBatchItemStatus = z.infer<typeof payrollBatchItemStatusEnum>;

// Payroll Batch Items table - links timesheets to payroll batches
export const payrollBatchItems = pgTable("payroll_batch_items", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  payrollBatchId: varchar("payroll_batch_id")
    .notNull()
    .references(() => payrollBatches.id, { onDelete: "cascade" }),
  workerUserId: varchar("worker_user_id")
    .notNull()
    .references(() => users.id),
  timesheetId: varchar("timesheet_id")
    .notNull()
    .references(() => timesheets.id),
  status: text("status").notNull().default("included"), // included, excluded
  hours: numeric("hours", { precision: 10, scale: 2 }).notNull(),
  amount: numeric("amount", { precision: 12, scale: 2 }).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertPayrollBatchItemSchema = createInsertSchema(payrollBatchItems).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type PayrollBatchItem = typeof payrollBatchItems.$inferSelect;
export type InsertPayrollBatchItem = z.infer<typeof insertPayrollBatchItemSchema>;
