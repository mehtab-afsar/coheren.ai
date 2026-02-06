-- Task Feedback Schema for Coheren
-- Created: 2026-02-05
-- Description: Creates task_feedback table with indexes, RLS policies, and helper functions

-- ============================================================================
-- TASK_FEEDBACK TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.task_feedback (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users NOT NULL,
  task_id UUID REFERENCES public.daily_tasks NOT NULL,
  goal_id UUID REFERENCES public.user_goals NOT NULL,
  difficulty_score INT CHECK (difficulty_score >= 1 AND difficulty_score <= 5) NOT NULL,
  completion_status TEXT DEFAULT 'completed',
  actual_duration_mins INT,
  user_comment TEXT,
  feedback_tags TEXT[],
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- ============================================================================
-- INDEXES
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_feedback_user_id ON public.task_feedback(user_id);
CREATE INDEX IF NOT EXISTS idx_feedback_task_id ON public.task_feedback(task_id);
CREATE INDEX IF NOT EXISTS idx_feedback_goal_id ON public.task_feedback(goal_id);
CREATE INDEX IF NOT EXISTS idx_feedback_created_at ON public.task_feedback(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_feedback_goal_user ON public.task_feedback(goal_id, user_id, created_at DESC);

-- Index for querying by difficulty score (checkpoint analysis)
CREATE INDEX IF NOT EXISTS idx_feedback_difficulty ON public.task_feedback(difficulty_score);

-- Index for querying by tags (common feedback patterns)
CREATE INDEX IF NOT EXISTS idx_feedback_tags ON public.task_feedback USING GIN(feedback_tags);

-- ============================================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================================
ALTER TABLE public.task_feedback ENABLE ROW LEVEL SECURITY;

-- Users can view their own feedback
DROP POLICY IF EXISTS "Users can view own feedback" ON public.task_feedback;
CREATE POLICY "Users can view own feedback"
  ON public.task_feedback FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert their own feedback
DROP POLICY IF EXISTS "Users can insert own feedback" ON public.task_feedback;
CREATE POLICY "Users can insert own feedback"
  ON public.task_feedback FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own feedback
DROP POLICY IF EXISTS "Users can update own feedback" ON public.task_feedback;
CREATE POLICY "Users can update own feedback"
  ON public.task_feedback FOR UPDATE
  USING (auth.uid() = user_id);

-- Users can delete their own feedback
DROP POLICY IF EXISTS "Users can delete own feedback" ON public.task_feedback;
CREATE POLICY "Users can delete own feedback"
  ON public.task_feedback FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Function to get average difficulty for a goal over the last N days
CREATE OR REPLACE FUNCTION get_avg_difficulty(
  p_goal_id UUID,
  p_user_id UUID,
  p_days INT DEFAULT 14
)
RETURNS NUMERIC AS $$
  SELECT AVG(difficulty_score)::NUMERIC(3,2)
  FROM public.task_feedback
  WHERE goal_id = p_goal_id
    AND user_id = p_user_id
    AND created_at >= NOW() - (p_days || ' days')::INTERVAL;
$$ LANGUAGE SQL STABLE;

-- Function to get completion rate for a goal over the last N days
CREATE OR REPLACE FUNCTION get_completion_rate(
  p_goal_id UUID,
  p_user_id UUID,
  p_days INT DEFAULT 14
)
RETURNS NUMERIC AS $$
  SELECT
    CASE
      WHEN COUNT(*) = 0 THEN 0
      ELSE (COUNT(*) FILTER (WHERE completion_status = 'completed')::NUMERIC / COUNT(*)::NUMERIC * 100)::NUMERIC(5,2)
    END
  FROM public.task_feedback
  WHERE goal_id = p_goal_id
    AND user_id = p_user_id
    AND created_at >= NOW() - (p_days || ' days')::INTERVAL;
$$ LANGUAGE SQL STABLE;

-- Function to get most common struggling tags for a goal
CREATE OR REPLACE FUNCTION get_struggling_tags(
  p_goal_id UUID,
  p_user_id UUID,
  p_days INT DEFAULT 14
)
RETURNS TABLE(tag TEXT, count BIGINT) AS $$
  SELECT
    unnest(feedback_tags) as tag,
    COUNT(*) as count
  FROM public.task_feedback
  WHERE goal_id = p_goal_id
    AND user_id = p_user_id
    AND difficulty_score >= 4
    AND created_at >= NOW() - (p_days || ' days')::INTERVAL
    AND feedback_tags IS NOT NULL
  GROUP BY tag
  ORDER BY count DESC
  LIMIT 5;
$$ LANGUAGE SQL STABLE;

-- ============================================================================
-- TRIGGER FOR UPDATED_AT
-- ============================================================================
DROP TRIGGER IF EXISTS update_task_feedback_updated_at ON public.task_feedback;
CREATE TRIGGER update_task_feedback_updated_at
  BEFORE UPDATE ON public.task_feedback
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- COMMENTS (Documentation)
-- ============================================================================
COMMENT ON TABLE public.task_feedback IS 'Stores user feedback for completed/skipped daily tasks. Used for checkpoint analysis and roadmap recalibration.';
COMMENT ON COLUMN public.task_feedback.difficulty_score IS 'User-reported difficulty on a scale of 1-5 (1=too easy, 5=too hard)';
COMMENT ON COLUMN public.task_feedback.actual_duration_mins IS 'Actual time spent on task in minutes';
COMMENT ON COLUMN public.task_feedback.feedback_tags IS 'User-selected tags describing their experience (e.g., "too_easy", "confusing", "fun")';
COMMENT ON COLUMN public.task_feedback.user_comment IS 'Optional free-text comment from user';
COMMENT ON FUNCTION get_avg_difficulty IS 'Returns average difficulty score for a goal over the last N days';
COMMENT ON FUNCTION get_completion_rate IS 'Returns completion percentage for a goal over the last N days';
COMMENT ON FUNCTION get_struggling_tags IS 'Returns top 5 most common tags from difficult tasks (difficulty >= 4) over the last N days';
