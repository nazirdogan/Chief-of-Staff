-- Migration 024: Stripe billing fields
-- Adds Stripe customer and subscription tracking to profiles table.

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS stripe_customer_id      TEXT,
  ADD COLUMN IF NOT EXISTS stripe_subscription_id  TEXT,
  ADD COLUMN IF NOT EXISTS subscription_status     TEXT NOT NULL DEFAULT 'inactive',
  ADD COLUMN IF NOT EXISTS subscription_period_end TIMESTAMPTZ;

-- Unique index: one Stripe customer per user
CREATE UNIQUE INDEX IF NOT EXISTS profiles_stripe_customer_id_idx
  ON profiles (stripe_customer_id)
  WHERE stripe_customer_id IS NOT NULL;

-- RLS: users can only read their own billing data
-- (profiles table already has RLS enabled and a user-scoped policy)
-- No additional policy needed — the existing SELECT policy covers these columns.

COMMENT ON COLUMN profiles.stripe_customer_id      IS 'Stripe Customer ID (cus_...)';
COMMENT ON COLUMN profiles.stripe_subscription_id  IS 'Stripe Subscription ID (sub_...)';
COMMENT ON COLUMN profiles.subscription_status     IS 'active | trialing | past_due | canceled | inactive';
COMMENT ON COLUMN profiles.subscription_period_end IS 'When the current billing period ends — used for access after cancellation';
