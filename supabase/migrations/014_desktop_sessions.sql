-- Desktop sessions: tracks heartbeat from the Tauri desktop app
-- One row per user, upserted on each heartbeat ping (every 60s)
CREATE TABLE IF NOT EXISTS desktop_sessions (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  observer_running BOOLEAN NOT NULL DEFAULT false,
  observation_count INTEGER NOT NULL DEFAULT 0,
  app_version TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- RLS: users can only see their own desktop session
ALTER TABLE desktop_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own desktop session"
  ON desktop_sessions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own desktop session"
  ON desktop_sessions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own desktop session"
  ON desktop_sessions FOR UPDATE
  USING (auth.uid() = user_id);

-- Service role needs full access for the heartbeat API (uses service client)
-- Service role bypasses RLS by default, so no additional policy needed.

-- Index for quick lookups
CREATE INDEX IF NOT EXISTS idx_desktop_sessions_last_seen
  ON desktop_sessions (last_seen_at DESC);
