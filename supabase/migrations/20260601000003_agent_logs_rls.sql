-- Fix agent_logs RLS: original migration only has SELECT + INSERT policies.
-- Add UPDATE and DELETE so users can manage their own log entries.

CREATE POLICY "Users can update own agent logs"
  ON agent_logs FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own agent logs"
  ON agent_logs FOR DELETE
  USING (auth.uid() = user_id);
