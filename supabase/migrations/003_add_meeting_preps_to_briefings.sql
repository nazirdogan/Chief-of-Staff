-- Add meeting_preps JSONB column to briefings table
-- Stores per-event meeting prep briefs generated during briefing creation
ALTER TABLE public.briefings
  ADD COLUMN meeting_preps JSONB DEFAULT '[]'::jsonb;

COMMENT ON COLUMN public.briefings.meeting_preps IS
  'Array of meeting prep briefs, one per calendar event. Each contains attendee_context, open_items, and suggested_talking_points with source citations.';
