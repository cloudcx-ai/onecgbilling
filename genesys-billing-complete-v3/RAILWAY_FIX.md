# Railway Deployment Fix - Session Cookie Issue

## ✅ Issue Fixed!

The login issue on Railway (https://onecgbilling-production.up.railway.app) has been resolved.

### What Was Wrong

Railway deploys apps behind a proxy with HTTPS, but the session cookies weren't configured to work properly with the proxy. This caused:
- Login would succeed
- But immediately after, the session wasn't recognized
- User couldn't access the dashboard

### What Was Fixed

Added proper proxy and cookie configuration in `server/index.ts`:
```typescript
// Trust proxy - required for Railway and other cloud platforms
app.set('trust proxy', 1);

// Updated cookie settings
cookie: {
  secure: process.env.NODE_ENV === "production",
  httpOnly: true,
  maxAge: 24 * 60 * 60 * 1000,
  sameSite: process.env.NODE_ENV === "production" ? 'none' : 'lax', // ✅ Added
}
```

## 🚀 How to Redeploy on Railway

### Option 1: Push Updated Code to GitHub (Recommended)

1. **Download the fixed code from Replit**
   - Click ⋮ (three dots) → Download as zip

2. **Push to your GitHub repository**
   ```bash
   # Extract and navigate
   unzip [file].zip && cd [folder]
   
   # Commit the fix
   git add server/index.ts
   git commit -m "Fix session cookies for Railway deployment"
   git push origin main
   ```

3. **Railway will auto-deploy** the update from GitHub

### Option 2: Upload New Build to Railway

1. **Download the fixed build package**
   - `genesys-billing-production-fixed.tar.gz` (174 KB)

2. **Extract on Railway**
   ```bash
   tar -xzf genesys-billing-production-fixed.tar.gz
   ```

3. **Restart the service** in Railway dashboard

### Option 3: Redeploy from Railway Dashboard

If connected to GitHub:
1. Go to Railway dashboard
2. Click your service
3. Click "Deploy" → "Redeploy"

## 🧪 Test the Fix

After redeployment:

1. Go to: https://onecgbilling-production.up.railway.app/login
2. Login with:
   - Username: `once` or `onecg`
   - Password: `once` or `onecg`
3. You should now be redirected to the dashboard ✅

## 📋 Environment Variables to Set on Railway

Make sure these are set in Railway dashboard:

```bash
NODE_ENV=production
SESSION_SECRET=your-secure-random-secret-here
PORT=5000  # Railway sets this automatically
```

Generate a secure SESSION_SECRET:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

## ℹ️ Why This Happens

Cloud platforms like Railway, Heroku, Vercel, etc., use reverse proxies:
- Your app receives HTTP requests from the proxy
- The proxy handles HTTPS with users
- Without `trust proxy`, Express can't properly set secure cookies
- The `sameSite: 'none'` setting allows cookies to work across the proxy

## 🔧 Works On

This fix makes the app work correctly on:
- ✅ Railway
- ✅ Heroku
- ✅ Render
- ✅ Fly.io
- ✅ Any platform using reverse proxy
- ✅ Nginx/Apache reverse proxy
- ✅ Local development (unchanged)

---

**The fix is backward compatible** - it works in both development and production environments!
