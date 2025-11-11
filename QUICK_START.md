# Quick Start - External Deployment

## 📦 You've Downloaded: `genesys-billing-deploy-complete.tar.gz` (243 KB)

This package contains everything you need to deploy the OneCG Genesys Billing Report application to any platform.

---

## 🚀 Option 1: Deploy to Railway (Easiest - 5 minutes)

### Step 1: Extract and Push to GitHub
```bash
# Extract the package
tar -xzf genesys-billing-deploy-complete.tar.gz
cd genesys-billing-deploy-complete

# Initialize git and push to GitHub
git init
git add .
git commit -m "OneCG Genesys Billing Report"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO.git
git push -u origin main
```

### Step 2: Deploy on Railway
1. Go to [railway.app](https://railway.app) and sign in
2. Click "New Project" → "Deploy from GitHub repo"
3. Select your repository
4. Railway will automatically detect and deploy your app
5. Add environment variable in Railway dashboard:
   - `SESSION_SECRET` = (click "Generate" or use your own random string)

### Step 3: Access Your App
- Railway will give you a URL like `your-app.railway.app`
- Login with: **once/once** or **onecg/onecg**
- Done! 🎉

---

## 🖥️ Option 2: Deploy to Your Own Server

### Step 1: Extract on Your Server
```bash
# Upload the tar.gz file to your server, then:
tar -xzf genesys-billing-deploy-complete.tar.gz
cd genesys-billing-deploy-complete
```

### Step 2: Run the Deployment Script
```bash
# The script will install dependencies and start the app
./deploy.sh
```

### Step 3: Access Your App
- Open browser: `http://your-server-ip:5000`
- Login with: **once/once** or **onecg/onecg**

**For production**, use PM2 to keep it running:
```bash
npm install -g pm2
pm2 start dist/index.js --name genesys-billing
pm2 save
pm2 startup
```

---

## 🔧 Option 3: Deploy to Render

### Step 1: Push to GitHub (same as Railway above)

### Step 2: Deploy on Render
1. Go to [render.com](https://render.com) and sign in
2. Click "New" → "Web Service"
3. Connect your GitHub repository
4. Configure:
   - **Build Command**: `npm install --production`
   - **Start Command**: `node dist/index.js`
5. Add environment variable:
   - `SESSION_SECRET` = (generate a random string)

### Step 3: Access Your App
- Render will give you a URL like `your-app.onrender.com`
- Login with: **once/once** or **onecg/onecg**

---

## 📋 What's Included

```
✅ dist/              # Production build (ready to run)
✅ package.json       # Dependencies list
✅ deploy.sh         # Auto-deployment script
✅ EXTERNAL_DEPLOYMENT.md  # Detailed deployment guide
✅ README.md         # Project documentation
```

---

## 🔑 Environment Variables

Only one required:

| Variable | Required | Description | Example |
|----------|----------|-------------|---------|
| `SESSION_SECRET` | ✅ Yes | Session encryption key | `your-random-secret-here` |
| `PORT` | ❌ No | Port to run on | `5000` (default) |
| `NODE_ENV` | ❌ No | Environment | `production` |

**Generate a secure SESSION_SECRET:**
```bash
openssl rand -base64 32
```

---

## 📝 After Deployment

1. **Login** with `once`/`once` or `onecg`/`onecg`
2. **Add Clients**: Click "Add Client" and enter:
   - Client name (e.g., "My Company")
   - Genesys Cloud authorization token
3. **Generate Reports**:
   - Select a client from the sidebar
   - Choose billing period dates
   - Click "Download Usage Report"
   - Explore 6 tabs: Users, Apps, Devices, Resources, Messaging, Storage

---

## ❓ Troubleshooting

**Can't login?**
- Check that `SESSION_SECRET` is set
- For cloud platforms, sessions are handled automatically

**Port already in use?**
- Set `PORT` environment variable to a different port
- Or find and stop the process using port 5000

**Need help?**
- See `EXTERNAL_DEPLOYMENT.md` for detailed documentation
- Check your platform's logs (Railway/Render dashboard, or `pm2 logs`)

---

## 🎯 Next Steps

1. **Test the deployment** - Make sure you can login
2. **Add your Genesys clients** - Use real authorization tokens
3. **Secure for production**:
   - Use HTTPS (automatic on Railway/Render)
   - Keep your SESSION_SECRET safe
   - Consider replacing hardcoded auth with proper user management

---

**Need more help?** Check `EXTERNAL_DEPLOYMENT.md` for comprehensive deployment instructions.

**Ready for production?** Your app is now accessible from anywhere! 🚀
