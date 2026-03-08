-- ============================================================
-- 009_graduated_autonomy.sql
-- Graduated Autonomy: Tier 1 (silent), Tier 2 (one-tap), Tier 3 (full review)
-- ============================================================

-- ------------------------------------------------------------
-- 1. Extend pending_actions with autonomy tier + auto-execution timestamp
-- ------------------------------------------------------------
ALTER TABLE public.pending_actions
  ADD COLUMN autonomy_tier SMALLINT NOT NULL DEFAULT 3
    CHECK (autonomy_tier IN (1, 2, 3));

ALTER TABLE public.pending_actions
  ADD COLUMN auto_executed_at TIMESTAMPTZ NULL;

-- Index for fast Tier 1 queue scans
CREATE INDEX idx_pending_actions_user_tier_status
  ON public.pending_actions (user_id, autonomy_tier, status);

-- ------------------------------------------------------------
-- 2. Add 'archive_email' to pending_action_type enum
-- ------------------------------------------------------------
ALTER TYPE pending_action_type ADD VALUE IF NOT EXISTS 'archive_email';

-- ------------------------------------------------------------
-- 3. User Autonomy Settings
-- ------------------------------------------------------------
CREATE TABLE public.user_autonomy_settings (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  action_type     TEXT NOT NULL,
  tier_1_enabled  BOOLEAN NOT NULL DEFAULT false,
  tier_2_enabled  BOOLEAN NOT NULL DEFAULT true,
  whitelist_domains TEXT[] NULL,
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, action_type)
);

ALTER TABLE public.user_autonomy_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own autonomy settings"
  ON public.user_autonomy_settings
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own autonomy settings"
  ON public.user_autonomy_settings
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own autonomy settings"
  ON public.user_autonomy_settings
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own autonomy settings"
  ON public.user_autonomy_settings
  FOR DELETE USING (auth.uid() = user_id);

-- ------------------------------------------------------------
-- 4. Email Engagement Signals
-- ------------------------------------------------------------
CREATE TABLE public.email_engagement_signals (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  sender_domain     TEXT NOT NULL,
  open_count        INTEGER NOT NULL DEFAULT 0,
  click_count       INTEGER NOT NULL DEFAULT 0,
  reply_count       INTEGER NOT NULL DEFAULT 0,
  last_engaged_at   TIMESTAMPTZ NULL,
  first_seen_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  engagement_score  NUMERIC(4,3) NOT NULL DEFAULT 0.500,
  UNIQUE(user_id, sender_domain)
);

ALTER TABLE public.email_engagement_signals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own engagement signals"
  ON public.email_engagement_signals
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own engagement signals"
  ON public.email_engagement_signals
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own engagement signals"
  ON public.email_engagement_signals
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own engagement signals"
  ON public.email_engagement_signals
  FOR DELETE USING (auth.uid() = user_id);

CREATE INDEX idx_engagement_signals_user_domain
  ON public.email_engagement_signals (user_id, sender_domain);

-- ------------------------------------------------------------
-- 5. Audit Log for Tier 1 auto-executions
-- ------------------------------------------------------------
CREATE TABLE public.audit_log (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  action_type TEXT NOT NULL,
  action_id   UUID NOT NULL REFERENCES public.pending_actions(id) ON DELETE CASCADE,
  tier        SMALLINT NOT NULL CHECK (tier IN (1, 2, 3)),
  outcome     TEXT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own audit log"
  ON public.audit_log
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Service can insert audit log"
  ON public.audit_log
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE INDEX idx_audit_log_user_action_created
  ON public.audit_log (user_id, action_type, created_at);
