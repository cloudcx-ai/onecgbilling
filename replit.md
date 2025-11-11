# CloudCX Monitoring Solution

## Overview
A comprehensive internal monitoring solution for HTTP/HTTPS, TCP, and ICMP endpoint health checks with real-time alerting, PostgreSQL data persistence, AWS CloudWatch Logs integration, and user authentication with role-based access control and Google Authenticator 2FA.

## Project Structure

### Frontend (React + TypeScript)
- `client/src/pages/Dashboard.tsx` - Main dashboard with live monitoring metrics
- `client/src/pages/TargetManage.tsx` - Add/edit monitoring targets
- `client/src/pages/Results.tsx` - Historical check results with charts
- `client/src/pages/Logs.tsx` - CloudWatch Logs viewer with AWS account selector
- `client/src/pages/Channels.tsx` - Notification channels list and management
- `client/src/pages/ChannelManage.tsx` - Add/edit notification channels
- `client/src/pages/AwsAccounts.tsx` - AWS accounts list and management
- `client/src/pages/AwsAccountManage.tsx` - Add/edit AWS account credentials
- `client/src/pages/Login.tsx` - User login with 2FA support
- `client/src/pages/Profile.tsx` - User profile and 2FA setup
- `client/src/pages/AdminUsers.tsx` - Admin panel for user management
- `client/src/components/TargetForm.tsx` - Reusable target configuration form
- `client/src/components/StatusBadge.tsx` - Status indicators (UP/DOWN/PENDING)
- `client/src/contexts/AuthContext.tsx` - Authentication state management
- `client/src/hooks/useWebSocket.ts` - WebSocket hook for real-time updates

### Backend (Express + TypeScript)
- `server/routes.ts` - API endpoints and WebSocket server
- `server/storage.ts` - Database operations (PostgreSQL via Drizzle ORM)
- `server/db.ts` - Database connection configuration
- `server/auth.ts` - Authentication middleware and password hashing
- `server/create-admin.ts` - Admin user creation script
- `server/crypto-utils.ts` - AES-256-GCM encryption/decryption for AWS credentials
- `server/health-checks.ts` - HTTP, TCP, and ICMP health check implementations
- `server/scheduler.ts` - Automated check scheduling and state management
- `server/alerts.ts` - SMTP email alerting on state transitions
- `server/notifications.ts` - Multi-channel notification dispatcher (Slack, PagerDuty, Webhooks)

### Shared
- `shared/schema.ts` - Drizzle ORM schemas and Zod validation schemas

## Key Features

### Multi-Protocol Monitoring
- **HTTP/HTTPS**: Full URL validation with status code checking and redirect following
- **TCP**: Port connectivity checks for any TCP service
- **ICMP**: Ping checks (limited on some platforms due to native module requirements)

### Real-Time Updates
- WebSocket connection provides instant notifications of status changes
- Live dashboard metrics update automatically
- Pulsing connection indicator shows WebSocket status

### Intelligent Alerting
- Multi-channel notification system (Email, Slack, PagerDuty, Webhooks)
- Alerts sent only on state transitions (UP→DOWN and recovery)
- Prevents alert flooding during outages
- Customizable alert email per target (legacy support)
- Centralized notification channel management
- JSON-configurable channel settings with per-type validation
- HTML-formatted alert messages with full context

### Data Persistence
- PostgreSQL database stores all target configurations and check results
- Automatic cascade deletion of results when targets are deleted
- Last 200 check results maintained per target for historical analysis

### CloudWatch Integration
- Multi-AWS account support with encrypted credential storage (AES-256-GCM)
- Proxy API for querying CloudWatch Logs across multiple accounts
- Configurable time ranges and filter patterns
- Support for multiple log groups
- Download logs as text file
- Secure credential handling: credentials never exposed to frontend
- Per-account CloudWatch access with region configuration

### User Authentication & Authorization
- Session-based authentication with PostgreSQL-backed session storage
- Bcrypt password hashing for secure credential storage
- Google Authenticator 2FA support with QR code setup
- Role-based access control (admin/user roles)
- Protected routes requiring authentication
- Admin-only user management panel
- Default admin account (username: admin, password: admin123)
- TOTP secret encryption for 2FA security

### Configuration
All configuration is managed through environment variables (stored as secrets):

- `API_KEY` - Protects all API endpoints (default: "demo-api-key")
- `SESSION_SECRET` - Encryption key for AWS credentials (REQUIRED for multi-account feature, must be strong)
- `AWS_REGION` - Legacy: AWS region for CloudWatch (default: "eu-west-2", superseded by per-account config)
- `AWS_ACCESS_KEY_ID` - Legacy: AWS credentials for CloudWatch access (superseded by per-account config)
- `AWS_SECRET_ACCESS_KEY` - Legacy: AWS secret key (superseded by per-account config)
- `SMTP_HOST` - SMTP server hostname (default: "localhost")
- `SMTP_PORT` - SMTP port (default: 25)
- `SMTP_USER` - SMTP username (optional)
- `SMTP_PASS` - SMTP password (optional)
- `FROM_EMAIL` - Sender email address (default: "monitor@cloudcx.local")
- `DATABASE_URL` - PostgreSQL connection string (auto-configured)

## API Endpoints

### Targets
- `GET /api/targets` - List all monitoring targets
- `POST /api/targets` - Create new target
- `PUT /api/targets/:id` - Update target configuration
- `DELETE /api/targets/:id` - Delete target and all results

### Results
- `GET /api/results/:targetId` - Get last 200 check results for a target

### Notification Channels
- `GET /api/channels` - List all notification channels
- `POST /api/channels` - Create new channel (with JSON config validation)
- `PUT /api/channels/:id` - Update channel configuration
- `DELETE /api/channels/:id` - Delete notification channel

### AWS Accounts
- `GET /api/aws-accounts` - List all AWS accounts (credentials omitted for security)
- `POST /api/aws-accounts` - Create new AWS account with encrypted credentials
- `PUT /api/aws-accounts/:id` - Update AWS account (partial updates supported)
- `DELETE /api/aws-accounts/:id` - Delete AWS account

### CloudWatch Logs
- `GET /api/logs?group=GROUP&q=PATTERN&since=SECONDS&accountId=ID` - Query CloudWatch Logs from specific account

### Authentication
- `POST /api/auth/login` - Login with username, password, and optional 2FA code
- `POST /api/auth/logout` - Logout current user
- `GET /api/auth/me` - Get current authenticated user
- `POST /api/auth/2fa/setup` - Generate 2FA secret and QR code
- `POST /api/auth/2fa/enable` - Enable 2FA with verification code
- `POST /api/auth/2fa/disable` - Disable 2FA for current user

### Admin User Management (Admin Only)
- `GET /api/admin/users` - List all users
- `POST /api/admin/users` - Create new user
- `PUT /api/admin/users/:id` - Update user
- `DELETE /api/admin/users/:id` - Delete user

### Health
- `GET /api/healthz` - Application health check (no auth required)

### WebSocket
- `ws://HOST/ws` - Real-time check result notifications

All endpoints except `/api/healthz` and authentication endpoints require both `x-api-key` header and valid session authentication.

## Database Schema

### targets
- `id` - Auto-incrementing primary key
- `name` - Target display name
- `type` - Check type (HTTP, TCP, ICMP)
- `endpoint` - URL, host:port, or hostname
- `frequency_sec` - Check interval in seconds (10-86400)
- `expected_code` - Expected HTTP status code (optional)
- `timeout_ms` - Request timeout in milliseconds (1000-60000)
- `alert_email` - Email for alerts (optional, legacy support)
- `enabled` - Whether checks are active
- `created_at` - Timestamp of creation

### results
- `id` - Auto-incrementing primary key
- `target_id` - Foreign key to targets (cascade delete)
- `status` - UP or DOWN
- `latency_ms` - Response time in milliseconds
- `code` - HTTP status code or connection code
- `message` - Error message or response text
- `created_at` - Timestamp of check

### notification_channels
- `id` - Auto-incrementing primary key
- `name` - Channel display name
- `type` - Channel type (email, slack, pagerduty, webhook)
- `enabled` - Whether channel is active
- `config` - JSON configuration (validated per type)
  - email: `{"email": "address@example.com"}`
  - slack: `{"webhookUrl": "https://hooks.slack.com/..."}`
  - pagerduty: `{"routingKey": "key"}`
  - webhook: `{"url": "https://...", "method": "POST", "headers": {...}}`
- `created_at` - Timestamp of creation

### aws_accounts
- `id` - Auto-incrementing primary key
- `name` - Account display name
- `region` - AWS region for CloudWatch (e.g., us-east-1, eu-west-2)
- `access_key_id` - AWS access key ID (encrypted with AES-256-GCM)
- `secret_access_key` - AWS secret access key (encrypted with AES-256-GCM)
- `enabled` - Whether account is active for CloudWatch queries
- `created_at` - Timestamp of creation

## Design System

Based on IBM Carbon Design System principles:
- Professional, technical aesthetic suitable for monitoring dashboards
- IBM Plex Sans for UI text, IBM Plex Mono for code/endpoints
- Distinct color coding for status (green=UP, red=DOWN, yellow=PENDING)
- Clean spacing and typography hierarchy
- Responsive design for mobile and desktop
- Dark mode support throughout

## Development

The application runs as a single process with both frontend (Vite) and backend (Express) on the same port. WebSocket connections are handled on a separate path (`/ws`) to avoid conflicts with Vite's HMR.

### Starting the Application
```bash
npm run dev
```

This starts both the Express backend (with API endpoints and WebSocket) and the Vite development server for the React frontend.

### Database Migrations
```bash
npm run db:push
```

Drizzle ORM automatically syncs the schema to PostgreSQL without manual migration files.

## Architecture Decisions

1. **Single Process Design**: Both frontend and backend run together for simplicity and ease of deployment on Replit
2. **PostgreSQL over SQLite**: Better concurrency, reliability, and Replit integration
3. **WebSocket for Real-time**: More efficient than polling for live updates
4. **Scheduler in Memory**: Simple interval-based scheduler sufficient for moderate target counts
5. **SMTP for Alerts**: Universal email support without third-party services
6. **API Key Auth**: Simple but effective protection for internal monitoring tool
7. **State-Change Alerts Only**: Prevents alert fatigue during extended outages
8. **AES-256-GCM Encryption**: AWS credentials encrypted at rest using SESSION_SECRET as encryption key
9. **Client-Safe API Design**: Credentials never exposed via API endpoints; server-side decryption only for CloudWatch queries

## Limitations

- ICMP ping checks require native modules (not available on some platforms including Replit)
- Scheduler runs in memory (restarting the server resets check timing but preserves target configs)
- No built-in user authentication (designed for internal use with API key protection)
- Strong SESSION_SECRET required for AWS credential encryption (must be set in environment)

## Future Enhancements

- Multi-user support with authentication
- Uptime percentage calculations and SLA tracking
- Configurable data retention policies
- Grafana/Prometheus export
- Escalation policies
- Maintenance windows
- Audit logging for credential-using operations
- Regression tests for credential security
