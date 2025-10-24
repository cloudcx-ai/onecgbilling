# Quick Guide: Push to GitHub

## Step-by-Step Instructions for https://github.com/cloudcx-ai/onecgbilling

### 1. Download from Replit
- Click the **three dots (⋮)** in the file panel (left sidebar)
- Select **"Download as zip"**
- Save the file to your computer

### 2. Extract and Prepare
```bash
# Extract the downloaded file
unzip [filename].zip

# Navigate to the folder
cd [folder-name]
```

### 3. Initialize Git (if needed)
```bash
git init
```

### 4. Add Remote Repository
```bash
git remote add origin https://github.com/cloudcx-ai/onecgbilling.git
```

### 5. Stage All Files
```bash
git add .
```

### 6. Commit
```bash
git commit -m "Initial commit: OneCG Genesys Billing Report application

- Complete web application for Genesys Cloud billing reports
- Multi-client management with session authentication
- Real-time data from Genesys Cloud API
- Professional UI with React, TypeScript, and Tailwind CSS
- Comprehensive deployment documentation"
```

### 7. Push to GitHub
```bash
# If main branch
git push -u origin main

# Or if master branch
git push -u origin master
```

### GitHub Authentication

If prompted for credentials:
- **Username**: Your GitHub username  
- **Password**: Use a Personal Access Token (PAT)
  - Create at: https://github.com/settings/tokens
  - Click "Generate new token (classic)"
  - Select scopes: `repo` (full control)
  - Copy the token and use it as your password

### That's It! 🎉

Your repository will be live at:
**https://github.com/cloudcx-ai/onecgbilling**

With:
- ✅ Complete source code
- ✅ Professional README.md
- ✅ MIT License
- ✅ Deployment guide
- ✅ Proper .gitignore
