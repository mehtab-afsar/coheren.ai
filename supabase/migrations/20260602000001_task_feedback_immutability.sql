-- Feedback used to train the recalibrator should not be silently rewritten
-- after the fact. task_feedback becomes append-only: saveTaskFeedback() now
-- always INSERTs a new row (see src/lib/database.ts), so routine mutation no
-- longer needs UPDATE. DELETE is left in place — deleteUserData() still uses
-- it for user-initiated goal reset, which is erasure of one's own data, not
-- the routine-rewrite problem this migration closes.
--
-- Companion cleanup: pipeline_checkpoints, sprint_memories, and agent_logs
-- also carry UPDATE/DELETE policies that no application code exercises
-- (verified: only .insert()/.select() calls exist against these tables) —
-- revoke those grants too so they can't be used to alter history either.

-- task_feedback: drop UPDATE, keep SELECT/INSERT/DELETE
DROP POLICY IF EXISTS "Users can update own feedback" ON public.task_feedback;

-- pipeline_checkpoints: replace the FOR ALL policy with SELECT + INSERT only
DROP POLICY IF EXISTS "Users can manage their own pipeline checkpoints" ON pipeline_checkpoints;

CREATE POLICY "Users can view own pipeline checkpoints"
  ON pipeline_checkpoints FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own pipeline checkpoints"
  ON pipeline_checkpoints FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- sprint_memories: drop UPDATE and DELETE, keep SELECT/INSERT
DROP POLICY IF EXISTS "Users can update own sprint memories" ON public.sprint_memories;
DROP POLICY IF EXISTS "Users can delete own sprint memories" ON public.sprint_memories;

-- agent_logs: drop UPDATE and DELETE, keep SELECT/INSERT
DROP POLICY IF EXISTS "Users can update own agent logs" ON agent_logs;
DROP POLICY IF EXISTS "Users can delete own agent logs" ON agent_logs;
