-- Migration 035: Reports table
-- Stores AI-generated reports (weekly summaries, project status, ad-hoc research)

CREATE TABLE IF NOT EXISTS reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  sections JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own reports"
ON reports FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Service role full access on reports"
ON reports FOR ALL
USING (true)
WITH CHECK (true);

CREATE INDEX idx_reports_user ON reports (user_id, created_at DESC);
