-- ============================================================
-- MIGRATION 008: CONTEXT MEMORY SYSTEM
-- ============================================================

-- ENUM: Context chunk types
CREATE TYPE context_chunk_type AS ENUM (
  'email_thread',
  'calendar_event',
  'document_edit',
  'slack_conversation',
  'task_update',
  'code_activity',
  'crm_activity',
  'file_activity',
  'general_note'
);

-- ENUM: Context importance
CREATE TYPE context_importance AS ENUM (
  'critical',
  'important',
  'background',
  'noise'
);

-- ------------------------------------------------------------
-- CONTEXT_CHUNKS — Donna's long-term memory
-- ------------------------------------------------------------
CREATE TABLE public.context_chunks (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,

  -- Source tracing
  provider          TEXT NOT NULL,
  source_id         TEXT NOT NULL,
  source_ref        JSONB NOT NULL,
  thread_id         TEXT,

  -- Content
  chunk_type        context_chunk_type NOT NULL,
  title             TEXT,
  content_summary   TEXT NOT NULL,
  raw_content_hash  TEXT NOT NULL,
  entities          JSONB NOT NULL DEFAULT '{}',
  sentiment         TEXT CHECK (sentiment IN ('positive', 'negative', 'neutral', 'urgent')),

  -- Classification
  importance        context_importance NOT NULL DEFAULT 'background',
  importance_score  SMALLINT CHECK (importance_score BETWEEN 1 AND 10),
  topics            TEXT[] NOT NULL DEFAULT '{}',
  projects          TEXT[] NOT NULL DEFAULT '{}',
  people            TEXT[] NOT NULL DEFAULT '{}',

  -- Embeddings
  embedding         vector(1536) NOT NULL,

  -- Temporal
  occurred_at       TIMESTAMPTZ NOT NULL,
  captured_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at        TIMESTAMPTZ,

  -- Dedup
  UNIQUE(user_id, provider, source_id)
);

ALTER TABLE public.context_chunks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own context chunks" ON public.context_chunks
  FOR ALL USING (auth.uid() = user_id);

-- Indexes for fast querying
CREATE INDEX idx_context_chunks_user_time ON public.context_chunks(user_id, occurred_at DESC);
CREATE INDEX idx_context_chunks_user_type ON public.context_chunks(user_id, chunk_type);
CREATE INDEX idx_context_chunks_user_importance ON public.context_chunks(user_id, importance);
CREATE INDEX idx_context_chunks_topics ON public.context_chunks USING gin(topics);
CREATE INDEX idx_context_chunks_projects ON public.context_chunks USING gin(projects);
CREATE INDEX idx_context_chunks_people ON public.context_chunks USING gin(people);
CREATE INDEX idx_context_chunks_thread ON public.context_chunks(user_id, thread_id) WHERE thread_id IS NOT NULL;
CREATE INDEX idx_context_chunks_expiry ON public.context_chunks(expires_at) WHERE expires_at IS NOT NULL;

-- Vector similarity search index
CREATE INDEX idx_context_chunks_embedding ON public.context_chunks
  USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 200);

-- ------------------------------------------------------------
-- WORKING_PATTERNS — Donna's understanding of user habits
-- ------------------------------------------------------------
CREATE TABLE public.working_patterns (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,

  -- Time patterns
  typical_start_time    TIME,
  typical_end_time      TIME,
  peak_hours            JSONB NOT NULL DEFAULT '[]',
  active_days           INT[] NOT NULL DEFAULT '{1,2,3,4,5}',

  -- Communication patterns
  avg_emails_per_day        NUMERIC(6,1) DEFAULT 0,
  avg_slack_messages_per_day NUMERIC(6,1) DEFAULT 0,
  avg_meetings_per_day      NUMERIC(4,1) DEFAULT 0,
  response_time_p50_minutes NUMERIC(8,1),
  response_time_p90_minutes NUMERIC(8,1),
  busiest_day_of_week       SMALLINT,
  quietest_day_of_week      SMALLINT,

  -- Focus patterns
  deep_work_windows         JSONB NOT NULL DEFAULT '[]',
  meeting_heavy_days        INT[] NOT NULL DEFAULT '{}',
  context_switch_frequency  NUMERIC(4,1),

  -- Project activity
  active_projects_ranked    JSONB NOT NULL DEFAULT '[]',
  top_collaborators         JSONB NOT NULL DEFAULT '[]',

  -- Working style insights (AI-generated)
  working_style_summary     TEXT,
  recent_changes            TEXT,

  -- Meta
  analysis_window_days      INTEGER NOT NULL DEFAULT 30,
  last_analyzed_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at                TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at                TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE(user_id)
);

ALTER TABLE public.working_patterns ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own working patterns" ON public.working_patterns
  FOR SELECT USING (auth.uid() = user_id);

-- Service role policy for background jobs (uses service_role key, bypasses RLS by default,
-- but we add an explicit policy for clarity)
CREATE POLICY "Service role can manage working patterns" ON public.working_patterns
  FOR ALL USING (auth.jwt() ->> 'role' = 'service_role')
  WITH CHECK (auth.jwt() ->> 'role' = 'service_role');

-- ------------------------------------------------------------
-- CONTEXT_THREADS — Groups related context chunks
-- ------------------------------------------------------------
CREATE TABLE public.context_threads (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  thread_key      TEXT NOT NULL,
  title           TEXT NOT NULL,
  summary         TEXT,
  last_chunk_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  chunk_count     INTEGER NOT NULL DEFAULT 0,
  participants    TEXT[] NOT NULL DEFAULT '{}',
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, thread_key)
);

ALTER TABLE public.context_threads ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own context threads" ON public.context_threads
  FOR ALL USING (auth.uid() = user_id);

CREATE INDEX idx_context_threads_user_active ON public.context_threads(user_id, is_active, last_chunk_at DESC);

-- ------------------------------------------------------------
-- MEMORY_SNAPSHOTS — Daily summaries
-- ------------------------------------------------------------
CREATE TABLE public.memory_snapshots (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  snapshot_date     DATE NOT NULL,

  -- Activity summary
  emails_received       INTEGER NOT NULL DEFAULT 0,
  emails_sent           INTEGER NOT NULL DEFAULT 0,
  slack_messages        INTEGER NOT NULL DEFAULT 0,
  meetings_attended     INTEGER NOT NULL DEFAULT 0,
  tasks_completed       INTEGER NOT NULL DEFAULT 0,
  documents_edited      INTEGER NOT NULL DEFAULT 0,
  code_prs_opened       INTEGER NOT NULL DEFAULT 0,

  -- AI-generated narrative
  day_narrative         TEXT NOT NULL,
  key_decisions         JSONB NOT NULL DEFAULT '[]',
  open_loops            JSONB NOT NULL DEFAULT '[]',
  notable_interactions  JSONB NOT NULL DEFAULT '[]',

  -- Embedding for semantic search across days
  embedding             vector(1536),

  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, snapshot_date)
);

ALTER TABLE public.memory_snapshots ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own memory snapshots" ON public.memory_snapshots
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage memory snapshots" ON public.memory_snapshots
  FOR ALL USING (auth.jwt() ->> 'role' = 'service_role')
  WITH CHECK (auth.jwt() ->> 'role' = 'service_role');

-- Vector search function for context chunks
CREATE OR REPLACE FUNCTION match_context_chunks(
  query_embedding vector(1536),
  match_user_id uuid,
  match_threshold float DEFAULT 0.72,
  match_count int DEFAULT 20,
  filter_type context_chunk_type DEFAULT NULL,
  filter_importance context_importance DEFAULT NULL,
  filter_after timestamptz DEFAULT NULL
)
RETURNS TABLE (
  id uuid,
  provider text,
  source_id text,
  chunk_type context_chunk_type,
  title text,
  content_summary text,
  entities jsonb,
  importance context_importance,
  topics text[],
  projects text[],
  people text[],
  occurred_at timestamptz,
  source_ref jsonb,
  similarity float
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    cc.id,
    cc.provider,
    cc.source_id,
    cc.chunk_type,
    cc.title,
    cc.content_summary,
    cc.entities,
    cc.importance,
    cc.topics,
    cc.projects,
    cc.people,
    cc.occurred_at,
    cc.source_ref,
    1 - (cc.embedding <=> query_embedding) AS similarity
  FROM public.context_chunks cc
  WHERE cc.user_id = match_user_id
    AND (cc.expires_at IS NULL OR cc.expires_at > NOW())
    AND 1 - (cc.embedding <=> query_embedding) > match_threshold
    AND (filter_type IS NULL OR cc.chunk_type = filter_type)
    AND (filter_importance IS NULL OR cc.importance = filter_importance)
    AND (filter_after IS NULL OR cc.occurred_at >= filter_after)
  ORDER BY cc.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- Updated_at triggers
CREATE TRIGGER update_working_patterns_updated_at
  BEFORE UPDATE ON public.working_patterns
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_context_threads_updated_at
  BEFORE UPDATE ON public.context_threads
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
