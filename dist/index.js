var __defProp = Object.defineProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// server/index.ts
import express2 from "express";
import session from "express-session";

// server/routes.ts
import { createServer } from "http";
import { WebSocketServer as WebSocketServer2 } from "ws";

// shared/schema.ts
var schema_exports = {};
__export(schema_exports, {
  awsAccounts: () => awsAccounts,
  insertAwsAccountSchema: () => insertAwsAccountSchema,
  insertNotificationChannelSchema: () => insertNotificationChannelSchema,
  insertResultSchema: () => insertResultSchema,
  insertTargetSchema: () => insertTargetSchema,
  insertUserSchema: () => insertUserSchema,
  loginSchema: () => loginSchema,
  notificationChannels: () => notificationChannels,
  results: () => results,
  targets: () => targets,
  users: () => users
});
import { pgTable, text, varchar, integer, timestamp, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
var targets = pgTable("targets", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  name: text("name").notNull(),
  type: varchar("type", { length: 10 }).notNull(),
  // HTTP, TCP, ICMP
  endpoint: text("endpoint").notNull(),
  frequencySec: integer("frequency_sec").notNull().default(60),
  expectedCode: integer("expected_code"),
  timeoutMs: integer("timeout_ms").notNull().default(5e3),
  alertEmail: text("alert_email"),
  enabled: boolean("enabled").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow()
});
var results = pgTable("results", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  targetId: integer("target_id").notNull().references(() => targets.id, { onDelete: "cascade" }),
  status: varchar("status", { length: 10 }).notNull(),
  // UP, DOWN
  latencyMs: integer("latency_ms").notNull(),
  code: integer("code"),
  message: text("message"),
  createdAt: timestamp("created_at").notNull().defaultNow()
});
var insertTargetSchema = createInsertSchema(targets, {
  name: z.string().min(1, "Name is required"),
  type: z.enum(["HTTP", "TCP", "ICMP"]),
  endpoint: z.string().min(1, "Endpoint is required"),
  frequencySec: z.number().int().min(10).max(86400),
  timeoutMs: z.number().int().min(1e3).max(6e4),
  alertEmail: z.string().email().optional().or(z.literal("")),
  enabled: z.boolean()
}).omit({
  id: true,
  createdAt: true
});
var insertResultSchema = createInsertSchema(results, {
  status: z.enum(["UP", "DOWN"]),
  targetId: z.number(),
  latencyMs: z.number()
}).omit({
  id: true,
  createdAt: true
});
var notificationChannels = pgTable("notification_channels", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  name: text("name").notNull(),
  type: varchar("type", { length: 20 }).notNull(),
  // email, slack, pagerduty, webhook
  enabled: boolean("enabled").notNull().default(true),
  config: text("config").notNull(),
  // JSON string containing channel-specific configuration
  createdAt: timestamp("created_at").notNull().defaultNow()
});
var insertNotificationChannelSchema = createInsertSchema(notificationChannels, {
  name: z.string().min(1, "Name is required"),
  type: z.enum(["email", "slack", "pagerduty", "webhook"]),
  enabled: z.boolean(),
  config: z.string().min(1, "Configuration is required")
}).omit({
  id: true,
  createdAt: true
});
var awsAccounts = pgTable("aws_accounts", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  name: text("name").notNull(),
  region: varchar("region", { length: 20 }).notNull(),
  accessKeyId: text("access_key_id").notNull(),
  secretAccessKey: text("secret_access_key").notNull(),
  enabled: boolean("enabled").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow()
});
var insertAwsAccountSchema = createInsertSchema(awsAccounts, {
  name: z.string().min(1, "Name is required"),
  region: z.string().min(1, "Region is required"),
  accessKeyId: z.string().min(1, "Access Key ID is required"),
  secretAccessKey: z.string().min(1, "Secret Access Key is required"),
  enabled: z.boolean()
}).omit({
  id: true,
  createdAt: true
});
var users = pgTable("users", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  username: varchar("username", { length: 50 }).notNull().unique(),
  password: text("password").notNull(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  role: varchar("role", { length: 20 }).notNull().default("user"),
  // admin or user
  twoFactorSecret: text("two_factor_secret"),
  twoFactorEnabled: boolean("two_factor_enabled").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow()
});
var insertUserSchema = createInsertSchema(users, {
  username: z.string().min(3, "Username must be at least 3 characters").max(50),
  password: z.string().min(8, "Password must be at least 8 characters"),
  email: z.string().email("Invalid email address"),
  role: z.enum(["admin", "user"])
}).omit({
  id: true,
  createdAt: true,
  twoFactorSecret: true,
  twoFactorEnabled: true
});
var loginSchema = z.object({
  username: z.string().min(1, "Username is required"),
  password: z.string().min(1, "Password is required"),
  twoFactorCode: z.string().optional()
});

// server/db.ts
import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?"
  );
}
var pool = new Pool({ connectionString: process.env.DATABASE_URL });
var db = drizzle(pool, { schema: schema_exports });

// server/storage.ts
import { eq, desc } from "drizzle-orm";

// server/crypto-utils.ts
import crypto from "crypto";
var ALGORITHM = "aes-256-gcm";
var IV_LENGTH = 16;
function getEncryptionKey() {
  const secret = process.env.SESSION_SECRET || "default-insecure-secret-change-me";
  return crypto.scryptSync(secret, "salt", 32);
}
function encrypt(text2) {
  const iv = crypto.randomBytes(IV_LENGTH);
  const key = getEncryptionKey();
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  let encrypted = cipher.update(text2, "utf8", "hex");
  encrypted += cipher.final("hex");
  const tag = cipher.getAuthTag();
  return iv.toString("hex") + ":" + tag.toString("hex") + ":" + encrypted;
}
function decrypt(encryptedData) {
  const parts = encryptedData.split(":");
  if (parts.length !== 3) {
    throw new Error("Invalid encrypted data format");
  }
  const iv = Buffer.from(parts[0], "hex");
  const tag = Buffer.from(parts[1], "hex");
  const encrypted = parts[2];
  const key = getEncryptionKey();
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(tag);
  let decrypted = decipher.update(encrypted, "hex", "utf8");
  decrypted += decipher.final("utf8");
  return decrypted;
}

// server/storage.ts
var DatabaseStorage = class {
  async getAllTargets() {
    return db.select().from(targets).orderBy(desc(targets.id));
  }
  async getTarget(id) {
    const [target] = await db.select().from(targets).where(eq(targets.id, id));
    return target || void 0;
  }
  async getEnabledTargets() {
    return db.select().from(targets).where(eq(targets.enabled, true));
  }
  async createTarget(insertTarget) {
    const [target] = await db.insert(targets).values(insertTarget).returning();
    return target;
  }
  async updateTarget(id, insertTarget) {
    await db.update(targets).set(insertTarget).where(eq(targets.id, id));
  }
  async deleteTarget(id) {
    await db.delete(targets).where(eq(targets.id, id));
  }
  async createResult(insertResult) {
    const [result] = await db.insert(results).values(insertResult).returning();
    return result;
  }
  async getResultsByTarget(targetId, limit = 200) {
    return db.select().from(results).where(eq(results.targetId, targetId)).orderBy(desc(results.id)).limit(limit);
  }
  async getLastResultsForTarget(targetId, count) {
    return db.select().from(results).where(eq(results.targetId, targetId)).orderBy(desc(results.id)).limit(count);
  }
  async getAllNotificationChannels() {
    return db.select().from(notificationChannels).orderBy(desc(notificationChannels.id));
  }
  async getNotificationChannel(id) {
    const [channel] = await db.select().from(notificationChannels).where(eq(notificationChannels.id, id));
    return channel || void 0;
  }
  async getEnabledNotificationChannels() {
    return db.select().from(notificationChannels).where(eq(notificationChannels.enabled, true));
  }
  async createNotificationChannel(insertChannel) {
    const [channel] = await db.insert(notificationChannels).values(insertChannel).returning();
    return channel;
  }
  async updateNotificationChannel(id, insertChannel) {
    await db.update(notificationChannels).set(insertChannel).where(eq(notificationChannels.id, id));
  }
  async deleteNotificationChannel(id) {
    await db.delete(notificationChannels).where(eq(notificationChannels.id, id));
  }
  // Client-safe methods - NO credentials exposed
  async getAllAwsAccountsForClient() {
    const accounts = await db.select().from(awsAccounts).orderBy(desc(awsAccounts.id));
    return accounts.map(({ accessKeyId, secretAccessKey, ...account }) => account);
  }
  async getAwsAccountForClient(id) {
    const [account] = await db.select().from(awsAccounts).where(eq(awsAccounts.id, id));
    if (!account) return void 0;
    const { accessKeyId, secretAccessKey, ...safeAccount } = account;
    return safeAccount;
  }
  // Server-side only - includes decrypted credentials for CloudWatch queries
  async getAwsAccountWithCredentials(id) {
    const [account] = await db.select().from(awsAccounts).where(eq(awsAccounts.id, id));
    if (!account) return void 0;
    return {
      ...account,
      accessKeyId: decrypt(account.accessKeyId),
      secretAccessKey: decrypt(account.secretAccessKey)
    };
  }
  async createAwsAccount(insertAccount) {
    const encryptedAccount = {
      ...insertAccount,
      accessKeyId: encrypt(insertAccount.accessKeyId),
      secretAccessKey: encrypt(insertAccount.secretAccessKey)
    };
    const [account] = await db.insert(awsAccounts).values(encryptedAccount).returning();
    const { accessKeyId, secretAccessKey, ...safeAccount } = account;
    return safeAccount;
  }
  async updateAwsAccount(id, insertAccount) {
    const updateData = { ...insertAccount };
    if (insertAccount.accessKeyId) {
      updateData.accessKeyId = encrypt(insertAccount.accessKeyId);
    }
    if (insertAccount.secretAccessKey) {
      updateData.secretAccessKey = encrypt(insertAccount.secretAccessKey);
    }
    await db.update(awsAccounts).set(updateData).where(eq(awsAccounts.id, id));
  }
  async deleteAwsAccount(id) {
    await db.delete(awsAccounts).where(eq(awsAccounts.id, id));
  }
  // User operations
  async getAllUsers() {
    const allUsers = await db.select().from(users).orderBy(desc(users.id));
    return allUsers.map(({ password, twoFactorSecret, ...safeUser }) => safeUser);
  }
  async getUser(id) {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || void 0;
  }
  async getUserByUsername(username) {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user || void 0;
  }
  async getUserByEmail(email) {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user || void 0;
  }
  async createUser(userData) {
    const { hashedPassword, ...userWithoutPassword } = userData;
    const [user] = await db.insert(users).values({
      ...userWithoutPassword,
      password: hashedPassword,
      twoFactorEnabled: false
    }).returning();
    return user;
  }
  async updateUser(id, userData) {
    await db.update(users).set(userData).where(eq(users.id, id));
  }
  async deleteUser(id) {
    await db.delete(users).where(eq(users.id, id));
  }
};
var storage = new DatabaseStorage();

// server/health-checks.ts
import axios from "axios";
import * as net from "net";
async function httpCheck(url, timeoutMs = 5e3) {
  const started = Date.now();
  try {
    const res = await axios.get(url, {
      timeout: timeoutMs,
      validateStatus: () => true,
      maxRedirects: 5
    });
    const latency = Date.now() - started;
    const ok = res.status >= 200 && res.status < 400;
    return {
      ok,
      latency,
      code: res.status,
      message: res.statusText || `HTTP ${res.status}`
    };
  } catch (e) {
    return {
      ok: false,
      latency: Date.now() - started,
      code: 0,
      message: e.message || "Request failed"
    };
  }
}
function tcpCheck(host, port, timeoutMs = 5e3) {
  const started = Date.now();
  return new Promise((resolve) => {
    const socket = new net.Socket();
    let done = false;
    const finish = (ok, message) => {
      if (done) return;
      done = true;
      try {
        socket.destroy();
      } catch {
      }
      resolve({
        ok,
        latency: Date.now() - started,
        code: ok ? 1 : 0,
        message
      });
    };
    socket.setTimeout(timeoutMs);
    socket.connect(port, host, () => finish(true, "connected"));
    socket.on("error", (err) => finish(false, err.message));
    socket.on("timeout", () => finish(false, "timeout"));
  });
}
async function icmpCheck(host, timeoutMs = 5e3) {
  const started = Date.now();
  return {
    ok: false,
    latency: Date.now() - started,
    code: 0,
    message: "ICMP ping not supported on this platform (requires native modules)"
  };
}

// server/alerts.ts
import nodemailer from "nodemailer";
var transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || "localhost",
  port: Number(process.env.SMTP_PORT || 25),
  secure: process.env.SMTP_PORT === "465",
  auth: process.env.SMTP_USER ? {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  } : void 0,
  tls: {
    rejectUnauthorized: false
  }
});
async function sendAlert(to, subject, html) {
  if (!to) return;
  try {
    await transporter.sendMail({
      from: process.env.FROM_EMAIL || "monitor@cloudcx.local",
      to,
      subject,
      html
    });
    console.log(`Alert sent to ${to}: ${subject}`);
  } catch (e) {
    console.error("Alert send failed:", e.message);
  }
}

// server/notifications.ts
import axios2 from "axios";
async function sendNotification(channel, payload) {
  if (!channel.enabled) {
    console.log(`Channel ${channel.name} is disabled, skipping notification`);
    return;
  }
  try {
    let config;
    try {
      config = JSON.parse(channel.config);
    } catch (parseError) {
      console.error(`Invalid JSON config for channel ${channel.name}:`, parseError.message);
      return;
    }
    switch (channel.type) {
      case "email":
        if (!config.email) {
          console.error(`Channel ${channel.name} missing 'email' in config`);
          return;
        }
        await sendEmailNotification(config, payload);
        break;
      case "slack":
        if (!config.webhookUrl) {
          console.error(`Channel ${channel.name} missing 'webhookUrl' in config`);
          return;
        }
        await sendSlackNotification(config, payload);
        break;
      case "pagerduty":
        if (!config.routingKey) {
          console.error(`Channel ${channel.name} missing 'routingKey' in config`);
          return;
        }
        await sendPagerDutyNotification(config, payload);
        break;
      case "webhook":
        if (!config.url) {
          console.error(`Channel ${channel.name} missing 'url' in config`);
          return;
        }
        await sendWebhookNotification(config, payload);
        break;
      default:
        console.error(`Unknown channel type: ${channel.type}`);
    }
  } catch (error) {
    console.error(`Failed to send notification via ${channel.name}:`, error.message);
  }
}
async function sendEmailNotification(config, payload) {
  const { email } = config;
  const subject = payload.status === "DOWN" ? `\u26A0\uFE0F ${payload.targetName} is DOWN` : `\u2705 ${payload.targetName} has recovered`;
  const body = `<h2>${payload.status === "DOWN" ? "Alert" : "Recovery"}: ${payload.targetName}</h2>
    <p><strong>Type:</strong> ${payload.targetType}</p>
    <p><strong>Endpoint:</strong> ${payload.targetEndpoint}</p>
    <p><strong>Status:</strong> ${payload.status}</p>
    <p><strong>Time:</strong> ${payload.timestamp}</p>
    ${payload.message ? `<p><strong>Message:</strong> ${payload.message}</p>` : ""}
    ${payload.latency ? `<p><strong>Latency:</strong> ${payload.latency}ms</p>` : ""}`;
  await sendAlert(email, subject, body);
}
async function sendSlackNotification(config, payload) {
  const { webhookUrl } = config;
  const color = payload.status === "DOWN" ? "danger" : "good";
  const emoji = payload.status === "DOWN" ? ":warning:" : ":white_check_mark:";
  const message = {
    text: `${emoji} ${payload.targetName} is ${payload.status}`,
    attachments: [
      {
        color,
        fields: [
          { title: "Target", value: payload.targetName, short: true },
          { title: "Type", value: payload.targetType, short: true },
          { title: "Endpoint", value: payload.targetEndpoint, short: false },
          { title: "Status", value: payload.status, short: true },
          ...payload.latency ? [{ title: "Latency", value: `${payload.latency}ms`, short: true }] : [],
          ...payload.message ? [{ title: "Message", value: payload.message, short: false }] : []
        ],
        footer: "CloudCX Monitor",
        ts: Math.floor(new Date(payload.timestamp).getTime() / 1e3)
      }
    ]
  };
  await axios2.post(webhookUrl, message);
}
async function sendPagerDutyNotification(config, payload) {
  const { routingKey } = config;
  const event = {
    routing_key: routingKey,
    event_action: payload.status === "DOWN" ? "trigger" : "resolve",
    dedup_key: `cloudcx-${payload.targetName}`,
    payload: {
      summary: `${payload.targetName} is ${payload.status}`,
      severity: payload.status === "DOWN" ? "error" : "info",
      source: payload.targetEndpoint,
      timestamp: payload.timestamp,
      custom_details: {
        type: payload.targetType,
        endpoint: payload.targetEndpoint,
        latency: payload.latency,
        message: payload.message
      }
    }
  };
  await axios2.post("https://events.pagerduty.com/v2/enqueue", event);
}
async function sendWebhookNotification(config, payload) {
  const { url, method = "POST", headers = {} } = config;
  const body = {
    target: payload.targetName,
    type: payload.targetType,
    endpoint: payload.targetEndpoint,
    status: payload.status,
    timestamp: payload.timestamp,
    latency: payload.latency,
    message: payload.message
  };
  await axios2({
    method,
    url,
    headers,
    data: body
  });
}

// server/scheduler.ts
import { WebSocket } from "ws";
var running = /* @__PURE__ */ new Set();
function startScheduler(wss) {
  console.log("Starting health check scheduler...");
  setInterval(async () => {
    try {
      const targets2 = await storage.getEnabledTargets();
      const now = Math.floor(Date.now() / 1e3);
      for (const target of targets2) {
        if (running.has(target.id)) continue;
        if (target.frequencySec <= 0) continue;
        if (now % target.frequencySec !== 0) continue;
        running.add(target.id);
        runCheck(target, wss).finally(() => running.delete(target.id));
      }
    } catch (error) {
      console.error("Scheduler error:", error.message);
    }
  }, 1e3);
}
async function runCheck(target, wss) {
  let checkResult;
  try {
    if (target.type === "HTTP") {
      checkResult = await httpCheck(target.endpoint, target.timeoutMs);
    } else if (target.type === "TCP") {
      const [host, portStr] = target.endpoint.split(":");
      const port = parseInt(portStr, 10);
      checkResult = await tcpCheck(host, port, target.timeoutMs);
    } else if (target.type === "ICMP") {
      checkResult = await icmpCheck(target.endpoint, target.timeoutMs);
    } else {
      checkResult = { ok: false, latency: 0, code: 0, message: "Unknown check type" };
    }
  } catch (e) {
    checkResult = { ok: false, latency: 0, code: 0, message: e.message };
  }
  const status = checkResult.ok ? "UP" : "DOWN";
  await storage.createResult({
    targetId: target.id,
    status,
    latencyMs: checkResult.latency,
    code: checkResult.code || 0,
    message: (checkResult.message || "").slice(0, 500)
  });
  const event = {
    targetId: target.id,
    name: target.name,
    type: target.type,
    status,
    latency: checkResult.latency,
    code: checkResult.code || 0,
    at: (/* @__PURE__ */ new Date()).toISOString()
  };
  broadcastToClients(wss, event);
  const lastResults = await storage.getLastResultsForTarget(target.id, 2);
  if (lastResults.length >= 2) {
    const [latest, previous] = lastResults;
    if (latest.status === "DOWN" && previous.status === "UP") {
      if (target.alertEmail) {
        await sendAlert(
          target.alertEmail,
          `\u26A0\uFE0F ${target.name} is DOWN`,
          `<h2>Alert: ${target.name} is DOWN</h2>
           <p><strong>Type:</strong> ${target.type}</p>
           <p><strong>Endpoint:</strong> ${target.endpoint}</p>
           <p><strong>Time:</strong> ${(/* @__PURE__ */ new Date()).toISOString()}</p>
           <p><strong>Message:</strong> ${checkResult.message}</p>`
        );
      }
      const channels = await storage.getEnabledNotificationChannels();
      for (const channel of channels) {
        try {
          await sendNotification(channel, {
            targetName: target.name,
            targetType: target.type,
            targetEndpoint: target.endpoint,
            status: "DOWN",
            message: checkResult.message,
            latency: checkResult.latency,
            timestamp: (/* @__PURE__ */ new Date()).toISOString()
          });
        } catch (error) {
          console.error(`Failed to send notification via ${channel.name}:`, error.message);
        }
      }
    }
    if (latest.status === "UP" && previous.status === "DOWN") {
      if (target.alertEmail) {
        await sendAlert(
          target.alertEmail,
          `\u2705 ${target.name} has recovered`,
          `<h2>${target.name} is back UP</h2>
           <p><strong>Type:</strong> ${target.type}</p>
           <p><strong>Endpoint:</strong> ${target.endpoint}</p>
           <p><strong>Time:</strong> ${(/* @__PURE__ */ new Date()).toISOString()}</p>
           <p><strong>Latency:</strong> ${checkResult.latency}ms</p>`
        );
      }
      const channels = await storage.getEnabledNotificationChannels();
      for (const channel of channels) {
        try {
          await sendNotification(channel, {
            targetName: target.name,
            targetType: target.type,
            targetEndpoint: target.endpoint,
            status: "UP",
            latency: checkResult.latency,
            timestamp: (/* @__PURE__ */ new Date()).toISOString()
          });
        } catch (error) {
          console.error(`Failed to send notification via ${channel.name}:`, error.message);
        }
      }
    }
  }
}
function broadcastToClients(wss, event) {
  const message = JSON.stringify({ type: "check_result", payload: event });
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(message);
    }
  });
}

// server/routes.ts
import { CloudWatchLogsClient, FilterLogEventsCommand } from "@aws-sdk/client-cloudwatch-logs";

// server/auth.ts
import bcrypt from "bcryptjs";
import { authenticator } from "otplib";
import QRCode from "qrcode";
async function hashPassword(password) {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
}
async function verifyPassword(password, hash) {
  return bcrypt.compare(password, hash);
}
function generateTwoFactorSecret() {
  return authenticator.generateSecret();
}
function verifyTwoFactorToken(secret, token) {
  try {
    return authenticator.verify({ token, secret });
  } catch (error) {
    return false;
  }
}
async function generateQRCode(username, secret) {
  const otpauth = authenticator.keyuri(username, "CloudCX Monitor", secret);
  return QRCode.toDataURL(otpauth);
}
function toSafeUser(user) {
  const { password, twoFactorSecret, ...safeUser } = user;
  return safeUser;
}
function requireAuth(req, res, next) {
  if (!req.session.userId) {
    return res.status(401).json({ error: "Authentication required" });
  }
  next();
}
function createRequireAdmin(getUserById) {
  return async function requireAdmin(req, res, next) {
    if (!req.session.userId) {
      return res.status(401).json({ error: "Authentication required" });
    }
    try {
      const user = await getUserById(req.session.userId);
      if (!user) {
        return res.status(401).json({ error: "User not found" });
      }
      if (user.role !== "admin") {
        return res.status(403).json({ error: "Admin privileges required" });
      }
      next();
    } catch (error) {
      return res.status(500).json({ error: "Internal server error" });
    }
  };
}

// server/routes.ts
function authMiddleware(req, res, next) {
  const apiKey = req.headers["x-api-key"];
  const expectedKey = process.env.API_KEY || "demo-api-key";
  if (!apiKey || apiKey !== expectedKey) {
    return res.status(401).json({ error: "Unauthorized - invalid API key" });
  }
  next();
}
async function registerRoutes(app2) {
  const httpServer = createServer(app2);
  const requireAdmin = createRequireAdmin((id) => storage.getUser(id));
  const wss = new WebSocketServer2({ server: httpServer, path: "/ws" });
  wss.on("connection", (ws) => {
    console.log("WebSocket client connected");
    ws.on("close", () => {
      console.log("WebSocket client disconnected");
    });
  });
  startScheduler(wss);
  app2.get("/api/healthz", (_req, res) => {
    res.json({ ok: true, timestamp: (/* @__PURE__ */ new Date()).toISOString() });
  });
  app2.post("/api/auth/login", async (req, res) => {
    try {
      const { username, password, twoFactorCode } = loginSchema.parse(req.body);
      const user = await storage.getUserByUsername(username);
      if (!user) {
        return res.status(401).json({ error: "Invalid credentials" });
      }
      const validPassword = await verifyPassword(password, user.password);
      if (!validPassword) {
        return res.status(401).json({ error: "Invalid credentials" });
      }
      if (user.twoFactorEnabled && user.twoFactorSecret) {
        if (!twoFactorCode) {
          req.session.pendingTwoFactor = user.id;
          return res.json({ requires2FA: true });
        }
        const valid2FA = verifyTwoFactorToken(user.twoFactorSecret, twoFactorCode);
        if (!valid2FA) {
          return res.status(401).json({ error: "Invalid 2FA code" });
        }
      }
      req.session.userId = user.id;
      delete req.session.pendingTwoFactor;
      res.json({ user: toSafeUser(user) });
    } catch (error) {
      if (error.name === "ZodError") {
        return res.status(400).json({ error: "Validation error", details: error.errors });
      }
      res.status(500).json({ error: error.message });
    }
  });
  app2.post("/api/auth/logout", (req, res) => {
    req.session.destroy((err) => {
      if (err) {
        return res.status(500).json({ error: "Failed to logout" });
      }
      res.json({ success: true });
    });
  });
  app2.get("/api/auth/me", requireAuth, async (req, res) => {
    try {
      const user = await storage.getUser(req.session.userId);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
      res.json(toSafeUser(user));
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
  app2.post("/api/auth/2fa/setup", requireAuth, async (req, res) => {
    try {
      const user = await storage.getUser(req.session.userId);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
      const secret = generateTwoFactorSecret();
      const qrCode = await generateQRCode(user.username, secret);
      await storage.updateUser(user.id, { twoFactorSecret: secret });
      res.json({ secret, qrCode });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
  app2.post("/api/auth/2fa/enable", requireAuth, async (req, res) => {
    try {
      const { code } = req.body;
      if (!code) {
        return res.status(400).json({ error: "Code is required" });
      }
      const user = await storage.getUser(req.session.userId);
      if (!user || !user.twoFactorSecret) {
        return res.status(400).json({ error: "2FA not set up" });
      }
      const valid = verifyTwoFactorToken(user.twoFactorSecret, code);
      if (!valid) {
        return res.status(400).json({ error: "Invalid code" });
      }
      await storage.updateUser(user.id, { twoFactorEnabled: true });
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
  app2.post("/api/auth/2fa/disable", requireAuth, async (req, res) => {
    try {
      await storage.updateUser(req.session.userId, {
        twoFactorEnabled: false,
        twoFactorSecret: null
      });
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
  app2.get("/api/admin/users", authMiddleware, requireAuth, requireAdmin, async (req, res) => {
    try {
      const currentUser = await storage.getUser(req.session.userId);
      if (!currentUser || currentUser.role !== "admin") {
        return res.status(403).json({ error: "Forbidden - admin access required" });
      }
      const users2 = await storage.getAllUsers();
      res.json(users2);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
  app2.post("/api/admin/users", authMiddleware, requireAuth, requireAdmin, async (req, res) => {
    try {
      const currentUser = await storage.getUser(req.session.userId);
      if (!currentUser || currentUser.role !== "admin") {
        return res.status(403).json({ error: "Forbidden - admin access required" });
      }
      const validated = insertUserSchema.parse(req.body);
      const existingUser = await storage.getUserByUsername(validated.username);
      if (existingUser) {
        return res.status(400).json({ error: "Username already exists" });
      }
      const existingEmail = await storage.getUserByEmail(validated.email);
      if (existingEmail) {
        return res.status(400).json({ error: "Email already exists" });
      }
      const hashedPassword = await hashPassword(validated.password);
      const user = await storage.createUser({ ...validated, hashedPassword });
      res.json(toSafeUser(user));
    } catch (error) {
      if (error.name === "ZodError") {
        return res.status(400).json({ error: "Validation error", details: error.errors });
      }
      res.status(500).json({ error: error.message });
    }
  });
  app2.put("/api/admin/users/:id", authMiddleware, requireAuth, requireAdmin, async (req, res) => {
    try {
      const currentUser = await storage.getUser(req.session.userId);
      if (!currentUser || currentUser.role !== "admin") {
        return res.status(403).json({ error: "Forbidden - admin access required" });
      }
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) {
        return res.status(400).json({ error: "Invalid ID" });
      }
      const updateData = {};
      if (req.body.username) updateData.username = req.body.username;
      if (req.body.email) updateData.email = req.body.email;
      if (req.body.role) updateData.role = req.body.role;
      if (req.body.password) {
        updateData.password = await hashPassword(req.body.password);
      }
      await storage.updateUser(id, updateData);
      res.json({ updated: true });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
  app2.delete("/api/admin/users/:id", authMiddleware, requireAuth, requireAdmin, async (req, res) => {
    try {
      const currentUser = await storage.getUser(req.session.userId);
      if (!currentUser || currentUser.role !== "admin") {
        return res.status(403).json({ error: "Forbidden - admin access required" });
      }
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) {
        return res.status(400).json({ error: "Invalid ID" });
      }
      if (id === req.session.userId) {
        return res.status(400).json({ error: "Cannot delete your own account" });
      }
      await storage.deleteUser(id);
      res.json({ deleted: true });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
  app2.get("/api/targets", authMiddleware, async (_req, res) => {
    try {
      const targets2 = await storage.getAllTargets();
      res.json(targets2);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
  app2.post("/api/targets", authMiddleware, async (req, res) => {
    try {
      const validated = insertTargetSchema.parse(req.body);
      const target = await storage.createTarget(validated);
      res.json(target);
    } catch (error) {
      if (error.name === "ZodError") {
        return res.status(400).json({ error: "Validation error", details: error.errors });
      }
      res.status(500).json({ error: error.message });
    }
  });
  app2.put("/api/targets/:id", authMiddleware, async (req, res) => {
    try {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) {
        return res.status(400).json({ error: "Invalid ID" });
      }
      const validated = insertTargetSchema.parse(req.body);
      await storage.updateTarget(id, validated);
      res.json({ updated: true });
    } catch (error) {
      if (error.name === "ZodError") {
        return res.status(400).json({ error: "Validation error", details: error.errors });
      }
      res.status(500).json({ error: error.message });
    }
  });
  app2.delete("/api/targets/:id", authMiddleware, async (req, res) => {
    try {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) {
        return res.status(400).json({ error: "Invalid ID" });
      }
      await storage.deleteTarget(id);
      res.json({ deleted: true });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
  app2.get("/api/results/:targetId", authMiddleware, async (req, res) => {
    try {
      const targetId = parseInt(req.params.targetId, 10);
      if (isNaN(targetId)) {
        return res.status(400).json({ error: "Invalid target ID" });
      }
      const results2 = await storage.getResultsByTarget(targetId, 200);
      res.json(results2);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
  app2.get("/api/channels", authMiddleware, async (_req, res) => {
    try {
      const channels = await storage.getAllNotificationChannels();
      res.json(channels);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
  app2.post("/api/channels", authMiddleware, async (req, res) => {
    try {
      const validated = insertNotificationChannelSchema.parse(req.body);
      try {
        const config = JSON.parse(validated.config);
        if (validated.type === "email" && !config.email) {
          return res.status(400).json({ error: 'Email channel requires "email" field in config' });
        }
        if (validated.type === "slack" && !config.webhookUrl) {
          return res.status(400).json({ error: 'Slack channel requires "webhookUrl" field in config' });
        }
        if (validated.type === "pagerduty" && !config.routingKey) {
          return res.status(400).json({ error: 'PagerDuty channel requires "routingKey" field in config' });
        }
        if (validated.type === "webhook" && !config.url) {
          return res.status(400).json({ error: 'Webhook channel requires "url" field in config' });
        }
      } catch (e) {
        return res.status(400).json({ error: "Configuration must be valid JSON" });
      }
      const channel = await storage.createNotificationChannel(validated);
      res.json(channel);
    } catch (error) {
      if (error.name === "ZodError") {
        return res.status(400).json({ error: "Validation error", details: error.errors });
      }
      res.status(500).json({ error: error.message });
    }
  });
  app2.put("/api/channels/:id", authMiddleware, async (req, res) => {
    try {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) {
        return res.status(400).json({ error: "Invalid ID" });
      }
      const existing = await storage.getNotificationChannel(id);
      if (!existing) {
        return res.status(404).json({ error: "Channel not found" });
      }
      const validated = insertNotificationChannelSchema.parse(req.body);
      try {
        const config = JSON.parse(validated.config);
        if (validated.type === "email" && !config.email) {
          return res.status(400).json({ error: 'Email channel requires "email" field in config' });
        }
        if (validated.type === "slack" && !config.webhookUrl) {
          return res.status(400).json({ error: 'Slack channel requires "webhookUrl" field in config' });
        }
        if (validated.type === "pagerduty" && !config.routingKey) {
          return res.status(400).json({ error: 'PagerDuty channel requires "routingKey" field in config' });
        }
        if (validated.type === "webhook" && !config.url) {
          return res.status(400).json({ error: 'Webhook channel requires "url" field in config' });
        }
      } catch (e) {
        return res.status(400).json({ error: "Configuration must be valid JSON" });
      }
      await storage.updateNotificationChannel(id, validated);
      res.json({ updated: true });
    } catch (error) {
      if (error.name === "ZodError") {
        return res.status(400).json({ error: "Validation error", details: error.errors });
      }
      res.status(500).json({ error: error.message });
    }
  });
  app2.delete("/api/channels/:id", authMiddleware, async (req, res) => {
    try {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) {
        return res.status(400).json({ error: "Invalid ID" });
      }
      const existing = await storage.getNotificationChannel(id);
      if (!existing) {
        return res.status(404).json({ error: "Channel not found" });
      }
      await storage.deleteNotificationChannel(id);
      res.json({ deleted: true });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
  app2.get("/api/aws-accounts", authMiddleware, async (req, res) => {
    try {
      const accounts = await storage.getAllAwsAccountsForClient();
      res.json(accounts);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
  app2.post("/api/aws-accounts", authMiddleware, async (req, res) => {
    try {
      const validated = insertAwsAccountSchema.parse(req.body);
      const account = await storage.createAwsAccount(validated);
      res.json(account);
    } catch (error) {
      if (error.name === "ZodError") {
        return res.status(400).json({ error: "Validation error", details: error.errors });
      }
      res.status(500).json({ error: error.message });
    }
  });
  app2.put("/api/aws-accounts/:id", authMiddleware, async (req, res) => {
    try {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) {
        return res.status(400).json({ error: "Invalid ID" });
      }
      const existing = await storage.getAwsAccountForClient(id);
      if (!existing) {
        return res.status(404).json({ error: "AWS Account not found" });
      }
      const updateData = {};
      if (req.body.name !== void 0) updateData.name = req.body.name;
      if (req.body.region !== void 0) updateData.region = req.body.region;
      if (req.body.accessKeyId !== void 0) updateData.accessKeyId = req.body.accessKeyId;
      if (req.body.secretAccessKey !== void 0) updateData.secretAccessKey = req.body.secretAccessKey;
      if (req.body.enabled !== void 0) updateData.enabled = req.body.enabled;
      await storage.updateAwsAccount(id, updateData);
      res.json({ updated: true });
    } catch (error) {
      if (error.name === "ZodError") {
        return res.status(400).json({ error: "Validation error", details: error.errors });
      }
      res.status(500).json({ error: error.message });
    }
  });
  app2.delete("/api/aws-accounts/:id", authMiddleware, async (req, res) => {
    try {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) {
        return res.status(400).json({ error: "Invalid ID" });
      }
      const existing = await storage.getAwsAccountForClient(id);
      if (!existing) {
        return res.status(404).json({ error: "AWS Account not found" });
      }
      await storage.deleteAwsAccount(id);
      res.json({ deleted: true });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
  app2.get("/api/logs", authMiddleware, async (req, res) => {
    try {
      const group = req.query.group;
      const filterPattern = req.query.q;
      const sinceSec = parseInt(req.query.since || "3600", 10);
      const limit = Math.min(parseInt(req.query.limit || "200", 10), 2e3);
      const accountId = req.query.accountId ? parseInt(req.query.accountId, 10) : void 0;
      if (!group) {
        return res.status(400).json({ error: "Log group name is required (query param: group)" });
      }
      let awsRegion;
      let awsCredentials;
      if (accountId) {
        const account = await storage.getAwsAccountWithCredentials(accountId);
        if (!account) {
          return res.status(404).json({ error: "AWS Account not found" });
        }
        if (!account.enabled) {
          return res.status(400).json({ error: "AWS Account is disabled" });
        }
        awsRegion = account.region;
        awsCredentials = {
          accessKeyId: account.accessKeyId,
          secretAccessKey: account.secretAccessKey
        };
      } else {
        awsRegion = process.env.AWS_REGION || "eu-west-2";
        awsCredentials = process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY ? {
          accessKeyId: process.env.AWS_ACCESS_KEY_ID,
          secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
        } : void 0;
      }
      const cwl = new CloudWatchLogsClient({
        region: awsRegion,
        credentials: awsCredentials
      });
      const cmd = new FilterLogEventsCommand({
        logGroupName: group,
        startTime: Date.now() - sinceSec * 1e3,
        endTime: Date.now(),
        filterPattern: filterPattern || void 0,
        limit
      });
      const result = await cwl.send(cmd);
      const logs = (result.events || []).map((e) => ({
        ts: e.timestamp || Date.now(),
        stream: e.logStreamName || "",
        message: e.message || ""
      }));
      res.json(logs);
    } catch (error) {
      console.error("CloudWatch Logs error:", error);
      res.status(500).json({ error: error.message || "Failed to fetch logs" });
    }
  });
  return httpServer;
}

// server/vite.ts
import express from "express";
import fs from "fs";
import path2 from "path";
import { createServer as createViteServer, createLogger } from "vite";

// vite.config.ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import runtimeErrorOverlay from "@replit/vite-plugin-runtime-error-modal";
var vite_config_default = defineConfig({
  plugins: [
    react(),
    runtimeErrorOverlay(),
    ...process.env.NODE_ENV !== "production" && process.env.REPL_ID !== void 0 ? [
      await import("@replit/vite-plugin-cartographer").then(
        (m) => m.cartographer()
      ),
      await import("@replit/vite-plugin-dev-banner").then(
        (m) => m.devBanner()
      )
    ] : []
  ],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "client", "src"),
      "@shared": path.resolve(import.meta.dirname, "shared"),
      "@assets": path.resolve(import.meta.dirname, "attached_assets")
    }
  },
  root: path.resolve(import.meta.dirname, "client"),
  build: {
    outDir: path.resolve(import.meta.dirname, "dist/public"),
    emptyOutDir: true
  },
  server: {
    fs: {
      strict: true,
      deny: ["**/.*"]
    }
  }
});

// server/vite.ts
import { nanoid } from "nanoid";
var viteLogger = createLogger();
function log(message, source = "express") {
  const formattedTime = (/* @__PURE__ */ new Date()).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true
  });
  console.log(`${formattedTime} [${source}] ${message}`);
}
async function setupVite(app2, server) {
  const serverOptions = {
    middlewareMode: true,
    hmr: { server },
    allowedHosts: true
  };
  const vite = await createViteServer({
    ...vite_config_default,
    configFile: false,
    customLogger: {
      ...viteLogger,
      error: (msg, options) => {
        viteLogger.error(msg, options);
        process.exit(1);
      }
    },
    server: serverOptions,
    appType: "custom"
  });
  app2.use(vite.middlewares);
  app2.use("*", async (req, res, next) => {
    const url = req.originalUrl;
    try {
      const clientTemplate = path2.resolve(
        import.meta.dirname,
        "..",
        "client",
        "index.html"
      );
      let template = await fs.promises.readFile(clientTemplate, "utf-8");
      template = template.replace(
        `src="/src/main.tsx"`,
        `src="/src/main.tsx?v=${nanoid()}"`
      );
      const page = await vite.transformIndexHtml(url, template);
      res.status(200).set({ "Content-Type": "text/html" }).end(page);
    } catch (e) {
      vite.ssrFixStacktrace(e);
      next(e);
    }
  });
}
function serveStatic(app2) {
  const distPath = path2.resolve(import.meta.dirname, "public");
  if (!fs.existsSync(distPath)) {
    throw new Error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`
    );
  }
  app2.use(express.static(distPath));
  app2.use("*", (_req, res) => {
    res.sendFile(path2.resolve(distPath, "index.html"));
  });
}

// server/index.ts
var app = express2();
app.use(session({
  secret: process.env.SESSION_SECRET || "development-secret-change-in-production",
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    maxAge: 24 * 60 * 60 * 1e3
    // 24 hours
  }
}));
app.use(express2.json({
  verify: (req, _res, buf) => {
    req.rawBody = buf;
  }
}));
app.use(express2.urlencoded({ extended: false }));
app.use((req, res, next) => {
  const start = Date.now();
  const path3 = req.path;
  let capturedJsonResponse = void 0;
  const originalResJson = res.json;
  res.json = function(bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };
  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path3.startsWith("/api")) {
      let logLine = `${req.method} ${path3} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }
      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "\u2026";
      }
      log(logLine);
    }
  });
  next();
});
(async () => {
  const server = await registerRoutes(app);
  app.use((err, _req, res, _next) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";
    res.status(status).json({ message });
    throw err;
  });
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }
  const port = parseInt(process.env.PORT || "5000", 10);
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true
  }, () => {
    log(`serving on port ${port}`);
  });
})();
