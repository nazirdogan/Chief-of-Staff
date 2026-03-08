-- Cold-start backfill job tracking
CREATE TABLE IF NOT EXISTS backfill_jobs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'completed', 'failed')),
  current_phase TEXT,
  phase_status TEXT DEFAULT 'pending' CHECK (phase_status IN ('pending', 'running', 'completed', 'failed')),
  progress_pct INTEGER NOT NULL DEFAULT 0 CHECK (progress_pct >= 0 AND progress_pct <= 100),
  phase_details JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ
);

-- Index for fast lookup by user
CREATE INDEX idx_backfill_jobs_user ON backfill_jobs(user_id, status);

-- RLS
ALTER TABLE backfill_jobs ENABLE ROW LEVEL SECURITY;

-- Users can read their own backfill jobs
CREATE POLICY backfill_jobs_select ON backfill_jobs
  FOR SELECT USING (auth.uid() = user_id);

-- Service role can do everything (Trigger.dev jobs use service role)
CREATE POLICY backfill_jobs_service ON backfill_jobs
  FOR ALL USING (true) WITH CHECK (true);
