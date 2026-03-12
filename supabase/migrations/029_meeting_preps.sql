-- Meeting preps table: stores auto-generated and on-demand meeting prep briefs
-- Replaces the JSONB meeting_preps array on the briefings table with a proper relational table

CREATE TABLE IF NOT EXISTS meeting_preps (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  event_id TEXT NOT NULL,
  event_title TEXT NOT NULL,
  event_start TIMESTAMPTZ NOT NULL,
  event_end TIMESTAMPTZ NOT NULL,
  attendees JSONB NOT NULL DEFAULT '[]',
  summary TEXT NOT NULL,
  attendee_context JSONB NOT NULL DEFAULT '[]',
  open_items JSONB NOT NULL DEFAULT '[]',
  suggested_talking_points JSONB NOT NULL DEFAULT '[]',
  watch_out_for TEXT,
  generation_model TEXT,
  generation_ms INTEGER,
  source TEXT NOT NULL DEFAULT 'auto', -- 'auto' or 'on_demand'
  notification_sent BOOLEAN NOT NULL DEFAULT FALSE,
  notification_sent_at TIMESTAMPTZ,
  post_meeting_scan_done BOOLEAN NOT NULL DEFAULT FALSE,
  post_meeting_scan_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Indexes
CREATE INDEX idx_meeting_preps_user_id ON meeting_preps(user_id);
CREATE INDEX idx_meeting_preps_event_start ON meeting_preps(event_start);
CREATE UNIQUE INDEX idx_meeting_preps_user_event ON meeting_preps(user_id, event_id);

-- RLS
ALTER TABLE meeting_preps ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own meeting preps"
  ON meeting_preps FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own meeting preps"
  ON meeting_preps FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own meeting preps"
  ON meeting_preps FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own meeting preps"
  ON meeting_preps FOR DELETE
  USING (auth.uid() = user_id);

-- Service role bypass for background jobs
CREATE POLICY "Service role full access to meeting_preps"
  ON meeting_preps FOR ALL
  USING (auth.role() = 'service_role');

-- Add view_meeting_prep to pending_actions action_type if using a check constraint
-- (No constraint exists currently — PendingActionType is enforced in TypeScript)
