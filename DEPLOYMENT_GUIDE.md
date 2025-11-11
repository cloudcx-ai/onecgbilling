# CloudCX Monitoring Solution - Complete Guide

## Table of Contents
1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Features Guide](#features-guide)
4. [User Guide](#user-guide)
5. [Production Deployment](#production-deployment)
6. [Security Considerations](#security-considerations)
7. [Maintenance & Troubleshooting](#maintenance--troubleshooting)

---

## Overview

CloudCX Monitoring Solution is a comprehensive internal monitoring platform that provides:
- **Multi-protocol health checks**: HTTP/HTTPS, TCP, and ICMP endpoint monitoring
- **Real-time alerting**: Multi-channel notifications (Email, Slack, PagerDuty, Webhooks)
- **CloudWatch integration**: Multi-account AWS CloudWatch Logs viewer
- **User authentication**: Role-based access control with Google Authenticator 2FA
- **Live dashboard**: WebSocket-powered real-time status updates
- **Historical analysis**: PostgreSQL-backed data persistence with result history

---

## Architecture

### Technology Stack

**Frontend:**
- React + TypeScript
- Wouter (routing)
- TanStack Query (data fetching)
- Shadcn UI components
- WebSocket client for real-time updates

**Backend:**
- Node.js + Express
- TypeScript
- PostgreSQL (via Drizzle ORM)
- WebSocket server
- Bcrypt (password hashing)
- OTPLib (2FA)

**Security:**
- Session-based authentication (express-session)
- PostgreSQL session store
- Bcrypt password hashing (10 rounds)
- AES-256-GCM encryption for AWS credentials
- TOTP for two-factor authentication

### System Components

```
┌─────────────────────────────────────────────────────────────┐
│                     Frontend (React)                         │
│  - Dashboard  - Login  - Profile  - Admin Panel              │
│  - Target Management  - Channels  - AWS Accounts             │
└──────────────────┬──────────────────────────────────────────┘
                   │ HTTP/WebSocket
┌──────────────────▼──────────────────────────────────────────┐
│                  Backend (Express)                           │
│  ┌─────────────┐  ┌──────────────┐  ┌──────────────────┐   │
│  │   Auth      │  │  Scheduler   │  │   Notifications  │   │
│  │ Middleware  │  │  (Checks)    │  │   (Alerts)       │   │
│  └─────────────┘  └──────────────┘  └──────────────────┘   │
└──────────────────┬──────────────────────────────────────────┘
                   │
┌──────────────────▼──────────────────────────────────────────┐
│              PostgreSQL Database                             │
│  - users  - targets  - results  - channels                  │
│  - aws_accounts  - sessions                                 │
└─────────────────────────────────────────────────────────────┘
```

### Data Flow

1. **User Authentication:**
   - User logs in → Session created → User data cached in context
   - All API calls include session cookie + API key header
   - Admin routes verify user role on every request

2. **Health Monitoring:**
   - Scheduler runs checks at configured intervals
   - Results stored in PostgreSQL
   - State changes trigger notifications
   - WebSocket broadcasts updates to connected clients

3. **CloudWatch Integration:**
   - Frontend requests logs via backend proxy
   - Backend decrypts AWS credentials (never sent to frontend)
   - CloudWatch API queried with decrypted credentials
   - Results returned to frontend

---

## Features Guide

### 1. User Authentication & Authorization

**How it works:**
- Session-based authentication with PostgreSQL-backed storage
- Passwords hashed with bcrypt before storage
- Optional 2FA using Google Authenticator (TOTP)
- Role-based access control: `admin` and `user` roles

**Admin capabilities:**
- Manage all users (create, view, delete)
- Access admin panel at `/admin/users`
- Full access to all features

**User capabilities:**
- View and manage monitoring targets
- Configure notification channels
- Manage AWS accounts
- View CloudWatch logs
- Set up personal 2FA

### 2. Health Check Monitoring

**Supported protocols:**

**HTTP/HTTPS:**
- Full URL validation
- Status code checking
- Redirect following (up to 5 redirects)
- Configurable timeout
- Expected status code validation

**TCP:**
- Port connectivity checks
- Any TCP service supported
- Connection timeout configuration

**ICMP:**
- Ping checks (platform-dependent)
- Note: May not work on all platforms due to native module requirements

**How checks work:**
1. Scheduler maintains in-memory state for all enabled targets
2. Checks run at configured frequency (10-86400 seconds)
3. Results stored in PostgreSQL (last 200 per target)
4. State transitions (UP↔DOWN) trigger notifications
5. WebSocket broadcasts results to connected clients

### 3. Multi-Channel Notifications

**Supported channels:**

**Email:**
- SMTP-based delivery
- HTML-formatted messages
- Configurable sender address

**Slack:**
- Webhook-based integration
- Rich message formatting
- Instant delivery

**PagerDuty:**
- Routing key integration
- Incident creation on DOWN
- Auto-resolve on recovery

**Custom Webhooks:**
- Configurable URL and method
- Custom headers support
- JSON payload

**Alert behavior:**
- Alerts sent ONLY on state transitions (not every failed check)
- Prevents alert flooding during extended outages
- Both DOWN and recovery notifications

### 4. CloudWatch Logs Integration

**Features:**
- Multi-AWS account support
- Encrypted credential storage (AES-256-GCM)
- Configurable time ranges
- Filter pattern support
- Multiple log groups
- Download logs as text

**How it works:**
1. AWS credentials stored encrypted in PostgreSQL
2. Frontend requests logs via backend proxy API
3. Backend decrypts credentials (never exposed to frontend)
4. CloudWatch Logs API queried server-side
5. Results returned to frontend

### 5. Real-Time Dashboard

**Features:**
- Live status updates via WebSocket
- Aggregate metrics (UP count, DOWN count, avg latency)
- Per-target status display
- Connection status indicator
- Historical results charts

---

## User Guide

### Getting Started

1. **First Login:**
   - Navigate to your application URL
   - Login with default credentials:
     - Username: `admin`
     - Password: `admin123`
   - **IMPORTANT:** Change this password immediately!

2. **Set Up 2FA (Recommended):**
   - Click "Profile" in the header
   - Click "Setup 2FA"
   - Scan QR code with Google Authenticator app
   - Enter verification code
   - Click "Verify and Enable"

3. **Create Additional Users:**
   - Click "Users" in header (admin only)
   - Click "Add User"
   - Fill in username, email, password
   - Select role (user or admin)
   - Click "Create User"

### Managing Monitoring Targets

1. **Add a Target:**
   - Click "Add Target" from dashboard
   - Fill in details:
     - **Name:** Descriptive name
     - **Type:** HTTP, TCP, or ICMP
     - **Endpoint:** URL, host:port, or hostname
     - **Frequency:** Check interval (10-86400 seconds)
     - **Timeout:** Request timeout in milliseconds
     - **Expected Code:** For HTTP (e.g., 200)
   - Click "Save"

2. **View Results:**
   - Click "View Results" on any target
   - See historical check results
   - View latency chart
   - Download data

3. **Edit/Delete Target:**
   - Click edit icon on target card
   - Make changes and save
   - Or click delete to remove (deletes all results)

### Configuring Notification Channels

1. **Add Email Channel:**
   ```json
   {
     "email": "alerts@example.com"
   }
   ```

2. **Add Slack Channel:**
   ```json
   {
     "webhookUrl": "https://hooks.slack.com/services/YOUR/WEBHOOK/URL"
   }
   ```

3. **Add PagerDuty Channel:**
   ```json
   {
     "routingKey": "your-pagerduty-routing-key"
   }
   ```

4. **Add Custom Webhook:**
   ```json
   {
     "url": "https://your-api.com/webhook",
     "method": "POST",
     "headers": {
       "Authorization": "Bearer your-token",
       "Content-Type": "application/json"
     }
   }
   ```

### Setting Up AWS CloudWatch

1. **Add AWS Account:**
   - Click "AWS Accounts" in header
   - Click "Add AWS Account"
   - Fill in:
     - **Name:** Account identifier
     - **Region:** AWS region (e.g., us-east-1)
     - **Access Key ID:** Your AWS access key
     - **Secret Access Key:** Your AWS secret key
   - Click "Save"
   - Credentials are encrypted with AES-256-GCM

2. **View CloudWatch Logs:**
   - Click "CloudWatch Logs" in header
   - Select AWS account
   - Enter log group name (or leave empty for all)
   - Set time range
   - Enter filter pattern (optional)
   - Click "Fetch Logs"

---

## Production Deployment

### Prerequisites

Before deploying to production, ensure you have:
- ✅ Changed default admin password
- ✅ Configured SESSION_SECRET environment variable
- ✅ Configured SMTP settings (if using email alerts)
- ✅ Tested all monitoring targets
- ✅ Tested notification channels
- ✅ Set up 2FA for admin accounts

### Step-by-Step Deployment Guide

#### Step 1: Prepare Environment Variables

Before publishing, configure these secrets in the Replit Secrets tool:

**Required Secrets:**
```
SESSION_SECRET=<generate-a-strong-random-32-char-string>
API_KEY=<your-secure-api-key>
```

**Optional Secrets (for email alerts):**
```
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
FROM_EMAIL=monitor@yourcompany.com
```

**How to generate SESSION_SECRET:**
```bash
# On Linux/Mac
openssl rand -base64 32

# Or use Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

#### Step 2: Database Considerations

**Development vs Production Database:**
- Your development database is separate from production
- Schema changes in development will be applied to production when you publish
- Production database is PostgreSQL 16 hosted on Neon
- Automatic scaling and backups included

**Before Publishing:**
1. Test all database operations in development
2. Ensure schema is stable
3. Back up important development data if needed

#### Step 3: Publish Your Application

1. **Access Publishing Tool:**
   - Click the "Publish" button in your Replit workspace
   - Or open the "Publishing" tool from the left sidebar

2. **Choose Deployment Type:**
   - **Recommended: Autoscale Deployment**
     - Automatically scales based on traffic
     - Pay only for what you use
     - Best for variable workloads
   - **Alternative: Reserved VM Deployment**
     - Dedicated resources
     - Predictable performance
     - Best for consistent traffic

3. **Configure Deployment:**
   - Verify environment variables are set
   - Review deployment settings
   - Click "Publish" or "Launch"

4. **Wait for Deployment:**
   - Replit will build and deploy your application
   - This may take a few minutes
   - Monitor the deployment logs

5. **Verify Deployment:**
   - Visit the deployed URL (*.replit.app)
   - Test login functionality
   - Verify monitoring checks are running
   - Test WebSocket connection

#### Step 4: Set Up Custom Domain (Optional)

1. **Link Domain:**
   - Go to Deployments tab
   - Click Settings
   - Select "Link a domain"

2. **Configure DNS:**
   - Add A record: `@ → Replit IP address`
   - Add TXT record for verification
   - Wait for DNS propagation (up to 48 hours)

3. **SSL Certificate:**
   - Replit automatically provisions SSL/TLS certificates
   - HTTPS enabled automatically
   - Auto-renewal handled by Replit

#### Step 5: Post-Deployment Tasks

1. **Change Default Credentials:**
   - Login as admin
   - Go to Profile
   - Change password
   - Enable 2FA

2. **Create Production Users:**
   - Create user accounts for your team
   - Assign appropriate roles
   - Require 2FA for admin accounts

3. **Configure Monitoring Targets:**
   - Add your production endpoints
   - Set appropriate check frequencies
   - Configure expected status codes

4. **Set Up Alerts:**
   - Configure notification channels
   - Test each channel
   - Verify alert delivery

5. **Monitor System Health:**
   - Check `/api/healthz` endpoint
   - Monitor database performance
   - Watch for errors in logs

#### Step 6: Monitoring Your Deployment

**Health Check Endpoint:**
```bash
curl https://your-app.replit.app/api/healthz
```

**Expected Response:**
```json
{
  "ok": true,
  "timestamp": "2025-01-11T19:30:00.000Z"
}
```

**Monitor Logs:**
- Access deployment logs from Replit dashboard
- Check for errors or warnings
- Monitor WebSocket connections

---

## Security Considerations

### Authentication Security

1. **Password Policy:**
   - Minimum 8 characters
   - Hashed with bcrypt (10 rounds)
   - Never stored in plain text
   - Never logged or displayed

2. **Session Security:**
   - Secure session cookies
   - HttpOnly flag set
   - SameSite protection
   - PostgreSQL-backed storage
   - Automatic expiration

3. **2FA Implementation:**
   - TOTP-based (Google Authenticator)
   - Secrets encrypted before storage
   - 6-digit codes
   - Time-based validation

4. **API Security:**
   - API key required for all endpoints
   - Session authentication required
   - Admin endpoints verify user role
   - Rate limiting recommended (add if needed)

### Data Protection

1. **AWS Credentials:**
   - Encrypted at rest (AES-256-GCM)
   - Never sent to frontend
   - Decrypted only when needed
   - Strong SESSION_SECRET required

2. **Database Security:**
   - Connection via SSL
   - Credentials in environment variables
   - Regular backups (automatic on Replit)
   - Separate dev/production databases

3. **Network Security:**
   - HTTPS enforced in production
   - WebSocket over WSS
   - No CORS issues (same-origin)

### Best Practices

1. **Access Control:**
   - Use principle of least privilege
   - Admin role only for administrators
   - Regular user for monitoring operators
   - Enable 2FA for all admin accounts

2. **Credential Management:**
   - Rotate API keys periodically
   - Use unique passwords per user
   - Don't share admin credentials
   - Use environment variables for secrets

3. **Audit Trail:**
   - Monitor admin panel access
   - Review user creation/deletion
   - Track configuration changes
   - Export logs for compliance

---

## Maintenance & Troubleshooting

### Regular Maintenance

**Weekly:**
- Review monitoring targets
- Check notification delivery
- Verify CloudWatch integration
- Review user access

**Monthly:**
- Review database size
- Clean up old results if needed
- Update dependencies
- Review security logs

**Quarterly:**
- Rotate API keys
- Review user accounts
- Update documentation
- Test disaster recovery

### Common Issues

#### Issue: WebSocket Connection Failing

**Symptoms:**
- "Disconnected" status in dashboard
- No real-time updates

**Solutions:**
1. Check if workflow is running
2. Verify WebSocket path is `/ws`
3. Check for firewall/proxy issues
4. Restart workflow

**Command:**
```bash
# Check workflow status in Replit
# Use restart workflow button if needed
```

#### Issue: Email Alerts Not Sending

**Symptoms:**
- No email notifications on state changes
- SMTP errors in logs

**Solutions:**
1. Verify SMTP credentials in Secrets
2. Check SMTP server allows connections
3. Enable "less secure apps" if using Gmail
4. Use app-specific password for Gmail
5. Check spam folder

**Gmail Example:**
```
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=<app-specific-password>
FROM_EMAIL=your-email@gmail.com
```

#### Issue: Health Checks Failing

**Symptoms:**
- All targets showing DOWN
- Timeout errors

**Solutions:**
1. Verify endpoint URLs are correct
2. Check network connectivity
3. Increase timeout values
4. Verify firewall rules
5. Check if endpoints require authentication

#### Issue: Session Expired Immediately

**Symptoms:**
- Logged out immediately after login
- Session not persisting

**Solutions:**
1. Verify SESSION_SECRET is set
2. Check database connection
3. Clear browser cookies
4. Restart application

#### Issue: Can't Access Admin Panel

**Symptoms:**
- "Access Denied" message
- 403 errors on /api/admin/* endpoints

**Solutions:**
1. Verify user has admin role
2. Check database user record
3. Re-login to refresh session
4. Check browser console for errors

### Database Maintenance

**View Database Size:**
```sql
SELECT pg_size_pretty(pg_database_size(current_database()));
```

**Count Records:**
```sql
SELECT 
  'users' as table_name, COUNT(*) FROM users
UNION ALL
SELECT 'targets', COUNT(*) FROM targets
UNION ALL
SELECT 'results', COUNT(*) FROM results
UNION ALL
SELECT 'notification_channels', COUNT(*) FROM notification_channels
UNION ALL
SELECT 'aws_accounts', COUNT(*) FROM aws_accounts;
```

**Clean Old Results (if needed):**
```sql
-- Results are automatically limited to last 200 per target
-- But you can manually clean older results if needed
DELETE FROM results 
WHERE created_at < NOW() - INTERVAL '90 days';
```

### Performance Optimization

1. **Database Indexes:**
   - Already optimized with foreign keys
   - Index on target_id in results table
   - Index on created_at for time-based queries

2. **Check Frequency:**
   - Don't set too aggressive frequencies
   - Minimum 10 seconds recommended
   - Balance between monitoring needs and load

3. **Result Retention:**
   - Limited to last 200 per target
   - Automatic cleanup on delete
   - Consider archiving old data

4. **WebSocket Connections:**
   - Reconnects automatically
   - Only one connection per client
   - Broadcasts to all connected clients

### Backup & Recovery

**Replit Automatic Backups:**
- Production database backed up automatically
- Point-in-time recovery available
- Contact Replit support for restore

**Manual Backup:**
- Use database export tools in Replit
- Export critical configuration
- Document AWS account details separately
- Keep notification channel configs

### Support Resources

**Replit Support:**
- Documentation: https://docs.replit.com
- Community: https://replit.com/community
- Support: support@replit.com

**Application Logs:**
- View in Replit console
- Check workflow logs
- Browser console for frontend issues

**Health Check:**
```bash
# Test application health
curl https://your-app.replit.app/api/healthz

# Test with API key
curl -H "x-api-key: your-api-key" \
  https://your-app.replit.app/api/targets
```

---

## Appendix

### Environment Variables Reference

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `DATABASE_URL` | Yes | Auto | PostgreSQL connection string |
| `SESSION_SECRET` | Yes | - | Encryption key (32+ chars) |
| `API_KEY` | Yes | demo-api-key | API authentication key |
| `SMTP_HOST` | No | localhost | SMTP server hostname |
| `SMTP_PORT` | No | 25 | SMTP server port |
| `SMTP_USER` | No | - | SMTP username |
| `SMTP_PASS` | No | - | SMTP password |
| `FROM_EMAIL` | No | monitor@cloudcx.local | Email sender address |

### API Endpoints Reference

**Authentication:**
- `POST /api/auth/login` - Login
- `POST /api/auth/logout` - Logout
- `GET /api/auth/me` - Get current user
- `POST /api/auth/2fa/setup` - Setup 2FA
- `POST /api/auth/2fa/enable` - Enable 2FA
- `POST /api/auth/2fa/disable` - Disable 2FA

**Monitoring:**
- `GET /api/targets` - List targets
- `POST /api/targets` - Create target
- `PUT /api/targets/:id` - Update target
- `DELETE /api/targets/:id` - Delete target
- `GET /api/results/:targetId` - Get results

**Notifications:**
- `GET /api/channels` - List channels
- `POST /api/channels` - Create channel
- `PUT /api/channels/:id` - Update channel
- `DELETE /api/channels/:id` - Delete channel

**AWS:**
- `GET /api/aws-accounts` - List accounts
- `POST /api/aws-accounts` - Create account
- `PUT /api/aws-accounts/:id` - Update account
- `DELETE /api/aws-accounts/:id` - Delete account
- `GET /api/logs` - Query CloudWatch

**Admin:**
- `GET /api/admin/users` - List users
- `POST /api/admin/users` - Create user
- `PUT /api/admin/users/:id` - Update user
- `DELETE /api/admin/users/:id` - Delete user

**Health:**
- `GET /api/healthz` - Health check (no auth)

### Database Schema Reference

See `shared/schema.ts` for complete schema definitions.

**Key Tables:**
- `users` - User accounts and auth
- `targets` - Monitoring targets
- `results` - Check results history
- `notification_channels` - Alert channels
- `aws_accounts` - AWS credentials (encrypted)
- `sessions` - Session storage

---

## Conclusion

This guide covers everything you need to deploy and maintain CloudCX Monitoring Solution in production. For additional help:

1. Check this documentation first
2. Review application logs
3. Check Replit documentation
4. Contact your system administrator

Remember to:
- ✅ Change default credentials
- ✅ Enable 2FA for admins
- ✅ Set strong SESSION_SECRET
- ✅ Configure SMTP for alerts
- ✅ Test in development first
- ✅ Monitor production regularly

Good luck with your deployment!
