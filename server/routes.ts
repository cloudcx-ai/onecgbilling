import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { storage } from "./storage";
import { 
  insertTargetSchema, 
  insertNotificationChannelSchema, 
  insertAwsAccountSchema, 
  insertUserSchema,
  loginSchema,
  type LogEvent 
} from "@shared/schema";
import { startScheduler } from "./scheduler";
import { CloudWatchLogsClient, FilterLogEventsCommand } from "@aws-sdk/client-cloudwatch-logs";
import { 
  hashPassword, 
  verifyPassword, 
  generateTwoFactorSecret, 
  verifyTwoFactorToken,
  generateQRCode,
  toSafeUser,
  requireAuth,
  createRequireAdmin
} from "./auth";

// Simple API key authentication middleware
function authMiddleware(req: any, res: any, next: any) {
  const apiKey = req.headers['x-api-key'];
  const expectedKey = process.env.API_KEY || 'demo-api-key';
  
  if (!apiKey || apiKey !== expectedKey) {
    return res.status(401).json({ error: 'Unauthorized - invalid API key' });
  }
  
  next();
}

export async function registerRoutes(app: Express): Promise<Server> {
  const httpServer = createServer(app);

  // Create requireAdmin middleware with storage access
  const requireAdmin = createRequireAdmin((id: number) => storage.getUser(id));

  // WebSocket server for real-time updates (following javascript_websocket blueprint)
  const wss = new WebSocketServer({ server: httpServer, path: '/ws' });
  
  wss.on('connection', (ws: WebSocket) => {
    console.log('WebSocket client connected');
    
    ws.on('close', () => {
      console.log('WebSocket client disconnected');
    });
  });

  // Start the health check scheduler
  startScheduler(wss);

  // Health check endpoint (no auth required)
  app.get('/api/healthz', (_req, res) => {
    res.json({ ok: true, timestamp: new Date().toISOString() });
  });

  // ============ AUTHENTICATION ROUTES ============
  
  // Login
  app.post('/api/auth/login', async (req, res) => {
    try {
      const { username, password, twoFactorCode } = loginSchema.parse(req.body);
      
      const user = await storage.getUserByUsername(username);
      if (!user) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      const validPassword = await verifyPassword(password, user.password);
      if (!validPassword) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      // Check if 2FA is enabled
      if (user.twoFactorEnabled && user.twoFactorSecret) {
        if (!twoFactorCode) {
          req.session.pendingTwoFactor = user.id;
          return res.json({ requires2FA: true });
        }

        const valid2FA = verifyTwoFactorToken(user.twoFactorSecret, twoFactorCode);
        if (!valid2FA) {
          return res.status(401).json({ error: 'Invalid 2FA code' });
        }
      }

      req.session.userId = user.id;
      delete req.session.pendingTwoFactor;
      
      res.json({ user: toSafeUser(user) });
    } catch (error: any) {
      if (error.name === 'ZodError') {
        return res.status(400).json({ error: 'Validation error', details: error.errors });
      }
      res.status(500).json({ error: error.message });
    }
  });

  // Logout
  app.post('/api/auth/logout', (req, res) => {
    req.session.destroy((err) => {
      if (err) {
        return res.status(500).json({ error: 'Failed to logout' });
      }
      res.json({ success: true });
    });
  });

  // Get current user
  app.get('/api/auth/me', requireAuth, async (req, res) => {
    try {
      const user = await storage.getUser(req.session.userId!);
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }
      res.json(toSafeUser(user));
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Setup 2FA - Generate secret and QR code
  app.post('/api/auth/2fa/setup', requireAuth, async (req, res) => {
    try {
      const user = await storage.getUser(req.session.userId!);
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      const secret = generateTwoFactorSecret();
      const qrCode = await generateQRCode(user.username, secret);

      await storage.updateUser(user.id, { twoFactorSecret: secret });

      res.json({ secret, qrCode });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Enable 2FA - Verify code and enable
  app.post('/api/auth/2fa/enable', requireAuth, async (req, res) => {
    try {
      const { code } = req.body;
      if (!code) {
        return res.status(400).json({ error: 'Code is required' });
      }

      const user = await storage.getUser(req.session.userId!);
      if (!user || !user.twoFactorSecret) {
        return res.status(400).json({ error: '2FA not set up' });
      }

      const valid = verifyTwoFactorToken(user.twoFactorSecret, code);
      if (!valid) {
        return res.status(400).json({ error: 'Invalid code' });
      }

      await storage.updateUser(user.id, { twoFactorEnabled: true });

      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Disable 2FA
  app.post('/api/auth/2fa/disable', requireAuth, async (req, res) => {
    try {
      await storage.updateUser(req.session.userId!, { 
        twoFactorEnabled: false,
        twoFactorSecret: null 
      });

      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // ============ ADMIN USER MANAGEMENT ROUTES ============

  // Get all users (admin only)
  app.get('/api/admin/users', authMiddleware, requireAuth, requireAdmin, async (req, res) => {
    try {
      const currentUser = await storage.getUser(req.session.userId!);
      if (!currentUser || currentUser.role !== 'admin') {
        return res.status(403).json({ error: 'Forbidden - admin access required' });
      }

      const users = await storage.getAllUsers();
      res.json(users);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Create user (admin only)
  app.post('/api/admin/users', authMiddleware, requireAuth, requireAdmin, async (req, res) => {
    try {
      const currentUser = await storage.getUser(req.session.userId!);
      if (!currentUser || currentUser.role !== 'admin') {
        return res.status(403).json({ error: 'Forbidden - admin access required' });
      }

      const validated = insertUserSchema.parse(req.body);
      
      // Check if username or email already exists
      const existingUser = await storage.getUserByUsername(validated.username);
      if (existingUser) {
        return res.status(400).json({ error: 'Username already exists' });
      }

      const existingEmail = await storage.getUserByEmail(validated.email);
      if (existingEmail) {
        return res.status(400).json({ error: 'Email already exists' });
      }

      const hashedPassword = await hashPassword(validated.password);
      const user = await storage.createUser({ ...validated, hashedPassword });

      res.json(toSafeUser(user));
    } catch (error: any) {
      if (error.name === 'ZodError') {
        return res.status(400).json({ error: 'Validation error', details: error.errors });
      }
      res.status(500).json({ error: error.message });
    }
  });

  // Update user (admin only)
  app.put('/api/admin/users/:id', authMiddleware, requireAuth, requireAdmin, async (req, res) => {
    try {
      const currentUser = await storage.getUser(req.session.userId!);
      if (!currentUser || currentUser.role !== 'admin') {
        return res.status(403).json({ error: 'Forbidden - admin access required' });
      }

      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) {
        return res.status(400).json({ error: 'Invalid ID' });
      }

      const updateData: any = {};
      if (req.body.username) updateData.username = req.body.username;
      if (req.body.email) updateData.email = req.body.email;
      if (req.body.role) updateData.role = req.body.role;
      if (req.body.password) {
        updateData.password = await hashPassword(req.body.password);
      }

      await storage.updateUser(id, updateData);

      res.json({ updated: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Delete user (admin only)
  app.delete('/api/admin/users/:id', authMiddleware, requireAuth, requireAdmin, async (req, res) => {
    try {
      const currentUser = await storage.getUser(req.session.userId!);
      if (!currentUser || currentUser.role !== 'admin') {
        return res.status(403).json({ error: 'Forbidden - admin access required' });
      }

      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) {
        return res.status(400).json({ error: 'Invalid ID' });
      }

      // Prevent deleting yourself
      if (id === req.session.userId) {
        return res.status(400).json({ error: 'Cannot delete your own account' });
      }

      await storage.deleteUser(id);

      res.json({ deleted: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Get all targets
  app.get('/api/targets', authMiddleware, async (_req, res) => {
    try {
      const targets = await storage.getAllTargets();
      res.json(targets);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Create a new target
  app.post('/api/targets', authMiddleware, async (req, res) => {
    try {
      const validated = insertTargetSchema.parse(req.body);
      const target = await storage.createTarget(validated);
      res.json(target);
    } catch (error: any) {
      if (error.name === 'ZodError') {
        return res.status(400).json({ error: 'Validation error', details: error.errors });
      }
      res.status(500).json({ error: error.message });
    }
  });

  // Update a target
  app.put('/api/targets/:id', authMiddleware, async (req, res) => {
    try {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) {
        return res.status(400).json({ error: 'Invalid ID' });
      }

      const validated = insertTargetSchema.parse(req.body);
      await storage.updateTarget(id, validated);
      res.json({ updated: true });
    } catch (error: any) {
      if (error.name === 'ZodError') {
        return res.status(400).json({ error: 'Validation error', details: error.errors });
      }
      res.status(500).json({ error: error.message });
    }
  });

  // Delete a target
  app.delete('/api/targets/:id', authMiddleware, async (req, res) => {
    try {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) {
        return res.status(400).json({ error: 'Invalid ID' });
      }

      await storage.deleteTarget(id);
      res.json({ deleted: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Get results for a specific target
  app.get('/api/results/:targetId', authMiddleware, async (req, res) => {
    try {
      const targetId = parseInt(req.params.targetId, 10);
      if (isNaN(targetId)) {
        return res.status(400).json({ error: 'Invalid target ID' });
      }

      const results = await storage.getResultsByTarget(targetId, 200);
      res.json(results);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Notification Channels CRUD
  app.get('/api/channels', authMiddleware, async (_req, res) => {
    try {
      const channels = await storage.getAllNotificationChannels();
      res.json(channels);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post('/api/channels', authMiddleware, async (req, res) => {
    try {
      const validated = insertNotificationChannelSchema.parse(req.body);
      
      // Validate JSON config
      try {
        const config = JSON.parse(validated.config);
        
        // Validate required fields per channel type
        if (validated.type === 'email' && !config.email) {
          return res.status(400).json({ error: 'Email channel requires "email" field in config' });
        }
        if (validated.type === 'slack' && !config.webhookUrl) {
          return res.status(400).json({ error: 'Slack channel requires "webhookUrl" field in config' });
        }
        if (validated.type === 'pagerduty' && !config.routingKey) {
          return res.status(400).json({ error: 'PagerDuty channel requires "routingKey" field in config' });
        }
        if (validated.type === 'webhook' && !config.url) {
          return res.status(400).json({ error: 'Webhook channel requires "url" field in config' });
        }
      } catch (e) {
        return res.status(400).json({ error: 'Configuration must be valid JSON' });
      }
      
      const channel = await storage.createNotificationChannel(validated);
      res.json(channel);
    } catch (error: any) {
      if (error.name === 'ZodError') {
        return res.status(400).json({ error: 'Validation error', details: error.errors });
      }
      res.status(500).json({ error: error.message });
    }
  });

  app.put('/api/channels/:id', authMiddleware, async (req, res) => {
    try {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) {
        return res.status(400).json({ error: 'Invalid ID' });
      }

      // Check if channel exists
      const existing = await storage.getNotificationChannel(id);
      if (!existing) {
        return res.status(404).json({ error: 'Channel not found' });
      }

      const validated = insertNotificationChannelSchema.parse(req.body);
      
      // Validate JSON config
      try {
        const config = JSON.parse(validated.config);
        
        // Validate required fields per channel type
        if (validated.type === 'email' && !config.email) {
          return res.status(400).json({ error: 'Email channel requires "email" field in config' });
        }
        if (validated.type === 'slack' && !config.webhookUrl) {
          return res.status(400).json({ error: 'Slack channel requires "webhookUrl" field in config' });
        }
        if (validated.type === 'pagerduty' && !config.routingKey) {
          return res.status(400).json({ error: 'PagerDuty channel requires "routingKey" field in config' });
        }
        if (validated.type === 'webhook' && !config.url) {
          return res.status(400).json({ error: 'Webhook channel requires "url" field in config' });
        }
      } catch (e) {
        return res.status(400).json({ error: 'Configuration must be valid JSON' });
      }
      
      await storage.updateNotificationChannel(id, validated);
      res.json({ updated: true });
    } catch (error: any) {
      if (error.name === 'ZodError') {
        return res.status(400).json({ error: 'Validation error', details: error.errors });
      }
      res.status(500).json({ error: error.message });
    }
  });

  app.delete('/api/channels/:id', authMiddleware, async (req, res) => {
    try {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) {
        return res.status(400).json({ error: 'Invalid ID' });
      }

      // Check if channel exists
      const existing = await storage.getNotificationChannel(id);
      if (!existing) {
        return res.status(404).json({ error: 'Channel not found' });
      }

      await storage.deleteNotificationChannel(id);
      res.json({ deleted: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // AWS Accounts endpoints
  app.get('/api/aws-accounts', authMiddleware, async (req, res) => {
    try {
      const accounts = await storage.getAllAwsAccountsForClient();
      res.json(accounts);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post('/api/aws-accounts', authMiddleware, async (req, res) => {
    try {
      const validated = insertAwsAccountSchema.parse(req.body);
      const account = await storage.createAwsAccount(validated);
      res.json(account);
    } catch (error: any) {
      if (error.name === 'ZodError') {
        return res.status(400).json({ error: 'Validation error', details: error.errors });
      }
      res.status(500).json({ error: error.message });
    }
  });

  app.put('/api/aws-accounts/:id', authMiddleware, async (req, res) => {
    try {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) {
        return res.status(400).json({ error: 'Invalid ID' });
      }

      const existing = await storage.getAwsAccountForClient(id);
      if (!existing) {
        return res.status(404).json({ error: 'AWS Account not found' });
      }

      // Allow partial updates - only update provided fields
      const updateData: Partial<z.infer<typeof insertAwsAccountSchema>> = {};
      if (req.body.name !== undefined) updateData.name = req.body.name;
      if (req.body.region !== undefined) updateData.region = req.body.region;
      if (req.body.accessKeyId !== undefined) updateData.accessKeyId = req.body.accessKeyId;
      if (req.body.secretAccessKey !== undefined) updateData.secretAccessKey = req.body.secretAccessKey;
      if (req.body.enabled !== undefined) updateData.enabled = req.body.enabled;

      await storage.updateAwsAccount(id, updateData);
      res.json({ updated: true });
    } catch (error: any) {
      if (error.name === 'ZodError') {
        return res.status(400).json({ error: 'Validation error', details: error.errors });
      }
      res.status(500).json({ error: error.message });
    }
  });

  app.delete('/api/aws-accounts/:id', authMiddleware, async (req, res) => {
    try {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) {
        return res.status(400).json({ error: 'Invalid ID' });
      }

      const existing = await storage.getAwsAccountForClient(id);
      if (!existing) {
        return res.status(404).json({ error: 'AWS Account not found' });
      }

      await storage.deleteAwsAccount(id);
      res.json({ deleted: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // CloudWatch Logs proxy
  app.get('/api/logs', authMiddleware, async (req, res) => {
    try {
      const group = req.query.group as string;
      const filterPattern = req.query.q as string | undefined;
      const sinceSec = parseInt(req.query.since as string || '3600', 10);
      const limit = Math.min(parseInt(req.query.limit as string || '200', 10), 2000);
      const accountId = req.query.accountId ? parseInt(req.query.accountId as string, 10) : undefined;

      if (!group) {
        return res.status(400).json({ error: 'Log group name is required (query param: group)' });
      }

      let awsRegion: string;
      let awsCredentials: { accessKeyId: string; secretAccessKey: string } | undefined;

      if (accountId) {
        // Use selected AWS account credentials (server-side decryption only)
        const account = await storage.getAwsAccountWithCredentials(accountId);
        if (!account) {
          return res.status(404).json({ error: 'AWS Account not found' });
        }
        if (!account.enabled) {
          return res.status(400).json({ error: 'AWS Account is disabled' });
        }
        awsRegion = account.region;
        awsCredentials = {
          accessKeyId: account.accessKeyId,
          secretAccessKey: account.secretAccessKey,
        };
      } else {
        // Fallback to environment variables (legacy support)
        awsRegion = process.env.AWS_REGION || 'eu-west-2';
        awsCredentials = process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY ? {
          accessKeyId: process.env.AWS_ACCESS_KEY_ID,
          secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
        } : undefined;
      }

      const cwl = new CloudWatchLogsClient({ 
        region: awsRegion,
        credentials: awsCredentials,
      });

      const cmd = new FilterLogEventsCommand({
        logGroupName: group,
        startTime: Date.now() - (sinceSec * 1000),
        endTime: Date.now(),
        filterPattern: filterPattern || undefined,
        limit,
      });

      const result = await cwl.send(cmd);
      const logs: LogEvent[] = (result.events || []).map(e => ({
        ts: e.timestamp || Date.now(),
        stream: e.logStreamName || '',
        message: e.message || '',
      }));

      res.json(logs);
    } catch (error: any) {
      console.error('CloudWatch Logs error:', error);
      res.status(500).json({ error: error.message || 'Failed to fetch logs' });
    }
  });

  return httpServer;
}
