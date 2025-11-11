# CloudCX Monitoring - Quick User Manual

## Quick Start Guide

### First Time Setup (5 minutes)

1. **Login**
   - Go to your application URL
   - Username: `admin`
   - Password: `admin123`

2. **Secure Your Account**
   - Click "Profile" → Change password
   - Click "Setup 2FA" → Scan QR code with Google Authenticator
   - Enter code → "Verify and Enable"

3. **Create Your First Monitoring Target**
   - Click "Add Target"
   - Name: "My Website"
   - Type: HTTP
   - Endpoint: https://example.com
   - Frequency: 60 seconds
   - Timeout: 5000 ms
   - Expected Code: 200
   - Click "Save"

4. **Set Up Alerts**
   - Click "Channels" → "Add Channel"
   - Choose Email
   - Config: `{"email": "you@example.com"}`
   - Click "Save"

**Done!** You'll now receive alerts when your website goes down.

---

## Daily Operations

### Viewing Dashboard

The dashboard shows:
- **Green badges**: Endpoint is UP
- **Red badges**: Endpoint is DOWN
- **Yellow badges**: Check pending
- **Live status**: WebSocket connection indicator
- **Metrics**: Total UP, DOWN, and average latency

### Adding HTTP/HTTPS Monitoring

**Example: Monitor API endpoint**
```
Name: Production API
Type: HTTP
Endpoint: https://api.yourcompany.com/health
Frequency: 30 (seconds)
Timeout: 3000 (milliseconds)
Expected Code: 200
```

**Example: Monitor website**
```
Name: Company Website
Type: HTTP
Endpoint: https://www.yourcompany.com
Frequency: 60
Timeout: 5000
Expected Code: 200
```

### Adding TCP Monitoring

**Example: Monitor database**
```
Name: PostgreSQL Database
Type: TCP
Endpoint: db.yourcompany.com:5432
Frequency: 60
Timeout: 3000
```

**Example: Monitor Redis**
```
Name: Redis Cache
Type: TCP
Endpoint: redis.internal:6379
Frequency: 30
Timeout: 2000
```

### Viewing Historical Results

1. Find your target on dashboard
2. Click "View Results"
3. See:
   - Last 200 check results
   - Latency chart
   - Success rate
   - Recent failures

### Setting Up Email Alerts

1. Click "Channels" → "Add Channel"
2. Name: "Team Email"
3. Type: Email
4. Config:
   ```json
   {
     "email": "team@yourcompany.com"
   }
   ```
5. Ensure channel is enabled
6. Click "Save"

### Setting Up Slack Alerts

1. **Get Slack Webhook URL:**
   - Go to https://api.slack.com/apps
   - Create new app → Incoming Webhooks
   - Copy webhook URL

2. **Add to CloudCX:**
   - Click "Channels" → "Add Channel"
   - Name: "Slack Alerts"
   - Type: Slack
   - Config:
     ```json
     {
       "webhookUrl": "https://hooks.slack.com/services/YOUR/WEBHOOK/URL"
     }
     ```
   - Click "Save"

### Setting Up PagerDuty Alerts

1. **Get PagerDuty Routing Key:**
   - Log into PagerDuty
   - Services → Your Service → Integrations
   - Add Integration → Events API V2
   - Copy Integration Key

2. **Add to CloudCX:**
   - Click "Channels" → "Add Channel"
   - Name: "PagerDuty Incidents"
   - Type: PagerDuty
   - Config:
     ```json
     {
       "routingKey": "your-integration-key-here"
     }
     ```
   - Click "Save"

### Setting Up Custom Webhooks

**Example: Send to custom API**
```json
{
  "url": "https://your-api.com/alerts",
  "method": "POST",
  "headers": {
    "Authorization": "Bearer your-api-token",
    "Content-Type": "application/json"
  }
}
```

The webhook will receive:
```json
{
  "target": "Your Target Name",
  "status": "DOWN",
  "endpoint": "https://example.com",
  "message": "Error message here",
  "timestamp": "2025-01-11T19:00:00.000Z"
}
```

---

## AWS CloudWatch Logs

### Adding AWS Account

1. **Create IAM User in AWS:**
   - Go to AWS Console → IAM
   - Create new user
   - Attach policy: `CloudWatchLogsReadOnlyAccess`
   - Create access key → Copy credentials

2. **Add to CloudCX:**
   - Click "AWS Accounts" → "Add AWS Account"
   - Name: "Production AWS"
   - Region: us-east-1 (or your region)
   - Access Key ID: (paste)
   - Secret Access Key: (paste)
   - Click "Save"

### Viewing CloudWatch Logs

1. Click "CloudWatch Logs"
2. Select AWS Account
3. Enter Log Group (e.g., `/aws/lambda/my-function`)
4. Select time range
5. Enter filter pattern (optional):
   - `ERROR` - Show only errors
   - `"timeout"` - Show timeouts
   - `[timestamp, request_id, level = ERROR]` - Structured logs
6. Click "Fetch Logs"
7. Download if needed

### Common Log Patterns

**Find errors:**
```
ERROR
```

**Find specific text:**
```
"database connection failed"
```

**Find by field (JSON logs):**
```
{ $.level = "ERROR" }
```

**Time-based:**
- Last 5 minutes
- Last 1 hour
- Last 24 hours
- Custom range

---

## User Management (Admin Only)

### Creating Users

1. Click "Users" → "Add User"
2. Fill in:
   - Username: john.doe
   - Email: john@company.com
   - Password: (temporary - user should change)
   - Role: User or Admin
3. Click "Create User"

**Tell the user:**
- Their temporary password
- To change it immediately
- To enable 2FA in Profile

### Managing Roles

**Admin Role:**
- Can manage all users
- Can access admin panel
- Full system access

**User Role:**
- Can manage monitoring targets
- Can view results
- Can manage channels
- Cannot manage other users

### Deleting Users

1. Click "Users"
2. Find user
3. Click trash icon
4. Confirm deletion

**Note:** Cannot delete yourself while logged in.

---

## Profile & 2FA

### Changing Password

1. Click "Profile"
2. View current username and role
3. **To change password:**
   - Currently requires admin to update
   - Contact your admin

### Setting Up 2FA

1. Click "Profile"
2. Click "Setup 2FA"
3. Install Google Authenticator app on phone:
   - iOS: App Store → "Google Authenticator"
   - Android: Play Store → "Google Authenticator"
4. Open app → Click "+" → Scan QR code
5. Enter 6-digit code from app
6. Click "Verify and Enable"

### Logging In with 2FA

1. Enter username and password
2. Click "Login"
3. Enter 6-digit code from authenticator app
4. Click "Verify 2FA"

### Disabling 2FA

1. Click "Profile"
2. Click "Disable 2FA"
3. Confirm

**Note:** Recommended to keep 2FA enabled for admin accounts.

---

## Tips & Best Practices

### Monitoring Frequency

**High-priority endpoints:**
- Frequency: 30-60 seconds
- Example: Payment API, User authentication

**Medium-priority endpoints:**
- Frequency: 2-5 minutes
- Example: Admin panels, Internal tools

**Low-priority endpoints:**
- Frequency: 10-30 minutes
- Example: Documentation sites, Static content

### Timeout Settings

**Rule of thumb:**
- Set timeout to 2x normal response time
- Minimum: 1000ms (1 second)
- Maximum: 60000ms (60 seconds)

**Examples:**
- Fast API: 2000-3000ms
- Web page: 5000-10000ms
- Slow service: 15000-30000ms

### Alert Fatigue Prevention

**The system helps by:**
- Only alerting on state changes
- Not spamming on every failed check
- Sending both DOWN and recovery alerts

**You should:**
- Don't set too many targets
- Group related endpoints
- Use appropriate check frequencies
- Test notification channels

### Naming Conventions

**Good target names:**
- `Prod API - Health Check`
- `Staging DB - Port 5432`
- `CDN - Static Assets`

**Bad target names:**
- `Test`
- `New Target 1`
- `Check this`

### Security Best Practices

1. **Change default password immediately**
2. **Enable 2FA for admin accounts**
3. **Use unique passwords per user**
4. **Don't share credentials**
5. **Review user list regularly**
6. **Remove inactive users**
7. **Keep SESSION_SECRET strong and private**
8. **Rotate API keys periodically**

---

## Troubleshooting

### "Disconnected" Status

**Problem:** WebSocket shows disconnected

**Solution:**
1. Refresh page
2. Check internet connection
3. Check if app is running
4. Wait 10 seconds for auto-reconnect

### Alerts Not Received

**Problem:** Not getting email/Slack alerts

**Solution:**
1. Check channel is enabled
2. Verify config is correct
3. Check spam folder (email)
4. Test with a different target
5. Verify SMTP settings (admin)

### "Access Denied" in Admin Panel

**Problem:** Cannot access user management

**Solution:**
1. Verify you have admin role
2. Click Profile to check role
3. Log out and back in
4. Contact admin if role is wrong

### Target Always Shows DOWN

**Problem:** Endpoint shows DOWN but is actually UP

**Solution:**
1. Verify endpoint URL is correct
2. Check expected status code
3. Increase timeout value
4. Test endpoint manually (curl)
5. Check if endpoint requires auth

### CloudWatch Logs Not Loading

**Problem:** "Failed to fetch logs" error

**Solution:**
1. Verify AWS credentials are correct
2. Check IAM permissions
3. Verify log group name
4. Check AWS region
5. Try different time range

---

## Keyboard Shortcuts

Currently no keyboard shortcuts implemented.

---

## API Access

All endpoints require:
- Header: `x-api-key: your-api-key`
- Session cookie (for auth)

**Example:**
```bash
# Get all targets
curl -H "x-api-key: your-key" \
  -b cookies.txt \
  https://your-app.replit.app/api/targets
```

**Note:** Use the web UI for normal operations. API is for automation only.

---

## Getting Help

**Check in order:**
1. This user manual
2. DEPLOYMENT_GUIDE.md (admin operations)
3. Application health check: `/api/healthz`
4. Browser console (F12)
5. Your system administrator
6. Replit support (for platform issues)

---

## Common Questions

**Q: How long is history kept?**
A: Last 200 check results per target. Older results automatically deleted.

**Q: Can I export results?**
A: Yes, click "View Results" and download CSV.

**Q: How do I monitor internal endpoints?**
A: If running on same network, use internal hostnames/IPs. Otherwise, need VPN or proxy.

**Q: Can I pause monitoring?**
A: Yes, edit target and uncheck "Enabled".

**Q: How many targets can I monitor?**
A: No hard limit, but recommended <100 for performance.

**Q: Can I customize alert messages?**
A: Not currently. All alerts use standard format.

**Q: Is there a mobile app?**
A: No, but web UI is mobile-responsive.

**Q: Can I get SMS alerts?**
A: Not directly. Use Twilio webhook or PagerDuty.

**Q: How do I backup my config?**
A: Database backed up automatically by Replit.

**Q: Can I import targets in bulk?**
A: Not currently. Must add individually.

---

## Quick Reference

### Default Ports
- HTTP: 80
- HTTPS: 443
- PostgreSQL: 5432
- Redis: 6379
- MySQL: 3306
- MongoDB: 27017

### Status Codes
- 200: OK
- 201: Created
- 204: No Content
- 301: Moved Permanently
- 302: Found (redirect)
- 400: Bad Request
- 401: Unauthorized
- 403: Forbidden
- 404: Not Found
- 500: Internal Server Error
- 502: Bad Gateway
- 503: Service Unavailable

### Time Ranges (CloudWatch)
- 5m: Last 5 minutes
- 1h: Last 1 hour
- 6h: Last 6 hours
- 24h: Last 24 hours
- 7d: Last 7 days

---

## Contact

For issues with:
- **This application**: Contact your admin
- **Replit platform**: support@replit.com
- **AWS issues**: AWS Support
- **Feature requests**: Your admin/development team

---

*Last updated: 2025-01-11*
