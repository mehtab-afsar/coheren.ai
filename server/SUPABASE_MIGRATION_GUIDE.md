# 🚀 Supabase Migration Guide

This guide will help you migrate from local PostgreSQL to Supabase for the Coheren backend.

## Why Supabase?

- ✅ **Fully managed PostgreSQL** - No need to maintain your own database server
- ✅ **Built-in authentication** - Ready to add user auth when needed
- ✅ **Real-time subscriptions** - Listen to database changes in real-time
- ✅ **RESTful API** - Automatic API generation from your schema
- ✅ **Row Level Security** - Database-level security policies
- ✅ **Free tier** - Generous free tier for development and production
- ✅ **Global CDN** - Fast database access from anywhere

---

## Step 1: Create a Supabase Project

1. Go to [supabase.com](https://supabase.com)
2. Sign up or log in
3. Click **"New Project"**
4. Choose:
   - **Organization**: Create new or select existing
   - **Project name**: `coheren-app` (or any name you prefer)
   - **Database password**: Generate a strong password (save it!)
   - **Region**: Choose closest to you (e.g., `Mumbai` for India, `Singapore` for Asia)
5. Click **"Create new project"**
6. Wait 1-2 minutes for the project to be provisioned

---

## Step 2: Run the Database Schema

1. In your Supabase dashboard, click **"SQL Editor"** in the left sidebar
2. Click **"New query"**
3. Open the file `server/db/supabase-schema.sql` on your computer
4. Copy **all** the SQL content
5. Paste it into the Supabase SQL Editor
6. Click **"Run"** (or press `Ctrl/Cmd + Enter`)
7. You should see: `Success. No rows returned`

This creates all your tables:
- ✅ users
- ✅ journeys
- ✅ day_records
- ✅ tasks
- ✅ streak_records

Plus indexes, Row Level Security policies, and triggers!

---

## Step 3: Get Your API Credentials

1. In Supabase dashboard, go to **Settings** (gear icon in left sidebar)
2. Click **"API"**
3. You'll see two sections:

### Project URL
Copy this value (looks like: `https://xxxxxxxxxxxxx.supabase.co`)

### API Keys
You'll see two keys:
- **`anon` / `public`** - For client-side code (NOT needed for server)
- **`service_role`** - For server-side code with full access ✅

**⚠️ IMPORTANT: Copy the `service_role` key** (the longer one)

---

## Step 4: Update Your Environment Variables

1. Open `server/.env` file
2. Update these values:

```env
SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here
```

**Example:**
```env
SUPABASE_URL=https://abcdefghijklmnop.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFiY2RlZmdoaWprbG1ub3AiLCJyb2xlIjoic2VydmljZV9yb2xlIiwiaWF0IjoxNzM0MDAwMDAwLCJleHAiOjE4OTE3NzI4MDB9.XxXxXxXxXxXxXxXxXxXxXxXxXxXxXxXxXxXxXxX
```

---

## Step 5: Update Package.json Scripts

Open `server/package.json` and update the scripts:

```json
{
  "scripts": {
    "dev": "node --watch index-supabase.js",
    "start": "node index-supabase.js",
    "dev:old": "node --watch index.js",
    "start:old": "node index.js",
    "db:init": "node db/init.js"
  }
}
```

---

## Step 6: Start Your Server

```bash
cd server
npm run dev
```

You should see:
```
✅ Supabase connected successfully
🚀 Server running on http://localhost:3001
📊 API endpoints available at http://localhost:3001/api
☁️  Using Supabase database
```

---

## Step 7: Test the API

Open your browser or use curl:

### Health Check
```bash
curl http://localhost:3001/api/health
```

Expected response:
```json
{"status":"ok","database":"connected"}
```

### Create a User
```bash
curl -X POST http://localhost:3001/api/users/auto \
  -H "Content-Type: application/json" \
  -d '{"device_id":"test-device-123","name":"Test User"}'
```

Expected response:
```json
{
  "id": "uuid-here",
  "name": "Test User",
  "timezone": "Asia/Kolkata",
  "preferences": {"device_id": "test-device-123"},
  "created_at": "2025-01-24T...",
  "updated_at": "2025-01-24T..."
}
```

---

## Verify in Supabase Dashboard

1. Go to **"Table Editor"** in Supabase dashboard
2. Click **"users"** table
3. You should see your test user!

---

## 🎉 Migration Complete!

Your backend is now running on Supabase. All your API endpoints work the same way, but now with:
- 🔒 Better security (Row Level Security)
- 🌍 Global hosting
- 📊 Built-in monitoring and logs
- 🔄 Real-time capabilities (ready to use)
- 🚀 Auto-scaling

---

## Troubleshooting

### Error: "Missing Supabase environment variables"
- Make sure you've updated `.env` with correct values
- Restart your server after updating `.env`

### Error: "relation 'users' does not exist"
- You haven't run the schema SQL yet
- Go to Supabase SQL Editor and run `server/db/supabase-schema.sql`

### Error: "Invalid API key"
- Make sure you're using the `service_role` key, not the `anon` key
- Double-check there are no extra spaces in your `.env` file

### Server starts but health check fails
- Check your Supabase project is not paused (free tier pauses after inactivity)
- Verify your API URL is correct (no trailing slash)

---

## Row Level Security (RLS)

The schema includes RLS policies that allow:
- ✅ Anyone can create users (for device-based registration)
- ✅ Users can read/write their own data
- ✅ Service role (your server) bypasses all RLS

You can view/edit policies in:
**Supabase Dashboard → Authentication → Policies**

---

## Database Browser

Explore your data in Supabase:
1. Go to **"Table Editor"**
2. Click any table to view/edit data
3. Use **"Insert row"** to manually add test data
4. Use **"Filters"** to search records

---

## Monitoring & Logs

Check database usage and logs:
1. **Database** → See connection usage, size
2. **Logs** → See all database queries in real-time
3. **API** → See API request logs

---

## Need Help?

- 📖 [Supabase Docs](https://supabase.com/docs)
- 💬 [Supabase Discord](https://discord.supabase.com)
- 🐛 [Report Issues](https://github.com/supabase/supabase/issues)

---

## Next Steps

1. **Add Authentication** - Use Supabase Auth for user login
2. **Enable Real-time** - Subscribe to database changes
3. **Add Storage** - Upload user avatars with Supabase Storage
4. **Deploy** - Deploy your server to Vercel, Railway, or Render
5. **Use Supabase Edge Functions** - Serverless functions for backend logic

---

Enjoy your new Supabase-powered backend! 🚀
