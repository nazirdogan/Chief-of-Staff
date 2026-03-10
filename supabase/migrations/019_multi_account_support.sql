-- ============================================================
-- 019: Multi-account support
--
-- Allows users to connect multiple accounts of the same provider
-- (e.g. two Gmail accounts, two Google Calendars).
--
-- Key changes:
--   1. Drop UNIQUE(user_id, provider) — was 1 row per provider per user.
--   2. Add UNIQUE(user_id, nango_connection_id) — 1 row per OAuth token.
--   3. Add connection_alias — user-facing label ("Work Gmail", "Personal").
--   4. Add integration_id FK on inbox_items and heartbeat_runs so rows can
--      be scoped to the specific connected account that generated them.
-- ============================================================

-- ------------------------------------------------------------
-- 1. Drop the old unique constraint that blocked multi-account
-- ------------------------------------------------------------
ALTER TABLE public.user_integrations
  DROP CONSTRAINT IF EXISTS user_integrations_user_id_provider_key;

-- ------------------------------------------------------------
-- 2. Add user-facing alias column
-- ------------------------------------------------------------
ALTER TABLE public.user_integrations
  ADD COLUMN IF NOT EXISTS connection_alias TEXT;

-- ------------------------------------------------------------
-- 3. New unique constraint: one row per OAuth token per user
-- ------------------------------------------------------------
ALTER TABLE public.user_integrations
  ADD CONSTRAINT user_integrations_user_nango_unique
  UNIQUE(user_id, nango_connection_id);

-- ------------------------------------------------------------
-- 4. Backfill alias for existing connections
-- ------------------------------------------------------------
UPDATE public.user_integrations
SET connection_alias = COALESCE(account_email, provider::text)
WHERE connection_alias IS NULL;

-- ------------------------------------------------------------
-- 5. Add integration_id FK to inbox_items
--    Scopes each inbox item to the specific account that produced it.
--    SET NULL on delete so that disconnecting an account doesn't wipe
--    historical inbox items (they remain queryable by provider).
-- ------------------------------------------------------------
ALTER TABLE public.inbox_items
  ADD COLUMN IF NOT EXISTS integration_id UUID
    REFERENCES public.user_integrations(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_inbox_items_integration_id
  ON public.inbox_items(integration_id);

-- ------------------------------------------------------------
-- 6. Add integration_id FK to heartbeat_runs
-- ------------------------------------------------------------
ALTER TABLE public.heartbeat_runs
  ADD COLUMN IF NOT EXISTS integration_id UUID
    REFERENCES public.user_integrations(id) ON DELETE SET NULL;
