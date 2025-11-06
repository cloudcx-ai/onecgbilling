import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertClientSchema } from "@shared/schema";
import axios from "axios";

const GENESYS_API_BASE = "https://api.euw2.pure.cloud";

// Middleware to check authentication
function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (!req.session.isAuthenticated) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  next();
}

// Helper to clean up auth token - remove any "Bearer " or "Authorization: Bearer " prefix
function cleanAuthToken(token: string): string {
  return token
    .replace(/^Authorization:\s*/i, '')
    .replace(/^Bearer\s+/i, '')
    .trim();
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Authentication routes
  app.post("/api/auth/login", async (req: Request, res: Response) => {
    try {
      const { username, password } = req.body;

      // Hardcoded authentication for MVP
      // Accept either "once"/"once" or "onecg"/"onecg"
      const validCredentials = 
        (username === "once" && password === "once") ||
        (username === "onecg" && password === "onecg");

      if (validCredentials) {
        req.session.isAuthenticated = true;
        res.json({ success: true, message: "Login successful" });
      } else {
        res.status(401).json({ error: "Invalid credentials" });
      }
    } catch (error) {
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.get("/api/auth/check", async (req: Request, res: Response) => {
    res.json({ isAuthenticated: !!req.session.isAuthenticated });
  });

  app.post("/api/auth/logout", async (req: Request, res: Response) => {
    req.session.destroy((err) => {
      if (err) {
        return res.status(500).json({ error: "Failed to logout" });
      }
      res.json({ success: true, message: "Logout successful" });
    });
  });

  // Client routes (protected)
  app.get("/api/clients", requireAuth, async (req: Request, res: Response) => {
    try {
      const clients = await storage.getAllClients();
      res.json(clients);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch clients" });
    }
  });

  app.post("/api/clients", requireAuth, async (req: Request, res: Response) => {
    try {
      const validatedData = insertClientSchema.parse(req.body);
      // Clean the auth token before storing
      const cleanedData = {
        ...validatedData,
        authToken: cleanAuthToken(validatedData.authToken),
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

  app.delete("/api/clients/:id", requireAuth, async (req: Request, res: Response) => {
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

  // Genesys API proxy routes (protected)
  app.get("/api/billing/periods", requireAuth, async (req: Request, res: Response) => {
    try {
      const { clientId } = req.query;

      if (!clientId || typeof clientId !== "string") {
        return res.status(400).json({ error: "Client ID is required" });
      }

      const client = await storage.getClient(clientId);
      if (!client) {
        return res.status(404).json({ error: "Client not found" });
      }

      // Call Genesys API with cleaned token
      const response = await axios.get(
        `${GENESYS_API_BASE}/api/v2/billing/periods?periodGranularity=month`,
        {
          headers: {
            Authorization: `Bearer ${cleanAuthToken(client.authToken)}`,
            "Content-Type": "application/json",
          },
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

  app.get("/api/billing/subscription", requireAuth, async (req: Request, res: Response) => {
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

      // Call Genesys API with cleaned token
      const response = await axios.get(
        `${GENESYS_API_BASE}/api/v2/billing/subscriptionoverview?periodEndingTimestamp=${periodEndingTimestamp}`,
        {
          headers: {
            Authorization: `Bearer ${cleanAuthToken(client.authToken)}`,
            "Content-Type": "application/json",
          },
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

  const httpServer = createServer(app);

  return httpServer;
}
