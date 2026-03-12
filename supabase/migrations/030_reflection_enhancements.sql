-- Add enhanced reflection fields for richer weekly/monthly reflections
-- commitment_stats: {completed, total, completion_rate}
-- screen_time_by_category: {Development: 120, Communications: 45, ...} in minutes
-- strategic_recommendation: one-sentence strategic advice

ALTER TABLE reflections
  ADD COLUMN IF NOT EXISTS commitment_stats JSONB DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS screen_time_by_category JSONB DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS strategic_recommendation TEXT DEFAULT NULL;

-- RLS already covers reflections table from migration 010
