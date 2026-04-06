-- Pipeline Checkpoints — post-auth observability only.
-- Primary storage is localStorage (works pre-auth).
-- This table is populated optionally after the user signs up.

CREATE TABLE IF NOT EXISTS pipeline_checkpoints (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id     UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  pipeline_id TEXT NOT NULL,
  agent_key   TEXT NOT NULL,
  output      JSONB,
  completed_at TIMESTAMPTZ DEFAULT now(),
  expires_at  TIMESTAMPTZ NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_pipeline_checkpoints_pipeline_key
  ON pipeline_checkpoints(pipeline_id, agent_key);

-- RLS: users can only read/write their own checkpoints
ALTER TABLE pipeline_checkpoints ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own pipeline checkpoints"
  ON pipeline_checkpoints
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
