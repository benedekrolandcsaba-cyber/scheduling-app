# ⚡ Quick Setup Guide

## 🚀 5-Minute Neon Database Setup

### Step 1: Create Neon Database (2 minutes)
1. **Go to**: https://neon.tech
2. **Sign up** with GitHub (fastest)
3. **Create Project**: Name it `scheduling-engine`
4. **Copy Connection String** from dashboard

### Step 2: Setup Tables (1 minute)
1. In Neon dashboard, click **"SQL Editor"**
2. **Copy & paste** the entire `setup-neon-db.sql` file
3. Click **"Run"** - should see "Success" messages
4. **Verify**: Run `SELECT table_name FROM information_schema.tables WHERE table_schema = 'public';`

### Step 3: Test Connection (1 minute)
```bash
# Create .env file with your connection string
echo "DATABASE_URL=your_neon_connection_string_here" > .env

# Install dependencies
npm install

# Test connection
npm run test:db
```

### Step 4: Deploy to Vercel (1 minute)
1. **Go to**: https://vercel.com
2. **Import** GitHub repo: `benedekrolandcsaba-cyber/scheduling-app`
3. **Add Environment Variable**: `DATABASE_URL` = your connection string
4. **Deploy** - wait 2 minutes

## ✅ Success Indicators

- ✅ Neon SQL Editor shows 6 tables created
- ✅ `npm run test:db` shows all green checkmarks
- ✅ Vercel app shows "🟢 Connected to Neon Database"
- ✅ Can load demo data and generate schedules

## 🆘 Quick Troubleshooting

**Problem**: Connection fails
**Solution**: Double-check DATABASE_URL format and credentials

**Problem**: Tables don't exist  
**Solution**: Re-run setup-neon-db.sql in Neon SQL Editor

**Problem**: Vercel shows offline mode
**Solution**: Add DATABASE_URL to Vercel environment variables

---

**Total Time**: ~5 minutes to full production deployment! 🎉