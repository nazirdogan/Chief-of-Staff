-- Migration 025: Direct Google OAuth (remove Nango dependency for Google)
--
-- SECURITY NOTE: Justified exception to "tokens only via Nango" rule.
-- Google OAuth tokens are stored directly in this table because this is a
-- direct Google OAuth flow (not through Nango). All token values are
-- AES-256-GCM encrypted at the application layer before storage (see
-- src/lib/utils/encryption.ts). The ENCRYPTION_KEY is rotated per the
-- key rotation policy documented in docs/SECURITY.md. Raw token values
-- are never written to this table — only ciphertext.
--
-- Changes:
--   1. Make nango_connection_id nullable — Google connections won't have one
--   2. Add encrypted token columns: access_token, refresh_token, token_expiry
--   3. Replace (user_id, nango_connection_id) unique constraint with
--      (user_id, provider, account_email) so we can upsert by Google account

-- 1. Allow nango_connection_id to be NULL
ALTER TABLE user_integrations
  ALTER COLUMN nango_connection_id DROP NOT NULL;

-- 2. Add token storage columns (encrypted AES-256-GCM values stored as text)
ALTER TABLE user_integrations
  ADD COLUMN IF NOT EXISTS access_token  TEXT,
  ADD COLUMN IF NOT EXISTS refresh_token TEXT,
  ADD COLUMN IF NOT EXISTS token_expiry  TIMESTAMPTZ;

-- 3. Drop the old unique constraint that required nango_connection_id
ALTER TABLE user_integrations
  DROP CONSTRAINT IF EXISTS user_integrations_user_nango_unique;

-- 4. Add new unique constraint for direct-OAuth rows (upsert by account).
--    Using ADD CONSTRAINT (not a partial index) so PostgREST can resolve
--    ON CONFLICT for Supabase upsert calls. NULL account_email values never
--    match each other in a unique constraint, so Slack/other providers are safe.
ALTER TABLE user_integrations
  DROP CONSTRAINT IF EXISTS user_integrations_user_provider_email_unique;
ALTER TABLE user_integrations
  ADD CONSTRAINT user_integrations_user_provider_email_unique
  UNIQUE (user_id, provider, account_email);
