-- Add score_history to contacts for relationship trajectory tracking
-- Stores last 3 scores as JSONB array: [{ score: number, recorded_at: string }]
ALTER TABLE contacts
ADD COLUMN IF NOT EXISTS score_history JSONB DEFAULT '[]'::jsonb;

-- Index for querying contacts with declining scores
CREATE INDEX IF NOT EXISTS idx_contacts_score_history
ON contacts USING gin (score_history);
