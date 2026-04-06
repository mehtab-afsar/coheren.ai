-- Migration: RAPTOR Hierarchical Index
-- Sprint 5 — build-raptor-index.ts support
--
-- Adds:
--   raptor_level — 0=raw chunk, 1=cluster summary, 2=document summary
--   raptor_source_ids — chunk_ids that were summarized to produce this row

ALTER TABLE knowledge_chunks
  ADD COLUMN IF NOT EXISTS raptor_level       INT  DEFAULT 0,
  ADD COLUMN IF NOT EXISTS raptor_source_ids  TEXT[];

COMMENT ON COLUMN knowledge_chunks.raptor_level IS
  '0 = raw chunk (default), 1 = cluster-level RAPTOR summary, 2 = document-level RAPTOR summary';

COMMENT ON COLUMN knowledge_chunks.raptor_source_ids IS
  'chunk_ids of the raw chunks summarized to produce this RAPTOR node. NULL for raw chunks.';

-- Index for efficient RAPTOR-level queries
CREATE INDEX IF NOT EXISTS knowledge_chunks_raptor_level_idx
  ON knowledge_chunks (raptor_level)
  WHERE raptor_level > 0;
