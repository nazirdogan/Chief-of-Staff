# Chief of Staff — Database Schema

**Database**: Supabase PostgreSQL  
**Region**: AWS me-south-1 (Bahrain) — UAE data residency default  
**Extensions required**: `pgvector`, `uuid-ossp`, `pg_cron`

Every table has Row Level Security (RLS) enabled. No exceptions.
All migrations live in `supabase/migrations/` as numbered SQL files.

---

## Migration File: `001_initial_schema.sql`

```sql
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
  briefing_time         TIME NOT NULL DEFAULT '07:30:00',    -- local time for briefing delivery
  primary_channel       message_delivery_channel NOT NULL DEFAULT 'in_app',
  telegram_chat_id      TEXT,                               -- set after Telegram connection
  whatsapp_number       TEXT,                               -- set after WhatsApp connection
  onboarding_completed  BOOLEAN NOT NULL DEFAULT FALSE,
  privacy_mode          BOOLEAN NOT NULL DEFAULT FALSE,     -- Power tier: local LLM
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
-- Stores the 5-minute onboarding model-building answers.
-- ------------------------------------------------------------
CREATE TABLE public.onboarding_data (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id       UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  vip_contacts  TEXT[] NOT NULL DEFAULT '{}',       -- emails or names entered by user
  active_projects TEXT[] NOT NULL DEFAULT '{}',     -- project descriptions
  weekly_priority TEXT,                             -- "my biggest priority this week is..."
  completed_at  TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.onboarding_data ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own onboarding data" ON public.onboarding_data
  FOR ALL USING (auth.uid() = user_id);

-- ------------------------------------------------------------
-- USER_INTEGRATIONS
-- Tracks which integrations are connected per user.
-- OAuth tokens are NEVER stored here — they live in Nango.
-- This table stores connection metadata only.
-- ------------------------------------------------------------
CREATE TABLE public.user_integrations (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id           UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  provider          integration_provider NOT NULL,
  status            integration_status NOT NULL DEFAULT 'pending',
  nango_connection_id TEXT NOT NULL,              -- Nango's connection identifier
  account_email     TEXT,                         -- which account is connected
  account_name      TEXT,
  granted_scopes    TEXT[] NOT NULL DEFAULT '{}', -- what scopes are active
  last_synced_at    TIMESTAMPTZ,
  error_message     TEXT,                         -- last error if status = 'error'
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
-- Users can view their own log. No deletes allowed.
-- ------------------------------------------------------------
CREATE TABLE public.integration_audit_log (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id       UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  provider      integration_provider NOT NULL,
  action        TEXT NOT NULL,            -- e.g. 'gmail.messages.list'
  status_code   INTEGER,
  request_size  INTEGER,                  -- bytes
  response_size INTEGER,                  -- bytes
  duration_ms   INTEGER,
  ip_address    INET,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.integration_audit_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own audit log" ON public.integration_audit_log
  FOR SELECT USING (auth.uid() = user_id);
-- No UPDATE or DELETE policies — this is an append-only audit log

-- ------------------------------------------------------------
-- BRIEFINGS
-- One record per generated briefing.
-- ------------------------------------------------------------
CREATE TABLE public.briefings (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id           UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  briefing_date     DATE NOT NULL,
  generated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  delivered_at      TIMESTAMPTZ,
  delivery_channel  message_delivery_channel,
  item_count        INTEGER NOT NULL DEFAULT 0,
  generation_model  TEXT,                    -- which model generated this
  generation_ms     INTEGER,                 -- generation time
  meeting_preps     JSONB DEFAULT '[]'::jsonb, -- per-event meeting prep briefs with citations
  UNIQUE(user_id, briefing_date)
);

ALTER TABLE public.briefings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own briefings" ON public.briefings
  FOR SELECT USING (auth.uid() = user_id);

-- ------------------------------------------------------------
-- BRIEFING_ITEMS
-- Individual ranked items within a briefing.
-- source_ref is REQUIRED — no item without a source.
-- ------------------------------------------------------------
CREATE TABLE public.briefing_items (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  briefing_id       UUID NOT NULL REFERENCES public.briefings(id) ON DELETE CASCADE,
  user_id           UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  rank              INTEGER NOT NULL,           -- position in briefing (1 = most important)
  section           briefing_item_section NOT NULL,
  item_type         briefing_item_type NOT NULL,
  title             TEXT NOT NULL,
  summary           TEXT NOT NULL,
  reasoning         TEXT NOT NULL,              -- why this was ranked here (shown in UI)
  source_ref        JSONB NOT NULL,             -- REQUIRED: { provider, message_id, url, excerpt }
  action_suggestion TEXT,                       -- "Reply to Sarah about contract terms"
  urgency_score     SMALLINT CHECK (urgency_score BETWEEN 1 AND 10),
  importance_score  SMALLINT CHECK (importance_score BETWEEN 1 AND 10),
  risk_score        SMALLINT CHECK (risk_score BETWEEN 1 AND 10),
  composite_score   NUMERIC(4,2),
  user_feedback     SMALLINT CHECK (user_feedback IN (-1, 1)),  -- thumbs down / up
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
-- Extracted promises made by the user in outbound messages.
-- source_quote is REQUIRED — always show what was said.
-- ------------------------------------------------------------
CREATE TABLE public.commitments (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id           UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  recipient_email   TEXT NOT NULL,
  recipient_name    TEXT,
  commitment_text   TEXT NOT NULL,        -- AI interpretation: "Send proposal by Friday"
  source_quote      TEXT NOT NULL,        -- REQUIRED: exact sentence from original message
  source_ref        JSONB NOT NULL,       -- { provider, message_id, thread_id, sent_at }
  confidence        commitment_confidence NOT NULL,
  confidence_score  SMALLINT NOT NULL CHECK (confidence_score BETWEEN 1 AND 10),
  implied_deadline  DATE,
  explicit_deadline BOOLEAN NOT NULL DEFAULT FALSE,
  status            commitment_status NOT NULL DEFAULT 'open',
  resolved_at       TIMESTAMPTZ,
  resolved_via_ref  JSONB,               -- message that fulfilled the commitment
  snoozed_until     TIMESTAMPTZ,
  delegated_to      TEXT,                -- email of person delegated to
  user_confirmed    BOOLEAN,             -- NULL = not reviewed, TRUE = confirmed, FALSE = dismissed
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.commitments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own commitments" ON public.commitments
  FOR ALL USING (auth.uid() = user_id);

-- ------------------------------------------------------------
-- CONTACTS
-- Auto-built from communication history. Zero manual entry required.
-- ------------------------------------------------------------
CREATE TABLE public.contacts (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id               UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  email                 TEXT NOT NULL,
  name                  TEXT,
  organisation          TEXT,
  is_vip                BOOLEAN NOT NULL DEFAULT FALSE,  -- seeded in onboarding
  relationship_score    SMALLINT CHECK (relationship_score BETWEEN 0 AND 100),
  first_interaction_at  TIMESTAMPTZ,
  last_interaction_at   TIMESTAMPTZ,
  last_interaction_channel TEXT,                         -- 'gmail', 'slack', etc.
  interaction_count_30d INTEGER NOT NULL DEFAULT 0,
  avg_response_time_hours NUMERIC(8,2),
  open_commitments_count INTEGER NOT NULL DEFAULT 0,
  context_notes         TEXT,                            -- AI-generated context summary
  context_notes_updated_at TIMESTAMPTZ,
  user_notes            TEXT,                            -- user-written notes
  is_cold               BOOLEAN NOT NULL DEFAULT FALSE,  -- flagged by relationship agent
  cold_flagged_at       TIMESTAMPTZ,
  UNIQUE(user_id, email)
);

ALTER TABLE public.contacts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own contacts" ON public.contacts
  FOR ALL USING (auth.uid() = user_id);

-- ------------------------------------------------------------
-- CONTACT_INTERACTIONS
-- Log of every interaction with a contact (for relationship scoring).
-- ------------------------------------------------------------
CREATE TABLE public.contact_interactions (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id       UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  contact_id    UUID NOT NULL REFERENCES public.contacts(id) ON DELETE CASCADE,
  direction     TEXT NOT NULL CHECK (direction IN ('inbound', 'outbound')),
  channel       TEXT NOT NULL,         -- 'gmail', 'slack', 'telegram', etc.
  message_ref   JSONB NOT NULL,        -- { provider, message_id, thread_id }
  subject       TEXT,
  interacted_at TIMESTAMPTZ NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.contact_interactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own interactions" ON public.contact_interactions
  FOR SELECT USING (auth.uid() = user_id);

-- ------------------------------------------------------------
-- PENDING_ACTIONS
-- AI-proposed write actions awaiting user confirmation.
-- NOTHING is written to external services without a confirmed record here.
-- ------------------------------------------------------------
CREATE TABLE public.pending_actions (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id           UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  action_type       pending_action_type NOT NULL,
  status            pending_action_status NOT NULL DEFAULT 'awaiting_confirmation',
  payload           JSONB NOT NULL,    -- full action payload (e.g. draft email content)
  source_context    JSONB,             -- what triggered this action
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
-- Per-user Heartbeat Monitor configuration.
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
  custom_rules          JSONB NOT NULL DEFAULT '[]',   -- Power tier: custom alert rules
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.heartbeat_config ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own heartbeat config" ON public.heartbeat_config
  FOR ALL USING (auth.uid() = user_id);

-- ------------------------------------------------------------
-- HEARTBEAT_RUNS
-- Log of every Heartbeat execution for monitoring and debugging.
-- ------------------------------------------------------------
CREATE TABLE public.heartbeat_runs (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id         UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  job_name        TEXT NOT NULL,          -- e.g. 'gmail-scan', 'commitment-check'
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
-- Vector embeddings of indexed documents and messages.
-- Used for semantic search and meeting prep context retrieval.
-- embeddings NOT reversible to original content.
-- ------------------------------------------------------------
CREATE TABLE public.document_chunks (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id         UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  provider        TEXT NOT NULL,          -- 'gmail', 'gdrive', 'notion', etc.
  source_id       TEXT NOT NULL,          -- provider's document/message ID
  chunk_index     INTEGER NOT NULL,       -- chunk number within document
  content_summary TEXT NOT NULL,          -- plain text summary of chunk (NOT raw content)
  embedding       vector(1536) NOT NULL,  -- text-embedding-3-small dimension
  metadata        JSONB NOT NULL DEFAULT '{}',  -- { title, url, author, date, type }
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
-- Cached unified inbox items across all connected channels.
-- Raw message content is NOT stored — only metadata and summaries.
-- ------------------------------------------------------------
CREATE TABLE public.inbox_items (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id           UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  provider          integration_provider NOT NULL,
  external_id       TEXT NOT NULL,              -- provider's message/thread ID
  thread_id         TEXT,
  from_email        TEXT NOT NULL,
  from_name         TEXT,
  subject           TEXT,
  ai_summary        TEXT,                       -- AI-generated summary (NOT raw body)
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
-- Tracks active Telegram bot sessions for each user.
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
-- Tracks web/app sessions for security dashboard.
-- ------------------------------------------------------------
CREATE TABLE public.user_sessions (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id         UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  session_token   TEXT NOT NULL UNIQUE,           -- hashed token
  device_name     TEXT,
  device_type     TEXT,                           -- 'web', 'ios', 'android', 'macos'
  ip_address      INET,
  last_active_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  revoked_at      TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.user_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own sessions" ON public.user_sessions
  FOR ALL USING (auth.uid() = user_id);

-- ============================================================
-- INDEXES (beyond primary keys and unique constraints)
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
```

---

## Table Reference Summary

| Table | Purpose | Retention |
|---|---|---|
| `profiles` | User account + preferences | Account lifetime |
| `onboarding_data` | Initial model-building answers | Account lifetime |
| `user_integrations` | Integration connection metadata (no tokens) | Account lifetime |
| `integration_audit_log` | Immutable API call log | 12 months |
| `briefings` | Daily briefing records | 90 days |
| `briefing_items` | Individual ranked items with source refs | 90 days |
| `commitments` | Extracted user promises | 180 days post-resolution |
| `contacts` | Auto-built contact profiles | Account lifetime |
| `contact_interactions` | Communication history log | 90 days |
| `pending_actions` | Write actions awaiting confirmation | 24 hours then purged |
| `heartbeat_config` | Per-user Heartbeat settings | Account lifetime |
| `heartbeat_runs` | Background job execution log | 30 days |
| `document_chunks` | Vector embeddings for semantic search | 90 days (Warm Memory) |
| `inbox_items` | Cached inbox summaries (no raw content) | 30 days |
| `telegram_sessions` | Telegram bot connections | Account lifetime |
| `user_sessions` | Active web/app sessions | Until revoked |

---

## Key Design Decisions

1. **Raw email/message bodies are never stored.** Only AI-generated summaries and vector embeddings
   are persisted. The `inbox_items.ai_summary` column stores the summary, not the email body.

2. **OAuth tokens are never in this database.** All tokens live in Nango. The
   `user_integrations.nango_connection_id` is the reference to retrieve them.

3. **Every briefing item requires `source_ref`** — a JSONB object with enough information to
   retrieve the original source. The application layer enforces this before insert.

4. **Every commitment requires `source_quote`** — the exact sentence from the original message.
   This is the hallucination prevention mechanism.

5. **Pending actions expire in 24 hours** — stale confirmations are auto-deleted so users don't
   accidentally approve old actions.

6. **Vector embeddings expire in 90 days** — enforcing the Warm Memory retention policy.
   pg_cron runs the cleanup nightly.
