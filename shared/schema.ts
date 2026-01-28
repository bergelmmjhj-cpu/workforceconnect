import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, integer, boolean } from "drizzle-orm/pg-core";
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

// Quo Communication Schema

export const quoConversations = pgTable("quo_conversations", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  externalId: text("external_id"),
  participantType: text("participant_type").notNull(), // 'worker', 'client', 'other'
  participantId: text("participant_id"), // Reference to worker/client if applicable
  participantName: text("participant_name"),
  participantPhone: text("participant_phone").notNull(),
  lastMessageAt: timestamp("last_message_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const quoMessages = pgTable("quo_messages", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  conversationId: varchar("conversation_id")
    .notNull()
    .references(() => quoConversations.id),
  externalId: text("external_id"),
  direction: text("direction").notNull(), // 'inbound' or 'outbound'
  toNumber: text("to_number").notNull(),
  fromNumber: text("from_number").notNull(),
  body: text("body").notNull(),
  status: text("status").notNull(), // 'pending', 'sent', 'delivered', 'failed'
  sentAt: timestamp("sent_at"),
  deliveredAt: timestamp("delivered_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const quoCallLogs = pgTable("quo_call_logs", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  externalId: text("external_id"),
  direction: text("direction").notNull(), // 'inbound' or 'outbound'
  toNumber: text("to_number").notNull(),
  fromNumber: text("from_number").notNull(),
  status: text("status").notNull(), // 'initiated', 'ringing', 'in-progress', 'completed', 'failed', 'no-answer'
  startedAt: timestamp("started_at").notNull(),
  endedAt: timestamp("ended_at"),
  durationSeconds: integer("duration_seconds"),
  recordingUrl: text("recording_url"),
  participantName: text("participant_name"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertQuoConversationSchema = createInsertSchema(quoConversations);
export const insertQuoMessageSchema = createInsertSchema(quoMessages);
export const insertQuoCallLogSchema = createInsertSchema(quoCallLogs);

export type QuoConversation = typeof quoConversations.$inferSelect;
export type InsertQuoConversation = z.infer<typeof insertQuoConversationSchema>;
export type QuoMessage = typeof quoMessages.$inferSelect;
export type InsertQuoMessage = z.infer<typeof insertQuoMessageSchema>;
export type QuoCallLog = typeof quoCallLogs.$inferSelect;
export type InsertQuoCallLog = z.infer<typeof insertQuoCallLogSchema>;

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
