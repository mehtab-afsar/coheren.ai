-- RLS Hardening Migration
-- Created: 2026-02-25
-- Fixes four gaps found during RLS audit:
--   1. knowledge_chunks had no RLS (write-open to any anon key holder)
--   2. task_feedback INSERT didn't validate goal_id ownership
--   3. task_feedback UPDATE lacked WITH CHECK (allowed user_id transfer)
--   4. profiles lacked a DELETE policy

-- ============================================================================
-- 1. KNOWLEDGE_CHUNKS — enable RLS, public read, no browser writes
-- ============================================================================
-- The knowledge base is public scientific content — anyone can read it.
-- Writes must go through the service_role key (ingestion script only).
-- Service role bypasses RLS so no write policy is needed.

ALTER TABLE public.knowledge_chunks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read knowledge chunks" ON public.knowledge_chunks;
CREATE POLICY "Public read knowledge chunks"
  ON public.knowledge_chunks FOR SELECT
  USING (true);

-- ============================================================================
-- 2 & 3. TASK_FEEDBACK — tighten INSERT and UPDATE
-- ============================================================================

-- DROP old INSERT policy (only checked user_id, not goal_id ownership)
DROP POLICY IF EXISTS "Users can insert own feedback" ON public.task_feedback;
CREATE POLICY "Users can insert own feedback"
  ON public.task_feedback FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    -- Ensure goal_id actually belongs to this user
    AND EXISTS (
      SELECT 1 FROM public.user_goals
      WHERE user_goals.id = task_feedback.goal_id
        AND user_goals.user_id = auth.uid()
    )
    -- Ensure task_id belongs to one of this user's roadmaps
    AND EXISTS (
      SELECT 1 FROM public.daily_tasks
      JOIN public.roadmaps ON roadmaps.id = daily_tasks.roadmap_id
      JOIN public.user_goals ON user_goals.id = roadmaps.goal_id
      WHERE daily_tasks.id = task_feedback.task_id
        AND user_goals.user_id = auth.uid()
    )
  );

-- DROP old UPDATE policy (had no WITH CHECK — allowed user_id mutation)
DROP POLICY IF EXISTS "Users can update own feedback" ON public.task_feedback;
CREATE POLICY "Users can update own feedback"
  ON public.task_feedback FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);   -- prevents reassigning user_id to someone else

-- ============================================================================
-- 4. PROFILES — add missing DELETE policy
-- ============================================================================

DROP POLICY IF EXISTS "Users can delete own profile" ON public.profiles;
CREATE POLICY "Users can delete own profile"
  ON public.profiles FOR DELETE
  USING (auth.uid() = id);
