-- Sprint Memories Table
-- Stores embedded sprint summaries for longitudinal Agent 5 memory (Item 8).

CREATE TABLE IF NOT EXISTS public.sprint_memories (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  goal_id       UUID REFERENCES public.user_goals(id) ON DELETE CASCADE,
  sprint_number INT NOT NULL,
  content       TEXT NOT NULL,
  embedding     vector(1024),
  metadata      JSONB DEFAULT '{}',
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS sprint_memories_embedding_idx
  ON public.sprint_memories USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 10);

CREATE INDEX IF NOT EXISTS sprint_memories_user_goal_idx
  ON public.sprint_memories(user_id, goal_id);

ALTER TABLE public.sprint_memories ENABLE ROW LEVEL SECURITY;

CREATE POLICY sprint_memories_owner ON public.sprint_memories
  USING (user_id = auth.uid());

-- Match sprint memories by semantic similarity for the authenticated user
CREATE OR REPLACE FUNCTION public.match_sprint_memories(
  query_embedding vector(1024),
  match_count     int DEFAULT 3
)
RETURNS TABLE (
  content    TEXT,
  similarity float,
  metadata   JSONB
)
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    content,
    (1 - (embedding <=> query_embedding))::float AS similarity,
    metadata
  FROM public.sprint_memories
  WHERE user_id = auth.uid()
    AND embedding IS NOT NULL
  ORDER BY embedding <=> query_embedding
  LIMIT match_count;
$$;
