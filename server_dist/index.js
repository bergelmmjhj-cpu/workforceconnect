var __defProp = Object.defineProperty;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __esm = (fn, res) => function __init() {
  return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
};
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// shared/schema.ts
var schema_exports = {};
__export(schema_exports, {
  aiActionLogs: () => aiActionLogs,
  aiAlertState: () => aiAlertState,
  aiMessageLog: () => aiMessageLog,
  appConfig: () => appConfig,
  appNotifications: () => appNotifications,
  applicants: () => applicants,
  appointments: () => appointments,
  auditLog: () => auditLog,
  clawdAssistantRuns: () => clawdAssistantRuns,
  clawdChatMessages: () => clawdChatMessages,
  contactLeads: () => contactLeads,
  conversations: () => conversations2,
  crmPushQueue: () => crmPushQueue,
  crmSyncLogs: () => crmSyncLogs,
  discordActionLogs: () => discordActionLogs,
  discordAlerts: () => discordAlerts,
  exportAuditLogs: () => exportAuditLogs,
  insertAppNotificationSchema: () => insertAppNotificationSchema,
  insertAppointmentSchema: () => insertAppointmentSchema,
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
  smsLogs: () => smsLogs,
  timesheetEntries: () => timesheetEntries,
  timesheetStatusEnum: () => timesheetStatusEnum,
  timesheets: () => timesheets,
  titoCorrections: () => titoCorrections,
  titoLogs: () => titoLogs,
  userPhotos: () => userPhotos,
  users: () => users,
  workerApplications: () => workerApplications,
  workplaceAssignmentStatusEnum: () => workplaceAssignmentStatusEnum,
  workplaceAssignments: () => workplaceAssignments,
  workplaces: () => workplaces
});
import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, integer, boolean, doublePrecision, uniqueIndex, index, date, numeric } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
var users, insertUserSchema, registerUserSchema, loginUserSchema, conversations2, messages2, messageLogs, insertConversationSchema, insertMessageSchema, insertMessageLogSchema, pushTokens, contactLeads, insertContactLeadSchema, workerApplications, insertWorkerApplicationSchema, workplaces, insertWorkplaceSchema, workplaceAssignmentStatusEnum, workplaceAssignments, insertWorkplaceAssignmentSchema, titoLogs, insertTitoLogSchema, titoCorrections, timesheetStatusEnum, timesheets, insertTimesheetSchema, timesheetEntries, insertTimesheetEntrySchema, payrollBatchStatusEnum, payrollBatches, insertPayrollBatchSchema, payrollBatchItemStatusEnum, payrollBatchItems, insertPayrollBatchItemSchema, paymentProfiles, insertPaymentProfileSchema, shiftStatusEnum, shiftFrequencyEnum, shiftCategoryEnum, seriesFrequencyEnum, seriesEndTypeEnum, shiftSeries, insertShiftSeriesSchema, recurrenceExceptions, auditLog, userPhotos, shifts, insertShiftSchema, shiftRequestStatusEnum, shiftRequests, insertShiftRequestSchema, shiftOfferStatusEnum, shiftOffers, insertShiftOfferSchema, appNotifications, insertAppNotificationSchema, shiftCheckinStatusEnum, shiftCheckins, insertShiftCheckinSchema, sentReminders, exportAuditLogs, insertExportAuditLogSchema, smsLogs, discordAlerts, discordActionLogs, crmSyncLogs, crmPushQueue, aiActionLogs, aiAlertState, clawdChatMessages, clawdAssistantRuns, appointments, insertAppointmentSchema, appConfig, aiMessageLog, applicants;
var init_schema = __esm({
  "shared/schema.ts"() {
    "use strict";
    users = pgTable("users", {
      id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
      email: text("email").notNull().unique(),
      password: text("password"),
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
      phone: text("phone"),
      profilePhotoUrl: text("profile_photo_url"),
      totpSecret: text("totp_secret"),
      totpEnabled: boolean("totp_enabled").default(false),
      recoveryCodes: text("recovery_codes"),
      mustChangePassword: boolean("must_change_password").default(false),
      isActive: boolean("is_active").default(true),
      googleId: text("google_id"),
      passwordResetToken: text("password_reset_token"),
      passwordResetExpiry: timestamp("password_reset_expiry"),
      createdAt: timestamp("created_at").defaultNow().notNull(),
      updatedAt: timestamp("updated_at").defaultNow().notNull()
    }, (table) => ({
      phoneUnique: uniqueIndex("users_phone_unique").on(table.phone).where(sql`${table.phone} IS NOT NULL`)
    }));
    insertUserSchema = createInsertSchema(users).pick({
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
      phone: true,
      isActive: true
    });
    registerUserSchema = z.object({
      email: z.string().email(),
      password: z.string().min(6),
      fullName: z.string().min(2),
      role: z.enum(["admin", "hr", "client", "worker"])
    });
    loginUserSchema = z.object({
      email: z.string().email(),
      password: z.string().min(1)
    });
    conversations2 = pgTable("conversations", {
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
    messages2 = pgTable("messages", {
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
    messageLogs = pgTable("message_logs", {
      id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
      messageId: varchar("message_id").notNull().references(() => messages2.id),
      event: text("event").notNull(),
      // "created" | "delivered" | "read" | "edited" | "deleted"
      actorUserId: varchar("actor_user_id").notNull().references(() => users.id),
      metadata: text("metadata"),
      // JSON string for additional data
      createdAt: timestamp("created_at").defaultNow().notNull()
    });
    insertConversationSchema = createInsertSchema(conversations2);
    insertMessageSchema = createInsertSchema(messages2);
    insertMessageLogSchema = createInsertSchema(messageLogs);
    pushTokens = pgTable("push_tokens", {
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
    contactLeads = pgTable("contact_leads", {
      id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
      name: text("name").notNull(),
      email: text("email").notNull(),
      company: text("company"),
      phone: text("phone"),
      cityProvince: text("city_province"),
      serviceNeeded: text("service_needed"),
      message: text("message").notNull(),
      smsConsent: boolean("sms_consent").notNull().default(false),
      smsConsentAt: timestamp("sms_consent_at"),
      ip: text("ip"),
      userAgent: text("user_agent"),
      createdAt: timestamp("created_at").defaultNow().notNull()
    });
    insertContactLeadSchema = createInsertSchema(contactLeads).pick({
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
    workerApplications = pgTable("worker_applications", {
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
      experienceSummary: text("experience_summary"),
      // Skills
      skills: text("skills"),
      // JSON array
      // Shift Preferences
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
      agreementVersion: text("agreement_version"),
      nonSolicitationAcknowledged: boolean("non_solicitation_acknowledged"),
      nonSolicitationAcknowledgedAt: timestamp("non_solicitation_acknowledged_at"),
      workerPdfGeneratedAt: timestamp("worker_pdf_generated_at"),
      internalPdfGeneratedAt: timestamp("internal_pdf_generated_at"),
      privacyConsent: boolean("privacy_consent").default(false),
      consentToContact: boolean("consent_to_contact").default(false),
      smsConsent: boolean("sms_consent").notNull().default(false),
      smsConsentAt: timestamp("sms_consent_at"),
      promotionalConsent: boolean("promotional_consent").notNull().default(false),
      marketingConsent: boolean("marketing_consent").default(false),
      // Operations workflow
      applicationSource: text("application_source"),
      assignedRecruiter: text("assigned_recruiter"),
      recruiterNotes: text("recruiter_notes"),
      interviewStage: text("interview_stage"),
      interviewNotes: text("interview_notes"),
      deploymentReadiness: text("deployment_readiness"),
      payrollReadiness: text("payroll_readiness"),
      missingDocuments: text("missing_documents"),
      nextRecommendedAction: text("next_recommended_action"),
      documentRequestSentAt: timestamp("document_request_sent_at"),
      lastContactedAt: timestamp("last_contacted_at"),
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
    insertWorkerApplicationSchema = createInsertSchema(workerApplications).omit({
      id: true,
      status: true,
      reviewedBy: true,
      reviewedAt: true,
      notes: true,
      createdAt: true,
      updatedAt: true
    });
    workplaces = pgTable("workplaces", {
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
      crmExternalId: text("crm_external_id"),
      crmSource: boolean("crm_source").default(false),
      createdAt: timestamp("created_at").defaultNow().notNull(),
      updatedAt: timestamp("updated_at").defaultNow().notNull()
    });
    insertWorkplaceSchema = createInsertSchema(workplaces).omit({
      id: true,
      createdAt: true,
      updatedAt: true
    });
    workplaceAssignmentStatusEnum = z.enum(["invited", "active", "suspended", "removed"]);
    workplaceAssignments = pgTable("workplace_assignments", {
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
    insertWorkplaceAssignmentSchema = createInsertSchema(workplaceAssignments).omit({
      id: true,
      invitedAt: true,
      createdAt: true,
      updatedAt: true
    });
    titoLogs = pgTable("tito_logs", {
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
    insertTitoLogSchema = createInsertSchema(titoLogs).omit({
      id: true,
      createdAt: true,
      updatedAt: true
    });
    titoCorrections = pgTable("tito_corrections", {
      id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
      titoLogId: varchar("tito_log_id").notNull().references(() => titoLogs.id),
      requesterId: varchar("requester_id").notNull().references(() => users.id),
      approverId: varchar("approver_id").references(() => users.id),
      originalTimeIn: timestamp("original_time_in"),
      originalTimeOut: timestamp("original_time_out"),
      correctedTimeIn: timestamp("corrected_time_in"),
      correctedTimeOut: timestamp("corrected_time_out"),
      reason: text("reason").notNull(),
      note: text("note"),
      status: text("status").notNull().default("pending"),
      createdAt: timestamp("created_at").defaultNow().notNull(),
      reviewedAt: timestamp("reviewed_at")
    });
    timesheetStatusEnum = z.enum(["draft", "submitted", "approved", "disputed", "processed"]);
    timesheets = pgTable("timesheets", {
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
    insertTimesheetSchema = createInsertSchema(timesheets).omit({
      id: true,
      createdAt: true,
      updatedAt: true
    });
    timesheetEntries = pgTable("timesheet_entries", {
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
    insertTimesheetEntrySchema = createInsertSchema(timesheetEntries).omit({
      id: true,
      createdAt: true,
      updatedAt: true
    });
    payrollBatchStatusEnum = z.enum(["open", "finalized", "exported"]);
    payrollBatches = pgTable("payroll_batches", {
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
    insertPayrollBatchSchema = createInsertSchema(payrollBatches).omit({
      id: true,
      createdAt: true,
      updatedAt: true
    });
    payrollBatchItemStatusEnum = z.enum(["included", "excluded"]);
    payrollBatchItems = pgTable("payroll_batch_items", {
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
    insertPayrollBatchItemSchema = createInsertSchema(payrollBatchItems).omit({
      id: true,
      createdAt: true,
      updatedAt: true
    });
    paymentProfiles = pgTable("payment_profiles", {
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
    insertPaymentProfileSchema = createInsertSchema(paymentProfiles).omit({
      id: true,
      createdAt: true,
      updatedAt: true
    });
    shiftStatusEnum = z.enum(["scheduled", "in_progress", "completed", "cancelled"]);
    shiftFrequencyEnum = z.enum(["one-time", "recurring", "open-ended"]);
    shiftCategoryEnum = z.enum(["hotel", "banquet", "janitorial", "airbnb"]);
    seriesFrequencyEnum = z.enum(["daily", "weekly", "biweekly", "monthly"]);
    seriesEndTypeEnum = z.enum(["date", "count", "never"]);
    shiftSeries = pgTable("shift_series", {
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
    insertShiftSeriesSchema = createInsertSchema(shiftSeries).omit({
      id: true,
      createdAt: true,
      updatedAt: true
    });
    recurrenceExceptions = pgTable("recurrence_exceptions", {
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
    auditLog = pgTable("audit_log", {
      id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
      userId: varchar("user_id").references(() => users.id),
      action: text("action").notNull(),
      entityType: text("entity_type").notNull(),
      entityId: varchar("entity_id"),
      details: text("details"),
      createdAt: timestamp("created_at").defaultNow().notNull()
    });
    userPhotos = pgTable("user_photos", {
      id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
      userId: varchar("user_id").notNull().references(() => users.id),
      url: text("url").notNull(),
      status: text("status").notNull().default("pending_review"),
      reviewerId: varchar("reviewer_id").references(() => users.id),
      reviewedAt: timestamp("reviewed_at"),
      rejectionReason: text("rejection_reason"),
      createdAt: timestamp("created_at").defaultNow().notNull()
    });
    shifts = pgTable("shifts", {
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
      workersNeeded: integer("workers_needed"),
      crmShiftId: text("crm_shift_id"),
      crmSource: boolean("crm_source").default(false),
      createdByUserId: varchar("created_by_user_id").references(() => users.id),
      createdAt: timestamp("created_at").defaultNow().notNull(),
      updatedAt: timestamp("updated_at").defaultNow().notNull()
    });
    insertShiftSchema = createInsertSchema(shifts).omit({
      id: true,
      createdAt: true,
      updatedAt: true
    });
    shiftRequestStatusEnum = z.enum(["draft", "submitted", "offered", "filled", "cancelled", "expired"]);
    shiftRequests = pgTable("shift_requests", {
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
      crmRequestId: text("crm_request_id"),
      crmSource: boolean("crm_source").default(false),
      createdAt: timestamp("created_at").defaultNow().notNull(),
      updatedAt: timestamp("updated_at").defaultNow().notNull()
    });
    insertShiftRequestSchema = createInsertSchema(shiftRequests).omit({
      id: true,
      createdAt: true,
      updatedAt: true
    });
    shiftOfferStatusEnum = z.enum(["pending", "accepted", "declined", "expired", "cancelled"]);
    shiftOffers = pgTable("shift_offers", {
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
    insertShiftOfferSchema = createInsertSchema(shiftOffers).omit({
      id: true,
      offeredAt: true,
      createdAt: true
    });
    appNotifications = pgTable("app_notifications", {
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
    insertAppNotificationSchema = createInsertSchema(appNotifications).omit({
      id: true,
      createdAt: true
    });
    shiftCheckinStatusEnum = z.enum(["on_my_way", "issue", "checked_in", "checked_out"]);
    shiftCheckins = pgTable("shift_checkins", {
      id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
      shiftId: varchar("shift_id").notNull().references(() => shifts.id),
      workerId: varchar("worker_id").notNull().references(() => users.id),
      status: text("status").notNull(),
      note: text("note"),
      createdAt: timestamp("created_at").defaultNow().notNull()
    });
    insertShiftCheckinSchema = createInsertSchema(shiftCheckins).omit({
      id: true,
      createdAt: true
    });
    sentReminders = pgTable("sent_reminders", {
      id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
      shiftId: varchar("shift_id").notNull().references(() => shifts.id),
      workerId: varchar("worker_id").notNull().references(() => users.id),
      reminderType: text("reminder_type").notNull(),
      sentAt: timestamp("sent_at").defaultNow().notNull()
    }, (table) => ({
      uniqueReminder: uniqueIndex("unique_shift_worker_reminder").on(table.shiftId, table.workerId, table.reminderType)
    }));
    exportAuditLogs = pgTable("export_audit_logs", {
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
    insertExportAuditLogSchema = createInsertSchema(exportAuditLogs).omit({
      id: true,
      createdAt: true
    });
    smsLogs = pgTable("sms_logs", {
      id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
      phoneNumber: text("phone_number").notNull(),
      direction: text("direction").notNull(),
      message: text("message").notNull(),
      shiftOfferId: varchar("shift_offer_id"),
      shiftId: varchar("shift_id"),
      workerId: varchar("worker_id"),
      status: text("status").notNull().default("sent"),
      openphoneMessageId: text("openphone_message_id"),
      classification: text("classification"),
      // sick_call, client_request, shift_response, general
      createdAt: timestamp("created_at").defaultNow().notNull()
    });
    discordAlerts = pgTable("discord_alerts", {
      id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
      alertId: text("alert_id").notNull().unique(),
      type: text("type").notNull().default("general"),
      title: text("title").notNull(),
      message: text("message").notNull(),
      sourcePhone: text("source_phone"),
      sourceWorkerId: varchar("source_worker_id"),
      workerId: varchar("worker_id"),
      clientId: varchar("client_id"),
      workplaceId: varchar("workplace_id"),
      shiftId: varchar("shift_id"),
      discordChannelId: text("discord_channel_id"),
      originalMessage: text("original_message"),
      status: text("status").notNull().default("pending"),
      acknowledgedBy: text("acknowledged_by"),
      acknowledgedAt: timestamp("acknowledged_at"),
      responseNote: text("response_note"),
      discordMessageId: text("discord_message_id"),
      actionsTaken: text("actions_taken"),
      createdAt: timestamp("created_at").defaultNow().notNull()
    });
    discordActionLogs = pgTable("discord_action_logs", {
      id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
      alertId: text("alert_id"),
      discordUserId: text("discord_user_id").notNull(),
      discordUsername: text("discord_username").notNull(),
      actionType: text("action_type").notNull(),
      rawMessage: text("raw_message").notNull(),
      parsedIntent: text("parsed_intent"),
      result: text("result"),
      success: boolean("success").notNull().default(true),
      failureReason: text("failure_reason"),
      createdAt: timestamp("created_at").defaultNow().notNull()
    });
    crmSyncLogs = pgTable("crm_sync_logs", {
      id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
      syncType: text("sync_type").notNull(),
      status: text("status").notNull().default("running"),
      createdCount: integer("created_count").default(0),
      updatedCount: integer("updated_count").default(0),
      skippedCount: integer("skipped_count").default(0),
      errorCount: integer("error_count").default(0),
      errorMessages: text("error_messages"),
      dryRun: boolean("dry_run").default(false),
      startedAt: timestamp("started_at").defaultNow().notNull(),
      completedAt: timestamp("completed_at")
    });
    crmPushQueue = pgTable("crm_push_queue", {
      id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
      entityType: text("entity_type").notNull(),
      entityId: text("entity_id").notNull(),
      action: text("action").notNull(),
      payload: text("payload").notNull(),
      status: text("status").notNull().default("pending"),
      attempts: integer("attempts").notNull().default(0),
      maxAttempts: integer("max_attempts").notNull().default(5),
      lastError: text("last_error"),
      nextRetryAt: timestamp("next_retry_at").defaultNow().notNull(),
      createdAt: timestamp("created_at").defaultNow().notNull(),
      completedAt: timestamp("completed_at")
    }, (table) => ({
      statusIdx: index("crm_push_queue_status_idx").on(table.status),
      nextRetryIdx: index("crm_push_queue_next_retry_idx").on(table.nextRetryAt)
    }));
    aiActionLogs = pgTable("ai_action_logs", {
      id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
      monitorType: text("monitor_type").notNull(),
      signalId: text("signal_id"),
      signalSummary: text("signal_summary").notNull(),
      actionTaken: text("action_taken").notNull(),
      alertSentTo: text("alert_sent_to"),
      errorMessage: text("error_message"),
      createdAt: timestamp("created_at").defaultNow().notNull()
    }, (table) => ({
      createdAtIdx: index("ai_action_logs_created_at_idx").on(table.createdAt),
      monitorTypeIdx: index("ai_action_logs_monitor_type_idx").on(table.monitorType)
    }));
    aiAlertState = pgTable("ai_alert_state", {
      id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
      entityType: text("entity_type").notNull(),
      entityId: text("entity_id").notNull(),
      alertType: text("alert_type").notNull(),
      alertedAt: timestamp("alerted_at").defaultNow().notNull(),
      alertCount: integer("alert_count").notNull().default(1)
    }, (table) => ({
      dedupeIdx: uniqueIndex("ai_alert_state_dedupe_idx").on(table.entityType, table.entityId, table.alertType)
    }));
    clawdChatMessages = pgTable("clawd_chat_messages", {
      id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
      userId: varchar("user_id").notNull().references(() => users.id),
      role: text("role").notNull(),
      // "user" | "assistant" | "system"
      content: text("content").notNull(),
      metadata: text("metadata"),
      // JSON: which assistants invoked, scores, etc.
      createdAt: timestamp("created_at").defaultNow().notNull()
    });
    clawdAssistantRuns = pgTable("clawd_assistant_runs", {
      id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
      chatMessageId: varchar("chat_message_id"),
      assistantType: text("assistant_type").notNull(),
      // "executive"|"staffing"|"attendance"|"recruitment"|"payroll"|"client_risk"|"communication"
      inputContext: text("input_context"),
      // JSON: what data was fed in
      outputFindings: text("output_findings"),
      // JSON: structured AssistantOutput
      durationMs: integer("duration_ms"),
      userId: varchar("user_id").references(() => users.id),
      createdAt: timestamp("created_at").defaultNow().notNull()
    }, (table) => ({
      createdAtIdx: index("clawd_runs_created_at_idx").on(table.createdAt),
      assistantTypeIdx: index("clawd_runs_assistant_type_idx").on(table.assistantType)
    }));
    appointments = pgTable("appointments", {
      id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
      title: text("title").notNull(),
      companyName: text("company_name").notNull(),
      contactName: text("contact_name").notNull(),
      contactPhone: text("contact_phone"),
      contactEmail: text("contact_email"),
      appointmentDate: timestamp("appointment_date").notNull(),
      location: text("location"),
      address: text("address"),
      latitude: doublePrecision("latitude"),
      longitude: doublePrecision("longitude"),
      leadSource: text("lead_source").notNull().default("other"),
      // cold_call, lead_generation, referral, website, crm_sync, other
      status: text("status").notNull().default("scheduled"),
      // scheduled, completed, cancelled, rescheduled, no_show
      assignedUserId: varchar("assigned_user_id").references(() => users.id),
      notes: text("notes"),
      outcome: text("outcome"),
      crmAppointmentId: text("crm_appointment_id"),
      crmSource: text("crm_source"),
      createdBy: varchar("created_by").references(() => users.id),
      createdAt: timestamp("created_at").defaultNow().notNull(),
      updatedAt: timestamp("updated_at").defaultNow().notNull()
    });
    insertAppointmentSchema = createInsertSchema(appointments).omit({
      id: true,
      createdAt: true,
      updatedAt: true
    });
    appConfig = pgTable("app_config", {
      key: text("key").primaryKey(),
      value: text("value").notNull(),
      description: text("description"),
      updatedAt: timestamp("updated_at").defaultNow().notNull(),
      updatedBy: varchar("updated_by").references(() => users.id)
    });
    aiMessageLog = pgTable("ai_message_log", {
      id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
      recipientPhone: text("recipient_phone").notNull(),
      recipientName: text("recipient_name"),
      message: text("message").notNull(),
      sentAt: timestamp("sent_at").defaultNow().notNull(),
      responseReceived: boolean("response_received").default(false).notNull(),
      responseReceivedAt: timestamp("response_received_at"),
      followupSent: boolean("followup_sent").default(false).notNull(),
      followupSentAt: timestamp("followup_sent_at"),
      followupMessage: text("followup_message"),
      triggeredBy: text("triggered_by").default("clawd"),
      // clawd, auto_responder, manual
      contextNote: text("context_note"),
      followupEnabled: boolean("followup_enabled").default(false).notNull(),
      createdAt: timestamp("created_at").defaultNow().notNull()
    });
    applicants = pgTable("applicants", {
      id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
      fullName: text("full_name").notNull(),
      phone: text("phone").notNull(),
      addressFull: text("address_full").notNull(),
      addressStreet: text("address_street"),
      addressCity: text("address_city"),
      addressProvince: text("address_province"),
      addressPostalCode: text("address_postal_code"),
      addressCountry: text("address_country").default("Canada"),
      addressLatitude: doublePrecision("address_latitude"),
      addressLongitude: doublePrecision("address_longitude"),
      applyingFor: text("applying_for").notNull(),
      jobPostingSource: text("job_posting_source").notNull(),
      photoData: text("photo_data"),
      // base64 data URI
      photoFilename: text("photo_filename"),
      photoMimeType: text("photo_mime_type"),
      photoFileSize: integer("photo_file_size"),
      resumeData: text("resume_data"),
      // base64 data URI
      resumeFilename: text("resume_filename"),
      resumeMimeType: text("resume_mime_type"),
      resumeFileSize: integer("resume_file_size"),
      smsConsent: boolean("sms_consent").notNull().default(false),
      smsConsentAt: timestamp("sms_consent_at"),
      marketingConsent: boolean("marketing_consent").notNull().default(false),
      marketingConsentAt: timestamp("marketing_consent_at"),
      promotionalConsent: boolean("promotional_consent").default(false),
      status: text("status").notNull().default("new"),
      // new, reviewing, interviewed, hired, rejected
      adminNotes: text("admin_notes"),
      submittedAt: timestamp("submitted_at").defaultNow().notNull(),
      createdAt: timestamp("created_at").defaultNow().notNull(),
      updatedAt: timestamp("updated_at").defaultNow().notNull()
    });
  }
});

// server/db.ts
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
var getDatabaseUrl, databaseUrl, client, db;
var init_db = __esm({
  "server/db.ts"() {
    "use strict";
    init_schema();
    getDatabaseUrl = () => {
      const dbUrl = process.env.DATABASE_URL || process.env.POSTGRES_URL || process.env.SUPABASE_DB_URL;
      if (!dbUrl) {
        console.error("\u274C Database Configuration Error:");
        console.error("   DATABASE_URL environment variable is required");
        console.error("   Available env vars: DATABASE_URL, POSTGRES_URL, SUPABASE_DB_URL");
        console.error("   Current environment variables:");
        Object.keys(process.env).filter((k) => k.includes("DATABASE") || k.includes("POSTGRES") || k.includes("SUPABASE")).forEach((k) => console.error(`   - ${k}: ${process.env[k]?.substring(0, 50)}...`));
        throw new Error("DATABASE_URL environment variable is required");
      }
      return dbUrl;
    };
    databaseUrl = getDatabaseUrl();
    client = postgres(databaseUrl);
    db = drizzle(client, { schema: schema_exports });
  }
});

// server/services/openphone.ts
var openphone_exports = {};
__export(openphone_exports, {
  logSMS: () => logSMS,
  sendConfirmationSMS: () => sendConfirmationSMS,
  sendSMS: () => sendSMS,
  sendShiftAssignedSMS: () => sendShiftAssignedSMS,
  sendShiftOfferSMS: () => sendShiftOfferSMS
});
import { eq } from "drizzle-orm";
async function sendSMS(toPhoneNumber, message) {
  if (!OPENPHONE_API_KEY) {
    console.error("[OPENPHONE] API key not configured");
    return { success: false, error: "API key not configured" };
  }
  const cleaned = toPhoneNumber.replace(/[^\d+]/g, "");
  const formatted = cleaned.startsWith("+") ? cleaned : `+1${cleaned}`;
  try {
    const response = await fetch("https://api.openphone.com/v1/messages", {
      method: "POST",
      headers: {
        "Authorization": OPENPHONE_API_KEY,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        content: message,
        from: OPENPHONE_PHONE_NUMBER_ID,
        to: [formatted]
      })
    });
    if (!response.ok) {
      const errorBody = await response.text();
      console.error(`[OPENPHONE] SMS send failed (${response.status}):`, errorBody);
      return { success: false, error: `HTTP ${response.status}: ${errorBody}` };
    }
    const data = await response.json();
    console.log(`[OPENPHONE] SMS sent to ${formatted}`);
    return { success: true, messageId: data?.data?.id || data?.id };
  } catch (error) {
    console.error("[OPENPHONE] SMS send error:", error?.message || error);
    return { success: false, error: error?.message || "Unknown error" };
  }
}
async function logSMS(params) {
  try {
    await db.insert(smsLogs).values({
      phoneNumber: params.phoneNumber,
      direction: params.direction,
      message: params.message,
      shiftOfferId: params.shiftOfferId || null,
      shiftId: params.shiftId || null,
      workerId: params.workerId || null,
      status: params.status,
      openphoneMessageId: params.openphoneMessageId || null
    });
  } catch (e) {
    console.error("[OPENPHONE] Failed to log SMS:", e?.message);
  }
}
async function sendShiftOfferSMS(worker, shift, offerId) {
  if (!worker.phone) {
    console.log(`[OPENPHONE] Worker ${worker.fullName} has no phone number, skipping SMS`);
    return;
  }
  let workplaceName = "Unknown Location";
  try {
    const [wp] = await db.select({ name: workplaces.name }).from(workplaces).where(eq(workplaces.id, shift.workplaceId));
    if (wp?.name) workplaceName = wp.name;
  } catch {
  }
  const timeRange = shift.endTime ? `${shift.startTime} - ${shift.endTime}` : `${shift.startTime} (open-ended)`;
  const message = `WFConnect Shift Available!

${shift.title}
Date: ${shift.date}
Time: ${timeRange}
Location: ${workplaceName}

Reply ACCEPT SHIFT to accept or DECLINE SHIFT to decline.`;
  const result = await sendSMS(worker.phone, message);
  await logSMS({
    phoneNumber: worker.phone,
    direction: "outbound",
    message,
    shiftOfferId: offerId,
    shiftId: shift.id,
    workerId: worker.id,
    status: result.success ? "sent" : "failed",
    openphoneMessageId: result.messageId
  });
}
async function sendShiftAssignedSMS(worker, shift) {
  if (!worker.phone) {
    console.log(`[OPENPHONE] Worker ${worker.fullName} has no phone number, skipping SMS`);
    return;
  }
  let workplaceName = "Unknown Location";
  try {
    const [wp] = await db.select({ name: workplaces.name }).from(workplaces).where(eq(workplaces.id, shift.workplaceId));
    if (wp?.name) workplaceName = wp.name;
  } catch {
  }
  const timeRange = shift.endTime ? `${shift.startTime} - ${shift.endTime}` : `${shift.startTime} (open-ended)`;
  const message = `WFConnect Shift Assigned!

${shift.title}
Date: ${shift.date}
Time: ${timeRange}
Location: ${workplaceName}

You have been assigned to this shift. Please confirm your availability.`;
  const result = await sendSMS(worker.phone, message);
  await logSMS({
    phoneNumber: worker.phone,
    direction: "outbound",
    message,
    shiftId: shift.id,
    workerId: worker.id,
    status: result.success ? "sent" : "failed",
    openphoneMessageId: result.messageId
  });
}
async function sendConfirmationSMS(phoneNumber, message, workerId) {
  const result = await sendSMS(phoneNumber, message);
  await logSMS({
    phoneNumber,
    direction: "outbound",
    message,
    workerId,
    status: result.success ? "sent" : "failed",
    openphoneMessageId: result.messageId
  });
}
var OPENPHONE_API_KEY, OPENPHONE_PHONE_NUMBER_ID;
var init_openphone = __esm({
  "server/services/openphone.ts"() {
    "use strict";
    init_db();
    init_schema();
    OPENPHONE_API_KEY = process.env.OPENPHONE_API_KEY;
    OPENPHONE_PHONE_NUMBER_ID = "PNo1n737XV";
  }
});

// server/services/discord.ts
var discord_exports = {};
__export(discord_exports, {
  acknowledgeAlert: () => acknowledgeAlert,
  sendDiscordNotification: () => sendDiscordNotification
});
import { eq as eq2 } from "drizzle-orm";
async function getWebhookUrl() {
  try {
    const [row] = await db.select().from(appConfig).where(eq2(appConfig.key, "discord_webhook_url"));
    if (row?.value) return row.value;
  } catch {
  }
  return process.env.DISCORD_WEBHOOK_URL || null;
}
async function sendDiscordNotification(opts) {
  const alertId = `WFC-${Date.now().toString(36).toUpperCase()}`;
  const webhookUrl = await getWebhookUrl();
  if (!webhookUrl) {
    console.log("[DISCORD] Webhook URL not configured, skipping notification");
    return { success: false, error: "Webhook URL not configured" };
  }
  try {
    const embed = {
      title: opts.title,
      description: opts.message,
      color: COLOR_MAP[opts.color || "blue"] || COLOR_MAP.blue,
      fields: opts.fields || [],
      footer: { text: `Alert ID: ${alertId} | Reply "ACK ${alertId}" to acknowledge` },
      timestamp: (/* @__PURE__ */ new Date()).toISOString()
    };
    const fetchUrl = webhookUrl.includes("?") ? `${webhookUrl}&wait=true` : `${webhookUrl}?wait=true`;
    const response = await fetch(fetchUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        username: "Oscar \u2014 WFConnect AI",
        embeds: [embed]
      })
    });
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[DISCORD] Send failed (${response.status}):`, errorText);
      return { success: false, alertId, error: `HTTP ${response.status}` };
    }
    let discordMessageId = null;
    let discordChannelId = null;
    try {
      const resJson = await response.clone().json();
      discordMessageId = resJson?.id || null;
      discordChannelId = resJson?.channel_id || null;
    } catch {
    }
    try {
      await db.insert(discordAlerts).values({
        alertId,
        type: opts.type || "general",
        title: opts.title,
        message: opts.message,
        sourcePhone: opts.sourcePhone || null,
        sourceWorkerId: opts.sourceWorkerId || null,
        workerId: opts.workerId || null,
        clientId: opts.clientId || null,
        workplaceId: opts.workplaceId || null,
        shiftId: opts.shiftId || null,
        originalMessage: opts.originalMessage || null,
        discordMessageId,
        discordChannelId,
        status: "pending",
        actionsTaken: opts.actionsTaken || null
      });
    } catch (dbErr) {
      console.error("[DISCORD] Failed to log alert:", dbErr?.message);
    }
    console.log(`[DISCORD] Notification sent: ${opts.title} (${alertId})`);
    return { success: true, alertId };
  } catch (error) {
    console.error("[DISCORD] Send error:", error?.message || error);
    return { success: false, alertId, error: error?.message || "Unknown error" };
  }
}
async function acknowledgeAlert(alertId, acknowledgedBy, responseNote) {
  try {
    const [alert] = await db.select().from(discordAlerts).where(eq2(discordAlerts.alertId, alertId));
    if (!alert) {
      console.log(`[DISCORD] Alert ${alertId} not found`);
      return false;
    }
    await db.update(discordAlerts).set({
      status: "acknowledged",
      acknowledgedBy,
      acknowledgedAt: /* @__PURE__ */ new Date(),
      responseNote: responseNote || null
    }).where(eq2(discordAlerts.alertId, alertId));
    console.log(`[DISCORD] Alert ${alertId} acknowledged by ${acknowledgedBy}`);
    return true;
  } catch (err) {
    console.error("[DISCORD] Acknowledge error:", err?.message);
    return false;
  }
}
var COLOR_MAP;
var init_discord = __esm({
  "server/services/discord.ts"() {
    "use strict";
    init_db();
    init_schema();
    COLOR_MAP = {
      red: 15680580,
      blue: 3900150,
      green: 2278750,
      amber: 16096779,
      purple: 9133302
    };
  }
});

// server/services/weekdays-crm.ts
var weekdays_crm_exports = {};
__export(weekdays_crm_exports, {
  createCrmHotelRequest: () => createCrmHotelRequest,
  createCrmWorkplace: () => createCrmWorkplace,
  getBoard: () => getBoard,
  getBoards: () => getBoards,
  getConfirmedShifts: () => getConfirmedShifts,
  getDutyDays: () => getDutyDays,
  getHotelRequests: () => getHotelRequests,
  getWorkplaces: () => getWorkplaces,
  isConfigured: () => isConfigured,
  testConnection: () => testConnection,
  updateCrmConfirmedShift: () => updateCrmConfirmedShift,
  updateCrmHotelRequest: () => updateCrmHotelRequest,
  updateCrmWorkplace: () => updateCrmWorkplace
});
function createCrmError(message, statusCode) {
  const error = new Error(message);
  error.statusCode = statusCode;
  error.isRetryable = statusCode !== void 0 && (statusCode >= 500 || statusCode === 408 || statusCode === 429);
  return error;
}
function getApiKey() {
  const key = process.env.WEEKDAYS_API_KEY;
  if (!key) {
    throw createCrmError("WEEKDAYS_API_KEY environment variable is not set");
  }
  return key;
}
function getTeamId() {
  const teamId = process.env.WEEKDAYS_TEAM_ID;
  if (!teamId) {
    throw createCrmError("WEEKDAYS_TEAM_ID environment variable is not set");
  }
  return teamId;
}
function isConfigured() {
  return !!(process.env.WEEKDAYS_API_KEY && process.env.WEEKDAYS_TEAM_ID);
}
async function sleep(ms) {
  return new Promise((resolve2) => setTimeout(resolve2, ms));
}
async function fetchWithRetry(path2, options) {
  const apiKey = getApiKey();
  const url = new URL(path2, CRM_BASE_URL).toString();
  let lastError = null;
  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3e4);
      const response = await fetch(url, {
        ...options,
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "Content-Type": "application/json",
          ...options?.headers || {}
        },
        signal: controller.signal
      });
      clearTimeout(timeoutId);
      if (!response.ok) {
        const body = await response.text().catch(() => "");
        const error = createCrmError(
          `CRM API ${response.status}: ${body || response.statusText}`,
          response.status
        );
        if (!error.isRetryable || attempt === MAX_RETRIES - 1) {
          throw error;
        }
        lastError = error;
        const backoff = INITIAL_BACKOFF_MS * Math.pow(2, attempt);
        console.warn(`[CRM] Retryable error on attempt ${attempt + 1}/${MAX_RETRIES}, retrying in ${backoff}ms: ${error.message}`);
        await sleep(backoff);
        continue;
      }
      return await response.json();
    } catch (err) {
      if (err.name === "AbortError") {
        lastError = createCrmError("CRM API request timed out", 408);
        lastError.isRetryable = true;
      } else if (err.isRetryable !== void 0) {
        lastError = err;
      } else {
        lastError = createCrmError(err.message || "Unknown network error");
        lastError.isRetryable = true;
      }
      if (!lastError.isRetryable || attempt === MAX_RETRIES - 1) {
        throw lastError;
      }
      const backoff = INITIAL_BACKOFF_MS * Math.pow(2, attempt);
      console.warn(`[CRM] Error on attempt ${attempt + 1}/${MAX_RETRIES}, retrying in ${backoff}ms: ${lastError.message}`);
      await sleep(backoff);
    }
  }
  throw lastError ?? createCrmError("All retry attempts exhausted");
}
async function testConnection() {
  try {
    if (!isConfigured()) {
      return { connected: false, error: "CRM environment variables not configured" };
    }
    const teamId = getTeamId();
    await fetchWithRetry(`/api/teams/${teamId}/workplaces?limit=1`);
    return { connected: true };
  } catch (err) {
    console.error("[CRM] Connection test failed:", err.message);
    return { connected: false, error: err.message };
  }
}
async function getWorkplaces() {
  const teamId = getTeamId();
  const data = await fetchWithRetry(
    `/api/teams/${teamId}/workplaces`
  );
  return Array.isArray(data) ? data : data.data || [];
}
async function getConfirmedShifts() {
  const teamId = getTeamId();
  const data = await fetchWithRetry(
    `/api/teams/${teamId}/confirmed-shifts`
  );
  return Array.isArray(data) ? data : data.data || [];
}
async function getHotelRequests() {
  const teamId = getTeamId();
  const data = await fetchWithRetry(
    `/api/teams/${teamId}/hotel-requests`
  );
  return Array.isArray(data) ? data : data.data || [];
}
async function getDutyDays() {
  const teamId = getTeamId();
  const data = await fetchWithRetry(
    `/api/teams/${teamId}/duty-days`
  );
  return Array.isArray(data) ? data : data.data || [];
}
async function getBoards() {
  const teamId = getTeamId();
  const data = await fetchWithRetry(
    `/api/teams/${teamId}/boards`
  );
  return Array.isArray(data) ? data : data.data || [];
}
async function getBoard(boardId) {
  const teamId = getTeamId();
  return await fetchWithRetry(
    `/api/teams/${teamId}/boards/${boardId}`
  );
}
async function createCrmWorkplace(input) {
  const teamId = getTeamId();
  const body = {
    name: input.name,
    address: input.address || "",
    location: input.location || "",
    province: input.province || "",
    latitude: input.latitude,
    longitude: input.longitude,
    contactPerson: input.contactPerson || "",
    notes: input.notes || "",
    isActive: input.isActive !== false
  };
  console.log(`[CRM-SYNC] Creating workplace in CRM: "${input.name}"`);
  const result = await fetchWithRetry(
    `/api/teams/${teamId}/workplaces`,
    { method: "POST", body: JSON.stringify(body) }
  );
  console.log(`[CRM-SYNC] Workplace created in CRM: "${input.name}" \u2192 ID ${result.id}`);
  return result;
}
async function updateCrmWorkplace(crmId, input) {
  const teamId = getTeamId();
  const body = {};
  if (input.name !== void 0) body.name = input.name;
  if (input.address !== void 0) body.address = input.address;
  if (input.location !== void 0) body.location = input.location;
  if (input.province !== void 0) body.province = input.province;
  if (input.latitude !== void 0) body.latitude = input.latitude;
  if (input.longitude !== void 0) body.longitude = input.longitude;
  if (input.contactPerson !== void 0) body.contactPerson = input.contactPerson;
  if (input.notes !== void 0) body.notes = input.notes;
  if (input.isActive !== void 0) body.isActive = input.isActive;
  console.log(`[CRM-SYNC] Updating workplace in CRM: ID ${crmId}`);
  const result = await fetchWithRetry(
    `/api/teams/${teamId}/workplaces/${crmId}`,
    { method: "PATCH", body: JSON.stringify(body) }
  );
  console.log(`[CRM-SYNC] Workplace updated in CRM: ID ${crmId}`);
  return result;
}
async function createCrmHotelRequest(input) {
  const teamId = getTeamId();
  const body = {
    hotelName: input.hotelName,
    location: input.location || "",
    address: input.address || "",
    roleNeeded: input.roleNeeded,
    quantityNeeded: input.quantityNeeded || 1,
    shiftStartAt: input.shiftStartAt,
    shiftEndAt: input.shiftEndAt,
    payRate: input.payRate,
    notes: input.notes || ""
  };
  console.log(`[CRM-SYNC] Creating hotel request in CRM: "${input.hotelName}" - ${input.roleNeeded}`);
  const result = await fetchWithRetry(
    `/api/teams/${teamId}/hotel-requests`,
    { method: "POST", body: JSON.stringify(body) }
  );
  console.log(`[CRM-SYNC] Hotel request created in CRM: ID ${result.id}`);
  return result;
}
async function updateCrmHotelRequest(crmId, input) {
  const teamId = getTeamId();
  const body = {};
  if (input.hotelName !== void 0) body.hotelName = input.hotelName;
  if (input.location !== void 0) body.location = input.location;
  if (input.address !== void 0) body.address = input.address;
  if (input.roleNeeded !== void 0) body.roleNeeded = input.roleNeeded;
  if (input.quantityNeeded !== void 0) body.quantityNeeded = input.quantityNeeded;
  if (input.shiftStartAt !== void 0) body.shiftStartAt = input.shiftStartAt;
  if (input.shiftEndAt !== void 0) body.shiftEndAt = input.shiftEndAt;
  if (input.payRate !== void 0) body.payRate = input.payRate;
  if (input.notes !== void 0) body.notes = input.notes;
  if (input.status !== void 0) body.status = input.status;
  console.log(`[CRM-SYNC] Updating hotel request in CRM: ID ${crmId}`);
  const result = await fetchWithRetry(
    `/api/teams/${teamId}/hotel-requests/${crmId}`,
    { method: "PATCH", body: JSON.stringify(body) }
  );
  console.log(`[CRM-SYNC] Hotel request updated in CRM: ID ${crmId}`);
  return result;
}
async function updateCrmConfirmedShift(crmId, input) {
  const teamId = getTeamId();
  const body = {};
  if (input.confirmStatus !== void 0) body.confirmStatus = input.confirmStatus;
  if (input.checkedInAt !== void 0) body.checkedInAt = input.checkedInAt;
  if (input.completedAt !== void 0) body.completedAt = input.completedAt;
  if (input.notes !== void 0) body.notes = input.notes;
  console.log(`[CRM-SYNC] Updating confirmed shift in CRM: ID ${crmId}`);
  const result = await fetchWithRetry(
    `/api/teams/${teamId}/confirmed-shifts/${crmId}`,
    { method: "PATCH", body: JSON.stringify(body) }
  );
  console.log(`[CRM-SYNC] Confirmed shift updated in CRM: ID ${crmId}`);
  return result;
}
var CRM_BASE_URL, MAX_RETRIES, INITIAL_BACKOFF_MS;
var init_weekdays_crm = __esm({
  "server/services/weekdays-crm.ts"() {
    "use strict";
    CRM_BASE_URL = "https://weekdays.wfconnect.org";
    MAX_RETRIES = 3;
    INITIAL_BACKOFF_MS = 1e3;
  }
});

// server/services/crm-sync.ts
var crm_sync_exports = {};
__export(crm_sync_exports, {
  backfillWorkplacesToCrm: () => backfillWorkplacesToCrm,
  clearAutoSyncError: () => clearAutoSyncError,
  enqueueCrmPush: () => enqueueCrmPush,
  getCachedConnectionStatus: () => getCachedConnectionStatus,
  getCrmPushQueueStats: () => getCrmPushQueueStats,
  getLastAutoSyncError: () => getLastAutoSyncError,
  getLastPushCompletedAt: () => getLastPushCompletedAt,
  getLastSyncCompletedAt: () => getLastSyncCompletedAt,
  getLastSyncCompletedAtFromDb: () => getLastSyncCompletedAtFromDb,
  getSyncLogs: () => getSyncLogs,
  getSyncStatus: () => getSyncStatus,
  isSyncRunning: () => isSyncRunning,
  markSyncCompleted: () => markSyncCompleted,
  processCrmPushQueue: () => processCrmPushQueue,
  syncAll: () => syncAll,
  syncConfirmedShifts: () => syncConfirmedShifts,
  syncHotelRequests: () => syncHotelRequests,
  syncWorkplaces: () => syncWorkplaces
});
import { eq as eq3, and as and2, sql as sql2, isNull, ne, notInArray, lte, gte, count } from "drizzle-orm";
function emptySyncResult() {
  return { created: 0, updated: 0, skipped: 0, errors: 0, errorMessages: [] };
}
function acquireLock() {
  if (syncRunning) return false;
  syncRunning = true;
  return true;
}
function releaseLock() {
  syncRunning = false;
}
function isSyncRunning() {
  return syncRunning;
}
function getLastAutoSyncError() {
  return lastAutoSyncError;
}
function getLastSyncCompletedAt() {
  return lastSyncCompletedAt;
}
async function getLastSyncCompletedAtFromDb() {
  if (lastSyncCompletedAt) return lastSyncCompletedAt;
  try {
    const [lastLog] = await db.select({ completedAt: crmSyncLogs.completedAt }).from(crmSyncLogs).where(eq3(crmSyncLogs.status, "completed")).orderBy(sql2`${crmSyncLogs.completedAt} DESC`).limit(1);
    if (lastLog?.completedAt) {
      lastSyncCompletedAt = lastLog.completedAt;
      return lastLog.completedAt;
    }
  } catch {
  }
  return null;
}
function getLastPushCompletedAt() {
  return lastPushCompletedAt;
}
function markSyncCompleted() {
  lastSyncCompletedAt = /* @__PURE__ */ new Date();
}
function clearAutoSyncError() {
  lastAutoSyncError = null;
}
async function sendCrmNewRequestAlerts(crmReq) {
  const alertMsg = `New CRM Hotel Request: ${crmReq.hotelName} needs ${crmReq.quantityNeeded || 1} ${crmReq.roleNeeded || "worker(s)"} \u2014 ${crmReq.shiftStartAt || "TBD"} to ${crmReq.shiftEndAt || "TBD"}`;
  try {
    const { sendDiscordNotification: sendDiscordNotification2 } = await Promise.resolve().then(() => (init_discord(), discord_exports));
    await sendDiscordNotification2({
      title: "New CRM Hotel Request (Sync)",
      message: alertMsg,
      color: "blue"
    });
  } catch (err) {
    console.error("[CRM-SYNC] Discord alert failed:", err?.message);
  }
  try {
    const GM_PHONE = "+14166028038";
    const { sendSMS: sendSMS2, logSMS: logSMS2 } = await Promise.resolve().then(() => (init_openphone(), openphone_exports));
    await sendSMS2(GM_PHONE, alertMsg);
    await logSMS2({ phoneNumber: GM_PHONE, direction: "outbound", message: alertMsg, status: "sent" });
  } catch (err) {
    console.error("[CRM-SYNC] SMS alert failed:", err?.message);
  }
}
async function getCachedConnectionStatus() {
  const now = Date.now();
  if (cachedConnectionStatus && now - cachedConnectionStatus.checkedAt < CONNECTION_CACHE_TTL) {
    return { connected: cachedConnectionStatus.connected, error: cachedConnectionStatus.error };
  }
  const result = await testConnection();
  cachedConnectionStatus = { connected: result.connected, error: result.error, checkedAt: now };
  return result;
}
async function createSyncLog(syncType, dryRun) {
  const [log2] = await db.insert(crmSyncLogs).values({
    syncType,
    status: "running",
    dryRun,
    startedAt: /* @__PURE__ */ new Date()
  }).returning({ id: crmSyncLogs.id });
  return log2.id;
}
async function completeSyncLog(logId, status, result) {
  await db.update(crmSyncLogs).set({
    status,
    createdCount: result.created,
    updatedCount: result.updated,
    skippedCount: result.skipped,
    errorCount: result.errors,
    errorMessages: result.errorMessages.length > 0 ? result.errorMessages.join("\n") : null,
    completedAt: /* @__PURE__ */ new Date()
  }).where(eq3(crmSyncLogs.id, logId));
}
function normalizeString(s) {
  return (s || "").trim().toLowerCase().replace(/\s+/g, " ");
}
function normalizePhone(phone) {
  if (!phone) return null;
  const digits = phone.replace(/\D/g, "");
  if (digits.length === 11 && digits.startsWith("1")) return digits.slice(1);
  if (digits.length === 10) return digits;
  return digits;
}
function crmToLocal(isoString) {
  const raw = (isoString || "").replace(/Z$/, "").replace(/[+-]\d{2}:\d{2}$/, "");
  const [datePart, timePart = ""] = raw.split("T");
  return {
    date: datePart || "",
    time: timePart.substring(0, 5) || ""
  };
}
async function syncWorkplaces(dryRun = false, _skipLock = false) {
  if (!_skipLock && !acquireLock()) {
    throw new Error("A sync is already running. Please wait for it to complete.");
  }
  const result = emptySyncResult();
  const logId = await createSyncLog("workplaces", dryRun);
  try {
    const crmWorkplaces = await getWorkplaces();
    const existingWorkplaces = await db.select().from(workplaces);
    const byExternalId = new Map(
      existingWorkplaces.filter((w) => w.crmExternalId).map((w) => [w.crmExternalId, w])
    );
    const byNameAddress = new Map(
      existingWorkplaces.map((w) => [
        `${normalizeString(w.name)}|${normalizeString(w.addressLine1)}`,
        w
      ])
    );
    for (const crmWp of crmWorkplaces) {
      try {
        let existing = byExternalId.get(crmWp.id);
        if (!existing) {
          const key = `${normalizeString(crmWp.name)}|${normalizeString(crmWp.address)}`;
          existing = byNameAddress.get(key);
        }
        if (existing) {
          const needsUpdate = existing.name !== crmWp.name || existing.addressLine1 !== (crmWp.address || null) || existing.latitude !== (crmWp.latitude || null) || existing.longitude !== (crmWp.longitude || null) || existing.isActive !== crmWp.isActive || existing.crmExternalId !== crmWp.id;
          if (needsUpdate) {
            if (!dryRun) {
              await db.update(workplaces).set({
                name: crmWp.name,
                addressLine1: crmWp.address || existing.addressLine1,
                city: crmWp.location || existing.city,
                province: crmWp.province || existing.province,
                latitude: crmWp.latitude ?? existing.latitude,
                longitude: crmWp.longitude ?? existing.longitude,
                isActive: crmWp.isActive,
                crmExternalId: crmWp.id,
                crmSource: existing.crmSource || true,
                updatedAt: /* @__PURE__ */ new Date()
              }).where(eq3(workplaces.id, existing.id));
            }
            result.updated++;
          } else {
            result.skipped++;
          }
        } else {
          if (!dryRun) {
            await db.insert(workplaces).values({
              name: crmWp.name,
              addressLine1: crmWp.address || null,
              city: crmWp.location || null,
              province: crmWp.province || null,
              latitude: crmWp.latitude ?? null,
              longitude: crmWp.longitude ?? null,
              isActive: crmWp.isActive,
              crmExternalId: crmWp.id,
              crmSource: true
            });
          }
          result.created++;
        }
      } catch (err) {
        result.errors++;
        result.errorMessages.push(`Workplace "${crmWp.name}": ${err.message}`);
      }
    }
    await completeSyncLog(logId, "completed", result);
    console.log(`[CRM-SYNC] Workplaces: ${result.created} created, ${result.updated} updated, ${result.skipped} skipped, ${result.errors} errors${dryRun ? " (dry run)" : ""}`);
  } catch (err) {
    result.errors++;
    result.errorMessages.push(`Fatal: ${err.message}`);
    await completeSyncLog(logId, "failed", result);
    console.error("[CRM-SYNC] Workplaces sync failed:", err.message);
  } finally {
    if (!_skipLock) releaseLock();
  }
  return result;
}
async function syncConfirmedShifts(dryRun = false, _skipLock = false) {
  if (!_skipLock && !acquireLock()) {
    throw new Error("A sync is already running. Please wait for it to complete.");
  }
  const result = emptySyncResult();
  const logId = await createSyncLog("shifts", dryRun);
  try {
    const crmShifts = await getConfirmedShifts();
    const existingShifts = await db.select().from(shifts);
    const existingWorkplacesList = await db.select().from(workplaces);
    const allUsers = await db.select({ id: users.id, phone: users.phone, fullName: users.fullName }).from(users);
    const shiftByCrmId = new Map(
      existingShifts.filter((s) => s.crmShiftId).map((s) => [s.crmShiftId, s])
    );
    const workplaceByName = new Map(
      existingWorkplacesList.map((w) => [normalizeString(w.name), w])
    );
    const workplaceByExternalId = new Map(
      existingWorkplacesList.filter((w) => w.crmExternalId).map((w) => [w.crmExternalId, w])
    );
    const userByPhone = new Map(
      allUsers.filter((u) => u.phone).map((u) => [normalizePhone(u.phone), u])
    );
    for (const crmShift of crmShifts) {
      try {
        let workplace = workplaceByName.get(normalizeString(crmShift.request.hotelName));
        if (!workplace) {
          for (const [, wp] of workplaceByExternalId) {
            if (normalizeString(wp.name) === normalizeString(crmShift.request.hotelName)) {
              workplace = wp;
              break;
            }
          }
        }
        if (!workplace) {
          if (!dryRun) {
            const [newWp] = await db.insert(workplaces).values({
              name: crmShift.request.hotelName,
              addressLine1: crmShift.request.address || null,
              city: crmShift.request.location || null,
              crmSource: true
            }).returning();
            workplace = newWp;
            workplaceByName.set(normalizeString(newWp.name), newWp);
          } else {
            result.created++;
            continue;
          }
        }
        const start = crmToLocal(crmShift.scheduledStartAt);
        const end = crmToLocal(crmShift.scheduledEndAt);
        let workerUserId = null;
        if (crmShift.quoContactPhoneSnapshot) {
          const normalizedPhone = normalizePhone(crmShift.quoContactPhoneSnapshot);
          if (normalizedPhone) {
            const matchedUser = userByPhone.get(normalizedPhone);
            if (matchedUser) workerUserId = matchedUser.id;
          }
        }
        const statusMap = {
          CONFIRMED: "scheduled",
          COMPLETED: "completed"
        };
        const mappedStatus = statusMap[crmShift.confirmStatus] || "scheduled";
        const existing = shiftByCrmId.get(crmShift.id);
        if (existing) {
          if (!dryRun) {
            await db.update(shifts).set({
              title: crmShift.request.hotelName,
              date: start.date,
              startTime: start.time,
              endTime: end.time,
              roleType: crmShift.request.roleNeeded,
              status: mappedStatus,
              workplaceId: workplace.id,
              workerUserId,
              category: "hotel",
              updatedAt: /* @__PURE__ */ new Date()
            }).where(eq3(shifts.id, existing.id));
          }
          result.updated++;
        } else {
          if (!dryRun) {
            await db.insert(shifts).values({
              title: crmShift.request.hotelName,
              date: start.date,
              startTime: start.time,
              endTime: end.time,
              roleType: crmShift.request.roleNeeded,
              status: mappedStatus,
              workplaceId: workplace.id,
              workerUserId,
              category: "hotel",
              crmShiftId: crmShift.id,
              crmSource: true
            });
          }
          result.created++;
        }
      } catch (err) {
        result.errors++;
        result.errorMessages.push(`Shift "${crmShift.request?.hotelName || crmShift.id}": ${err.message}`);
      }
    }
    try {
      const activeCrmShiftIds = crmShifts.map((s) => s.id);
      const staleShifts = await db.select({ id: shifts.id, title: shifts.title }).from(shifts).where(
        and2(
          eq3(shifts.crmSource, true),
          ne(shifts.status, "cancelled"),
          ne(shifts.status, "completed"),
          // crmShiftId must be set (non-null) and not in the active set
          sql2`${shifts.crmShiftId} IS NOT NULL`,
          activeCrmShiftIds.length > 0 ? notInArray(shifts.crmShiftId, activeCrmShiftIds) : sql2`true`
        )
      );
      for (const stale of staleShifts) {
        if (!dryRun) {
          await db.update(shifts).set({ status: "cancelled", updatedAt: /* @__PURE__ */ new Date() }).where(eq3(shifts.id, stale.id));
        }
        result.updated++;
        console.log(`[CRM-SYNC] Cancelled stale shift: "${stale.title}" (id=${stale.id})${dryRun ? " (dry run)" : ""}`);
      }
    } catch (err) {
      result.errorMessages.push(`Stale shift cleanup: ${err.message}`);
    }
    await completeSyncLog(logId, "completed", result);
    console.log(`[CRM-SYNC] Shifts: ${result.created} created, ${result.updated} updated, ${result.skipped} skipped, ${result.errors} errors${dryRun ? " (dry run)" : ""}`);
  } catch (err) {
    result.errors++;
    result.errorMessages.push(`Fatal: ${err.message}`);
    await completeSyncLog(logId, "failed", result);
    console.error("[CRM-SYNC] Shifts sync failed:", err.message);
  } finally {
    if (!_skipLock) releaseLock();
  }
  return result;
}
async function syncHotelRequests(dryRun = false, _skipLock = false) {
  if (!_skipLock && !acquireLock()) {
    throw new Error("A sync is already running. Please wait for it to complete.");
  }
  const result = emptySyncResult();
  const logId = await createSyncLog("hotel-requests", dryRun);
  try {
    const crmRequests = await getHotelRequests();
    const existingRequests = await db.select().from(shiftRequests);
    const existingWorkplacesList = await db.select().from(workplaces);
    const adminUsers = await db.select({ id: users.id }).from(users).where(eq3(users.role, "admin")).limit(1);
    const adminId = adminUsers[0]?.id;
    if (!adminId) {
      throw new Error("No admin user found to assign as client for CRM shift requests");
    }
    const requestByCrmId = new Map(
      existingRequests.filter((r) => r.crmRequestId).map((r) => [r.crmRequestId, r])
    );
    const workplaceByName = new Map(
      existingWorkplacesList.map((w) => [normalizeString(w.name), w])
    );
    const activeRequests = crmRequests.filter((r) => !r.isDeleted);
    const deletedRequestIds = new Set(
      crmRequests.filter((r) => r.isDeleted).map((r) => r.id)
    );
    for (const [crmId, existingReq] of requestByCrmId) {
      if (deletedRequestIds.has(crmId) && existingReq.status !== "cancelled") {
        if (!dryRun) {
          await db.update(shiftRequests).set({ status: "cancelled", updatedAt: /* @__PURE__ */ new Date() }).where(eq3(shiftRequests.id, existingReq.id));
        }
        result.updated++;
      }
    }
    for (const crmReq of activeRequests) {
      try {
        let workplace = workplaceByName.get(normalizeString(crmReq.hotelName));
        if (!workplace) {
          if (!dryRun) {
            const [newWp] = await db.insert(workplaces).values({
              name: crmReq.hotelName,
              addressLine1: crmReq.address || null,
              city: crmReq.location || null,
              crmSource: true
            }).returning();
            workplace = newWp;
            workplaceByName.set(normalizeString(newWp.name), newWp);
          } else {
            result.created++;
            continue;
          }
        }
        const start = crmToLocal(crmReq.shiftStartAt);
        const end = crmToLocal(crmReq.shiftEndAt);
        const statusMap = {
          NEW: "submitted",
          CONFIRMED: "filled"
        };
        const mappedStatus = statusMap[crmReq.status] || "submitted";
        const existing = requestByCrmId.get(crmReq.id);
        if (existing) {
          const needsUpdate = existing.status !== mappedStatus || existing.roleType !== crmReq.roleNeeded;
          if (needsUpdate) {
            if (!dryRun) {
              await db.update(shiftRequests).set({
                roleType: crmReq.roleNeeded,
                date: start.date,
                startTime: start.time,
                endTime: end.time,
                status: mappedStatus,
                notes: [crmReq.hotelName, crmReq.notes].filter(Boolean).join(" - "),
                updatedAt: /* @__PURE__ */ new Date()
              }).where(eq3(shiftRequests.id, existing.id));
            }
            result.updated++;
          } else {
            result.skipped++;
          }
        } else {
          if (!dryRun) {
            await db.insert(shiftRequests).values({
              clientId: adminId,
              workplaceId: workplace.id,
              roleType: crmReq.roleNeeded,
              date: start.date,
              startTime: start.time,
              endTime: end.time,
              notes: [crmReq.hotelName, crmReq.notes].filter(Boolean).join(" - "),
              status: mappedStatus,
              crmRequestId: crmReq.id,
              crmSource: true
            });
            sendCrmNewRequestAlerts(crmReq).catch(
              (err) => console.error("[CRM-SYNC] Alert failed for new hotel request:", err?.message)
            );
          }
          result.created++;
        }
      } catch (err) {
        result.errors++;
        result.errorMessages.push(`Hotel request "${crmReq.hotelName}": ${err.message}`);
      }
    }
    await completeSyncLog(logId, "completed", result);
    console.log(`[CRM-SYNC] Hotel requests: ${result.created} created, ${result.updated} updated, ${result.skipped} skipped, ${result.errors} errors${dryRun ? " (dry run)" : ""}`);
  } catch (err) {
    result.errors++;
    result.errorMessages.push(`Fatal: ${err.message}`);
    await completeSyncLog(logId, "failed", result);
    console.error("[CRM-SYNC] Hotel requests sync failed:", err.message);
  } finally {
    if (!_skipLock) releaseLock();
  }
  return result;
}
async function syncAll(dryRun = false) {
  if (!acquireLock()) {
    throw new Error("A sync is already running. Please wait for it to complete.");
  }
  try {
    if (!dryRun) {
      try {
        await processCrmPushQueue();
      } catch (pushErr) {
        console.error("[CRM-SYNC] Push queue processing failed during syncAll:", pushErr?.message);
      }
    }
    const wpResult = await syncWorkplaces(dryRun, true);
    const shiftResult = await syncConfirmedShifts(dryRun, true);
    const hrResult = await syncHotelRequests(dryRun, true);
    const fullResult = {
      workplaces: wpResult,
      shifts: shiftResult,
      hotelRequests: hrResult,
      totalCreated: wpResult.created + shiftResult.created + hrResult.created,
      totalUpdated: wpResult.updated + shiftResult.updated + hrResult.updated,
      totalErrors: wpResult.errors + shiftResult.errors + hrResult.errors
    };
    if (fullResult.totalErrors > 0) {
      lastAutoSyncError = [
        ...wpResult.errorMessages,
        ...shiftResult.errorMessages,
        ...hrResult.errorMessages
      ].join("; ");
    } else {
      lastAutoSyncError = null;
    }
    lastSyncCompletedAt = /* @__PURE__ */ new Date();
    return fullResult;
  } finally {
    releaseLock();
  }
}
async function getSyncStatus() {
  const connectionTest = isConfigured() ? await getCachedConnectionStatus() : { connected: false, error: "Not configured" };
  const recentLogs = await db.select().from(crmSyncLogs).orderBy(sql2`${crmSyncLogs.startedAt} DESC`).limit(10);
  const lastSyncs = {};
  for (const syncType of ["workplaces", "shifts", "hotel-requests", "all"]) {
    const log2 = recentLogs.find((l) => l.syncType === syncType);
    if (log2) {
      lastSyncs[syncType] = {
        status: log2.status,
        startedAt: log2.startedAt,
        completedAt: log2.completedAt,
        created: log2.createdCount,
        updated: log2.updatedCount,
        skipped: log2.skippedCount,
        errors: log2.errorCount,
        dryRun: log2.dryRun
      };
    }
  }
  return {
    configured: isConfigured(),
    connected: connectionTest.connected,
    connectionError: connectionTest.error,
    lastSyncError: lastAutoSyncError,
    syncRunning,
    lastSyncs
  };
}
async function getSyncLogs(limit = 50) {
  return await db.select().from(crmSyncLogs).orderBy(sql2`${crmSyncLogs.startedAt} DESC`).limit(limit);
}
async function backfillWorkplacesToCrm() {
  const result = { pushed: 0, matched: 0, failed: 0, details: [] };
  if (!isConfigured()) {
    result.details.push("CRM not configured \u2014 skipping backfill");
    return result;
  }
  try {
    const unlinked = await db.select().from(workplaces).where(
      and2(
        isNull(workplaces.crmExternalId),
        eq3(workplaces.crmSource, false)
      )
    );
    if (unlinked.length === 0) {
      result.details.push("No unlinked workplaces found \u2014 nothing to backfill");
      console.log("[CRM-SYNC] Backfill: no unlinked workplaces");
      return result;
    }
    console.log(`[CRM-SYNC] Backfill: found ${unlinked.length} unlinked workplace(s)`);
    let crmWorkplaces;
    try {
      crmWorkplaces = await getWorkplaces();
    } catch (err) {
      result.details.push(`Failed to fetch CRM workplaces: ${err.message}`);
      result.failed = unlinked.length;
      return result;
    }
    const crmByName = new Map(
      crmWorkplaces.map((w) => [normalizeString(w.name), w])
    );
    for (const wp of unlinked) {
      const normalizedName = normalizeString(wp.name);
      const existingCrm = crmByName.get(normalizedName);
      if (existingCrm) {
        try {
          await db.update(workplaces).set({ crmExternalId: existingCrm.id, updatedAt: /* @__PURE__ */ new Date() }).where(eq3(workplaces.id, wp.id));
          result.matched++;
          result.details.push(`Matched "${wp.name}" \u2192 CRM ID ${existingCrm.id}`);
          console.log(`[CRM-SYNC] Backfill matched: "${wp.name}" \u2192 CRM ${existingCrm.id}`);
        } catch (err) {
          result.failed++;
          result.details.push(`Failed to link "${wp.name}": ${err.message}`);
        }
      } else {
        try {
          const fullAddress = [wp.addressLine1, wp.city, wp.province, wp.postalCode].filter(Boolean).join(", ");
          const crmResult = await createCrmWorkplace({
            name: wp.name,
            address: fullAddress,
            location: wp.city || "",
            province: wp.province || "",
            latitude: wp.latitude ? Number(wp.latitude) : void 0,
            longitude: wp.longitude ? Number(wp.longitude) : void 0,
            isActive: wp.isActive !== false
          });
          await db.update(workplaces).set({ crmExternalId: crmResult.id, updatedAt: /* @__PURE__ */ new Date() }).where(eq3(workplaces.id, wp.id));
          result.pushed++;
          result.details.push(`Pushed "${wp.name}" \u2192 CRM ID ${crmResult.id}`);
          console.log(`[CRM-SYNC] Backfill pushed: "${wp.name}" \u2192 CRM ${crmResult.id}`);
        } catch (err) {
          result.failed++;
          result.details.push(`Failed to push "${wp.name}" to CRM: ${err.message}`);
          console.error(`[CRM-SYNC] Backfill failed for "${wp.name}":`, err.message);
        }
      }
    }
    console.log(`[CRM-SYNC] Backfill complete: ${result.pushed} pushed, ${result.matched} matched, ${result.failed} failed`);
    return result;
  } catch (err) {
    result.details.push(`Backfill error: ${err.message}`);
    console.error("[CRM-SYNC] Backfill error:", err.message);
    return result;
  }
}
async function enqueueCrmPush(entityType, entityId, action, payload) {
  try {
    await db.insert(crmPushQueue).values({
      entityType,
      entityId,
      action,
      payload: JSON.stringify(payload),
      status: "pending",
      attempts: 0,
      nextRetryAt: /* @__PURE__ */ new Date()
    });
    console.log(`[CRM-PUSH] Enqueued ${action} for ${entityType}/${entityId}`);
  } catch (err) {
    console.error(`[CRM-PUSH] Failed to enqueue ${action} for ${entityType}/${entityId}:`, err.message);
  }
}
async function processCrmPushQueue() {
  const result = { processed: 0, succeeded: 0, failed: 0 };
  if (!isConfigured()) return result;
  try {
    const pending = await db.select().from(crmPushQueue).where(
      and2(
        eq3(crmPushQueue.status, "pending"),
        lte(crmPushQueue.nextRetryAt, /* @__PURE__ */ new Date())
      )
    ).limit(20);
    for (const item of pending) {
      const [claimed] = await db.update(crmPushQueue).set({ status: "processing" }).where(and2(eq3(crmPushQueue.id, item.id), eq3(crmPushQueue.status, "pending"))).returning();
      if (!claimed) continue;
      result.processed++;
      try {
        const payload = JSON.parse(item.payload);
        await executeCrmPushAction(item.entityType, item.action, item.entityId, payload);
        await db.update(crmPushQueue).set({ status: "completed", completedAt: /* @__PURE__ */ new Date() }).where(eq3(crmPushQueue.id, item.id));
        result.succeeded++;
        console.log(`[CRM-PUSH] Completed ${item.action} for ${item.entityType}/${item.entityId}`);
      } catch (err) {
        const newAttempts = item.attempts + 1;
        const backoffMs = Math.min(6e4 * Math.pow(2, newAttempts), 36e5);
        const nextRetry = new Date(Date.now() + backoffMs);
        if (newAttempts >= item.maxAttempts) {
          await db.update(crmPushQueue).set({ status: "failed", attempts: newAttempts, lastError: err.message, completedAt: /* @__PURE__ */ new Date() }).where(eq3(crmPushQueue.id, item.id));
          result.failed++;
          console.error(`[CRM-PUSH] Permanently failed ${item.action} for ${item.entityType}/${item.entityId}: ${err.message}`);
        } else {
          await db.update(crmPushQueue).set({ status: "pending", attempts: newAttempts, lastError: err.message, nextRetryAt: nextRetry }).where(eq3(crmPushQueue.id, item.id));
          console.warn(`[CRM-PUSH] Retry ${newAttempts}/${item.maxAttempts} for ${item.entityType}/${item.entityId}, next at ${nextRetry.toISOString()}`);
        }
      }
    }
  } catch (err) {
    console.error("[CRM-PUSH] Queue processing error:", err.message);
  }
  if (result.processed > 0) {
    lastPushCompletedAt = /* @__PURE__ */ new Date();
  }
  return result;
}
async function executeCrmPushAction(entityType, action, _entityId, payload) {
  switch (`${entityType}:${action}`) {
    case "confirmed_shift:update": {
      const crmId = payload.crmExternalId;
      if (!crmId) throw new Error("Missing crmExternalId");
      const shiftUpdate = {};
      if (payload.confirmStatus) shiftUpdate.confirmStatus = payload.confirmStatus;
      if (payload.checkedInAt) shiftUpdate.checkedInAt = payload.checkedInAt;
      if (payload.completedAt) shiftUpdate.completedAt = payload.completedAt;
      if (payload.notes) shiftUpdate.notes = payload.notes;
      await updateCrmConfirmedShift(crmId, shiftUpdate);
      break;
    }
    case "hotel_request:create": {
      const hrInput = {
        hotelName: payload.hotelName,
        roleNeeded: payload.roleNeeded,
        shiftStartAt: payload.shiftStartAt,
        shiftEndAt: payload.shiftEndAt,
        location: payload.location,
        address: payload.address,
        quantityNeeded: payload.quantityNeeded,
        payRate: payload.payRate,
        notes: payload.notes
      };
      await createCrmHotelRequest(hrInput);
      break;
    }
    case "hotel_request:update": {
      const crmId = payload.crmExternalId;
      if (!crmId) throw new Error("Missing crmExternalId");
      const hrUpdate = {};
      if (payload.hotelName) hrUpdate.hotelName = payload.hotelName;
      if (payload.roleNeeded) hrUpdate.roleNeeded = payload.roleNeeded;
      if (payload.quantityNeeded !== void 0) hrUpdate.quantityNeeded = payload.quantityNeeded;
      if (payload.shiftStartAt) hrUpdate.shiftStartAt = payload.shiftStartAt;
      if (payload.shiftEndAt) hrUpdate.shiftEndAt = payload.shiftEndAt;
      if (payload.payRate !== void 0) hrUpdate.payRate = payload.payRate;
      if (payload.notes) hrUpdate.notes = payload.notes;
      if (payload.status) hrUpdate.status = payload.status;
      await updateCrmHotelRequest(crmId, hrUpdate);
      break;
    }
    case "workplace:update": {
      const crmId = payload.crmExternalId;
      if (!crmId) throw new Error("Missing crmExternalId");
      const wpUpdate = {};
      if (payload.name) wpUpdate.name = payload.name;
      if (payload.address) wpUpdate.address = payload.address;
      if (payload.location) wpUpdate.location = payload.location;
      if (payload.province) wpUpdate.province = payload.province;
      if (payload.isActive !== void 0) wpUpdate.isActive = payload.isActive;
      await updateCrmWorkplace(crmId, wpUpdate);
      break;
    }
    default:
      throw new Error(`Unknown CRM push action: ${entityType}:${action}`);
  }
}
async function getCrmPushQueueStats() {
  try {
    const todayStart = /* @__PURE__ */ new Date();
    todayStart.setHours(0, 0, 0, 0);
    const [pendingResult] = await db.select({ count: count() }).from(crmPushQueue).where(eq3(crmPushQueue.status, "pending"));
    const [failedResult] = await db.select({ count: count() }).from(crmPushQueue).where(eq3(crmPushQueue.status, "failed"));
    const [completedResult] = await db.select({ count: count() }).from(crmPushQueue).where(
      and2(
        eq3(crmPushQueue.status, "completed"),
        gte(crmPushQueue.completedAt, todayStart)
      )
    );
    return {
      pending: pendingResult?.count ?? 0,
      failed: failedResult?.count ?? 0,
      completedToday: completedResult?.count ?? 0,
      lastPushAt: lastPushCompletedAt?.toISOString() || null,
      lastSyncAt: lastSyncCompletedAt?.toISOString() || null
    };
  } catch {
    return { pending: 0, failed: 0, completedToday: 0, lastPushAt: null, lastSyncAt: null };
  }
}
var syncRunning, lastAutoSyncError, lastSyncCompletedAt, lastPushCompletedAt, cachedConnectionStatus, CONNECTION_CACHE_TTL;
var init_crm_sync = __esm({
  "server/services/crm-sync.ts"() {
    "use strict";
    init_db();
    init_schema();
    init_weekdays_crm();
    syncRunning = false;
    lastAutoSyncError = null;
    lastSyncCompletedAt = null;
    lastPushCompletedAt = null;
    cachedConnectionStatus = null;
    CONNECTION_CACHE_TTL = 6e4;
  }
});

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

// server/routes.ts
init_db();
init_schema();

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
init_openphone();
import bcrypt from "bcryptjs";
import * as OTPAuth from "otpauth";
import crypto2 from "crypto";
import { eq as eq4, and as and3, or, desc as desc2, isNull as isNull2, sql as sql3, inArray, ne as ne2, gte as gte2, lte as lte2, not, asc } from "drizzle-orm";

// server/services/email.ts
import sgMail from "@sendgrid/mail";
var connectionSettings;
async function getCredentials() {
  const hostname = process.env.REPLIT_CONNECTORS_HOSTNAME;
  const xReplitToken = process.env.REPL_IDENTITY ? "repl " + process.env.REPL_IDENTITY : process.env.WEB_REPL_RENEWAL ? "depl " + process.env.WEB_REPL_RENEWAL : null;
  if (!xReplitToken) {
    throw new Error("X-Replit-Token not found for repl/depl");
  }
  connectionSettings = await fetch(
    "https://" + hostname + "/api/v2/connection?include_secrets=true&connector_names=sendgrid",
    {
      headers: {
        "Accept": "application/json",
        "X-Replit-Token": xReplitToken
      }
    }
  ).then((res) => res.json()).then((data) => data.items?.[0]);
  if (!connectionSettings || (!connectionSettings.settings.api_key || !connectionSettings.settings.from_email)) {
    throw new Error("SendGrid not connected");
  }
  return { apiKey: connectionSettings.settings.api_key, email: connectionSettings.settings.from_email };
}
async function getUncachableSendGridClient() {
  const { apiKey, email } = await getCredentials();
  sgMail.setApiKey(apiKey);
  return {
    client: sgMail,
    fromEmail: email
  };
}
async function sendEmail(options) {
  try {
    const { client: client2, fromEmail } = await getUncachableSendGridClient();
    const msg = {
      to: options.to,
      from: fromEmail,
      subject: options.subject,
      text: options.text
    };
    if (options.html) {
      msg.html = options.html;
    }
    if (options.attachments && options.attachments.length > 0) {
      msg.attachments = options.attachments.map((att) => ({
        content: att.content,
        filename: att.filename,
        type: att.type,
        disposition: att.disposition || "attachment"
      }));
    }
    await client2.send(msg);
    console.log(`[EMAIL] Sent to ${options.to}: ${options.subject}`);
    return { success: true };
  } catch (error) {
    console.error("[EMAIL] Send error:", error?.message || error);
    return { success: false, error: error?.message || "Failed to send email" };
  }
}
async function sendCSVEmail(to, subject, bodyText, csvContent, filename) {
  const base64Content = Buffer.from(csvContent).toString("base64");
  return sendEmail({
    to,
    subject,
    text: bodyText,
    attachments: [{
      content: base64Content,
      filename,
      type: "text/csv"
    }]
  });
}
async function sendXLSXEmail(to, subject, bodyText, xlsxBuffer, filename) {
  const base64Content = xlsxBuffer.toString("base64");
  return sendEmail({
    to,
    subject,
    text: bodyText,
    attachments: [{
      content: base64Content,
      filename,
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    }]
  });
}

// server/routes.ts
init_schema();
init_discord();

// shared/contractor-guide-content.ts
var WORKFORCE_SUBCONTRACTOR_AGREEMENT_VERSION = "v3.2";
var NON_SOLICITATION_DIRECT_HIRING_CLAUSE_TITLE = "Non-Solicitation / Direct Hiring Clause";
var NON_SOLICITATION_DIRECT_HIRING_CLAUSE_PARAGRAPHS = [
  "The Contractor agrees that during the term of this Agreement and for a period of twelve (12) months following the completion or termination of any assignment, they shall not, directly or indirectly, solicit or accept employment, contract work, or any other form of engagement with any client of the Company to whom the Contractor was introduced or for whom the Contractor performed services under this Agreement, without the prior written consent of the Company.",
  "For greater certainty, this restriction applies only to clients with whom the Contractor had direct contact or to whom the Contractor was assigned during the course of their engagement with the Company.",
  "This restriction applies regardless of whether such opportunity is initiated by the Contractor, the client, or any third party.",
  "In the event that the Contractor accepts such employment or engagement without the Company\u2019s prior written consent, the Contractor agrees to pay the Company a placement fee equivalent to three (3) months of full-time hours calculated at the Contractor\u2019s most recent agreed hourly rate. The parties acknowledge and agree that this amount represents a genuine pre-estimate of damages and is not intended to be a penalty.",
  "The Contractor acknowledges that the duration, scope, and nature of this clause are reasonable and necessary to protect the Company\u2019s legitimate business interests, including its client relationships and investment in securing and maintaining such clients."
];
var PAYMENT_TERMS_AND_CLIENT_DEPENDENCY_TITLE = "Payment Terms and Client Dependency";
var PAYMENT_TERMS_AND_CLIENT_DEPENDENCY_PARAGRAPHS = [
  "Payment is based on completed and approved assignments and does not constitute a salary or wage. No guaranteed income, minimum compensation, or fixed payment schedule is provided.",
  "The Company follows a bi-weekly cutoff for timesheet submission; however, payment release is not immediate. Timesheets and total hours are reviewed, verified, and processed by the Company's accounting team, which may take up to one (1) week following the cutoff. Payment is generally issued in the subsequent week, subject to client remittance, banking timelines, and operational processing. This timeline is an estimate only and does not constitute a guaranteed payment date.",
  "The Contractor acknowledges that the Company\u2019s ability to issue payment depends on receiving payment from its clients. Payment timing may vary due to client remittance, approval processes, banking timelines, or operational factors.",
  "In the event of delayed, partial, or non-payment by a client, contractor payment may be correspondingly delayed or adjusted. The Contractor agrees that such circumstances are outside the Company\u2019s control and do not constitute a breach, provided the Company processes payable amounts in good faith based on funds received."
];
var PAYMENT_TERMS_ACKNOWLEDGMENT_LABEL = "Payment Terms and Delay Acknowledgment";
var workforceSubcontractorAgreementSections = [
  {
    id: "parties",
    title: "1. Parties",
    paragraphs: [
      'This Subcontractor Agreement is entered into between 1001328662 Ontario Inc. (the "Company") and the worker identified in the signature section of this Agreement (the "Contractor").',
      "This Agreement applies to worker-facing and internal copies and references the Company\u2019s legal entity for administrative and legal record purposes."
    ]
  },
  {
    id: "relationship",
    title: "2. Independent Contractor Relationship",
    paragraphs: [
      "The Contractor is engaged as an independent contractor and not as an employee, agent, or representative of the Company. Nothing in this Agreement shall be interpreted as creating an employment, partnership, or joint venture relationship.",
      "The Contractor has full discretion over whether to accept or decline assignments and retains control over the manner and means of performing accepted work, subject only to client site requirements and applicable laws.",
      "The Contractor is free to perform services for other businesses, including competitors of the Company, and is not required to work exclusively for the Company.",
      "The Contractor is not entitled to Employment Insurance, Canada Pension Plan contributions, vacation pay, overtime pay, termination pay, or any other employment-related benefits, except as required by law.",
      "The Contractor assumes all responsibility for income taxes, HST (if applicable), and statutory remittances arising from payments received.",
      "The Contractor acknowledges that they operate as an independent business and assume the risk of profit or loss.",
      "The Contractor may operate under their own business name and is responsible for maintaining any required licenses, registrations, or insurance."
    ]
  },
  {
    id: "scope",
    title: "3. Scope of Services",
    paragraphs: [
      "The Company may offer assignments involving housekeeping, hotel cleaning, supervisor coverage, banquet and server roles, and other temporary hospitality staffing services requested by Company clients.",
      "The Contractor agrees to perform only assignments they accept and to carry out accepted assignments in a professional, safe, and client-compliant manner."
    ]
  },
  {
    id: "assignment-terms",
    title: "4. Assignment Terms",
    paragraphs: [
      "The Contractor acknowledges that no minimum hours, recurring shifts, or ongoing assignments are guaranteed under this Agreement.",
      "Assignments are based on client demand, may vary by location, role, and duration, and may be reassigned, rescheduled, shortened, or cancelled by the Company or the client.",
      "The Company is not obligated to provide assignments, and the Contractor is not obligated to accept any assignment offered.",
      "The Contractor is free to accept or decline assignments and may provide services to other entities at any time."
    ]
  },
  {
    id: "control-performance",
    title: "4A. Control and Performance of Work",
    paragraphs: [
      "The Company does not control the manner or methods by which the Contractor performs services. The Contractor is responsible for determining how work is completed, subject only to the required outcome and client site policies such as safety and compliance standards.",
      "The Company may communicate assignment requirements, but does not supervise or direct the Contractor as an employer would."
    ]
  },
  {
    id: "compensation",
    title: "5. Compensation",
    paragraphs: [
      "The Contractor will be paid the hourly rate communicated for the accepted assignment, subject to client-specific rates, approved hours, and compliance with Company procedures.",
      "Only hours that are properly submitted, verified, and approved are payable. Payroll processing follows the Company\u2019s then-current payroll cycle and operational procedures.",
      PAYMENT_TERMS_AND_CLIENT_DEPENDENCY_TITLE + ":",
      ...PAYMENT_TERMS_AND_CLIENT_DEPENDENCY_PARAGRAPHS
    ]
  },
  {
    id: "timekeeping",
    title: "6. Timekeeping / TITO",
    paragraphs: [
      "The Contractor must accurately record all time in and time out events through the Company\u2019s designated TITO or timekeeping tools.",
      "GPS, geofence, device, or related location verification may be used for attendance validation. Buddy punching, fabricated timestamps, or any other false recordkeeping is prohibited.",
      "Fraudulent or inaccurate timekeeping may result in assignment removal, termination of this Agreement, and non-payment for unverified or falsified hours where permitted by law."
    ]
  },
  {
    id: "confidentiality",
    title: "7. Confidentiality",
    paragraphs: [
      "The Contractor shall keep confidential all non-public information obtained through the Company or its clients, including hotel guest data, room information, schedules, client data, staff details, and Company operating processes.",
      "The Contractor shall not use or disclose confidential information except as necessary to perform an assignment or as required by law."
    ]
  },
  {
    id: "non-solicitation",
    title: "8. Non-Solicitation / Direct Hiring Clause",
    paragraphs: NON_SOLICITATION_DIRECT_HIRING_CLAUSE_PARAGRAPHS
  },
  {
    id: "conduct",
    title: "9. Conduct and Site Compliance",
    paragraphs: [
      "The Contractor must comply with dress code standards, professionalism requirements, client policies, safety rules, anti-harassment obligations, and all reasonable directions relating to conduct at a site.",
      "Photography, recording, or social posting regarding client premises, guest areas, staff, schedules, or operations is prohibited unless expressly authorized in writing."
    ]
  },
  {
    id: "equipment",
    title: "10. Equipment / Damages",
    paragraphs: [
      "Unless otherwise specified for a particular assignment, the Contractor is responsible for providing their own tools, transportation, and work-related materials. Use of client or Company equipment does not create an employment relationship.",
      "The Contractor is responsible for exercising reasonable care with Company and client property, equipment, uniforms, keys, and keycards issued for an assignment.",
      "The Contractor may be held responsible, to the extent permitted by law, for losses or damages caused by negligence, including lost keycards, access devices, or client property damage."
    ]
  },
  {
    id: "termination",
    title: "11. Termination",
    paragraphs: [
      "The Company may suspend or terminate assignments or this Agreement for misconduct, attendance issues, client complaints, falsified TITO records, breach of confidentiality, or breach of the Non-Solicitation / Direct Hiring Clause.",
      "The Contractor may stop accepting new assignments at any time, subject to completing accepted work unless otherwise released by the Company or client."
    ]
  },
  {
    id: "governing-law",
    title: "12. Governing Law",
    paragraphs: [
      "This Agreement shall be governed by and interpreted in accordance with the laws of the Province of Ontario and the federal laws of Canada applicable therein."
    ]
  },
  {
    id: "electronic-signature",
    title: "13. Electronic Signature",
    paragraphs: [
      "The parties agree that an electronic signature, typed name, electronic acknowledgment, and electronically stored acceptance record are intended to be legally binding and enforceable to the same extent as an original handwritten signature."
    ]
  }
];

// server/lib/agreement-pdf.ts
import PDFDocument from "pdfkit";

// server/lib/worker-application-resolution.ts
function normalizeText(value) {
  if (typeof value !== "string") return void 0;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : void 0;
}
function toBoolean(value) {
  if (value === true || value === 1) return true;
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    return normalized === "true" || normalized === "1" || normalized === "yes" || normalized === "on" || normalized === "accepted";
  }
  return false;
}
function asObject(value) {
  if (!value) return void 0;
  if (typeof value === "object" && !Array.isArray(value)) {
    return value;
  }
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        return parsed;
      }
    } catch {
      return void 0;
    }
  }
  return void 0;
}
function getFirstNonEmpty(source, keys) {
  for (const key of keys) {
    const value = normalizeText(source[key]);
    if (value) return value;
  }
  return void 0;
}
function getNestedPaymentObjects(source) {
  const containers = [
    "paymentInfo",
    "payment_info",
    "paymentDetails",
    "payment_details",
    "bankingInfo",
    "banking_info",
    "bankInfo",
    "bank_info"
  ];
  return containers.map((key) => asObject(source[key])).filter((value) => Boolean(value));
}
function resolvePaymentFields(sourceInput) {
  const nested = getNestedPaymentObjects(sourceInput);
  const source = { ...sourceInput };
  for (const item of nested) {
    for (const [key, value] of Object.entries(item)) {
      if (source[key] === void 0 || source[key] === null || source[key] === "") {
        source[key] = value;
      }
    }
  }
  const paymentMethod = getFirstNonEmpty(source, [
    "paymentMethod",
    "payment_method",
    "payment",
    "method"
  ]);
  const bankName = getFirstNonEmpty(source, [
    "bankName",
    "bank_name",
    "bank",
    "name"
  ]);
  const bankInstitution = getFirstNonEmpty(source, [
    "bankInstitution",
    "bank_institution",
    "institutionNumber",
    "institution_number",
    "institution"
  ]);
  const bankTransit = getFirstNonEmpty(source, [
    "bankTransit",
    "bank_transit",
    "transitNumber",
    "transit_number",
    "transit"
  ]);
  const bankAccount = getFirstNonEmpty(source, [
    "bankAccount",
    "bank_account",
    "accountNumber",
    "account_number",
    "account"
  ]);
  const etransferEmail = getFirstNonEmpty(source, [
    "etransferEmail",
    "etransfer_email",
    "eTransferEmail",
    "e_transfer_email",
    "directDepositEmail",
    "direct_deposit_email"
  ]);
  return {
    paymentMethod,
    bankName,
    bankInstitution,
    bankTransit,
    bankAccount,
    etransferEmail
  };
}
function arePaymentFieldsMissing(source) {
  const resolved = resolvePaymentFields(source);
  return !resolved.paymentMethod && !resolved.bankName && !resolved.bankInstitution && !resolved.bankTransit && !resolved.bankAccount && !resolved.etransferEmail;
}
function resolveAcknowledgmentFields(sourceInput) {
  const source = { ...sourceInput };
  return {
    backgroundCheckConsent: toBoolean(source.backgroundCheckConsent ?? source.background_check_consent),
    titoAcknowledgment: toBoolean(source.titoAcknowledgment ?? source.tito_acknowledgment ?? source.acknowledgeTitoAccuracyUtc),
    siteRulesAcknowledgment: toBoolean(source.siteRulesAcknowledgment ?? source.site_rules_acknowledgment ?? source.acknowledgeSiteRulesSafety),
    workerAgreementConsent: toBoolean(source.workerAgreementConsent ?? source.worker_agreement_consent ?? source.preAcknowledgeAgreementRequired),
    privacyConsent: toBoolean(source.privacyConsent ?? source.privacy_consent ?? source.consentDataProcessing),
    consentToContact: toBoolean(source.consentToContact ?? source.consent_to_contact ?? source.consentOperationalMessages),
    nonSolicitationAcknowledged: toBoolean(source.nonSolicitationAcknowledged ?? source.non_solicitation_acknowledged),
    marketingConsent: toBoolean(source.marketingConsent ?? source.marketing_consent ?? source.promotionalConsent ?? source.promotional_consent),
    paymentTermsAcknowledged: toBoolean(source.paymentTermsAcknowledged ?? source.payment_terms_acknowledged),
    smsConsent: toBoolean(source.smsConsent ?? source.sms_consent)
  };
}
var missingPaymentWarnings = /* @__PURE__ */ new Set();
function logMissingPaymentIfNeeded(recordId, variant) {
  const key = `${recordId || "unknown"}:${variant}`;
  if (missingPaymentWarnings.has(key)) return;
  missingPaymentWarnings.add(key);
  console.warn(`[AGREEMENT_PDF] Payment data missing for record ${recordId || "unknown"} (${variant})`);
}
function isApplicationSigned(source) {
  const signature = normalizeText(source.signature);
  const signatureDate = normalizeText(source.signatureDate ?? source.signature_date);
  return Boolean(signature && signatureDate);
}
function resolveAcknowledgmentFieldsForPdf(sourceInput) {
  const source = { ...sourceInput };
  const signed = isApplicationSigned(source);
  const canInferRequired = signed;
  const rawNonSolicitation = source.nonSolicitationAcknowledged ?? source.non_solicitation_acknowledged;
  const rawPaymentTerms = source.paymentTermsAcknowledged ?? source.payment_terms_acknowledged;
  if (rawNonSolicitation === null || rawNonSolicitation === void 0) {
    console.warn(
      `[AGREEMENT_PDF] nonSolicitationAcknowledged is ${rawNonSolicitation === null ? "null" : "undefined"} for record ${source.id || "unknown"} \u2014 ${canInferRequired ? "inferring as accepted (application is signed)" : "cannot infer (application is not signed)"}`
    );
  }
  if (rawPaymentTerms === null || rawPaymentTerms === void 0) {
    console.warn(
      `[AGREEMENT_PDF] paymentTermsAcknowledged is ${rawPaymentTerms === null ? "null" : "undefined"} for record ${source.id || "unknown"} \u2014 ${canInferRequired ? "inferring as accepted (application is signed)" : "cannot infer (application is not signed)"}`
    );
  }
  function resolveRequired(raw) {
    if (raw === true || raw === 1) return true;
    if (raw === false) return false;
    if (typeof raw === "string") {
      const normalized = raw.trim().toLowerCase();
      if (normalized === "true" || normalized === "1" || normalized === "yes" || normalized === "on" || normalized === "accepted") return true;
      if (normalized === "false" || normalized === "0" || normalized === "no") return false;
    }
    return canInferRequired;
  }
  return {
    backgroundCheckConsent: toBoolean(source.backgroundCheckConsent ?? source.background_check_consent),
    titoAcknowledgment: toBoolean(source.titoAcknowledgment ?? source.tito_acknowledgment ?? source.acknowledgeTitoAccuracyUtc),
    siteRulesAcknowledgment: toBoolean(source.siteRulesAcknowledgment ?? source.site_rules_acknowledgment ?? source.acknowledgeSiteRulesSafety),
    workerAgreementConsent: toBoolean(source.workerAgreementConsent ?? source.worker_agreement_consent ?? source.preAcknowledgeAgreementRequired),
    privacyConsent: toBoolean(source.privacyConsent ?? source.privacy_consent ?? source.consentDataProcessing),
    consentToContact: toBoolean(source.consentToContact ?? source.consent_to_contact ?? source.consentOperationalMessages),
    nonSolicitationAcknowledged: resolveRequired(rawNonSolicitation),
    // marketingConsent is optional — never infer, always use stored value only
    marketingConsent: toBoolean(source.marketingConsent ?? source.marketing_consent ?? source.promotionalConsent ?? source.promotional_consent),
    paymentTermsAcknowledged: resolveRequired(rawPaymentTerms),
    smsConsent: toBoolean(source.smsConsent ?? source.sms_consent)
  };
}

// server/lib/agreement-pdf.ts
var INTERNAL_COMPANY_NAME = "1001328662 Ontario Inc.";
var INTERNAL_COMPANY_ADDRESS = "1900 Dundas St. West, Mississauga L5K 1P9";
var WORKER_COMPANY_NAME = "Workforce Connect";
var WORKER_COMPANY_ADDRESS = "Mississauga, Ontario";
function safeParseList(value) {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.map(String) : [String(parsed)];
  } catch {
    return [String(value)];
  }
}
function sanitizeFileName(value) {
  return value.trim().replace(/\s+/g, "_").replace(/[^A-Za-z0-9_.-]/g, "_").replace(/_+/g, "_").replace(/^_+|_+$/g, "") || "Agreement";
}
function drawHeader(doc, variant) {
  const companyName = variant === "worker" ? WORKER_COMPANY_NAME : INTERNAL_COMPANY_NAME;
  const companyAddress = variant === "worker" ? WORKER_COMPANY_ADDRESS : INTERNAL_COMPANY_ADDRESS;
  doc.fontSize(18).font("Helvetica-Bold").text(companyName, { align: "center" });
  doc.moveDown(0.2);
  doc.fontSize(10).font("Helvetica").fillColor("#555555").text(companyAddress, { align: "center" });
  doc.fillColor("#000000");
  doc.moveDown(1.2);
  doc.fontSize(17).font("Helvetica-Bold").text("Subcontractor Agreement", { align: "center" });
  doc.moveDown(0.25);
  doc.fontSize(9).font("Helvetica").fillColor("#666666").text(`Agreement Version ${WORKFORCE_SUBCONTRACTOR_AGREEMENT_VERSION}`, { align: "center" });
  doc.fillColor("#000000");
  doc.moveDown(1);
}
function addLabelValue(doc, label, value) {
  doc.fontSize(9).font("Helvetica-Bold").fillColor("#444444").text(label, { continued: true });
  doc.font("Helvetica").fillColor("#000000").text(` ${value || "N/A"}`);
  doc.moveDown(0.2);
}
function addSection(doc, title, paragraphs) {
  doc.fontSize(12).font("Helvetica-Bold").fillColor("#000000").text(title);
  doc.moveDown(0.35);
  paragraphs.forEach((paragraph) => {
    doc.fontSize(9.5).font("Helvetica").text(paragraph, { lineGap: 2 });
    doc.moveDown(0.35);
  });
}
function isAccepted(value) {
  return value === true;
}
function addAcknowledgments(doc, application) {
  const resolved = resolveAcknowledgmentFieldsForPdf(application);
  const items = [
    { label: "Background Check Consent", accepted: isAccepted(resolved.backgroundCheckConsent) },
    { label: "TITO System Acknowledgment", accepted: isAccepted(resolved.titoAcknowledgment) },
    { label: "Site Rules Agreement", accepted: isAccepted(resolved.siteRulesAcknowledgment) },
    { label: NON_SOLICITATION_DIRECT_HIRING_CLAUSE_TITLE, accepted: isAccepted(resolved.nonSolicitationAcknowledged) },
    { label: "Worker Agreement", accepted: isAccepted(resolved.workerAgreementConsent) },
    { label: "Privacy Policy", accepted: isAccepted(resolved.privacyConsent) },
    { label: PAYMENT_TERMS_ACKNOWLEDGMENT_LABEL, accepted: isAccepted(resolved.paymentTermsAcknowledged) }
  ];
  if (resolved.marketingConsent === true) {
    items.push({ label: "Promotional Communications (Optional)", accepted: true });
  }
  doc.fontSize(12).font("Helvetica-Bold").text("Acknowledgments");
  doc.moveDown(0.35);
  items.forEach((item) => {
    doc.fontSize(9.5).font("Helvetica").text(`[${item.accepted ? "X" : " "}] ${item.label}`);
    doc.moveDown(0.2);
  });
}
function addPaymentInformation(doc, application, variant) {
  doc.moveDown(0.5);
  doc.fontSize(12).font("Helvetica-Bold").text("Payment Information");
  doc.moveDown(0.4);
  const resolved = resolvePaymentFields(application);
  if (!resolved.paymentMethod && !resolved.bankName && !resolved.bankInstitution && !resolved.bankTransit && !resolved.bankAccount && !resolved.etransferEmail) {
    logMissingPaymentIfNeeded(application.id, variant);
  }
  const paymentMethod = resolved.paymentMethod || "Not provided";
  addLabelValue(doc, "Payment Method:", paymentMethod);
  addLabelValue(doc, "Bank Name:", resolved.bankName || "Not provided");
  addLabelValue(doc, "Institution Number:", resolved.bankInstitution || "Not provided");
  addLabelValue(doc, "Transit Number:", resolved.bankTransit || "Not provided");
  addLabelValue(doc, "Account Number:", resolved.bankAccount ? `******${String(resolved.bankAccount).replace(/\D/g, "").slice(-4)}` : "Not provided");
  addLabelValue(doc, "E-Transfer Email:", resolved.etransferEmail || "Not provided");
}
function addSignature(doc, application) {
  const resolved = resolveAcknowledgmentFieldsForPdf(application);
  doc.moveDown(0.5);
  doc.fontSize(12).font("Helvetica-Bold").text("Signature");
  doc.moveDown(0.4);
  addLabelValue(doc, "Signed By:", application.signature);
  addLabelValue(doc, "Signed Date:", application.signatureDate);
  addLabelValue(doc, "Application Submitted:", new Date(application.createdAt).toLocaleDateString("en-CA"));
  addLabelValue(doc, "Agreement Version:", application.agreementVersion || WORKFORCE_SUBCONTRACTOR_AGREEMENT_VERSION);
  addLabelValue(doc, "Non-Solicitation Acknowledged:", resolved.nonSolicitationAcknowledged ? "Yes" : "No");
}
function createAgreementPdfFileName(application, variant) {
  const date2 = (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
  const name = sanitizeFileName(application.fullName || "Worker");
  if (variant === "worker") {
    return `Worker_Agreement_${name}_${date2}.pdf`;
  }
  return `Internal_Subcontractor_Agreement_${name}_${date2}.pdf`;
}
function streamAgreementPdf(res, application, variant, options) {
  const fileName = createAgreementPdfFileName(application, variant);
  const disposition = options?.disposition === "inline" ? "inline" : "attachment";
  const resolvedForLog = resolveAcknowledgmentFieldsForPdf(application);
  console.info(
    `[AGREEMENT_PDF] Generating ${variant} PDF for record ${application.id || "unknown"} (${application.fullName || "unknown"}) \u2014 nonSolicitation=${resolvedForLog.nonSolicitationAcknowledged} (stored=${application.nonSolicitationAcknowledged ?? "null/undefined"}) paymentTerms=${resolvedForLog.paymentTermsAcknowledged} marketingConsent=${resolvedForLog.marketingConsent} agreementVersion=${application.agreementVersion || "(none)"} signed=${Boolean(application.signature && application.signatureDate)}`
  );
  const doc = new PDFDocument({ size: "LETTER", margins: { top: 50, bottom: 50, left: 56, right: 56 } });
  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `${disposition}; filename="${fileName}"`);
  doc.pipe(res);
  drawHeader(doc, variant);
  addSection(doc, "Worker Details", [
    `Contractor: ${application.fullName}`,
    `Email: ${application.email}`,
    `Phone: ${application.phone}`,
    `Address: ${application.address}, ${application.city}, ${application.province} ${application.postalCode}`
  ]);
  addSection(doc, "Assignment Profile", [
    `Preferred Roles: ${safeParseList(application.preferredRoles).join(", ") || "Not specified"}`,
    `Available Days: ${safeParseList(application.availableDays).join(", ") || "Not specified"}`,
    `Preferred Shifts: ${safeParseList(application.preferredShifts).join(", ") || "Not specified"}`
  ]);
  workforceSubcontractorAgreementSections.forEach((section, index2) => {
    if (doc.y > 690) {
      doc.addPage();
    }
    addSection(doc, section.title, section.paragraphs);
    if (index2 === 4) {
      addSection(doc, "Compensation Details", [
        `Most recent rate basis: ${application.yearsExperience || "Client-dependent hourly rate"}`,
        "Approved hours only will be processed for payment."
      ]);
    }
  });
  addAcknowledgments(doc, application);
  addPaymentInformation(doc, application, variant);
  addSignature(doc, application);
  doc.end();
}

// server/routes.ts
import { z as z2 } from "zod";
var CANADIAN_PROVINCES = {
  AB: "Alberta",
  BC: "British Columbia",
  MB: "Manitoba",
  NB: "New Brunswick",
  NL: "Newfoundland and Labrador",
  NS: "Nova Scotia",
  NT: "Northwest Territories",
  NU: "Nunavut",
  ON: "Ontario",
  PE: "Prince Edward Island",
  QC: "Quebec",
  SK: "Saskatchewan",
  YT: "Yukon"
};
var CANADIAN_POSTAL_CODE_REGEX = /\b([ABCEGHJ-NPRSTVXY]\d[ABCEGHJ-NPRSTV-Z])[ -]?(\d[ABCEGHJ-NPRSTV-Z]\d)\b/i;
function normalizeAddressText(value) {
  return value.replace(/\s+/g, " ").replace(/\s*,\s*/g, ", ").trim().replace(/,+$/, "");
}
function normalizeProvince(value) {
  const trimmed = value.trim();
  if (!trimmed) return "";
  const upper = trimmed.toUpperCase();
  if (CANADIAN_PROVINCES[upper]) {
    return upper;
  }
  const entry = Object.entries(CANADIAN_PROVINCES).find(([, fullName]) => fullName.toLowerCase() === trimmed.toLowerCase());
  return entry?.[0] || "";
}
function normalizePostalCode(value) {
  const match = value.match(CANADIAN_POSTAL_CODE_REGEX);
  if (!match) return "";
  return `${match[1].toUpperCase()} ${match[2].toUpperCase()}`;
}
function stripCountry(value) {
  return value.replace(/,?\s*canada\s*$/i, "").trim();
}
function parseLocalAddress(input) {
  const normalizedInput = normalizeAddressText(input);
  let working = stripCountry(normalizedInput);
  const postalCode = normalizePostalCode(working);
  if (postalCode) {
    working = normalizeAddressText(working.replace(CANADIAN_POSTAL_CODE_REGEX, ""));
  }
  const segments = working.split(",").map((segment) => segment.trim()).filter(Boolean);
  let addressLine1 = segments[0] || working;
  let city = "";
  let province = "";
  if (segments.length >= 3) {
    addressLine1 = segments.slice(0, -2).join(", ");
    city = segments[segments.length - 2] || "";
    province = normalizeProvince(segments[segments.length - 1] || "");
  } else if (segments.length === 2) {
    addressLine1 = segments[0];
    const secondSegment = segments[1];
    const provinceMatch = secondSegment.match(/\b(AB|BC|MB|NB|NL|NS|NT|NU|ON|PE|QC|SK|YT|Alberta|British Columbia|Manitoba|New Brunswick|Newfoundland and Labrador|Nova Scotia|Northwest Territories|Nunavut|Ontario|Prince Edward Island|Quebec|Saskatchewan|Yukon)\b$/i);
    if (provinceMatch) {
      province = normalizeProvince(provinceMatch[0]);
      city = secondSegment.slice(0, secondSegment.length - provinceMatch[0].length).trim().replace(/,$/, "");
    } else {
      city = secondSegment;
    }
  }
  addressLine1 = normalizeAddressText(addressLine1);
  city = normalizeAddressText(city);
  const formattedParts = [addressLine1, city, province, postalCode, "Canada"].filter(Boolean);
  return {
    formattedAddress: formattedParts.join(", "),
    addressLine1,
    city,
    province,
    postalCode,
    country: "Canada",
    latitude: null,
    longitude: null
  };
}
var GOOGLE_PLACES_API_BASE_URL = "https://maps.googleapis.com/maps/api/place";
var MIN_ADDRESS_AUTOCOMPLETE_INPUT_LENGTH = 3;
var PLACES_FETCH_TIMEOUT_MS = 8e3;
var GOOGLE_PLACES_API_KEY = process.env.GOOGLE_PLACES_API_KEY || process.env.GOOGLE_MAPS_API_KEY || "";
var CANADIAN_PLACE_DETAIL_PROVINCE_TYPES = ["administrative_area_level_1"];
var CANADIAN_PLACE_DETAIL_CITY_TYPES = [
  "locality",
  "postal_town",
  "administrative_area_level_3",
  "sublocality_level_1"
];
function inferGooglePlacesFailureCategory(status, errorMessage) {
  const message = (errorMessage || "").toLowerCase();
  if (status === "REQUEST_DENIED") {
    if (message.includes("api key not valid") || message.includes("invalid api key") || message.includes("invalid key")) {
      return "INVALID_KEY";
    }
    if (message.includes("not authorized to use this api") || message.includes("api has not been used") || message.includes("api not activated") || message.includes("is not enabled")) {
      return "API_NOT_ACTIVATED";
    }
    if (message.includes("billing") || message.includes("payment") || message.includes("billing account")) {
      return "BILLING_INACTIVE_OR_INVALID";
    }
    if (message.includes("referer") || message.includes("referrer") || message.includes("ip address") || message.includes("restriction") || message.includes("not allowed")) {
      return "RESTRICTION_BLOCKED";
    }
    return "REQUEST_DENIED";
  }
  if (status === "OVER_QUERY_LIMIT") {
    return "QUOTA_EXCEEDED";
  }
  if (status === "INVALID_REQUEST") {
    return "INVALID_REQUEST";
  }
  return "UPSTREAM_ERROR";
}
var NON_RETRYABLE_GOOGLE_PLACES_FAILURE_CATEGORIES = /* @__PURE__ */ new Set([
  "CONFIG_MISSING_KEY",
  "INVALID_KEY",
  "API_NOT_ACTIVATED",
  "BILLING_INACTIVE_OR_INVALID",
  "RESTRICTION_BLOCKED"
]);
function isGooglePlacesFailureRetryable(failureCategory, failureStage) {
  if (failureStage === "missing_api_key") return false;
  if (!failureCategory) return true;
  return !NON_RETRYABLE_GOOGLE_PLACES_FAILURE_CATEGORIES.has(failureCategory);
}
async function fetchWithPlacesTimeout(url) {
  const abortController = new AbortController();
  const timeout = setTimeout(() => abortController.abort(), PLACES_FETCH_TIMEOUT_MS);
  try {
    return await fetch(url, { signal: abortController.signal });
  } finally {
    clearTimeout(timeout);
  }
}
function resolveGooglePlacesApiKeyConfig() {
  const placesKey = (process.env.GOOGLE_PLACES_API_KEY || "").trim();
  if (placesKey) {
    return { apiKey: placesKey, envVar: "GOOGLE_PLACES_API_KEY" };
  }
  const mapsKey = (process.env.GOOGLE_MAPS_API_KEY || "").trim();
  if (mapsKey) {
    return { apiKey: mapsKey, envVar: "GOOGLE_MAPS_API_KEY" };
  }
  return { apiKey: null, envVar: "none" };
}
var initialPlacesConfig = resolveGooglePlacesApiKeyConfig();
console.info("[PLACES] API_KEY_DIAGNOSTIC", {
  googlePlacesKeyExists: (process.env.GOOGLE_PLACES_API_KEY || "").trim().length > 0,
  googleMapsKeyExists: (process.env.GOOGLE_MAPS_API_KEY || "").trim().length > 0,
  selectedEnvVar: initialPlacesConfig.envVar,
  keyLength: initialPlacesConfig.apiKey?.length || 0
});
var _placesApiKeyMissingLogged = false;
var _placesLegacyKeyUsageLogged = false;
function getGooglePlacesApiKey() {
  const resolved = resolveGooglePlacesApiKeyConfig();
  if (resolved.apiKey) {
    if (resolved.envVar === "GOOGLE_MAPS_API_KEY") {
      if (!_placesLegacyKeyUsageLogged) {
        _placesLegacyKeyUsageLogged = true;
        console.warn("[PLACES] CONFIG_WARNING: Using fallback GOOGLE_MAPS_API_KEY. Prefer GOOGLE_PLACES_API_KEY to avoid environment-name mismatches.");
      }
    }
    return resolved.apiKey;
  }
  if (!_placesApiKeyMissingLogged) {
    _placesApiKeyMissingLogged = true;
    console.error("[PLACES] CONFIG_ERROR: Google Places API key is not configured. Set GOOGLE_PLACES_API_KEY (preferred) or GOOGLE_MAPS_API_KEY and redeploy so runtime env loads the change.");
  }
  return null;
}
function getGooglePlacesEnvVarName() {
  return resolveGooglePlacesApiKeyConfig().envVar;
}
function mapGooglePlacesErrorStatus(status) {
  switch (status) {
    case "OVER_QUERY_LIMIT":
      return { httpStatus: 429, message: "Address lookup is temporarily rate limited. Please try again shortly." };
    case "REQUEST_DENIED":
      return { httpStatus: 503, message: "Address lookup is currently unavailable. Please try again later." };
    case "INVALID_REQUEST":
      return { httpStatus: 400, message: "Address lookup request is invalid." };
    case "UNKNOWN_ERROR":
      return { httpStatus: 503, message: "Address lookup is temporarily unavailable. Please try again." };
    default:
      return { httpStatus: 502, message: "Address lookup failed. Please try again later." };
  }
}
function getPlacesLogTag(status) {
  switch (status) {
    case "REQUEST_DENIED":
      return "REQUEST_DENIED";
    case "OVER_QUERY_LIMIT":
      return "RATE_LIMITED";
    case "INVALID_REQUEST":
      return "INVALID_REQUEST";
    default:
      return "UPSTREAM_ERROR";
  }
}
function extractGoogleAddressComponent(components, candidateTypes, property = "long_name") {
  if (!Array.isArray(components)) return "";
  for (const type of candidateTypes) {
    const match = components.find((component) => component.types?.includes(type));
    const value = match?.[property];
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }
  return "";
}
function parseGooglePlaceDetails(result) {
  const components = result.address_components || [];
  const countryCode = extractGoogleAddressComponent(components, ["country"], "short_name");
  const country = extractGoogleAddressComponent(components, ["country"], "long_name");
  const streetNumber = extractGoogleAddressComponent(components, ["street_number"]);
  const route = extractGoogleAddressComponent(components, ["route"]);
  const subpremise = extractGoogleAddressComponent(components, ["subpremise"]);
  const city = extractGoogleAddressComponent(components, CANADIAN_PLACE_DETAIL_CITY_TYPES);
  const province = extractGoogleAddressComponent(components, CANADIAN_PLACE_DETAIL_PROVINCE_TYPES, "short_name");
  const postalCode = normalizePostalCode(extractGoogleAddressComponent(components, ["postal_code"]));
  const latitude = typeof result.geometry?.location?.lat === "number" ? result.geometry.location.lat : null;
  const longitude = typeof result.geometry?.location?.lng === "number" ? result.geometry.location.lng : null;
  const addressLine1 = [subpremise ? `Unit ${subpremise}` : "", streetNumber, route].filter(Boolean).join(" ").trim();
  return {
    formattedAddress: normalizeAddressText(result.formatted_address || ""),
    addressLine1,
    city: normalizeAddressText(city),
    province: normalizeProvince(province),
    postalCode,
    countryCode,
    country: normalizeAddressText(country),
    latitude,
    longitude
  };
}
async function fetchGooglePlacesAutocomplete(input) {
  const apiKey = getGooglePlacesApiKey();
  if (!apiKey) {
    return {
      ok: false,
      httpStatus: 503,
      message: "Address lookup is currently unavailable. Please try again later.",
      failureStage: "missing_api_key",
      failureCategory: "CONFIG_MISSING_KEY",
      predictions: []
    };
  }
  const url = new URL(`${GOOGLE_PLACES_API_BASE_URL}/autocomplete/json`);
  url.searchParams.set("input", input);
  url.searchParams.set("components", "country:ca");
  url.searchParams.set("types", "address");
  url.searchParams.set("language", "en");
  url.searchParams.set("key", apiKey);
  try {
    const response = await fetchWithPlacesTimeout(url);
    const data = await response.json();
    const status = typeof data.status === "string" ? data.status : void 0;
    if (status === "OK") {
      return {
        ok: true,
        predictions: Array.isArray(data.predictions) ? data.predictions : []
      };
    }
    if (status === "ZERO_RESULTS") {
      return {
        ok: true,
        predictions: []
      };
    }
    const mappedError = mapGooglePlacesErrorStatus(status);
    const failureCategory = inferGooglePlacesFailureCategory(status, data.error_message);
    console.error(`[PLACES] autocomplete:${getPlacesLogTag(status)}`, {
      status,
      failureCategory,
      errorMessage: data.error_message || null,
      httpStatus: response.status
    });
    return {
      ok: false,
      httpStatus: mappedError.httpStatus,
      message: mappedError.message,
      failureStage: "google_autocomplete",
      failureCategory,
      predictions: []
    };
  } catch (error) {
    const isTimeout = error instanceof Error && error.name === "AbortError";
    console.error("[PLACES] autocomplete:NETWORK_ERROR", {
      failureCategory: isTimeout ? "PROXY_TIMEOUT" : "PROXY_FETCH_FAILURE",
      message: error instanceof Error ? error.message : String(error)
    });
    return {
      ok: false,
      httpStatus: 503,
      message: "Address lookup is currently unavailable. Please try again later.",
      failureStage: "proxy_fetch",
      failureCategory: isTimeout ? "PROXY_TIMEOUT" : "PROXY_FETCH_FAILURE",
      predictions: []
    };
  }
}
async function fetchGooglePlaceDetails(placeId) {
  const apiKey = getGooglePlacesApiKey();
  if (!apiKey) {
    return {
      ok: false,
      httpStatus: 503,
      message: "Address lookup is currently unavailable. Please try again later.",
      failureStage: "missing_api_key",
      failureCategory: "CONFIG_MISSING_KEY"
    };
  }
  const url = new URL(`${GOOGLE_PLACES_API_BASE_URL}/details/json`);
  url.searchParams.set("place_id", placeId);
  url.searchParams.set("fields", "place_id,formatted_address,geometry,address_components");
  url.searchParams.set("language", "en");
  url.searchParams.set("key", apiKey);
  try {
    const response = await fetchWithPlacesTimeout(url);
    const data = await response.json();
    const status = typeof data.status === "string" ? data.status : void 0;
    if (status !== "OK" || !data.result) {
      const mappedError = mapGooglePlacesErrorStatus(status);
      const failureCategory = inferGooglePlacesFailureCategory(status, data.error_message);
      console.error(`[PLACES] details:${getPlacesLogTag(status)}`, {
        placeIdLength: placeId.length,
        status,
        failureCategory,
        errorMessage: data.error_message || null,
        httpStatus: response.status
      });
      return {
        ok: false,
        httpStatus: mappedError.httpStatus,
        message: mappedError.message,
        failureStage: "google_details",
        failureCategory
      };
    }
    const parsed = parseGooglePlaceDetails(data.result);
    if (parsed.countryCode !== "CA") {
      console.warn("[PLACES] details:NON_CANADIAN", {
        placeIdLength: placeId.length,
        countryCode: parsed.countryCode
      });
      return {
        ok: false,
        httpStatus: 400,
        message: "Only Canadian addresses are accepted."
      };
    }
    if (!parsed.formattedAddress || !parsed.addressLine1 || !parsed.city || !parsed.province || parsed.latitude === null || parsed.longitude === null) {
      const missingFields = [
        !parsed.formattedAddress ? "formattedAddress" : null,
        !parsed.addressLine1 ? "addressLine1" : null,
        !parsed.city ? "city" : null,
        !parsed.province ? "province" : null,
        parsed.latitude === null ? "latitude" : null,
        parsed.longitude === null ? "longitude" : null
      ].filter((f) => f !== null);
      console.warn("[PLACES] details:INCOMPLETE", {
        placeIdLength: placeId.length,
        missingFields
      });
      return {
        ok: false,
        httpStatus: 422,
        message: "Please select a complete Canadian street address."
      };
    }
    return {
      ok: true,
      details: {
        formattedAddress: parsed.formattedAddress,
        addressLine1: parsed.addressLine1,
        city: parsed.city,
        province: parsed.province,
        postalCode: parsed.postalCode,
        country: "Canada",
        latitude: parsed.latitude,
        longitude: parsed.longitude
      }
    };
  } catch (error) {
    const isTimeout = error instanceof Error && error.name === "AbortError";
    console.error("[PLACES] details:NETWORK_ERROR", {
      placeIdLength: placeId.length,
      failureCategory: isTimeout ? "PROXY_TIMEOUT" : "PROXY_FETCH_FAILURE",
      message: error instanceof Error ? error.message : String(error)
    });
    return {
      ok: false,
      httpStatus: 503,
      message: "Address lookup is currently unavailable. Please try again later.",
      failureStage: "proxy_fetch",
      failureCategory: isTimeout ? "PROXY_TIMEOUT" : "PROXY_FETCH_FAILURE"
    };
  }
}
async function probeGooglePlacesApiKey() {
  const apiKey = getGooglePlacesApiKey();
  const envVar = getGooglePlacesEnvVarName();
  if (!apiKey) {
    return { configured: false, working: null, failureCategory: "CONFIG_MISSING_KEY", errorMessage: "No API key configured", envVar };
  }
  const url = new URL(`${GOOGLE_PLACES_API_BASE_URL}/autocomplete/json`);
  url.searchParams.set("input", "123 Main");
  url.searchParams.set("components", "country:ca");
  url.searchParams.set("types", "address");
  url.searchParams.set("language", "en");
  url.searchParams.set("key", apiKey);
  try {
    const response = await fetchWithPlacesTimeout(url);
    const data = await response.json();
    const status = typeof data.status === "string" ? data.status : void 0;
    const isWorking = status === "OK" || status === "ZERO_RESULTS";
    if (isWorking) {
      return { configured: true, working: true, failureCategory: null, errorMessage: null, envVar };
    }
    const failureCategory = inferGooglePlacesFailureCategory(status, data.error_message);
    return {
      configured: true,
      working: false,
      failureCategory,
      errorMessage: data.error_message || status || "Unknown error",
      envVar
    };
  } catch (error) {
    const isTimeout = error instanceof Error && error.name === "AbortError";
    return {
      configured: true,
      working: false,
      failureCategory: isTimeout ? "PROXY_TIMEOUT" : "PROXY_FETCH_FAILURE",
      errorMessage: error instanceof Error ? error.message : String(error),
      envVar
    };
  }
}
setTimeout(async () => {
  try {
    const result = await probeGooglePlacesApiKey();
    if (result.working === true) {
      console.info("[PLACES] STARTUP_PROBE: API key is valid and Places API is responding normally.", { envVar: result.envVar });
    } else if (!result.configured) {
      console.error(
        "[PLACES] STARTUP_PROBE: Google Places API key is NOT configured. Set GOOGLE_PLACES_API_KEY (preferred) or GOOGLE_MAPS_API_KEY in your deployment environment and redeploy. Address autocomplete will fall back to manual entry until this is resolved."
      );
    } else {
      let hint = "";
      switch (result.failureCategory) {
        case "API_NOT_ACTIVATED":
          hint = " Ensure 'Places API' is enabled in Google Cloud Console for your project.";
          break;
        case "BILLING_INACTIVE_OR_INVALID":
          hint = " Google Cloud billing must be enabled for the project linked to this API key.";
          break;
        case "RESTRICTION_BLOCKED":
          hint = " The API key has HTTP referrer or IP restrictions. For server-side use, remove referrer restrictions and add the server's IP, or use an unrestricted key.";
          break;
        case "INVALID_KEY":
          hint = " The API key value appears to be invalid or has been revoked. Regenerate the key in Google Cloud Console.";
          break;
        case "QUOTA_EXCEEDED":
          hint = " The API quota has been exceeded. Check your Google Cloud Console quota settings.";
          break;
      }
      console.error(`[PLACES] STARTUP_PROBE: API key is configured but Places API calls are failing (${result.failureCategory}).${hint}`, {
        envVar: result.envVar,
        errorMessage: result.errorMessage
      });
    }
  } catch (err) {
    console.error("[PLACES] STARTUP_PROBE: Unexpected error during probe.", { message: err instanceof Error ? err.message : String(err) });
  }
}, 5e3);
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
    const tokens = await db.select({ token: pushTokens.token }).from(pushTokens).where(and3(
      inArray(pushTokens.userId, userIds),
      eq4(pushTokens.isActive, true)
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
var titoRateLimitMap = /* @__PURE__ */ new Map();
var TITO_RATE_LIMIT_WINDOW = 6e4;
var TITO_RATE_LIMIT_MAX = 10;
function checkTitoRateLimit(userId) {
  const now = Date.now();
  const entry = titoRateLimitMap.get(userId);
  if (!entry || now > entry.resetTime) {
    titoRateLimitMap.set(userId, { count: 1, resetTime: now + TITO_RATE_LIMIT_WINDOW });
    return true;
  }
  if (entry.count >= TITO_RATE_LIMIT_MAX) {
    return false;
  }
  entry.count++;
  return true;
}
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
var placesRateLimitMap = /* @__PURE__ */ new Map();
var PLACES_RATE_LIMIT_WINDOW = 6e4;
var PLACES_RATE_LIMIT_MAX = 30;
var _placesRateLimitPruneCounter = 0;
var placesHealthProbeRateLimitMap = /* @__PURE__ */ new Map();
var PLACES_HEALTH_PROBE_RATE_LIMIT_WINDOW = 6e4;
var PLACES_HEALTH_PROBE_RATE_LIMIT_MAX = 5;
var PLACES_HEALTH_PROBE_TOKEN = (process.env.PLACES_HEALTH_PROBE_TOKEN || "").trim();
var _placesHealthProbeRateLimitPruneCounter = 0;
function checkPlacesRateLimit(ip) {
  const now = Date.now();
  _placesRateLimitPruneCounter++;
  if (_placesRateLimitPruneCounter >= 500) {
    _placesRateLimitPruneCounter = 0;
    for (const [key, val] of placesRateLimitMap) {
      if (now > val.resetTime) placesRateLimitMap.delete(key);
    }
  }
  const entry = placesRateLimitMap.get(ip);
  if (!entry || now > entry.resetTime) {
    placesRateLimitMap.set(ip, { count: 1, resetTime: now + PLACES_RATE_LIMIT_WINDOW });
    return true;
  }
  if (entry.count >= PLACES_RATE_LIMIT_MAX) {
    return false;
  }
  entry.count++;
  return true;
}
function checkPlacesHealthProbeRateLimit(ip) {
  const now = Date.now();
  _placesHealthProbeRateLimitPruneCounter++;
  if (_placesHealthProbeRateLimitPruneCounter >= 500) {
    _placesHealthProbeRateLimitPruneCounter = 0;
    for (const [key, val] of placesHealthProbeRateLimitMap) {
      if (now > val.resetTime) placesHealthProbeRateLimitMap.delete(key);
    }
  }
  const entry = placesHealthProbeRateLimitMap.get(ip);
  if (!entry || now > entry.resetTime) {
    placesHealthProbeRateLimitMap.set(ip, { count: 1, resetTime: now + PLACES_HEALTH_PROBE_RATE_LIMIT_WINDOW });
    return true;
  }
  if (entry.count >= PLACES_HEALTH_PROBE_RATE_LIMIT_MAX) {
    return false;
  }
  entry.count++;
  return true;
}
function safeTokenMatch(expected, provided) {
  const expectedDigest = crypto2.createHash("sha256").update(expected).digest();
  const providedDigest = crypto2.createHash("sha256").update(provided).digest();
  const digestMatch = crypto2.timingSafeEqual(expectedDigest, providedDigest);
  return Boolean(expected) && Boolean(provided) && digestMatch;
}
function isAuthorizedPlacesProbeRequest(req) {
  if (!PLACES_HEALTH_PROBE_TOKEN) {
    return false;
  }
  const providedToken = typeof req.headers["x-places-health-token"] === "string" ? req.headers["x-places-health-token"].trim() : "";
  if (!providedToken) return false;
  return safeTokenMatch(PLACES_HEALTH_PROBE_TOKEN, providedToken);
}
function checkRoles(...allowedRoles) {
  return (req, res, next) => {
    let role = req.headers["x-user-role"];
    let userId = req.headers["x-user-id"];
    if (!role || !userId) {
      const session = parseSessionCookie(req);
      if (session) {
        role = session.role;
        userId = session.userId;
        req.headers["x-user-role"] = role;
        req.headers["x-user-id"] = userId;
      }
    }
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
  let count2 = 0;
  const maxCount = series.endType === "count" ? series.endAfterCount || 999 : 999;
  while (current <= endDate && count2 < maxCount) {
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
      count2++;
    }
    current.setDate(current.getDate() + 1);
  }
  return occurrences;
}
var SESSION_SECRET = process.env.SESSION_SECRET || "wfc-default-secret";
function createSessionToken(userId, role) {
  const payload = JSON.stringify({ userId, role, iat: Date.now() });
  const encoded = Buffer.from(payload).toString("base64url");
  const sig = crypto2.createHmac("sha256", SESSION_SECRET).update(encoded).digest("base64url");
  return `${encoded}.${sig}`;
}
function verifySessionToken(token) {
  const parts = token.split(".");
  if (parts.length !== 2) return null;
  const [encoded, sig] = parts;
  const expectedSig = crypto2.createHmac("sha256", SESSION_SECRET).update(encoded).digest("base64url");
  if (sig !== expectedSig) return null;
  try {
    const payload = JSON.parse(Buffer.from(encoded, "base64url").toString());
    if (!payload.userId || !payload.role) return null;
    return { userId: payload.userId, role: payload.role };
  } catch {
    return null;
  }
}
function parseSessionCookie(req) {
  const cookieHeader = req.headers.cookie;
  if (!cookieHeader) return null;
  const match = cookieHeader.match(/(?:^|;\s*)wfc_session=([^;]+)/);
  if (!match) return null;
  return verifySessionToken(decodeURIComponent(match[1]));
}
function setSessionCookie(res, userId, role) {
  const token = createSessionToken(userId, role);
  res.setHeader("Set-Cookie", `wfc_session=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=86400`);
}
function clearSessionCookie(res) {
  res.setHeader("Set-Cookie", "wfc_session=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0");
}
var WORKER_APPLICATION_STATUSES = /* @__PURE__ */ new Set([
  "pending",
  "reviewed",
  "new",
  "reviewing",
  "contacted",
  "interview_scheduled",
  "interviewed",
  "ready_for_deployment",
  "approved",
  "rejected",
  "on_hold"
]);
function normalizeText2(value) {
  if (typeof value !== "string") return null;
  const normalized = value.replace(/\s+/g, " ").trim();
  return normalized.length > 0 ? normalized : null;
}
function splitName(fullName) {
  const [firstName = "", ...lastNameParts] = fullName.split(/\s+/).filter(Boolean);
  return {
    firstName: firstName || null,
    lastName: lastNameParts.join(" ") || null
  };
}
function resolveWorkerIdentity(input) {
  const normalizedFullName = normalizeText2(input.fullName);
  const normalizedFirstName = normalizeText2(input.firstName);
  const normalizedLastName = normalizeText2(input.lastName);
  const structuredName = normalizeText2(`${normalizedFirstName || ""} ${normalizedLastName || ""}`);
  const fallbackEmail = normalizeText2(input.email);
  const fallbackPhone = normalizeText2(input.phone);
  const workerName = normalizedFullName || structuredName || fallbackEmail || fallbackPhone || null;
  let firstName = normalizedFirstName;
  let lastName = normalizedLastName;
  if (workerName && (!firstName || !lastName)) {
    const split = splitName(workerName);
    firstName = firstName || split.firstName;
    lastName = lastName || split.lastName;
  }
  return {
    workerName,
    fullName: workerName,
    firstName,
    lastName,
    hasIdentity: Boolean(workerName)
  };
}
function mapApplicationForSync(application) {
  const identity = resolveWorkerIdentity({
    fullName: application.fullName,
    email: application.email,
    phone: application.phone
  });
  const workerType = parsePreferredWorkerType(application.preferredRoles, application.workStatus);
  const isActive = application.status === "approved";
  const payment = resolvePaymentFields(application);
  return {
    identityResolved: identity.hasIdentity,
    payload: {
      id: application.id,
      status: application.status,
      full_name: identity.fullName,
      first_name: identity.firstName,
      last_name: identity.lastName,
      email: application.email,
      phone: application.phone,
      address: application.address,
      city: application.city,
      province: application.province,
      province_code: application.province,
      worker_type: workerType,
      applying_for: workerType,
      is_active: isActive,
      active: isActive,
      payment_method: payment.paymentMethod,
      bank_name: payment.bankName,
      bank_institution: payment.bankInstitution,
      bank_transit: payment.bankTransit,
      bank_account: payment.bankAccount,
      etransfer_email: payment.etransferEmail,
      notes: application.notes
    }
  };
}
var REQUIRED_PUBLIC_APPLICATION_CONSENTS = [
  "backgroundCheckConsent",
  "titoAcknowledgment",
  "siteRulesAcknowledgment",
  "workerAgreementConsent",
  "privacyConsent",
  "paymentTermsAcknowledged",
  "smsConsent"
];
var consentLikeSchema = z2.union([z2.boolean(), z2.string(), z2.number()]);
var listLikeSchema = z2.union([z2.string(), z2.array(z2.string())]);
var nullableStringSchema = z2.union([z2.string(), z2.null()]).optional();
var nullableNumericLikeSchema = z2.union([z2.string(), z2.number(), z2.null()]).optional();
var RECENT_SUBMISSION_WINDOW_MS = 90 * 1e3;
var recentSubmissionFingerprints = /* @__PURE__ */ new Map();
var publicApplySubmissionSchema = z2.object({
  fullName: z2.string().trim().min(1).optional(),
  full_name: z2.string().trim().min(1).optional(),
  firstName: z2.string().trim().min(1).optional(),
  first_name: z2.string().trim().min(1).optional(),
  lastName: z2.string().trim().min(1).optional(),
  last_name: z2.string().trim().min(1).optional(),
  dateOfBirth: nullableStringSchema,
  phone: z2.string().trim().min(1),
  email: z2.string().email(),
  address: z2.string().trim().min(1),
  city: z2.string().trim().min(1),
  province: z2.string().trim().min(1),
  postalCode: z2.string().trim().min(1),
  workStatus: z2.string().trim().min(1),
  backgroundCheckConsent: consentLikeSchema,
  preferredRoles: listLikeSchema,
  otherRole: nullableStringSchema,
  availableDays: listLikeSchema,
  preferredShifts: listLikeSchema,
  unavailablePeriods: nullableStringSchema,
  yearsExperience: nullableNumericLikeSchema,
  experienceSummary: nullableStringSchema,
  skills: nullableStringSchema,
  desiredShiftLength: nullableNumericLikeSchema,
  maxTravelDistance: nullableNumericLikeSchema,
  emergencyContactName: z2.string().trim().min(1),
  emergencyContactRelationship: z2.string().trim().min(1),
  emergencyContactPhone: z2.string().trim().min(1),
  paymentMethod: nullableStringSchema,
  payment_method: nullableStringSchema,
  bankName: nullableStringSchema,
  bank_name: nullableStringSchema,
  bankInstitution: nullableStringSchema,
  bank_institution: nullableStringSchema,
  institutionNumber: nullableStringSchema,
  institution_number: nullableStringSchema,
  bankTransit: nullableStringSchema,
  bank_transit: nullableStringSchema,
  transitNumber: nullableStringSchema,
  transit_number: nullableStringSchema,
  bankAccount: nullableStringSchema,
  bank_account: nullableStringSchema,
  accountNumber: nullableStringSchema,
  account_number: nullableStringSchema,
  etransferEmail: nullableStringSchema,
  etransfer_email: nullableStringSchema,
  eTransferEmail: nullableStringSchema,
  e_transfer_email: nullableStringSchema,
  directDepositEmail: nullableStringSchema,
  bankingInfo: z2.union([z2.string(), z2.record(z2.unknown()), z2.null()]).optional(),
  banking_info: z2.union([z2.string(), z2.record(z2.unknown()), z2.null()]).optional(),
  paymentInfo: z2.union([z2.string(), z2.record(z2.unknown()), z2.null()]).optional(),
  payment_info: z2.union([z2.string(), z2.record(z2.unknown()), z2.null()]).optional(),
  paymentDetails: z2.union([z2.string(), z2.record(z2.unknown()), z2.null()]).optional(),
  payment_details: z2.union([z2.string(), z2.record(z2.unknown()), z2.null()]).optional(),
  bankInfo: z2.union([z2.string(), z2.record(z2.unknown()), z2.null()]).optional(),
  bank_info: z2.union([z2.string(), z2.record(z2.unknown()), z2.null()]).optional(),
  titoAcknowledgment: consentLikeSchema,
  siteRulesAcknowledgment: consentLikeSchema,
  workerAgreementConsent: consentLikeSchema,
  agreementVersion: nullableStringSchema,
  nonSolicitationAcknowledged: consentLikeSchema.optional(),
  nonSolicitationAcknowledgedAt: z2.union([z2.string(), z2.number()]).optional(),
  privacyConsent: consentLikeSchema,
  consentToContact: consentLikeSchema.optional(),
  smsConsent: consentLikeSchema,
  marketingConsent: consentLikeSchema.optional(),
  promotionalConsent: consentLikeSchema.optional(),
  paymentTermsAcknowledged: consentLikeSchema,
  independentContractorStatusAcknowledged: consentLikeSchema.optional(),
  signature: z2.string().trim().min(1),
  signatureDate: z2.string().trim().min(1)
}).strict();
function coordinateSchema(min, max, label) {
  return z2.union([
    z2.number().min(min).max(max),
    z2.string().trim().regex(/^-?\d+(\.\d+)?$/, "Must be a numeric value").refine(
      (v) => {
        const n = parseFloat(v);
        return n >= min && n <= max;
      },
      { message: `${label} must be between ${min} and ${max}` }
    )
  ]);
}
var optionalTrimmedStringSchema = z2.preprocess((value) => {
  if (value === null || value === void 0) return void 0;
  if (typeof value === "string") {
    const normalized = normalizeWhitespace(value);
    return normalized.length > 0 ? normalized : void 0;
  }
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  return value;
}, z2.string().optional());
var requiredTrimmedStringSchema = z2.preprocess((value) => {
  if (typeof value === "string") return normalizeWhitespace(value);
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  return value;
}, z2.string().trim().min(1));
var optionalNonNegativeIntSchema = z2.preprocess((value) => {
  if (value === null || value === void 0 || value === "") return void 0;
  if (typeof value === "number") return value;
  if (typeof value === "string") {
    const normalized = value.trim();
    if (!normalized) return void 0;
    const parsed = Number(normalized);
    return Number.isFinite(parsed) ? parsed : value;
  }
  return value;
}, z2.number().int().nonnegative().optional());
var publicApplicantSubmissionSchema = z2.object({
  fullName: optionalTrimmedStringSchema,
  full_name: optionalTrimmedStringSchema,
  firstName: optionalTrimmedStringSchema,
  first_name: optionalTrimmedStringSchema,
  lastName: optionalTrimmedStringSchema,
  last_name: optionalTrimmedStringSchema,
  email: z2.preprocess((value) => {
    if (value === null || value === void 0 || value === "") return void 0;
    if (typeof value !== "string") return value;
    return value.trim().toLowerCase();
  }, z2.string().email().optional()),
  phone: optionalTrimmedStringSchema,
  phoneNumber: optionalTrimmedStringSchema,
  phone_number: optionalTrimmedStringSchema,
  mobile: optionalTrimmedStringSchema,
  contactNumber: optionalTrimmedStringSchema,
  addressFull: requiredTrimmedStringSchema,
  addressStreet: optionalTrimmedStringSchema,
  addressCity: optionalTrimmedStringSchema,
  addressProvince: optionalTrimmedStringSchema,
  addressPostalCode: optionalTrimmedStringSchema,
  addressCountry: optionalTrimmedStringSchema,
  addressLatitude: coordinateSchema(-90, 90, "Latitude").optional(),
  addressLongitude: coordinateSchema(-180, 180, "Longitude").optional(),
  addressManualEntry: z2.boolean().optional(),
  applyingFor: requiredTrimmedStringSchema,
  jobPostingSource: requiredTrimmedStringSchema,
  photoData: requiredTrimmedStringSchema,
  photoFilename: optionalTrimmedStringSchema,
  photoMimeType: optionalTrimmedStringSchema,
  photoFileSize: optionalNonNegativeIntSchema,
  resumeData: requiredTrimmedStringSchema,
  resumeFilename: optionalTrimmedStringSchema,
  resumeMimeType: optionalTrimmedStringSchema,
  resumeFileSize: optionalNonNegativeIntSchema,
  smsConsent: consentLikeSchema.optional(),
  marketingConsent: consentLikeSchema.optional(),
  promotionalConsent: consentLikeSchema.optional()
}).strip();
function pickFirstPresent(source, keys) {
  for (const key of keys) {
    if (Object.prototype.hasOwnProperty.call(source, key)) {
      const value = source[key];
      if (value !== void 0 && value !== null) {
        return value;
      }
    }
  }
  return void 0;
}
function normalizePublicApplicantSubmissionPayload(input) {
  const source = input && typeof input === "object" && !Array.isArray(input) ? input : {};
  const photoData = pickFirstPresent(source, ["photoData", "photo_data"]);
  const resumeData = pickFirstPresent(source, ["resumeData", "resume_data"]);
  return {
    fullName: pickFirstPresent(source, ["fullName", "full_name", "name"]),
    full_name: pickFirstPresent(source, ["full_name"]),
    firstName: pickFirstPresent(source, ["firstName", "first_name"]),
    first_name: pickFirstPresent(source, ["first_name"]),
    lastName: pickFirstPresent(source, ["lastName", "last_name"]),
    last_name: pickFirstPresent(source, ["last_name"]),
    email: pickFirstPresent(source, ["email", "emailAddress", "email_address"]),
    phone: pickFirstPresent(source, ["phone", "phoneNumber", "phone_number", "mobile", "contactNumber"]),
    phoneNumber: pickFirstPresent(source, ["phoneNumber"]),
    phone_number: pickFirstPresent(source, ["phone_number"]),
    mobile: pickFirstPresent(source, ["mobile"]),
    contactNumber: pickFirstPresent(source, ["contactNumber", "contact_number"]),
    addressFull: pickFirstPresent(source, ["addressFull", "address_full", "address"]),
    addressStreet: pickFirstPresent(source, ["addressStreet", "address_street", "street", "addressLine1"]),
    addressCity: pickFirstPresent(source, ["addressCity", "address_city", "city"]),
    addressProvince: pickFirstPresent(source, ["addressProvince", "address_province", "province", "state"]),
    addressPostalCode: pickFirstPresent(source, ["addressPostalCode", "address_postal_code", "postalCode", "postal_code", "zip", "zipCode"]),
    addressCountry: pickFirstPresent(source, ["addressCountry", "address_country", "country"]),
    addressLatitude: pickFirstPresent(source, ["addressLatitude", "address_latitude", "latitude", "lat"]),
    addressLongitude: pickFirstPresent(source, ["addressLongitude", "address_longitude", "longitude", "lng", "lon"]),
    addressManualEntry: pickFirstPresent(source, ["addressManualEntry", "address_manual_entry", "manualAddressEntry"]),
    applyingFor: pickFirstPresent(source, ["applyingFor", "applying_for", "position", "role"]),
    jobPostingSource: pickFirstPresent(source, ["jobPostingSource", "job_posting_source", "applicationSource", "source"]),
    photoData,
    photoFilename: pickFirstPresent(source, ["photoFilename", "photo_filename"]),
    photoMimeType: pickFirstPresent(source, ["photoMimeType", "photo_mime_type"]),
    photoFileSize: pickFirstPresent(source, ["photoFileSize", "photo_file_size"]),
    resumeData,
    resumeFilename: pickFirstPresent(source, ["resumeFilename", "resume_filename"]),
    resumeMimeType: pickFirstPresent(source, ["resumeMimeType", "resume_mime_type"]),
    resumeFileSize: pickFirstPresent(source, ["resumeFileSize", "resume_file_size"]),
    smsConsent: pickFirstPresent(source, ["smsConsent", "sms_consent", "consentToContact", "consent_to_contact"]),
    marketingConsent: pickFirstPresent(source, ["marketingConsent", "marketing_consent"]),
    promotionalConsent: pickFirstPresent(source, ["promotionalConsent", "promotional_consent", "marketingConsent", "marketing_consent"])
  };
}
function isConsentGranted(value) {
  if (typeof value === "boolean") return value;
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    return normalized === "true" || normalized === "1" || normalized === "yes" || normalized === "on";
  }
  if (typeof value === "number") return value === 1;
  return false;
}
function getMissingRequiredConsents(payload) {
  if (!payload) return [...REQUIRED_PUBLIC_APPLICATION_CONSENTS];
  const resolved = resolveAcknowledgmentFields(payload);
  const consentValues = {
    backgroundCheckConsent: resolved.backgroundCheckConsent,
    titoAcknowledgment: resolved.titoAcknowledgment,
    siteRulesAcknowledgment: resolved.siteRulesAcknowledgment,
    workerAgreementConsent: resolved.workerAgreementConsent,
    privacyConsent: resolved.privacyConsent,
    paymentTermsAcknowledged: resolved.paymentTermsAcknowledged,
    smsConsent: resolved.smsConsent
  };
  return REQUIRED_PUBLIC_APPLICATION_CONSENTS.filter((field) => !consentValues[field]);
}
function normalizeJsonArrayField(value) {
  if (typeof value === "string") {
    return value;
  }
  if (Array.isArray(value)) {
    return JSON.stringify(value);
  }
  return "[]";
}
function normalizeOptionalText(value) {
  if (typeof value !== "string") return null;
  const trimmed = normalizeWhitespace(value);
  return trimmed.length > 0 ? trimmed : null;
}
function normalizeOptionalNumber(value) {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return null;
    const parsed = Number(trimmed);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}
function normalizeWhitespace(value) {
  return value.trim().replace(/\s+/g, " ");
}
function formatValidationIssues(issues) {
  return issues.slice(0, 10).map((issue) => ({
    path: issue.path.join("."),
    message: issue.message
  }));
}
function normalizeComparableText(value) {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}
function normalizePhoneForComparison(value) {
  const digits = value.replace(/\D/g, "");
  if (digits.length === 11 && digits.startsWith("1")) {
    return digits.slice(1);
  }
  return digits;
}
function buildApplicantLocationDisplay(input) {
  const city = normalizeOptionalText(input.addressCity);
  const province = normalizeOptionalText(input.addressProvince);
  const structuredLocation = [city, province?.toUpperCase()].filter(Boolean).join(", ");
  if (structuredLocation) return structuredLocation;
  const parsedAddress = parseLocalAddress(input.addressFull || "");
  const parsedCity = normalizeOptionalText(parsedAddress.city);
  const parsedProvince = normalizeOptionalText(parsedAddress.province);
  const parsedLocation = [parsedCity, parsedProvince?.toUpperCase()].filter(Boolean).join(", ");
  if (parsedLocation) return parsedLocation;
  const fullAddress = normalizeOptionalText(input.addressFull);
  if (fullAddress) {
    const parts = fullAddress.split(",").map((part) => normalizeOptionalText(part)).filter(Boolean);
    if (parts.length >= 2) {
      return `${parts[parts.length - 2]}, ${parts[parts.length - 1]}`;
    }
    return fullAddress;
  }
  return null;
}
function normalizeApplicantPhone(value) {
  if (value === null || value === void 0) return null;
  const normalized = normalizeWhitespace(String(value));
  return normalized.length > 0 ? normalized : null;
}
var APPLICANT_OPTIONAL_CONSENT_COLUMNS = {
  smsConsent: "sms_consent",
  smsConsentAt: "sms_consent_at",
  marketingConsent: "marketing_consent",
  marketingConsentAt: "marketing_consent_at",
  promotionalConsent: "promotional_consent"
};
var APPLICANT_OPTIONAL_ADDRESS_COLUMNS = {
  addressLatitude: "address_latitude",
  addressLongitude: "address_longitude"
};
var applicantsColumnSetPromise = null;
async function getApplicantsColumnSet() {
  if (!applicantsColumnSetPromise) {
    applicantsColumnSetPromise = db.execute(sql3`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_schema = current_schema()
        AND table_name = 'applicants'
    `).then((result) => {
      const rows = Array.isArray(result) ? result : result && typeof result === "object" && "rows" in result && Array.isArray(result.rows) ? result.rows : [];
      const columnSet = new Set(
        rows.map((row) => row?.column_name).filter((columnName) => typeof columnName === "string" && columnName.length > 0)
      );
      const missingColumns = [
        ...Object.values(APPLICANT_OPTIONAL_CONSENT_COLUMNS),
        ...Object.values(APPLICANT_OPTIONAL_ADDRESS_COLUMNS)
      ].filter((columnName) => !columnSet.has(columnName));
      if (missingColumns.length > 0) {
        console.warn(`[APPLICANTS] Optional applicant columns unavailable: ${missingColumns.join(", ")}`);
      }
      return columnSet;
    }).catch((error) => {
      console.warn("[APPLICANTS] Failed to inspect applicants columns; falling back to legacy-safe projection", error);
      return /* @__PURE__ */ new Set();
    });
  }
  return applicantsColumnSetPromise;
}
async function getApplicantOptionalConsentSelect() {
  const columnSet = await getApplicantsColumnSet();
  return {
    smsConsent: columnSet.has(APPLICANT_OPTIONAL_CONSENT_COLUMNS.smsConsent) ? applicants.smsConsent : sql3`NULL`,
    smsConsentAt: columnSet.has(APPLICANT_OPTIONAL_CONSENT_COLUMNS.smsConsentAt) ? applicants.smsConsentAt : sql3`NULL`,
    marketingConsent: columnSet.has(APPLICANT_OPTIONAL_CONSENT_COLUMNS.marketingConsent) ? applicants.marketingConsent : sql3`NULL`,
    marketingConsentAt: columnSet.has(APPLICANT_OPTIONAL_CONSENT_COLUMNS.marketingConsentAt) ? applicants.marketingConsentAt : sql3`NULL`,
    promotionalConsent: columnSet.has(APPLICANT_OPTIONAL_CONSENT_COLUMNS.promotionalConsent) ? applicants.promotionalConsent : sql3`NULL`
  };
}
async function getApplicantOptionalAddressSelect() {
  const columnSet = await getApplicantsColumnSet();
  return {
    addressLatitude: columnSet.has(APPLICANT_OPTIONAL_ADDRESS_COLUMNS.addressLatitude) ? applicants.addressLatitude : sql3`NULL`,
    addressLongitude: columnSet.has(APPLICANT_OPTIONAL_ADDRESS_COLUMNS.addressLongitude) ? applicants.addressLongitude : sql3`NULL`
  };
}
var REQUIRED_APPROVAL_ACK_FIELDS = [
  { field: "backgroundCheckConsent", label: "Background Check Consent" },
  { field: "titoAcknowledgment", label: "TITO Acknowledgment" },
  { field: "siteRulesAcknowledgment", label: "Site Rules Acknowledgment" },
  { field: "workerAgreementConsent", label: "Worker Agreement Consent" },
  { field: "privacyConsent", label: "Privacy Consent" },
  // consentToContact is informational-only and must NOT block approval
  { field: "nonSolicitationAcknowledged", label: "Non-Solicitation Acknowledgment" }
];
function getMissingApprovalAcknowledgments(application) {
  const resolved = resolveAcknowledgmentFields(application);
  const fieldToResolvedKey = {
    backgroundCheckConsent: "backgroundCheckConsent",
    titoAcknowledgment: "titoAcknowledgment",
    siteRulesAcknowledgment: "siteRulesAcknowledgment",
    workerAgreementConsent: "workerAgreementConsent",
    privacyConsent: "privacyConsent",
    // consentToContact is informational-only and must NOT block approval
    nonSolicitationAcknowledged: "nonSolicitationAcknowledged"
  };
  return REQUIRED_APPROVAL_ACK_FIELDS.filter(({ field }) => !resolved[fieldToResolvedKey[field]]).map(({ label }) => label);
}
var WORKER_APPLICATION_OPTIONAL_METADATA_COLUMNS = {
  consentToContact: "consent_to_contact",
  marketingConsent: "marketing_consent",
  promotionalConsent: "promotional_consent",
  agreementVersion: "agreement_version",
  nonSolicitationAcknowledged: "non_solicitation_acknowledged",
  nonSolicitationAcknowledgedAt: "non_solicitation_acknowledged_at",
  workerPdfGeneratedAt: "worker_pdf_generated_at",
  internalPdfGeneratedAt: "internal_pdf_generated_at",
  applicationSource: "application_source",
  assignedRecruiter: "assigned_recruiter",
  recruiterNotes: "recruiter_notes",
  interviewStage: "interview_stage",
  interviewNotes: "interview_notes",
  deploymentReadiness: "deployment_readiness",
  payrollReadiness: "payroll_readiness",
  missingDocuments: "missing_documents",
  nextRecommendedAction: "next_recommended_action",
  documentRequestSentAt: "document_request_sent_at",
  lastContactedAt: "last_contacted_at",
  institutionNumber: "institution_number",
  transitNumber: "transit_number",
  accountNumber: "account_number",
  eTransferEmail: "e_transfer_email",
  directDepositEmail: "direct_deposit_email",
  paymentInfo: "payment_info",
  paymentDetails: "payment_details",
  bankingInfo: "banking_info",
  bankInfo: "bank_info"
};
var workerApplicationColumnSetPromise = null;
async function getWorkerApplicationColumnSet() {
  if (!workerApplicationColumnSetPromise) {
    workerApplicationColumnSetPromise = db.execute(sql3`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_schema = current_schema()
        AND table_name = 'worker_applications'
    `).then((result) => {
      const rows = Array.isArray(result) ? result : result && typeof result === "object" && "rows" in result && Array.isArray(result.rows) ? result.rows : [];
      const columnSet = new Set(
        rows.map((row) => row?.column_name).filter((columnName) => typeof columnName === "string" && columnName.length > 0)
      );
      const missingColumns = Object.values(WORKER_APPLICATION_OPTIONAL_METADATA_COLUMNS).filter((columnName) => !columnSet.has(columnName));
      if (missingColumns.length > 0) {
        console.warn(`[WORKER_APPLICATIONS] Optional dashboard columns unavailable: ${missingColumns.join(", ")}`);
      }
      return columnSet;
    }).catch((error) => {
      console.warn("[WORKER_APPLICATIONS] Failed to inspect worker_applications columns; falling back to legacy-safe dashboard projection", error);
      return /* @__PURE__ */ new Set();
    });
  }
  return workerApplicationColumnSetPromise;
}
async function getWorkerApplicationOptionalMetadataSelect() {
  const columnSet = await getWorkerApplicationColumnSet();
  return {
    consentToContact: columnSet.has(WORKER_APPLICATION_OPTIONAL_METADATA_COLUMNS.consentToContact) ? workerApplications.consentToContact : sql3`NULL`,
    marketingConsent: columnSet.has(WORKER_APPLICATION_OPTIONAL_METADATA_COLUMNS.marketingConsent) ? workerApplications.marketingConsent : sql3`NULL`,
    promotionalConsent: columnSet.has(WORKER_APPLICATION_OPTIONAL_METADATA_COLUMNS.promotionalConsent) ? workerApplications.promotionalConsent : sql3`NULL`,
    agreementVersion: columnSet.has(WORKER_APPLICATION_OPTIONAL_METADATA_COLUMNS.agreementVersion) ? workerApplications.agreementVersion : sql3`NULL`,
    nonSolicitationAcknowledged: columnSet.has(WORKER_APPLICATION_OPTIONAL_METADATA_COLUMNS.nonSolicitationAcknowledged) ? workerApplications.nonSolicitationAcknowledged : sql3`NULL`,
    nonSolicitationAcknowledgedAt: columnSet.has(WORKER_APPLICATION_OPTIONAL_METADATA_COLUMNS.nonSolicitationAcknowledgedAt) ? workerApplications.nonSolicitationAcknowledgedAt : sql3`NULL`,
    workerPdfGeneratedAt: columnSet.has(WORKER_APPLICATION_OPTIONAL_METADATA_COLUMNS.workerPdfGeneratedAt) ? workerApplications.workerPdfGeneratedAt : sql3`NULL`,
    internalPdfGeneratedAt: columnSet.has(WORKER_APPLICATION_OPTIONAL_METADATA_COLUMNS.internalPdfGeneratedAt) ? workerApplications.internalPdfGeneratedAt : sql3`NULL`,
    applicationSource: columnSet.has(WORKER_APPLICATION_OPTIONAL_METADATA_COLUMNS.applicationSource) ? workerApplications.applicationSource : sql3`NULL`,
    assignedRecruiter: columnSet.has(WORKER_APPLICATION_OPTIONAL_METADATA_COLUMNS.assignedRecruiter) ? workerApplications.assignedRecruiter : sql3`NULL`,
    recruiterNotes: columnSet.has(WORKER_APPLICATION_OPTIONAL_METADATA_COLUMNS.recruiterNotes) ? workerApplications.recruiterNotes : sql3`NULL`,
    interviewStage: columnSet.has(WORKER_APPLICATION_OPTIONAL_METADATA_COLUMNS.interviewStage) ? workerApplications.interviewStage : sql3`NULL`,
    interviewNotes: columnSet.has(WORKER_APPLICATION_OPTIONAL_METADATA_COLUMNS.interviewNotes) ? workerApplications.interviewNotes : sql3`NULL`,
    deploymentReadiness: columnSet.has(WORKER_APPLICATION_OPTIONAL_METADATA_COLUMNS.deploymentReadiness) ? workerApplications.deploymentReadiness : sql3`NULL`,
    payrollReadiness: columnSet.has(WORKER_APPLICATION_OPTIONAL_METADATA_COLUMNS.payrollReadiness) ? workerApplications.payrollReadiness : sql3`NULL`,
    missingDocuments: columnSet.has(WORKER_APPLICATION_OPTIONAL_METADATA_COLUMNS.missingDocuments) ? workerApplications.missingDocuments : sql3`NULL`,
    nextRecommendedAction: columnSet.has(WORKER_APPLICATION_OPTIONAL_METADATA_COLUMNS.nextRecommendedAction) ? workerApplications.nextRecommendedAction : sql3`NULL`,
    documentRequestSentAt: columnSet.has(WORKER_APPLICATION_OPTIONAL_METADATA_COLUMNS.documentRequestSentAt) ? workerApplications.documentRequestSentAt : sql3`NULL`,
    lastContactedAt: columnSet.has(WORKER_APPLICATION_OPTIONAL_METADATA_COLUMNS.lastContactedAt) ? workerApplications.lastContactedAt : sql3`NULL`,
    institutionNumber: columnSet.has(WORKER_APPLICATION_OPTIONAL_METADATA_COLUMNS.institutionNumber) ? sql3`"worker_applications"."institution_number"` : sql3`NULL`,
    transitNumber: columnSet.has(WORKER_APPLICATION_OPTIONAL_METADATA_COLUMNS.transitNumber) ? sql3`"worker_applications"."transit_number"` : sql3`NULL`,
    accountNumber: columnSet.has(WORKER_APPLICATION_OPTIONAL_METADATA_COLUMNS.accountNumber) ? sql3`"worker_applications"."account_number"` : sql3`NULL`,
    eTransferEmail: columnSet.has(WORKER_APPLICATION_OPTIONAL_METADATA_COLUMNS.eTransferEmail) ? sql3`"worker_applications"."e_transfer_email"` : sql3`NULL`,
    directDepositEmail: columnSet.has(WORKER_APPLICATION_OPTIONAL_METADATA_COLUMNS.directDepositEmail) ? sql3`"worker_applications"."direct_deposit_email"` : sql3`NULL`,
    paymentInfo: columnSet.has(WORKER_APPLICATION_OPTIONAL_METADATA_COLUMNS.paymentInfo) ? sql3`"worker_applications"."payment_info"` : sql3`NULL`,
    paymentDetails: columnSet.has(WORKER_APPLICATION_OPTIONAL_METADATA_COLUMNS.paymentDetails) ? sql3`"worker_applications"."payment_details"` : sql3`NULL`,
    bankingInfo: columnSet.has(WORKER_APPLICATION_OPTIONAL_METADATA_COLUMNS.bankingInfo) ? sql3`"worker_applications"."banking_info"` : sql3`NULL`,
    bankInfo: columnSet.has(WORKER_APPLICATION_OPTIONAL_METADATA_COLUMNS.bankInfo) ? sql3`"worker_applications"."bank_info"` : sql3`NULL`
  };
}
async function getWorkerApplicationAgreementSelect() {
  return {
    id: workerApplications.id,
    fullName: workerApplications.fullName,
    phone: workerApplications.phone,
    email: workerApplications.email,
    address: workerApplications.address,
    city: workerApplications.city,
    province: workerApplications.province,
    postalCode: workerApplications.postalCode,
    preferredRoles: workerApplications.preferredRoles,
    availableDays: workerApplications.availableDays,
    preferredShifts: workerApplications.preferredShifts,
    yearsExperience: workerApplications.yearsExperience,
    backgroundCheckConsent: workerApplications.backgroundCheckConsent,
    paymentMethod: workerApplications.paymentMethod,
    bankName: workerApplications.bankName,
    bankInstitution: workerApplications.bankInstitution,
    bankTransit: workerApplications.bankTransit,
    bankAccount: workerApplications.bankAccount,
    etransferEmail: workerApplications.etransferEmail,
    titoAcknowledgment: workerApplications.titoAcknowledgment,
    siteRulesAcknowledgment: workerApplications.siteRulesAcknowledgment,
    workerAgreementConsent: workerApplications.workerAgreementConsent,
    privacyConsent: workerApplications.privacyConsent,
    ...await getWorkerApplicationOptionalMetadataSelect(),
    signature: workerApplications.signature,
    signatureDate: workerApplications.signatureDate,
    createdAt: workerApplications.createdAt
  };
}
var WORKER_APPLICATION_WORKFLOW_STATUSES = [
  "new",
  "reviewing",
  "contacted",
  "interview_scheduled",
  "interviewed",
  "ready_for_deployment",
  "approved",
  "rejected",
  "on_hold"
];
var WORKER_APPLICATION_STATUS_ALIASES = {
  pending: "new",
  reviewed: "reviewing"
};
var INTERVIEW_STAGE_VALUES = ["not_started", "screening", "scheduled", "completed", "no_show"];
var READINESS_VALUES = ["not_ready", "needs_review", "ready"];
var PAYROLL_READINESS_VALUES = ["not_ready", "missing_payment_info", "ready"];
var BULK_APPLICATION_ACTIONS = ["update_status", "assign_recruiter", "request_documents", "send_app_instructions"];
var adminApplicationUpdateSchema = z2.object({
  status: z2.string().optional(),
  notes: z2.string().optional(),
  assignedRecruiter: z2.string().optional().nullable(),
  recruiterNotes: z2.string().optional().nullable(),
  interviewStage: z2.string().optional().nullable(),
  interviewNotes: z2.string().optional().nullable(),
  deploymentReadiness: z2.string().optional().nullable(),
  payrollReadiness: z2.string().optional().nullable(),
  missingDocuments: z2.union([z2.string(), z2.array(z2.string())]).optional().nullable(),
  nextRecommendedAction: z2.string().optional().nullable(),
  applicationSource: z2.string().optional().nullable()
}).strict();
var adminApplicationBulkActionSchema = z2.object({
  action: z2.enum(BULK_APPLICATION_ACTIONS),
  ids: z2.array(z2.string().trim().min(1)).min(1),
  status: z2.string().optional(),
  assignedRecruiter: z2.string().optional().nullable(),
  requestedDocuments: z2.union([z2.string(), z2.array(z2.string())]).optional().nullable(),
  recruiterNotes: z2.string().optional().nullable()
}).strict();
function normalizeWorkerApplicationStatus(value) {
  if (typeof value !== "string" || value.trim().length === 0) {
    return "new";
  }
  const normalized = value.trim().toLowerCase();
  if (WORKER_APPLICATION_WORKFLOW_STATUSES.includes(normalized)) {
    return normalized;
  }
  return WORKER_APPLICATION_STATUS_ALIASES[normalized] || "new";
}
function getWorkerApplicationStatusLabel(status) {
  switch (normalizeWorkerApplicationStatus(status)) {
    case "new":
      return "New";
    case "reviewing":
      return "Reviewing";
    case "contacted":
      return "Contacted";
    case "interview_scheduled":
      return "Interview Scheduled";
    case "interviewed":
      return "Interviewed";
    case "ready_for_deployment":
      return "Ready for Deployment";
    case "approved":
      return "Approved";
    case "rejected":
      return "Rejected";
    case "on_hold":
      return "On Hold";
    default:
      return "New";
  }
}
function getWorkerApplicationStatusPriority(status) {
  switch (normalizeWorkerApplicationStatus(status)) {
    case "approved":
      return 90;
    case "ready_for_deployment":
      return 80;
    case "interviewed":
      return 70;
    case "interview_scheduled":
      return 60;
    case "contacted":
      return 50;
    case "reviewing":
      return 40;
    case "new":
      return 30;
    case "on_hold":
      return 20;
    case "rejected":
      return 10;
    default:
      return 0;
  }
}
function normalizeNameForDuplicateComparison(value) {
  return normalizeComparableText(value || "").replace(/[^a-z\s]/g, " ").split(/\s+/).filter((token) => token.length > 1).join(" ");
}
function parseDocumentList(value) {
  if (Array.isArray(value)) {
    return value.map((item) => normalizeWhitespace(String(item))).filter(Boolean);
  }
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return [];
    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed)) {
        return parsed.map((item) => normalizeWhitespace(String(item))).filter(Boolean);
      }
    } catch {
    }
    return trimmed.split(/\n|,/).map((item) => normalizeWhitespace(item)).filter(Boolean);
  }
  return [];
}
function serializeDocumentList(value) {
  const items = Array.from(new Set(parseDocumentList(value)));
  return items.length > 0 ? JSON.stringify(items) : null;
}
function normalizeInterviewStage(value, status) {
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (INTERVIEW_STAGE_VALUES.includes(normalized)) {
      return normalized;
    }
  }
  const normalizedStatus = normalizeWorkerApplicationStatus(status);
  if (normalizedStatus === "interview_scheduled") return "scheduled";
  if (normalizedStatus === "interviewed") return "completed";
  if (normalizedStatus === "contacted" || normalizedStatus === "reviewing") return "screening";
  return "not_started";
}
function normalizeReadinessValue(value, allowedValues, fallback) {
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (allowedValues.includes(normalized)) {
      return normalized;
    }
  }
  return fallback;
}
function normalizeDeploymentReadiness(value, status) {
  const normalizedStatus = normalizeWorkerApplicationStatus(status);
  if (normalizedStatus === "ready_for_deployment" || normalizedStatus === "approved") {
    return normalizeReadinessValue(value, READINESS_VALUES, "ready");
  }
  if (normalizedStatus === "interviewed") {
    return normalizeReadinessValue(value, READINESS_VALUES, "needs_review");
  }
  return normalizeReadinessValue(value, READINESS_VALUES, "not_ready");
}
function normalizePayrollReadiness(value, hasPaymentMethod, status) {
  const normalizedStatus = normalizeWorkerApplicationStatus(status);
  if (normalizedStatus === "approved" && hasPaymentMethod) {
    return normalizeReadinessValue(value, PAYROLL_READINESS_VALUES, "ready");
  }
  if (!hasPaymentMethod) {
    return normalizeReadinessValue(value, PAYROLL_READINESS_VALUES, "missing_payment_info");
  }
  return normalizeReadinessValue(value, PAYROLL_READINESS_VALUES, "not_ready");
}
function normalizePaymentMethodValue(value) {
  const normalized = normalizeOptionalText(typeof value === "string" ? value : null)?.toLowerCase();
  if (!normalized) return "";
  if (["both", "all", "any"].includes(normalized)) return "both";
  if (["etransfer", "e-transfer", "interac", "interac e-transfer", "email_transfer"].includes(normalized)) return "etransfer";
  if (["direct_deposit", "direct deposit", "bank", "bank_transfer"].includes(normalized)) return "direct_deposit";
  return "";
}
function maskAccountNumber(value) {
  const raw = normalizeOptionalText(typeof value === "string" ? value : null);
  if (!raw) return "Not provided";
  const digits = raw.replace(/\D/g, "");
  if (digits.length < 4) return "****";
  return `******${digits.slice(-4)}`;
}
function buildPaymentSummary(application) {
  const resolved = resolvePaymentFields(application);
  const normalizedMethod = normalizePaymentMethodValue(resolved.paymentMethod);
  const bankName = normalizeOptionalText(resolved.bankName);
  const bankInstitution = normalizeOptionalText(resolved.bankInstitution);
  const bankTransit = normalizeOptionalText(resolved.bankTransit);
  const bankAccount = normalizeOptionalText(resolved.bankAccount);
  const etransferEmail = normalizeOptionalText(resolved.etransferEmail);
  const payrollContactEmail = etransferEmail || normalizeOptionalText(typeof application.email === "string" ? application.email : null);
  const hasDirectDepositDetails = Boolean(bankName && bankInstitution && bankTransit && bankAccount);
  const hasEtransferDetails = Boolean(etransferEmail);
  let methodLabel = "Not selected";
  if (normalizedMethod === "direct_deposit") methodLabel = "Direct Deposit";
  if (normalizedMethod === "etransfer") methodLabel = "Interac E-Transfer";
  if (normalizedMethod === "both") methodLabel = "Direct Deposit + Interac E-Transfer";
  let hasRequiredPaymentInfo = false;
  if (normalizedMethod === "both") {
    hasRequiredPaymentInfo = hasDirectDepositDetails && hasEtransferDetails;
  } else if (normalizedMethod === "direct_deposit") {
    hasRequiredPaymentInfo = hasDirectDepositDetails;
  } else if (normalizedMethod === "etransfer") {
    hasRequiredPaymentInfo = hasEtransferDetails;
  }
  return {
    methodValue: normalizedMethod,
    methodLabel,
    bankName: bankName || "Not provided",
    bankInstitution: bankInstitution || "Not provided",
    bankTransit: bankTransit || "Not provided",
    bankAccountMasked: maskAccountNumber(resolved.bankAccount),
    etransferEmail: etransferEmail || "Not provided",
    payrollContactEmail: payrollContactEmail || "Not provided",
    hasRequiredPaymentInfo
  };
}
function normalizeApplicationSource(value) {
  const normalized = normalizeOptionalText(typeof value === "string" ? value : null);
  return normalized || "Direct application";
}
function getAgreementReviewSummary(application) {
  const agreementVersion = normalizeOptionalText(String(application.agreementVersion || "")) || "Previous agreement on file";
  const nonSolicitationAcknowledged = application.nonSolicitationAcknowledged;
  const acknowledgedAt = application.nonSolicitationAcknowledgedAt;
  let nonSolicitationLabel = "Requires acknowledgment review";
  if (nonSolicitationAcknowledged === true) {
    nonSolicitationLabel = "Non-Solicitation Accepted";
  } else if (nonSolicitationAcknowledged === false) {
    nonSolicitationLabel = "Non-Solicitation Not Accepted";
  }
  let acceptedOnLabel = "Acknowledgment date not available";
  if (acknowledgedAt) {
    const date2 = new Date(String(acknowledgedAt));
    acceptedOnLabel = Number.isNaN(date2.getTime()) ? "Acknowledgment date not available" : date2.toLocaleDateString("en-CA", { month: "short", day: "numeric", year: "numeric" });
  } else if (nonSolicitationAcknowledged !== true) {
    acceptedOnLabel = "Requires acknowledgment review";
  }
  return {
    versionLabel: agreementVersion,
    nonSolicitationLabel,
    acceptedOnLabel,
    compactLabel: `${agreementVersion} \u2022 ${nonSolicitationLabel}`
  };
}
function computeNextRecommendedAction(application) {
  const missingDocuments = parseDocumentList(application.missingDocuments);
  if (missingDocuments.length > 0) {
    return "Request missing documents and confirm receipt";
  }
  const missingAcknowledgments = getMissingApprovalAcknowledgments(application);
  if (missingAcknowledgments.length > 0) {
    return "Resolve required acknowledgment review";
  }
  const status = normalizeWorkerApplicationStatus(application.status);
  if (!normalizeOptionalText(String(application.assignedRecruiter || ""))) {
    return "Assign recruiter ownership";
  }
  switch (status) {
    case "new":
      return "Begin applicant review and outreach";
    case "reviewing":
      return "Contact applicant and validate fit";
    case "contacted":
      return "Schedule interview";
    case "interview_scheduled":
      return "Complete interview and record notes";
    case "interviewed":
      return "Assess deployment readiness";
    case "ready_for_deployment":
      return "Confirm payroll readiness and approval";
    case "approved":
      return "Send app instructions and confirm onboarding";
    case "on_hold":
      return "Resolve blocker and resume review";
    case "rejected":
      return "Archive record and retain notes";
    default:
      return "Review application details";
  }
}
function getApplicationTimestampMs(value) {
  if (!value) return 0;
  const timestamp2 = new Date(String(value)).getTime();
  return Number.isNaN(timestamp2) ? 0 : timestamp2;
}
function getApplicationLocationLabel(application) {
  const city = normalizeOptionalText(String(application.city || ""));
  const province = normalizeOptionalText(String(application.province || ""));
  return [city, province].filter(Boolean).join(", ") || "Location pending";
}
function normalizeDashboardApplication(application) {
  const workflowStatus = normalizeWorkerApplicationStatus(application.status);
  const missingDocumentsList = parseDocumentList(application.missingDocuments);
  const paymentSummary = buildPaymentSummary(application);
  const agreementSummary = getAgreementReviewSummary(application);
  const nextRecommendedAction = normalizeOptionalText(String(application.nextRecommendedAction || "")) || computeNextRecommendedAction({
    ...application,
    status: workflowStatus,
    missingDocuments: application.missingDocuments
  });
  return {
    ...application,
    status: workflowStatus,
    statusLabel: getWorkerApplicationStatusLabel(workflowStatus),
    interviewStage: normalizeInterviewStage(application.interviewStage, workflowStatus),
    deploymentReadiness: normalizeDeploymentReadiness(application.deploymentReadiness, workflowStatus),
    payrollReadiness: normalizePayrollReadiness(application.payrollReadiness, paymentSummary.hasRequiredPaymentInfo, workflowStatus),
    missingDocumentsList,
    applicationSource: normalizeApplicationSource(application.applicationSource),
    assignedRecruiter: normalizeOptionalText(String(application.assignedRecruiter || "")),
    recruiterNotes: normalizeOptionalText(String(application.recruiterNotes || "")),
    interviewNotes: normalizeOptionalText(String(application.interviewNotes || "")),
    nextRecommendedAction,
    agreementSummary,
    paymentSummary,
    locationLabel: getApplicationLocationLabel(application),
    duplicateMatchName: normalizeNameForDuplicateComparison(application.fullName || application.full_name),
    normalizedEmail: normalizeComparableText(application.email || ""),
    normalizedPhone: normalizePhoneForComparison(application.phone || ""),
    updatedAtMs: getApplicationTimestampMs(application.updatedAt || application.updated_at || application.createdAt || application.created_at),
    createdAtMs: getApplicationTimestampMs(application.createdAt || application.created_at)
  };
}
function choosePrimaryApplicationForGroup(applications) {
  return [...applications].sort((left, right) => {
    const statusDelta = getWorkerApplicationStatusPriority(right.status) - getWorkerApplicationStatusPriority(left.status);
    if (statusDelta !== 0) return statusDelta;
    return (right.updatedAtMs || right.createdAtMs || 0) - (left.updatedAtMs || left.createdAtMs || 0);
  })[0];
}
function groupApplicationsByDuplicateSignals(applications) {
  const parents = applications.map((_, index2) => index2);
  const find = (index2) => {
    if (parents[index2] !== index2) {
      parents[index2] = find(parents[index2]);
    }
    return parents[index2];
  };
  const union = (left, right) => {
    const leftRoot = find(left);
    const rightRoot = find(right);
    if (leftRoot !== rightRoot) {
      parents[rightRoot] = leftRoot;
    }
  };
  const emailMap = /* @__PURE__ */ new Map();
  const phoneMap = /* @__PURE__ */ new Map();
  const nameMap = /* @__PURE__ */ new Map();
  applications.forEach((application, index2) => {
    if (application.normalizedPhone) {
      const existing = phoneMap.get(application.normalizedPhone);
      if (existing !== void 0) union(existing, index2);
      else phoneMap.set(application.normalizedPhone, index2);
    }
    if (application.normalizedEmail) {
      const existing = emailMap.get(application.normalizedEmail);
      if (existing !== void 0) union(existing, index2);
      else emailMap.set(application.normalizedEmail, index2);
    }
    if (!application.normalizedPhone && !application.normalizedEmail && application.duplicateMatchName) {
      const existing = nameMap.get(application.duplicateMatchName);
      if (existing !== void 0) union(existing, index2);
      else nameMap.set(application.duplicateMatchName, index2);
    }
  });
  const groups = /* @__PURE__ */ new Map();
  applications.forEach((application, index2) => {
    const root = find(index2);
    const group = groups.get(root) || [];
    group.push(application);
    groups.set(root, group);
  });
  return Array.from(groups.values());
}
function buildDashboardApplications(applications) {
  const normalizedApplications = applications.map(normalizeDashboardApplication);
  const groups = groupApplicationsByDuplicateSignals(normalizedApplications);
  return groups.map((group) => {
    const primary = choosePrimaryApplicationForGroup(group);
    const relatedApplications = group.filter((application) => application.id !== primary.id).sort((left, right) => right.createdAtMs - left.createdAtMs).map((application) => ({
      id: application.id,
      fullName: application.fullName,
      email: application.email,
      phone: application.phone,
      status: application.status,
      statusLabel: application.statusLabel,
      createdAt: application.createdAt,
      applicationSource: application.applicationSource
    }));
    return {
      ...primary,
      duplicateCount: group.length - 1,
      relatedApplications,
      mergedApplicationIds: group.map((application) => application.id)
    };
  }).sort((left, right) => right.updatedAtMs - left.updatedAtMs);
}
function findDashboardApplicationGroup(applications, applicationId) {
  const groups = buildDashboardApplications(applications);
  return groups.find((application) => application.id === applicationId || application.mergedApplicationIds.includes(applicationId)) || null;
}
async function getWorkerApplicationAdminSelect() {
  const optionalMetadataSelect = await getWorkerApplicationOptionalMetadataSelect();
  return {
    id: workerApplications.id,
    fullName: workerApplications.fullName,
    phone: workerApplications.phone,
    email: workerApplications.email,
    address: workerApplications.address,
    city: workerApplications.city,
    province: workerApplications.province,
    postalCode: workerApplications.postalCode,
    dateOfBirth: workerApplications.dateOfBirth,
    workStatus: workerApplications.workStatus,
    backgroundCheckConsent: workerApplications.backgroundCheckConsent,
    preferredRoles: workerApplications.preferredRoles,
    otherRole: workerApplications.otherRole,
    availableDays: workerApplications.availableDays,
    preferredShifts: workerApplications.preferredShifts,
    unavailablePeriods: workerApplications.unavailablePeriods,
    yearsExperience: workerApplications.yearsExperience,
    experienceSummary: workerApplications.experienceSummary,
    skills: workerApplications.skills,
    desiredShiftLength: workerApplications.desiredShiftLength,
    emergencyContactName: workerApplications.emergencyContactName,
    emergencyContactRelationship: workerApplications.emergencyContactRelationship,
    emergencyContactPhone: workerApplications.emergencyContactPhone,
    paymentMethod: workerApplications.paymentMethod,
    bankName: workerApplications.bankName,
    bankInstitution: workerApplications.bankInstitution,
    bankTransit: workerApplications.bankTransit,
    bankAccount: workerApplications.bankAccount,
    etransferEmail: workerApplications.etransferEmail,
    titoAcknowledgment: workerApplications.titoAcknowledgment,
    siteRulesAcknowledgment: workerApplications.siteRulesAcknowledgment,
    workerAgreementConsent: workerApplications.workerAgreementConsent,
    privacyConsent: workerApplications.privacyConsent,
    ...optionalMetadataSelect,
    signature: workerApplications.signature,
    signatureDate: workerApplications.signatureDate,
    status: workerApplications.status,
    reviewedBy: workerApplications.reviewedBy,
    reviewedAt: workerApplications.reviewedAt,
    notes: workerApplications.notes,
    ip: workerApplications.ip,
    userAgent: workerApplications.userAgent,
    createdAt: workerApplications.createdAt,
    updatedAt: workerApplications.updatedAt
  };
}
async function ensureApprovedApplicationUserAccount(application) {
  if (!application.email) {
    return;
  }
  const normalizedEmail = application.email.toLowerCase();
  const [existingUser] = await db.select({ id: users.id }).from(users).where(eq4(users.email, normalizedEmail)).limit(1);
  if (existingUser) {
    const updateData = {
      onboardingStatus: "AGREEMENT_PENDING",
      updatedAt: /* @__PURE__ */ new Date()
    };
    if (application.phone) {
      updateData.phone = application.phone;
    }
    await db.update(users).set(updateData).where(eq4(users.id, existingUser.id));
    console.log(`[APPROVAL] Updated existing user ${application.email} to AGREEMENT_PENDING`);
    return;
  }
  if (application.phone) {
    const [phoneDuplicate] = await db.select({ id: users.id }).from(users).where(eq4(users.phone, application.phone)).limit(1);
    if (phoneDuplicate) {
      throw new Error(`A worker with phone ${application.phone} already exists.`);
    }
  }
  const fullNameToUse = application.fullName || "Worker";
  const [fullNameDuplicate] = await db.select({ id: users.id }).from(users).where(eq4(users.fullName, fullNameToUse)).limit(1);
  if (fullNameDuplicate) {
    throw new Error(`A worker named "${fullNameToUse}" already exists.`);
  }
  const firstName = fullNameToUse.split(" ")[0].toLowerCase().replace(/[^a-z]/g, "");
  const phoneLast4 = (application.phone || "0000").replace(/\D/g, "").slice(-4);
  const tempPassword = `${firstName}${phoneLast4}`;
  const hashedPassword = await bcrypt.hash(tempPassword, 10);
  await db.insert(users).values({
    id: crypto2.randomUUID(),
    email: normalizedEmail,
    password: hashedPassword,
    fullName: fullNameToUse,
    role: "worker",
    phone: application.phone || void 0,
    isActive: true,
    onboardingStatus: "AGREEMENT_PENDING",
    workerRoles: application.preferredRoles || void 0,
    mustChangePassword: true,
    timezone: "America/Toronto"
  });
  console.log(`[APPROVAL] Created user account for ${application.email}`);
  if (application.phone) {
    try {
      const smsMessage = `Welcome to WFConnect! Your application has been approved. Download the app and log in with:
Email: ${application.email}
Password: ${tempPassword}
Please change your password after first login.`;
      await sendSMS(application.phone, smsMessage);
      console.log(`[APPROVAL] Welcome SMS sent to ${application.phone}`);
    } catch (smsError) {
      console.error("[APPROVAL] Failed to send welcome SMS:", smsError);
    }
  }
}
function resolvePdfDisposition(value) {
  if (typeof value === "string" && value.trim().toLowerCase() === "inline") {
    return "inline";
  }
  return "attachment";
}
async function updateAgreementPdfTimestampFailSoft(applicationId, field) {
  try {
    await db.update(workerApplications).set({ [field]: /* @__PURE__ */ new Date(), updatedAt: /* @__PURE__ */ new Date() }).where(eq4(workerApplications.id, applicationId));
  } catch (timestampError) {
    console.warn(`[AGREEMENT_PDF] Timestamp update failed for ${applicationId} (${field}); continuing with PDF stream`, timestampError);
  }
}
var paymentProfileFallbackWarnings = /* @__PURE__ */ new Set();
var legacyAcknowledgmentFallbackWarnings = /* @__PURE__ */ new Set();
function warnOnce(cache, key, message) {
  if (cache.has(key)) return;
  cache.add(key);
  console.warn(message);
}
function hasTextValue(value) {
  return typeof value === "string" && value.trim().length > 0;
}
function mergeTextFieldIfMissing(target, field, value) {
  const current = target[field];
  if (hasTextValue(current)) return;
  if (hasTextValue(value)) {
    target[field] = String(value).trim();
  }
}
async function hydrateAgreementPdfApplication(applicationInput, options) {
  const hydrated = { ...applicationInput };
  if (arePaymentFieldsMissing(hydrated)) {
    let workerUserId = options?.workerUserId || null;
    if (!workerUserId && hasTextValue(hydrated.email)) {
      const normalizedEmail = String(hydrated.email).trim().toLowerCase();
      const [user] = await db.select({ id: users.id }).from(users).where(sql3`lower(${users.email}) = ${normalizedEmail}`).limit(1);
      workerUserId = user?.id || null;
    }
    if (workerUserId) {
      const [paymentProfile] = await db.select({
        paymentMethod: paymentProfiles.paymentMethod,
        bankName: paymentProfiles.bankName,
        bankInstitution: paymentProfiles.bankInstitution,
        bankTransit: paymentProfiles.bankTransit,
        bankAccount: paymentProfiles.bankAccount,
        etransferEmail: paymentProfiles.etransferEmail
      }).from(paymentProfiles).where(eq4(paymentProfiles.workerUserId, workerUserId)).limit(1);
      if (paymentProfile) {
        mergeTextFieldIfMissing(hydrated, "paymentMethod", paymentProfile.paymentMethod);
        mergeTextFieldIfMissing(hydrated, "bankName", paymentProfile.bankName);
        mergeTextFieldIfMissing(hydrated, "bankInstitution", paymentProfile.bankInstitution);
        mergeTextFieldIfMissing(hydrated, "bankTransit", paymentProfile.bankTransit);
        mergeTextFieldIfMissing(hydrated, "bankAccount", paymentProfile.bankAccount);
        mergeTextFieldIfMissing(hydrated, "etransferEmail", paymentProfile.etransferEmail);
        warnOnce(
          paymentProfileFallbackWarnings,
          `${String(hydrated.id || "unknown")}:payment-profile-fallback`,
          `[AGREEMENT_PDF] Applied payment profile fallback for record ${String(hydrated.id || "unknown")}`
        );
      }
    }
  }
  const acknowledgmentState = resolveAcknowledgmentFields(hydrated);
  const hasAnyRequiredAcknowledgment = acknowledgmentState.backgroundCheckConsent || acknowledgmentState.titoAcknowledgment || acknowledgmentState.siteRulesAcknowledgment || acknowledgmentState.workerAgreementConsent || acknowledgmentState.privacyConsent || acknowledgmentState.consentToContact || acknowledgmentState.nonSolicitationAcknowledged;
  const hasSignature = hasTextValue(hydrated.signature) && hasTextValue(hydrated.signatureDate);
  if (!hasAnyRequiredAcknowledgment && hasSignature) {
    hydrated.backgroundCheckConsent = true;
    hydrated.titoAcknowledgment = true;
    hydrated.siteRulesAcknowledgment = true;
    hydrated.workerAgreementConsent = true;
    hydrated.privacyConsent = true;
    hydrated.consentToContact = true;
    hydrated.nonSolicitationAcknowledged = true;
    warnOnce(
      legacyAcknowledgmentFallbackWarnings,
      `${String(hydrated.id || "unknown")}:legacy-ack-fallback`,
      `[AGREEMENT_PDF] Applied legacy acknowledgment fallback for signed record ${String(hydrated.id || "unknown")}`
    );
  }
  return hydrated;
}
function makeSubmissionFingerprint(parts) {
  const normalized = parts.map((part) => (part || "").trim().toLowerCase()).join("|");
  return crypto2.createHash("sha256").update(normalized).digest("hex");
}
function isRecentSubmissionFingerprint(fingerprint, now = Date.now()) {
  for (const [key, expiresAt] of recentSubmissionFingerprints.entries()) {
    if (expiresAt <= now) {
      recentSubmissionFingerprints.delete(key);
    }
  }
  const existing = recentSubmissionFingerprints.get(fingerprint);
  return !!(existing && existing > now);
}
function registerSubmissionFingerprint(fingerprint, now = Date.now()) {
  recentSubmissionFingerprints.set(fingerprint, now + RECENT_SUBMISSION_WINDOW_MS);
}
function getConfiguredApiKeys() {
  const keys = [];
  const singleKey = process.env.WFCONNECT_API_KEY?.trim();
  const keyList = process.env.WFCONNECT_API_KEYS;
  if (singleKey) {
    keys.push(singleKey);
  }
  if (keyList) {
    const parsed = keyList.split(",").map((k) => k.trim()).filter(Boolean);
    keys.push(...parsed);
  }
  return Array.from(new Set(keys));
}
function parsePreferredWorkerType(preferredRoles, workStatus) {
  if (preferredRoles) {
    try {
      const parsed = JSON.parse(preferredRoles);
      if (Array.isArray(parsed)) {
        const roles = parsed.filter((role) => typeof role === "string").join(", ");
        if (roles) return roles;
      } else if (typeof parsed === "string" && parsed.trim()) {
        return parsed.trim();
      }
    } catch {
      if (preferredRoles.trim()) return preferredRoles.trim();
    }
  }
  return workStatus?.trim() || null;
}
function hashApiKey(key) {
  return crypto2.createHash("sha256").update(key).digest("hex");
}
function generateApiKeyPrefix() {
  const timestamp2 = Date.now().toString(36);
  const random = crypto2.randomBytes(4).toString("hex");
  return `wfc_${timestamp2}_${random}`.substring(0, 32);
}
function ensureManagedKeyIntegrity(keys) {
  for (const key of keys) {
    const hasHash = typeof key.hash === "string" && key.hash.length > 0;
    if (!key.revokedAt && !hasHash) {
      throw new Error(`Managed key integrity check failed for active key ${key.id}`);
    }
  }
}
async function getManagedApiKeysRaw(options) {
  try {
    const config = await db.query.appConfig.findFirst({
      where: eq4(appConfig.key, "api_keys_managed")
    });
    if (!config || !config.value) return [];
    const parsed = JSON.parse(config.value);
    if (!Array.isArray(parsed)) {
      throw new Error("api_keys_managed is not an array");
    }
    const normalized = parsed.map((raw) => ({
      id: String(raw.id ?? ""),
      name: String(raw.name ?? ""),
      prefix: String(raw.prefix ?? ""),
      hash: typeof raw.hash === "string" ? raw.hash : "",
      scopes: Array.isArray(raw.scopes) ? raw.scopes.filter((s) => typeof s === "string") : [],
      createdAt: String(raw.createdAt ?? ""),
      createdBy: String(raw.createdBy ?? "admin"),
      lastUsedAt: raw.lastUsedAt ?? null,
      revokedAt: raw.revokedAt ?? null,
      revokedBy: raw.revokedBy ?? null
    }));
    ensureManagedKeyIntegrity(normalized);
    return normalized;
  } catch (error) {
    if (options?.suppressErrors) {
      return [];
    }
    throw error;
  }
}
async function getManagedApiKeys() {
  const raw = await getManagedApiKeysRaw();
  return raw.map(({ hash: _hash, ...rest }) => ({ ...rest, scopes: rest.scopes ?? [] }));
}
async function saveManagedApiKeys(keys) {
  ensureManagedKeyIntegrity(keys);
  const existing = await db.query.appConfig.findFirst({
    where: eq4(appConfig.key, "api_keys_managed")
  });
  if (existing) {
    await db.update(appConfig).set({ value: JSON.stringify(keys) }).where(eq4(appConfig.key, "api_keys_managed"));
  } else {
    await db.insert(appConfig).values({
      key: "api_keys_managed",
      value: JSON.stringify(keys),
      description: "Managed API keys for Payroll sync"
    });
  }
}
async function updateManagedKeyLastUsed(keyId) {
  try {
    const keys = await getManagedApiKeysRaw({ suppressErrors: true });
    const idx = keys.findIndex((k) => k.id === keyId);
    if (idx === -1) return;
    keys[idx].lastUsedAt = (/* @__PURE__ */ new Date()).toISOString();
    await saveManagedApiKeys(keys);
  } catch {
  }
}
async function tryBearerApiKey(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return next();
  }
  const token = authHeader.slice("Bearer ".length).trim();
  if (!token) {
    res.status(401).json({ error: "Authentication required" });
    return;
  }
  const configuredKeys = getConfiguredApiKeys();
  if (configuredKeys.includes(token)) {
    req.apiKeyScopes = ["*"];
    return next();
  }
  try {
    const tokenHash = hashApiKey(token);
    const managedKeys = await getManagedApiKeysRaw();
    const matched = managedKeys.find((k) => k.hash === tokenHash && !k.revokedAt);
    if (!matched) {
      res.status(401).json({ error: "Invalid or revoked API key" });
      return;
    }
    req.apiKeyId = matched.id;
    req.apiKeyScopes = matched.scopes ?? [];
    updateManagedKeyLastUsed(matched.id).catch(() => {
    });
    return next();
  } catch (err) {
    console.error("[tryBearerApiKey] key-store error", err);
    res.status(500).json({ error: "API key store unavailable" });
  }
}
function checkApplicationsApiKey(req, res, next) {
  res.type("application/json");
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const apiKey = authHeader.slice("Bearer ".length).trim();
  const configuredKeys = getConfiguredApiKeys();
  if (!apiKey || configuredKeys.length === 0 || !configuredKeys.includes(apiKey)) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  next();
}
function parseBasicAuthCredentials(authHeader) {
  if (!authHeader || !authHeader.startsWith("Basic ")) {
    return null;
  }
  const base64Credentials = authHeader.split(" ")[1];
  if (!base64Credentials) {
    return null;
  }
  const credentials = Buffer.from(base64Credentials, "base64").toString("utf-8");
  const separatorIndex = credentials.indexOf(":");
  if (separatorIndex === -1) {
    return null;
  }
  return {
    username: credentials.slice(0, separatorIndex),
    password: credentials.slice(separatorIndex + 1)
  };
}
function getAdminPortalCandidateEmails(username) {
  const normalizedUsername = username.trim().toLowerCase();
  const candidates = /* @__PURE__ */ new Set();
  if (normalizedUsername.includes("@")) {
    candidates.add(normalizedUsername);
  }
  if (normalizedUsername === "wfconnect") {
    candidates.add("admin@wfconnect.org");
  }
  if (normalizedUsername === "admin" || normalizedUsername === "admin@wfconnecr.org") {
    candidates.add("admin@wfconnect.org");
  }
  return Array.from(candidates);
}
async function validateAdminPortalBasicAuth(req) {
  const credentials = parseBasicAuthCredentials(req.headers.authorization);
  if (!credentials) {
    return {
      ok: false,
      mode: "missing",
      normalizedUsername: null,
      userFound: false,
      passwordMatched: false
    };
  }
  const normalizedUsername = credentials.username.trim().toLowerCase();
  if (normalizedUsername === "wfconnect" && (credentials.password === "@2255Dundaswest" || credentials.password === "@2255DundasWest")) {
    return {
      ok: true,
      mode: "legacy-basic",
      normalizedUsername,
      userFound: false,
      passwordMatched: true
    };
  }
  if ((normalizedUsername === "admin" || normalizedUsername === "admin@wfconnect.org" || normalizedUsername === "admin@wfconnecr.org") && credentials.password === "@1900Dundas") {
    return {
      ok: true,
      mode: "legacy-basic",
      normalizedUsername,
      userFound: false,
      passwordMatched: true
    };
  }
  const candidateEmails = getAdminPortalCandidateEmails(credentials.username);
  if (candidateEmails.length === 0) {
    return {
      ok: false,
      mode: "invalid",
      normalizedUsername,
      userFound: false,
      passwordMatched: false
    };
  }
  const candidateUsers = await db.select({
    id: users.id,
    email: users.email,
    role: users.role,
    password: users.password,
    isActive: users.isActive
  }).from(users).where(
    and3(
      inArray(users.email, candidateEmails),
      inArray(users.role, ["admin", "hr"]),
      eq4(users.isActive, true)
    )
  );
  const user = candidateUsers[0];
  if (!user || !user.password) {
    return {
      ok: false,
      mode: "invalid",
      normalizedUsername,
      userFound: false,
      passwordMatched: false
    };
  }
  const passwordMatched = await bcrypt.compare(credentials.password, user.password);
  if (!passwordMatched) {
    return {
      ok: false,
      mode: "invalid",
      normalizedUsername,
      userFound: true,
      passwordMatched: false,
      user: {
        id: user.id,
        email: user.email,
        role: user.role
      }
    };
  }
  return {
    ok: true,
    mode: "db-basic",
    normalizedUsername,
    userFound: true,
    passwordMatched: true,
    user: {
      id: user.id,
      email: user.email,
      role: user.role
    }
  };
}
async function checkBasicAuthAdmin(req, res) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Basic ")) {
    res.status(401).json({ error: "Authentication required" });
    return false;
  }
  const authResult = await validateAdminPortalBasicAuth(req);
  console.info(
    `[ADMIN_AUTH] username="${authResult.normalizedUsername || "missing"}" mode=${authResult.mode} userFound=${authResult.userFound} passwordMatched=${authResult.passwordMatched}`
  );
  if (!authResult.ok) {
    res.status(401).json({ error: "Invalid credentials" });
    return false;
  }
  if (authResult.user) {
    req.headers["x-user-id"] = authResult.user.id;
    req.headers["x-user-role"] = authResult.user.role;
  }
  return true;
}
async function hasAdminAgreementAccess(req, res) {
  const role = req.headers["x-user-role"];
  if (role === "admin") {
    return true;
  }
  return checkBasicAuthAdmin(req, res);
}
async function getWorkerApplicationForUser(userId) {
  const [user] = await db.select({ id: users.id, email: users.email, onboardingStatus: users.onboardingStatus, role: users.role }).from(users).where(eq4(users.id, userId)).limit(1);
  if (!user) {
    return { user: null, application: null };
  }
  const workerApplicationAgreementSelect = await getWorkerApplicationAgreementSelect();
  const [application] = await db.select(workerApplicationAgreementSelect).from(workerApplications).where(sql3`lower(${workerApplications.email}) = ${user.email.toLowerCase()}`).orderBy(desc2(workerApplications.createdAt)).limit(1);
  return { user, application: application || null };
}
async function registerRoutes(app2) {
  app2.get("/api/health", (_req, res) => {
    res.json({
      status: "ok",
      version: "1.0.5",
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
        }).from(users).where(eq4(users.role, "worker"));
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
        const existing = await db.select().from(conversations2).where(eq4(conversations2.workerUserId, workerUserId)).limit(1);
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
          }).from(conversations2).leftJoin(users, eq4(conversations2.workerUserId, users.id)).where(eq4(conversations2.isArchived, false)).orderBy(desc2(conversations2.lastMessageAt));
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
          }).from(conversations2).leftJoin(users, eq4(conversations2.hrUserId, users.id)).where(and3(
            eq4(conversations2.workerUserId, userId),
            eq4(conversations2.isArchived, false)
          )).orderBy(desc2(conversations2.lastMessageAt));
          convos = workerConvos;
        } else {
          res.status(403).json({ error: "Access denied" });
          return;
        }
        const convosWithUnread = await Promise.all(convos.map(async (c) => {
          const unreadResult = await db.select({ count: sql3`count(*)` }).from(messages2).where(and3(
            eq4(messages2.conversationId, c.id),
            eq4(messages2.recipientUserId, userId),
            isNull2(messages2.readAt)
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
        const [convo] = await db.select().from(conversations2).where(eq4(conversations2.id, conversationId));
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
        }).from(messages2).leftJoin(users, eq4(messages2.senderUserId, users.id)).where(and3(
          eq4(messages2.conversationId, conversationId),
          isNull2(messages2.deletedAt)
        )).orderBy(desc2(messages2.createdAt)).limit(limit).offset(offset);
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
        const [convo] = await db.select().from(conversations2).where(eq4(conversations2.id, conversationId));
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
            const [hrUser] = await db.select({ id: users.id }).from(users).where(or(eq4(users.role, "hr"), eq4(users.role, "admin"))).limit(1);
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
        }).where(eq4(conversations2.id, conversationId));
        const [sender] = await db.select({ fullName: users.fullName }).from(users).where(eq4(users.id, userId));
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
        const unreadMessages = await db.select({ id: messages2.id }).from(messages2).where(and3(
          eq4(messages2.conversationId, conversationId),
          eq4(messages2.recipientUserId, userId),
          isNull2(messages2.readAt)
        ));
        const now = /* @__PURE__ */ new Date();
        await db.update(messages2).set({ readAt: now, status: "read" }).where(and3(
          eq4(messages2.conversationId, conversationId),
          eq4(messages2.recipientUserId, userId),
          isNull2(messages2.readAt)
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
      const { email, password, fullName } = result.data;
      const existingUser = await db.select().from(users).where(eq4(users.email, email.toLowerCase()));
      if (existingUser.length > 0) {
        res.status(400).json({ error: "Email already registered" });
        return;
      }
      const hashedPassword = await bcrypt.hash(password, 10);
      const { role, businessName } = req.body;
      const allowedRole = role === "client" ? "client" : "worker";
      const [newUser] = await db.insert(users).values({
        email: email.toLowerCase(),
        password: hashedPassword,
        fullName,
        role: allowedRole,
        isActive: false,
        businessName: allowedRole === "client" ? businessName?.trim() || null : null,
        onboardingStatus: allowedRole === "worker" ? "NOT_APPLIED" : null
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
      const existing = await db.select().from(pushTokens).where(eq4(pushTokens.token, token)).limit(1);
      if (existing.length > 0) {
        await db.update(pushTokens).set({ userId, platform: platform || "unknown", isActive: true, updatedAt: /* @__PURE__ */ new Date() }).where(eq4(pushTokens.token, token));
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
      await db.update(pushTokens).set({ isActive: false, updatedAt: /* @__PURE__ */ new Date() }).where(eq4(pushTokens.token, token));
      res.json({ success: true });
    } catch (error) {
      console.error("Error deactivating push token:", error);
      res.status(500).json({ error: "Failed to deactivate push token" });
    }
  });
  app2.post("/api/auth/google", async (req, res) => {
    try {
      const { idToken } = req.body;
      if (!idToken) {
        res.status(400).json({ error: "ID token required" });
        return;
      }
      const tokenInfoUrl = `https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(idToken)}`;
      const tokenRes = await fetch(tokenInfoUrl);
      const tokenData = await tokenRes.json();
      if (!tokenRes.ok || tokenData.error) {
        res.status(401).json({ error: "Invalid Google token" });
        return;
      }
      const { sub: googleId, email, name } = tokenData;
      if (!email) {
        res.status(401).json({ error: "Could not retrieve email from Google account" });
        return;
      }
      let [user] = await db.select().from(users).where(eq4(users.googleId, googleId));
      if (!user) {
        const [byEmail] = await db.select().from(users).where(eq4(users.email, email.toLowerCase()));
        user = byEmail;
      }
      if (!user) {
        const fullName = name || email.split("@")[0];
        await db.insert(users).values({
          email: email.toLowerCase(),
          fullName,
          role: "worker",
          isActive: false,
          googleId,
          onboardingStatus: "NOT_APPLIED"
        }).returning();
        res.json({ registered: true, message: "Your account has been created and is pending admin approval. You will be notified when your account is activated." });
        return;
      }
      if (!user.isActive) {
        res.json({ pending: true, message: "Your account is pending admin approval. An admin will review and activate your account. You will be notified once access is granted." });
        return;
      }
      if (!user.googleId) {
        await db.update(users).set({ googleId }).where(eq4(users.id, user.id));
      }
      if (user.totpEnabled) {
        res.json({ requires2FA: true, userId: user.id });
        return;
      }
      const { password: _, totpSecret: __, recoveryCodes: ___, ...userWithoutSensitive } = user;
      setSessionCookie(res, user.id, user.role);
      res.json({ user: { ...userWithoutSensitive, mustChangePassword: user.mustChangePassword || false } });
    } catch (error) {
      console.error("Error with Google auth:", error);
      res.status(500).json({ error: "Failed to authenticate with Google" });
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
      console.info(`[AUTH_LOGIN] submittedIdentifier="${email.toLowerCase()}"`);
      const [user] = await db.select().from(users).where(eq4(users.email, email.toLowerCase()));
      console.info(`[AUTH_LOGIN] submittedIdentifier="${email.toLowerCase()}" userFound=${Boolean(user)}`);
      if (!user) {
        res.status(401).json({ error: "Invalid email or password" });
        return;
      }
      const validPassword = await bcrypt.compare(password, user.password);
      console.info(`[AUTH_LOGIN] submittedIdentifier="${email.toLowerCase()}" passwordMatched=${validPassword}`);
      if (!validPassword) {
        res.status(401).json({ error: "Invalid email or password" });
        return;
      }
      if (!user.isActive) {
        res.json({ pending: true, message: "Your account is pending admin approval. An admin will review and activate your account shortly." });
        return;
      }
      if (user.totpEnabled) {
        res.json({ requires2FA: true, userId: user.id });
        return;
      }
      const { password: _, totpSecret: __, recoveryCodes: ___, ...userWithoutSensitive } = user;
      setSessionCookie(res, user.id, user.role);
      console.info(`[AUTH_LOGIN] submittedIdentifier="${email.toLowerCase()}" sessionCreated=true userId=${user.id} role=${user.role}`);
      res.json({ user: { ...userWithoutSensitive, mustChangePassword: user.mustChangePassword || false } });
    } catch (error) {
      console.error("Error logging in:", error);
      res.status(500).json({ error: "Failed to login" });
    }
  });
  app2.get("/api/auth/me", async (req, res) => {
    try {
      const session = parseSessionCookie(req);
      if (!session) {
        res.status(401).json({ error: "Not authenticated" });
        return;
      }
      const [user] = await db.select({
        id: users.id,
        email: users.email,
        fullName: users.fullName,
        role: users.role,
        isActive: users.isActive
      }).from(users).where(eq4(users.id, session.userId));
      if (!user || !user.isActive) {
        clearSessionCookie(res);
        res.status(401).json({ error: "Invalid or inactive user" });
        return;
      }
      if (user.role !== session.role) {
        clearSessionCookie(res);
        res.status(401).json({ error: "Session invalid" });
        return;
      }
      res.json({ user });
    } catch (error) {
      res.status(500).json({ error: "Failed to verify session" });
    }
  });
  app2.post("/api/auth/logout", (_req, res) => {
    clearSessionCookie(res);
    res.json({ success: true });
  });
  app2.get("/api/auth/verify", async (req, res) => {
    try {
      const userId = req.headers["x-user-id"];
      const userRole = req.headers["x-user-role"];
      if (!userId || !userRole) {
        res.status(401).json({ error: "Not authenticated" });
        return;
      }
      const [user] = await db.select({
        id: users.id,
        email: users.email,
        fullName: users.fullName,
        role: users.role,
        isActive: users.isActive
      }).from(users).where(eq4(users.id, userId));
      if (!user || !user.isActive) {
        res.status(401).json({ error: "Invalid or inactive user" });
        return;
      }
      if (user.role !== userRole) {
        res.status(401).json({ error: "Role mismatch" });
        return;
      }
      res.json({ user });
    } catch (error) {
      res.status(500).json({ error: "Verification failed" });
    }
  });
  app2.post("/api/auth/change-password", async (req, res) => {
    try {
      const userId = req.headers["x-user-id"];
      if (!userId) {
        res.status(401).json({ error: "Authentication required" });
        return;
      }
      const { currentPassword, newPassword } = req.body;
      if (!currentPassword || !newPassword) {
        res.status(400).json({ error: "Current password and new password are required" });
        return;
      }
      if (newPassword.length < 8) {
        res.status(400).json({ error: "New password must be at least 8 characters" });
        return;
      }
      const [user] = await db.select().from(users).where(eq4(users.id, userId)).limit(1);
      if (!user) {
        res.status(404).json({ error: "User not found" });
        return;
      }
      const validPassword = await bcrypt.compare(currentPassword, user.password);
      if (!validPassword) {
        res.status(401).json({ error: "Current password is incorrect" });
        return;
      }
      const hashedPassword = await bcrypt.hash(newPassword, 10);
      await db.update(users).set({ password: hashedPassword, mustChangePassword: false, updatedAt: /* @__PURE__ */ new Date() }).where(eq4(users.id, userId));
      res.json({ success: true, message: "Password changed successfully" });
    } catch (error) {
      console.error("Error changing password:", error);
      res.status(500).json({ error: "Failed to change password" });
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
      const [user] = await db.select().from(users).where(eq4(users.id, userId));
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
      await db.update(users).set({ totpSecret: secret.base32, updatedAt: /* @__PURE__ */ new Date() }).where(eq4(users.id, userId));
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
      const [user] = await db.select().from(users).where(eq4(users.id, userId));
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
      }).where(eq4(users.id, userId));
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
      const [user] = await db.select().from(users).where(eq4(users.id, userId));
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
      }).where(eq4(users.id, userId));
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
      const [user] = await db.select().from(users).where(eq4(users.id, userId));
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
        setSessionCookie(res, user.id, user.role);
        res.json({ verified: true, user: userWithoutSensitive });
        return;
      }
      if (user.recoveryCodes) {
        const codes = JSON.parse(user.recoveryCodes);
        const codeIndex = codes.indexOf(code.toUpperCase());
        if (codeIndex !== -1) {
          codes.splice(codeIndex, 1);
          await db.update(users).set({ recoveryCodes: JSON.stringify(codes), updatedAt: /* @__PURE__ */ new Date() }).where(eq4(users.id, userId));
          const { password: _, totpSecret: __, recoveryCodes: ___, ...userWithoutSensitive } = user;
          setSessionCookie(res, user.id, user.role);
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
      const [user] = await db.select({ totpEnabled: users.totpEnabled }).from(users).where(eq4(users.id, userId));
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
  app2.get("/api/users/workers", checkRoles("admin", "hr"), async (_req, res) => {
    try {
      const workers = await db.select({
        id: users.id,
        fullName: users.fullName
      }).from(users).where(and3(eq4(users.role, "worker"), eq4(users.isActive, true))).orderBy(asc(users.fullName));
      res.json(workers);
    } catch (error) {
      console.error("Error fetching workers list:", error);
      res.status(500).json({ error: "Failed to fetch workers" });
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
        phone: users.phone,
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
      const { role, isActive, onboardingStatus, workerRoles, phone } = req.body;
      const updateData = { updatedAt: /* @__PURE__ */ new Date() };
      if (role !== void 0) updateData.role = role;
      if (isActive !== void 0) updateData.isActive = isActive;
      if (onboardingStatus !== void 0) updateData.onboardingStatus = onboardingStatus;
      if (workerRoles !== void 0) updateData.workerRoles = workerRoles;
      if (phone !== void 0) updateData.phone = phone;
      let existingUserBeforeUpdate = null;
      if (isActive === true) {
        const [fetched] = await db.select().from(users).where(eq4(users.id, id));
        existingUserBeforeUpdate = fetched || null;
        if (existingUserBeforeUpdate && existingUserBeforeUpdate.role === "worker" && onboardingStatus === void 0 && (existingUserBeforeUpdate.onboardingStatus === "APPLICATION_SUBMITTED" || existingUserBeforeUpdate.onboardingStatus === "NOT_APPLIED")) {
          updateData.onboardingStatus = "AGREEMENT_PENDING";
        }
      }
      const [updatedUser] = await db.update(users).set(updateData).where(eq4(users.id, id)).returning();
      if (!updatedUser) {
        res.status(404).json({ error: "User not found" });
        return;
      }
      if (isActive === true && existingUserBeforeUpdate?.isActive === false && updatedUser.email) {
        sendEmail({
          to: updatedUser.email,
          subject: "Your Workforce Connect account has been approved",
          text: `Hi ${updatedUser.fullName},

Great news! Your Workforce Connect account has been approved and is now active.

Sign in at: https://app.wfconnect.org

Welcome to the team!

The WFConnect Team`,
          html: `<p>Hi ${updatedUser.fullName},</p><p>Great news! Your <strong>Workforce Connect</strong> account has been approved and is now active.</p><p><a href="https://app.wfconnect.org" style="background:#2563EB;color:#fff;padding:10px 20px;border-radius:6px;text-decoration:none;display:inline-block;">Sign In Now</a></p><p>Welcome to the team!</p><p>The WFConnect Team</p>`
        }).catch((err) => console.error("[EMAIL] Approval email error:", err));
      }
      const { password: _, ...userWithoutPassword } = updatedUser;
      res.json(userWithoutPassword);
      broadcast({ type: "updated", entity: "user", id: req.params.id });
    } catch (error) {
      console.error("Error updating user:", error);
      res.status(500).json({ error: "Failed to update user" });
    }
  });
  app2.patch("/api/users/me/profile", async (req, res) => {
    try {
      const userId = req.headers["x-user-id"];
      const role = req.headers["x-user-role"];
      if (!userId || !role) {
        res.status(401).json({ error: "Authentication required" });
        return;
      }
      const { fullName, email, phone, timezone, businessName, businessAddress, businessPhone } = req.body;
      const updateData = { updatedAt: /* @__PURE__ */ new Date() };
      if (fullName !== void 0 && typeof fullName === "string" && fullName.trim().length >= 2) {
        updateData.fullName = fullName.trim();
      }
      if (phone !== void 0) {
        updateData.phone = phone ? phone.trim() : null;
      }
      if (timezone !== void 0 && typeof timezone === "string" && timezone.trim().length > 0) {
        updateData.timezone = timezone.trim();
      }
      if (email !== void 0 && typeof email === "string") {
        const trimmedEmail = email.trim().toLowerCase();
        if (trimmedEmail.length === 0 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
          res.status(400).json({ error: "Invalid email address" });
          return;
        }
        const [existingUser] = await db.select({ id: users.id }).from(users).where(and3(eq4(users.email, trimmedEmail), ne2(users.id, userId))).limit(1);
        if (existingUser) {
          res.status(409).json({ error: "Email is already in use by another account" });
          return;
        }
        updateData.email = trimmedEmail;
      }
      if (role === "client") {
        if (businessName !== void 0) updateData.businessName = businessName ? businessName.trim() : null;
        if (businessAddress !== void 0) updateData.businessAddress = businessAddress ? businessAddress.trim() : null;
        if (businessPhone !== void 0) updateData.businessPhone = businessPhone ? businessPhone.trim() : null;
      }
      const [updatedUser] = await db.update(users).set(updateData).where(eq4(users.id, userId)).returning();
      if (!updatedUser) {
        res.status(404).json({ error: "User not found" });
        return;
      }
      const { password: _, totpSecret: _ts, recoveryCodes: _rc, ...safeUser } = updatedUser;
      res.json(safeUser);
      broadcast({ type: "updated", entity: "user", id: userId });
    } catch (error) {
      console.error("Error updating profile:", error);
      res.status(500).json({ error: "Failed to update profile" });
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
      const [updatedUser] = await db.update(users).set({ onboardingStatus, updatedAt: /* @__PURE__ */ new Date() }).where(eq4(users.id, userId)).returning();
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
      const [existingUser] = await db.select().from(users).where(eq4(users.id, id)).limit(1);
      if (!existingUser) {
        console.log(`[DELETE USER] REJECTED: User ${id} not found`);
        res.status(404).json({ error: "User not found" });
        return;
      }
      console.log(`[DELETE USER] Deleting user: ${existingUser.email} (${existingUser.role})`);
      await db.execute(sql3`DELETE FROM message_logs WHERE message_id IN (SELECT id FROM messages WHERE sender_user_id = ${id} OR recipient_user_id = ${id})`);
      await db.execute(sql3`DELETE FROM message_logs WHERE actor_user_id = ${id}`);
      await db.execute(sql3`DELETE FROM messages WHERE sender_user_id = ${id} OR recipient_user_id = ${id}`);
      await db.execute(sql3`DELETE FROM conversations WHERE worker_user_id = ${id} OR hr_user_id = ${id}`);
      await db.execute(sql3`DELETE FROM push_tokens WHERE user_id = ${id}`);
      await db.execute(sql3`DELETE FROM app_notifications WHERE user_id = ${id}`);
      await db.execute(sql3`DELETE FROM sent_reminders WHERE worker_id = ${id}`);
      await db.execute(sql3`DELETE FROM shift_checkins WHERE worker_id = ${id}`);
      await db.execute(sql3`DELETE FROM shift_offers WHERE worker_id = ${id}`);
      await db.execute(sql3`DELETE FROM payroll_batch_items WHERE worker_user_id = ${id}`);
      await db.execute(sql3`DELETE FROM timesheet_entries WHERE timesheet_id IN (SELECT id FROM timesheets WHERE worker_user_id = ${id})`);
      await db.execute(sql3`UPDATE timesheets SET approved_by_user_id = NULL WHERE approved_by_user_id = ${id}`);
      await db.execute(sql3`UPDATE timesheets SET disputed_by_user_id = NULL WHERE disputed_by_user_id = ${id}`);
      await db.execute(sql3`DELETE FROM timesheets WHERE worker_user_id = ${id}`);
      await db.execute(sql3`DELETE FROM tito_logs WHERE worker_id = ${id}`);
      await db.execute(sql3`UPDATE workplace_assignments SET invited_by_user_id = NULL WHERE invited_by_user_id = ${id}`);
      await db.execute(sql3`DELETE FROM workplace_assignments WHERE worker_user_id = ${id}`);
      await db.execute(sql3`DELETE FROM payment_profiles WHERE worker_user_id = ${id}`);
      await db.execute(sql3`DELETE FROM export_audit_logs WHERE admin_user_id = ${id}`);
      await db.execute(sql3`UPDATE payroll_batches SET created_by_user_id = ${adminId} WHERE created_by_user_id = ${id}`);
      await db.execute(sql3`UPDATE payroll_batches SET finalized_by_user_id = NULL WHERE finalized_by_user_id = ${id}`);
      await db.execute(sql3`DELETE FROM recurrence_exceptions WHERE override_worker_user_id = ${id} OR cancelled_by_user_id = ${id}`);
      await db.execute(sql3`UPDATE shift_series SET worker_user_id = NULL WHERE worker_user_id = ${id}`);
      await db.execute(sql3`UPDATE shift_series SET created_by_user_id = NULL WHERE created_by_user_id = ${id}`);
      await db.execute(sql3`UPDATE shifts SET worker_user_id = NULL WHERE worker_user_id = ${id}`);
      await db.execute(sql3`UPDATE shifts SET created_by_user_id = NULL WHERE created_by_user_id = ${id}`);
      await db.execute(sql3`UPDATE shift_requests SET requested_worker_id = NULL WHERE requested_worker_id = ${id}`);
      await db.execute(sql3`DELETE FROM shift_requests WHERE client_id = ${id}`);
      await db.execute(sql3`DELETE FROM user_photos WHERE user_id = ${id} OR reviewer_id = ${id}`);
      await db.execute(sql3`DELETE FROM audit_log WHERE user_id = ${id}`);
      await db.execute(sql3`DELETE FROM worker_applications WHERE email = ${existingUser.email}`);
      await db.execute(sql3`DELETE FROM users WHERE id = ${id}`);
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
      const existingUser = await db.select().from(users).where(eq4(users.email, email.toLowerCase())).limit(1);
      if (existingUser.length > 0) {
        res.status(409).json({ error: "A user with this email already exists" });
        return;
      }
      const phone = req.body.phone;
      if (phone) {
        const [phoneDup] = await db.select({ id: users.id }).from(users).where(eq4(users.phone, phone)).limit(1);
        if (phoneDup) {
          res.status(409).json({ error: `A worker with phone ${phone} already exists.` });
          return;
        }
      }
      if (role === "worker") {
        const [nameDup] = await db.select({ id: users.id }).from(users).where(eq4(users.fullName, fullName.trim())).limit(1);
        if (nameDup) {
          res.status(409).json({ error: `A worker named "${fullName}" already exists.` });
          return;
        }
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
      if (newUser.email) {
        sendEmail({
          to: newUser.email,
          subject: "Welcome to Workforce Connect",
          text: `Hi ${newUser.fullName},

An admin has created a Workforce Connect account for you as a ${role}.

Sign in at: https://app.wfconnect.org

Please use the password provided to you by your admin. You can change it after logging in.

The WFConnect Team`,
          html: `<p>Hi ${newUser.fullName},</p><p>An admin has created a <strong>Workforce Connect</strong> account for you as a <strong>${role}</strong>.</p><p><a href="https://app.wfconnect.org" style="background:#2563EB;color:#fff;padding:10px 20px;border-radius:6px;text-decoration:none;display:inline-block;">Sign In Now</a></p><p>Please use the password provided to you by your admin. You can change it after logging in.</p><p>The WFConnect Team</p>`
        }).catch((err) => console.error("[EMAIL] Welcome email error:", err));
      }
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
      const { name, email, company, phone, cityProvince, serviceNeeded, message, smsConsent } = req.body;
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
      if (!isConsentGranted(smsConsent)) {
        res.status(400).json({ ok: false, error: "SMS consent is required to submit this form" });
        return;
      }
      const userAgent = req.headers["user-agent"] || null;
      const submittedAt = /* @__PURE__ */ new Date();
      await db.insert(contactLeads).values({
        name: name.trim(),
        email: email.trim().toLowerCase(),
        company: company?.trim() || null,
        phone: phone?.trim() || null,
        cityProvince: cityProvince?.trim() || null,
        serviceNeeded: serviceNeeded?.trim() || null,
        message: message.trim(),
        smsConsent: true,
        smsConsentAt: submittedAt,
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
  app2.get("/api/public/positions", async (_req, res) => {
    try {
      const crmClient = await Promise.resolve().then(() => (init_weekdays_crm(), weekdays_crm_exports));
      if (crmClient.isConfigured()) {
        const workplaces2 = await crmClient.getWorkplaces();
        const positionSet = /* @__PURE__ */ new Set();
        for (const wp of workplaces2) {
          if (wp.jobPosition) positionSet.add(wp.jobPosition);
          if (wp.positions) {
            for (const p of wp.positions) {
              if (p.title) positionSet.add(p.title);
            }
          }
        }
        if (positionSet.size > 0) {
          const positions = Array.from(positionSet).sort((a, b) => a.localeCompare(b));
          res.json({ positions });
          return;
        }
      }
      res.json({ positions: ["Housekeeper", "Houseperson", "Server", "Event Staff", "Concierge", "Receptionist", "Hotel Staff", "Supervisor", "Other"] });
    } catch (error) {
      console.error("Error fetching positions:", error);
      res.json({ positions: ["Housekeeper", "Houseperson", "Server", "Event Staff", "Concierge", "Receptionist", "Hotel Staff", "Supervisor", "Other"] });
    }
  });
  app2.post("/api/public/apply", async (req, res) => {
    try {
      const parsedPayload = publicApplySubmissionSchema.safeParse(req.body ?? {});
      if (!parsedPayload.success) {
        const validationIssues = formatValidationIssues(parsedPayload.error.issues);
        console.error(
          "[APPLY] Payload validation failed \u2014 missing/invalid fields:",
          validationIssues.map((i) => `${i.path || "(root)"}: ${i.message}`).join("; ")
        );
        res.status(400).json({
          error: "Invalid submission payload",
          issues: validationIssues
        });
        return;
      }
      const payload = parsedPayload.data;
      const ip = getClientIp(req);
      if (!checkRateLimit(ip)) {
        res.status(429).json({ error: "Too many requests. Please try again later." });
        return;
      }
      const recentApplyFingerprint = makeSubmissionFingerprint([
        ip,
        payload.email,
        payload.phone,
        payload.signature
      ]);
      if (isRecentSubmissionFingerprint(recentApplyFingerprint)) {
        res.status(409).json({
          error: "A similar application was submitted very recently. Please wait a moment before retrying."
        });
        return;
      }
      const userAgent = req.headers["user-agent"] || null;
      const resolvedIdentity = resolveWorkerIdentity({
        fullName: payload.fullName ?? payload.full_name,
        firstName: payload.firstName ?? payload.first_name,
        lastName: payload.lastName ?? payload.last_name,
        email: payload.email,
        phone: payload.phone
      });
      if (!resolvedIdentity.fullName) {
        res.status(400).json({ error: "Worker name is required" });
        return;
      }
      const missingConsents = getMissingRequiredConsents(payload);
      if (missingConsents.length > 0) {
        res.status(400).json({
          error: "Required consents were not provided",
          missingConsents
        });
        return;
      }
      const promotionalConsent = isConsentGranted(payload.promotionalConsent) || isConsentGranted(payload.marketingConsent);
      const resolvedAcknowledgments = resolveAcknowledgmentFields(payload);
      const resolvedPayment = resolvePaymentFields(payload);
      const nonSolicitationAcknowledged = resolvedAcknowledgments.nonSolicitationAcknowledged;
      const normalizedEmail = normalizeWhitespace(payload.email).toLowerCase();
      const normalizedPhone = normalizePhoneForComparison(payload.phone);
      const normalizedName = normalizeComparableText(resolvedIdentity.fullName);
      const dedupeWindowStart = new Date(Date.now() - 24 * 60 * 60 * 1e3);
      const recentApplications = await db.select({
        id: workerApplications.id,
        fullName: workerApplications.fullName,
        phone: workerApplications.phone,
        email: workerApplications.email,
        createdAt: workerApplications.createdAt
      }).from(workerApplications).where(gte2(workerApplications.createdAt, dedupeWindowStart)).orderBy(desc2(workerApplications.createdAt)).limit(250);
      const duplicateApplication = recentApplications.find((existingApplication) => {
        const existingEmail = normalizeComparableText(existingApplication.email || "");
        const existingPhone = normalizePhoneForComparison(existingApplication.phone || "");
        const existingName = normalizeComparableText(existingApplication.fullName || "");
        const isSameEmail = existingEmail.length > 0 && existingEmail === normalizedEmail;
        const isSamePhoneAndName = existingPhone.length > 0 && existingPhone === normalizedPhone && existingName.length > 0 && existingName === normalizedName;
        return isSameEmail || isSamePhoneAndName;
      });
      if (duplicateApplication) {
        res.status(409).json({
          error: "A similar application was already submitted recently",
          duplicateApplicationId: duplicateApplication.id,
          submittedAt: duplicateApplication.createdAt
        });
        return;
      }
      const applicationData = {
        fullName: resolvedIdentity.fullName,
        dateOfBirth: normalizeOptionalText(payload.dateOfBirth),
        phone: normalizeWhitespace(payload.phone),
        email: normalizedEmail,
        address: normalizeWhitespace(payload.address),
        city: normalizeWhitespace(payload.city),
        province: normalizeWhitespace(payload.province).toUpperCase(),
        postalCode: normalizeWhitespace(payload.postalCode).toUpperCase(),
        workStatus: payload.workStatus,
        backgroundCheckConsent: isConsentGranted(payload.backgroundCheckConsent),
        preferredRoles: normalizeJsonArrayField(payload.preferredRoles),
        otherRole: normalizeOptionalText(payload.otherRole),
        availableDays: normalizeJsonArrayField(payload.availableDays),
        preferredShifts: normalizeJsonArrayField(payload.preferredShifts),
        unavailablePeriods: normalizeOptionalText(payload.unavailablePeriods),
        yearsExperience: normalizeOptionalText(payload.yearsExperience),
        experienceSummary: normalizeOptionalText(payload.experienceSummary),
        skills: normalizeOptionalText(payload.skills),
        desiredShiftLength: normalizeOptionalText(payload.desiredShiftLength),
        maxTravelDistance: normalizeOptionalText(payload.maxTravelDistance),
        emergencyContactName: payload.emergencyContactName,
        emergencyContactRelationship: payload.emergencyContactRelationship,
        emergencyContactPhone: payload.emergencyContactPhone,
        paymentMethod: normalizeOptionalText(resolvedPayment.paymentMethod),
        bankName: normalizeOptionalText(resolvedPayment.bankName),
        bankInstitution: normalizeOptionalText(resolvedPayment.bankInstitution),
        bankTransit: normalizeOptionalText(resolvedPayment.bankTransit),
        bankAccount: normalizeOptionalText(resolvedPayment.bankAccount),
        etransferEmail: normalizeOptionalText(resolvedPayment.etransferEmail),
        titoAcknowledgment: resolvedAcknowledgments.titoAcknowledgment,
        siteRulesAcknowledgment: resolvedAcknowledgments.siteRulesAcknowledgment,
        workerAgreementConsent: resolvedAcknowledgments.workerAgreementConsent,
        consentToContact: resolvedAcknowledgments.consentToContact,
        privacyConsent: resolvedAcknowledgments.privacyConsent,
        smsConsent: resolvedAcknowledgments.smsConsent,
        smsConsentAt: resolvedAcknowledgments.smsConsent ? /* @__PURE__ */ new Date() : null,
        paymentTermsAcknowledged: resolvedAcknowledgments.paymentTermsAcknowledged,
        promotionalConsent,
        marketingConsent: promotionalConsent,
        signature: normalizeWhitespace(payload.signature),
        signatureDate: normalizeWhitespace(payload.signatureDate),
        agreementVersion: payload.agreementVersion || WORKFORCE_SUBCONTRACTOR_AGREEMENT_VERSION,
        nonSolicitationAcknowledged,
        nonSolicitationAcknowledgedAt: nonSolicitationAcknowledged ? new Date(payload.nonSolicitationAcknowledgedAt || Date.now()) : null,
        ip,
        userAgent
      };
      const [newApplication] = await db.insert(workerApplications).values(applicationData).returning();
      registerSubmissionFingerprint(recentApplyFingerprint);
      console.log(`Worker application submitted from: ${payload.email}`);
      res.json({ ok: true, id: newApplication.id });
    } catch (error) {
      console.error("Error saving worker application:", error);
      res.status(500).json({ error: "Failed to submit application. Please try again." });
    }
  });
  app2.patch("/api/agreements/me/non-solicitation", async (req, res) => {
    try {
      const userId = req.headers["x-user-id"];
      const role = req.headers["x-user-role"];
      if (!userId || role !== "worker") {
        res.status(401).json({ error: "Authenticated worker required" });
        return;
      }
      const { user, application } = await getWorkerApplicationForUser(userId);
      if (!user || !application) {
        res.status(404).json({ error: "Worker application not found" });
        return;
      }
      const acknowledgedAt = /* @__PURE__ */ new Date();
      const [updatedApplication] = await db.update(workerApplications).set({
        agreementVersion: WORKFORCE_SUBCONTRACTOR_AGREEMENT_VERSION,
        nonSolicitationAcknowledged: true,
        nonSolicitationAcknowledgedAt: acknowledgedAt,
        updatedAt: acknowledgedAt
      }).where(eq4(workerApplications.id, application.id)).returning();
      res.json({
        ok: true,
        id: updatedApplication.id,
        agreementVersion: updatedApplication.agreementVersion,
        nonSolicitationAcknowledged: updatedApplication.nonSolicitationAcknowledged,
        nonSolicitationAcknowledgedAt: updatedApplication.nonSolicitationAcknowledgedAt
      });
    } catch (error) {
      console.error("Error acknowledging non-solicitation clause:", error);
      res.status(500).json({ error: "Failed to save acknowledgment" });
    }
  });
  app2.get("/api/applications", checkApplicationsApiKey, async (req, res) => {
    try {
      const statusFilter = typeof req.query.status === "string" ? req.query.status.trim().toLowerCase() : "";
      if (statusFilter && !WORKER_APPLICATION_STATUSES.has(statusFilter)) {
        res.status(400).json({ error: "Invalid status filter" });
        return;
      }
      const applications = statusFilter ? await db.select().from(workerApplications).where(eq4(workerApplications.status, statusFilter)).orderBy(desc2(workerApplications.createdAt)) : await db.select().from(workerApplications).orderBy(desc2(workerApplications.createdAt));
      const mapped = applications.map(mapApplicationForSync);
      const data = mapped.filter((row) => row.identityResolved).map((row) => row.payload);
      const skippedMissingIdentity = mapped.length - data.length;
      res.type("application/json").json({
        data,
        skipped_missing_identity: skippedMissingIdentity
      });
    } catch (error) {
      console.error("Error fetching applications for API sync:", error);
      res.status(500).json({ error: "Failed to fetch applications" });
    }
  });
  app2.post("/api/sync/workers", checkApplicationsApiKey, async (req, res) => {
    try {
      const statusFilter = typeof req.body?.status === "string" ? req.body.status.trim().toLowerCase() : "approved";
      if (statusFilter && !WORKER_APPLICATION_STATUSES.has(statusFilter)) {
        res.status(400).json({ error: "Invalid status filter" });
        return;
      }
      const applications = await db.select().from(workerApplications).where(eq4(workerApplications.status, statusFilter)).orderBy(desc2(workerApplications.createdAt));
      const mapped = applications.map(mapApplicationForSync);
      const workers = mapped.filter((row) => row.identityResolved).map((row) => row.payload);
      const skippedMissingIdentity = mapped.length - workers.length;
      res.type("application/json").json({
        success: true,
        status: statusFilter,
        total: workers.length,
        skipped_missing_identity: skippedMissingIdentity,
        workers
      });
    } catch (error) {
      console.error("Error syncing workers for API integration:", error);
      res.status(500).json({ error: "Failed to sync workers" });
    }
  });
  app2.get("/api/sync/workers", checkApplicationsApiKey, async (req, res) => {
    try {
      const statusFilter = typeof req.query.status === "string" ? req.query.status.trim().toLowerCase() : "approved";
      if (statusFilter && !WORKER_APPLICATION_STATUSES.has(statusFilter)) {
        res.status(400).json({ error: "Invalid status filter" });
        return;
      }
      const applications = await db.select().from(workerApplications).where(eq4(workerApplications.status, statusFilter)).orderBy(desc2(workerApplications.createdAt));
      const mapped = applications.map(mapApplicationForSync);
      const workers = mapped.filter((row) => row.identityResolved).map((row) => row.payload);
      const skippedMissingIdentity = mapped.length - workers.length;
      res.type("application/json").json({
        success: true,
        status: statusFilter,
        total: workers.length,
        skipped_missing_identity: skippedMissingIdentity,
        workers
      });
    } catch (error) {
      console.error("Error fetching worker sync payload:", error);
      res.status(500).json({ error: "Failed to fetch worker sync payload" });
    }
  });
  app2.get("/api/admin/auth-check", tryBearerApiKey, async (req, res) => {
    try {
      const apiKeyScopes = req.apiKeyScopes;
      if (apiKeyScopes !== void 0) {
        if (!apiKeyScopes.includes("applications:read") && !apiKeyScopes.includes("*")) {
          res.status(403).json({
            error: "API key missing required scope: applications:read",
            required_scope: "applications:read",
            your_scopes: apiKeyScopes
          });
          return;
        }
        res.json({ ok: true, auth: "bearer" });
        return;
      }
      const authHeader = req.headers.authorization;
      if (authHeader && authHeader.startsWith("Basic ")) {
        if (!await checkBasicAuthAdmin(req, res)) return;
        res.json({ ok: true, auth: "basic" });
        return;
      }
      const session = parseSessionCookie(req);
      if (!session || !["admin", "hr"].includes(session.role)) {
        res.status(401).json({ error: "Authentication required" });
        return;
      }
      res.json({ ok: true, auth: "session", role: session.role });
    } catch (error) {
      console.error("Error validating admin auth:", error);
      res.status(500).json({ error: "Failed to validate authentication" });
    }
  });
  app2.get("/api/admin/applications", tryBearerApiKey, async (req, res) => {
    try {
      const apiKeyScopes = req.apiKeyScopes;
      if (apiKeyScopes !== void 0) {
        if (!apiKeyScopes.includes("applications:read") && !apiKeyScopes.includes("*")) {
          res.status(403).json({
            error: "API key missing required scope: applications:read",
            required_scope: "applications:read",
            your_scopes: apiKeyScopes
          });
          return;
        }
      } else {
        const authHeader = req.headers.authorization;
        if (authHeader && authHeader.startsWith("Basic ")) {
          if (!await checkBasicAuthAdmin(req, res)) return;
        } else {
          const session = parseSessionCookie(req);
          if (!session || !["admin", "hr"].includes(session.role)) {
            res.status(401).json({ error: "Authentication required" });
            return;
          }
        }
      }
      const workerApplicationAdminSelect = await getWorkerApplicationAdminSelect();
      const applications = await db.select(workerApplicationAdminSelect).from(workerApplications).orderBy(desc2(workerApplications.createdAt));
      const mappedApplications = applications.map((application) => {
        const identity = resolveWorkerIdentity({
          fullName: application.fullName,
          email: application.email,
          phone: application.phone
        });
        return {
          ...application,
          fullName: identity.fullName,
          full_name: identity.fullName,
          first_name: identity.firstName,
          last_name: identity.lastName
        };
      });
      res.json(buildDashboardApplications(mappedApplications));
    } catch (error) {
      console.error("Error fetching applications:", error);
      res.status(500).json({ error: "Failed to fetch applications" });
    }
  });
  app2.get("/api/admin/applications/api-keys", async (req, res) => {
    try {
      if (!await checkBasicAuthAdmin(req, res)) return;
      const keys = await getManagedApiKeys();
      const nonSensitive = keys.map((key) => ({
        id: key.id,
        name: key.name,
        prefix: key.prefix,
        scopes: key.scopes ?? [],
        createdAt: key.createdAt,
        createdBy: key.createdBy,
        lastUsedAt: key.lastUsedAt,
        revokedAt: key.revokedAt,
        revokedBy: key.revokedBy
      }));
      res.json({ data: nonSensitive });
    } catch (error) {
      console.error("Error fetching API keys:", error);
      res.status(500).json({ error: "Failed to fetch API keys" });
    }
  });
  app2.post("/api/admin/applications/api-keys", async (req, res) => {
    try {
      if (!await checkBasicAuthAdmin(req, res)) return;
      const { name, scopes } = req.body;
      if (!name || typeof name !== "string" || name.trim().length === 0) {
        res.status(400).json({ error: "Key name is required" });
        return;
      }
      const keyScopes = Array.isArray(scopes) ? scopes.filter((s) => typeof s === "string") : [];
      const keys = await getManagedApiKeysRaw();
      if (keys.some((k) => k.name === name.trim())) {
        res.status(409).json({ error: "Key name already exists" });
        return;
      }
      const keyId = crypto2.randomUUID();
      const plaintextKey = `${generateApiKeyPrefix()}_${crypto2.randomBytes(8).toString("hex")}`;
      const hashedKey = hashApiKey(plaintextKey);
      const now = (/* @__PURE__ */ new Date()).toISOString();
      const newKey = {
        id: keyId,
        name: name.trim(),
        prefix: plaintextKey.substring(0, 12),
        hash: hashedKey,
        scopes: keyScopes,
        createdAt: now,
        createdBy: "admin",
        lastUsedAt: null,
        revokedAt: null,
        revokedBy: null
      };
      keys.push(newKey);
      await saveManagedApiKeys(keys);
      res.status(201).json({
        id: keyId,
        name: newKey.name,
        prefix: newKey.prefix,
        scopes: newKey.scopes,
        plaintext: plaintextKey,
        createdAt: now,
        message: "Save this key securely. You won't be able to see it again."
      });
    } catch (error) {
      console.error("Error creating API key:", error);
      res.status(500).json({ error: "Failed to create API key" });
    }
  });
  app2.post("/api/admin/applications/api-keys/:id/rotate", async (req, res) => {
    try {
      if (!await checkBasicAuthAdmin(req, res)) return;
      const keyId = req.params.id;
      const keys = await getManagedApiKeysRaw();
      const keyIndex = keys.findIndex((k) => k.id === keyId);
      if (keyIndex === -1) {
        res.status(404).json({ error: "Key not found" });
        return;
      }
      const oldKey = keys[keyIndex];
      const now = (/* @__PURE__ */ new Date()).toISOString();
      oldKey.revokedAt = now;
      oldKey.revokedBy = "admin";
      const newKeyId = crypto2.randomUUID();
      const plaintextKey = `${generateApiKeyPrefix()}_${crypto2.randomBytes(8).toString("hex")}`;
      const hashedKey = hashApiKey(plaintextKey);
      const newKey = {
        id: newKeyId,
        name: oldKey.name,
        prefix: plaintextKey.substring(0, 12),
        hash: hashedKey,
        scopes: oldKey.scopes ?? [],
        createdAt: now,
        createdBy: "admin",
        lastUsedAt: null,
        revokedAt: null,
        revokedBy: null
      };
      keys[keyIndex] = oldKey;
      keys.push(newKey);
      await saveManagedApiKeys(keys);
      res.json({
        id: newKeyId,
        name: newKey.name,
        prefix: newKey.prefix,
        plaintext: plaintextKey,
        createdAt: now,
        message: "Key rotated successfully. Save the new key securely."
      });
    } catch (error) {
      console.error("Error rotating API key:", error);
      res.status(500).json({ error: "Failed to rotate API key" });
    }
  });
  app2.patch("/api/admin/applications/api-keys/:id/scopes", async (req, res) => {
    try {
      if (!await checkBasicAuthAdmin(req, res)) return;
      const keyId = req.params.id;
      const { scopes } = req.body;
      if (!Array.isArray(scopes) || scopes.some((s) => typeof s !== "string")) {
        res.status(400).json({ error: "scopes must be an array of strings" });
        return;
      }
      const keys = await getManagedApiKeysRaw();
      const keyIndex = keys.findIndex((k) => k.id === keyId);
      if (keyIndex === -1) {
        res.status(404).json({ error: "Key not found" });
        return;
      }
      if (keys[keyIndex].revokedAt) {
        res.status(409).json({ error: "Cannot update scopes on a revoked key" });
        return;
      }
      keys[keyIndex].scopes = scopes;
      await saveManagedApiKeys(keys);
      res.json({
        id: keyId,
        scopes: keys[keyIndex].scopes,
        message: "Scopes updated successfully"
      });
    } catch (error) {
      console.error("Error updating API key scopes:", error);
      res.status(500).json({ error: "Failed to update API key scopes" });
    }
  });
  app2.delete("/api/admin/applications/api-keys/:id", async (req, res) => {
    try {
      if (!await checkBasicAuthAdmin(req, res)) return;
      const keyId = req.params.id;
      const keys = await getManagedApiKeysRaw();
      const keyIndex = keys.findIndex((k) => k.id === keyId);
      if (keyIndex === -1) {
        res.status(404).json({ error: "Key not found" });
        return;
      }
      const now = (/* @__PURE__ */ new Date()).toISOString();
      keys[keyIndex].revokedAt = now;
      keys[keyIndex].revokedBy = "admin";
      await saveManagedApiKeys(keys);
      res.json({ success: true, message: "Key revoked successfully" });
    } catch (error) {
      console.error("Error revoking API key:", error);
      res.status(500).json({ error: "Failed to revoke API key" });
    }
  });
  app2.get("/api/admin/applications/:id", async (req, res) => {
    try {
      if (!await checkBasicAuthAdmin(req, res)) return;
      const workerApplicationAdminSelect = await getWorkerApplicationAdminSelect();
      const applications = await db.select(workerApplicationAdminSelect).from(workerApplications).orderBy(desc2(workerApplications.createdAt));
      const mappedApplications = applications.map((application2) => {
        const identity = resolveWorkerIdentity({
          fullName: application2.fullName,
          email: application2.email,
          phone: application2.phone
        });
        return {
          ...application2,
          fullName: identity.fullName,
          full_name: identity.fullName,
          first_name: identity.firstName,
          last_name: identity.lastName
        };
      });
      const application = findDashboardApplicationGroup(mappedApplications, req.params.id);
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
      if (!await checkBasicAuthAdmin(req, res)) return;
      const parsedPayload = adminApplicationUpdateSchema.safeParse(req.body ?? {});
      if (!parsedPayload.success) {
        res.status(400).json({
          error: "Invalid application update payload",
          issues: formatValidationIssues(parsedPayload.error.issues)
        });
        return;
      }
      const payload = parsedPayload.data;
      const requestedStatus = normalizeOptionalText(payload.status);
      const normalizedRequestedStatus = requestedStatus ? requestedStatus.toLowerCase() : null;
      if (normalizedRequestedStatus && !WORKER_APPLICATION_STATUSES.has(normalizedRequestedStatus)) {
        res.status(400).json({ error: "Invalid application status" });
        return;
      }
      const [existingApplication] = await db.select({
        id: workerApplications.id,
        status: workerApplications.status,
        email: workerApplications.email,
        phone: workerApplications.phone,
        fullName: workerApplications.fullName,
        preferredRoles: workerApplications.preferredRoles,
        paymentMethod: workerApplications.paymentMethod
      }).from(workerApplications).where(eq4(workerApplications.id, req.params.id)).limit(1);
      if (!existingApplication) {
        res.status(404).json({ error: "Application not found" });
        return;
      }
      const nextStatus = normalizedRequestedStatus ? normalizeWorkerApplicationStatus(normalizedRequestedStatus) : void 0;
      const previousStatus = normalizeWorkerApplicationStatus(existingApplication.status);
      const effectiveStatus = nextStatus || previousStatus;
      if (nextStatus === "approved" && previousStatus !== "approved") {
        const optionalMetadataSelect = await getWorkerApplicationOptionalMetadataSelect();
        const [approvalSource] = await db.select({
          id: workerApplications.id,
          backgroundCheckConsent: workerApplications.backgroundCheckConsent,
          titoAcknowledgment: workerApplications.titoAcknowledgment,
          siteRulesAcknowledgment: workerApplications.siteRulesAcknowledgment,
          workerAgreementConsent: workerApplications.workerAgreementConsent,
          privacyConsent: workerApplications.privacyConsent,
          consentToContact: optionalMetadataSelect.consentToContact,
          nonSolicitationAcknowledged: optionalMetadataSelect.nonSolicitationAcknowledged
        }).from(workerApplications).where(eq4(workerApplications.id, req.params.id)).limit(1);
        if (!approvalSource) {
          res.status(404).json({ error: "Application not found" });
          return;
        }
        const missingAcknowledgments = getMissingApprovalAcknowledgments(approvalSource);
        if (missingAcknowledgments.length > 0) {
          console.warn(`[APPROVAL] Blocked approval for ${approvalSource.id}: missing acknowledgments: ${missingAcknowledgments.join(", ")}`);
          res.status(409).json({
            code: "MISSING_REQUIRED_ACKNOWLEDGMENTS",
            error: "Cannot approve application until all required acknowledgments are accepted",
            missingAcknowledgments,
            requiredAcknowledgments: REQUIRED_APPROVAL_ACK_FIELDS.map(({ label }) => label),
            currentAcknowledgments: REQUIRED_APPROVAL_ACK_FIELDS.reduce((acc, { field, label }) => {
              acc[label] = approvalSource[field] === true;
              return acc;
            }, {}),
            legacyRecord: REQUIRED_APPROVAL_ACK_FIELDS.some(({ field }) => approvalSource[field] == null)
          });
          return;
        }
      }
      const updateData = {
        updatedAt: /* @__PURE__ */ new Date()
      };
      if (nextStatus) {
        updateData.status = nextStatus;
      }
      if (payload.notes !== void 0) {
        updateData.notes = normalizeOptionalText(payload.notes);
      }
      if (payload.assignedRecruiter !== void 0) {
        updateData.assignedRecruiter = normalizeOptionalText(payload.assignedRecruiter);
      }
      if (payload.recruiterNotes !== void 0) {
        updateData.recruiterNotes = normalizeOptionalText(payload.recruiterNotes);
      }
      if (payload.interviewStage !== void 0) {
        updateData.interviewStage = normalizeInterviewStage(payload.interviewStage, effectiveStatus);
      }
      if (payload.interviewNotes !== void 0) {
        updateData.interviewNotes = normalizeOptionalText(payload.interviewNotes);
      }
      if (payload.deploymentReadiness !== void 0) {
        updateData.deploymentReadiness = normalizeDeploymentReadiness(payload.deploymentReadiness, effectiveStatus);
      } else if (nextStatus === "ready_for_deployment" || nextStatus === "approved") {
        updateData.deploymentReadiness = normalizeDeploymentReadiness(void 0, effectiveStatus);
      }
      if (payload.payrollReadiness !== void 0) {
        updateData.payrollReadiness = normalizePayrollReadiness(payload.payrollReadiness, Boolean(existingApplication.paymentMethod), effectiveStatus);
      } else if (nextStatus === "approved") {
        updateData.payrollReadiness = normalizePayrollReadiness(void 0, Boolean(existingApplication.paymentMethod), effectiveStatus);
      }
      if (payload.missingDocuments !== void 0) {
        updateData.missingDocuments = serializeDocumentList(payload.missingDocuments);
      }
      if (payload.nextRecommendedAction !== void 0) {
        updateData.nextRecommendedAction = normalizeOptionalText(payload.nextRecommendedAction);
      }
      if (payload.applicationSource !== void 0) {
        updateData.applicationSource = normalizeApplicationSource(payload.applicationSource);
      }
      if (nextStatus && nextStatus !== previousStatus) {
        updateData.reviewedAt = /* @__PURE__ */ new Date();
      }
      if (nextStatus === "contacted") {
        updateData.lastContactedAt = /* @__PURE__ */ new Date();
      }
      const [updatedApplication] = await db.update(workerApplications).set(updateData).where(eq4(workerApplications.id, req.params.id)).returning();
      if (!updatedApplication) {
        res.status(404).json({ error: "Application not found" });
        return;
      }
      if (nextStatus === "approved" && previousStatus !== "approved" && updatedApplication.email) {
        try {
          await ensureApprovedApplicationUserAccount({
            email: updatedApplication.email,
            phone: updatedApplication.phone,
            fullName: updatedApplication.fullName,
            preferredRoles: updatedApplication.preferredRoles
          });
        } catch (linkError) {
          console.error("Failed to create/update user on approval:", linkError);
          res.status(409).json({ error: linkError instanceof Error ? linkError.message : "Failed to link approved worker account" });
          return;
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
      if (!await checkBasicAuthAdmin(req, res)) return;
      const [deletedApplication] = await db.delete(workerApplications).where(eq4(workerApplications.id, req.params.id)).returning();
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
  app2.post("/api/admin/applications/bulk", async (req, res) => {
    try {
      if (!await checkBasicAuthAdmin(req, res)) return;
      const parsedPayload = adminApplicationBulkActionSchema.safeParse(req.body ?? {});
      if (!parsedPayload.success) {
        res.status(400).json({
          error: "Invalid bulk action payload",
          issues: formatValidationIssues(parsedPayload.error.issues)
        });
        return;
      }
      const payload = parsedPayload.data;
      const uniqueIds = Array.from(new Set(payload.ids));
      const selectedApplications = await db.select({
        id: workerApplications.id,
        email: workerApplications.email,
        phone: workerApplications.phone,
        fullName: workerApplications.fullName,
        preferredRoles: workerApplications.preferredRoles,
        paymentMethod: workerApplications.paymentMethod,
        status: workerApplications.status
      }).from(workerApplications).where(inArray(workerApplications.id, uniqueIds));
      if (selectedApplications.length === 0) {
        res.status(404).json({ error: "No matching applications found" });
        return;
      }
      if (payload.action === "assign_recruiter") {
        const assignedRecruiter = normalizeOptionalText(payload.assignedRecruiter);
        if (!assignedRecruiter) {
          res.status(400).json({ error: "Assigned recruiter is required" });
          return;
        }
        await db.update(workerApplications).set({
          assignedRecruiter,
          recruiterNotes: normalizeOptionalText(payload.recruiterNotes),
          reviewedAt: /* @__PURE__ */ new Date(),
          updatedAt: /* @__PURE__ */ new Date()
        }).where(inArray(workerApplications.id, uniqueIds));
        res.json({ success: true, updated: selectedApplications.length, assignedRecruiter });
        return;
      }
      if (payload.action === "update_status") {
        const requestedStatus = normalizeOptionalText(payload.status);
        const normalizedRequestedStatus = requestedStatus ? requestedStatus.toLowerCase() : null;
        if (!normalizedRequestedStatus || !WORKER_APPLICATION_STATUSES.has(normalizedRequestedStatus)) {
          res.status(400).json({ error: "A valid target status is required" });
          return;
        }
        const nextStatus = normalizeWorkerApplicationStatus(normalizedRequestedStatus);
        if (nextStatus === "approved") {
          const optionalMetadataSelect = await getWorkerApplicationOptionalMetadataSelect();
          const approvalSources = await db.select({
            id: workerApplications.id,
            fullName: workerApplications.fullName,
            backgroundCheckConsent: workerApplications.backgroundCheckConsent,
            titoAcknowledgment: workerApplications.titoAcknowledgment,
            siteRulesAcknowledgment: workerApplications.siteRulesAcknowledgment,
            workerAgreementConsent: workerApplications.workerAgreementConsent,
            privacyConsent: workerApplications.privacyConsent,
            consentToContact: optionalMetadataSelect.consentToContact,
            nonSolicitationAcknowledged: optionalMetadataSelect.nonSolicitationAcknowledged
          }).from(workerApplications).where(inArray(workerApplications.id, uniqueIds));
          const blockedApplications = approvalSources.map((application) => ({
            id: application.id,
            fullName: application.fullName,
            missingAcknowledgments: getMissingApprovalAcknowledgments(application)
          })).filter((application) => application.missingAcknowledgments.length > 0);
          if (blockedApplications.length > 0) {
            res.status(409).json({
              error: "Some applications require acknowledgment review before approval",
              blockedApplications
            });
            return;
          }
        }
        let updated = 0;
        for (const application of selectedApplications) {
          const effectiveStatus = nextStatus;
          await db.update(workerApplications).set({
            status: effectiveStatus,
            reviewedAt: /* @__PURE__ */ new Date(),
            updatedAt: /* @__PURE__ */ new Date(),
            lastContactedAt: effectiveStatus === "contacted" ? /* @__PURE__ */ new Date() : void 0,
            deploymentReadiness: effectiveStatus === "ready_for_deployment" || effectiveStatus === "approved" ? normalizeDeploymentReadiness(void 0, effectiveStatus) : void 0,
            payrollReadiness: effectiveStatus === "approved" ? normalizePayrollReadiness(void 0, Boolean(application.paymentMethod), effectiveStatus) : void 0
          }).where(eq4(workerApplications.id, application.id));
          if (effectiveStatus === "approved") {
            await ensureApprovedApplicationUserAccount(application);
          }
          updated += 1;
        }
        res.json({ success: true, updated, status: nextStatus });
        return;
      }
      if (payload.action === "request_documents") {
        const requestedDocuments = parseDocumentList(payload.requestedDocuments);
        if (requestedDocuments.length === 0) {
          res.status(400).json({ error: "Requested documents are required" });
          return;
        }
        const serializedDocuments = serializeDocumentList(requestedDocuments);
        let emailed = 0;
        let skipped = 0;
        for (const application of selectedApplications) {
          await db.update(workerApplications).set({
            missingDocuments: serializedDocuments,
            documentRequestSentAt: /* @__PURE__ */ new Date(),
            nextRecommendedAction: "Await requested documents",
            updatedAt: /* @__PURE__ */ new Date()
          }).where(eq4(workerApplications.id, application.id));
          if (!application.email) {
            skipped += 1;
            continue;
          }
          try {
            await sendEmail({
              to: application.email,
              subject: "Additional documents needed for your Workforce Connect application",
              text: `Hi ${application.fullName || "there"},

We need the following documents to continue your Workforce Connect application:
- ${requestedDocuments.join("\n- ")}

Please reply with the requested items at your earliest convenience.

WFConnect Recruitment`,
              html: `<p>Hi ${application.fullName || "there"},</p><p>We need the following documents to continue your Workforce Connect application:</p><ul>${requestedDocuments.map((item) => `<li>${item}</li>`).join("")}</ul><p>Please reply with the requested items at your earliest convenience.</p><p>WFConnect Recruitment</p>`
            });
            emailed += 1;
          } catch (emailError) {
            console.error(`[APPLICATIONS] Failed to request documents for ${application.email}:`, emailError);
            skipped += 1;
          }
        }
        res.json({ success: true, updated: selectedApplications.length, emailed, skipped, requestedDocuments });
        return;
      }
      if (payload.action === "send_app_instructions") {
        let sent = 0;
        let skipped = 0;
        let notReady = 0;
        for (const application of selectedApplications) {
          const currentStatus = normalizeWorkerApplicationStatus(application.status);
          if (!["approved", "ready_for_deployment"].includes(currentStatus)) {
            notReady += 1;
            continue;
          }
          const [existingUser] = application.email ? await db.select({ id: users.id, email: users.email, mustChangePassword: users.mustChangePassword }).from(users).where(eq4(users.email, application.email.toLowerCase())).limit(1) : [];
          const smsMessage = existingUser?.mustChangePassword ? `WFConnect App is now available! Download from App Store or Google Play. Log in with:
Email: ${application.email}
Your temporary password was sent when your application was approved. Change your password after first login.` : `WFConnect App is now available! Download from App Store or Google Play and log in with your approved email: ${application.email}`;
          try {
            if (application.phone) {
              const result = await sendSMS(application.phone, smsMessage);
              if (result.success) {
                await logSMS({
                  phoneNumber: application.phone,
                  direction: "outbound",
                  message: smsMessage,
                  workerId: existingUser?.id,
                  status: "sent",
                  openphoneMessageId: result.messageId
                });
                sent += 1;
              } else {
                skipped += 1;
              }
            } else if (application.email) {
              await sendEmail({
                to: application.email,
                subject: "Your Workforce Connect app instructions",
                text: smsMessage,
                html: `<p>${smsMessage.replace(/\n/g, "<br>")}</p>`
              });
              sent += 1;
            } else {
              skipped += 1;
            }
            await db.update(workerApplications).set({ lastContactedAt: /* @__PURE__ */ new Date(), updatedAt: /* @__PURE__ */ new Date() }).where(eq4(workerApplications.id, application.id));
          } catch (sendError) {
            console.error(`[APPLICATIONS] Failed to send app instructions for ${application.id}:`, sendError);
            skipped += 1;
          }
        }
        res.json({ success: true, sent, skipped, notReady, selected: selectedApplications.length });
        return;
      }
      res.status(400).json({ error: "Unsupported bulk action" });
    } catch (error) {
      console.error("Error processing bulk application action:", error);
      res.status(500).json({ error: "Failed to process bulk action" });
    }
  });
  app2.post("/api/admin/send-app-instructions", async (req, res) => {
    try {
      const userId = req.headers["x-user-id"];
      const userRole = req.headers["x-user-role"];
      const hasSessionAccess = Boolean(userId && (userRole === "admin" || userRole === "hr"));
      if (!hasSessionAccess && !await checkBasicAuthAdmin(req, res)) {
        return;
      }
      const allWorkers = await db.select({
        id: users.id,
        email: users.email,
        fullName: users.fullName,
        phone: users.phone,
        mustChangePassword: users.mustChangePassword
      }).from(users).where(eq4(users.role, "worker"));
      const alreadySent = await db.select({ workerId: smsLogs.workerId }).from(smsLogs).where(and3(
        eq4(smsLogs.direction, "outbound"),
        sql3`${smsLogs.message} LIKE '%WFConnect App%Download%'`
      ));
      const sentWorkerIds = new Set(alreadySent.map((s) => s.workerId));
      let sent = 0;
      let skipped = 0;
      let alreadyNotified = 0;
      for (const worker of allWorkers) {
        if (!worker.phone) {
          skipped++;
          continue;
        }
        if (sentWorkerIds.has(worker.id)) {
          alreadyNotified++;
          continue;
        }
        let smsMessage;
        if (worker.mustChangePassword) {
          smsMessage = `WFConnect App is now available! Download from App Store or Google Play. Log in with:
Email: ${worker.email}
Your temporary password was sent when your application was approved. Change your password after first login.`;
        } else {
          smsMessage = `WFConnect App is now available! Download from App Store or Google Play. Log in with your email: ${worker.email}`;
        }
        try {
          const result = await sendSMS(worker.phone, smsMessage);
          if (result.success) {
            await logSMS({
              phoneNumber: worker.phone,
              direction: "outbound",
              message: smsMessage,
              workerId: worker.id,
              status: "sent",
              openphoneMessageId: result.messageId
            });
            sent++;
          } else {
            skipped++;
          }
        } catch (smsErr) {
          console.error(`[BULK SMS] Failed for ${worker.email}:`, smsErr);
          skipped++;
        }
      }
      console.log(`[BULK SMS] Sent: ${sent}, Skipped: ${skipped}, Already notified: ${alreadyNotified}`);
      res.json({ success: true, sent, skipped, alreadyNotified, total: allWorkers.length });
    } catch (error) {
      console.error("Error sending bulk app instructions:", error);
      res.status(500).json({ error: "Failed to send app instructions" });
    }
  });
  app2.get("/api/admin/sync/status", async (req, res) => {
    try {
      const userId = req.headers["x-user-id"];
      const userRole = req.headers["x-user-role"];
      if (!userId || userRole !== "admin" && userRole !== "hr") {
        res.status(403).json({ error: "Admin or HR access required" });
        return;
      }
      const { getSyncStatus: getSyncStatus2, getCrmPushQueueStats: getCrmPushQueueStats2 } = await Promise.resolve().then(() => (init_crm_sync(), crm_sync_exports));
      const status = await getSyncStatus2();
      const pushQueueStats = await getCrmPushQueueStats2();
      res.json({ ...status, pushQueue: pushQueueStats });
    } catch (error) {
      console.error("Error getting sync status:", error);
      res.status(500).json({ error: "Failed to get sync status" });
    }
  });
  app2.get("/api/admin/sync/logs", async (req, res) => {
    try {
      const userId = req.headers["x-user-id"];
      const userRole = req.headers["x-user-role"];
      if (!userId || userRole !== "admin" && userRole !== "hr") {
        res.status(403).json({ error: "Admin or HR access required" });
        return;
      }
      const { getSyncLogs: getSyncLogs2 } = await Promise.resolve().then(() => (init_crm_sync(), crm_sync_exports));
      const limit = parseInt(req.query.limit) || 50;
      const logs = await getSyncLogs2(limit);
      res.json(logs);
    } catch (error) {
      console.error("Error getting sync logs:", error);
      res.status(500).json({ error: "Failed to get sync logs" });
    }
  });
  app2.post("/api/admin/sync/workplaces", async (req, res) => {
    try {
      const userId = req.headers["x-user-id"];
      const userRole = req.headers["x-user-role"];
      if (!userId || userRole !== "admin" && userRole !== "hr") {
        res.status(403).json({ error: "Admin or HR access required" });
        return;
      }
      const { syncWorkplaces: syncWorkplaces2, isSyncRunning: isSyncRunning2 } = await Promise.resolve().then(() => (init_crm_sync(), crm_sync_exports));
      if (isSyncRunning2()) {
        res.status(409).json({ error: "A sync is already running" });
        return;
      }
      const dryRun = req.query.dryRun === "true";
      const result = await syncWorkplaces2(dryRun);
      res.json({ success: true, dryRun, ...result });
    } catch (error) {
      console.error("Error syncing workplaces:", error);
      res.status(500).json({ error: error.message || "Failed to sync workplaces" });
    }
  });
  app2.post("/api/admin/sync/shifts", async (req, res) => {
    try {
      const userId = req.headers["x-user-id"];
      const userRole = req.headers["x-user-role"];
      if (!userId || userRole !== "admin" && userRole !== "hr") {
        res.status(403).json({ error: "Admin or HR access required" });
        return;
      }
      const { syncConfirmedShifts: syncConfirmedShifts2, isSyncRunning: isSyncRunning2 } = await Promise.resolve().then(() => (init_crm_sync(), crm_sync_exports));
      if (isSyncRunning2()) {
        res.status(409).json({ error: "A sync is already running" });
        return;
      }
      const dryRun = req.query.dryRun === "true";
      const result = await syncConfirmedShifts2(dryRun);
      res.json({ success: true, dryRun, ...result });
    } catch (error) {
      console.error("Error syncing shifts:", error);
      res.status(500).json({ error: error.message || "Failed to sync shifts" });
    }
  });
  app2.post("/api/admin/sync/hotel-requests", async (req, res) => {
    try {
      const userId = req.headers["x-user-id"];
      const userRole = req.headers["x-user-role"];
      if (!userId || userRole !== "admin" && userRole !== "hr") {
        res.status(403).json({ error: "Admin or HR access required" });
        return;
      }
      const { syncHotelRequests: syncHotelRequests2, isSyncRunning: isSyncRunning2 } = await Promise.resolve().then(() => (init_crm_sync(), crm_sync_exports));
      if (isSyncRunning2()) {
        res.status(409).json({ error: "A sync is already running" });
        return;
      }
      const dryRun = req.query.dryRun === "true";
      const result = await syncHotelRequests2(dryRun);
      res.json({ success: true, dryRun, ...result });
    } catch (error) {
      console.error("Error syncing hotel requests:", error);
      res.status(500).json({ error: error.message || "Failed to sync hotel requests" });
    }
  });
  app2.post("/api/admin/sync/all", async (req, res) => {
    try {
      const userId = req.headers["x-user-id"];
      const userRole = req.headers["x-user-role"];
      if (!userId || userRole !== "admin" && userRole !== "hr") {
        res.status(403).json({ error: "Admin or HR access required" });
        return;
      }
      const { syncAll: syncAll2 } = await Promise.resolve().then(() => (init_crm_sync(), crm_sync_exports));
      const dryRun = req.query.dryRun === "true";
      const result = await syncAll2(dryRun);
      res.json({ success: true, dryRun, ...result });
    } catch (error) {
      console.error("Error running full sync:", error);
      res.status(500).json({ error: error.message || "Failed to run full sync" });
    }
  });
  app2.post("/api/admin/workplaces/sync-to-crm", async (req, res) => {
    try {
      const userId = req.headers["x-user-id"];
      const userRole = req.headers["x-user-role"];
      if (!userId || userRole !== "admin" && userRole !== "hr") {
        res.status(403).json({ error: "Admin or HR access required" });
        return;
      }
      const { backfillWorkplacesToCrm: backfillWorkplacesToCrm2 } = await Promise.resolve().then(() => (init_crm_sync(), crm_sync_exports));
      const result = await backfillWorkplacesToCrm2();
      res.json({ success: true, ...result });
    } catch (error) {
      console.error("Error running workplace CRM backfill:", error);
      res.status(500).json({ error: error.message || "Failed to run workplace CRM backfill" });
    }
  });
  app2.post("/api/discord/preview-announcement", checkRoles("admin", "hr"), async (req, res) => {
    try {
      const { rawText } = req.body;
      if (!rawText || typeof rawText !== "string" || rawText.trim().length === 0) {
        res.status(400).json({ error: "rawText is required" });
        return;
      }
      res.json({ title: "Announcement", body: rawText.trim(), color: "blue" });
    } catch (error) {
      res.status(500).json({ error: error.message || "Failed to preview announcement" });
    }
  });
  app2.post("/api/discord/send-announcement", checkRoles("admin", "hr"), async (req, res) => {
    try {
      const { title, body, color } = req.body;
      if (!title || !body) {
        res.status(400).json({ error: "title and body are required" });
        return;
      }
      const result = await sendDiscordNotification({
        title: String(title),
        message: String(body),
        color: ["red", "blue", "green", "amber", "purple"].includes(color) ? color : "blue",
        type: "announcement"
      });
      if (!result.success) {
        res.status(502).json({ error: result.error || "Failed to send to Discord" });
        return;
      }
      res.json({ success: true, alertId: result.alertId });
    } catch (error) {
      console.error("[DISCORD ANNOUNCE] Send error:", error);
      res.status(500).json({ error: error.message || "Failed to send announcement" });
    }
  });
  app2.get("/api/discord-alerts", checkRoles("admin", "hr"), async (req, res) => {
    try {
      const status = req.query.status;
      const type = req.query.type;
      const conditions = [];
      if (status && status !== "all") conditions.push(eq4(discordAlerts.status, status));
      if (type) conditions.push(eq4(discordAlerts.type, type));
      const alerts = await db.select().from(discordAlerts).where(conditions.length > 0 ? and3(...conditions) : void 0).orderBy(desc2(discordAlerts.createdAt)).limit(50);
      res.json(alerts);
    } catch (error) {
      console.error("[Discord Alerts] Fetch error:", error);
      res.status(500).json({ error: error.message || "Failed to fetch alerts" });
    }
  });
  app2.post("/api/discord-alerts/:alertId/acknowledge", checkRoles("admin", "hr"), async (req, res) => {
    try {
      const { alertId } = req.params;
      const { responseNote } = req.body;
      const userId = req.user?.id || "unknown";
      const [user] = await db.select({ fullName: users.fullName }).from(users).where(eq4(users.id, userId));
      const acknowledgedBy = user?.fullName || userId;
      const success = await acknowledgeAlert(alertId, acknowledgedBy, responseNote);
      if (!success) {
        return res.status(404).json({ error: "Alert not found" });
      }
      res.json({ success: true, acknowledgedBy });
    } catch (error) {
      console.error("[Discord Alerts] Acknowledge error:", error);
      res.status(500).json({ error: error.message || "Failed to acknowledge alert" });
    }
  });
  app2.post("/api/webhooks/discord", async (req, res) => {
    try {
      res.status(200).json({ received: true });
      const body = req.body;
      if (body?.type === 1) return;
      const content = body?.content || body?.message?.content || "";
      const ackMatch = content.match(/ACK\s+(WFC-[A-Z0-9]+)/i) || content.match(/ACKNOWLEDGE\s+(WFC-[A-Z0-9]+)/i);
      if (!ackMatch) {
        console.log("[Discord Webhook] No ACK pattern found in:", content.slice(0, 100));
        return;
      }
      const alertId = ackMatch[1].toUpperCase();
      const username = body?.author?.username || body?.username || "Discord User";
      const success = await acknowledgeAlert(alertId, username);
      console.log(`[Discord Webhook] Alert ${alertId} ${success ? "acknowledged" : "not found"} by ${username}`);
    } catch (error) {
      console.error("[Discord Webhook] Error:", error?.message);
    }
  });
  app2.post("/api/webhooks/crm", async (req, res) => {
    try {
      const webhookSecret = process.env.CRM_WEBHOOK_SECRET;
      if (!webhookSecret) {
        res.status(501).json({ error: "CRM webhook secret not configured. Set CRM_WEBHOOK_SECRET env var." });
        return;
      }
      const providedSecret = req.headers["x-crm-webhook-secret"];
      if (!providedSecret || providedSecret !== webhookSecret) {
        res.status(401).json({ error: "Unauthorized" });
        return;
      }
      res.status(200).json({ received: true });
      const { event, data } = req.body || {};
      console.log(`[CRM Webhook] Received event: ${event || "unknown"}`);
      const { syncAll: syncAll2, isSyncRunning: isSyncRunning2 } = await Promise.resolve().then(() => (init_crm_sync(), crm_sync_exports));
      if (!isSyncRunning2()) {
        syncAll2(false).catch(
          (err) => console.error("[CRM Webhook] syncAll failed:", err?.message)
        );
      }
      if (event === "hotel_request.created" && data?.hotelName) {
        try {
          const { sendDiscordNotification: sendDiscordNotification2 } = await Promise.resolve().then(() => (init_discord(), discord_exports));
          await sendDiscordNotification2({
            title: "New CRM Hotel Request",
            message: `**${data.hotelName}** needs ${data.quantityNeeded || 1} ${data.roleNeeded || "worker(s)"}
Shift: ${data.shiftStartAt || "TBD"} - ${data.shiftEndAt || "TBD"}`,
            color: "blue"
          });
        } catch (discordErr) {
          console.error("[CRM Webhook] Discord alert failed:", discordErr?.message);
        }
        try {
          const GM_PHONE = "+14166028038";
          const { sendSMS: sendSMS2, logSMS: logSMS2 } = await Promise.resolve().then(() => (init_openphone(), openphone_exports));
          const msg = `CRM Alert: New hotel request from ${data.hotelName} - ${data.quantityNeeded || 1} ${data.roleNeeded || "worker(s)"} needed`;
          await sendSMS2(GM_PHONE, msg);
          await logSMS2({ phoneNumber: GM_PHONE, direction: "outbound", message: msg, status: "sent" });
        } catch (smsErr) {
          console.error("[CRM Webhook] SMS alert failed:", smsErr?.message);
        }
      }
    } catch (error) {
      console.error("[CRM Webhook] Error:", error?.message);
    }
  });
  app2.get("/api/appointments/upcoming", checkRoles("admin", "hr"), async (_req, res) => {
    try {
      const now = /* @__PURE__ */ new Date();
      const results = await db.select({
        id: appointments.id,
        title: appointments.title,
        companyName: appointments.companyName,
        contactName: appointments.contactName,
        contactPhone: appointments.contactPhone,
        contactEmail: appointments.contactEmail,
        appointmentDate: appointments.appointmentDate,
        location: appointments.location,
        address: appointments.address,
        latitude: appointments.latitude,
        longitude: appointments.longitude,
        leadSource: appointments.leadSource,
        status: appointments.status,
        assignedUserId: appointments.assignedUserId,
        notes: appointments.notes,
        outcome: appointments.outcome,
        crmAppointmentId: appointments.crmAppointmentId,
        crmSource: appointments.crmSource,
        createdBy: appointments.createdBy,
        createdAt: appointments.createdAt,
        updatedAt: appointments.updatedAt,
        assignedUserName: users.fullName
      }).from(appointments).leftJoin(users, eq4(appointments.assignedUserId, users.id)).where(and3(
        eq4(appointments.status, "scheduled"),
        gte2(appointments.appointmentDate, now)
      )).orderBy(asc(appointments.appointmentDate)).limit(20);
      res.json(results);
    } catch (error) {
      console.error("[APPOINTMENTS] Error fetching upcoming:", error);
      res.status(500).json({ error: "Failed to fetch upcoming appointments" });
    }
  });
  app2.get("/api/appointments", checkRoles("admin", "hr"), async (req, res) => {
    try {
      const { status, assignedUserId, startDate, endDate, leadSource } = req.query;
      const conditions = [];
      if (status) {
        conditions.push(eq4(appointments.status, status));
      }
      if (assignedUserId) {
        conditions.push(eq4(appointments.assignedUserId, assignedUserId));
      }
      if (startDate) {
        conditions.push(gte2(appointments.appointmentDate, new Date(startDate)));
      }
      if (endDate) {
        conditions.push(lte2(appointments.appointmentDate, new Date(endDate)));
      }
      if (leadSource) {
        conditions.push(eq4(appointments.leadSource, leadSource));
      }
      const results = await db.select({
        id: appointments.id,
        title: appointments.title,
        companyName: appointments.companyName,
        contactName: appointments.contactName,
        contactPhone: appointments.contactPhone,
        contactEmail: appointments.contactEmail,
        appointmentDate: appointments.appointmentDate,
        location: appointments.location,
        address: appointments.address,
        latitude: appointments.latitude,
        longitude: appointments.longitude,
        leadSource: appointments.leadSource,
        status: appointments.status,
        assignedUserId: appointments.assignedUserId,
        notes: appointments.notes,
        outcome: appointments.outcome,
        crmAppointmentId: appointments.crmAppointmentId,
        crmSource: appointments.crmSource,
        createdBy: appointments.createdBy,
        createdAt: appointments.createdAt,
        updatedAt: appointments.updatedAt,
        assignedUserName: users.fullName
      }).from(appointments).leftJoin(users, eq4(appointments.assignedUserId, users.id)).where(conditions.length > 0 ? and3(...conditions) : void 0).orderBy(desc2(appointments.appointmentDate));
      res.json(results);
    } catch (error) {
      console.error("[APPOINTMENTS] Error fetching:", error);
      res.status(500).json({ error: "Failed to fetch appointments" });
    }
  });
  app2.post("/api/appointments", checkRoles("admin", "hr"), async (req, res) => {
    try {
      const userId = req.headers["x-user-id"];
      if (!userId) {
        res.status(401).json({ error: "Authentication required" });
        return;
      }
      const body = { ...req.body, createdBy: userId };
      if (typeof body.appointmentDate === "string") {
        body.appointmentDate = new Date(body.appointmentDate);
      }
      const parsed = insertAppointmentSchema.safeParse(body);
      if (!parsed.success) {
        res.status(400).json({ error: "Validation failed", details: parsed.error.flatten() });
        return;
      }
      const [created] = await db.insert(appointments).values(parsed.data).returning();
      if (created.contactPhone) {
        const apptDate = new Date(created.appointmentDate);
        const dateLabel = apptDate.toLocaleDateString("en-CA", { timeZone: "America/Toronto" });
        const timeLabel = apptDate.toLocaleTimeString("en-CA", { timeZone: "America/Toronto", hour: "2-digit", minute: "2-digit" });
        const contactMsg = `Hi ${created.contactName}, this is WFConnect confirming your appointment on ${dateLabel} at ${timeLabel}. Location: ${created.location || "TBD"}. Questions? Reply to this message.`;
        try {
          const cRes = await sendSMS(created.contactPhone, contactMsg);
          await logSMS({ phoneNumber: created.contactPhone, direction: "outbound", message: contactMsg, status: cRes.success ? "sent" : "failed" });
        } catch (smsErr) {
          console.error("[APPOINTMENTS] Contact SMS failed:", smsErr);
        }
      }
      if (created.assignedUserId) {
        const [assignedUser] = await db.select({ phone: users.phone, fullName: users.fullName }).from(users).where(eq4(users.id, created.assignedUserId)).limit(1);
        if (assignedUser?.phone) {
          const apptDate = new Date(created.appointmentDate);
          const dateLabel = apptDate.toLocaleDateString("en-CA", { timeZone: "America/Toronto" });
          const timeLabel = apptDate.toLocaleTimeString("en-CA", { timeZone: "America/Toronto", hour: "2-digit", minute: "2-digit" });
          const assignMsg = `Appointment assigned to you: ${created.title || created.companyName} on ${dateLabel} at ${timeLabel}. Location: ${created.location || "TBD"}.`;
          try {
            const aRes = await sendSMS(assignedUser.phone, assignMsg);
            await logSMS({ phoneNumber: assignedUser.phone, direction: "outbound", message: assignMsg, status: aRes.success ? "sent" : "failed" });
          } catch (smsErr) {
            console.error("[APPOINTMENTS] Assignee SMS failed:", smsErr);
          }
        }
      }
      res.status(201).json(created);
    } catch (error) {
      console.error("[APPOINTMENTS] Error creating:", error);
      res.status(500).json({ error: "Failed to create appointment" });
    }
  });
  app2.post("/api/appointments/:id/send-sms", checkRoles("admin", "hr"), async (req, res) => {
    try {
      const { id } = req.params;
      const [appt] = await db.select().from(appointments).where(eq4(appointments.id, id)).limit(1);
      if (!appt) {
        res.status(404).json({ error: "Appointment not found" });
        return;
      }
      if (!appt.contactPhone) {
        res.status(400).json({ error: "No contact phone on this appointment" });
        return;
      }
      const apptDate = new Date(appt.appointmentDate);
      const dateLabel = apptDate.toLocaleDateString("en-CA", { timeZone: "America/Toronto" });
      const timeLabel = apptDate.toLocaleTimeString("en-CA", { timeZone: "America/Toronto", hour: "2-digit", minute: "2-digit" });
      const msg = `Hi ${appt.contactName}, this is WFConnect confirming your appointment on ${dateLabel} at ${timeLabel}. Location: ${appt.location || "TBD"}. Questions? Reply to this message.`;
      const smsRes = await sendSMS(appt.contactPhone, msg);
      await logSMS({ phoneNumber: appt.contactPhone, direction: "outbound", message: msg, status: smsRes.success ? "sent" : "failed" });
      res.json({ success: true, sent: smsRes.success });
    } catch (error) {
      console.error("[APPOINTMENTS] send-sms error:", error);
      res.status(500).json({ error: "Failed to send SMS" });
    }
  });
  app2.patch("/api/appointments/:id", checkRoles("admin", "hr"), async (req, res) => {
    try {
      const { id } = req.params;
      const [existing] = await db.select({ id: appointments.id }).from(appointments).where(eq4(appointments.id, id));
      if (!existing) {
        res.status(404).json({ error: "Appointment not found" });
        return;
      }
      const updateData = { ...req.body, updatedAt: /* @__PURE__ */ new Date() };
      if (typeof updateData.appointmentDate === "string") {
        updateData.appointmentDate = new Date(updateData.appointmentDate);
      }
      const [updated] = await db.update(appointments).set(updateData).where(eq4(appointments.id, id)).returning();
      res.json(updated);
    } catch (error) {
      console.error("[APPOINTMENTS] Error updating:", error);
      res.status(500).json({ error: "Failed to update appointment" });
    }
  });
  app2.delete("/api/appointments/:id", checkRoles("admin", "hr"), async (req, res) => {
    try {
      const { id } = req.params;
      const [existing] = await db.select({ id: appointments.id }).from(appointments).where(eq4(appointments.id, id));
      if (!existing) {
        res.status(404).json({ error: "Appointment not found" });
        return;
      }
      const [cancelled] = await db.update(appointments).set({ status: "cancelled", updatedAt: /* @__PURE__ */ new Date() }).where(eq4(appointments.id, id)).returning();
      res.json(cancelled);
    } catch (error) {
      console.error("[APPOINTMENTS] Error deleting:", error);
      res.status(500).json({ error: "Failed to delete appointment" });
    }
  });
  app2.get("/api/config", checkRoles("admin", "hr"), async (_req, res) => {
    try {
      const configs = await db.select().from(appConfig).orderBy(asc(appConfig.key));
      const result = {};
      configs.forEach((c) => {
        result[c.key] = c.value;
      });
      res.json(result);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch config" });
    }
  });
  app2.put("/api/config/:key", checkRoles("admin"), async (req, res) => {
    try {
      const { key } = req.params;
      const { value, description } = req.body;
      const userId = req.user?.id;
      if (!value && value !== "") {
        return res.status(400).json({ error: "value is required" });
      }
      await db.insert(appConfig).values({ key, value, description: description || null, updatedBy: userId || null }).onConflictDoUpdate({
        target: appConfig.key,
        set: { value, description: description || null, updatedAt: /* @__PURE__ */ new Date(), updatedBy: userId || null }
      });
      res.json({ success: true, key, value });
    } catch (error) {
      console.error("[CONFIG] Update error:", error);
      res.status(500).json({ error: "Failed to update config" });
    }
  });
  app2.delete("/api/config/:key", checkRoles("admin"), async (req, res) => {
    try {
      await db.delete(appConfig).where(eq4(appConfig.key, req.params.key));
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete config" });
    }
  });
  app2.post("/api/applicants", async (req, res) => {
    try {
      const normalizedBody = normalizePublicApplicantSubmissionPayload(req.body ?? {});
      const parsedPayload = publicApplicantSubmissionSchema.safeParse(normalizedBody);
      if (!parsedPayload.success) {
        const validationIssues = formatValidationIssues(parsedPayload.error.issues);
        console.error(
          "[APPLICANTS] Payload validation failed \u2014 missing/invalid fields:",
          validationIssues.map((i) => `${i.path || "(root)"}: ${i.message}`).join("; "),
          "| raw keys:",
          Object.keys(req.body ?? {})
        );
        return res.status(400).json({
          error: "Invalid submission payload",
          issues: validationIssues
        });
      }
      const payload = parsedPayload.data;
      const ip = getClientIp(req);
      if (!checkRateLimit(ip)) {
        return res.status(429).json({ error: "Too many requests. Please try again later." });
      }
      const {
        fullName: fullNameIn,
        addressFull,
        addressStreet,
        addressCity,
        addressProvince,
        addressPostalCode,
        addressCountry,
        addressLatitude,
        addressLongitude,
        addressManualEntry,
        applyingFor,
        jobPostingSource,
        photoData: photoDataIn,
        photoFilename,
        photoMimeType,
        photoFileSize,
        resumeData: resumeDataIn,
        resumeFilename,
        resumeMimeType,
        resumeFileSize,
        smsConsent,
        marketingConsent,
        promotionalConsent
      } = payload;
      const canonicalPhone = normalizeApplicantPhone(payload.phone) || normalizeApplicantPhone(payload.phoneNumber) || normalizeApplicantPhone(payload.phone_number) || normalizeApplicantPhone(payload.mobile) || normalizeApplicantPhone(payload.contactNumber);
      if (!canonicalPhone) {
        return res.status(400).json({ error: "Phone required" });
      }
      const resolvedIdentity = resolveWorkerIdentity({
        fullName: fullNameIn ?? payload.full_name,
        firstName: payload.firstName ?? payload.first_name,
        lastName: payload.lastName ?? payload.last_name,
        email: payload.email,
        phone: canonicalPhone
      });
      const fullName = resolvedIdentity.fullName;
      if (!fullName?.trim()) return res.status(400).json({ error: "Full name required" });
      if (!addressFull?.trim()) return res.status(400).json({ error: "Address required" });
      if (!applyingFor?.trim()) return res.status(400).json({ error: "Position required" });
      if (!jobPostingSource?.trim()) return res.status(400).json({ error: "Job posting source required" });
      if (!photoDataIn) return res.status(400).json({ error: "Photo required" });
      if (!resumeDataIn) return res.status(400).json({ error: "Resume required" });
      const smsConsentGranted = isConsentGranted(smsConsent);
      if (!smsConsentGranted) {
        return res.status(400).json({
          error: "SMS text/call consent is required to submit this application"
        });
      }
      const marketingConsentGranted = isConsentGranted(marketingConsent) || isConsentGranted(promotionalConsent);
      const PHOTO_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
      const RESUME_TYPES = ["application/pdf", "application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"];
      const MAX_SIZE = 10 * 1024 * 1024;
      if (photoMimeType && !PHOTO_TYPES.includes(photoMimeType)) {
        return res.status(400).json({ error: "Invalid photo file type" });
      }
      if (resumeMimeType && !RESUME_TYPES.includes(resumeMimeType)) {
        return res.status(400).json({ error: "Invalid resume file type" });
      }
      if (photoFileSize && photoFileSize > MAX_SIZE) {
        return res.status(400).json({ error: "Photo exceeds 10 MB limit" });
      }
      if (resumeFileSize && resumeFileSize > MAX_SIZE) {
        return res.status(400).json({ error: "Resume exceeds 10 MB limit" });
      }
      const recentApplicantFingerprint = makeSubmissionFingerprint([
        ip,
        fullName,
        canonicalPhone,
        applyingFor
      ]);
      if (isRecentSubmissionFingerprint(recentApplicantFingerprint)) {
        return res.status(409).json({
          error: "A similar application was submitted very recently. Please wait before retrying."
        });
      }
      const normalizedPhone = normalizePhoneForComparison(canonicalPhone);
      const normalizedName = normalizeComparableText(fullName);
      const normalizedPosition = applyingFor.trim().toLowerCase();
      const dedupeWindowStart = new Date(Date.now() - 24 * 60 * 60 * 1e3);
      const recentApplicants = await db.select({
        id: applicants.id,
        fullName: applicants.fullName,
        phone: applicants.phone,
        applyingFor: applicants.applyingFor,
        submittedAt: applicants.submittedAt
      }).from(applicants).where(gte2(applicants.submittedAt, dedupeWindowStart)).orderBy(desc2(applicants.submittedAt)).limit(250);
      const duplicate = recentApplicants.find((existingApplicant) => {
        const existingPhone = normalizePhoneForComparison(existingApplicant.phone || "");
        const existingName = normalizeComparableText(existingApplicant.fullName || "");
        const existingPosition = (existingApplicant.applyingFor || "").trim().toLowerCase();
        return existingPhone === normalizedPhone && existingName === normalizedName && existingPosition === normalizedPosition;
      });
      if (duplicate) {
        return res.status(409).json({
          error: "A similar application was already submitted recently",
          duplicateApplicantId: duplicate.id,
          submittedAt: duplicate.submittedAt
        });
      }
      const now = /* @__PURE__ */ new Date();
      const normalizedAddressStreet = normalizeOptionalText(addressStreet);
      const normalizedAddressCity = normalizeOptionalText(addressCity);
      const normalizedAddressProvince = normalizeProvince(normalizeOptionalText(addressProvince) || "");
      const normalizedAddressPostalCode = normalizePostalCode(normalizeOptionalText(addressPostalCode) || "");
      const normalizedAddressCountry = normalizeAddressText(normalizeOptionalText(addressCountry) || "Canada");
      const normalizedAddressLatitude = normalizeOptionalNumber(addressLatitude);
      const normalizedAddressLongitude = normalizeOptionalNumber(addressLongitude);
      const parsedLocalAddress = parseLocalAddress(addressFull);
      const hasGeocodedCoordinates = normalizedAddressLatitude !== null && normalizedAddressLongitude !== null;
      const isManualAddressEntry = Boolean(addressManualEntry) || !hasGeocodedCoordinates;
      const persistedAddressStreet = normalizedAddressStreet || normalizeOptionalText(parsedLocalAddress.addressLine1) || normalizeAddressText(addressFull);
      const persistedAddressCity = normalizedAddressCity || normalizeOptionalText(parsedLocalAddress.city);
      const persistedAddressProvince = normalizedAddressProvince || normalizeProvince(normalizeOptionalText(parsedLocalAddress.province) || "");
      const persistedAddressPostalCode = normalizedAddressPostalCode || normalizePostalCode(normalizeOptionalText(parsedLocalAddress.postalCode) || "");
      if (!/^canada$/i.test(normalizedAddressCountry)) {
        console.warn("[APPLICANTS] Rejected non-Canadian applicant address payload", {
          addressFull,
          addressStreet,
          addressCity,
          addressProvince,
          addressPostalCode,
          addressCountry
        });
        return res.status(400).json({
          error: "Only Canadian addresses are supported."
        });
      }
      const applicantsColumnSet = await getApplicantsColumnSet();
      const hasApplicantAddressLatitudeColumn = applicantsColumnSet.has(APPLICANT_OPTIONAL_ADDRESS_COLUMNS.addressLatitude);
      const hasApplicantAddressLongitudeColumn = applicantsColumnSet.has(APPLICANT_OPTIONAL_ADDRESS_COLUMNS.addressLongitude);
      const shouldPersistApplicantAddressCoordinates = hasApplicantAddressLatitudeColumn && hasApplicantAddressLongitudeColumn;
      if (hasApplicantAddressLatitudeColumn && !hasApplicantAddressLongitudeColumn || !hasApplicantAddressLatitudeColumn && hasApplicantAddressLongitudeColumn) {
        console.warn("[APPLICANTS] Applicant address coordinate columns are only partially available; skipping coordinate persistence.");
      }
      if (isManualAddressEntry) {
        console.warn("[APPLICANTS] Address manually entered without geocoding", {
          hasCoordinates: hasGeocodedCoordinates,
          parsedCity: Boolean(persistedAddressCity),
          parsedProvince: Boolean(persistedAddressProvince),
          parsedPostalCode: Boolean(persistedAddressPostalCode)
        });
      }
      const insertValues = {
        fullName: normalizeWhitespace(fullName),
        phone: normalizeWhitespace(canonicalPhone),
        addressFull: normalizeAddressText(addressFull),
        addressStreet: persistedAddressStreet,
        addressCity: persistedAddressCity || null,
        addressProvince: persistedAddressProvince || null,
        addressPostalCode: persistedAddressPostalCode || null,
        addressCountry: "Canada",
        applyingFor: normalizeWhitespace(applyingFor),
        jobPostingSource: normalizeWhitespace(jobPostingSource),
        photoData: photoDataIn,
        photoFilename: photoFilename || null,
        photoMimeType: photoMimeType || null,
        photoFileSize: photoFileSize || null,
        resumeData: resumeDataIn,
        resumeFilename: resumeFilename || null,
        resumeMimeType: resumeMimeType || null,
        resumeFileSize: resumeFileSize || null,
        smsConsent: smsConsentGranted,
        smsConsentAt: smsConsentGranted ? now : null,
        marketingConsent: marketingConsentGranted,
        marketingConsentAt: marketingConsentGranted ? now : null,
        adminNotes: isManualAddressEntry ? "Address entered manually; geocoding unavailable at submission." : null,
        status: "new",
        submittedAt: now
      };
      if (shouldPersistApplicantAddressCoordinates) {
        insertValues.addressLatitude = hasGeocodedCoordinates ? normalizedAddressLatitude : null;
        insertValues.addressLongitude = hasGeocodedCoordinates ? normalizedAddressLongitude : null;
      }
      const [applicant] = await db.insert(applicants).values(insertValues).returning({ id: applicants.id });
      registerSubmissionFingerprint(recentApplicantFingerprint);
      console.log(`[APPLICANTS] \u2705 New submission: ${fullName} (${canonicalPhone}) for ${applyingFor}`);
      res.json({ success: true, applicantId: applicant.id });
    } catch (error) {
      const detail = error instanceof Error ? error.message : "Unknown error";
      const errorStack = error instanceof Error ? error.stack : "";
      console.error("[APPLICANTS] \u274C Submission error:", {
        detail,
        stack: errorStack,
        type: error.constructor.name,
        requestBody: JSON.stringify(req.body).substring(0, 500)
      });
      let userMessage = "Failed to submit application";
      if (detail.includes("database") || detail.includes("DB") || detail.includes("Connection")) {
        userMessage = "Database connection error. Please try again in a moment.";
      } else if (detail.includes("ENOTFOUND") || detail.includes("ECONNREFUSED")) {
        userMessage = "Unable to connect to server. Please check your internet connection.";
      } else if (detail.includes("timeout")) {
        userMessage = "Request timeout. Please try again.";
      }
      res.status(500).json({ error: userMessage, detail: process.env.NODE_ENV === "development" ? detail : void 0 });
    }
  });
  app2.get("/api/applicants", checkRoles("admin", "hr"), async (req, res) => {
    try {
      const { search, status, limit: limitParam } = req.query;
      const limitVal = Math.min(parseInt(limitParam) || 50, 200);
      const conditions = [];
      if (status && status !== "all") conditions.push(eq4(applicants.status, status));
      if (search) {
        const s = `%${search}%`;
        conditions.push(
          sql3`(${applicants.fullName} ILIKE ${s} OR ${applicants.phone} ILIKE ${s})`
        );
      }
      const rows = await db.select({
        id: applicants.id,
        fullName: applicants.fullName,
        phone: applicants.phone,
        addressFull: applicants.addressFull,
        addressCity: applicants.addressCity,
        addressProvince: applicants.addressProvince,
        applyingFor: applicants.applyingFor,
        jobPostingSource: applicants.jobPostingSource,
        photoFilename: applicants.photoFilename,
        photoMimeType: applicants.photoMimeType,
        resumeFilename: applicants.resumeFilename,
        resumeMimeType: applicants.resumeMimeType,
        ...await getApplicantOptionalAddressSelect(),
        ...await getApplicantOptionalConsentSelect(),
        status: applicants.status,
        submittedAt: applicants.submittedAt
      }).from(applicants).where(conditions.length > 0 ? and3(...conditions) : void 0).orderBy(desc2(applicants.submittedAt)).limit(limitVal);
      const normalizedRows = rows.map((row) => {
        const parsedAddress = parseLocalAddress(row.addressFull || "");
        const locationDisplay = buildApplicantLocationDisplay({
          addressCity: row.addressCity,
          addressProvince: row.addressProvince,
          addressFull: row.addressFull
        });
        const phoneDisplay = normalizeApplicantPhone(row.phone);
        const normalizedSmsConsent = isConsentGranted(row.smsConsent);
        const normalizedPromotionalConsent = isConsentGranted(row.promotionalConsent);
        const normalizedMarketingConsent = row.marketingConsent == null ? normalizedPromotionalConsent : isConsentGranted(row.marketingConsent);
        return {
          ...row,
          phone: phoneDisplay || "",
          phoneNumber: phoneDisplay || "",
          phone_number: phoneDisplay || "",
          phoneDisplay,
          addressCity: row.addressCity || parsedAddress.city || null,
          addressProvince: row.addressProvince || parsedAddress.province || null,
          smsConsent: normalizedSmsConsent,
          smsConsentAt: row.smsConsentAt || null,
          marketingConsent: normalizedMarketingConsent,
          marketingConsentAt: row.marketingConsentAt || null,
          promotionalConsent: normalizedPromotionalConsent,
          addressGeocoded: row.addressLatitude !== null && row.addressLongitude !== null,
          addressEntryMethod: row.addressLatitude !== null && row.addressLongitude !== null ? "geocoded" : "manual",
          locationDisplay
        };
      });
      const [countRow] = await db.select({
        total: sql3`count(*)`
      }).from(applicants).where(conditions.length > 0 ? and3(...conditions) : void 0);
      res.setHeader("X-Total-Count", String(Number(countRow?.total || 0)));
      res.json(normalizedRows);
    } catch (error) {
      const detail = error instanceof Error ? error.message : "Unknown error";
      console.error("[APPLICANTS] List error:", {
        detail,
        query: { search: req.query.search, status: req.query.status, limit: req.query.limit },
        error
      });
      res.status(500).json({ error: "Failed to fetch applicants", detail });
    }
  });
  app2.get("/api/applicants/stats", checkRoles("admin", "hr"), async (req, res) => {
    try {
      const { search } = req.query;
      const conditions = [];
      if (search) {
        const s = `%${search}%`;
        conditions.push(sql3`(${applicants.fullName} ILIKE ${s} OR ${applicants.phone} ILIKE ${s})`);
      }
      const grouped = await db.select({
        status: applicants.status,
        total: sql3`count(*)`
      }).from(applicants).where(conditions.length > 0 ? and3(...conditions) : void 0).groupBy(applicants.status);
      const [totalRow] = await db.select({
        total: sql3`count(*)`
      }).from(applicants).where(conditions.length > 0 ? and3(...conditions) : void 0);
      const counts = {
        total: Number(totalRow?.total || 0),
        new: 0,
        reviewing: 0,
        interviewed: 0,
        hired: 0,
        rejected: 0
      };
      grouped.forEach((row) => {
        const key = row.status || "";
        if (counts[key] !== void 0) {
          counts[key] = Number(row.total || 0);
        }
      });
      res.json(counts);
    } catch (error) {
      console.error("[APPLICANTS] Stats error:", error);
      res.status(500).json({ error: "Failed to fetch applicant stats" });
    }
  });
  app2.get("/api/applicants/:id", checkRoles("admin", "hr"), async (req, res) => {
    try {
      const applicantId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      if (!applicantId) {
        return res.status(400).json({ error: "Invalid applicant id" });
      }
      const [row] = await db.select({
        id: applicants.id,
        fullName: applicants.fullName,
        phone: applicants.phone,
        addressFull: applicants.addressFull,
        addressCity: applicants.addressCity,
        addressProvince: applicants.addressProvince,
        addressPostalCode: applicants.addressPostalCode,
        applyingFor: applicants.applyingFor,
        jobPostingSource: applicants.jobPostingSource,
        photoData: applicants.photoData,
        photoFilename: applicants.photoFilename,
        resumeData: applicants.resumeData,
        resumeFilename: applicants.resumeFilename,
        status: applicants.status,
        adminNotes: applicants.adminNotes,
        submittedAt: applicants.submittedAt,
        ...await getApplicantOptionalAddressSelect(),
        ...await getApplicantOptionalConsentSelect()
      }).from(applicants).where(eq4(applicants.id, applicantId));
      if (!row) return res.status(404).json({ error: "Applicant not found" });
      const { photoData: _p, resumeData: _r, ...safe } = row;
      const parsedAddress = parseLocalAddress(safe.addressFull || "");
      const locationDisplay = buildApplicantLocationDisplay({
        addressCity: safe.addressCity,
        addressProvince: safe.addressProvince,
        addressFull: safe.addressFull
      });
      const phoneDisplay = normalizeApplicantPhone(safe.phone);
      const normalizedSmsConsent = isConsentGranted(safe.smsConsent);
      const normalizedPromotionalConsent = isConsentGranted(safe.promotionalConsent);
      const normalizedMarketingConsent = safe.marketingConsent == null ? normalizedPromotionalConsent : isConsentGranted(safe.marketingConsent);
      res.json({
        ...safe,
        phone: phoneDisplay || "",
        phoneNumber: phoneDisplay || "",
        phone_number: phoneDisplay || "",
        phoneDisplay,
        addressCity: safe.addressCity || parsedAddress.city || null,
        addressProvince: safe.addressProvince || parsedAddress.province || null,
        addressPostalCode: safe.addressPostalCode || parsedAddress.postalCode || null,
        smsConsent: normalizedSmsConsent,
        smsConsentAt: safe.smsConsentAt || null,
        marketingConsent: normalizedMarketingConsent,
        marketingConsentAt: safe.marketingConsentAt || null,
        promotionalConsent: normalizedPromotionalConsent,
        addressGeocoded: safe.addressLatitude !== null && safe.addressLongitude !== null,
        addressEntryMethod: safe.addressLatitude !== null && safe.addressLongitude !== null ? "geocoded" : "manual",
        locationDisplay,
        hasPhoto: !!_p,
        hasResume: !!_r
      });
    } catch (error) {
      const detail = error instanceof Error ? error.message : "Unknown error";
      console.error("[APPLICANTS] Detail error:", { applicantId: req.params.id, detail, error });
      res.status(500).json({ error: "Failed to fetch applicant", detail });
    }
  });
  app2.patch("/api/applicants/:id/status", checkRoles("admin", "hr"), async (req, res) => {
    try {
      const { status, adminNotes } = req.body;
      const VALID = ["new", "reviewing", "interviewed", "hired", "rejected"];
      if (!VALID.includes(status)) return res.status(400).json({ error: "Invalid status" });
      const [updated] = await db.update(applicants).set({ status, adminNotes: adminNotes || null, updatedAt: /* @__PURE__ */ new Date() }).where(eq4(applicants.id, req.params.id)).returning({ id: applicants.id, status: applicants.status });
      if (!updated) return res.status(404).json({ error: "Applicant not found" });
      res.json(updated);
    } catch (error) {
      res.status(500).json({ error: "Failed to update status" });
    }
  });
  app2.get("/api/applicants/:id/download/photo", checkRoles("admin", "hr"), async (req, res) => {
    try {
      const [row] = await db.select({ photoData: applicants.photoData, photoFilename: applicants.photoFilename, photoMimeType: applicants.photoMimeType }).from(applicants).where(eq4(applicants.id, req.params.id));
      if (!row?.photoData) return res.status(404).json({ error: "Photo not found" });
      const base64 = row.photoData.split(",")[1] || row.photoData;
      const buffer = Buffer.from(base64, "base64");
      res.setHeader("Content-Type", row.photoMimeType || "image/jpeg");
      res.setHeader("Content-Disposition", `attachment; filename="${row.photoFilename || "photo.jpg"}"`);
      res.send(buffer);
    } catch (error) {
      res.status(500).json({ error: "Failed to download photo" });
    }
  });
  app2.get("/api/applicants/:id/download/resume", checkRoles("admin", "hr"), async (req, res) => {
    try {
      const [row] = await db.select({ resumeData: applicants.resumeData, resumeFilename: applicants.resumeFilename, resumeMimeType: applicants.resumeMimeType }).from(applicants).where(eq4(applicants.id, req.params.id));
      if (!row?.resumeData) return res.status(404).json({ error: "Resume not found" });
      const base64 = row.resumeData.split(",")[1] || row.resumeData;
      const buffer = Buffer.from(base64, "base64");
      res.setHeader("Content-Type", row.resumeMimeType || "application/pdf");
      res.setHeader("Content-Disposition", `attachment; filename="${row.resumeFilename || "resume.pdf"}"`);
      res.send(buffer);
    } catch (error) {
      res.status(500).json({ error: "Failed to download resume" });
    }
  });
  app2.delete("/api/admin/worker-applications/:id", checkRoles("admin"), async (req, res) => {
    try {
      const [deleted] = await db.delete(workerApplications).where(eq4(workerApplications.id, req.params.id)).returning({ id: workerApplications.id });
      if (!deleted) {
        res.status(404).json({ ok: false, error: "Worker application not found" });
        return;
      }
      res.json({ ok: true, deleted: true });
    } catch (error) {
      console.error("[DELETE /api/admin/worker-applications/:id]", error);
      res.status(500).json({ ok: false, error: "Failed to delete worker application" });
    }
  });
  app2.delete("/api/admin/applicants/:id", checkRoles("admin"), async (req, res) => {
    try {
      const [deleted] = await db.delete(applicants).where(eq4(applicants.id, req.params.id)).returning({ id: applicants.id });
      if (!deleted) {
        res.status(404).json({ ok: false, error: "Applicant not found" });
        return;
      }
      res.json({ ok: true, deleted: true });
    } catch (error) {
      console.error("[DELETE /api/admin/applicants/:id]", error);
      res.status(500).json({ ok: false, error: "Failed to delete applicant" });
    }
  });
  app2.get("/api/agreements/me/download", async (req, res) => {
    try {
      const userId = req.headers["x-user-id"];
      const role = req.headers["x-user-role"];
      if (!userId || role !== "worker") {
        res.status(401).json({ error: "Authenticated worker required" });
        return;
      }
      const { user, application } = await getWorkerApplicationForUser(userId);
      if (!user || !application) {
        res.status(404).json({ error: "Agreement not found" });
        return;
      }
      if (!["AGREEMENT_ACCEPTED", "ONBOARDED"].includes(user.onboardingStatus || "")) {
        res.status(403).json({ error: "Agreement is not available until onboarding is complete" });
        return;
      }
      const hydratedApplication = await hydrateAgreementPdfApplication(
        application,
        { workerUserId: user.id }
      );
      await updateAgreementPdfTimestampFailSoft(application.id, "workerPdfGeneratedAt");
      streamAgreementPdf(res, hydratedApplication, "worker", {
        disposition: resolvePdfDisposition(req.query.disposition)
      });
    } catch (error) {
      console.error("Error generating agreement PDF:", error);
      res.status(500).json({ error: "Failed to generate PDF" });
    }
  });
  app2.get("/api/admin/agreements/:id/internal", async (req, res) => {
    try {
      if (!await hasAdminAgreementAccess(req, res)) {
        return;
      }
      const workerApplicationAgreementSelect = await getWorkerApplicationAgreementSelect();
      const [application] = await db.select(workerApplicationAgreementSelect).from(workerApplications).where(eq4(workerApplications.id, req.params.id)).limit(1);
      if (!application) {
        res.status(404).json({ error: "Application not found" });
        return;
      }
      const hydratedApplication = await hydrateAgreementPdfApplication(
        application
      );
      await updateAgreementPdfTimestampFailSoft(application.id, "internalPdfGeneratedAt");
      streamAgreementPdf(res, hydratedApplication, "internal", {
        disposition: resolvePdfDisposition(req.query.disposition)
      });
    } catch (error) {
      console.error("Error generating internal agreement PDF:", error);
      res.status(500).json({ error: "Failed to generate PDF" });
    }
  });
  app2.get("/api/admin/agreements/:id/worker", async (req, res) => {
    try {
      if (!await hasAdminAgreementAccess(req, res)) {
        return;
      }
      const workerApplicationAgreementSelect = await getWorkerApplicationAgreementSelect();
      const [application] = await db.select(workerApplicationAgreementSelect).from(workerApplications).where(eq4(workerApplications.id, req.params.id)).limit(1);
      if (!application) {
        res.status(404).json({ error: "Application not found" });
        return;
      }
      const hydratedApplication = await hydrateAgreementPdfApplication(
        application
      );
      await updateAgreementPdfTimestampFailSoft(application.id, "workerPdfGeneratedAt");
      streamAgreementPdf(res, hydratedApplication, "worker", {
        disposition: resolvePdfDisposition(req.query.disposition)
      });
    } catch (error) {
      console.error("Error generating worker agreement PDF:", error);
      res.status(500).json({ error: "Failed to generate PDF" });
    }
  });
  app2.get("/api/admin/applications/:id/agreement-pdf", async (req, res) => {
    try {
      if (!await hasAdminAgreementAccess(req, res)) {
        return;
      }
      const workerApplicationAgreementSelect = await getWorkerApplicationAgreementSelect();
      const [application] = await db.select(workerApplicationAgreementSelect).from(workerApplications).where(eq4(workerApplications.id, req.params.id)).limit(1);
      if (!application) {
        res.status(404).json({ error: "Application not found" });
        return;
      }
      const hydratedApplication = await hydrateAgreementPdfApplication(
        application
      );
      await updateAgreementPdfTimestampFailSoft(application.id, "internalPdfGeneratedAt");
      streamAgreementPdf(res, hydratedApplication, "internal", {
        disposition: resolvePdfDisposition(req.query.disposition)
      });
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
      const [profile] = await db.select().from(paymentProfiles).where(eq4(paymentProfiles.workerUserId, userId));
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
      const [existing] = await db.select().from(paymentProfiles).where(eq4(paymentProfiles.workerUserId, userId));
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
        const [updated] = await db.update(paymentProfiles).set(paymentData).where(eq4(paymentProfiles.workerUserId, userId)).returning();
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
      const [user] = await db.select().from(users).where(eq4(users.email, email.trim().toLowerCase()));
      if (!user) {
        const [application] = await db.select().from(workerApplications).where(eq4(workerApplications.email, email.trim().toLowerCase()));
        if (application) {
          await db.update(workerApplications).set(paymentData).where(eq4(workerApplications.id, application.id));
          res.json({ ok: true, message: "Payment information updated for your application" });
          return;
        }
        res.status(404).json({ error: "No account or application found with this email. Please apply first at /apply" });
        return;
      }
      const [existing] = await db.select().from(paymentProfiles).where(eq4(paymentProfiles.workerUserId, user.id));
      if (existing) {
        await db.update(paymentProfiles).set(paymentData).where(eq4(paymentProfiles.workerUserId, user.id));
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
      if (!await checkBasicAuthAdmin(req, res)) return;
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
      }).from(paymentProfiles).leftJoin(users, eq4(paymentProfiles.workerUserId, users.id)).orderBy(desc2(paymentProfiles.updatedAt));
      res.json(profiles);
    } catch (error) {
      console.error("Error fetching payment profiles:", error);
      res.status(500).json({ error: "Failed to fetch payment profiles" });
    }
  });
  app2.get("/api/workplaces", checkRoles("admin", "hr"), async (_req, res) => {
    try {
      const allWorkplaces = await db.select().from(workplaces).orderBy(desc2(workplaces.createdAt));
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
      const [workplace] = await db.select().from(workplaces).where(eq4(workplaces.id, req.params.id));
      if (!workplace) {
        res.status(404).json({ error: "Workplace not found" });
        return;
      }
      if (role === "worker" || role === "client") {
        const [assignment] = await db.select().from(workplaceAssignments).where(and3(
          eq4(workplaceAssignments.workplaceId, req.params.id),
          eq4(workplaceAssignments.workerUserId, userId)
        ));
        const [assignedShift] = await db.select({ id: shifts.id }).from(shifts).where(and3(
          eq4(shifts.workplaceId, req.params.id),
          eq4(shifts.workerUserId, userId)
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
      const [updatedWorkplace] = await db.update(workplaces).set(updateData).where(eq4(workplaces.id, req.params.id)).returning();
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
      const [workplace] = await db.select().from(workplaces).where(eq4(workplaces.id, req.params.id));
      if (!workplace) {
        res.status(404).json({ error: "Workplace not found" });
        return;
      }
      const [updatedWorkplace] = await db.update(workplaces).set({ isActive: !workplace.isActive, updatedAt: /* @__PURE__ */ new Date() }).where(eq4(workplaces.id, req.params.id)).returning();
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
      const [workplace] = await db.select().from(workplaces).where(eq4(workplaces.id, workplaceId));
      if (!workplace) {
        res.status(404).json({ error: "Workplace not found" });
        return;
      }
      const workplaceShifts = await db.select({ id: shifts.id }).from(shifts).where(eq4(shifts.workplaceId, workplaceId));
      if (workplaceShifts.length > 0) {
        const shiftIds = workplaceShifts.map((s) => s.id);
        await db.delete(shiftOffers).where(inArray(shiftOffers.shiftId, shiftIds));
        await db.delete(shiftCheckins).where(inArray(shiftCheckins.shiftId, shiftIds));
        await db.delete(sentReminders).where(inArray(sentReminders.shiftId, shiftIds));
      }
      await db.delete(shifts).where(eq4(shifts.workplaceId, workplaceId));
      await db.delete(shiftSeries).where(eq4(shiftSeries.workplaceId, workplaceId));
      await db.delete(shiftRequests).where(eq4(shiftRequests.workplaceId, workplaceId));
      await db.delete(workplaceAssignments).where(eq4(workplaceAssignments.workplaceId, workplaceId));
      await db.delete(titoLogs).where(eq4(titoLogs.workplaceId, workplaceId));
      await db.update(timesheetEntries).set({ workplaceId: null }).where(eq4(timesheetEntries.workplaceId, workplaceId));
      await db.update(exportAuditLogs).set({ workplaceId: null }).where(eq4(exportAuditLogs.workplaceId, workplaceId));
      await db.delete(workplaces).where(eq4(workplaces.id, workplaceId));
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
      }).from(workplaceAssignments).leftJoin(users, eq4(workplaceAssignments.workerUserId, users.id)).where(and3(eq4(workplaceAssignments.workplaceId, req.params.id), eq4(workplaceAssignments.status, "active"))).orderBy(desc2(workplaceAssignments.createdAt));
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
      const [worker] = await db.select().from(users).where(and3(eq4(users.id, workerUserId), eq4(users.role, "worker")));
      if (!worker) {
        res.status(404).json({ error: "Worker not found" });
        return;
      }
      const [workplace] = await db.select().from(workplaces).where(eq4(workplaces.id, req.params.id));
      if (!workplace) {
        res.status(404).json({ error: "Workplace not found" });
        return;
      }
      const existing = await db.select().from(workplaceAssignments).where(and3(
        eq4(workplaceAssignments.workplaceId, req.params.id),
        eq4(workplaceAssignments.workerUserId, workerUserId)
      )).limit(1);
      if (existing.length > 0) {
        if (existing[0].status === "removed") {
          const [updated] = await db.update(workplaceAssignments).set({ status: status || "active", notes, updatedAt: /* @__PURE__ */ new Date() }).where(eq4(workplaceAssignments.id, existing[0].id)).returning();
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
      const [updatedAssignment] = await db.update(workplaceAssignments).set(updateData).where(eq4(workplaceAssignments.id, req.params.id)).returning();
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
      const [deleted] = await db.delete(workplaceAssignments).where(eq4(workplaceAssignments.id, req.params.id)).returning();
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
      }).from(workplaceAssignments).leftJoin(workplaces, eq4(workplaceAssignments.workplaceId, workplaces.id)).where(and3(
        eq4(workplaceAssignments.workerUserId, userId),
        or(eq4(workplaceAssignments.status, "active"), eq4(workplaceAssignments.status, "invited"))
      )).orderBy(desc2(workplaceAssignments.invitedAt));
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
      if (!checkTitoRateLimit(userId)) {
        res.status(429).json({ error: "Too many requests. Please wait before trying again.", errorCode: "RATE_LIMITED" });
        return;
      }
      const { workplaceId, gpsLat, gpsLng, shiftId } = req.body;
      if (!workplaceId) {
        res.status(400).json({ error: "workplaceId is required" });
        return;
      }
      const anyOpenLogs = await db.select().from(titoLogs).where(and3(
        eq4(titoLogs.workerId, userId),
        isNull2(titoLogs.timeOut),
        ne2(titoLogs.status, "canceled")
      )).limit(1);
      if (anyOpenLogs.length > 0) {
        const existing = anyOpenLogs[0];
        if (existing.workplaceId === workplaceId && (!shiftId || existing.shiftId === shiftId)) {
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
        console.log(`[TITO] Rejected clock-in: worker ${userId} has active session at workplace ${existing.workplaceId} (titoLogId=${existing.id})`);
        res.status(409).json({
          error: "You already have an active clock-in session. Please clock out first.",
          errorCode: "ACTIVE_SESSION_EXISTS",
          existingTitoLogId: existing.id,
          existingWorkplaceId: existing.workplaceId
        });
        return;
      }
      const [workplace] = await db.select().from(workplaces).where(eq4(workplaces.id, workplaceId));
      if (!workplace) {
        res.status(404).json({ error: "Workplace not found", errorCode: "WORKPLACE_NOT_FOUND" });
        return;
      }
      if (!workplace.isActive) {
        res.status(400).json({ error: "Workplace is not active", errorCode: "WORKPLACE_INACTIVE" });
        return;
      }
      const assignment = await db.select().from(workplaceAssignments).where(and3(
        eq4(workplaceAssignments.workplaceId, workplaceId),
        eq4(workplaceAssignments.workerUserId, userId),
        eq4(workplaceAssignments.status, "active")
      )).limit(1);
      if (assignment.length === 0) {
        res.status(403).json({ error: "You are not assigned to this workplace", errorCode: "NOT_ASSIGNED" });
        return;
      }
      if (!shiftId) {
        res.status(400).json({ error: "shiftId is required. You must clock in against a scheduled shift.", errorCode: "NO_SHIFT_ID" });
        return;
      }
      const [shiftRow] = await db.select().from(shifts).where(eq4(shifts.id, shiftId));
      if (!shiftRow) {
        res.status(404).json({ error: "Shift not found", errorCode: "SHIFT_NOT_FOUND" });
        return;
      }
      const isAssignedWorker = shiftRow.workerUserId === userId;
      const [acceptedOffer] = isAssignedWorker ? [{ id: "assigned" }] : await db.select({ id: shiftOffers.id }).from(shiftOffers).where(and3(
        eq4(shiftOffers.shiftId, shiftId),
        eq4(shiftOffers.workerId, userId),
        eq4(shiftOffers.status, "accepted")
      )).limit(1);
      if (!isAssignedWorker && !acceptedOffer) {
        res.status(403).json({
          error: "You must have an accepted shift offer to clock in for this shift",
          errorCode: "NO_ACCEPTED_OFFER"
        });
        return;
      }
      {
        const now = /* @__PURE__ */ new Date();
        const [sH, sM] = shiftRow.startTime.split(":").map(Number);
        const shiftStart = /* @__PURE__ */ new Date(shiftRow.date + "T00:00:00");
        shiftStart.setHours(sH, sM, 0, 0);
        const windowOpen = new Date(shiftStart.getTime() - 15 * 60 * 1e3);
        let windowClose;
        if (shiftRow.endTime) {
          const [eH, eM] = shiftRow.endTime.split(":").map(Number);
          const shiftEnd = /* @__PURE__ */ new Date(shiftRow.date + "T00:00:00");
          shiftEnd.setHours(eH, eM, 0, 0);
          if (shiftEnd <= shiftStart) {
            shiftEnd.setDate(shiftEnd.getDate() + 1);
          }
          windowClose = new Date(shiftEnd.getTime() + 30 * 60 * 1e3);
        } else {
          windowClose = new Date(shiftStart.getTime() + 24 * 60 * 60 * 1e3);
        }
        if (now < windowOpen || now > windowClose) {
          const fmtTime = (d) => d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: true, timeZone: "America/Toronto" });
          res.status(400).json({
            error: "Clock-in is only allowed during your scheduled shift window.",
            errorCode: "OUTSIDE_SHIFT_WINDOW",
            windowOpen: windowOpen.toISOString(),
            windowClose: windowClose.toISOString(),
            windowDescription: `Clock-in available ${fmtTime(windowOpen)} - ${fmtTime(windowClose)}`
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
          shiftId,
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
        shiftId,
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
      if (shiftId) {
        (async () => {
          try {
            const [shiftForCrm] = await db.select().from(shifts).where(eq4(shifts.id, shiftId));
            if (shiftForCrm?.crmShiftId) {
              const { enqueueCrmPush: enqueueCrmPush2 } = await Promise.resolve().then(() => (init_crm_sync(), crm_sync_exports));
              await enqueueCrmPush2("confirmed_shift", shiftId, "update", {
                crmExternalId: shiftForCrm.crmShiftId,
                checkedInAt: titoLog.timeIn.toISOString(),
                confirmStatus: "CONFIRMED"
              });
            }
          } catch (crmErr) {
            console.error("[CRM-PUSH] TITO clock-in push failed:", crmErr?.message);
          }
        })();
      }
      try {
        const [worker] = await db.select({ fullName: users.fullName }).from(users).where(eq4(users.id, userId));
        const workerName = worker?.fullName || "Worker";
        const nowToronto = new Date((/* @__PURE__ */ new Date()).toLocaleString("en-US", { timeZone: "America/Toronto" }));
        const currentHour = nowToronto.getHours();
        const hrAdmins = await db.select({ id: users.id }).from(users).where(
          and3(inArray(users.role, ["admin", "hr"]), eq4(users.isActive, true))
        );
        const hrAdminIds = hrAdmins.map((u) => u.id);
        let isLate = false;
        if (shiftId) {
          const [shiftRow2] = await db.select({ startTime: shifts.startTime, date: shifts.date }).from(shifts).where(eq4(shifts.id, shiftId));
          if (shiftRow2?.startTime && shiftRow2?.date) {
            const [h, m] = shiftRow2.startTime.split(":").map(Number);
            const shiftStart = /* @__PURE__ */ new Date(shiftRow2.date + "T00:00:00");
            shiftStart.setHours(h, m, 0, 0);
            const lateMinutes = Math.round((Date.now() - shiftStart.getTime()) / 6e4);
            if (lateMinutes > 10) {
              isLate = true;
              await db.update(titoLogs).set({ flaggedLate: true, lateMinutes }).where(eq4(titoLogs.id, titoLog.id));
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
      const [log2] = await db.select().from(titoLogs).where(eq4(titoLogs.id, titoLogId));
      if (!log2) {
        res.status(404).json({ error: "TITO log not found" });
        return;
      }
      if (log2.workerId !== userId) {
        res.status(403).json({ error: "Not your TITO log" });
        return;
      }
      await db.update(titoLogs).set({ lateReason, lateNote: lateNote || null, updatedAt: /* @__PURE__ */ new Date() }).where(eq4(titoLogs.id, titoLogId));
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
      if (!checkTitoRateLimit(userId)) {
        res.status(429).json({ error: "Too many requests. Please wait before trying again.", errorCode: "RATE_LIMITED" });
        return;
      }
      const { titoLogId, gpsLat, gpsLng } = req.body;
      if (!titoLogId) {
        res.status(400).json({ error: "titoLogId is required" });
        return;
      }
      const [titoLog] = await db.select().from(titoLogs).where(eq4(titoLogs.id, titoLogId));
      if (!titoLog) {
        res.status(404).json({ error: "TITO record not found" });
        return;
      }
      if (titoLog.workerId !== userId) {
        res.status(403).json({ error: "You can only clock out of your own shift" });
        return;
      }
      if (titoLog.timeOut) {
        console.log(`[TITO] Double clock-out prevented: worker ${userId} already clocked out (titoLogId=${titoLog.id})`);
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
      const elapsedSeconds = (Date.now() - new Date(titoLog.timeIn).getTime()) / 1e3;
      if (elapsedSeconds < 60) {
        const remainingSeconds = Math.ceil(60 - elapsedSeconds);
        res.status(400).json({
          error: "Minimum shift duration is 1 minute.",
          errorCode: "MIN_DURATION",
          remainingSeconds
        });
        return;
      }
      if (titoLog.shiftId) {
        const [clockOutShift] = await db.select().from(shifts).where(eq4(shifts.id, titoLog.shiftId));
        if (clockOutShift) {
          const now = /* @__PURE__ */ new Date();
          const [sH, sM] = clockOutShift.startTime.split(":").map(Number);
          const shiftStart = /* @__PURE__ */ new Date(clockOutShift.date + "T00:00:00");
          shiftStart.setHours(sH, sM, 0, 0);
          let windowClose;
          if (clockOutShift.endTime) {
            const [eH, eM] = clockOutShift.endTime.split(":").map(Number);
            const shiftEnd = /* @__PURE__ */ new Date(clockOutShift.date + "T00:00:00");
            shiftEnd.setHours(eH, eM, 0, 0);
            if (shiftEnd <= shiftStart) {
              shiftEnd.setDate(shiftEnd.getDate() + 1);
            }
            windowClose = new Date(shiftEnd.getTime() + 30 * 60 * 1e3);
          } else {
            windowClose = new Date(shiftStart.getTime() + 24 * 60 * 60 * 1e3);
          }
          if (now < shiftStart || now > windowClose) {
            const fmtTime = (d) => d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: true, timeZone: "America/Toronto" });
            res.status(400).json({
              error: "Clock-out must occur within your scheduled shift window.",
              errorCode: "OUTSIDE_SHIFT_WINDOW",
              windowDescription: `Clock-out allowed ${fmtTime(shiftStart)} - ${fmtTime(windowClose)}`
            });
            return;
          }
        }
      }
      const [workplace] = titoLog.workplaceId ? await db.select().from(workplaces).where(eq4(workplaces.id, titoLog.workplaceId)) : [null];
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
      }).where(eq4(titoLogs.id, titoLogId)).returning();
      const totalMs = clockOutTime.getTime() - new Date(titoLog.timeIn).getTime();
      const totalHours = Math.max(0, parseFloat((totalMs / 36e5).toFixed(2)));
      let timesheetEntryCreated = false;
      try {
        const clockInDate = new Date(titoLog.timeIn);
        const dateLocalStr = clockInDate.toLocaleDateString("en-CA", { timeZone: "America/Toronto" });
        const payPeriod = getCurrentPayPeriod(/* @__PURE__ */ new Date(dateLocalStr + "T12:00:00"));
        if (payPeriod && totalHours > 0) {
          const [existingTimesheet] = await db.select().from(timesheets).where(and3(
            eq4(timesheets.workerUserId, userId),
            eq4(timesheets.periodYear, payPeriod.year),
            eq4(timesheets.periodNumber, payPeriod.periodNumber)
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
          const existingEntry = await db.select().from(timesheetEntries).where(eq4(timesheetEntries.titoLogId, titoLogId)).limit(1);
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
            }).from(timesheetEntries).where(eq4(timesheetEntries.timesheetId, timesheetId));
            const totalTimesheetHours = allEntries.reduce((sum, e) => sum + parseFloat(e.hours), 0);
            const totalTimesheetPay = allEntries.reduce((sum, e) => sum + parseFloat(e.amount), 0);
            await db.update(timesheets).set({
              totalHours: totalTimesheetHours.toFixed(2),
              totalPay: totalTimesheetPay.toFixed(2),
              updatedAt: /* @__PURE__ */ new Date()
            }).where(eq4(timesheets.id, timesheetId));
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
      if (titoLog.shiftId) {
        (async () => {
          try {
            const [shiftForCrm] = await db.select().from(shifts).where(eq4(shifts.id, titoLog.shiftId));
            if (shiftForCrm?.crmShiftId) {
              const { enqueueCrmPush: enqueueCrmPush2 } = await Promise.resolve().then(() => (init_crm_sync(), crm_sync_exports));
              await enqueueCrmPush2("confirmed_shift", titoLog.shiftId, "update", {
                crmExternalId: shiftForCrm.crmShiftId,
                completedAt: clockOutTime.toISOString(),
                confirmStatus: "COMPLETED",
                notes: `Clock-out: ${totalHours}h, GPS verified: ${isWithinRadius}`
              });
            }
          } catch (crmErr) {
            console.error("[CRM-PUSH] TITO clock-out push failed:", crmErr?.message);
          }
        })();
      }
      try {
        const [worker] = await db.select({ fullName: users.fullName }).from(users).where(eq4(users.id, userId));
        const workerName = worker?.fullName || "Worker";
        const nowToronto = new Date((/* @__PURE__ */ new Date()).toLocaleString("en-US", { timeZone: "America/Toronto" }));
        const currentHour = nowToronto.getHours();
        const wpName = workplace?.name || "work site";
        if (currentHour < 5 || currentHour >= 23) {
          const hrAdmins = await db.select({ id: users.id }).from(users).where(
            and3(inArray(users.role, ["admin", "hr"]), eq4(users.isActive, true))
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
            and3(inArray(users.role, ["admin", "hr"]), eq4(users.isActive, true))
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
        query = db.select(baseSelect).from(titoLogs).leftJoin(workplaces, eq4(titoLogs.workplaceId, workplaces.id)).leftJoin(users, eq4(titoLogs.workerId, users.id)).leftJoin(shifts, eq4(titoLogs.shiftId, shifts.id)).orderBy(desc2(titoLogs.createdAt)).limit(100);
      } else {
        query = db.select(baseSelect).from(titoLogs).leftJoin(workplaces, eq4(titoLogs.workplaceId, workplaces.id)).leftJoin(users, eq4(titoLogs.workerId, users.id)).leftJoin(shifts, eq4(titoLogs.shiftId, shifts.id)).where(eq4(titoLogs.workerId, userId)).orderBy(desc2(titoLogs.createdAt)).limit(50);
      }
      const logs = await query;
      const logIds = logs.map((l) => l.id);
      let correctedLogIds = /* @__PURE__ */ new Set();
      if (logIds.length > 0) {
        const corrections = await db.select({ titoLogId: titoCorrections.titoLogId }).from(titoCorrections).where(and3(
          inArray(titoCorrections.titoLogId, logIds),
          eq4(titoCorrections.status, "approved")
        ));
        correctedLogIds = new Set(corrections.map((c) => c.titoLogId));
      }
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
        corrected: correctedLogIds.has(log2.id),
        cancelReason: log2.status === "canceled" ? log2.notes || "Accidental clock-in" : void 0,
        totalHours: log2.timeIn && log2.timeOut ? parseFloat(((new Date(log2.timeOut).getTime() - new Date(log2.timeIn).getTime()) / 36e5).toFixed(2)) : void 0
      }));
      res.json(formattedLogs);
    } catch (error) {
      console.error("Error fetching TITO logs:", error);
      res.status(500).json({ error: "Failed to fetch TITO logs" });
    }
  });
  app2.post("/api/tito/email-timesheet", checkRoles("admin", "hr"), async (req, res) => {
    try {
      const { to, subject, period, workplaceId, workerId } = req.body;
      if (!to || typeof to !== "string" || !to.includes("@")) {
        res.status(400).json({ error: "Valid email address is required" });
        return;
      }
      const now = /* @__PURE__ */ new Date();
      let startDate;
      let endDate;
      let periodLabel;
      const selectedPeriod = period || "biweekly";
      if (selectedPeriod === "weekly") {
        const dayOfWeek = now.getDay();
        const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
        startDate = new Date(now);
        startDate.setDate(now.getDate() + mondayOffset);
        startDate.setHours(0, 0, 0, 0);
        endDate = new Date(startDate);
        endDate.setDate(startDate.getDate() + 6);
        endDate.setHours(23, 59, 59, 999);
        periodLabel = "Weekly";
      } else if (selectedPeriod === "monthly") {
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
        periodLabel = "Monthly";
      } else {
        const currentPayPeriod = getCurrentPayPeriod();
        if (currentPayPeriod) {
          startDate = /* @__PURE__ */ new Date(currentPayPeriod.startDate + "T00:00:00");
          endDate = /* @__PURE__ */ new Date(currentPayPeriod.endDate + "T23:59:59.999");
          periodLabel = `Pay Period ${currentPayPeriod.periodNumber}`;
        } else {
          startDate = new Date(now);
          startDate.setDate(now.getDate() - 13);
          startDate.setHours(0, 0, 0, 0);
          endDate = new Date(now);
          endDate.setHours(23, 59, 59, 999);
          periodLabel = "Biweekly";
        }
      }
      const conditions = [
        ne2(titoLogs.status, "canceled"),
        gte2(titoLogs.timeIn, startDate),
        lte2(titoLogs.timeIn, endDate)
      ];
      if (workplaceId) {
        conditions.push(eq4(titoLogs.workplaceId, workplaceId));
      }
      if (workerId) {
        conditions.push(eq4(titoLogs.workerId, workerId));
      }
      const logs = await db.select({
        id: titoLogs.id,
        workerId: titoLogs.workerId,
        workerName: users.fullName,
        workplaceName: workplaces.name,
        shiftDate: shifts.date,
        shiftTitle: shifts.title,
        timeIn: titoLogs.timeIn,
        timeOut: titoLogs.timeOut,
        status: titoLogs.status
      }).from(titoLogs).leftJoin(users, eq4(titoLogs.workerId, users.id)).leftJoin(workplaces, eq4(titoLogs.workplaceId, workplaces.id)).leftJoin(shifts, eq4(titoLogs.shiftId, shifts.id)).where(and3(...conditions)).orderBy(asc(users.fullName), asc(titoLogs.timeIn)).limit(1e3);
      const formatTime = (d) => d ? d.toLocaleString("en-CA", { timeZone: "America/Toronto" }) : "";
      const formatDate = (d) => d.toLocaleDateString("en-CA", { timeZone: "America/Toronto" });
      const workerTotals = {};
      const csvDataLines = logs.map((log2) => {
        const timeIn = log2.timeIn ? new Date(log2.timeIn) : null;
        const timeOut = log2.timeOut ? new Date(log2.timeOut) : null;
        const hours = timeIn && timeOut ? (timeOut.getTime() - timeIn.getTime()) / 36e5 : 0;
        const wName = log2.workerName || "Unknown";
        if (!workerTotals[log2.workerId]) {
          workerTotals[log2.workerId] = { name: wName, hours: 0 };
        }
        workerTotals[log2.workerId].hours += hours;
        return `"${wName}","${log2.workplaceName || ""}","${log2.shiftDate || ""}","${formatTime(timeIn)}","${formatTime(timeOut)}",${hours.toFixed(2)},"${log2.status}"`;
      });
      const grandTotal = Object.values(workerTotals).reduce((sum, w) => sum + w.hours, 0);
      const summaryLines = [
        "",
        "SUMMARY",
        "Worker,Total Hours",
        ...Object.values(workerTotals).map((w) => `"${w.name}",${w.hours.toFixed(2)}`),
        `"GRAND TOTAL",${grandTotal.toFixed(2)}`
      ];
      const csvLines = [
        "Worker Name,Workplace,Shift Date,Time In,Time Out,Hours,Status",
        ...csvDataLines,
        ...summaryLines
      ];
      const csvContent = csvLines.join("\n");
      const dateRange = `${formatDate(startDate)} to ${formatDate(endDate)}`;
      const filename = `tito-timesheet-${formatDate(startDate)}-to-${formatDate(endDate)}.csv`;
      const emailSubject = subject || `WFConnect ${periodLabel} Timesheet - ${dateRange}`;
      const bodyText = `Please find attached the ${periodLabel} TITO timesheet report.

Period: ${dateRange}
Total Records: ${logs.length}
Total Hours: ${grandTotal.toFixed(2)}

- WFConnect`;
      const result = await sendCSVEmail(to, emailSubject, bodyText, csvContent, filename);
      if (result.success) {
        res.json({ success: true, message: `${periodLabel} timesheet emailed to ${to}`, period: dateRange, totalRecords: logs.length, totalHours: grandTotal.toFixed(2) });
      } else {
        res.status(500).json({ error: result.error || "Failed to send email" });
      }
    } catch (error) {
      console.error("Error emailing TITO timesheet:", error);
      res.status(500).json({ error: "Failed to email timesheet" });
    }
  });
  app2.post("/api/tito/:id/approve", checkRoles("admin", "hr", "client"), async (req, res) => {
    try {
      const titoLogId = req.params.id;
      const userId = req.headers["x-user-id"];
      const [log2] = await db.select().from(titoLogs).where(eq4(titoLogs.id, titoLogId));
      if (!log2) {
        res.status(404).json({ error: "TITO log not found" });
        return;
      }
      await db.update(titoLogs).set({ status: "approved", approvedBy: userId, approvedAt: /* @__PURE__ */ new Date(), updatedAt: /* @__PURE__ */ new Date() }).where(eq4(titoLogs.id, titoLogId));
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
      const [log2] = await db.select().from(titoLogs).where(eq4(titoLogs.id, titoLogId));
      if (!log2) {
        res.status(404).json({ error: "TITO log not found" });
        return;
      }
      await db.update(titoLogs).set({ status: "disputed", disputedBy: userId, disputedAt: /* @__PURE__ */ new Date(), notes: reason || null, updatedAt: /* @__PURE__ */ new Date() }).where(eq4(titoLogs.id, titoLogId));
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
  app2.post("/api/tito/:id/cancel", async (req, res) => {
    try {
      const userId = req.headers["x-user-id"];
      const titoLogId = req.params.id;
      if (!userId) {
        res.status(401).json({ error: "Authentication required" });
        return;
      }
      const [log2] = await db.select().from(titoLogs).where(eq4(titoLogs.id, titoLogId));
      if (!log2) {
        res.status(404).json({ error: "TITO log not found" });
        return;
      }
      if (log2.workerId !== userId) {
        res.status(403).json({ error: "You can only cancel your own clock-in" });
        return;
      }
      if (log2.timeOut) {
        res.status(400).json({ error: "Cannot cancel a completed clock-in/out record" });
        return;
      }
      if (log2.status === "canceled") {
        res.json({ success: true, message: "Already canceled", alreadyCanceled: true });
        return;
      }
      const clockInTime = log2.timeIn ? new Date(log2.timeIn).getTime() : 0;
      const elapsed = Date.now() - clockInTime;
      const twoMinutes = 2 * 60 * 1e3;
      if (elapsed > twoMinutes) {
        res.status(400).json({ error: "Cancel window has expired. You can only cancel within 2 minutes of clocking in." });
        return;
      }
      await db.update(titoLogs).set({ status: "canceled", notes: "Accidental clock-in", updatedAt: /* @__PURE__ */ new Date() }).where(eq4(titoLogs.id, titoLogId));
      await db.insert(auditLog).values({
        userId,
        action: "TITO_CANCELED",
        entityType: "tito_log",
        entityId: titoLogId,
        details: JSON.stringify({ reason: "Accidental clock-in", elapsedMs: elapsed })
      });
      console.log(`[TITO] Clock-in canceled: worker ${userId}, titoLogId=${titoLogId}, elapsed=${Math.round(elapsed / 1e3)}s`);
      res.json({ success: true, message: "Clock-in canceled" });
    } catch (error) {
      console.error("Error canceling TITO log:", error);
      res.status(500).json({ error: "Failed to cancel clock-in" });
    }
  });
  app2.post("/api/tito/:id/correction", async (req, res) => {
    try {
      const userId = req.headers["x-user-id"];
      const titoLogId = req.params.id;
      const { reason, note } = req.body;
      if (!userId) {
        res.status(401).json({ error: "Authentication required" });
        return;
      }
      if (!reason) {
        res.status(400).json({ error: "Reason is required for correction requests" });
        return;
      }
      const [log2] = await db.select().from(titoLogs).where(eq4(titoLogs.id, titoLogId));
      if (!log2) {
        res.status(404).json({ error: "TITO log not found" });
        return;
      }
      if (log2.workerId !== userId) {
        res.status(403).json({ error: "You can only request corrections for your own records" });
        return;
      }
      const existingPending = await db.select().from(titoCorrections).where(and3(
        eq4(titoCorrections.titoLogId, titoLogId),
        eq4(titoCorrections.status, "pending")
      )).limit(1);
      if (existingPending.length > 0) {
        res.status(400).json({ error: "A correction request is already pending for this record" });
        return;
      }
      const [correction] = await db.insert(titoCorrections).values({
        titoLogId,
        requesterId: userId,
        originalTimeIn: log2.timeIn,
        originalTimeOut: log2.timeOut,
        reason,
        note: note || null,
        status: "pending"
      }).returning();
      await db.insert(auditLog).values({
        userId,
        action: "TITO_CORRECTION_REQUESTED",
        entityType: "tito_correction",
        entityId: correction.id,
        details: JSON.stringify({ titoLogId, reason, note })
      });
      const hrAdmins = await db.select({ id: users.id }).from(users).where(
        and3(inArray(users.role, ["admin", "hr"]), eq4(users.isActive, true))
      );
      for (const admin of hrAdmins) {
        await db.insert(appNotifications).values({
          userId: admin.id,
          type: "tito_correction",
          title: "TITO Correction Request",
          body: `A worker has requested a time correction: ${reason}`
        });
      }
      console.log(`[TITO] Correction requested: worker ${userId}, titoLogId=${titoLogId}, correctionId=${correction.id}`);
      res.json({ success: true, correctionId: correction.id });
    } catch (error) {
      console.error("Error requesting TITO correction:", error);
      res.status(500).json({ error: "Failed to submit correction request" });
    }
  });
  app2.post("/api/tito/corrections/:id/review", checkRoles("admin", "hr"), async (req, res) => {
    try {
      const userId = req.headers["x-user-id"];
      const correctionId = req.params.id;
      const { action, correctedTimeIn, correctedTimeOut } = req.body;
      if (!action || !["approved", "rejected"].includes(action)) {
        res.status(400).json({ error: "action must be 'approved' or 'rejected'" });
        return;
      }
      const [correction] = await db.select().from(titoCorrections).where(eq4(titoCorrections.id, correctionId));
      if (!correction) {
        res.status(404).json({ error: "Correction request not found" });
        return;
      }
      if (correction.status !== "pending") {
        res.status(400).json({ error: "This correction has already been reviewed" });
        return;
      }
      const updateData = {
        status: action,
        approverId: userId,
        reviewedAt: /* @__PURE__ */ new Date()
      };
      if (action === "approved") {
        if (correctedTimeIn) updateData.correctedTimeIn = new Date(correctedTimeIn);
        if (correctedTimeOut) updateData.correctedTimeOut = new Date(correctedTimeOut);
        const titoUpdate = { updatedAt: /* @__PURE__ */ new Date() };
        if (correctedTimeIn) titoUpdate.timeIn = new Date(correctedTimeIn);
        if (correctedTimeOut) titoUpdate.timeOut = new Date(correctedTimeOut);
        await db.update(titoLogs).set(titoUpdate).where(eq4(titoLogs.id, correction.titoLogId));
      }
      await db.update(titoCorrections).set(updateData).where(eq4(titoCorrections.id, correctionId));
      await db.insert(auditLog).values({
        userId,
        action: action === "approved" ? "TITO_CORRECTION_APPROVED" : "TITO_CORRECTION_REJECTED",
        entityType: "tito_correction",
        entityId: correctionId,
        details: JSON.stringify({ titoLogId: correction.titoLogId, correctedTimeIn, correctedTimeOut })
      });
      await db.insert(appNotifications).values({
        userId: correction.requesterId,
        type: "tito_correction",
        title: `Correction ${action === "approved" ? "Approved" : "Rejected"}`,
        body: action === "approved" ? "Your time correction request has been approved." : "Your time correction request has been rejected."
      });
      res.json({ success: true, message: `Correction ${action}` });
    } catch (error) {
      console.error("Error reviewing TITO correction:", error);
      res.status(500).json({ error: "Failed to review correction" });
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
        profilePhotoUrl: users.profilePhotoUrl,
        createdAt: users.createdAt
      }).from(users).where(eq4(users.role, "worker")).orderBy(desc2(users.createdAt));
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
      }).from(shifts).leftJoin(workplaces, eq4(shifts.workplaceId, workplaces.id)).leftJoin(users, eq4(shifts.workerUserId, users.id)).where(
        role === "worker" ? and3(eq4(shifts.date, today), eq4(shifts.workerUserId, userId), ne2(shifts.status, "cancelled")) : and3(eq4(shifts.date, today), ne2(shifts.status, "cancelled"))
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
        }).from(shiftOffers).innerJoin(shifts, eq4(shiftOffers.shiftId, shifts.id)).leftJoin(workplaces, eq4(shifts.workplaceId, workplaces.id)).where(
          and3(
            eq4(shiftOffers.workerId, userId),
            eq4(shiftOffers.status, "pending")
          )
        ).orderBy(shifts.date);
      }
      let pendingRequestsCount = 0;
      let unfilledTodayCount = 0;
      if (role === "admin" || role === "hr") {
        const [reqCount] = await db.select({ count: sql3`count(*)::int` }).from(shiftRequests).where(eq4(shiftRequests.status, "pending"));
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
        conditions.push(gte2(shifts.date, today));
      }
      if (role === "worker") {
        conditions.push(eq4(shifts.workerUserId, userId));
      }
      if (workplaceId) {
        conditions.push(eq4(shifts.workplaceId, workplaceId));
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
      }).from(shifts).leftJoin(workplaces, eq4(shifts.workplaceId, workplaces.id)).leftJoin(users, eq4(shifts.workerUserId, users.id)).where(conditions.length > 0 ? and3(...conditions) : void 0).orderBy(desc2(shifts.date));
      res.json(result);
    } catch (error) {
      console.error("Error fetching shifts:", error);
      res.status(500).json({ error: "Failed to fetch shifts" });
    }
  });
  app2.post("/api/shifts", checkRoles("admin", "hr"), async (req, res) => {
    try {
      const userId = req.headers["x-user-id"];
      const { workplaceId, workerUserId, title, date: date2, startTime, endTime, notes, frequencyType, category, recurringDays, recurringEndDate, blastToAll, workersNeeded } = req.body;
      const freq = frequencyType || "one-time";
      const cat = category || "janitorial";
      const isOpenEnded = freq === "open-ended";
      if (!workplaceId || !title || !date2 || !startTime) {
        res.status(400).json({ error: "workplaceId, title, date, and startTime are required" });
        return;
      }
      if (!blastToAll && !workerUserId) {
        res.status(400).json({ error: "workerUserId is required when not blasting to all workers" });
        return;
      }
      if (freq === "recurring" && (!recurringDays || recurringDays.length === 0)) {
        res.status(400).json({ error: "recurringDays are required for recurring shifts" });
        return;
      }
      const [workplace] = await db.select().from(workplaces).where(eq4(workplaces.id, workplaceId));
      if (!workplace) {
        res.status(404).json({ error: "Workplace not found" });
        return;
      }
      if (!blastToAll) {
        const [worker] = await db.select().from(users).where(and3(eq4(users.id, workerUserId), eq4(users.role, "worker")));
        if (!worker) {
          res.status(404).json({ error: "Worker not found" });
          return;
        }
      }
      if (freq === "recurring" && recurringDays) {
        const days = typeof recurringDays === "string" ? recurringDays.split(",") : recurringDays;
        const endType = recurringEndDate ? "date" : "never";
        const [newSeries] = await db.insert(shiftSeries).values({
          workplaceId,
          workerUserId: blastToAll ? null : workerUserId,
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
          workerUserId: blastToAll ? null : workerUserId,
          title,
          date: date2,
          startTime,
          endTime: isOpenEnded ? null : endTime,
          notes: notes || null,
          status: "scheduled",
          frequencyType: freq,
          category: cat,
          createdByUserId: userId,
          workersNeeded: blastToAll && workersNeeded ? workersNeeded : null
        }).returning();
        if (blastToAll) {
          const eligibleWorkers = await db.select({ id: users.id, fullName: users.fullName, phone: users.phone }).from(users).where(and3(eq4(users.role, "worker"), eq4(users.isActive, true)));
          let offersCreated = 0;
          const offerIds = [];
          for (const w of eligibleWorkers) {
            try {
              const [offer] = await db.insert(shiftOffers).values({
                shiftId: newShift.id,
                workerId: w.id,
                offeredByUserId: userId,
                status: "pending"
              }).returning();
              offersCreated++;
              offerIds.push({ workerId: w.id, offerId: offer.id, phone: w.phone });
              await db.insert(appNotifications).values({
                userId: w.id,
                type: "shift_offer",
                title: "New Shift Available",
                body: `A new ${cat} shift "${title}" on ${date2} is available. Tap to view and accept.`,
                deepLink: `/shift-offers`
              });
            } catch (e) {
            }
          }
          sendPushNotifications(
            eligibleWorkers.map((w) => w.id),
            "New Shift Available",
            `A new ${cat} shift "${title}" on ${date2} is available.`,
            { type: "shift_offer", shiftId: newShift.id }
          );
          for (const o of offerIds) {
            const worker = eligibleWorkers.find((w) => w.id === o.workerId);
            if (worker?.phone) {
              sendShiftOfferSMS(
                { id: worker.id, fullName: worker.fullName, phone: worker.phone },
                newShift,
                o.offerId
              ).catch((err) => console.error(`[OPENPHONE] SMS error for worker ${worker.id}:`, err));
            }
          }
          broadcast({ type: "shift_blast", data: { shiftId: newShift.id, offersCreated } });
          broadcast({ type: "created", entity: "shift", id: newShift.id, data: { workplaceId, blasted: true } });
          res.status(201).json({ ...newShift, blasted: true, offersCreated, totalWorkers: eligibleWorkers.length });
        } else {
          broadcast({ type: "created", entity: "shift", id: newShift.id, data: { workerUserId, workplaceId } });
          res.status(201).json(newShift);
        }
      }
    } catch (error) {
      console.error("Error creating shift:", error);
      res.status(500).json({ error: "Failed to create shift" });
    }
  });
  app2.patch("/api/shifts/:id", checkRoles("admin", "hr"), async (req, res) => {
    try {
      const { title, date: date2, startTime, endTime, notes, status } = req.body;
      const [existing] = await db.select().from(shifts).where(eq4(shifts.id, req.params.id));
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
      const [updated] = await db.update(shifts).set(updates).where(eq4(shifts.id, req.params.id)).returning();
      broadcast({ type: "updated", entity: "shift", id: updated.id, data: { workerUserId: existing.workerUserId, workplaceId: existing.workplaceId } });
      res.json(updated);
    } catch (error) {
      console.error("Error updating shift:", error);
      res.status(500).json({ error: "Failed to update shift" });
    }
  });
  app2.delete("/api/shifts/:id", checkRoles("admin", "hr"), async (req, res) => {
    try {
      const [existing] = await db.select().from(shifts).where(eq4(shifts.id, req.params.id));
      if (!existing) {
        res.status(404).json({ error: "Shift not found" });
        return;
      }
      await db.delete(shiftOffers).where(eq4(shiftOffers.shiftId, req.params.id));
      await db.delete(shiftCheckins).where(eq4(shiftCheckins.shiftId, req.params.id));
      const childShifts = await db.select({ id: shifts.id }).from(shifts).where(eq4(shifts.parentShiftId, req.params.id));
      if (childShifts.length > 0) {
        const childIds = childShifts.map((c) => c.id);
        await db.delete(shiftOffers).where(inArray(shiftOffers.shiftId, childIds));
        await db.delete(shiftCheckins).where(inArray(shiftCheckins.shiftId, childIds));
        await db.delete(shifts).where(eq4(shifts.parentShiftId, req.params.id));
      }
      await db.delete(shifts).where(eq4(shifts.id, req.params.id));
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
      const conditions = [eq4(shiftSeries.status, statusFilter)];
      if (workplaceIdFilter) {
        conditions.push(eq4(shiftSeries.workplaceId, workplaceIdFilter));
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
      }).from(shiftSeries).leftJoin(workplaces, eq4(shiftSeries.workplaceId, workplaces.id)).leftJoin(users, eq4(shiftSeries.workerUserId, users.id)).where(and3(...conditions)).orderBy(desc2(shiftSeries.startDate));
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
      }).from(shiftSeries).leftJoin(workplaces, eq4(shiftSeries.workplaceId, workplaces.id)).leftJoin(users, eq4(shiftSeries.workerUserId, users.id)).where(eq4(shiftSeries.id, req.params.id));
      if (!series) {
        res.status(404).json({ error: "Shift series not found" });
        return;
      }
      const exceptions = await db.select().from(recurrenceExceptions).where(eq4(recurrenceExceptions.seriesId, req.params.id));
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
      const [existing] = await db.select().from(shiftSeries).where(eq4(shiftSeries.id, req.params.id));
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
      const [updated] = await db.update(shiftSeries).set(updates).where(eq4(shiftSeries.id, req.params.id)).returning();
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
      const [existing] = await db.select().from(shiftSeries).where(eq4(shiftSeries.id, req.params.id));
      if (!existing) {
        res.status(404).json({ error: "Shift series not found" });
        return;
      }
      await db.delete(recurrenceExceptions).where(eq4(recurrenceExceptions.seriesId, req.params.id));
      await db.delete(shiftSeries).where(eq4(shiftSeries.id, req.params.id));
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
      const [existing] = await db.select().from(shiftSeries).where(eq4(shiftSeries.id, req.params.id));
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
      const [existing] = await db.select().from(shiftSeries).where(eq4(shiftSeries.id, req.params.id));
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
        }).where(eq4(shiftSeries.id, req.params.id));
      }
      await db.delete(recurrenceExceptions).where(
        and3(
          eq4(recurrenceExceptions.seriesId, req.params.id),
          gte2(recurrenceExceptions.date, fromDate)
        )
      );
      await db.insert(auditLog).values({
        userId,
        action: "delete_future_occurrences",
        entityType: "shift_series",
        entityId: req.params.id,
        details: JSON.stringify({ fromDate })
      });
      const [updated] = await db.select().from(shiftSeries).where(eq4(shiftSeries.id, req.params.id));
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
      const [existing] = await db.select().from(shiftSeries).where(eq4(shiftSeries.id, req.params.id));
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
      }).from(shiftSeries).leftJoin(users, eq4(shiftSeries.workerUserId, users.id)).where(eq4(shiftSeries.id, req.params.id));
      if (!series) {
        res.status(404).json({ error: "Shift series not found" });
        return;
      }
      const exceptions = await db.select().from(recurrenceExceptions).where(eq4(recurrenceExceptions.seriesId, req.params.id));
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
      }).from(shifts).leftJoin(users, eq4(shifts.workerUserId, users.id)).where(and3(
        eq4(shifts.workplaceId, workplaceId),
        gte2(shifts.date, startDateParam),
        lte2(shifts.date, endDateParam)
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
      }).from(shiftSeries).leftJoin(users, eq4(shiftSeries.workerUserId, users.id)).where(and3(
        eq4(shiftSeries.workplaceId, workplaceId),
        eq4(shiftSeries.status, "active")
      ));
      const seriesItems = [];
      for (const s of activeSeries) {
        const exceptions = await db.select().from(recurrenceExceptions).where(eq4(recurrenceExceptions.seriesId, s.id));
        const occurrences = expandSeriesOccurrences(s, exceptions, startDateParam, endDateParam);
        for (const occ of occurrences) {
          let workerName = s.workerName;
          if (occ.isException && occ.exceptionType === "modified" && occ.workerUserId && occ.workerUserId !== s.workerUserId) {
            const [overrideWorker] = await db.select({ fullName: users.fullName }).from(users).where(eq4(users.id, occ.workerUserId));
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
      }).from(timesheets).leftJoin(users, eq4(timesheets.workerUserId, users.id)).where(eq4(timesheets.periodYear, year)).orderBy(desc2(timesheets.submittedAt));
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
      }).from(timesheets).leftJoin(users, eq4(timesheets.workerUserId, users.id)).where(eq4(timesheets.id, id));
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
      }).from(timesheetEntries).leftJoin(workplaces, eq4(timesheetEntries.workplaceId, workplaces.id)).where(eq4(timesheetEntries.timesheetId, id)).orderBy(timesheetEntries.dateLocal);
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
      const [timesheet] = await db.select().from(timesheets).where(eq4(timesheets.id, id));
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
      }).where(eq4(timesheets.id, id)).returning();
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
      const [timesheet] = await db.select().from(timesheets).where(eq4(timesheets.id, id));
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
      }).where(eq4(timesheets.id, id)).returning();
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
      const [existingBatch] = await db.select().from(payrollBatches).where(and3(
        eq4(payrollBatches.periodYear, year),
        eq4(payrollBatches.periodNumber, periodNumber)
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
        }).from(payrollBatchItems).leftJoin(users, eq4(payrollBatchItems.workerUserId, users.id)).where(eq4(payrollBatchItems.payrollBatchId, existingBatch.id));
        res.json({ ...existingBatch, items: items2 });
        return;
      }
      const approvedTimesheets = await db.select().from(timesheets).where(and3(
        eq4(timesheets.periodYear, year),
        eq4(timesheets.periodNumber, periodNumber),
        eq4(timesheets.status, "approved")
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
      let results = await db.select().from(payrollBatches).where(eq4(payrollBatches.periodYear, year)).orderBy(desc2(payrollBatches.createdAt));
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
      const [batch] = await db.select().from(payrollBatches).where(eq4(payrollBatches.id, id));
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
      }).from(payrollBatchItems).leftJoin(users, eq4(payrollBatchItems.workerUserId, users.id)).where(eq4(payrollBatchItems.payrollBatchId, id));
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
      const [batch] = await db.select().from(payrollBatches).where(eq4(payrollBatches.id, id));
      if (!batch) {
        res.status(404).json({ error: "Payroll batch not found" });
        return;
      }
      if (batch.status !== "open") {
        res.status(400).json({ error: "Only open batches can be finalized" });
        return;
      }
      const items = await db.select().from(payrollBatchItems).where(and3(
        eq4(payrollBatchItems.payrollBatchId, id),
        eq4(payrollBatchItems.status, "included")
      ));
      for (const item of items) {
        await db.update(timesheets).set({ status: "processed", updatedAt: /* @__PURE__ */ new Date() }).where(eq4(timesheets.id, item.timesheetId));
      }
      const [updated] = await db.update(payrollBatches).set({
        status: "finalized",
        finalizedByUserId: userId,
        finalizedAt: /* @__PURE__ */ new Date(),
        updatedAt: /* @__PURE__ */ new Date()
      }).where(eq4(payrollBatches.id, id)).returning();
      res.json(updated);
    } catch (error) {
      console.error("Error finalizing payroll batch:", error);
      res.status(500).json({ error: "Failed to finalize payroll batch" });
    }
  });
  app2.get("/api/payroll/batches/:id/export.csv", checkRoles("admin"), async (req, res) => {
    try {
      const { id } = req.params;
      const [batch] = await db.select().from(payrollBatches).where(eq4(payrollBatches.id, id));
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
      }).from(payrollBatchItems).leftJoin(users, eq4(payrollBatchItems.workerUserId, users.id)).where(and3(
        eq4(payrollBatchItems.payrollBatchId, id),
        eq4(payrollBatchItems.status, "included")
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
  app2.post("/api/payroll/batches/:id/email", checkRoles("admin", "hr"), async (req, res) => {
    try {
      const { id } = req.params;
      const { to, subject } = req.body;
      if (!to || typeof to !== "string" || !to.includes("@")) {
        res.status(400).json({ error: "Valid email address is required" });
        return;
      }
      const [batch] = await db.select().from(payrollBatches).where(eq4(payrollBatches.id, id));
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
      }).from(payrollBatchItems).leftJoin(users, eq4(payrollBatchItems.workerUserId, users.id)).where(and3(
        eq4(payrollBatchItems.payrollBatchId, id),
        eq4(payrollBatchItems.status, "included")
      ));
      const csvLines = [
        "Worker Name,Worker Email,Hours,Amount,Period,Date Range",
        ...items.map(
          (item) => `"${item.workerName || ""}","${item.workerEmail || ""}",${item.hours},${item.amount},Period ${batch.periodNumber},"${dateRange}"`
        )
      ];
      const csvContent = csvLines.join("\n");
      const filename = `payroll-period-${batch.periodNumber}-${batch.periodYear}.csv`;
      const emailSubject = subject || `WFConnect Payroll - Period ${batch.periodNumber} (${dateRange})`;
      const bodyText = `Please find attached the payroll report for Period ${batch.periodNumber} (${dateRange}).

This report includes ${items.length} worker(s).

- WFConnect`;
      const result = await sendCSVEmail(to, emailSubject, bodyText, csvContent, filename);
      if (result.success) {
        res.json({ success: true, message: `Payroll CSV sent to ${to}` });
      } else {
        res.status(500).json({ error: result.error || "Failed to send email" });
      }
    } catch (error) {
      console.error("Error emailing payroll batch:", error);
      res.status(500).json({ error: "Failed to email payroll batch" });
    }
  });
  app2.get("/api/places/autocomplete", async (req, res) => {
    try {
      const { input, country } = req.query;
      console.info("[PLACES] autocomplete:REQUEST_RECEIVED", {
        inputLength: typeof input === "string" ? input.trim().length : 0,
        country: typeof country === "string" ? country.toUpperCase() : "CA"
      });
      if (!input || typeof input !== "string" || input.trim().length < MIN_ADDRESS_AUTOCOMPLETE_INPUT_LENGTH) {
        res.json({ predictions: [] });
        return;
      }
      if (typeof country === "string" && country.toUpperCase() !== "CA") {
        res.status(400).json({ error: "Only Canadian addresses are supported." });
        return;
      }
      const ip = getClientIp(req);
      if (!checkPlacesRateLimit(ip)) {
        console.warn("[PLACES] autocomplete:RATE_LIMITED", { ipPresent: Boolean(ip) });
        res.status(429).json({ error: "Too many requests. Please try again later." });
        return;
      }
      const lookup = await fetchGooglePlacesAutocomplete(input.trim());
      if (!lookup.ok) {
        const failureStage = lookup.failureStage || "unknown";
        const failureCategory = lookup.failureCategory || "UPSTREAM_ERROR";
        console.error("[PLACES] autocomplete:LOOKUP_FAILED", {
          failureStage,
          failureCategory,
          httpStatus: lookup.httpStatus
        });
        res.status(lookup.httpStatus).json({
          error: lookup.message,
          failureStage,
          failureCategory,
          retryable: isGooglePlacesFailureRetryable(failureCategory, failureStage)
        });
        return;
      }
      res.json({
        predictions: lookup.predictions.filter((prediction) => prediction.place_id && prediction.description).map((prediction) => ({
          place_id: prediction.place_id,
          description: prediction.description,
          structured_formatting: prediction.structured_formatting
        }))
      });
      console.info("[PLACES] autocomplete:SUCCESS", {
        predictionCount: lookup.predictions.length
      });
    } catch (error) {
      console.error("[PLACES] autocomplete:INTERNAL_ERROR", { message: error instanceof Error ? error.message : String(error) });
      res.status(500).json({
        error: "Failed to fetch address suggestions",
        failureStage: "route_handler",
        failureCategory: "UPSTREAM_ERROR",
        retryable: true
      });
    }
  });
  app2.get("/api/places/details/:placeId", async (req, res) => {
    try {
      const { placeId } = req.params;
      console.info("[PLACES] details:REQUEST_RECEIVED", {
        placeIdLength: typeof placeId === "string" ? placeId.length : 0
      });
      if (!placeId || typeof placeId !== "string") {
        res.status(400).json({ error: "Place ID is required" });
        return;
      }
      const ip = getClientIp(req);
      if (!checkPlacesRateLimit(ip)) {
        console.warn("[PLACES] details:RATE_LIMITED", { ipPresent: Boolean(ip) });
        res.status(429).json({ error: "Too many requests. Please try again later." });
        return;
      }
      const lookup = await fetchGooglePlaceDetails(placeId);
      if (!lookup.ok) {
        const failureStage = lookup.failureStage || "unknown";
        const failureCategory = lookup.failureCategory || "UPSTREAM_ERROR";
        console.error("[PLACES] details:LOOKUP_FAILED", {
          failureStage,
          failureCategory,
          httpStatus: lookup.httpStatus
        });
        res.status(lookup.httpStatus).json({
          error: lookup.message,
          failureStage,
          failureCategory,
          retryable: isGooglePlacesFailureRetryable(failureCategory, failureStage)
        });
        return;
      }
      res.json(lookup.details);
      console.info("[PLACES] details:SUCCESS");
    } catch (error) {
      console.error("[PLACES] details:INTERNAL_ERROR", { message: error instanceof Error ? error.message : String(error) });
      res.status(500).json({
        error: "Failed to fetch address details",
        failureStage: "route_handler",
        failureCategory: "UPSTREAM_ERROR",
        retryable: true
      });
    }
  });
  app2.get("/api/places/health", async (req, res) => {
    try {
      const keyConfigured = getGooglePlacesApiKey() !== null;
      const liveProbe = req.query.probe === "1";
      if (!liveProbe) {
        res.json({
          configured: keyConfigured,
          liveTest: null
        });
        return;
      }
      if (!PLACES_HEALTH_PROBE_TOKEN) {
        res.status(401).json({ error: "Unauthorized" });
        return;
      }
      if (!isAuthorizedPlacesProbeRequest(req)) {
        res.status(401).json({ error: "Unauthorized" });
        return;
      }
      const ip = getClientIp(req);
      if (!checkPlacesHealthProbeRateLimit(ip)) {
        console.warn("[PLACES] health:PROBE_RATE_LIMITED", { ipPresent: Boolean(ip) });
        res.status(429).json({ error: "Too many probe requests. Please try again later." });
        return;
      }
      const probe = await probeGooglePlacesApiKey();
      res.json({
        configured: probe.configured,
        envVar: probe.envVar,
        liveTest: {
          working: probe.working,
          failureCategory: probe.failureCategory,
          errorMessage: probe.errorMessage
        }
      });
    } catch (error) {
      console.error("[PLACES] health:ERROR", { message: error instanceof Error ? error.message : String(error) });
      res.status(500).json({ error: "Failed to check Places API health" });
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
        }).from(shiftRequests).leftJoin(workplaces, eq4(shiftRequests.workplaceId, workplaces.id)).leftJoin(users, eq4(shiftRequests.clientId, users.id)).orderBy(desc2(shiftRequests.createdAt));
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
        }).from(shiftRequests).leftJoin(workplaces, eq4(shiftRequests.workplaceId, workplaces.id)).leftJoin(users, eq4(shiftRequests.clientId, users.id)).where(eq4(shiftRequests.clientId, userId)).orderBy(desc2(shiftRequests.createdAt));
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
        const [wp] = newRequest.workplaceId ? await db.select().from(workplaces).where(eq4(workplaces.id, newRequest.workplaceId)) : [null];
        const wpName = wp?.name || "a workplace";
        const adminsAndHR = await db.select({ id: users.id }).from(users).where(and3(
          or(eq4(users.role, "admin"), eq4(users.role, "hr")),
          eq4(users.isActive, true),
          ne2(users.id, userId)
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
        const [existing] = await db.select().from(shiftRequests).where(eq4(shiftRequests.id, requestId));
        if (!existing) {
          res.status(404).json({ error: "Shift request not found" });
          return;
        }
        const [updated] = await db.update(shiftRequests).set({ ...updates, updatedAt: /* @__PURE__ */ new Date() }).where(eq4(shiftRequests.id, requestId)).returning();
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
      const [existing] = await db.select().from(shiftRequests).where(eq4(shiftRequests.id, requestId));
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
      const associatedShifts = await db.select({ id: shifts.id }).from(shifts).where(eq4(shifts.requestId, requestId));
      if (associatedShifts.length > 0) {
        const shiftIds = associatedShifts.map((s) => s.id);
        await db.delete(shiftOffers).where(inArray(shiftOffers.shiftId, shiftIds));
        await db.delete(shiftCheckins).where(inArray(shiftCheckins.shiftId, shiftIds));
        await db.delete(shifts).where(eq4(shifts.requestId, requestId));
      }
      await db.delete(shiftRequests).where(eq4(shiftRequests.id, requestId));
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
        const [request] = await db.select().from(shiftRequests).where(eq4(shiftRequests.id, requestId));
        if (!request) {
          res.status(404).json({ error: "Shift request not found" });
          return;
        }
        const [workplace] = await db.select().from(workplaces).where(eq4(workplaces.id, request.workplaceId));
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
          await db.update(shiftRequests).set({ status: "filled", updatedAt: /* @__PURE__ */ new Date() }).where(eq4(shiftRequests.id, requestId));
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
          db.select({ id: users.id, fullName: users.fullName, phone: users.phone }).from(users).where(eq4(users.id, workerId)).then(([worker]) => {
            if (worker?.phone) {
              sendShiftAssignedSMS(
                { id: worker.id, fullName: worker.fullName, phone: worker.phone },
                newShift
              ).catch((err) => console.error(`[OPENPHONE] Assigned SMS error:`, err));
            }
          }).catch((err) => console.error(`[OPENPHONE] Worker lookup error:`, err));
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
            workerRoles: users.workerRoles,
            phone: users.phone
          }).from(users).where(and3(
            eq4(users.role, "worker"),
            eq4(users.isActive, true)
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
          }).from(shifts).where(and3(
            eq4(shifts.date, request.date),
            not(isNull2(shifts.workerUserId)),
            ne2(shifts.status, "cancelled")
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
          const broadcastOfferIds = [];
          let offerErrors = 0;
          console.log(`[BROADCAST] Shift ${newShift.id}: ${eligibleWorkers.length} eligible workers found`);
          for (const worker of eligibleWorkers) {
            try {
              const [offer] = await db.insert(shiftOffers).values({
                shiftId: newShift.id,
                workerId: worker.id,
                status: "pending"
              }).returning();
              await db.insert(appNotifications).values({
                userId: worker.id,
                type: "shift_offer",
                title: "New Shift Available",
                body: `A ${request.roleType} shift at ${workplace?.name || "a workplace"} on ${request.date} is available. Tap to accept.`,
                deepLink: `/shift-offers`
              });
              offeredWorkerIds.push(worker.id);
              broadcastOfferIds.push({ workerId: worker.id, offerId: offer.id });
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
          for (const o of broadcastOfferIds) {
            const worker = eligibleWorkers.find((w) => w.id === o.workerId);
            if (worker?.phone) {
              sendShiftOfferSMS(
                { id: worker.id, fullName: worker.fullName, phone: worker.phone },
                newShift,
                o.offerId
              ).catch((err) => console.error(`[OPENPHONE] Broadcast SMS error for worker ${worker.id}:`, err));
            }
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
          await db.update(shiftRequests).set({ status: "offered", updatedAt: /* @__PURE__ */ new Date() }).where(eq4(shiftRequests.id, requestId));
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
        const requestShifts = await db.select({ id: shifts.id }).from(shifts).where(eq4(shifts.requestId, requestId));
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
        }).from(shiftOffers).leftJoin(users, eq4(shiftOffers.workerId, users.id)).where(inArray(shiftOffers.shiftId, shiftIds)).orderBy(desc2(shiftOffers.offeredAt));
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
        const conditions = [eq4(shiftOffers.workerId, userId)];
        if (statusFilter && statusFilter !== "all") {
          conditions.push(eq4(shiftOffers.status, statusFilter));
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
        }).from(shiftOffers).innerJoin(shifts, eq4(shiftOffers.shiftId, shifts.id)).leftJoin(workplaces, eq4(shifts.workplaceId, workplaces.id)).where(and3(...conditions)).orderBy(desc2(shiftOffers.offeredAt));
      } else if (role === "admin" || role === "hr") {
        const conditions = [];
        if (statusFilter && statusFilter !== "all") {
          conditions.push(eq4(shiftOffers.status, statusFilter));
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
        }).from(shiftOffers).innerJoin(shifts, eq4(shiftOffers.shiftId, shifts.id)).leftJoin(workplaces, eq4(shifts.workplaceId, workplaces.id)).leftJoin(users, eq4(shiftOffers.workerId, users.id)).where(conditions.length > 0 ? and3(...conditions) : void 0).orderBy(desc2(shiftOffers.offeredAt));
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
        const [offer] = await db.select().from(shiftOffers).where(eq4(shiftOffers.id, offerId));
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
          const [shift] = await db.select().from(shifts).where(eq4(shifts.id, offer.shiftId));
          if (!shift) {
            res.status(404).json({ error: "Associated shift not found" });
            return;
          }
          const existingAccepted = await db.select({ count: sql3`count(*)::int` }).from(shiftOffers).where(and3(
            eq4(shiftOffers.shiftId, offer.shiftId),
            eq4(shiftOffers.status, "accepted")
          ));
          const currentAccepted = existingAccepted[0]?.count || 0;
          const neededForShift = shift.workersNeeded || 1;
          if (currentAccepted >= neededForShift) {
            res.status(409).json({ error: "This shift has already been filled with enough workers" });
            return;
          }
          await db.update(shiftOffers).set({ status: "accepted", respondedAt: /* @__PURE__ */ new Date() }).where(eq4(shiftOffers.id, offerId));
          if (!shift.workerUserId) {
            await db.update(shifts).set({ workerUserId: userId, updatedAt: /* @__PURE__ */ new Date() }).where(eq4(shifts.id, offer.shiftId));
          }
          const acceptedCount = await db.select({ count: sql3`count(*)::int` }).from(shiftOffers).where(and3(
            eq4(shiftOffers.shiftId, offer.shiftId),
            eq4(shiftOffers.status, "accepted")
          ));
          const totalAccepted = acceptedCount[0]?.count || 0;
          const neededCount = shift.workersNeeded || 1;
          const shiftFilled = totalAccepted >= neededCount;
          const cancelledWorkerIds = [];
          if (shiftFilled) {
            const otherOffers = await db.select().from(shiftOffers).where(and3(
              eq4(shiftOffers.shiftId, offer.shiftId),
              ne2(shiftOffers.id, offerId),
              eq4(shiftOffers.status, "pending")
            ));
            for (const otherOffer of otherOffers) {
              await db.update(shiftOffers).set({ status: "cancelled", respondedAt: /* @__PURE__ */ new Date(), cancelledAt: /* @__PURE__ */ new Date(), cancelledBy: userId, cancelReason: "Shift filled - enough workers accepted" }).where(eq4(shiftOffers.id, otherOffer.id));
              cancelledWorkerIds.push(otherOffer.workerId);
              await db.insert(auditLog).values({
                userId,
                action: "OFFER_CANCELLED_AUTO",
                entityType: "shift_offer",
                entityId: otherOffer.id,
                details: JSON.stringify({ shiftId: offer.shiftId, cancelledWorkerId: otherOffer.workerId, reason: "Shift filled - enough workers accepted" })
              });
            }
          }
          if (shift.requestId && shiftFilled) {
            await db.update(shiftRequests).set({ status: "filled", updatedAt: /* @__PURE__ */ new Date() }).where(eq4(shiftRequests.id, shift.requestId));
            const [filledReq] = await db.select({ crmRequestId: shiftRequests.crmRequestId }).from(shiftRequests).where(eq4(shiftRequests.id, shift.requestId));
            if (filledReq?.crmRequestId) {
              try {
                const { enqueueCrmPush: enqueueCrmPush2 } = await Promise.resolve().then(() => (init_crm_sync(), crm_sync_exports));
                await enqueueCrmPush2(
                  "hotel_request",
                  shift.requestId,
                  "update",
                  { crmExternalId: filledReq.crmRequestId, status: "CONFIRMED" }
                );
              } catch (crmErr) {
                console.error("[CRM] Failed to enqueue hotel request update:", crmErr?.message);
              }
            }
          }
          const hrAdmins = await db.select({ id: users.id }).from(users).where(or(eq4(users.role, "admin"), eq4(users.role, "hr")));
          const [worker] = await db.select({ fullName: users.fullName }).from(users).where(eq4(users.id, userId));
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
            const [req2] = await db.select().from(shiftRequests).where(eq4(shiftRequests.id, shift.requestId));
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
          await db.update(shiftOffers).set({ status: "declined", respondedAt: /* @__PURE__ */ new Date() }).where(eq4(shiftOffers.id, offerId));
          const [shift] = await db.select().from(shifts).where(eq4(shifts.id, offer.shiftId));
          const hrAdmins = await db.select({ id: users.id }).from(users).where(or(eq4(users.role, "admin"), eq4(users.role, "hr")));
          const [worker] = await db.select({ fullName: users.fullName }).from(users).where(eq4(users.id, userId));
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
        const [shift] = await db.select().from(shifts).where(eq4(shifts.id, shiftId));
        if (!shift) {
          res.status(404).json({ error: "Shift not found" });
          return;
        }
        const offers = await db.select().from(shiftOffers).where(eq4(shiftOffers.shiftId, shiftId));
        const workerIds = offers.map((o) => o.workerId);
        let tokensCount = 0;
        if (workerIds.length > 0) {
          const tokens = await db.select({ token: pushTokens.token }).from(pushTokens).where(and3(inArray(pushTokens.userId, workerIds), eq4(pushTokens.isActive, true)));
          tokensCount = tokens.length;
        }
        const auditEntries = await db.select().from(auditLog).where(and3(eq4(auditLog.entityType, "shift"), eq4(auditLog.entityId, shiftId))).orderBy(desc2(auditLog.createdAt));
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
      const { workersNeeded } = req.body || {};
      const [shift] = await db.select().from(shifts).where(eq4(shifts.id, shiftId));
      if (!shift) {
        res.status(404).json({ error: "Shift not found" });
        return;
      }
      if (workersNeeded && typeof workersNeeded === "number" && workersNeeded > 0) {
        await db.update(shifts).set({ workersNeeded, updatedAt: /* @__PURE__ */ new Date() }).where(eq4(shifts.id, shiftId));
      }
      const [workplace] = shift.workplaceId ? await db.select().from(workplaces).where(eq4(workplaces.id, shift.workplaceId)) : [null];
      const allWorkers = await db.select({
        id: users.id,
        fullName: users.fullName,
        workerRoles: users.workerRoles
      }).from(users).where(and3(
        eq4(users.role, "worker"),
        eq4(users.isActive, true)
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
      const existingOffers = await db.select({ workerId: shiftOffers.workerId }).from(shiftOffers).where(and3(
        eq4(shiftOffers.shiftId, shiftId),
        inArray(shiftOffers.status, ["pending", "accepted"])
      ));
      const alreadyOffered = new Set(existingOffers.map((o) => o.workerId));
      eligibleWorkers = eligibleWorkers.filter((w) => !alreadyOffered.has(w.id));
      if (shift.date) {
        const existingShifts = await db.select({
          workerUserId: shifts.workerUserId,
          startTime: shifts.startTime,
          endTime: shifts.endTime
        }).from(shifts).where(and3(
          eq4(shifts.date, shift.date),
          not(isNull2(shifts.workerUserId)),
          ne2(shifts.status, "cancelled"),
          ne2(shifts.id, shiftId)
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
        errors: offerErrors,
        workersNeeded: workersNeeded || null
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
      const photos = await db.select().from(userPhotos).where(eq4(userPhotos.userId, targetUserId)).orderBy(desc2(userPhotos.createdAt)).limit(1);
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
      }).from(userPhotos).innerJoin(users, eq4(userPhotos.userId, users.id)).where(eq4(userPhotos.status, "pending_review")).orderBy(desc2(userPhotos.createdAt));
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
      }).where(eq4(userPhotos.id, photoId)).returning();
      if (!updated) {
        res.status(404).json({ error: "Photo not found" });
        return;
      }
      if (action === "approve") {
        await db.update(users).set({ profilePhotoUrl: updated.url }).where(eq4(users.id, updated.userId));
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
      broadcast({ type: "update", entity: "photo", id: updated.userId });
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
      const notifications = await db.select().from(appNotifications).where(eq4(appNotifications.userId, userId)).orderBy(desc2(appNotifications.createdAt)).limit(limit).offset(offset);
      const [unreadCount] = await db.select({ count: sql3`count(*)` }).from(appNotifications).where(and3(
        eq4(appNotifications.userId, userId),
        isNull2(appNotifications.readAt)
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
      const [updated] = await db.update(appNotifications).set({ readAt: /* @__PURE__ */ new Date() }).where(and3(
        eq4(appNotifications.id, notifId),
        eq4(appNotifications.userId, userId)
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
      await db.update(appNotifications).set({ readAt: /* @__PURE__ */ new Date() }).where(and3(
        eq4(appNotifications.userId, userId),
        isNull2(appNotifications.readAt)
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
        const [shift] = await db.select().from(shifts).where(eq4(shifts.id, shiftId));
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
        const [worker] = await db.select({ fullName: users.fullName }).from(users).where(eq4(users.id, userId));
        const statusLabels = {
          on_my_way: "is on their way",
          issue: "reported an issue",
          checked_in: "has checked in",
          checked_out: "has checked out"
        };
        if (status === "issue") {
          const hrAdmins = await db.select({ id: users.id }).from(users).where(or(eq4(users.role, "admin"), eq4(users.role, "hr")));
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
          const hrAdmins = await db.select({ id: users.id }).from(users).where(or(eq4(users.role, "admin"), eq4(users.role, "hr")));
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
      }).from(shiftCheckins).leftJoin(users, eq4(shiftCheckins.workerId, users.id)).where(eq4(shiftCheckins.shiftId, shiftId)).orderBy(desc2(shiftCheckins.createdAt));
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
        const [request] = await db.select().from(shiftRequests).where(eq4(shiftRequests.id, requestId));
        if (!request) {
          res.status(404).json({ error: "Shift request not found" });
          return;
        }
        const allWorkers = await db.select({
          id: users.id,
          fullName: users.fullName,
          email: users.email,
          workerRoles: users.workerRoles
        }).from(users).where(and3(
          eq4(users.role, "worker"),
          eq4(users.isActive, true)
        ));
        const existingShifts = await db.select({
          workerUserId: shifts.workerUserId,
          startTime: shifts.startTime,
          endTime: shifts.endTime
        }).from(shifts).where(and3(
          eq4(shifts.date, request.date),
          not(isNull2(shifts.workerUserId)),
          ne2(shifts.status, "cancelled")
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
        const result = await db.select({ count: sql3`count(*)::int` }).from(table);
        counts[name] = result[0]?.count || 0;
      }
      const nonAdminUsers = await db.select({ count: sql3`count(*)::int` }).from(users).where(ne2(users.role, "admin"));
      counts["non_admin_users"] = nonAdminUsers[0]?.count || 0;
      const adminUsers = await db.select({ count: sql3`count(*)::int` }).from(users).where(eq4(users.role, "admin"));
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
        { name: "export_audit_logs", q: sql3`DELETE FROM export_audit_logs` },
        { name: "shift_checkins", q: sql3`DELETE FROM shift_checkins` },
        { name: "shift_offers", q: sql3`DELETE FROM shift_offers` },
        { name: "shift_requests", q: sql3`DELETE FROM shift_requests` },
        { name: "shifts", q: sql3`DELETE FROM shifts` },
        { name: "recurrence_exceptions", q: sql3`DELETE FROM recurrence_exceptions` },
        { name: "shift_series", q: sql3`DELETE FROM shift_series` },
        { name: "sent_reminders", q: sql3`DELETE FROM sent_reminders` },
        { name: "app_notifications", q: sql3`DELETE FROM app_notifications` },
        { name: "tito_logs", q: sql3`DELETE FROM tito_logs` },
        { name: "timesheet_entries", q: sql3`DELETE FROM timesheet_entries` },
        { name: "timesheets", q: sql3`DELETE FROM timesheets` },
        { name: "payroll_batch_items", q: sql3`DELETE FROM payroll_batch_items` },
        { name: "payroll_batches", q: sql3`DELETE FROM payroll_batches` },
        { name: "messages", q: sql3`DELETE FROM messages` },
        { name: "message_logs", q: sql3`DELETE FROM message_logs` },
        { name: "conversations", q: sql3`DELETE FROM conversations` },
        { name: "workplace_assignments", q: sql3`DELETE FROM workplace_assignments` },
        { name: "user_photos", q: sql3`DELETE FROM user_photos` },
        { name: "push_tokens", q: sql3`DELETE FROM push_tokens WHERE user_id NOT IN (SELECT id FROM users WHERE role = 'admin')` },
        { name: "worker_applications", q: sql3`DELETE FROM worker_applications` },
        { name: "payment_profiles", q: sql3`DELETE FROM payment_profiles WHERE user_id NOT IN (SELECT id FROM users WHERE role = 'admin')` },
        { name: "non_admin_users", q: sql3`DELETE FROM users WHERE role != 'admin'` },
        { name: "audit_log", q: sql3`DELETE FROM audit_log` }
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
  const GM_LILEE_PHONE = "+14166028038";
  function getShiftTimezone(province) {
    const p = (province || "").trim().toLowerCase().replace(/\s+/g, " ");
    if (p.includes("british columbia") || p.includes(" bc")) return "America/Vancouver";
    if (p.includes("alberta") || p.includes(" ab")) return "America/Edmonton";
    if (p.includes("saskatchewan") || p.includes(" sk")) return "America/Regina";
    if (p.includes("manitoba") || p.includes(" mb")) return "America/Winnipeg";
    if (p.includes("newfoundland") || p.includes(" nl")) return "America/St_Johns";
    if (p.includes("nova scotia") || p.includes("new brunswick") || p.includes("prince edward") || p.includes(" ns") || p.includes(" nb") || p.includes(" pe")) return "America/Halifax";
    return "America/Toronto";
  }
  function getTimezoneAbbr(timezone) {
    const map = {
      "America/Vancouver": "PT",
      "America/Edmonton": "MT",
      "America/Regina": "CT",
      "America/Winnipeg": "CT",
      "America/Toronto": "ET",
      "America/Halifax": "AT",
      "America/St_Johns": "NT"
    };
    return map[timezone] || "ET";
  }
  function getLocalNow(timezone) {
    const now = /* @__PURE__ */ new Date();
    const dateStr = now.toLocaleDateString("en-CA", { timeZone: timezone });
    const timeParts = new Intl.DateTimeFormat("en-US", {
      timeZone: timezone,
      hour: "2-digit",
      minute: "2-digit",
      hour12: false
    }).formatToParts(now);
    const hours = parseInt(timeParts.find((p) => p.type === "hour")?.value || "0", 10);
    const minutes = parseInt(timeParts.find((p) => p.type === "minute")?.value || "0", 10);
    return { dateStr, hours, minutes };
  }
  async function processShiftReminders() {
    try {
      const torontoNow = getLocalNow("America/Toronto");
      const tomorrowToronto = /* @__PURE__ */ new Date();
      tomorrowToronto.setDate(tomorrowToronto.getDate() + 1);
      const tomorrowTorontoStr = tomorrowToronto.toLocaleDateString("en-CA", { timeZone: "America/Toronto" });
      const upcomingShifts = await db.select({
        id: shifts.id,
        title: shifts.title,
        date: shifts.date,
        startTime: shifts.startTime,
        workerUserId: shifts.workerUserId,
        workplaceName: workplaces.name,
        workplaceProvince: workplaces.province,
        workerName: users.fullName,
        workerPhone: users.phone
      }).from(shifts).leftJoin(workplaces, eq4(shifts.workplaceId, workplaces.id)).leftJoin(users, eq4(shifts.workerUserId, users.id)).where(
        and3(
          or(eq4(shifts.date, torontoNow.dateStr), eq4(shifts.date, tomorrowTorontoStr)),
          eq4(shifts.status, "scheduled"),
          sql3`${shifts.workerUserId} IS NOT NULL`
        )
      );
      const lileeReminders = [];
      for (const shift of upcomingShifts) {
        if (!shift.workerUserId || !shift.startTime) continue;
        const tz = getShiftTimezone(shift.workplaceProvince);
        const local = getLocalNow(tz);
        const tzAbbr = getTimezoneAbbr(tz);
        const tomorrowLocal = /* @__PURE__ */ new Date();
        tomorrowLocal.setDate(tomorrowLocal.getDate() + 1);
        const tomorrowLocalStr = tomorrowLocal.toLocaleDateString("en-CA", { timeZone: tz });
        const isToday = shift.date === local.dateStr;
        const isTomorrow = shift.date === tomorrowLocalStr;
        if (!isToday && !isTomorrow) continue;
        const reminderType = isToday ? "day_of" : "day_before";
        const [sh, sm] = shift.startTime.split(":").map(Number);
        const shiftMinutes = sh * 60 + (sm || 0);
        const nowMinutes = local.hours * 60 + local.minutes;
        if (isToday) {
          const minutesUntilShift = shiftMinutes - nowMinutes;
          if (minutesUntilShift < 60 || minutesUntilShift > 480) {
            const isMorningWindow = local.hours >= 7 && local.hours < 9;
            if (isMorningWindow && minutesUntilShift > 0) {
              const morningSmsType = "day_of_morning_sms";
              const existingMorning = await db.select().from(sentReminders).where(and3(
                eq4(sentReminders.shiftId, shift.id),
                eq4(sentReminders.workerId, shift.workerUserId),
                eq4(sentReminders.reminderType, morningSmsType)
              )).limit(1);
              if (existingMorning.length === 0 && shift.workerPhone) {
                const morningMsg = `Good morning ${shift.workerName || "there"}! You have a shift today \u2014 ${shift.title} at ${shift.workplaceName || "your workplace"} at ${shift.startTime} ${tzAbbr}. Have a great shift!`;
                try {
                  const mRes = await sendSMS(shift.workerPhone, morningMsg);
                  await logSMS({ phoneNumber: shift.workerPhone, direction: "outbound", message: morningMsg, shiftId: shift.id, status: mRes.success ? "sent" : "failed" });
                  await db.insert(sentReminders).values({ shiftId: shift.id, workerId: shift.workerUserId, reminderType: morningSmsType });
                  lileeReminders.push({ name: shift.workerName || "Worker", title: shift.title || "", location: shift.workplaceName || "workplace", date: shift.date || "", time: shift.startTime || "", tzAbbr, label: "Today (morning)" });
                  console.log(`[Reminder] Morning SMS sent to ${shift.workerName} (${shift.workerPhone}) \u2014 ${shift.title}`);
                } catch (mErr) {
                  console.error(`[Reminder] Morning SMS failed for shift ${shift.id}:`, mErr);
                }
              }
            }
            continue;
          }
        } else {
          if (local.hours < 18 || local.hours >= 21) continue;
        }
        const existing = await db.select().from(sentReminders).where(
          and3(
            eq4(sentReminders.shiftId, shift.id),
            eq4(sentReminders.workerId, shift.workerUserId),
            eq4(sentReminders.reminderType, reminderType)
          )
        ).limit(1);
        if (existing.length > 0) continue;
        const title = isToday ? "Shift Today" : "Shift Tomorrow";
        const body = `${shift.title} at ${shift.workplaceName || "workplace"} - ${shift.startTime} (${tzAbbr})`;
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
          lileeReminders.push({ name: shift.workerName || "Worker", title: shift.title || "", location: shift.workplaceName || "workplace", date: shift.date || "", time: shift.startTime || "", tzAbbr, label: isToday ? "Today" : "Tomorrow" });
          await db.insert(appNotifications).values({
            userId: shift.workerUserId,
            title,
            body,
            type: "shift_reminder",
            data: JSON.stringify({ shiftId: shift.id })
          });
          const workerDisplay = shift.workerName || "there";
          const workerSmsType = `${reminderType}_sms`;
          const existingWorkerSms = await db.select().from(sentReminders).where(and3(
            eq4(sentReminders.shiftId, shift.id),
            eq4(sentReminders.workerId, shift.workerUserId),
            eq4(sentReminders.reminderType, workerSmsType)
          )).limit(1);
          if (existingWorkerSms.length === 0 && shift.workerPhone) {
            const workerMsg = isToday ? `Hi ${workerDisplay}, reminder: you're working TODAY \u2014 ${shift.title} at ${shift.workplaceName || "your workplace"} at ${shift.startTime} ${tzAbbr}. See you there!` : `Hi ${workerDisplay}, reminder: you have a shift TOMORROW \u2014 ${shift.title} at ${shift.workplaceName || "your workplace"} at ${shift.startTime} ${tzAbbr}. Reply if you have any questions.`;
            try {
              const wRes = await sendSMS(shift.workerPhone, workerMsg);
              await logSMS({ phoneNumber: shift.workerPhone, direction: "outbound", message: workerMsg, shiftId: shift.id, status: wRes.success ? "sent" : "failed" });
              await db.insert(sentReminders).values({ shiftId: shift.id, workerId: shift.workerUserId, reminderType: workerSmsType });
              console.log(`[Reminder] Worker SMS sent to ${shift.workerName} (${shift.workerPhone}) \u2014 ${shift.title} on ${shift.date}`);
            } catch (wErr) {
              console.error(`[Reminder] Worker SMS failed for shift ${shift.id}:`, wErr);
            }
          }
        } catch (err) {
          console.error(`Failed to send reminder for shift ${shift.id}:`, err);
        }
      }
      if (lileeReminders.length > 0) {
        try {
          const dateLabel = (/* @__PURE__ */ new Date()).toLocaleDateString("en-CA", { timeZone: "America/Toronto", month: "short", day: "numeric", year: "numeric" });
          const groupLabels = [...new Set(lileeReminders.map((r) => r.label))].join(" & ");
          const lines = lileeReminders.map((r) => `\u2022 ${r.name} \u2192 ${r.location}, ${r.time} ${r.tzAbbr}`).join("\n");
          const summary = `[WFC] Shift Reminders \u2014 ${dateLabel}
${groupLabels} (${lileeReminders.length} worker${lileeReminders.length !== 1 ? "s" : ""}):

${lines}`;
          const lileeRes = await sendSMS(GM_LILEE_PHONE, summary);
          await logSMS({ phoneNumber: GM_LILEE_PHONE, direction: "outbound", message: summary, status: lileeRes.success ? "sent" : "failed" });
          console.log(`[Reminder] Consolidated report sent to Lilee \u2014 ${lileeReminders.length} workers`);
        } catch (lileeErr) {
          console.error("[Reminder] Failed to send consolidated Lilee report:", lileeErr);
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
        and3(
          eq4(shifts.date, todayStr),
          eq4(shifts.status, "scheduled"),
          not(isNull2(shifts.workerUserId))
        )
      );
      for (const shift of todayShifts) {
        if (!shift.startTime || !shift.workerUserId) continue;
        const [h, m] = shift.startTime.split(":").map(Number);
        const shiftStartMinutes = h * 60 + m;
        const minutesLate = currentTimeMinutes - shiftStartMinutes;
        if (minutesLate < 15 || minutesLate > 120) continue;
        const existingTito = await db.select({ id: titoLogs.id }).from(titoLogs).where(and3(
          eq4(titoLogs.shiftId, shift.id),
          eq4(titoLogs.workerId, shift.workerUserId),
          not(isNull2(titoLogs.timeIn))
        )).limit(1);
        if (existingTito.length > 0) continue;
        const alreadyNotified = await db.select({ id: sentReminders.id }).from(sentReminders).where(and3(
          eq4(sentReminders.shiftId, shift.id),
          eq4(sentReminders.workerId, shift.workerUserId),
          eq4(sentReminders.reminderType, minutesLate >= 30 ? "noshow_hr" : "missed_worker")
        )).limit(1);
        if (alreadyNotified.length > 0) continue;
        const [worker] = await db.select({ fullName: users.fullName }).from(users).where(eq4(users.id, shift.workerUserId));
        const [workplace] = shift.workplaceId ? await db.select({ name: workplaces.name }).from(workplaces).where(eq4(workplaces.id, shift.workplaceId)) : [null];
        const workerName = worker?.fullName || "Worker";
        const wpName = workplace?.name || "workplace";
        if (minutesLate >= 30) {
          const hrAdmins = await db.select({ id: users.id }).from(users).where(and3(inArray(users.role, ["admin", "hr"]), eq4(users.isActive, true)));
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
  const KNOWN_OPENPHONE_IDS = /* @__PURE__ */ new Set(["PNo1n737XV", "PNCQJAOZa0"]);
  app2.post("/api/webhooks/openphone", async (req, res) => {
    try {
      const payload = req.body;
      console.log("[OPENPHONE WEBHOOK] Received:", JSON.stringify(payload).substring(0, 500));
      res.status(200).json({ received: true });
      if (!payload?.type || payload.type !== "message.received") {
        console.log("[OPENPHONE WEBHOOK] Ignoring non-message event:", payload?.type);
        return;
      }
      const messageData = payload?.data?.object;
      if (!messageData) {
        console.log("[OPENPHONE WEBHOOK] No message data in payload");
        return;
      }
      const phoneNumberId = messageData.phoneNumberId;
      if (phoneNumberId && !KNOWN_OPENPHONE_IDS.has(phoneNumberId)) {
        console.log(`[OPENPHONE WEBHOOK] Unknown phoneNumberId: ${phoneNumberId}, rejecting`);
        return;
      }
      if (messageData.direction === "outgoing") {
        console.log("[OPENPHONE WEBHOOK] Ignoring outgoing message");
        return;
      }
      const senderPhone = messageData.from;
      const messageBody = (messageData.body || messageData.content || messageData.text || "").trim();
      const openphoneMessageId = messageData.id;
      const mediaUrls = [];
      if (Array.isArray(messageData.media)) {
        for (const m of messageData.media) {
          if (m?.url && typeof m.url === "string" && /^https?:\/\//i.test(m.url)) {
            mediaUrls.push(m.url);
          }
        }
      }
      if (!senderPhone || !messageBody && mediaUrls.length === 0) {
        console.log("[OPENPHONE WEBHOOK] Missing sender phone or message body");
        return;
      }
      console.log(`[OPENPHONE WEBHOOK] From: ${senderPhone}, Body: "${messageBody}"${mediaUrls.length > 0 ? `, Media: ${mediaUrls.length} file(s)` : ""}`);
      if (mediaUrls.length > 0) {
        console.log(`[OPENPHONE WEBHOOK] Received ${mediaUrls.length} media attachment(s) from ${senderPhone}`);
      }
      const normalizedPhone = senderPhone.replace(/[^\d]/g, "");
      const phoneVariants = [
        senderPhone,
        `+${normalizedPhone}`,
        `+1${normalizedPhone}`,
        normalizedPhone,
        normalizedPhone.startsWith("1") ? normalizedPhone.substring(1) : normalizedPhone
      ];
      let worker = null;
      for (const variant of phoneVariants) {
        const [found] = await db.select({ id: users.id, fullName: users.fullName, phone: users.phone }).from(users).where(and3(eq4(users.phone, variant), eq4(users.role, "worker")));
        if (found) {
          worker = found;
          break;
        }
      }
      if (!worker) {
        const allWorkers = await db.select({ id: users.id, fullName: users.fullName, phone: users.phone }).from(users).where(and3(
          eq4(users.role, "worker"),
          eq4(users.isActive, true)
        ));
        worker = allWorkers.find((w) => {
          if (!w.phone) return false;
          const cleaned = w.phone.replace(/[^\d]/g, "");
          return phoneVariants.some((v) => {
            const vCleaned = v.replace(/[^\d]/g, "");
            return cleaned === vCleaned || cleaned.endsWith(vCleaned) || vCleaned.endsWith(cleaned);
          });
        });
      }
      await logSMS({
        phoneNumber: senderPhone,
        direction: "inbound",
        message: messageBody,
        workerId: worker?.id || null,
        status: worker ? "received" : "unknown_sender",
        openphoneMessageId
      });
      const upperBody = messageBody.toUpperCase().trim();
      const isShiftKeyword = ["ACCEPT SHIFT", "ACCEPT", "DECLINE SHIFT", "DECLINE"].includes(upperBody);
      if (!isShiftKeyword) {
        console.log(`[OPENPHONE WEBHOOK] Non-shift-keyword message from ${senderPhone} \u2014 logged only`);
        return;
      }
      if (!worker) {
        console.log(`[OPENPHONE WEBHOOK] Unknown sender ${senderPhone} sent shift keyword: "${messageBody}"`);
        sendSMS(senderPhone, "Sorry, we couldn't identify your account. Please contact HR directly or use the WFConnect app.").catch((err) => console.error("[OPENPHONE] Reply SMS error:", err));
        return;
      }
      let responseAction = null;
      if (["ACCEPT SHIFT", "ACCEPT"].includes(upperBody)) {
        responseAction = "accepted";
      } else if (["DECLINE SHIFT", "DECLINE"].includes(upperBody)) {
        responseAction = "declined";
      }
      const pendingOffers = await db.select({
        offerId: shiftOffers.id,
        shiftId: shiftOffers.shiftId,
        status: shiftOffers.status,
        shiftTitle: shifts.title,
        shiftDate: shifts.date,
        shiftStartTime: shifts.startTime,
        workersNeeded: shifts.workersNeeded,
        workplaceId: shifts.workplaceId
      }).from(shiftOffers).innerJoin(shifts, eq4(shiftOffers.shiftId, shifts.id)).where(and3(
        eq4(shiftOffers.workerId, worker.id),
        eq4(shiftOffers.status, "pending")
      )).orderBy(desc2(shiftOffers.offeredAt)).limit(1);
      if (pendingOffers.length === 0) {
        sendConfirmationSMS(
          senderPhone,
          `Hi ${worker.fullName}, you don't have any pending shift offers right now. Check the WFConnect app for more details.`,
          worker.id
        ).catch((err) => console.error("[OPENPHONE] Reply SMS error:", err));
        return;
      }
      const offer = pendingOffers[0];
      if (responseAction === "accepted") {
        const acceptedCount = await db.select({ id: shiftOffers.id }).from(shiftOffers).where(and3(
          eq4(shiftOffers.shiftId, offer.shiftId),
          eq4(shiftOffers.status, "accepted"),
          ne2(shiftOffers.id, offer.offerId)
        ));
        const needed = offer.workersNeeded || 1;
        if (acceptedCount.length >= needed) {
          await db.update(shiftOffers).set({ status: "cancelled", cancelReason: "Shift filled before SMS reply", cancelledAt: /* @__PURE__ */ new Date() }).where(eq4(shiftOffers.id, offer.offerId));
          sendConfirmationSMS(
            senderPhone,
            `Sorry ${worker.fullName}, the shift "${offer.shiftTitle}" on ${offer.shiftDate} has already been filled.`,
            worker.id
          ).catch((err) => console.error("[OPENPHONE] Reply SMS error:", err));
          return;
        }
        await db.update(shiftOffers).set({ status: "accepted", respondedAt: /* @__PURE__ */ new Date() }).where(eq4(shiftOffers.id, offer.offerId));
        const [currentShift] = await db.select().from(shifts).where(eq4(shifts.id, offer.shiftId));
        if (currentShift && !currentShift.workerUserId) {
          await db.update(shifts).set({ workerUserId: worker.id, updatedAt: /* @__PURE__ */ new Date() }).where(eq4(shifts.id, offer.shiftId));
        }
        const newAcceptedCount = acceptedCount.length + 1;
        if (newAcceptedCount >= needed) {
          await db.update(shiftOffers).set({ status: "cancelled", cancelReason: "Shift filled - enough workers accepted", cancelledAt: /* @__PURE__ */ new Date() }).where(and3(
            eq4(shiftOffers.shiftId, offer.shiftId),
            eq4(shiftOffers.status, "pending")
          ));
        }
        await db.insert(auditLog).values({
          userId: worker.id,
          action: "OFFER_ACCEPTED_VIA_SMS",
          entityType: "shift_offer",
          entityId: offer.offerId,
          details: JSON.stringify({ shiftId: offer.shiftId, method: "sms" })
        });
        const adminUsers = await db.select({ id: users.id }).from(users).where(or(eq4(users.role, "admin"), eq4(users.role, "hr")));
        for (const admin of adminUsers) {
          await db.insert(appNotifications).values({
            userId: admin.id,
            type: "offer_accepted",
            title: "Shift Offer Accepted (SMS)",
            body: `${worker.fullName} accepted the shift "${offer.shiftTitle}" on ${offer.shiftDate} via SMS.`,
            deepLink: `/shifts/${offer.shiftId}`
          });
        }
        broadcast({ type: "offer_responded", data: { offerId: offer.offerId, status: "accepted", workerId: worker.id, method: "sms" } });
        sendConfirmationSMS(
          senderPhone,
          `Confirmed! You've accepted the shift "${offer.shiftTitle}" on ${offer.shiftDate} at ${offer.shiftStartTime}. See the WFConnect app for details.`,
          worker.id
        ).catch((err) => console.error("[OPENPHONE] Reply SMS error:", err));
      } else {
        await db.update(shiftOffers).set({ status: "declined", respondedAt: /* @__PURE__ */ new Date() }).where(eq4(shiftOffers.id, offer.offerId));
        await db.insert(auditLog).values({
          userId: worker.id,
          action: "OFFER_DECLINED_VIA_SMS",
          entityType: "shift_offer",
          entityId: offer.offerId,
          details: JSON.stringify({ shiftId: offer.shiftId, method: "sms" })
        });
        broadcast({ type: "offer_responded", data: { offerId: offer.offerId, status: "declined", workerId: worker.id, method: "sms" } });
        sendConfirmationSMS(
          senderPhone,
          `Got it, ${worker.fullName}. You've declined the shift "${offer.shiftTitle}" on ${offer.shiftDate}.`,
          worker.id
        ).catch((err) => console.error("[OPENPHONE] Reply SMS error:", err));
      }
    } catch (error) {
      console.error("[OPENPHONE WEBHOOK] Error processing webhook:", error);
      if (!res.headersSent) {
        res.status(200).json({ received: true });
      }
    }
  });
  app2.post("/api/auth/forgot-password", async (req, res) => {
    try {
      const { email } = req.body;
      if (!email) {
        res.status(400).json({ error: "Email is required" });
        return;
      }
      const [user] = await db.select().from(users).where(eq4(users.email, email.toLowerCase()));
      if (user && user.isActive) {
        const resetToken = crypto2.randomBytes(32).toString("hex");
        const resetExpiry = new Date(Date.now() + 60 * 60 * 1e3);
        await db.update(users).set({ passwordResetToken: resetToken, passwordResetExpiry: resetExpiry, updatedAt: /* @__PURE__ */ new Date() }).where(eq4(users.id, user.id));
        const resetLink = `https://app.wfconnect.org?reset=${resetToken}`;
        sendEmail({
          to: user.email,
          subject: "Reset your Workforce Connect password",
          text: `Hi ${user.fullName},

You requested a password reset. Click the link below to set a new password (expires in 1 hour):

${resetLink}

If you didn't request this, you can safely ignore this email.

The WFConnect Team`,
          html: `<p>Hi ${user.fullName},</p><p>You requested a password reset. Click the button below to set a new password (expires in 1 hour):</p><p><a href="${resetLink}" style="background:#2563EB;color:#fff;padding:10px 20px;border-radius:6px;text-decoration:none;display:inline-block;">Reset Password</a></p><p>If you didn't request this, you can safely ignore this email.</p><p>The WFConnect Team</p>`
        }).catch((err) => console.error("[EMAIL] Password reset email error:", err));
      }
      res.json({ success: true, message: "If that email is registered and active, a reset link has been sent." });
    } catch (error) {
      console.error("Error in forgot-password:", error);
      res.status(500).json({ error: "Failed to process request" });
    }
  });
  app2.post("/api/auth/reset-password", async (req, res) => {
    try {
      const { token, newPassword } = req.body;
      if (!token || !newPassword) {
        res.status(400).json({ error: "Token and new password are required" });
        return;
      }
      if (newPassword.length < 8) {
        res.status(400).json({ error: "Password must be at least 8 characters" });
        return;
      }
      const [user] = await db.select().from(users).where(
        and3(
          eq4(users.passwordResetToken, token),
          gte2(users.passwordResetExpiry, /* @__PURE__ */ new Date())
        )
      );
      if (!user) {
        res.status(400).json({ error: "Invalid or expired reset link. Please request a new one." });
        return;
      }
      const hashedPassword = await bcrypt.hash(newPassword, 10);
      await db.update(users).set({
        password: hashedPassword,
        passwordResetToken: null,
        passwordResetExpiry: null,
        mustChangePassword: false,
        updatedAt: /* @__PURE__ */ new Date()
      }).where(eq4(users.id, user.id));
      res.json({ success: true, message: "Password reset successfully. You can now sign in." });
    } catch (error) {
      console.error("Error in reset-password:", error);
      res.status(500).json({ error: "Failed to reset password" });
    }
  });
  app2.post("/api/admin/invite-user", checkRoles("admin"), async (req, res) => {
    try {
      const { email, fullName, role, businessName, phone } = req.body;
      if (!email || !fullName || !role) {
        res.status(400).json({ error: "Email, full name, and role are required" });
        return;
      }
      if (!["hr", "client"].includes(role)) {
        res.status(400).json({ error: "Invite flow is for HR and Client roles only" });
        return;
      }
      const existingUser = await db.select().from(users).where(eq4(users.email, email.toLowerCase())).limit(1);
      if (existingUser.length > 0) {
        const existing = existingUser[0];
        const roleLabel = existing.role.charAt(0).toUpperCase() + existing.role.slice(1);
        const statusLabel = existing.isActive ? "active" : "inactive";
        const hint = existing.isActive ? `You can manage their account in User Management.` : `You can reactivate their account in User Management.`;
        res.status(409).json({
          error: `An ${statusLabel} ${roleLabel} account already exists with this email. ${hint}`
        });
        return;
      }
      if (phone) {
        const [phoneDuplicate] = await db.select({ id: users.id }).from(users).where(eq4(users.phone, phone)).limit(1);
        if (phoneDuplicate) {
          res.status(409).json({ error: `A user with phone ${phone} already exists.` });
          return;
        }
      }
      const [fullNameDuplicate] = await db.select({ id: users.id }).from(users).where(eq4(users.fullName, fullName.trim())).limit(1);
      if (fullNameDuplicate) {
        res.status(409).json({ error: `A user with name "${fullName}" already exists.` });
        return;
      }
      const firstName = fullName.trim().split(" ")[0];
      const tempPassword = `${firstName}${Math.floor(1e3 + Math.random() * 9e3)}`;
      const hashedPassword = await bcrypt.hash(tempPassword, 10);
      const [newUser] = await db.insert(users).values({
        email: email.toLowerCase(),
        password: hashedPassword,
        fullName: fullName.trim(),
        role,
        isActive: true,
        mustChangePassword: true,
        businessName: role === "client" ? businessName?.trim() || null : null,
        onboardingStatus: null
      }).returning();
      broadcast({ type: "created", entity: "user" });
      const { password: _, ...userWithoutPassword } = newUser;
      res.status(201).json({ ...userWithoutPassword, tempPassword });
    } catch (error) {
      console.error("Error inviting user:", error);
      res.status(500).json({ error: "Failed to invite user" });
    }
  });
  const httpServer = createServer(app2);
  return httpServer;
}

// server/payroll-hours.ts
init_db();
init_schema();
import { eq as eq5, and as and4, gte as gte3, lte as lte3, inArray as inArray2 } from "drizzle-orm";
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
    eq5(titoLogs.status, "approved"),
    gte3(titoLogs.timeIn, startTs),
    lte3(titoLogs.timeIn, endTs)
  ];
  if (hotelId && hotelId !== "all") {
    conditions.push(eq5(titoLogs.workplaceId, hotelId));
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
  }).from(titoLogs).innerJoin(users, eq5(titoLogs.workerId, users.id)).leftJoin(workplaces, eq5(titoLogs.workplaceId, workplaces.id)).where(and4(...conditions)).orderBy(titoLogs.timeIn);
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
function sanitizeFileName2(name) {
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
      const hotelName = hotelId === "all" ? "AllHotels" : sanitizeFileName2(groups[0]?.workplaceName || "Hotel");
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
  app2.post("/api/admin/hours/email", checkAdminRole(), async (req, res) => {
    try {
      const { to, mode, format: fmt, type, hotelId: hId, weekStart, year: yr, period: pd, subject } = req.body;
      const format = fmt || "csv";
      if (!to || typeof to !== "string" || !to.includes("@")) {
        res.status(400).json({ error: "Valid email address is required" });
        return;
      }
      if (!["csv", "xlsx"].includes(format)) {
        res.status(400).json({ error: "format must be csv or xlsx" });
        return;
      }
      const hotelId = hId || "all";
      let startDate, endDate, windowLabel, filePrefix;
      let periodYear = 2026, periodNumber = 0;
      if (mode === "weekly") {
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
        const year = parseInt(yr) || 2026;
        const period = parseInt(pd);
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
      const hotelName = hotelId === "all" ? "AllHotels" : sanitizeFileName2(groups[0]?.workplaceName || "Hotel");
      const fileName = `${filePrefix}_${hotelName}_${typeSuffix}.${format}`;
      const buffer = rowsToBuffer(rows, format, sheetName);
      const emailSubject = subject || `WFConnect ${sheetName} - ${windowLabel} (${startDate} to ${endDate})`;
      const bodyText = `Please find attached the ${sheetName} report for ${windowLabel} (${startDate} to ${endDate}).

- WFConnect`;
      let result;
      if (format === "csv") {
        result = await sendCSVEmail(to, emailSubject, bodyText, buffer.toString(), fileName);
      } else {
        result = await sendXLSXEmail(to, emailSubject, bodyText, buffer, fileName);
      }
      if (result.success) {
        try {
          await db.insert(exportAuditLogs).values({
            adminUserId: req.headers["x-user-id"] || "unknown",
            exportType: type,
            fileFormat: format,
            periodYear,
            periodNumber,
            workplaceId: hotelId === "all" ? null : hotelId,
            workplaceName: hotelId === "all" ? "All Hotels" : groups[0]?.workplaceName || null,
            fileName: `[EMAILED] ${fileName}`
          });
        } catch (auditErr) {
          console.error("Audit log error (non-blocking):", auditErr);
        }
        res.json({ success: true, message: `${sheetName} sent to ${to}` });
      } else {
        res.status(500).json({ error: result.error || "Failed to send email" });
      }
    } catch (error) {
      console.error("Error emailing hours export:", error);
      res.status(500).json({ error: "Failed to email hours export" });
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
        const hotelFileName = `${filePrefix}_${sanitizeFileName2(hotel.workplaceName)}_${typeSuffix}.${format}`;
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
init_db();
init_schema();
import * as fs from "fs";
import * as path from "path";
import bcrypt2 from "bcryptjs";
import { eq as eq6, and as and5, isNull as isNull3, sql as sql5 } from "drizzle-orm";
var app = express();
var log = console.log;
function escapeHtml(value) {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}
function renderApplyTemplate(template) {
  const clauseHtml = NON_SOLICITATION_DIRECT_HIRING_CLAUSE_PARAGRAPHS.map((paragraph) => `<p class="clause-paragraph">${escapeHtml(paragraph)}</p>`).join("\n");
  return template.replace(/__NON_SOLICITATION_TITLE__/g, escapeHtml(NON_SOLICITATION_DIRECT_HIRING_CLAUSE_TITLE)).replace(/__NON_SOLICITATION_BODY__/g, clauseHtml);
}
function renderGuideTemplate(template) {
  const paymentTermsParagraphsHtml = PAYMENT_TERMS_AND_CLIENT_DEPENDENCY_PARAGRAPHS.map((p) => `<p>${escapeHtml(p)}</p>`).join("\n          ");
  return template.replace(/__PAYMENT_TERMS_SECTION_TITLE__/g, escapeHtml(PAYMENT_TERMS_AND_CLIENT_DEPENDENCY_TITLE)).replace(/__PAYMENT_TERMS_SECTION_PARAGRAPHS__/g, paymentTermsParagraphsHtml).replace(/__AGREEMENT_VERSION__/g, escapeHtml(WORKFORCE_SUBCONTRACTOR_AGREEMENT_VERSION));
}
process.on("unhandledRejection", (reason) => {
  console.error("[FATAL] Unhandled Promise Rejection:", reason?.message || reason);
});
process.on("uncaughtException", (error) => {
  console.error("[FATAL] Uncaught Exception:", error?.message || error);
});
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
      const existing = await db.select().from(users).where(eq6(users.id, demoUser.id)).limit(1);
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
    const existing = await db.select().from(workplaces).where(eq6(workplaces.id, CAE_WORKPLACE.id)).limit(1);
    if (existing.length === 0) {
      await db.insert(workplaces).values(CAE_WORKPLACE);
      log(`Seeded workplace: ${CAE_WORKPLACE.name}`);
      const adminExists = await db.select().from(users).where(eq6(users.id, "admin-1")).limit(1);
      const workerExists = await db.select().from(users).where(eq6(users.id, "worker-1")).limit(1);
      if (adminExists.length > 0 && workerExists.length > 0) {
        const assignmentExists = await db.select().from(workplaceAssignments).where(eq6(workplaceAssignments.workplaceId, CAE_WORKPLACE.id)).limit(1);
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
    const existingTs = await db.select().from(timesheets).where(eq6(timesheets.id, "timesheet-demo-1")).limit(1);
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
    const existingTs2 = await db.select().from(timesheets).where(eq6(timesheets.id, "timesheet-demo-2")).limit(1);
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
    const existingAdmin = await db.select().from(users).where(eq6(users.email, "admin@wfconnect.org")).limit(1);
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
async function ensureWorkerApplicationsCompatibility() {
  try {
    await db.execute(sql5`ALTER TABLE "worker_applications" ADD COLUMN IF NOT EXISTS "consent_to_contact" boolean`);
    await db.execute(sql5`ALTER TABLE "worker_applications" ALTER COLUMN "consent_to_contact" SET DEFAULT false`);
    await db.execute(sql5`UPDATE "worker_applications" SET "consent_to_contact" = false WHERE "consent_to_contact" IS NULL`);
    await db.execute(sql5`ALTER TABLE "worker_applications" ADD COLUMN IF NOT EXISTS "marketing_consent" boolean`);
    await db.execute(sql5`ALTER TABLE "worker_applications" ALTER COLUMN "marketing_consent" SET DEFAULT false`);
    await db.execute(sql5`UPDATE "worker_applications" SET "marketing_consent" = false WHERE "marketing_consent" IS NULL`);
    await db.execute(sql5`ALTER TABLE "worker_applications" ADD COLUMN IF NOT EXISTS "agreement_version" text`);
    await db.execute(sql5`ALTER TABLE "worker_applications" ADD COLUMN IF NOT EXISTS "non_solicitation_acknowledged" boolean`);
    await db.execute(sql5`ALTER TABLE "worker_applications" ADD COLUMN IF NOT EXISTS "non_solicitation_acknowledged_at" timestamp`);
    await db.execute(sql5`ALTER TABLE "worker_applications" ADD COLUMN IF NOT EXISTS "worker_pdf_generated_at" timestamp`);
    await db.execute(sql5`ALTER TABLE "worker_applications" ADD COLUMN IF NOT EXISTS "internal_pdf_generated_at" timestamp`);
    await db.execute(sql5`ALTER TABLE "worker_applications" ADD COLUMN IF NOT EXISTS "promotional_consent" boolean`);
    await db.execute(sql5`ALTER TABLE "worker_applications" ALTER COLUMN "promotional_consent" SET DEFAULT false`);
    await db.execute(sql5`UPDATE "worker_applications" SET "promotional_consent" = false WHERE "promotional_consent" IS NULL`);
    await db.execute(sql5`ALTER TABLE "worker_applications" ALTER COLUMN "promotional_consent" SET NOT NULL`);
    await db.execute(sql5`ALTER TABLE "worker_applications" ADD COLUMN IF NOT EXISTS "sms_consent" boolean`);
    await db.execute(sql5`ALTER TABLE "worker_applications" ALTER COLUMN "sms_consent" SET DEFAULT false`);
    await db.execute(sql5`UPDATE "worker_applications" SET "sms_consent" = false WHERE "sms_consent" IS NULL`);
    await db.execute(sql5`ALTER TABLE "worker_applications" ALTER COLUMN "sms_consent" SET NOT NULL`);
    await db.execute(sql5`ALTER TABLE "worker_applications" ADD COLUMN IF NOT EXISTS "sms_consent_at" timestamp`);
    await db.execute(sql5`ALTER TABLE "worker_applications" ADD COLUMN IF NOT EXISTS "application_source" text`);
    await db.execute(sql5`UPDATE "worker_applications" SET "application_source" = 'Direct application' WHERE "application_source" IS NULL`);
    await db.execute(sql5`ALTER TABLE "worker_applications" ADD COLUMN IF NOT EXISTS "assigned_recruiter" text`);
    await db.execute(sql5`ALTER TABLE "worker_applications" ADD COLUMN IF NOT EXISTS "recruiter_notes" text`);
    await db.execute(sql5`ALTER TABLE "worker_applications" ADD COLUMN IF NOT EXISTS "interview_stage" text`);
    await db.execute(sql5`UPDATE "worker_applications" SET "interview_stage" = 'not_started' WHERE "interview_stage" IS NULL`);
    await db.execute(sql5`ALTER TABLE "worker_applications" ADD COLUMN IF NOT EXISTS "interview_notes" text`);
    await db.execute(sql5`ALTER TABLE "worker_applications" ADD COLUMN IF NOT EXISTS "deployment_readiness" text`);
    await db.execute(sql5`UPDATE "worker_applications" SET "deployment_readiness" = 'not_ready' WHERE "deployment_readiness" IS NULL`);
    await db.execute(sql5`ALTER TABLE "worker_applications" ADD COLUMN IF NOT EXISTS "payroll_readiness" text`);
    await db.execute(sql5`UPDATE "worker_applications" SET "payroll_readiness" = 'not_ready' WHERE "payroll_readiness" IS NULL`);
    await db.execute(sql5`ALTER TABLE "worker_applications" ADD COLUMN IF NOT EXISTS "missing_documents" text`);
    await db.execute(sql5`ALTER TABLE "worker_applications" ADD COLUMN IF NOT EXISTS "next_recommended_action" text`);
    await db.execute(sql5`ALTER TABLE "worker_applications" ADD COLUMN IF NOT EXISTS "document_request_sent_at" timestamp`);
    await db.execute(sql5`ALTER TABLE "worker_applications" ADD COLUMN IF NOT EXISTS "last_contacted_at" timestamp`);
    await db.execute(sql5`ALTER TABLE "applicants" ADD COLUMN IF NOT EXISTS "promotional_consent" boolean`);
    await db.execute(sql5`ALTER TABLE "applicants" ALTER COLUMN "promotional_consent" SET DEFAULT false`);
    await db.execute(sql5`UPDATE "applicants" SET "promotional_consent" = false WHERE "promotional_consent" IS NULL`);
    await db.execute(sql5`ALTER TABLE "applicants" ALTER COLUMN "promotional_consent" SET NOT NULL`);
    await db.execute(sql5`ALTER TABLE "applicants" ADD COLUMN IF NOT EXISTS "sms_consent" boolean`);
    await db.execute(sql5`ALTER TABLE "applicants" ALTER COLUMN "sms_consent" SET DEFAULT false`);
    await db.execute(sql5`UPDATE "applicants" SET "sms_consent" = false WHERE "sms_consent" IS NULL`);
    await db.execute(sql5`ALTER TABLE "applicants" ALTER COLUMN "sms_consent" SET NOT NULL`);
    await db.execute(sql5`ALTER TABLE "applicants" ADD COLUMN IF NOT EXISTS "sms_consent_at" timestamp`);
    await db.execute(sql5`ALTER TABLE "applicants" ADD COLUMN IF NOT EXISTS "marketing_consent" boolean`);
    await db.execute(sql5`ALTER TABLE "applicants" ALTER COLUMN "marketing_consent" SET DEFAULT false`);
    await db.execute(sql5`UPDATE "applicants" SET "marketing_consent" = false WHERE "marketing_consent" IS NULL`);
    await db.execute(sql5`ALTER TABLE "applicants" ALTER COLUMN "marketing_consent" SET NOT NULL`);
    await db.execute(sql5`ALTER TABLE "applicants" ADD COLUMN IF NOT EXISTS "marketing_consent_at" timestamp`);
    await db.execute(sql5`ALTER TABLE "applicants" ADD COLUMN IF NOT EXISTS "photo_data" text`);
    await db.execute(sql5`ALTER TABLE "applicants" ADD COLUMN IF NOT EXISTS "photo_filename" text`);
    await db.execute(sql5`ALTER TABLE "applicants" ADD COLUMN IF NOT EXISTS "photo_mime_type" text`);
    await db.execute(sql5`ALTER TABLE "applicants" ADD COLUMN IF NOT EXISTS "photo_file_size" integer`);
    await db.execute(sql5`ALTER TABLE "applicants" ADD COLUMN IF NOT EXISTS "resume_data" text`);
    await db.execute(sql5`ALTER TABLE "applicants" ADD COLUMN IF NOT EXISTS "resume_filename" text`);
    await db.execute(sql5`ALTER TABLE "applicants" ADD COLUMN IF NOT EXISTS "resume_mime_type" text`);
    await db.execute(sql5`ALTER TABLE "applicants" ADD COLUMN IF NOT EXISTS "resume_file_size" integer`);
    log("Ensured worker_applications compatibility columns");
  } catch (error) {
    log("Error ensuring worker_applications compatibility:", error);
  }
}
async function backfillApprovedApplicationAccounts() {
  try {
    const approvedApps = await db.select({
      id: workerApplications.id,
      email: workerApplications.email,
      fullName: workerApplications.fullName,
      phone: workerApplications.phone,
      preferredRoles: workerApplications.preferredRoles
    }).from(workerApplications).where(eq6(workerApplications.status, "approved"));
    let created = 0;
    for (const app2 of approvedApps) {
      if (!app2.email) continue;
      const [existing] = await db.select({ id: users.id }).from(users).where(eq6(users.email, app2.email.toLowerCase())).limit(1);
      if (existing) continue;
      const crypto3 = await import("crypto");
      const firstName = (app2.fullName || "worker").split(" ")[0].toLowerCase().replace(/[^a-z]/g, "");
      const phoneLast4 = (app2.phone || "0000").replace(/\D/g, "").slice(-4);
      const tempPassword = `${firstName}${phoneLast4}`;
      const hashedPassword = await bcrypt2.hash(tempPassword, 10);
      await db.insert(users).values({
        id: crypto3.randomUUID(),
        email: app2.email.toLowerCase(),
        password: hashedPassword,
        fullName: app2.fullName || "Worker",
        role: "worker",
        phone: app2.phone || void 0,
        isActive: true,
        onboardingStatus: "AGREEMENT_PENDING",
        workerRoles: app2.preferredRoles || void 0,
        mustChangePassword: true,
        timezone: "America/Toronto"
      });
      created++;
    }
    if (created > 0) {
      log(`Backfilled ${created} user accounts from approved applications`);
    }
  } catch (error) {
    log("Error backfilling approved application accounts:", error);
  }
}
async function backfillWorkerPhones() {
  try {
    const workersWithoutPhone = await db.select({ id: users.id, email: users.email }).from(users).where(and5(eq6(users.role, "worker"), isNull3(users.phone)));
    if (workersWithoutPhone.length === 0) {
      return;
    }
    let backfilled = 0;
    for (const worker of workersWithoutPhone) {
      const [app2] = await db.select({ phone: workerApplications.phone }).from(workerApplications).where(and5(
        eq6(workerApplications.email, worker.email),
        eq6(workerApplications.status, "approved")
      )).limit(1);
      if (app2?.phone) {
        await db.update(users).set({ phone: app2.phone }).where(eq6(users.id, worker.id));
        backfilled++;
      }
    }
    if (backfilled > 0) {
      log(`Backfilled phone numbers for ${backfilled} workers from their applications`);
    }
  } catch (error) {
    log("Error backfilling worker phones:", error);
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
    origins.add("https://apply.wfconnect.org");
    origins.add("https://wfconnect.org");
    origins.add("https://www.wfconnect.org");
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
      limit: "30mb",
      // Increased for base64 file uploads (photo + resume, each up to 10MB → ~13.3MB base64)
      verify: (req, _res, buf) => {
        req.rawBody = buf;
      }
    })
  );
  app2.use(express.urlencoded({ extended: false, limit: "30mb" }));
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
  const applyFormPath = path.resolve(process.cwd(), "server", "templates", "apply-form.html");
  const applyFormTemplate = fs.existsSync(applyFormPath) ? fs.readFileSync(applyFormPath, "utf-8") : null;
  const applicantsPortalPath = path.resolve(process.cwd(), "server", "templates", "applicants-portal.html");
  const applicantsPortalTemplate = fs.existsSync(applicantsPortalPath) ? fs.readFileSync(applicantsPortalPath, "utf-8") : null;
  function isApplySubdomain(req) {
    const forwardedHostHeader = req.headers["x-forwarded-host"];
    const forwardedHost = Array.isArray(forwardedHostHeader) ? forwardedHostHeader[0] : forwardedHostHeader;
    const rawHost = (forwardedHost || req.hostname || req.headers.host || "").toLowerCase();
    const host = rawHost.split(",")[0]?.trim().split(":")[0] || "";
    if (!host) return false;
    return host === "apply.wfconnect.org" || host.startsWith("apply.");
  }
  if (applicantsPortalTemplate) {
    app2.get("/applicants", (req, res, next) => {
      if (!isApplySubdomain(req) && req.hostname !== "localhost" && !req.hostname?.includes("replit")) {
        return next();
      }
      res.setHeader("Content-Type", "text/html; charset=utf-8");
      res.setHeader("Cache-Control", "no-cache");
      const googleClientId = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID || "";
      const rendered = applicantsPortalTemplate.replace("__GOOGLE_CLIENT_ID__", googleClientId);
      return res.status(200).send(rendered);
    });
    log("Applicants admin portal available at /applicants and apply.wfconnect.org/applicants");
  }
  if (applyFormTemplate) {
    log("Applicant lead portal available at apply.wfconnect.org/apply");
  }
  const contractorGuidePath = path.resolve(process.cwd(), "server", "templates", "contractor-guide.html");
  const contractorGuideTemplate = renderGuideTemplate(fs.readFileSync(contractorGuidePath, "utf-8"));
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
  const termsPath = path.resolve(process.cwd(), "server", "templates", "terms.html");
  const termsTemplate = fs.readFileSync(termsPath, "utf-8");
  app2.get("/terms", (_req, res) => {
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.setHeader("Cache-Control", "public, max-age=3600");
    res.status(200).send(termsTemplate);
  });
  const accountDeletionPath = path.resolve(process.cwd(), "server", "templates", "account-deletion.html");
  const accountDeletionTemplate = fs.readFileSync(accountDeletionPath, "utf-8");
  app2.get("/account-deletion", (_req, res) => {
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.setHeader("Cache-Control", "public, max-age=3600");
    res.status(200).send(accountDeletionTemplate);
  });
  const applyPath = path.resolve(process.cwd(), "server", "templates", "apply.html");
  const applyTemplate = renderApplyTemplate(fs.readFileSync(applyPath, "utf-8"));
  app2.get("/apply", (req, res) => {
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    if (isApplySubdomain(req) && applyFormTemplate) {
      res.setHeader("Cache-Control", "no-cache");
      return res.status(200).send(applyFormTemplate);
    }
    res.setHeader("Cache-Control", "public, max-age=3600");
    return res.status(200).send(applyTemplate);
  });
  app2.get("/contractor-apply", (_req, res) => {
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.setHeader("Cache-Control", "public, max-age=3600");
    return res.status(200).send(applyTemplate);
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
  app2.get("/admin", (_req, res) => {
    res.redirect(301, "/admin/applications");
  });
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
    if (isApplySubdomain(req) && applyFormTemplate) {
      res.setHeader("Content-Type", "text/html; charset=utf-8");
      res.setHeader("Cache-Control", "no-cache");
      return res.status(200).send(applyFormTemplate);
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
  await ensureWorkerApplicationsCompatibility();
  if (isDemoMode) {
    log("DEMO MODE enabled - seeding demo data...");
    await seedDemoUsers();
    await seedWorkplaces();
    await seedTimesheets();
  } else {
    log("PRODUCTION MODE - skipping demo data seeding");
    await seedProductionAdmin();
    await backfillWorkerPhones();
    await backfillApprovedApplicationAccounts();
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
