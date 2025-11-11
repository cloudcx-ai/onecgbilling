# CloudCX Monitoring - Self-Hosted Deployment Guide

This guide covers deploying CloudCX Monitoring on your own server infrastructure (AWS EC2, Ubuntu, CentOS, etc.)

## Table of Contents
1. [Option 1: Replit Production (Easiest)](#option-1-replit-production-easiest)
2. [Option 2: AWS EC2 / Your Own Server](#option-2-aws-ec2--your-own-server)
3. [Option 3: Docker Deployment](#option-3-docker-deployment)
4. [Option 4: PM2 Process Manager](#option-4-pm2-process-manager)

---

## Option 1: Replit Production (Easiest)

**Recommended if:** You want the simplest deployment with automatic scaling and managed infrastructure.

### Steps:

1. **Fix Database Connection First:**
   - Go to Replit Secrets
   - Update `DATABASE_URL` with URL-encoded password:
   ```
   postgresql://postgres:Genesys%212345678@ccx-monitor.c7e4wm6karkv.eu-west-2.rds.amazonaws.com:5432/ccx?sslmode=prefer
   ```
   
2. **Set Required Secrets:**
   ```
   SESSION_SECRET=<32-char-random-string>
   API_KEY=<your-secure-api-key>
   ```
   
3. **Optional SMTP Secrets:**
   ```
   SMTP_HOST=smtp.gmail.com
   SMTP_PORT=587
   SMTP_USER=your-email@gmail.com
   SMTP_PASS=<app-password>
   FROM_EMAIL=monitor@yourcompany.com
   ```

4. **Click "Publish" in Replit:**
   - Choose Autoscale Deployment
   - Replit handles: SSL, scaling, monitoring, backups
   - Get a `.replit.app` domain automatically

5. **Optional: Custom Domain:**
   - Go to Deployments → Settings
   - Link your domain
   - Add DNS records

**Pros:**
- ✅ Easiest setup (1-click deploy)
- ✅ Automatic SSL certificates
- ✅ Auto-scaling
- ✅ Managed infrastructure
- ✅ Built-in monitoring

**Cons:**
- ❌ Ongoing costs (Replit pricing)
- ❌ Less control over infrastructure

---

## Option 2: AWS EC2 / Your Own Server

**Recommended if:** You want full control and already have AWS infrastructure.

### Prerequisites

- Ubuntu 20.04+ or Amazon Linux 2
- Node.js 18+ installed
- PostgreSQL access (your RDS database)
- Root or sudo access

### Step-by-Step Installation

#### 1. Prepare Your Server

SSH into your server:
```bash
ssh ubuntu@your-server-ip
```

Update system:
```bash
sudo apt update && sudo apt upgrade -y
```

Install Node.js 20 (LTS):
```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
```

Verify:
```bash
node --version  # Should be v20.x
npm --version
```

#### 2. Clone or Upload Your Code

**Option A: From Git (if you have a repo):**
```bash
cd /opt
sudo git clone https://github.com/yourcompany/cloudcx-monitor.git
cd cloudcx-monitor
```

**Option B: Upload from Replit:**
```bash
# On Replit, download your project as ZIP
# Upload to server:
scp cloudcx-monitor.zip ubuntu@your-server:/opt/
ssh ubuntu@your-server
cd /opt
unzip cloudcx-monitor.zip
cd cloudcx-monitor
```

#### 3. Install Dependencies

```bash
npm install
```

#### 4. Configure Environment Variables

Create `.env` file:
```bash
nano .env
```

Add:
```env
# Database
DATABASE_URL=postgresql://postgres:Genesys!2345678@ccx-monitor.c7e4wm6karkv.eu-west-2.rds.amazonaws.com:5432/ccx?sslmode=prefer

# Required
SESSION_SECRET=your-32-char-random-secret-here
API_KEY=your-secure-api-key-here

# SMTP (Optional)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
FROM_EMAIL=monitor@yourcompany.com

# Production
NODE_ENV=production
PORT=5000
```

Save with `Ctrl+X`, then `Y`, then `Enter`.

**Generate SESSION_SECRET:**
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

#### 5. Build the Application

```bash
npm run build
```

This compiles TypeScript and bundles the frontend.

#### 6. Initialize Database

```bash
npm run db:push
```

Create admin user:
```bash
npm run create-admin
```

#### 7. Test the Application

```bash
npm start
```

Visit: `http://your-server-ip:5000`

Login with: `admin` / `admin123`

If it works, press `Ctrl+C` to stop.

#### 8. Set Up Systemd Service (Run 24/7)

Create service file:
```bash
sudo nano /etc/systemd/system/cloudcx-monitor.service
```

Add:
```ini
[Unit]
Description=CloudCX Monitoring Service
After=network.target

[Service]
Type=simple
User=ubuntu
WorkingDirectory=/opt/cloudcx-monitor
Environment=NODE_ENV=production
EnvironmentFile=/opt/cloudcx-monitor/.env
ExecStart=/usr/bin/npm start
Restart=always
RestartSec=10
StandardOutput=journal
StandardError=journal
SyslogIdentifier=cloudcx-monitor

[Install]
WantedBy=multi-user.target
```

Save and exit.

Enable and start service:
```bash
sudo systemctl daemon-reload
sudo systemctl enable cloudcx-monitor
sudo systemctl start cloudcx-monitor
```

Check status:
```bash
sudo systemctl status cloudcx-monitor
```

View logs:
```bash
sudo journalctl -u cloudcx-monitor -f
```

#### 9. Set Up Nginx Reverse Proxy (Recommended)

Install Nginx:
```bash
sudo apt install -y nginx
```

Create config:
```bash
sudo nano /etc/nginx/sites-available/cloudcx-monitor
```

Add:
```nginx
server {
    listen 80;
    server_name monitor.yourcompany.com;

    location / {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # WebSocket support
    location /ws {
        proxy_pass http://localhost:5000/ws;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "Upgrade";
        proxy_set_header Host $host;
    }
}
```

Enable site:
```bash
sudo ln -s /etc/nginx/sites-available/cloudcx-monitor /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

#### 10. Set Up SSL with Let's Encrypt

Install Certbot:
```bash
sudo apt install -y certbot python3-certbot-nginx
```

Get certificate:
```bash
sudo certbot --nginx -d monitor.yourcompany.com
```

Auto-renewal is set up automatically.

#### 11. Configure Firewall

```bash
sudo ufw allow 22/tcp   # SSH
sudo ufw allow 80/tcp   # HTTP
sudo ufw allow 443/tcp  # HTTPS
sudo ufw enable
```

### Your Application is Now Running!

- **URL:** https://monitor.yourcompany.com
- **Login:** admin / admin123 (change immediately!)
- **Logs:** `sudo journalctl -u cloudcx-monitor -f`
- **Restart:** `sudo systemctl restart cloudcx-monitor`
- **Stop:** `sudo systemctl stop cloudcx-monitor`

### Maintenance Commands

**View logs:**
```bash
sudo journalctl -u cloudcx-monitor -f
```

**Restart service:**
```bash
sudo systemctl restart cloudcx-monitor
```

**Update application:**
```bash
cd /opt/cloudcx-monitor
git pull  # or upload new files
npm install
npm run build
sudo systemctl restart cloudcx-monitor
```

---

## Option 3: Docker Deployment

**Recommended if:** You prefer containerized deployments.

### Create Dockerfile

```dockerfile
FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy source code
COPY . .

# Build application
RUN npm run build

# Expose port
EXPOSE 5000

# Start application
CMD ["npm", "start"]
```

### Create docker-compose.yml

```yaml
version: '3.8'

services:
  cloudcx-monitor:
    build: .
    ports:
      - "5000:5000"
    environment:
      - NODE_ENV=production
      - DATABASE_URL=postgresql://postgres:Genesys!2345678@ccx-monitor.c7e4wm6karkv.eu-west-2.rds.amazonaws.com:5432/ccx?sslmode=prefer
      - SESSION_SECRET=your-32-char-secret
      - API_KEY=your-api-key
      - SMTP_HOST=smtp.gmail.com
      - SMTP_PORT=587
      - SMTP_USER=your-email@gmail.com
      - SMTP_PASS=your-password
      - FROM_EMAIL=monitor@yourcompany.com
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:5000/api/healthz"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s
```

### Deploy with Docker

```bash
# Build
docker-compose build

# Start
docker-compose up -d

# View logs
docker-compose logs -f

# Stop
docker-compose down
```

---

## Option 4: PM2 Process Manager

**Recommended if:** You want process management without systemd.

### Install PM2

```bash
sudo npm install -g pm2
```

### Create ecosystem.config.js

```javascript
module.exports = {
  apps: [{
    name: 'cloudcx-monitor',
    script: 'npm',
    args: 'start',
    cwd: '/opt/cloudcx-monitor',
    env: {
      NODE_ENV: 'production',
      PORT: 5000
    },
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_file: './logs/combined.log',
    time: true
  }]
};
```

### Deploy with PM2

```bash
# Start
pm2 start ecosystem.config.js

# Save process list
pm2 save

# Set up auto-start on boot
pm2 startup

# View logs
pm2 logs cloudcx-monitor

# Monitor
pm2 monit

# Restart
pm2 restart cloudcx-monitor
```

---

## Security Checklist

Before going to production:

- [ ] Change default admin password
- [ ] Enable 2FA for admin accounts
- [ ] Use strong SESSION_SECRET (32+ random characters)
- [ ] Use strong API_KEY
- [ ] Enable SSL/HTTPS
- [ ] Configure firewall (only ports 80, 443, 22)
- [ ] Keep Node.js and dependencies updated
- [ ] Set up database backups
- [ ] Configure log rotation
- [ ] Set up monitoring/alerting
- [ ] Restrict AWS RDS security group to your server IP
- [ ] Use environment variables (never hardcode secrets)

---

## AWS Security Group Configuration

For your RDS database, allow access from your server:

1. Go to AWS Console → RDS → Your Database
2. Click on security group
3. Add inbound rule:
   - Type: PostgreSQL
   - Port: 5432
   - Source: Your server IP (e.g., 52.123.45.67/32)

---

## Troubleshooting

### Application won't start

Check logs:
```bash
sudo journalctl -u cloudcx-monitor -n 100
```

Common issues:
- Database connection failed → Check DATABASE_URL
- Port already in use → Change PORT in .env
- Permission denied → Check file ownership

### Can't connect to database

Test connection:
```bash
psql "postgresql://postgres:password@ccx-monitor...amazonaws.com:5432/ccx"
```

Check:
- Security group allows your server IP
- Password is correct
- RDS is running

### WebSocket not working

Check Nginx config has WebSocket support:
```nginx
location /ws {
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "Upgrade";
}
```

---

## Monitoring & Logs

### Application Logs

**Systemd:**
```bash
sudo journalctl -u cloudcx-monitor -f
```

**PM2:**
```bash
pm2 logs cloudcx-monitor
```

### System Resources

**Check CPU/Memory:**
```bash
top
htop
```

**Disk space:**
```bash
df -h
```

### Database Monitoring

**Connection count:**
```sql
SELECT count(*) FROM pg_stat_activity;
```

**Database size:**
```sql
SELECT pg_size_pretty(pg_database_size('ccx'));
```

---

## Backup Strategy

### Application Code
- Git repository (recommended)
- Regular snapshots of /opt/cloudcx-monitor

### Database
- AWS RDS automated backups (enabled by default)
- Manual snapshots before major changes
- Point-in-time recovery available

### Environment Variables
- Store .env file securely
- Use AWS Secrets Manager or HashiCorp Vault (advanced)

---

## Performance Optimization

### Node.js

Set production mode:
```bash
export NODE_ENV=production
```

### Nginx Caching

Add to Nginx config:
```nginx
location /static/ {
    expires 1y;
    add_header Cache-Control "public, immutable";
}
```

### Database Connection Pooling

Already configured in code (10 connections max).

---

## Scaling Considerations

### Vertical Scaling
- Increase EC2 instance size
- Increase RDS instance size

### Horizontal Scaling
- Run multiple app instances behind load balancer
- Use Redis for session storage (instead of PostgreSQL)
- Separate WebSocket server if needed

---

## Cost Estimation

**AWS Monthly Costs (Approximate):**

- EC2 t3.small (2 vCPU, 2GB RAM): ~$15/month
- RDS db.t3.micro (1 vCPU, 1GB RAM): ~$15/month
- Data transfer: ~$5/month
- **Total: ~$35/month**

**Replit Monthly Costs:**
- Autoscale deployment: Variable, pay-per-use
- Reserved VM: Starting at $20/month

---

## Comparison Summary

| Feature | Replit | Self-Hosted (EC2) | Docker |
|---------|--------|-------------------|--------|
| Setup Time | 5 minutes | 1-2 hours | 30 minutes |
| Maintenance | Managed | Manual | Semi-managed |
| Control | Limited | Full | Full |
| Scaling | Automatic | Manual | Manual |
| SSL | Auto | Manual (Certbot) | Manual |
| Cost | $20-50/mo | $35+/mo | $35+/mo |
| Best For | Quick deploy | Full control | Containerized |

---

## Recommended Approach

1. **Start with Replit** (easiest, fastest)
2. **When needed, migrate to AWS EC2** (more control, potentially lower cost)
3. **Use Docker if you have container expertise**

---

## Next Steps

1. Choose your deployment method
2. Follow the appropriate section above
3. Configure your domain DNS
4. Set up SSL certificates
5. Create production users
6. Add monitoring targets
7. Test notification channels
8. Monitor and maintain

---

## Support

For deployment issues:
- Replit: support@replit.com
- AWS: AWS Support Console
- Application: Check DEPLOYMENT_GUIDE.md

---

*Last updated: 2025-01-11*
