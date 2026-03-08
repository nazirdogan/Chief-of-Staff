-- Migration 010: Add sentiment flags to inbox/briefing items + reflections table
-- Sentiment is already extracted during ingestion but discarded. This wires it through.

-- ── Sentiment on inbox_items ──
ALTER TABLE public.inbox_items
  ADD COLUMN IF NOT EXISTS sentiment TEXT
    CHECK (sentiment IN ('positive', 'negative', 'neutral', 'urgent'))
    DEFAULT 'neutral';

-- ── Sentiment on briefing_items ──
ALTER TABLE public.briefing_items
  ADD COLUMN IF NOT EXISTS sentiment TEXT
    CHECK (sentiment IN ('positive', 'negative', 'neutral', 'urgent'));

-- ── Reflections table (weekly + monthly) ──
CREATE TABLE IF NOT EXISTS public.reflections (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reflection_type TEXT NOT NULL CHECK (reflection_type IN ('weekly', 'monthly')),
  period_start    DATE NOT NULL,
  period_end      DATE NOT NULL,
  summary         TEXT NOT NULL,
  accomplishments JSONB NOT NULL DEFAULT '[]',
  slipped_items   JSONB NOT NULL DEFAULT '[]',
  relationship_highlights JSONB NOT NULL DEFAULT '[]',
  patterns        JSONB NOT NULL DEFAULT '[]',
  recommendations TEXT,
  generation_model TEXT,
  generation_ms   INTEGER,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for fast user+type+period lookups
CREATE INDEX IF NOT EXISTS idx_reflections_user_type
  ON public.reflections (user_id, reflection_type, period_start DESC);

-- RLS on reflections
ALTER TABLE public.reflections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own reflections"
  ON public.reflections FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Service role can insert reflections"
  ON public.reflections FOR INSERT
  WITH CHECK (true);
