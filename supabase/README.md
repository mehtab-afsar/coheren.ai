# Supabase Migrations Guide

This directory contains the database schema migrations for Coheren, designed to work with local Supabase instances.

## 📁 Directory Structure

```
supabase/
├── migrations/
│   ├── 20260205000001_core_schema.sql      # Core tables (profiles, goals, tasks, etc.)
│   └── 20260205000002_task_feedback.sql    # Task feedback system
└── README.md                                # This file
```

## 🚀 Quick Start

### Official Workflow (Recommended)

```bash
# Start Supabase (applies migrations automatically)
supabase start

# Reset database and reapply all migrations
supabase db reset

# Start your app
npm run dev
```

That's it! Supabase automatically applies all migrations from `supabase/migrations/` when you run `supabase start` or `supabase db reset`.

### Verify Migrations Applied

```bash
# Check all tables exist
npm run db:tables

# Expected output:
#  checkpoints
#  daily_tasks
#  goal_stones
#  profiles
#  roadmaps
#  task_feedback
#  user_goals
```

### Check RLS Policies

```bash
docker exec supabase_db_consist psql -U postgres -d postgres -c \
  "SELECT tablename, policyname FROM pg_policies WHERE schemaname = 'public' ORDER BY tablename;"
```

## 📋 Migration Details

### Migration 1: Core Schema (`20260205000001_core_schema.sql`)

Creates the following tables:

1. **profiles** - User profile data with persona traits
2. **user_goals** - User goals with status tracking
3. **goal_stones** - Milestone tracking for goals
4. **roadmaps** - AI-generated roadmaps for goals
5. **daily_tasks** - Daily task assignments
6. **checkpoints** - 14-day performance checkpoints

**Features:**
- Row Level Security (RLS) on all tables
- Automatic `updated_at` timestamp triggers
- Indexes for performance optimization
- Foreign key constraints for data integrity

### Migration 2: Task Feedback (`20260205000002_task_feedback.sql`)

Creates the task feedback system:

1. **task_feedback** - User feedback on completed tasks

**Features:**
- Difficulty scoring (1-5 scale)
- Duration tracking
- Feedback tags (array of strings)
- Helper functions:
  - `get_avg_difficulty(goal_id, user_id, days)`
  - `get_completion_rate(goal_id, user_id, days)`
  - `get_struggling_tags(goal_id, user_id, days)`
- Specialized indexes for checkpoint analysis

## 🔧 Migration Principles

### Idempotency

All migrations use idempotent SQL commands:

```sql
CREATE TABLE IF NOT EXISTS ...
CREATE INDEX IF NOT EXISTS ...
DROP POLICY IF EXISTS ... -- Then CREATE POLICY
DROP TRIGGER IF EXISTS ... -- Then CREATE TRIGGER
```

This allows migrations to be run multiple times safely without errors.

### Forward-Only

Migrations are forward-only and never modify existing data:
- ✅ Add new tables, columns, indexes, policies
- ✅ Create new functions
- ❌ Never DROP existing tables or columns
- ❌ Never ALTER existing columns in a breaking way
- ❌ Never modify existing data

### No Seed Data

Migrations contain only schema definitions:
- ✅ Tables, indexes, constraints
- ✅ Functions, triggers, policies
- ❌ No INSERT statements
- ❌ No test data

Seed data should be added through the application or separate seeding scripts.

## 📝 Creating New Migrations

When adding new features, create a new migration file:

### 1. Create Migration File

```bash
# Timestamp format: YYYYMMDDHHMMSS
touch supabase/migrations/20260205120000_add_feature_name.sql
```

### 2. Write Idempotent SQL

```sql
-- Example: Adding a new table
CREATE TABLE IF NOT EXISTS public.new_feature (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Enable RLS
ALTER TABLE public.new_feature ENABLE ROW LEVEL SECURITY;

-- Create policies
DROP POLICY IF EXISTS "Users can view own data" ON public.new_feature;
CREATE POLICY "Users can view own data"
  ON public.new_feature FOR SELECT
  USING (auth.uid() = user_id);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_new_feature_user_id
  ON public.new_feature(user_id);
```

### 3. Apply Migration

```bash
# Supabase CLI applies migrations automatically!
supabase db reset
```

### 4. Verify

```bash
npm run db:tables
```

## 🔄 Database Reset Workflow

To reset the database and reapply all migrations, use the Supabase CLI:

```bash
# One command does it all!
supabase db reset
```

This automatically:
- Drops the database
- Recreates it
- Applies all migrations from `supabase/migrations/` in order
- No manual steps needed

### Verify

```bash
npm run db:tables
```

## 🛠️ Troubleshooting

### Migration Fails with "relation already exists"

This means the migration is not idempotent. Fix by adding `IF NOT EXISTS`:

```sql
-- ❌ Bad
CREATE TABLE my_table (...);

-- ✅ Good
CREATE TABLE IF NOT EXISTS my_table (...);
```

### RLS Policies Not Working

1. Check RLS is enabled on the table:
   ```sql
   SELECT tablename, rowsecurity FROM pg_tables WHERE tablename = 'your_table';
   ```

2. Check policies exist:
   ```sql
   SELECT * FROM pg_policies WHERE tablename = 'your_table';
   ```

3. Test with a real user:
   ```sql
   SET ROLE authenticated;
   SET request.jwt.claim.sub = 'user-uuid-here';
   SELECT * FROM your_table;
   ```

### Function Not Found

Verify function was created in `public` schema:

```sql
SELECT proname, pronamespace::regnamespace
FROM pg_proc
WHERE proname = 'your_function_name';
```

## 📊 Database Schema Overview

```
┌─────────────┐
│  auth.users │ (Supabase managed)
└──────┬──────┘
       │
       ├──────────────────────────────────────┐
       │                                      │
       ▼                                      ▼
┌──────────────┐                      ┌──────────────┐
│   profiles   │                      │  user_goals  │
│              │                      │              │
│ • full_name  │                      │ • goal_text  │
│ • location   │                      │ • status     │
│ • bio        │                      │ • category   │
│ • traits     │                      └──────┬───────┘
└──────────────┘                             │
                                             ├──────────┬──────────┬──────────┐
                                             ▼          ▼          ▼          ▼
                                      ┌────────────┐ ┌────────┐ ┌────────┐ ┌────────────┐
                                      │goal_stones │ │roadmaps│ │  tasks │ │checkpoints │
                                      │            │ │        │ │        │ │            │
                                      │ • stone #  │ │ • data │ │ • day  │ │ • metrics  │
                                      │ • complete │ │ • ver  │ │ • done │ │ • analysis │
                                      └────────────┘ └────────┘ └───┬────┘ └────────────┘
                                                                     │
                                                                     ▼
                                                              ┌──────────────┐
                                                              │task_feedback │
                                                              │              │
                                                              │ • difficulty │
                                                              │ • duration   │
                                                              │ • tags       │
                                                              └──────────────┘
```

## 🔐 Security Features

### Row Level Security (RLS)

All tables have RLS enabled with policies ensuring:
- Users can only access their own data
- `auth.uid()` must match `user_id` foreign key
- No cross-user data leakage

### Audit Trail

Automatic timestamp tracking:
- `created_at` - When record was created
- `updated_at` - When record was last modified (via trigger)

### Data Integrity

- Foreign key constraints to `auth.users`
- Cascade deletes for dependent records
- Check constraints for valid data ranges
- Non-null constraints on critical fields

## 📚 Additional Resources

- [Supabase Documentation](https://supabase.com/docs)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [Row Level Security Guide](https://supabase.com/docs/guides/auth/row-level-security)
- [Local Development Guide](../LOCAL_SUPABASE_GUIDE.md)
- [Terminal Commands](../TERMINAL_COMMANDS.md)

## 🎯 Next Steps

1. **Development**: Use migrations for all schema changes
2. **Testing**: Create test data via application, not migrations
3. **Production**: Use Supabase CLI or migration tools for deployment
4. **Backup**: Regular exports of production data (schema + data)

---

**Last Updated**: 2026-02-05
**Database Version**: PostgreSQL 15 (Supabase)
