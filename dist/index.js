// server/index.ts
import express2 from "express";
import session from "express-session";

// server/routes.ts
import { createServer } from "http";

// server/storage.ts
import { randomUUID } from "crypto";
var MemStorage = class {
  users;
  clients;
  constructor() {
    this.users = /* @__PURE__ */ new Map();
    this.clients = /* @__PURE__ */ new Map();
  }
  async getUser(id) {
    return this.users.get(id);
  }
  async getUserByUsername(username) {
    return Array.from(this.users.values()).find(
      (user) => user.username === username
    );
  }
  async createUser(insertUser) {
    const id = randomUUID();
    const user = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }
  async getAllClients() {
    return Array.from(this.clients.values());
  }
  async getClient(id) {
    return this.clients.get(id);
  }
  async createClient(insertClient) {
    const id = randomUUID();
    const client = { ...insertClient, id };
    this.clients.set(id, client);
    return client;
  }
  async deleteClient(id) {
    return this.clients.delete(id);
  }
};
var storage = new MemStorage();

// shared/schema.ts
import { sql } from "drizzle-orm";
import { pgTable, text, varchar } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
var users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull()
});
var insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true
});
var clients = pgTable("clients", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  authToken: text("auth_token").notNull()
});
var insertClientSchema = createInsertSchema(clients).omit({
  id: true
});

// server/routes.ts
import axios from "axios";
var GENESYS_API_BASE = "https://api.euw2.pure.cloud";
function requireAuth(req, res, next) {
  if (!req.session.isAuthenticated) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  next();
}
function cleanAuthToken(token) {
  return token.replace(/^Authorization:\s*/i, "").replace(/^Bearer\s+/i, "").trim();
}
async function registerRoutes(app2) {
  app2.post("/api/auth/login", async (req, res) => {
    try {
      const { username, password } = req.body;
      if (username === "once/onecg" && password === "once/onecg") {
        req.session.isAuthenticated = true;
        res.json({ success: true, message: "Login successful" });
      } else {
        res.status(401).json({ error: "Invalid credentials" });
      }
    } catch (error) {
      res.status(500).json({ error: "Internal server error" });
    }
  });
  app2.get("/api/auth/check", async (req, res) => {
    res.json({ isAuthenticated: !!req.session.isAuthenticated });
  });
  app2.post("/api/auth/logout", async (req, res) => {
    req.session.destroy((err) => {
      if (err) {
        return res.status(500).json({ error: "Failed to logout" });
      }
      res.json({ success: true, message: "Logout successful" });
    });
  });
  app2.get("/api/clients", requireAuth, async (req, res) => {
    try {
      const clients2 = await storage.getAllClients();
      res.json(clients2);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch clients" });
    }
  });
  app2.post("/api/clients", requireAuth, async (req, res) => {
    try {
      const validatedData = insertClientSchema.parse(req.body);
      const cleanedData = {
        ...validatedData,
        authToken: cleanAuthToken(validatedData.authToken)
      };
      const client = await storage.createClient(cleanedData);
      res.status(201).json(client);
    } catch (error) {
      if (error instanceof Error) {
        res.status(400).json({ error: error.message });
      } else {
        res.status(500).json({ error: "Failed to create client" });
      }
    }
  });
  app2.delete("/api/clients/:id", requireAuth, async (req, res) => {
    try {
      const { id } = req.params;
      const deleted = await storage.deleteClient(id);
      if (deleted) {
        res.json({ success: true });
      } else {
        res.status(404).json({ error: "Client not found" });
      }
    } catch (error) {
      res.status(500).json({ error: "Failed to delete client" });
    }
  });
  app2.get("/api/billing/periods", requireAuth, async (req, res) => {
    try {
      const { clientId } = req.query;
      if (!clientId || typeof clientId !== "string") {
        return res.status(400).json({ error: "Client ID is required" });
      }
      const client = await storage.getClient(clientId);
      if (!client) {
        return res.status(404).json({ error: "Client not found" });
      }
      const response = await axios.get(
        `${GENESYS_API_BASE}/api/v2/billing/periods?periodGranularity=month`,
        {
          headers: {
            Authorization: `Bearer ${cleanAuthToken(client.authToken)}`,
            "Content-Type": "application/json"
          }
        }
      );
      res.json(response.data);
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const status = error.response?.status || 500;
        const message = error.response?.data?.message || error.response?.data?.error || "Failed to fetch billing periods";
        res.status(status).json({ error: message });
      } else {
        res.status(500).json({ error: "Failed to fetch billing periods" });
      }
    }
  });
  app2.get("/api/billing/subscription", requireAuth, async (req, res) => {
    try {
      const { clientId, periodEndingTimestamp } = req.query;
      if (!clientId || typeof clientId !== "string") {
        return res.status(400).json({ error: "Client ID is required" });
      }
      if (!periodEndingTimestamp || typeof periodEndingTimestamp !== "string") {
        return res.status(400).json({ error: "Period ending timestamp is required" });
      }
      const client = await storage.getClient(clientId);
      if (!client) {
        return res.status(404).json({ error: "Client not found" });
      }
      const response = await axios.get(
        `${GENESYS_API_BASE}/api/v2/billing/subscriptionoverview?periodEndingTimestamp=${periodEndingTimestamp}`,
        {
          headers: {
            Authorization: `Bearer ${cleanAuthToken(client.authToken)}`,
            "Content-Type": "application/json"
          }
        }
      );
      res.json(response.data);
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const status = error.response?.status || 500;
        const message = error.response?.data?.message || error.response?.data?.error || "Failed to fetch subscription overview";
        res.status(status).json({ error: message });
      } else {
        res.status(500).json({ error: "Failed to fetch subscription overview" });
      }
    }
  });
  const httpServer = createServer(app2);
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
app.use(
  session({
    secret: process.env.SESSION_SECRET || "onecg-genesys-billing-secret-key",
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: process.env.NODE_ENV === "production",
      httpOnly: true,
      maxAge: 24 * 60 * 60 * 1e3
      // 24 hours
    }
  })
);
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
