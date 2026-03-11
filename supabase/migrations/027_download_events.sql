-- Migration 027: Download events tracking
--
-- Tracks anonymous download events for the macOS DMG.
-- IP addresses are SHA-256 hashed (truncated) — no raw IPs stored.
-- RLS enabled: no user-facing SELECT policy. Only service role can read/write.

CREATE TABLE IF NOT EXISTS download_events (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  ip_hash     TEXT,
  user_agent  TEXT,
  platform    TEXT NOT NULL DEFAULT 'macos'
);

-- Enable RLS — no user-facing policies. Only accessible via service role.
ALTER TABLE download_events ENABLE ROW LEVEL SECURITY;

-- Service role bypass policy for backend inserts and admin reads
CREATE POLICY "service_role_all"
  ON download_events
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
