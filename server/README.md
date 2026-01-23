# Coheren Server - Supabase Backend

Backend API server for Coheren, now powered by **Supabase** (managed PostgreSQL).

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ installed
- A Supabase account ([sign up free](https://supabase.com))

### 1. Install Dependencies
```bash
npm install
```

### 2. Set Up Supabase

#### Create a Supabase Project
1. Go to [supabase.com/dashboard](https://supabase.com/dashboard)
2. Create a new project
3. Wait for provisioning (1-2 minutes)

#### Run the Database Schema
1. In Supabase dashboard, go to **SQL Editor**
2. Open `db/supabase-schema.sql` from this repo
3. Copy all the SQL and paste it into the editor
4. Click **"Run"**

#### Get Your API Keys
1. Go to **Settings → API** in Supabase dashboard
2. Copy:
   - **Project URL** (e.g., `https://xxxxx.supabase.co`)
   - **`service_role` key** (the longer secret key)

### 3. Configure Environment Variables

Update `.env` file:
```env
SUPABASE_URL=your-project-url.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here
PORT=3001
```

### 4. Start the Server
```bash
npm run dev
```

You should see:
```
✅ Supabase connected successfully
🚀 Server running on http://localhost:3001
☁️  Using Supabase database
```

### 5. Test It
```bash
curl http://localhost:3001/api/health
```

Expected: `{"status":"ok","database":"connected"}`

---

## 📖 Full Migration Guide

For detailed setup instructions, see:
👉 **[SUPABASE_MIGRATION_GUIDE.md](./SUPABASE_MIGRATION_GUIDE.md)**

---

## 📁 Project Structure

```
server/
├── index-supabase.js         # Main server (Supabase)
├── index.js                   # Legacy server (PostgreSQL)
├── db/
│   ├── supabase.js           # Supabase client config
│   ├── supabase-schema.sql   # Database schema (run in Supabase)
│   ├── pool.js               # Legacy PostgreSQL pool
│   └── init.js               # Legacy PostgreSQL init
├── package.json
├── .env                       # Environment variables
├── README.md                  # This file
└── SUPABASE_MIGRATION_GUIDE.md
```

---

## 🛠 Available Scripts

### Production (Supabase)
```bash
npm start          # Start production server
npm run dev        # Start dev server with hot reload
```

### Legacy (PostgreSQL)
```bash
npm run start:postgres    # Start legacy PostgreSQL server
npm run dev:postgres      # Dev server with PostgreSQL
npm run db:init:postgres  # Initialize PostgreSQL tables
```

---

## 📡 API Endpoints

### Health Check
```
GET /api/health
```

### Users
```
POST /api/users/auto          # Auto-create/get user by device_id
POST /api/users               # Create user with email
GET  /api/users/:id           # Get user by ID
```

### Journeys
```
POST /api/journeys                     # Create journey with day records
GET  /api/journeys/:id                 # Get journey with progress
GET  /api/journeys/:id/progress        # Get progress summary
GET  /api/journeys/:id/today           # Get today's tasks
GET  /api/journeys/:id/days/:dayNum    # Get specific day
POST /api/journeys/:id/days/:dayNum/generate-tasks
GET  /api/users/:userId/active-journey # Get active journey
```

### Tasks
```
POST /api/tasks/:id/complete     # Mark task as complete
POST /api/tasks/:id/uncomplete   # Mark task as incomplete
```

### Streaks
```
GET  /api/journeys/:id/streak    # Get streak info
POST /api/journeys/:id/grace-day # Use grace day
```

---

## 🔐 Security

- ✅ **Row Level Security (RLS)** enabled on all tables
- ✅ Server uses `service_role` key to bypass RLS
- ✅ Client apps should use `anon` key with RLS
- ✅ Policies allow users to only access their own data

---

## 🌍 Database Schema

### Tables
- **users** - User profiles and preferences
- **journeys** - 3-month learning plans
- **day_records** - Daily progress tracking
- **tasks** - Individual tasks for each day
- **streak_records** - Streak tracking and grace days

All tables have:
- UUID primary keys
- Timestamps (created_at, updated_at)
- Foreign key constraints
- Indexes for performance

---

## 🐛 Troubleshooting

### "Missing Supabase environment variables"
- Update `.env` with your Supabase credentials
- Restart the server

### "relation 'users' does not exist"
- Run `db/supabase-schema.sql` in Supabase SQL Editor

### Health check fails
- Check if Supabase project is paused (free tier auto-pauses)
- Go to dashboard to wake it up
- Verify API URL has no trailing slash

---

## 📊 Monitoring

View your database in Supabase dashboard:
- **Table Editor** - View/edit data
- **Database** - Check size and connections
- **Logs** - See all queries in real-time
- **API** - Monitor API requests

---

## 🚀 Deployment

### Environment Variables (Production)
```env
SUPABASE_URL=your-production-url.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-production-service-key
PORT=3001
NODE_ENV=production
```

### Deploy to:
- **Vercel** - Serverless functions
- **Railway** - Container hosting
- **Render** - Web services
- **Fly.io** - Edge deployment

---

## 📚 Resources

- [Supabase Docs](https://supabase.com/docs)
- [Supabase JavaScript Client](https://supabase.com/docs/reference/javascript)
- [Express.js Docs](https://expressjs.com/)

---

## 🆘 Support

Questions? Check the [SUPABASE_MIGRATION_GUIDE.md](./SUPABASE_MIGRATION_GUIDE.md) or open an issue.

---

**Built with ❤️ using Supabase**
