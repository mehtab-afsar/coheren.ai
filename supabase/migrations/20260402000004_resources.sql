-- Resources table with pgvector embeddings for semantic retrieval (Change 6)
-- Falls back to resourceLibrary.ts when USE_DYNAMIC_RESOURCES is disabled.

CREATE TABLE IF NOT EXISTS resources (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title           text    NOT NULL,
  url             text    NOT NULL,
  type            text    NOT NULL CHECK (type IN ('video','article','interactive','image','pdf','tool','playlist')),
  domain          text    NOT NULL, -- Kinesthetic, Cognitive, Creative, Career, Financial, Health, Lifestyle
  sub_domain      text,             -- e.g. "boxing", "guitar", "python"
  tags            text[]  NOT NULL DEFAULT '{}',
  difficulty_level text   CHECK (difficulty_level IN ('beginner','intermediate','advanced','all')),
  description     text    NOT NULL DEFAULT '',
  why_useful      text    NOT NULL DEFAULT '',
  duration_minutes integer,
  embedding       vector(1024),
  created_at      timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT resources_title_url_unique UNIQUE (title, url)
);

-- Index for fast vector search
CREATE INDEX IF NOT EXISTS resources_embedding_idx
  ON resources USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 100);

-- Full-text search index
CREATE INDEX IF NOT EXISTS resources_fts_idx
  ON resources USING gin(to_tsvector('english', title || ' ' || description || ' ' || coalesce(sub_domain, '')));

-- RLS: resources are public (no user_id — shared library)
ALTER TABLE resources ENABLE ROW LEVEL SECURITY;

CREATE POLICY "resources_select_all" ON resources
  FOR SELECT USING (true);

-- Semantic search function
CREATE OR REPLACE FUNCTION match_resources(
  query_embedding vector(1024),
  match_count     int     DEFAULT 5,
  filter_domain   text    DEFAULT NULL,
  filter_type     text    DEFAULT NULL,
  max_difficulty  text    DEFAULT NULL
)
RETURNS TABLE (
  id               uuid,
  title            text,
  url              text,
  type             text,
  domain           text,
  sub_domain       text,
  tags             text[],
  difficulty_level text,
  description      text,
  why_useful       text,
  duration_minutes integer,
  similarity       float
)
LANGUAGE sql STABLE
AS $$
  SELECT
    r.id, r.title, r.url, r.type, r.domain, r.sub_domain,
    r.tags, r.difficulty_level, r.description, r.why_useful,
    r.duration_minutes,
    1 - (r.embedding <=> query_embedding) AS similarity
  FROM resources r
  WHERE
    (filter_domain  IS NULL OR r.domain = filter_domain)
    AND (filter_type IS NULL OR r.type   = filter_type)
    AND (max_difficulty IS NULL OR r.difficulty_level IN ('beginner', max_difficulty, 'all'))
    AND r.embedding IS NOT NULL
  ORDER BY r.embedding <=> query_embedding
  LIMIT match_count;
$$;
