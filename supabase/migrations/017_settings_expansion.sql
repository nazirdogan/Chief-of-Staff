-- Migration 017: Settings expansion — custom instructions and blocked apps
-- Adds fields for chat custom instructions and privacy blocked apps

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS custom_instructions TEXT,
  ADD COLUMN IF NOT EXISTS blocked_apps TEXT[] DEFAULT '{}';

-- RLS: profiles table already has RLS enabled with user-scoped policies.
-- The new columns inherit existing row-level policies.
