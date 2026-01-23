# 📁 Coheren Project Structure

Clean, organized structure after cleanup - Supabase backend only!

## 🎯 Project Overview

- **Frontend**: React + TypeScript + Vite
- **Backend**: Express + Supabase (PostgreSQL)
- **Database**: Supabase (managed PostgreSQL)
- **State**: Zustand with persistence

---

## 📂 Directory Structure

```
consist/
├── src/                          # Frontend React application
│   ├── pages/                    # Page components
│   │   ├── LandingPage.tsx      # Landing page with nav, hero, sections
│   │   ├── OnboardingIntro.tsx  # Pre-chat onboarding
│   │   ├── ChatOnboarding.tsx   # AI chat interface
│   │   ├── RoadmapPreview.tsx   # Generated roadmap preview
│   │   ├── CheckInSetup.tsx     # Daily check-in time setup
│   │   ├── Dashboard.tsx        # Main dashboard
│   │   ├── PricingPage.tsx      # Pricing plans
│   │   └── ...
│   ├── components/              # Reusable components
│   ├── store/                   # Zustand state management
│   │   └── useStore.ts          # Main store with persistence
│   ├── design-system/           # Design tokens
│   ├── App.tsx                  # Main app with routing
│   └── main.tsx                 # Entry point
│
├── server/                      # Backend Express server
│   ├── db/                      # Database files
│   │   ├── supabase.js         # Supabase client config
│   │   ├── supabase-schema.sql # Database schema (user-centric)
│   │   ├── ARCHITECTURE_GUIDE.md
│   │   └── SCHEMA_COMPARISON.md
│   ├── index.js                # Main Express server (Supabase)
│   ├── test-supabase.js        # Connection test script
│   ├── package.json            # Server dependencies
│   ├── .env                    # Environment variables
│   ├── README.md               # Server documentation
│   └── SUPABASE_MIGRATION_GUIDE.md
│
├── public/                     # Static assets
│   ├── logo.png
│   └── screenshots/           # Roadmap carousel images
│
├── package.json               # Frontend dependencies
├── vite.config.ts            # Vite configuration
├── tsconfig.json             # TypeScript config
├── DESIGN_SYSTEM.md          # Design tokens & guidelines
├── RAG_KNOWLEDGE_BASE.md     # Project knowledge base
├── README.md                 # Project overview
└── SUPABASE_MIGRATION_SUMMARY.md

```

---

## 🚀 Quick Start Commands

### Frontend
```bash
npm run dev              # Start dev server (port 3000)
npm run build            # Build for production
npm run preview          # Preview production build
```

### Backend
```bash
cd server
npm run dev              # Start dev server (port 3001)
npm start                # Start production server
npm test                 # Test Supabase connection
```

---

## 📊 Database Structure

### Tables (User-Centric Hierarchy)
- **users** - User profiles & preferences (nested JSON)
- **journeys** - Learning plans with progress tracking
- **day_records** - Daily progress with nested tasks
- **user_achievements** - Badges & milestones
- **activity_log** - User action tracking

### Key Features
- ✅ Nested JSONB for related data (tasks in day_records)
- ✅ Auto-calculated user stats via triggers
- ✅ Helper functions for complete data retrieval
- ✅ Row Level Security (RLS) enabled
- ✅ Optimized indexes for fast queries

---

## 🔑 Environment Variables

### Frontend (.env)
```env
VITE_API_URL=http://localhost:3001
```

### Backend (server/.env)
```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
PORT=3001
```

---

## 📡 API Endpoints

Base URL: `http://localhost:3001/api`

### Users
- `POST /users/auto` - Auto-create/get user by device_id
- `POST /users` - Create user with email
- `GET /users/:id` - Get user by ID

### Journeys
- `POST /journeys` - Create journey with day records
- `GET /journeys/:id` - Get journey with progress
- `GET /journeys/:id/progress` - Get progress summary
- `GET /journeys/:id/today` - Get today's tasks
- `GET /journeys/:id/days/:dayNum` - Get specific day
- `POST /journeys/:id/days/:dayNum/generate-tasks` - Generate tasks
- `GET /users/:userId/active-journey` - Get active journey

### Tasks
- `POST /tasks/:id/complete` - Mark task complete
- `POST /tasks/:id/uncomplete` - Mark task incomplete

### Streaks
- `GET /journeys/:id/streak` - Get streak info
- `POST /journeys/:id/grace-day` - Use grace day

### Health
- `GET /health` - Check API status

---

## 🎨 Design System

Located in: `src/design-system/`

### Tokens
- **Colors**: Primary, success, warning, error, text
- **Spacing**: xs → 5xl (4px → 96px)
- **Typography**: Sizes, weights, line heights
- **Border Radius**: sm → full
- **Shadows**: Depth levels

### Usage
```typescript
import { tokens } from './design-system';

style={{
  color: tokens.colors.primary,
  padding: tokens.spacing.lg,
  borderRadius: tokens.borderRadius.xl
}}
```

---

## 📚 Key Documentation Files

### Setup & Migration
- `SUPABASE_MIGRATION_SUMMARY.md` - Migration overview
- `server/SUPABASE_MIGRATION_GUIDE.md` - Step-by-step setup
- `server/README.md` - Server documentation

### Architecture
- `server/db/ARCHITECTURE_GUIDE.md` - Database design
- `server/db/SCHEMA_COMPARISON.md` - V1 vs V2 comparison
- `DESIGN_SYSTEM.md` - UI design guidelines

### Reference
- `RAG_KNOWLEDGE_BASE.md` - Project context & decisions
- `README.md` - Project overview

---

## 🔄 Development Workflow

### 1. Start Development Servers
```bash
# Terminal 1 - Frontend
npm run dev

# Terminal 2 - Backend
cd server && npm run dev
```

### 2. Access Application
- Frontend: http://localhost:3000
- Backend API: http://localhost:3001
- Supabase Dashboard: https://supabase.com/dashboard

### 3. Database Management
- View data: Supabase → Table Editor
- Run queries: Supabase → SQL Editor
- Monitor: Supabase → Logs

---

## 🧪 Testing

### Backend Connection
```bash
cd server
npm test
```

### API Health Check
```bash
curl http://localhost:3001/api/health
```

---

## 📦 Dependencies

### Frontend
- React 19.2.0
- Framer Motion 12.27.5
- Zustand 5.0.9
- Lucide React 0.562.0
- Groq SDK 0.37.0

### Backend
- Express 4.18.2
- @supabase/supabase-js 2.91.1
- CORS 2.8.5
- Dotenv 16.3.1

---

## 🚀 Deployment

### Frontend (Vercel/Netlify)
```bash
npm run build
# Deploy dist/ folder
```

### Backend (Railway/Render/Fly.io)
```bash
cd server
# Set environment variables
# Deploy with npm start
```

### Database
Already hosted on Supabase - no deployment needed!

---

## 🆘 Common Issues

### Frontend won't start
- Check if port 3000 is available
- Delete `node_modules` and run `npm install`

### Backend connection fails
- Check Supabase project is not paused
- Verify credentials in `server/.env`
- Run `npm test` to diagnose

### Database queries fail
- Check tables exist in Supabase Table Editor
- Verify schema was run in SQL Editor
- Check RLS policies if needed

---

## 📈 Future Enhancements

- [ ] Add Supabase Authentication
- [ ] Implement real-time subscriptions
- [ ] Add file storage for avatars
- [ ] Deploy to production
- [ ] Add analytics tracking
- [ ] Implement push notifications

---

**Last Updated**: January 24, 2025
**Version**: 1.0.0 (Supabase Migration Complete)
