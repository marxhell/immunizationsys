# 🚀 DEPLOYMENT GUIDE: Render (Backend) + Netlify (Frontend)

## 📋 TABLE OF CONTENTS
1. Backend Deployment on Render
2. Frontend Deployment on Netlify
3. Environment Configuration
4. Post-Deployment Verification

---

## 🔧 PART 1: BACKEND DEPLOYMENT ON RENDER

### Step 1: Push Updated Code to GitHub
```bash
cd child-immunization-system
git add .
git commit -m "Deployment: Update CORS and environment configuration for Render"
git push origin main
```

### Step 2: Create Render Account & Service
1. Go to **https://render.com**
2. Sign up with GitHub account
3. Click **"New +"** → Select **"Web Service"**
4. Connect your GitHub repository (marxhell/immunizationsys)
5. Select **main** branch
6. Fill in service details:

   | Field | Value |
   |-------|-------|
   | Name | `child-immunization-api` |
   | Environment | `Node` |
   | Region | Choose closest to you |
   | Branch | `main` |
   | Build Command | `cd backend && npm install` |
   | Start Command | `cd backend && npm start` |

### Step 3: Set Environment Variables on Render
In Render dashboard → Your Service → Environment:

```
MONGODB_URI=mongodb+srv://Vaccinationadmin:NFiO7Z7WdiwXR3qT@child-vacc-system.j7gcjci.mongodb.net/?appName=child-vacc-system
MONGO_DB_NAME=child-immunization-system
NODE_ENV=production
PORT=5000
JWT_SECRET=use-a-strong-32-character-secret-key-here-12345
JWT_EXPIRE=7d
EMAIL_USER=ogarishelton@gmail.com
EMAIL_PASS=atbm skpm sjgo jfle
EMAIL_FROM=Child Vaccination System
FRONTEND_URL=https://district-vaccination-sys.netlify.app
```

### Step 4: Verify Backend Script
Check [backend/package.json](../backend/package.json):

```json
{
  "scripts": {
    "dev": "node server.js",
    "start": "node server.js"
  }
}
```

### Step 5: Deploy
- Render auto-deploys on git push to main
- Wait 2-3 minutes for deployment
- Your backend will be at: `https://child-immunization-api.onrender.com`
- Test with: `https://child-immunization-api.onrender.com/health`

---

## 🎨 PART 2: FRONTEND DEPLOYMENT ON NETLIFY

### Step 1: Build Frontend for Production
Create a **build configuration file**:

```bash
cd frontend
npm install  # If needed
```

### Step 2: Create netlify.toml in Project Root
Create file: `child-immunization-system/netlify.toml`

```toml
[build]
  command = "echo 'Frontend is static HTML/JS'"
  publish = "frontend"

[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200

[context.production.environment]
  BACKEND_URL = "https://child-immunization-api.onrender.com/api"
```

### Step 3: Prepare Frontend Folder for Deployment
Create a simple build script or just deploy the frontend folder directly.

### Step 4: Connect Netlify to GitHub
1. Go to **https://netlify.com**
2. Sign up with GitHub
3. Click **"Add new site"** → **"Import an existing project"**
4. Select your GitHub repo: **marxhell/immunizationsys**
5. Configure:

   | Field | Value |
   |-------|-------|
   | Branch | `main` |
   | Build command | Leave empty (static site) |
   | Publish directory | `frontend` |

### Step 5: Set Environment Variables on Netlify
Dashboard → Site settings → Build & deploy → Environment:

```
REACT_APP_BACKEND_URL=https://child-immunization-api.onrender.com/api
```

### Step 6: Deploy
- Netlify auto-deploys on git push
- Your frontend will be at: `https://district-vaccination-sys.netlify.app` (or custom domain)

---

## 📝 ENVIRONMENT CONFIGURATION SUMMARY

### Backend (Render)
```
Production Endpoint: https://child-immunization-api.onrender.com
Health Check: https://child-immunization-api.onrender.com/health
Database: MongoDB Atlas (existing connection)
```

### Frontend (Netlify)
```
Production URL: https://district-vaccination-sys.netlify.app
API Endpoint: https://child-immunization-api.onrender.com/api
```

---

## ✅ POST-DEPLOYMENT VERIFICATION

### 1. Test Backend Health
```bash
curl https://child-immunization-api.onrender.com/health
```
Expected response:
```json
{"success":true,"message":"Server is healthy","timestamp":"2026-07-06..."}
```

### 2. Test Frontend Load
Visit: `https://district-vaccination-sys.netlify.app`
- Should redirect to login page
- Check browser console for any API errors

### 3. Test Login
- Email: `admin@childvacc.org`
- Password: `Admin@12345`
- Should redirect to dashboard

### 4. Verify API Connectivity
In browser console on frontend:
```javascript
fetch('https://child-immunization-api.onrender.com/health')
  .then(r => r.json())
  .then(d => console.log(d))
```

---

## 🔒 SECURITY NOTES

### Before Production:
1. ✅ Change `JWT_SECRET` to a secure random string (32+ chars)
   ```bash
   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
   ```

2. ✅ Use production email credentials
   - Generate Gmail App Password: https://myaccount.google.com/apppasswords
   - Update EMAIL_USER and EMAIL_PASS

3. ✅ Update database user password
   - Ensure MongoDB Atlas access is restricted

4. ✅ Add custom domain to Netlify (optional)
   - Go to Netlify settings → Domain management

---

## 🐛 TROUBLESHOOTING

### Backend won't deploy on Render
- Check build logs: Render Dashboard → Logs
- Verify `backend/package.json` has `"start"` script
- Check MongoDB connection string

### Frontend shows "Cannot reach backend"
- Verify Render backend is running: Check `https://child-immunization-api.onrender.com/health`
- Check browser Network tab for CORS errors
- Ensure FRONTEND_URL is set correctly in Render environment

### CORS Errors
- Error: `Access to XMLHttpRequest blocked by CORS policy`
- Solution: Verify Netlify URL is in backend CORS allowedOrigins
- Update FRONTEND_URL in Render environment variables

### Login fails
- Check MongoDB connection
- Verify admin user exists: Run `node backend/test-api.js` locally
- Check JWT_SECRET is set correctly

---

## 📞 QUICK REFERENCE

| Service | Link | Purpose |
|---------|------|---------|
| Render | https://render.com | Backend hosting |
| Netlify | https://netlify.com | Frontend hosting |
| GitHub | https://github.com/marxhell/immunizationsys | Source code |
| MongoDB Atlas | https://www.mongodb.com/cloud/atlas | Database |

---

## 🔄 CONTINUOUS DEPLOYMENT

Both Render and Netlify automatically deploy when you push to the `main` branch on GitHub:

```bash
# Make changes locally
git add .
git commit -m "Your message"
git push origin main

# Both services redeploy automatically!
```

---

**Deployment Complete! Your app is now live! 🎉**
