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
