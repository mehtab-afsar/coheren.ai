-- Fix sprint_memories RLS: the original migration only added a SELECT policy
-- (via USING-only shorthand), which blocks all INSERT/UPDATE/DELETE operations.

DROP POLICY IF EXISTS sprint_memories_owner ON public.sprint_memories;

CREATE POLICY "Users can select own sprint memories"
  ON public.sprint_memories FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own sprint memories"
  ON public.sprint_memories FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own sprint memories"
  ON public.sprint_memories FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete own sprint memories"
  ON public.sprint_memories FOR DELETE
  USING (user_id = auth.uid());
