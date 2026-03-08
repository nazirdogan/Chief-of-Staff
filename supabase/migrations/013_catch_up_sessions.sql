-- Catch-up sessions: tracks each app-launch catch-up run
CREATE TABLE IF NOT EXISTS public.catch_up_sessions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  gap_duration_ms BIGINT NOT NULL,
  gap_category    TEXT NOT NULL CHECK (gap_category IN ('short', 'medium', 'long')),
  total_jobs      INTEGER NOT NULL DEFAULT 0,
  completed_jobs  INTEGER NOT NULL DEFAULT 0,
  failed_jobs     INTEGER NOT NULL DEFAULT 0,
  skipped_jobs    INTEGER NOT NULL DEFAULT 0,
  status          TEXT NOT NULL DEFAULT 'running' CHECK (status IN ('running', 'completed', 'failed', 'cancelled')),
  started_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at    TIMESTAMPTZ,
  job_details     JSONB NOT NULL DEFAULT '[]'::jsonb,

  CONSTRAINT catch_up_sessions_user_fk FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_catch_up_sessions_user ON public.catch_up_sessions (user_id, status);

-- Add catch_up_session_id to heartbeat_runs for tracking which runs were part of a catch-up
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'heartbeat_runs' AND column_name = 'catch_up_session_id'
  ) THEN
    ALTER TABLE public.heartbeat_runs ADD COLUMN catch_up_session_id UUID REFERENCES public.catch_up_sessions(id);
  END IF;
END $$;

-- RLS
ALTER TABLE public.catch_up_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read their own catch-up sessions"
  ON public.catch_up_sessions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage catch-up sessions"
  ON public.catch_up_sessions FOR ALL
  USING (true)
  WITH CHECK (true);
