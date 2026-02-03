# Supabase Setup Guide

This guide will help you set up Supabase authentication and database for Coheren.

## 1. Create a Supabase Project

1. Go to [supabase.com](https://supabase.com) and sign in
2. Click "New Project"
3. Fill in:
   - Project name: `coheren` (or your choice)
   - Database password: (save this securely)
   - Region: Choose closest to your users
4. Wait for project to be created (~2 minutes)

## 2. Get Your Credentials

1. Go to Project Settings → API
2. Copy these values to your `.env` file:
   - `VITE_SUPABASE_URL`: Your project URL
   - `VITE_SUPABASE_ANON_KEY`: Your anon/public key

Example `.env`:
```bash
VITE_GROQ_API_KEY=gsk_your_groq_key
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

## 3. Enable Authentication Providers

### Email Authentication

1. Go to Authentication → Providers
2. Enable **Email** provider
3. Configure email settings (optional):
   - Confirm email: Disabled (for faster testing) or Enabled (for production)
   - Secure email change: Enabled (recommended)

### Google OAuth (Recommended)

1. Go to Authentication → Providers
2. Click on **Google** provider
3. Enable the Google provider
4. You have two options:

**Option A: Use Supabase's OAuth (Easiest)**
- Just toggle "Enable Sign in with Google"
- No configuration needed
- Works immediately for development

**Option B: Use Your Own Google OAuth Credentials (Production)**
- Go to [Google Cloud Console](https://console.cloud.google.com/)
- Create a new project or select existing one
- Enable Google+ API
- Go to Credentials → Create Credentials → OAuth client ID
- Application type: Web application
- Authorized redirect URIs: `https://your-project.supabase.co/auth/v1/callback`
- Copy Client ID and Client Secret
- Paste into Supabase Google provider settings

5. Click Save

## 4. Create Database Schema

Go to SQL Editor and run these queries:

### Enable UUID Extension
```sql
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
```

### 1. Profiles Table
```sql
CREATE TABLE profiles (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  full_name TEXT,
  location TEXT,
  bio TEXT,
  persona_traits JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Users can only view/edit their own profile
CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name)
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data->>'full_name'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
```

### 2. User Goals Table
```sql
CREATE TABLE user_goals (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  goal_analysis JSONB, -- Output from Agent 1
  status TEXT CHECK (status IN ('active', 'completed', 'paused')) DEFAULT 'active',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE user_goals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own goals"
  ON user_goals FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own goals"
  ON user_goals FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own goals"
  ON user_goals FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own goals"
  ON user_goals FOR DELETE
  USING (auth.uid() = user_id);

-- Index for faster queries
CREATE INDEX idx_user_goals_user_id ON user_goals(user_id);
CREATE INDEX idx_user_goals_status ON user_goals(status);
```

### 3. Goal Stones Table
```sql
CREATE TABLE goal_stones (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  goal_id UUID REFERENCES user_goals(id) ON DELETE CASCADE NOT NULL,
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  impact_data JSONB, -- How this answer affects curriculum
  priority TEXT CHECK (priority IN ('critical', 'high', 'medium', 'low')) DEFAULT 'medium',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE goal_stones ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view stones for own goals"
  ON goal_stones FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_goals
      WHERE user_goals.id = goal_stones.goal_id
      AND user_goals.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create stones for own goals"
  ON goal_stones FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_goals
      WHERE user_goals.id = goal_stones.goal_id
      AND user_goals.user_id = auth.uid()
    )
  );

CREATE INDEX idx_goal_stones_goal_id ON goal_stones(goal_id);
```

### 4. Roadmaps Table
```sql
CREATE TABLE roadmaps (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  goal_id UUID REFERENCES user_goals(id) ON DELETE CASCADE NOT NULL,
  phases JSONB NOT NULL, -- Array of phase objects from Agent 3
  config JSONB, -- Pedagogical config used
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE roadmaps ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view roadmaps for own goals"
  ON roadmaps FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_goals
      WHERE user_goals.id = roadmaps.goal_id
      AND user_goals.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create roadmaps for own goals"
  ON roadmaps FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_goals
      WHERE user_goals.id = roadmaps.goal_id
      AND user_goals.user_id = auth.uid()
    )
  );

CREATE INDEX idx_roadmaps_goal_id ON roadmaps(goal_id);
```

### 5. Daily Tasks Table
```sql
CREATE TABLE daily_tasks (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  roadmap_id UUID REFERENCES roadmaps(id) ON DELETE CASCADE NOT NULL,
  day_number INTEGER NOT NULL,
  title TEXT NOT NULL,
  content JSONB NOT NULL, -- Task details from Agent 4
  is_completed BOOLEAN DEFAULT FALSE,
  completed_at TIMESTAMP WITH TIME ZONE,

  -- Agent 5 feedback fields
  difficulty_rating INTEGER CHECK (difficulty_rating BETWEEN 1 AND 5),
  actual_duration INTEGER, -- actual minutes taken
  user_comment TEXT,

  -- Skip tracking
  skipped BOOLEAN DEFAULT FALSE,
  skip_reason TEXT CHECK (skip_reason IN ('time', 'health', 'difficulty', 'external')),

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE daily_tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view tasks for own roadmaps"
  ON daily_tasks FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM roadmaps
      JOIN user_goals ON user_goals.id = roadmaps.goal_id
      WHERE roadmaps.id = daily_tasks.roadmap_id
      AND user_goals.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create tasks for own roadmaps"
  ON daily_tasks FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM roadmaps
      JOIN user_goals ON user_goals.id = roadmaps.goal_id
      WHERE roadmaps.id = daily_tasks.roadmap_id
      AND user_goals.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update own tasks"
  ON daily_tasks FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM roadmaps
      JOIN user_goals ON user_goals.id = roadmaps.goal_id
      WHERE roadmaps.id = daily_tasks.roadmap_id
      AND user_goals.user_id = auth.uid()
    )
  );

CREATE INDEX idx_daily_tasks_roadmap_id ON daily_tasks(roadmap_id);
CREATE INDEX idx_daily_tasks_day_number ON daily_tasks(day_number);
CREATE INDEX idx_daily_tasks_completed ON daily_tasks(is_completed);
```

### 6. Checkpoints Table (Agent 5)
```sql
CREATE TABLE checkpoints (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  roadmap_id UUID REFERENCES roadmaps(id) ON DELETE CASCADE NOT NULL,
  checkpoint_day INTEGER NOT NULL,

  -- Analysis results from Agent 5
  overall_mastery TEXT CHECK (overall_mastery IN ('struggling', 'on-track', 'excelling')),
  struggling_areas TEXT[],
  mastering_areas TEXT[],
  pace_adjustment TEXT CHECK (pace_adjustment IN ('slow-down', 'maintain', 'accelerate')),
  recommendations TEXT[],
  next_sprint_focus TEXT,
  personalized_message TEXT,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE checkpoints ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view checkpoints for own roadmaps"
  ON checkpoints FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM roadmaps
      JOIN user_goals ON user_goals.id = roadmaps.goal_id
      WHERE roadmaps.id = checkpoints.roadmap_id
      AND user_goals.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create checkpoints for own roadmaps"
  ON checkpoints FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM roadmaps
      JOIN user_goals ON user_goals.id = roadmaps.goal_id
      WHERE roadmaps.id = checkpoints.roadmap_id
      AND user_goals.user_id = auth.uid()
    )
  );

CREATE INDEX idx_checkpoints_roadmap_id ON checkpoints(roadmap_id);
CREATE INDEX idx_checkpoints_day ON checkpoints(checkpoint_day);
```

## 5. Test Your Setup

### Test Authentication
```typescript
import { signUp, signIn } from './lib/supabase';

// Sign up
const { data, error } = await signUp(
  'test@example.com',
  'password123',
  { full_name: 'Test User' }
);

// Sign in
const { data, error } = await signIn('test@example.com', 'password123');
```

### Test Database
```typescript
import { supabase } from './lib/supabase';

// Create a goal
const { data: goal, error } = await supabase
  .from('user_goals')
  .insert({
    title: 'Learn Guitar',
    description: 'Master basic chords in 90 days',
    status: 'active'
  })
  .select()
  .single();

// Fetch user's goals
const { data: goals } = await supabase
  .from('user_goals')
  .select('*, roadmaps(*)')
  .eq('status', 'active');
```

## 6. Optional: Storage for Media

If you want users to upload profile pictures or task photos:

```sql
-- Create a bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true);

-- Create policy
CREATE POLICY "Users can upload own avatar"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'avatars'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Anyone can view avatars"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'avatars');
```

## 7. Environment Variables Checklist

Make sure your `.env` has:
- ✅ `VITE_GROQ_API_KEY` (for AI agents)
- ✅ `VITE_SUPABASE_URL` (from Supabase dashboard)
- ✅ `VITE_SUPABASE_ANON_KEY` (from Supabase dashboard)

## 8. Deploy to Production

When deploying:

1. **Update Auth Settings**:
   - Go to Authentication → URL Configuration
   - Add your production URL to "Site URL"
   - Add redirect URLs (e.g., `https://yourapp.com/auth/callback`)

2. **Enable Email Confirmation** (recommended):
   - Go to Authentication → Email Templates
   - Customize confirmation email template

3. **Set up Environment Variables** in your hosting provider (Vercel, Netlify, etc.)

## Troubleshooting

### "relation does not exist" error
- Make sure you ran all SQL commands in order
- Check that tables were created in `public` schema

### RLS policy errors
- Verify user is authenticated: `await supabase.auth.getUser()`
- Check policy conditions match your query

### Email not sending
- Check spam folder
- Verify SMTP settings in Authentication → Settings
- For development, use "Disable email confirmation" temporarily

## Next Steps

Once Supabase is set up, the app will:
1. Show landing page when not logged in
2. Redirect to login when "Get Started" is clicked
3. After login:
   - Check if user has roadmap in database
   - If yes → Show Dashboard
   - If no → Show Chat Onboarding to create roadmap
4. Save all data (goals, roadmaps, tasks, checkpoints) to Supabase
5. Sync across devices automatically

See [ADAPTIVE_CURRICULUM_GUIDE.md](ADAPTIVE_CURRICULUM_GUIDE.md) for how the rolling curriculum works!
