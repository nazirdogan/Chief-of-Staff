-- Add structured_summary column to day_narratives for LittleBird-style categorized output
ALTER TABLE day_narratives ADD COLUMN IF NOT EXISTS structured_summary JSONB;

COMMENT ON COLUMN day_narratives.structured_summary IS 'Categorized bullet-point summary by activity type (Development, Communications, etc.)';
