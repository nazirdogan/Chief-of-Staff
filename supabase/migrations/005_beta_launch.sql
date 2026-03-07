-- ============================================================
-- Session 18: Beta Launch — waitlist, feedback, admin
-- ============================================================

-- Add is_admin flag to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_admin BOOLEAN NOT NULL DEFAULT FALSE;

-- ------------------------------------------------------------
-- WAITLIST
-- Public signups for beta access.
-- ------------------------------------------------------------
CREATE TYPE waitlist_status AS ENUM ('pending', 'approved', 'rejected');

CREATE TABLE public.waitlist (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email       TEXT NOT NULL UNIQUE,
  full_name   TEXT,
  company     TEXT,
  role        TEXT,
  referral    TEXT,
  status      waitlist_status NOT NULL DEFAULT 'pending',
  notes       TEXT,
  approved_at TIMESTAMPTZ,
  approved_by UUID REFERENCES public.profiles(id),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Waitlist is managed by admins — no user RLS needed, but enable it
ALTER TABLE public.waitlist ENABLE ROW LEVEL SECURITY;

-- Admins can do everything
CREATE POLICY "Admins can manage waitlist" ON public.waitlist
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = TRUE)
  );

-- Anyone can insert (public signup) — service role handles this via API
-- No select/update for non-admins

-- ------------------------------------------------------------
-- USER_FEEDBACK
-- In-app feedback from beta users.
-- ------------------------------------------------------------
CREATE TYPE feedback_type AS ENUM ('bug', 'feature', 'general', 'praise');

CREATE TABLE public.user_feedback (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  type        feedback_type NOT NULL DEFAULT 'general',
  message     TEXT NOT NULL,
  page        TEXT,
  rating      SMALLINT CHECK (rating BETWEEN 1 AND 5),
  metadata    JSONB NOT NULL DEFAULT '{}',
  resolved    BOOLEAN NOT NULL DEFAULT FALSE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.user_feedback ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can insert own feedback" ON public.user_feedback
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can view own feedback" ON public.user_feedback
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admins can view all feedback" ON public.user_feedback
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = TRUE)
  );
CREATE POLICY "Admins can update feedback" ON public.user_feedback
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = TRUE)
  );

-- Indexes
CREATE INDEX idx_waitlist_status ON public.waitlist(status, created_at DESC);
CREATE INDEX idx_user_feedback_user ON public.user_feedback(user_id, created_at DESC);
CREATE INDEX idx_user_feedback_type ON public.user_feedback(type, resolved, created_at DESC);
