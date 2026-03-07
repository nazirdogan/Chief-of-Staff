-- ============================================================
-- 005: Operations Layer — Morning Operations System
-- Adds tables for overnight automations, AM Sweep, subagent
-- dispatch, transit events, time blocks, and user ops config.
-- ============================================================

-- Task classification metadata on inbox_items
ALTER TABLE public.inbox_items ADD COLUMN IF NOT EXISTS operation_category TEXT CHECK (operation_category IN ('green', 'yellow', 'red', 'gray'));
ALTER TABLE public.inbox_items ADD COLUMN IF NOT EXISTS operation_context JSONB DEFAULT '{}';
ALTER TABLE public.inbox_items ADD COLUMN IF NOT EXISTS estimated_duration_minutes INTEGER;
ALTER TABLE public.inbox_items ADD COLUMN IF NOT EXISTS task_tags TEXT[] DEFAULT '{}';
ALTER TABLE public.inbox_items ADD COLUMN IF NOT EXISTS task_title TEXT;
ALTER TABLE public.inbox_items ADD COLUMN IF NOT EXISTS deferred_to DATE;
ALTER TABLE public.inbox_items ADD COLUMN IF NOT EXISTS defer_reason TEXT;

-- ------------------------------------------------------------
-- OPERATION_RUNS
-- Tracks each execution of an operations pipeline step.
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.operation_runs (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  run_type      TEXT NOT NULL CHECK (run_type IN ('overnight_email', 'overnight_calendar', 'am_sweep', 'time_block')),
  status        TEXT NOT NULL DEFAULT 'running' CHECK (status IN ('running', 'completed', 'failed')),
  started_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at  TIMESTAMPTZ,
  result        JSONB DEFAULT '{}',
  error         TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.operation_runs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can only see their own operation runs"
  ON public.operation_runs FOR ALL USING (auth.uid() = user_id);

-- ------------------------------------------------------------
-- SUBAGENT_RUNS
-- Tracks each subagent execution within an AM Sweep run.
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.subagent_runs (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  operation_run_id  UUID NOT NULL REFERENCES public.operation_runs(id) ON DELETE CASCADE,
  user_id           UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  agent_type        TEXT NOT NULL CHECK (agent_type IN ('email_drafter', 'notes_updater', 'meeting_scheduler', 'researcher', 'task_executor', 'prep_agent')),
  task_ids          UUID[] DEFAULT '{}',
  status            TEXT NOT NULL DEFAULT 'running' CHECK (status IN ('running', 'completed', 'failed')),
  started_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at      TIMESTAMPTZ,
  result            JSONB DEFAULT '{}',
  error             TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.subagent_runs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can only see their own subagent runs"
  ON public.subagent_runs FOR ALL USING (auth.uid() = user_id);

-- ------------------------------------------------------------
-- TRANSIT_EVENTS
-- Drive-time buffer events calculated overnight.
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.transit_events (
  id                        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                   UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  calendar_event_id         TEXT NOT NULL,
  origin_location           TEXT,
  destination_location      TEXT,
  drive_duration_seconds    INTEGER NOT NULL,
  departure_time            TIMESTAMPTZ NOT NULL,
  arrival_time              TIMESTAMPTZ NOT NULL,
  google_calendar_event_id  TEXT,
  created_at                TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.transit_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can only see their own transit events"
  ON public.transit_events FOR ALL USING (auth.uid() = user_id);

-- ------------------------------------------------------------
-- TIME_BLOCKS
-- Proposed and confirmed time-blocked schedule entries.
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.time_blocks (
  id                        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                   UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  operation_run_id          UUID REFERENCES public.operation_runs(id),
  task_id                   UUID,
  title                     TEXT NOT NULL,
  start_time                TIMESTAMPTZ NOT NULL,
  end_time                  TIMESTAMPTZ NOT NULL,
  block_type                TEXT NOT NULL CHECK (block_type IN ('task', 'errand_batch', 'deep_work', 'exercise', 'transit', 'buffer')),
  location                  TEXT,
  google_calendar_event_id  TEXT,
  status                    TEXT NOT NULL DEFAULT 'proposed' CHECK (status IN ('proposed', 'confirmed', 'completed', 'skipped')),
  created_at                TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.time_blocks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can only see their own time blocks"
  ON public.time_blocks FOR ALL USING (auth.uid() = user_id);

-- ------------------------------------------------------------
-- USER_OPERATIONS_CONFIG
-- Per-user preferences for the operations layer.
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.user_operations_config (
  user_id                     UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  overnight_enabled           BOOLEAN DEFAULT true,
  overnight_run_time          TIME DEFAULT '05:30',
  home_tasks_after            TIME DEFAULT '19:00',
  exercise_days               INTEGER[] DEFAULT '{1,3,5}',
  exercise_duration_minutes   INTEGER DEFAULT 60,
  default_buffer_minutes      INTEGER DEFAULT 10,
  deep_work_preferred_time    TEXT DEFAULT 'morning',
  errand_batch_enabled        BOOLEAN DEFAULT true,
  home_address                TEXT,
  office_address              TEXT,
  created_at                  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at                  TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.user_operations_config ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can only see their own operations config"
  ON public.user_operations_config FOR ALL USING (auth.uid() = user_id);

-- Updated_at trigger for user_operations_config
CREATE TRIGGER update_user_operations_config_updated_at
  BEFORE UPDATE ON public.user_operations_config
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================
-- INDEXES
-- ============================================================
CREATE INDEX idx_operation_runs_user_type ON public.operation_runs(user_id, run_type, started_at DESC);
CREATE INDEX idx_subagent_runs_operation ON public.subagent_runs(operation_run_id);
CREATE INDEX idx_subagent_runs_user ON public.subagent_runs(user_id, started_at DESC);
CREATE INDEX idx_transit_events_user_date ON public.transit_events(user_id, departure_time);
CREATE INDEX idx_time_blocks_user_date ON public.time_blocks(user_id, start_time);
CREATE INDEX idx_inbox_items_operation ON public.inbox_items(user_id, operation_category) WHERE operation_category IS NOT NULL;
