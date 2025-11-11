# AWS RDS Connection Setup - Status & Steps

## Current Status

✅ **Completed:**
- DATABASE_URL format is correct
- RDS endpoint is reachable from Replit
- Password is correct (Genesys12345678)
- Application code is configured for PostgreSQL

❌ **Remaining Issue:**
- **AWS Security Group is blocking connection**
- Error: `no pg_hba.conf entry for host "136.118.16.81", user "postgres", database "ccx", no encryption`

---

## Solution: Fix AWS Security Group

### Step-by-Step Instructions:

#### 1. Go to RDS Database
1. Open **AWS Console**
2. Navigate to **RDS** → **Databases**
3. Click on your database: **ccx-monitor**

#### 2. Find Security Group
1. Scroll to **"Connectivity & security"** section
2. Under **"VPC security groups"**, you'll see a link like:
   - `default (sg-0abc123def)` or similar
3. **Click on the security group link**

#### 3. Edit Inbound Rules
1. You're now in the **EC2 Security Groups** page
2. Click the **"Inbound rules"** tab
3. Click **"Edit inbound rules"** button

#### 4. Add PostgreSQL Rule
Click **"Add rule"** and configure:

| Setting | Value |
|---------|-------|
| **Type** | PostgreSQL (this auto-fills port 5432) |
| **Protocol** | TCP |
| **Port range** | 5432 |
| **Source** | Custom |
| **CIDR** | `136.118.16.81/32` |
| **Description** | Replit access |

**Alternative (Testing Only - Less Secure):**
- Source: **Anywhere-IPv4** → `0.0.0.0/0`
- Description: Allow all (temporary)

#### 5. Save
1. Click **"Save rules"**
2. Wait **30 seconds** for changes to apply

---

## Current DATABASE_URL

```
postgresql://postgres:Genesys12345678@ccx-monitor.c7e4wm6karkv.eu-west-2.rds.amazonaws.com:5432/ccx?sslmode=disable
```

This is currently saved in your Replit Secrets.

---

## Testing the Connection

### Option 1: From Your Local Machine (if you have psql)
```bash
psql "postgresql://postgres:Genesys12345678@ccx-monitor.c7e4wm6karkv.eu-west-2.rds.amazonaws.com:5432/ccx?sslmode=disable"
```

If this works from your machine but not from Replit, the security group is blocking Replit's IP.

### Option 2: Wait for Replit Connection
After fixing the security group, the application will automatically connect when the workflow restarts.

---

## After Connection Works

Once the security group is fixed and the connection works, I will:

1. ✅ Initialize your database schema (create all tables)
2. ✅ Create the default admin user (username: admin, password: admin123)
3. ✅ Verify the application is working
4. ✅ Help you deploy to your own server

---

## Troubleshooting

### If connection still fails after adding the rule:

**Check #1: Verify the Rule Exists**
- Go back to Security Group → Inbound rules
- Confirm you see: Type=PostgreSQL, Port=5432, Source=136.118.16.81/32

**Check #2: Verify Correct Security Group**
- Your RDS instance might have **multiple** security groups
- Check **all** security groups listed in RDS Connectivity section
- Add the rule to **each** security group

**Check #3: Check RDS is Publicly Accessible**
- In RDS → ccx-monitor → Connectivity & security
- "Publicly accessible" should be **Yes**
- If it's "No", you need to modify the instance:
  - Click "Modify"
  - Under "Connectivity", set "Public access" to "Yes"
  - Click "Continue" → "Modify DB instance"

**Check #4: Try Allowing All IPs (Temporarily)**
- Change Source to: `0.0.0.0/0` (Anywhere)
- This is less secure but helps test if it's a security group issue
- If this works, the issue was the IP address
- You can then change it back to `136.118.16.81/32`

---

## Next Steps for Server Deployment

Once the RDS connection is working, we'll follow these steps to deploy on your own server:

1. **Export code from Replit**
   - Download as ZIP or push to Git repository

2. **Prepare your server**
   - Ubuntu 20.04+ or Amazon Linux 2
   - Install Node.js 20
   - Install dependencies

3. **Configure environment**
   - Set DATABASE_URL
   - Set SESSION_SECRET and API_KEY
   - Configure SMTP (optional)

4. **Set up service**
   - Systemd service for 24/7 running
   - Nginx reverse proxy
   - SSL certificate (Let's Encrypt)

5. **Initialize database**
   - Run `npm run db:push` to create tables
   - Run `npm run create-admin` for admin user

6. **Go live**
   - Start application
   - Access via your domain
   - Monitor logs

---

## Reference: Complete Deployment Guide

See `SELF_HOSTED_DEPLOYMENT.md` for:
- Complete server setup instructions
- AWS EC2 deployment
- Docker deployment
- PM2 process manager
- Nginx configuration
- SSL setup
- Security checklist

---

**Current Blocker:** AWS Security Group needs to allow IP `136.118.16.81/32` on port 5432.

**Once Fixed:** Everything else is ready to go!
