# OneCG Genesys Billing Report - Deployment Guide

## 📦 Production Build

Your application has been built and is ready for deployment. The production files are in the `dist` folder.

## 🚀 Deployment Instructions

### Prerequisites

1. Node.js 18+ installed on your web server
2. A process manager like PM2 (recommended) or systemd
3. Environment variables configured

### Files to Deploy

Copy the following to your web server:
```
dist/                   # Built application
├── public/            # Frontend static files
│   ├── index.html
│   └── assets/        # JS and CSS bundles
└── index.js           # Backend server bundle

node_modules/          # Production dependencies
package.json
package-lock.json
```

### Step 1: Transfer Files to Server

```bash
# Option A: Using SCP
scp -r dist node_modules package.json package-lock.json user@your-server:/path/to/app/

# Option B: Using rsync
rsync -avz dist node_modules package.json package-lock.json user@your-server:/path/to/app/

# Option C: Using Git
git clone your-repo
cd your-repo
npm install --production
```

### Step 2: Set Environment Variables

Create a `.env` file on your server:

```bash
PORT=5000
SESSION_SECRET=your-secure-random-session-secret-here
NODE_ENV=production
```

**Generate a secure SESSION_SECRET:**
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### Step 3: Start the Application

#### Option A: Using PM2 (Recommended)

```bash
# Install PM2 globally
npm install -g pm2

# Start the application
pm2 start dist/index.js --name genesys-billing-report

# Save PM2 configuration
pm2 save

# Setup PM2 to start on system boot
pm2 startup
```

PM2 Commands:
```bash
pm2 status                    # Check status
pm2 logs genesys-billing-report   # View logs
pm2 restart genesys-billing-report # Restart app
pm2 stop genesys-billing-report    # Stop app
```

#### Option B: Using Node directly

```bash
cd /path/to/app
NODE_ENV=production node dist/index.js
```

#### Option C: Using systemd

Create `/etc/systemd/system/genesys-billing.service`:

```ini
[Unit]
Description=Genesys Billing Report
After=network.target

[Service]
Type=simple
User=www-data
WorkingDirectory=/path/to/app
Environment=NODE_ENV=production
Environment=PORT=5000
Environment=SESSION_SECRET=your-secret-here
ExecStart=/usr/bin/node dist/index.js
Restart=on-failure

[Install]
WantedBy=multi-user.target
```

Then:
```bash
sudo systemctl daemon-reload
sudo systemctl enable genesys-billing
sudo systemctl start genesys-billing
sudo systemctl status genesys-billing
```

### Step 4: Configure Reverse Proxy (Optional but Recommended)

#### Using Nginx

Create `/etc/nginx/sites-available/genesys-billing`:

```nginx
server {
    listen 80;
    server_name your-domain.com;

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
}
```

Enable the site:
```bash
sudo ln -s /etc/nginx/sites-available/genesys-billing /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

#### Using Apache

Enable required modules:
```bash
sudo a2enmod proxy proxy_http
```

Create `/etc/apache2/sites-available/genesys-billing.conf`:

```apache
<VirtualHost *:80>
    ServerName your-domain.com
    
    ProxyPreserveHost On
    ProxyPass / http://localhost:5000/
    ProxyPassReverse / http://localhost:5000/
</VirtualHost>
```

Enable the site:
```bash
sudo a2ensite genesys-billing
sudo systemctl reload apache2
```

### Step 5: SSL/HTTPS Setup (Recommended)

Using Let's Encrypt with Certbot:

```bash
# Install Certbot
sudo apt install certbot python3-certbot-nginx

# Get SSL certificate
sudo certbot --nginx -d your-domain.com

# Auto-renewal is set up automatically
```

## 🔧 Configuration

### Default Credentials

- Username: `once` or `onecg`
- Password: `once` or `onecg`

**⚠️ IMPORTANT:** For production use, you should modify the authentication in `server/routes.ts` to use a proper authentication system.

### Client Management

1. Login to the application
2. Click "Add Client" in the sidebar
3. Enter:
   - Client Name (e.g., "Clarisys Global")
   - Genesys Authorization Token (from Genesys Cloud)

The token can include "Authorization: Bearer" prefix or just the token itself - it will be cleaned automatically.

## 📊 Using the Application

1. **Select a client** from the sidebar
2. **Choose date range** using the From/To dropdowns
3. **Click "Download Usage Report"** to generate the report
4. View detailed usage information, enabled products, and billing data

## 🔍 Monitoring

### Check Application Logs

```bash
# PM2
pm2 logs genesys-billing-report

# systemd
sudo journalctl -u genesys-billing -f

# Manual
tail -f /path/to/app/logs/app.log
```

### Health Check

```bash
curl http://localhost:5000/api/auth/check
```

## 🛠️ Troubleshooting

### Application won't start

1. Check Node.js version: `node --version` (must be 18+)
2. Check environment variables are set
3. Check port 5000 is not already in use: `lsof -i :5000`
4. Check logs for errors

### Can't connect to Genesys API

1. Verify the authorization token is valid
2. Check network connectivity from your server
3. Ensure Genesys API endpoint is accessible: `https://api.euw2.pure.cloud`

### Session issues

1. Ensure SESSION_SECRET is set and consistent across restarts
2. Check cookie settings if behind a proxy

## 📁 File Structure

```
dist/
├── index.js              # Compiled backend server
└── public/              # Static frontend files
    ├── index.html       # Main HTML file
    └── assets/          # Bundled JS and CSS
        ├── index-[hash].js   # Frontend JavaScript
        └── index-[hash].css  # Styles
```

## 🔄 Updates

To deploy a new version:

1. Build the application: `npm run build`
2. Transfer new `dist/` folder to server
3. Restart the application: `pm2 restart genesys-billing-report`

## 📞 Support

- Genesys Cloud API: https://api.euw2.pure.cloud
- Billing Periods Endpoint: `/api/v2/billing/periods?periodGranularity=month`
- Subscription Overview Endpoint: `/api/v2/billing/subscriptionoverview?periodEndingTimestamp={timestamp}`

## 🔐 Security Recommendations

1. ✅ Use HTTPS in production
2. ✅ Change default credentials
3. ✅ Set a strong SESSION_SECRET
4. ✅ Use environment variables for sensitive data
5. ✅ Keep Node.js and dependencies updated
6. ✅ Use a firewall to restrict access
7. ✅ Implement proper user authentication for production
