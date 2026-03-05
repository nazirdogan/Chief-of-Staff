-- ============================================================
-- EXTENSIONS
-- ============================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "vector";
CREATE EXTENSION IF NOT EXISTS "pg_cron";

-- ============================================================
-- ENUMS
-- ============================================================

CREATE TYPE integration_provider AS ENUM (
  'gmail',
  'google_calendar',
  'google_drive',
  'outlook',
  'microsoft_calendar',
  'onedrive',
  'slack',
  'notion',
  'telegram',
  'whatsapp',
  'todoist',
  'linear',
  'hubspot',
  'salesforce'
);

CREATE TYPE integration_status AS ENUM (
  'connected',
  'disconnected',
  'error',
  'pending'
);

CREATE TYPE briefing_item_type AS ENUM (
  'email',
  'calendar_event',
  'commitment',
  'relationship_alert',
  'document',
  'task',
  'slack_message'
);

CREATE TYPE briefing_item_section AS ENUM (
  'priority_inbox',
  'commitment_queue',
  'at_risk',
  'todays_schedule',
  'decision_queue',
  'quick_wins',
  'people_context'
);

CREATE TYPE commitment_status AS ENUM (
  'open',
  'resolved',
  'snoozed',
  'dismissed',
  'delegated'
);

CREATE TYPE commitment_confidence AS ENUM (
  'high',    -- score 8-10
  'medium',  -- score 6-7
  'low'      -- score 4-5 (review tray only)
);

CREATE TYPE pending_action_type AS ENUM (
  'send_email',
  'send_message',
  'create_task',
  'reschedule_meeting',
  'create_calendar_event',
  'update_notion_page'
);

CREATE TYPE pending_action_status AS ENUM (
  'awaiting_confirmation',
  'confirmed',
  'rejected',
  'executed',
  'failed'
);

CREATE TYPE message_delivery_channel AS ENUM (
  'telegram',
  'whatsapp',
  'in_app',
  'sms'
);

CREATE TYPE heartbeat_frequency AS ENUM (
  'realtime',    -- every 15 min (Power)
  'hourly',      -- every 60 min (Pro)
  'daily'        -- once daily (Free)
);

CREATE TYPE data_region AS ENUM (
  'me-south-1',   -- UAE/Middle East (default)
  'eu-central-1', -- EU Frankfurt
  'us-east-1'     -- US Virginia
);

CREATE TYPE subscription_tier AS ENUM (
  'free',
  'pro',
  'power',
  'team'
);

-- ============================================================
-- TABLES
-- ============================================================

-- ------------------------------------------------------------
-- PROFILES
-- Extension of Supabase auth.users. Created automatically
-- on user signup via trigger.
-- ------------------------------------------------------------
CREATE TABLE public.profiles (
  id                    UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email                 TEXT NOT NULL,
  full_name             TEXT,
  avatar_url            TEXT,
  subscription_tier     subscription_tier NOT NULL DEFAULT 'free',
  subscription_ends_at  TIMESTAMPTZ,
  timezone              TEXT NOT NULL DEFAULT 'Asia/Dubai',
  data_region           data_region NOT NULL DEFAULT 'me-south-1',
  briefing_time         TIME NOT NULL DEFAULT '07:30:00',
  primary_channel       message_delivery_channel NOT NULL DEFAULT 'in_app',
  telegram_chat_id      TEXT,
  whatsapp_number       TEXT,
  onboarding_completed  BOOLEAN NOT NULL DEFAULT FALSE,
  privacy_mode          BOOLEAN NOT NULL DEFAULT FALSE,
  two_factor_enabled    BOOLEAN NOT NULL DEFAULT FALSE,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Trigger: auto-create profile on auth.users insert
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'full_name'
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

-- ------------------------------------------------------------
-- ONBOARDING_DATA
-- ------------------------------------------------------------
CREATE TABLE public.onboarding_data (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id       UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  vip_contacts  TEXT[] NOT NULL DEFAULT '{}',
  active_projects TEXT[] NOT NULL DEFAULT '{}',
  weekly_priority TEXT,
  completed_at  TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.onboarding_data ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own onboarding data" ON public.onboarding_data
  FOR ALL USING (auth.uid() = user_id);

-- ------------------------------------------------------------
-- USER_INTEGRATIONS
-- OAuth tokens are NEVER stored here — they live in Nango.
-- ------------------------------------------------------------
CREATE TABLE public.user_integrations (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id           UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  provider          integration_provider NOT NULL,
  status            integration_status NOT NULL DEFAULT 'pending',
  nango_connection_id TEXT NOT NULL,
  account_email     TEXT,
  account_name      TEXT,
  granted_scopes    TEXT[] NOT NULL DEFAULT '{}',
  last_synced_at    TIMESTAMPTZ,
  error_message     TEXT,
  connected_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, provider)
);

ALTER TABLE public.user_integrations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own integrations" ON public.user_integrations
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own integrations" ON public.user_integrations
  FOR ALL USING (auth.uid() = user_id);

-- ------------------------------------------------------------
-- INTEGRATION_AUDIT_LOG
-- Immutable log of every API call made on behalf of a user.
-- ------------------------------------------------------------
CREATE TABLE public.integration_audit_log (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id       UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  provider      integration_provider NOT NULL,
  action        TEXT NOT NULL,
  status_code   INTEGER,
  request_size  INTEGER,
  response_size INTEGER,
  duration_ms   INTEGER,
  ip_address    INET,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.integration_audit_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own audit log" ON public.integration_audit_log
  FOR SELECT USING (auth.uid() = user_id);

-- ------------------------------------------------------------
-- BRIEFINGS
-- ------------------------------------------------------------
CREATE TABLE public.briefings (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id           UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  briefing_date     DATE NOT NULL,
  generated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  delivered_at      TIMESTAMPTZ,
  delivery_channel  message_delivery_channel,
  item_count        INTEGER NOT NULL DEFAULT 0,
  generation_model  TEXT,
  generation_ms     INTEGER,
  UNIQUE(user_id, briefing_date)
);

ALTER TABLE public.briefings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own briefings" ON public.briefings
  FOR SELECT USING (auth.uid() = user_id);

-- ------------------------------------------------------------
-- BRIEFING_ITEMS
-- source_ref is REQUIRED — no item without a source.
-- ------------------------------------------------------------
CREATE TABLE public.briefing_items (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  briefing_id       UUID NOT NULL REFERENCES public.briefings(id) ON DELETE CASCADE,
  user_id           UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  rank              INTEGER NOT NULL,
  section           briefing_item_section NOT NULL,
  item_type         briefing_item_type NOT NULL,
  title             TEXT NOT NULL,
  summary           TEXT NOT NULL,
  reasoning         TEXT NOT NULL,
  source_ref        JSONB NOT NULL,
  action_suggestion TEXT,
  urgency_score     SMALLINT CHECK (urgency_score BETWEEN 1 AND 10),
  importance_score  SMALLINT CHECK (importance_score BETWEEN 1 AND 10),
  risk_score        SMALLINT CHECK (risk_score BETWEEN 1 AND 10),
  composite_score   NUMERIC(4,2),
  user_feedback     SMALLINT CHECK (user_feedback IN (-1, 1)),
  feedback_at       TIMESTAMPTZ,
  snoozed_until     TIMESTAMPTZ,
  actioned_at       TIMESTAMPTZ,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.briefing_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own briefing items" ON public.briefing_items
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update own briefing items" ON public.briefing_items
  FOR UPDATE USING (auth.uid() = user_id);

-- ------------------------------------------------------------
-- COMMITMENTS
-- source_quote is REQUIRED — always show what was said.
-- ------------------------------------------------------------
CREATE TABLE public.commitments (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id           UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  recipient_email   TEXT NOT NULL,
  recipient_name    TEXT,
  commitment_text   TEXT NOT NULL,
  source_quote      TEXT NOT NULL,
  source_ref        JSONB NOT NULL,
  confidence        commitment_confidence NOT NULL,
  confidence_score  SMALLINT NOT NULL CHECK (confidence_score BETWEEN 1 AND 10),
  implied_deadline  DATE,
  explicit_deadline BOOLEAN NOT NULL DEFAULT FALSE,
  status            commitment_status NOT NULL DEFAULT 'open',
  resolved_at       TIMESTAMPTZ,
  resolved_via_ref  JSONB,
  snoozed_until     TIMESTAMPTZ,
  delegated_to      TEXT,
  user_confirmed    BOOLEAN,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.commitments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own commitments" ON public.commitments
  FOR ALL USING (auth.uid() = user_id);

-- ------------------------------------------------------------
-- CONTACTS
-- ------------------------------------------------------------
CREATE TABLE public.contacts (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id               UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  email                 TEXT NOT NULL,
  name                  TEXT,
  organisation          TEXT,
  is_vip                BOOLEAN NOT NULL DEFAULT FALSE,
  relationship_score    SMALLINT CHECK (relationship_score BETWEEN 0 AND 100),
  first_interaction_at  TIMESTAMPTZ,
  last_interaction_at   TIMESTAMPTZ,
  last_interaction_channel TEXT,
  interaction_count_30d INTEGER NOT NULL DEFAULT 0,
  avg_response_time_hours NUMERIC(8,2),
  open_commitments_count INTEGER NOT NULL DEFAULT 0,
  context_notes         TEXT,
  context_notes_updated_at TIMESTAMPTZ,
  user_notes            TEXT,
  is_cold               BOOLEAN NOT NULL DEFAULT FALSE,
  cold_flagged_at       TIMESTAMPTZ,
  UNIQUE(user_id, email)
);

ALTER TABLE public.contacts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own contacts" ON public.contacts
  FOR ALL USING (auth.uid() = user_id);

-- ------------------------------------------------------------
-- CONTACT_INTERACTIONS
-- ------------------------------------------------------------
CREATE TABLE public.contact_interactions (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id       UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  contact_id    UUID NOT NULL REFERENCES public.contacts(id) ON DELETE CASCADE,
  direction     TEXT NOT NULL CHECK (direction IN ('inbound', 'outbound')),
  channel       TEXT NOT NULL,
  message_ref   JSONB NOT NULL,
  subject       TEXT,
  interacted_at TIMESTAMPTZ NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.contact_interactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own interactions" ON public.contact_interactions
  FOR SELECT USING (auth.uid() = user_id);

-- ------------------------------------------------------------
-- PENDING_ACTIONS
-- NOTHING is written to external services without a confirmed record here.
-- ------------------------------------------------------------
CREATE TABLE public.pending_actions (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id           UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  action_type       pending_action_type NOT NULL,
  status            pending_action_status NOT NULL DEFAULT 'awaiting_confirmation',
  payload           JSONB NOT NULL,
  source_context    JSONB,
  briefing_item_id  UUID REFERENCES public.briefing_items(id),
  confirmed_at      TIMESTAMPTZ,
  rejected_at       TIMESTAMPTZ,
  executed_at       TIMESTAMPTZ,
  execution_result  JSONB,
  expires_at        TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '24 hours'),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.pending_actions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own pending actions" ON public.pending_actions
  FOR ALL USING (auth.uid() = user_id);

-- ------------------------------------------------------------
-- HEARTBEAT_CONFIG
-- ------------------------------------------------------------
CREATE TABLE public.heartbeat_config (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id               UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE UNIQUE,
  scan_frequency        heartbeat_frequency NOT NULL DEFAULT 'daily',
  vip_alerts_enabled    BOOLEAN NOT NULL DEFAULT TRUE,
  commitment_check_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  relationship_check_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  document_index_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  quiet_hours_start     TIME NOT NULL DEFAULT '22:00:00',
  quiet_hours_end       TIME NOT NULL DEFAULT '07:00:00',
  alert_channel         message_delivery_channel NOT NULL DEFAULT 'in_app',
  custom_rules          JSONB NOT NULL DEFAULT '[]',
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.heartbeat_config ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own heartbeat config" ON public.heartbeat_config
  FOR ALL USING (auth.uid() = user_id);

-- ------------------------------------------------------------
-- HEARTBEAT_RUNS
-- ------------------------------------------------------------
CREATE TABLE public.heartbeat_runs (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id         UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  job_name        TEXT NOT NULL,
  provider        integration_provider,
  status          TEXT NOT NULL CHECK (status IN ('running', 'completed', 'failed')),
  items_processed INTEGER,
  items_found     INTEGER,
  duration_ms     INTEGER,
  error_message   TEXT,
  started_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at    TIMESTAMPTZ
);

ALTER TABLE public.heartbeat_runs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own heartbeat runs" ON public.heartbeat_runs
  FOR SELECT USING (auth.uid() = user_id);

-- ------------------------------------------------------------
-- DOCUMENT_CHUNKS
-- ------------------------------------------------------------
CREATE TABLE public.document_chunks (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id         UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  provider        TEXT NOT NULL,
  source_id       TEXT NOT NULL,
  chunk_index     INTEGER NOT NULL,
  content_summary TEXT NOT NULL,
  embedding       vector(1536) NOT NULL,
  metadata        JSONB NOT NULL DEFAULT '{}',
  expires_at      TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '90 days'),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, provider, source_id, chunk_index)
);

ALTER TABLE public.document_chunks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own document chunks" ON public.document_chunks
  FOR ALL USING (auth.uid() = user_id);

-- Vector similarity search index
CREATE INDEX ON public.document_chunks
  USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 100);

-- ------------------------------------------------------------
-- INBOX_ITEMS
-- Raw message content is NOT stored — only metadata and summaries.
-- ------------------------------------------------------------
CREATE TABLE public.inbox_items (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id           UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  provider          integration_provider NOT NULL,
  external_id       TEXT NOT NULL,
  thread_id         TEXT,
  from_email        TEXT NOT NULL,
  from_name         TEXT,
  subject           TEXT,
  ai_summary        TEXT,
  is_read           BOOLEAN NOT NULL DEFAULT FALSE,
  is_starred        BOOLEAN NOT NULL DEFAULT FALSE,
  is_archived       BOOLEAN NOT NULL DEFAULT FALSE,
  needs_reply       BOOLEAN NOT NULL DEFAULT FALSE,
  reply_drafted     BOOLEAN NOT NULL DEFAULT FALSE,
  urgency_score     SMALLINT CHECK (urgency_score BETWEEN 1 AND 10),
  received_at       TIMESTAMPTZ NOT NULL,
  snoozed_until     TIMESTAMPTZ,
  actioned_at       TIMESTAMPTZ,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, provider, external_id)
);

ALTER TABLE public.inbox_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own inbox items" ON public.inbox_items
  FOR ALL USING (auth.uid() = user_id);

-- ------------------------------------------------------------
-- TELEGRAM_SESSIONS
-- ------------------------------------------------------------
CREATE TABLE public.telegram_sessions (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id         UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  chat_id         TEXT NOT NULL UNIQUE,
  username        TEXT,
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  last_message_at TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.telegram_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own telegram sessions" ON public.telegram_sessions
  FOR SELECT USING (auth.uid() = user_id);

-- ------------------------------------------------------------
-- USER_SESSIONS
-- ------------------------------------------------------------
CREATE TABLE public.user_sessions (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id         UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  session_token   TEXT NOT NULL UNIQUE,
  device_name     TEXT,
  device_type     TEXT,
  ip_address      INET,
  last_active_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  revoked_at      TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.user_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own sessions" ON public.user_sessions
  FOR ALL USING (auth.uid() = user_id);

-- ============================================================
-- INDEXES
-- ============================================================

CREATE INDEX idx_briefing_items_briefing_id ON public.briefing_items(briefing_id);
CREATE INDEX idx_briefing_items_user_date ON public.briefing_items(user_id, created_at DESC);
CREATE INDEX idx_commitments_user_status ON public.commitments(user_id, status, implied_deadline);
CREATE INDEX idx_commitments_recipient ON public.commitments(user_id, recipient_email);
CREATE INDEX idx_contacts_user_vip ON public.contacts(user_id, is_vip);
CREATE INDEX idx_contacts_last_interaction ON public.contacts(user_id, last_interaction_at DESC);
CREATE INDEX idx_inbox_items_user_provider ON public.inbox_items(user_id, provider, received_at DESC);
CREATE INDEX idx_inbox_items_needs_reply ON public.inbox_items(user_id, needs_reply, received_at DESC);
CREATE INDEX idx_pending_actions_user_status ON public.pending_actions(user_id, status, created_at DESC);
CREATE INDEX idx_heartbeat_runs_user_job ON public.heartbeat_runs(user_id, job_name, started_at DESC);
CREATE INDEX idx_document_chunks_expiry ON public.document_chunks(expires_at);
CREATE INDEX idx_audit_log_user_created ON public.integration_audit_log(user_id, created_at DESC);

-- ============================================================
-- UPDATED_AT TRIGGERS
-- ============================================================

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_integrations_updated_at
  BEFORE UPDATE ON public.user_integrations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_commitments_updated_at
  BEFORE UPDATE ON public.commitments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_inbox_items_updated_at
  BEFORE UPDATE ON public.inbox_items
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_heartbeat_config_updated_at
  BEFORE UPDATE ON public.heartbeat_config
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================
-- CLEANUP JOBS (via pg_cron)
-- ============================================================

-- Delete expired document chunks nightly at 3am
SELECT cron.schedule('delete-expired-chunks', '0 3 * * *',
  $$DELETE FROM public.document_chunks WHERE expires_at < NOW()$$);

-- Delete expired pending actions hourly
SELECT cron.schedule('delete-expired-actions', '0 * * * *',
  $$DELETE FROM public.pending_actions
    WHERE status = 'awaiting_confirmation' AND expires_at < NOW()$$);

-- Prune audit log older than 12 months monthly
SELECT cron.schedule('prune-audit-log', '0 4 1 * *',
  $$DELETE FROM public.integration_audit_log WHERE created_at < NOW() - INTERVAL '12 months'$$);
