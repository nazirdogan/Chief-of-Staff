-- Activity Sessions: continuous, session-based activity tracking from the desktop observer.
-- Replaces isolated context_chunks as the primary desktop intelligence store.

-- ─── Activity Sessions ──────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.activity_sessions (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,

  -- App context
  app_name          TEXT NOT NULL,
  app_category      TEXT NOT NULL,  -- email, chat, code, terminal, browser, calendar, document, design, unknown
  window_title      TEXT,
  url               TEXT,

  -- Temporal
  started_at        TIMESTAMPTZ NOT NULL,
  ended_at          TIMESTAMPTZ,  -- NULL = still active

  -- Activity metrics
  snapshot_count    INTEGER NOT NULL DEFAULT 1,

  -- AI-extracted summary (updated periodically, not on every snapshot)
  summary           TEXT,

  -- Structured data from app-aware parser (JSONB for flexibility)
  parsed_data       JSONB NOT NULL DEFAULT '{}',

  -- Cross-references
  people            TEXT[] NOT NULL DEFAULT '{}',
  projects          TEXT[] NOT NULL DEFAULT '{}',
  topics            TEXT[] NOT NULL DEFAULT '{}',
  action_items      JSONB NOT NULL DEFAULT '[]',

  -- Importance (set after AI extraction)
  importance        context_importance DEFAULT 'background',
  importance_score  SMALLINT CHECK (importance_score BETWEEN 1 AND 10),

  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.activity_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own activity sessions"
  ON public.activity_sessions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Service role manages activity sessions"
  ON public.activity_sessions FOR ALL
  USING (true)
  WITH CHECK (true);

CREATE INDEX idx_activity_sessions_user_time
  ON public.activity_sessions(user_id, started_at DESC);

CREATE INDEX idx_activity_sessions_user_active
  ON public.activity_sessions(user_id)
  WHERE ended_at IS NULL;

CREATE INDEX idx_activity_sessions_category
  ON public.activity_sessions(user_id, app_category, started_at DESC);

CREATE INDEX idx_activity_sessions_people
  ON public.activity_sessions USING gin(people);

CREATE INDEX idx_activity_sessions_projects
  ON public.activity_sessions USING gin(projects);

-- Trigger for updated_at
CREATE TRIGGER update_activity_sessions_updated_at
  BEFORE UPDATE ON public.activity_sessions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


-- ─── App Transitions (lightweight, no AI) ────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.app_transitions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  from_app        TEXT NOT NULL,
  to_app          TEXT NOT NULL,
  from_category   TEXT NOT NULL,
  to_category     TEXT NOT NULL,
  transitioned_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.app_transitions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own app transitions"
  ON public.app_transitions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Service role manages app transitions"
  ON public.app_transitions FOR ALL
  USING (true)
  WITH CHECK (true);

CREATE INDEX idx_app_transitions_user_time
  ON public.app_transitions(user_id, transitioned_at DESC);


-- ─── Day Narratives (rolling daily summary) ──────────────────────────────────

CREATE TABLE IF NOT EXISTS public.day_narratives (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id               UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  narrative_date        DATE NOT NULL,

  -- Compressed narrative updated every ~15 min
  narrative             TEXT NOT NULL DEFAULT '',

  -- Structured activity counters
  session_count         INTEGER NOT NULL DEFAULT 0,
  email_sessions        INTEGER NOT NULL DEFAULT 0,
  chat_sessions         INTEGER NOT NULL DEFAULT 0,
  code_sessions         INTEGER NOT NULL DEFAULT 0,
  meeting_sessions      INTEGER NOT NULL DEFAULT 0,
  browsing_sessions     INTEGER NOT NULL DEFAULT 0,
  total_active_seconds  INTEGER NOT NULL DEFAULT 0,

  -- Key events extracted throughout the day
  key_events            JSONB NOT NULL DEFAULT '[]',
  people_seen           TEXT[] NOT NULL DEFAULT '{}',
  projects_worked_on    TEXT[] NOT NULL DEFAULT '{}',

  -- Embedding for semantic search of days
  embedding             vector(1536),

  last_updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE(user_id, narrative_date)
);

ALTER TABLE public.day_narratives ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own day narratives"
  ON public.day_narratives FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Service role manages day narratives"
  ON public.day_narratives FOR ALL
  USING (true)
  WITH CHECK (true);

CREATE INDEX idx_day_narratives_user_date
  ON public.day_narratives(user_id, narrative_date DESC);
