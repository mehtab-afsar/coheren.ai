-- Agent Logs: stores per-run metadata for debugging the 5-agent pipeline.
-- Each row = one agent invocation (Agent 1–5) for a specific user + goal.

CREATE TABLE IF NOT EXISTS agent_logs (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  goal_id     uuid REFERENCES user_goals(id) ON DELETE CASCADE,
  agent_name  text NOT NULL,              -- e.g. 'agent1_goal_analyzer', 'agent2_stone_identifier', ...
  run_type    text NOT NULL DEFAULT 'onboarding', -- 'onboarding' | 'checkpoint' | 'daily_task' | 'early_recal'
  input_hash  text,                        -- sha256 of input for dedup / replay
  output_json jsonb,                       -- trimmed agent output (first 10 KB)
  latency_ms  integer,                     -- wall-clock time
  model_used  text,                        -- e.g. 'llama-3.3-70b-versatile'
  token_count integer,                     -- prompt + completion tokens
  success     boolean NOT NULL DEFAULT true,
  error_msg   text,                        -- null on success; error message on failure
  metadata    jsonb DEFAULT '{}'::jsonb,   -- extra context (e.g. domain, stone, day number)
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- Index for fetching logs per user/goal
CREATE INDEX IF NOT EXISTS idx_agent_logs_user_goal ON agent_logs(user_id, goal_id);
-- Index for filtering by agent name
CREATE INDEX IF NOT EXISTS idx_agent_logs_agent ON agent_logs(agent_name, created_at DESC);
-- Index for error monitoring
CREATE INDEX IF NOT EXISTS idx_agent_logs_errors ON agent_logs(success) WHERE success = false;

-- RLS: users can only read their own logs
ALTER TABLE agent_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own agent logs"
  ON agent_logs FOR SELECT
  USING (auth.uid() = user_id);

-- Service role can insert (agents write via service key or anon with no RLS on insert for simplicity)
CREATE POLICY "Allow insert for authenticated users"
  ON agent_logs FOR INSERT
  WITH CHECK (auth.uid() = user_id);
