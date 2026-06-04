# E4A Quick Deployment Guide

Git is not installed on your system. No problem! Here's the easiest way to deploy:

## Option 1: Deploy with Render (Recommended - Easiest)

### Step 1: Create a GitHub Account (Free)
1. Go to https://github.com/signup
2. Sign up with email
3. Verify your email

### Step 2: Install Git on Your Computer
1. Download from: https://git-scm.com/download/win
2. Run the installer (use default settings)
3. Restart your terminal/PowerShell

### Step 3: Upload Your Code to GitHub
```powershell
cd c:\Users\The_Tri_In_Unity\Documents\E4A_2
git config --global user.name "Your Name"
git config --global user.email "your-email@gmail.com"
git init
git add .
git commit -m "Initial E4A marketplace"
git remote add origin https://github.com/YOUR_USERNAME/e4a.git
git branch -M main
git push -u origin main
```
(Replace YOUR_USERNAME with your GitHub username)

### Step 4: Deploy to Render
1. Go to https://render.com
2. Sign up (use GitHub to sign up for easier connection)
3. Click "New Web Service"
4. Select "Deploy an existing Git repository"
5. Connect your GitHub account and select the `e4a` repository
6. Fill in:
   - **Name**: e4a (or any name)
   - **Environment**: Node
   - **Build Command**: `npm install`
   - **Start Command**: `node server.js`
   - **Plan**: Free
7. Click "Deploy"

### Step 5: Add Environment Variables (Important!)
1. In Render dashboard, go to your service
2. Click "Environment"
3. Add these variables:
```
NODE_ENV=production
MAIL_HOST=smtp.gmail.com
MAIL_PORT=587
MAIL_USER=your-email@gmail.com
MAIL_PASS=your-app-password
```

For Gmail app password:
- Go to https://myaccount.google.com/apppasswords
- Generate one for your app
- Use it as MAIL_PASS

### Step 6: Done!
Render will give you a URL like: `https://e4a-xxxxx.onrender.com`

---

## Option 2: Deploy Manually (Without GitHub)

If you don't want to use GitHub, try:
- **Railway.app** - Easier UI, supports direct uploads
- **Glitch.com** - Drag-and-drop code
- **Heroku** (Paid, but has free tier alternatives now)

---

## Default Credentials
After deployment:
- Email: `admin@e4a.com`
- Password: `Admin123!`

---

## Need Help?

1. **Contact Render Support**: help@render.com
2. **Email Issues**: Check your MAIL_USER and MAIL_PASS
3. **Database Issues**: Render supports SQLite out of the box

Your app will be LIVE and accessible worldwide! 🚀
