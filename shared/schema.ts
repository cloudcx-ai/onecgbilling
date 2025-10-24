import { sql } from "drizzle-orm";
import { pgTable, text, varchar } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

export const clients = pgTable("clients", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  authToken: text("auth_token").notNull(),
});

export const insertClientSchema = createInsertSchema(clients).omit({
  id: true,
});

export type InsertClient = z.infer<typeof insertClientSchema>;
export type Client = typeof clients.$inferSelect;

// API Response Types for Genesys Cloud
export interface BillingPeriod {
  startDate: string;
  endDate: string;
}

export interface BillingPeriodsResponse {
  entities?: BillingPeriod[];
}

export interface Usage {
  name?: string;
  partNumber?: string;
  grouping?: string;
  unitOfMeasureType?: string;
  usageQuantity?: string;
  overagePrice?: string;
  isCancellable?: boolean;
  bundleQuantity?: string;
  isThirdParty?: boolean;
}

export interface EnabledProduct {
  name?: string;
  partNumber?: string;
}

export interface SubscriptionOverview {
  currency?: string;
  subscriptionType?: string;
  usages?: Usage[];
  enabledProducts?: EnabledProduct[];
  isInRampPeriod?: boolean;
  rampPeriodStartingTimestamp?: string;
  rampPeriodEndingTimestamp?: string;
  minimumMonthlyAmount?: string;
  selfUri?: string;
}
