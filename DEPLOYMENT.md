# E4A - Deployment Guide

## Deploy to Render (Free)

### Step 1: Push to GitHub
```bash
cd c:\Users\The_Tri_In_Unity\Documents\E4A_2
git init
git add .
git commit -m "Initial E4A marketplace commit"
git remote add origin https://github.com/YOUR_USERNAME/e4a.git
git branch -M main
git push -u origin main
```

### Step 2: Connect Render
1. Go to https://render.com
2. Sign up (free)
3. Click "New Web Service"
4. Connect your GitHub repository
5. Configure:
   - **Name**: e4a
   - **Environment**: Node
   - **Build Command**: `npm install`
   - **Start Command**: `node server.js`
   - **Plan**: Free

### Step 3: Add Environment Variables
In Render Dashboard → Environment:
```
NODE_ENV=production
MAIL_HOST=smtp.gmail.com
MAIL_PORT=587
MAIL_USER=your-email@gmail.com
MAIL_PASS=your-app-password
```

### Step 4: Deploy
Click "Deploy" and Render will automatically build and deploy your app!

---

## Alternative: Deploy to Railway

### Step 1-2: Same GitHub steps above

### Step 3: Connect Railway
1. Go to https://railway.app
2. Sign up (free $5/month credit)
3. Create new project
4. Connect GitHub repository
5. Set environment variables in Railway dashboard
6. Deploy

---

## Default Admin Login (Both Platforms)
Email: `admin@e4a.com`
Password: `Admin123!`

---

## Email Setup for Production

### Using Gmail:
1. Enable 2-factor authentication on Gmail
2. Generate App Password: https://myaccount.google.com/apppasswords
3. Use app password in MAIL_PASS

### Using SendGrid (Recommended):
1. Sign up free: https://sendgrid.com
2. Get API key
3. Use in environment variables

---

## Database Notes
- Currently using SQLite (stores data as file)
- For production with multiple instances, consider:
  - PostgreSQL (free tier on Railway/Render)
  - MongoDB Atlas (free)
  - or stick with SQLite if low traffic

---

## Troubleshooting

**Site loads but auth doesn't work:**
- Check environment variables are set correctly
- Restart deployment

**Email not sending:**
- Verify MAIL_HOST, MAIL_USER, MAIL_PASS
- Check email provider firewall settings

**Database errors:**
- Ensure Render/Railway has write permissions
- SQLite needs persistent volume (Render supports this)
