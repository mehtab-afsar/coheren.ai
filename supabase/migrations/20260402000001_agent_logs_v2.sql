-- Agent Logs v2 — additive columns for Agent Harness v2 (5.8)
-- All columns nullable: zero backfill needed.

ALTER TABLE agent_logs
  ADD COLUMN IF NOT EXISTS pipeline_id        TEXT,
  ADD COLUMN IF NOT EXISTS wave               SMALLINT,
  ADD COLUMN IF NOT EXISTS input_tokens       INT,
  ADD COLUMN IF NOT EXISTS output_tokens      INT,
  ADD COLUMN IF NOT EXISTS checkpoint_restored BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS context_size_tokens INT;

-- Index for querying all agents within a pipeline run
CREATE INDEX IF NOT EXISTS idx_agent_logs_pipeline_id ON agent_logs(pipeline_id);
