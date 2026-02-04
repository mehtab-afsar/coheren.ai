-- ============================================
-- COHEREN.AI DATABASE SCHEMA
-- Run these commands in Supabase SQL Editor
-- ============================================

-- Enable UUID Extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- 1. PROFILES TABLE
-- ============================================

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

-- ============================================
-- 2. USER GOALS TABLE
-- ============================================

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

-- ============================================
-- 3. GOAL STONES TABLE
-- ============================================

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

-- ============================================
-- 4. ROADMAPS TABLE
-- ============================================

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

-- ============================================
-- 5. DAILY TASKS TABLE
-- ============================================

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

-- ============================================
-- 6. CHECKPOINTS TABLE (Agent 5)
-- ============================================

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

-- ============================================
-- DONE! 🎉
-- ============================================

-- Verify tables were created:
SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename;

-- Check RLS is enabled:
SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename;
