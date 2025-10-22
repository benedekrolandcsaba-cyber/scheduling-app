# 🚀 Deployment Guide - Professional CSP Scheduling Engine

## Step-by-Step Neon Database & Vercel Deployment

### 📋 Prerequisites
- GitHub account with repository: `benedekrolandcsaba-cyber/scheduling-app`
- Vercel account (free tier is sufficient)
- Neon account (free tier is sufficient)

---

## 🗄️ Step 1: Setup Neon Database

### 1.1 Create Neon Account
1. Go to **https://neon.tech**
2. Click **"Sign Up"** 
3. Sign up with GitHub (recommended) or email
4. Verify your email if needed

### 1.2 Create New Project
1. Click **"Create Project"**
2. **Project Name**: `scheduling-engine`
3. **Database Name**: `scheduler` (or keep default)
4. **Region**: Choose closest to your users (e.g., US East, EU West)
5. Click **"Create Project"**

### 1.3 Get Connection String
1. In your Neon dashboard, go to **"Connection Details"**
2. Copy the **Connection String** (it looks like):
   ```
   postgresql://username:password@ep-cool-darkness-123456.us-east-1.aws.neon.tech/neondb?sslmode=require
   ```
3. **Save this securely** - you'll need it for Vercel

### 1.4 Create Database Tables
**Option A: Using Neon SQL Editor (Recommended)**
1. In Neon dashboard, click **"SQL Editor"**
2. Copy the entire content from `setup-neon-db.sql`
3. Paste it into the SQL Editor
4. Click **"Run"**
5. Verify all tables were created successfully

**Option B: Using psql (Advanced)**
```bash
psql "postgresql://username:password@hostname/database?sslmode=require" -f setup-neon-db.sql
```

### 1.5 Verify Database Setup
Run this query in Neon SQL Editor:
```sql
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;
```

You should see:
- `appointments`
- `group_constraints`
- `groups`
- `individual_constraints`
- `settings`
- `weekly_schedule_settings`

---

## 🌐 Step 2: Deploy to Vercel

### 2.1 Connect GitHub Repository
1. Go to **https://vercel.com**
2. Sign up/Login with GitHub
3. Click **"New Project"**
4. Import `benedekrolandcsaba-cyber/scheduling-app`
5. Click **"Import"**

### 2.2 Configure Project Settings
- **Project Name**: `scheduling-engine` (or your preference)
- **Framework Preset**: `Other` (it's a static site with API)
- **Root Directory**: `./` (default)
- **Build Command**: Leave empty
- **Output Directory**: Leave empty
- **Install Command**: `npm install`

### 2.3 Add Environment Variables
**CRITICAL STEP**: Before deploying, add your database URL:

1. In Vercel project settings, go to **"Environment Variables"**
2. Add new variable:
   - **Name**: `DATABASE_URL`
   - **Value**: Your Neon connection string (from Step 1.3)
   - **Environments**: Production, Preview, Development (check all)
3. Click **"Save"**

### 2.4 Deploy
1. Click **"Deploy"**
2. Wait 2-3 minutes for deployment
3. You'll get a URL like: `https://scheduling-engine-xyz.vercel.app`

---

## ✅ Step 3: Test Your Deployment

### 3.1 Test Main Application
1. Open your Vercel URL
2. You should see: **"🟢 Connected to Neon Database"** (green status)
3. Try loading demo data: Click **"Load Demo Data"**
4. Generate a schedule: Click **"Generate Plan"**

### 3.2 Test API Endpoints
```bash
# Test groups endpoint
curl https://your-app.vercel.app/api/groups

# Test settings endpoint  
curl https://your-app.vercel.app/api/settings

# Should return JSON data without errors
```

### 3.3 Test Database Connection
1. In the app, try adding a group constraint
2. Refresh the page - settings should persist
3. Check Neon dashboard - you should see data in tables

---

## 🔧 Step 4: Configuration & Customization

### 4.1 Update Default Settings
In the app interface:
1. **Global Settings**: Set your preferred start date, rooms, horizon
2. **Group Parameters**: Adjust counts, durations, frequencies
3. **Constraints**: Add any hard rules for groups
4. **Individual Availability**: Set personal schedules

### 4.2 Monitor Performance
- **Neon Dashboard**: Monitor database usage, queries
- **Vercel Dashboard**: Check function execution times, errors
- **Browser Console**: Watch for any JavaScript errors

---

## 🚨 Troubleshooting

### Database Connection Issues
**Symptom**: Yellow status "🟡 Offline Mode"
**Solutions**:
1. Check `DATABASE_URL` in Vercel environment variables
2. Verify Neon database is active (not paused)
3. Test connection string manually
4. Check Vercel function logs

### API Errors
**Symptom**: Red errors in browser console
**Solutions**:
1. Check Vercel function logs
2. Verify all tables exist in Neon
3. Test API endpoints individually
4. Check CORS settings

### Performance Issues
**Symptom**: Slow scheduling generation
**Solutions**:
1. Reduce horizon weeks (try 3-4 instead of 5+)
2. Simplify constraints
3. Check Neon database performance metrics
4. Consider upgrading Neon plan for better performance

---

## 📊 Production Checklist

- [ ] ✅ Neon database created and tables initialized
- [ ] ✅ Vercel project deployed successfully  
- [ ] ✅ Environment variables configured
- [ ] ✅ Database connection working (green status)
- [ ] ✅ API endpoints responding correctly
- [ ] ✅ Scheduling algorithm working
- [ ] ✅ Data persistence verified
- [ ] ✅ Demo data loads successfully
- [ ] ✅ No console errors
- [ ] ✅ Mobile responsive design working

---

## 🎯 Success Metrics

Your deployment is successful when:
1. **Connection Status**: 🟢 Green "Connected to Neon Database"
2. **API Response**: All endpoints return JSON (not errors)
3. **Data Persistence**: Settings save and reload correctly
4. **Scheduling Works**: Can generate and view schedules
5. **Performance**: Schedule generation completes in <5 seconds

---

## 🔄 Ongoing Maintenance

### Regular Tasks
- **Monitor Neon Usage**: Check free tier limits
- **Update Dependencies**: Keep packages current
- **Backup Data**: Export important schedules
- **Performance Monitoring**: Watch Vercel analytics

### Scaling Considerations
- **Neon Pro**: For higher usage, better performance
- **Vercel Pro**: For team features, better analytics
- **Custom Domain**: Add your own domain in Vercel
- **CDN Optimization**: Vercel handles this automatically

---

## 🆘 Support Resources

- **Neon Documentation**: https://neon.tech/docs
- **Vercel Documentation**: https://vercel.com/docs
- **GitHub Repository**: https://github.com/benedekrolandcsaba-cyber/scheduling-app
- **Issues**: Report bugs via GitHub Issues

---

**🎉 Congratulations! Your Professional CSP Scheduling Engine is now live and ready for production use!**