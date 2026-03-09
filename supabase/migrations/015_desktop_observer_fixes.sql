-- ============================================================
-- MIGRATION 015: DESKTOP OBSERVER FIXES
-- ============================================================
-- 1. Add 'desktop_observation' to context_chunk_type enum
-- 2. Add updated_at trigger to desktop_sessions table

-- ------------------------------------------------------------
-- 1. Add missing 'desktop_observation' enum value
-- ------------------------------------------------------------
-- The TypeScript type ContextChunkType includes 'desktop_observation'
-- but the PostgreSQL enum did not. This aligns them so desktop
-- observations can be stored with their proper type rather than
-- being mapped to 'slack_conversation' or 'general_note'.
ALTER TYPE context_chunk_type ADD VALUE IF NOT EXISTS 'desktop_observation';

-- ------------------------------------------------------------
-- 2. Add updated_at trigger to desktop_sessions
-- ------------------------------------------------------------
-- The table has an updated_at column but no trigger to auto-update
-- it on row changes, unlike other tables (working_patterns,
-- context_threads, profiles, etc.) which all use the shared
-- update_updated_at_column() function from migration 001.
CREATE TRIGGER update_desktop_sessions_updated_at
  BEFORE UPDATE ON public.desktop_sessions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
