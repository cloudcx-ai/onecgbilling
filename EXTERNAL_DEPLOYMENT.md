# External Deployment Guide

## Overview
This guide helps you deploy the OneCG Genesys Billing Report application to external platforms like Railway, Render, Heroku, or your own server.

## What's Included
- `dist/` - Production build (frontend + backend)
- `package.json` - Dependencies
- `node_modules/` - All required packages (or install with `npm install`)

## Quick Start

### Option 1: Deploy to Railway (Recommended)

1. **Push to GitHub**
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git remote add origin YOUR_GITHUB_REPO_URL
   git push -u origin main
   ```

2. **Deploy on Railway**
   - Go to [railway.app](https://railway.app)
   - Click "New Project" → "Deploy from GitHub repo"
   - Select your repository
   - Railway will auto-detect the project and deploy

3. **Environment Variables**
   Set in Railway dashboard:
   ```
   SESSION_SECRET=your-random-secret-key-here
   NODE_ENV=production
   PORT=5000
   ```

4. **Done!** Your app will be live at `your-app.railway.app`

### Option 2: Deploy to Render

1. **Push to GitHub** (same as above)

2. **Create Web Service on Render**
   - Go to [render.com](https://render.com)
   - Click "New" → "Web Service"
   - Connect your GitHub repo
   - Configure:
     - **Build Command**: `npm install && npm run build`
     - **Start Command**: `npm start`
     - **Environment**: Node

3. **Environment Variables**
   ```
   SESSION_SECRET=your-random-secret-key-here
   NODE_ENV=production
   ```

### Option 3: Deploy to Your Own Server

1. **Copy files to server**
   ```bash
   scp -r dist package.json package-lock.json user@your-server:/path/to/app
   ```

2. **On the server**
   ```bash
   cd /path/to/app
   npm install --production
   ```

3. **Set environment variables**
   ```bash
   export SESSION_SECRET="your-random-secret-key"
   export NODE_ENV="production"
   export PORT=5000
   ```

4. **Run with PM2 (recommended)**
   ```bash
   npm install -g pm2
   pm2 start dist/index.js --name genesys-billing
   pm2 save
   pm2 startup
   ```

5. **Or run directly**
   ```bash
   node dist/index.js
   ```

## Environment Variables

### Required
- `SESSION_SECRET` - Secret key for session encryption (generate with `openssl rand -base64 32`)

### Optional
- `NODE_ENV` - Set to "production" for production deployment
- `PORT` - Port to run on (default: 5000)

## Post-Deployment

### 1. Test Login
- Navigate to `https://your-app-url.com/login`
- Login with: `once`/`once` or `onecg`/`onecg`

### 2. Add Genesys Clients
- Click "Add Client" in the sidebar
- Enter client name and Genesys Cloud authorization token
- Tokens are stored securely and never exposed to the frontend

### 3. Generate Reports
- Select a client from the sidebar
- Choose billing period dates
- Click "Download Usage Report"
- Explore the 6 tabs: Users, Apps, Devices, Resources, Messaging, Storage

## Troubleshooting

### Session/Login Issues
If users can't login or sessions don't persist:

1. Ensure `SESSION_SECRET` is set
2. For Railway/cloud platforms, verify:
   ```javascript
   app.set('trust proxy', 1);
   cookie: { sameSite: 'lax' }
   ```

### Port Issues
Some platforms (like Heroku) assign ports dynamically:
```javascript
const PORT = process.env.PORT || 5000;
```

### Build Errors
If deployment fails during build:
```bash
npm install
npm run build
```

## Security Notes

1. **Change Default Credentials** - For production, replace hardcoded auth with proper user management
2. **HTTPS Required** - Always use HTTPS in production (Railway/Render provide this automatically)
3. **Rotate Secrets** - Generate a strong `SESSION_SECRET` for production
4. **Client Tokens** - Keep Genesys authorization tokens secure

## Support

For issues with:
- **This application**: Check server logs and browser console
- **Railway deployment**: [Railway docs](https://docs.railway.app)
- **Render deployment**: [Render docs](https://render.com/docs)
- **Genesys API**: [Genesys Cloud docs](https://developer.genesys.cloud)

## File Structure
```
dist/
├── index.js           # Backend server
└── public/
    ├── index.html     # Frontend entry
    └── assets/        # JS, CSS, images

package.json           # Dependencies and scripts
```

## npm Scripts
- `npm start` - Run production server (serves from dist/)
- `npm run dev` - Development mode (for local testing)
- `npm run build` - Build for production

---

Need help? Check the logs:
- **Railway**: View logs in the Railway dashboard
- **Render**: View logs in the Render dashboard  
- **Own Server**: `pm2 logs` or check your process manager logs
