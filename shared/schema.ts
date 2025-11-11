import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, timestamp, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Target monitoring configuration
export const targets = pgTable("targets", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  name: text("name").notNull(),
  type: varchar("type", { length: 10 }).notNull(), // HTTP, TCP, ICMP
  endpoint: text("endpoint").notNull(),
  frequencySec: integer("frequency_sec").notNull().default(60),
  expectedCode: integer("expected_code"),
  timeoutMs: integer("timeout_ms").notNull().default(5000),
  alertEmail: text("alert_email"),
  enabled: boolean("enabled").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Check results history
export const results = pgTable("results", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  targetId: integer("target_id").notNull().references(() => targets.id, { onDelete: 'cascade' }),
  status: varchar("status", { length: 10 }).notNull(), // UP, DOWN
  latencyMs: integer("latency_ms").notNull(),
  code: integer("code"),
  message: text("message"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Zod schemas for validation
export const insertTargetSchema = createInsertSchema(targets, {
  name: z.string().min(1, "Name is required"),
  type: z.enum(["HTTP", "TCP", "ICMP"]),
  endpoint: z.string().min(1, "Endpoint is required"),
  frequencySec: z.number().int().min(10).max(86400),
  timeoutMs: z.number().int().min(1000).max(60000),
  alertEmail: z.string().email().optional().or(z.literal('')),
  enabled: z.boolean(),
}).omit({
  id: true,
  createdAt: true,
});

export const insertResultSchema = createInsertSchema(results, {
  status: z.enum(["UP", "DOWN"]),
  targetId: z.number(),
  latencyMs: z.number(),
}).omit({
  id: true,
  createdAt: true,
});

// TypeScript types
export type Target = typeof targets.$inferSelect;
export type InsertTarget = z.infer<typeof insertTargetSchema>;
export type Result = typeof results.$inferSelect;
export type InsertResult = z.infer<typeof insertResultSchema>;

// WebSocket event types
export type CheckResultEvent = {
  targetId: number;
  name: string;
  type: string;
  status: 'UP' | 'DOWN';
  latency: number;
  code: number;
  at: string;
};

// Notification channels for alerts
export const notificationChannels = pgTable("notification_channels", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  name: text("name").notNull(),
  type: varchar("type", { length: 20 }).notNull(), // email, slack, pagerduty, webhook
  enabled: boolean("enabled").notNull().default(true),
  config: text("config").notNull(), // JSON string containing channel-specific configuration
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertNotificationChannelSchema = createInsertSchema(notificationChannels, {
  name: z.string().min(1, "Name is required"),
  type: z.enum(["email", "slack", "pagerduty", "webhook"]),
  enabled: z.boolean(),
  config: z.string().min(1, "Configuration is required"),
}).omit({
  id: true,
  createdAt: true,
});

export type NotificationChannel = typeof notificationChannels.$inferSelect;
export type InsertNotificationChannel = z.infer<typeof insertNotificationChannelSchema>;

// AWS Accounts for CloudWatch Logs
export const awsAccounts = pgTable("aws_accounts", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  name: text("name").notNull(),
  region: varchar("region", { length: 20 }).notNull(),
  accessKeyId: text("access_key_id").notNull(),
  secretAccessKey: text("secret_access_key").notNull(),
  enabled: boolean("enabled").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertAwsAccountSchema = createInsertSchema(awsAccounts, {
  name: z.string().min(1, "Name is required"),
  region: z.string().min(1, "Region is required"),
  accessKeyId: z.string().min(1, "Access Key ID is required"),
  secretAccessKey: z.string().min(1, "Secret Access Key is required"),
  enabled: z.boolean(),
}).omit({
  id: true,
  createdAt: true,
});

export type AwsAccount = typeof awsAccounts.$inferSelect;
export type InsertAwsAccount = z.infer<typeof insertAwsAccountSchema>;

// CloudWatch Log types
export type LogEvent = {
  ts: number;
  stream: string;
  message: string;
};

// Users table for authentication
export const users = pgTable("users", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  username: varchar("username", { length: 50 }).notNull().unique(),
  password: text("password").notNull(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  role: varchar("role", { length: 20 }).notNull().default("user"), // admin or user
  twoFactorSecret: text("two_factor_secret"),
  twoFactorEnabled: boolean("two_factor_enabled").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertUserSchema = createInsertSchema(users, {
  username: z.string().min(3, "Username must be at least 3 characters").max(50),
  password: z.string().min(8, "Password must be at least 8 characters"),
  email: z.string().email("Invalid email address"),
  role: z.enum(["admin", "user"]),
}).omit({
  id: true,
  createdAt: true,
  twoFactorSecret: true,
  twoFactorEnabled: true,
});

export const loginSchema = z.object({
  username: z.string().min(1, "Username is required"),
  password: z.string().min(1, "Password is required"),
  twoFactorCode: z.string().optional(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type LoginCredentials = z.infer<typeof loginSchema>;

// Safe user type without password for client-side use
export type SafeUser = Omit<User, 'password' | 'twoFactorSecret'>;
