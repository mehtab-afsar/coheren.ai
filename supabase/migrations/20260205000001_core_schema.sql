-- Core Database Schema for Coheren
-- Created: 2026-02-05
-- Description: Creates profiles, user_goals, goal_stones, roadmaps, daily_tasks, and checkpoints tables
-- FIXED: Schema now matches TypeScript interfaces in src/lib/supabase.ts

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- PROFILES TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  full_name TEXT,
  location TEXT,
  bio TEXT,
  persona_traits JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS Policies for profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
CREATE POLICY "Users can insert own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- ============================================================================
-- USER_GOALS TABLE (FIXED to match UserGoal interface)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.user_goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  goal_analysis JSONB,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'paused', 'completed')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS Policies for user_goals
ALTER TABLE public.user_goals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own goals" ON public.user_goals;
CREATE POLICY "Users can view own goals"
  ON public.user_goals FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own goals" ON public.user_goals;
CREATE POLICY "Users can insert own goals"
  ON public.user_goals FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own goals" ON public.user_goals;
CREATE POLICY "Users can update own goals"
  ON public.user_goals FOR UPDATE
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own goals" ON public.user_goals;
CREATE POLICY "Users can delete own goals"
  ON public.user_goals FOR DELETE
  USING (auth.uid() = user_id);

-- Indexes for user_goals
CREATE INDEX IF NOT EXISTS idx_user_goals_user_id ON public.user_goals(user_id);
CREATE INDEX IF NOT EXISTS idx_user_goals_status ON public.user_goals(status);
CREATE INDEX IF NOT EXISTS idx_user_goals_created_at ON public.user_goals(created_at);

-- ============================================================================
-- GOAL_STONES TABLE (FIXED to match GoalStone interface)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.goal_stones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  goal_id UUID REFERENCES public.user_goals(id) ON DELETE CASCADE NOT NULL,
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  impact_data JSONB,
  priority TEXT CHECK (priority IN ('critical', 'high', 'medium', 'low')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS Policies for goal_stones (now based on goal_id ownership)
ALTER TABLE public.goal_stones ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own goal stones" ON public.goal_stones;
CREATE POLICY "Users can view own goal stones"
  ON public.goal_stones FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.user_goals
      WHERE user_goals.id = goal_stones.goal_id
      AND user_goals.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can insert own goal stones" ON public.goal_stones;
CREATE POLICY "Users can insert own goal stones"
  ON public.goal_stones FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_goals
      WHERE user_goals.id = goal_stones.goal_id
      AND user_goals.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can update own goal stones" ON public.goal_stones;
CREATE POLICY "Users can update own goal stones"
  ON public.goal_stones FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.user_goals
      WHERE user_goals.id = goal_stones.goal_id
      AND user_goals.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can delete own goal stones" ON public.goal_stones;
CREATE POLICY "Users can delete own goal stones"
  ON public.goal_stones FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.user_goals
      WHERE user_goals.id = goal_stones.goal_id
      AND user_goals.user_id = auth.uid()
    )
  );

-- Indexes for goal_stones
CREATE INDEX IF NOT EXISTS idx_goal_stones_goal_id ON public.goal_stones(goal_id);

-- ============================================================================
-- ROADMAPS TABLE (FIXED to match Roadmap interface)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.roadmaps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  goal_id UUID REFERENCES public.user_goals(id) ON DELETE CASCADE NOT NULL,
  phases JSONB NOT NULL,
  config JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS Policies for roadmaps (based on goal ownership)
ALTER TABLE public.roadmaps ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own roadmaps" ON public.roadmaps;
CREATE POLICY "Users can view own roadmaps"
  ON public.roadmaps FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.user_goals
      WHERE user_goals.id = roadmaps.goal_id
      AND user_goals.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can insert own roadmaps" ON public.roadmaps;
CREATE POLICY "Users can insert own roadmaps"
  ON public.roadmaps FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_goals
      WHERE user_goals.id = roadmaps.goal_id
      AND user_goals.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can update own roadmaps" ON public.roadmaps;
CREATE POLICY "Users can update own roadmaps"
  ON public.roadmaps FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.user_goals
      WHERE user_goals.id = roadmaps.goal_id
      AND user_goals.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can delete own roadmaps" ON public.roadmaps;
CREATE POLICY "Users can delete own roadmaps"
  ON public.roadmaps FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.user_goals
      WHERE user_goals.id = roadmaps.goal_id
      AND user_goals.user_id = auth.uid()
    )
  );

-- Indexes for roadmaps
CREATE INDEX IF NOT EXISTS idx_roadmaps_goal_id ON public.roadmaps(goal_id);

-- ============================================================================
-- DAILY_TASKS TABLE (FIXED to match DailyTaskRecord interface)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.daily_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  roadmap_id UUID REFERENCES public.roadmaps(id) ON DELETE CASCADE NOT NULL,
  day_number INT NOT NULL,
  title TEXT NOT NULL,
  content JSONB NOT NULL,
  is_completed BOOLEAN DEFAULT FALSE,
  difficulty_rating INT CHECK (difficulty_rating >= 1 AND difficulty_rating <= 5),
  actual_duration INT,
  user_comment TEXT,
  completed_at TIMESTAMP WITH TIME ZONE,
  skipped BOOLEAN DEFAULT FALSE,
  skip_reason TEXT CHECK (skip_reason IN ('time', 'health', 'difficulty', 'external')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS Policies for daily_tasks (based on roadmap ownership)
ALTER TABLE public.daily_tasks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own tasks" ON public.daily_tasks;
CREATE POLICY "Users can view own tasks"
  ON public.daily_tasks FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.roadmaps
      JOIN public.user_goals ON user_goals.id = roadmaps.goal_id
      WHERE roadmaps.id = daily_tasks.roadmap_id
      AND user_goals.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can insert own tasks" ON public.daily_tasks;
CREATE POLICY "Users can insert own tasks"
  ON public.daily_tasks FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.roadmaps
      JOIN public.user_goals ON user_goals.id = roadmaps.goal_id
      WHERE roadmaps.id = daily_tasks.roadmap_id
      AND user_goals.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can update own tasks" ON public.daily_tasks;
CREATE POLICY "Users can update own tasks"
  ON public.daily_tasks FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.roadmaps
      JOIN public.user_goals ON user_goals.id = roadmaps.goal_id
      WHERE roadmaps.id = daily_tasks.roadmap_id
      AND user_goals.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can delete own tasks" ON public.daily_tasks;
CREATE POLICY "Users can delete own tasks"
  ON public.daily_tasks FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.roadmaps
      JOIN public.user_goals ON user_goals.id = roadmaps.goal_id
      WHERE roadmaps.id = daily_tasks.roadmap_id
      AND user_goals.user_id = auth.uid()
    )
  );

-- Indexes for daily_tasks
CREATE INDEX IF NOT EXISTS idx_daily_tasks_roadmap_id ON public.daily_tasks(roadmap_id);
CREATE INDEX IF NOT EXISTS idx_daily_tasks_day_number ON public.daily_tasks(day_number);
CREATE INDEX IF NOT EXISTS idx_daily_tasks_is_completed ON public.daily_tasks(is_completed);

-- ============================================================================
-- CHECKPOINTS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.checkpoints (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  roadmap_id UUID REFERENCES public.roadmaps(id) ON DELETE CASCADE NOT NULL,
  checkpoint_day INT NOT NULL,
  overall_mastery TEXT CHECK (overall_mastery IN ('struggling', 'on-track', 'excelling')),
  struggling_areas TEXT[],
  mastering_areas TEXT[],
  pace_adjustment TEXT CHECK (pace_adjustment IN ('slow-down', 'maintain', 'accelerate')),
  recommendations TEXT[],
  next_sprint_focus TEXT,
  personalized_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS Policies for checkpoints
ALTER TABLE public.checkpoints ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own checkpoints" ON public.checkpoints;
CREATE POLICY "Users can view own checkpoints"
  ON public.checkpoints FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.roadmaps
      JOIN public.user_goals ON user_goals.id = roadmaps.goal_id
      WHERE roadmaps.id = checkpoints.roadmap_id
      AND user_goals.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can insert own checkpoints" ON public.checkpoints;
CREATE POLICY "Users can insert own checkpoints"
  ON public.checkpoints FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.roadmaps
      JOIN public.user_goals ON user_goals.id = roadmaps.goal_id
      WHERE roadmaps.id = checkpoints.roadmap_id
      AND user_goals.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can update own checkpoints" ON public.checkpoints;
CREATE POLICY "Users can update own checkpoints"
  ON public.checkpoints FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.roadmaps
      JOIN public.user_goals ON user_goals.id = roadmaps.goal_id
      WHERE roadmaps.id = checkpoints.roadmap_id
      AND user_goals.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can delete own checkpoints" ON public.checkpoints;
CREATE POLICY "Users can delete own checkpoints"
  ON public.checkpoints FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.roadmaps
      JOIN public.user_goals ON user_goals.id = roadmaps.goal_id
      WHERE roadmaps.id = checkpoints.roadmap_id
      AND user_goals.user_id = auth.uid()
    )
  );

-- Indexes for checkpoints
CREATE INDEX IF NOT EXISTS idx_checkpoints_roadmap_id ON public.checkpoints(roadmap_id);
CREATE INDEX IF NOT EXISTS idx_checkpoints_day ON public.checkpoints(checkpoint_day);

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for profiles
DROP TRIGGER IF EXISTS update_profiles_updated_at ON public.profiles;
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Trigger for user_goals
DROP TRIGGER IF EXISTS update_user_goals_updated_at ON public.user_goals;
CREATE TRIGGER update_user_goals_updated_at
  BEFORE UPDATE ON public.user_goals
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
