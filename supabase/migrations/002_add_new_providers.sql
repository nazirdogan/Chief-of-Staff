-- ============================================================
-- Migration 002: Add new integration providers
-- ============================================================
-- Adds TIER 1 and TIER 2 integration providers to the
-- integration_provider enum and related types.

-- Add new values to integration_provider enum
ALTER TYPE integration_provider ADD VALUE IF NOT EXISTS 'apple_icloud_mail';
ALTER TYPE integration_provider ADD VALUE IF NOT EXISTS 'apple_icloud_calendar';
ALTER TYPE integration_provider ADD VALUE IF NOT EXISTS 'calendly';
ALTER TYPE integration_provider ADD VALUE IF NOT EXISTS 'microsoft_teams';
ALTER TYPE integration_provider ADD VALUE IF NOT EXISTS 'linkedin';
ALTER TYPE integration_provider ADD VALUE IF NOT EXISTS 'twitter';
ALTER TYPE integration_provider ADD VALUE IF NOT EXISTS 'dropbox';
ALTER TYPE integration_provider ADD VALUE IF NOT EXISTS 'asana';
ALTER TYPE integration_provider ADD VALUE IF NOT EXISTS 'monday';
ALTER TYPE integration_provider ADD VALUE IF NOT EXISTS 'jira';
ALTER TYPE integration_provider ADD VALUE IF NOT EXISTS 'clickup';
ALTER TYPE integration_provider ADD VALUE IF NOT EXISTS 'trello';
ALTER TYPE integration_provider ADD VALUE IF NOT EXISTS 'pipedrive';
ALTER TYPE integration_provider ADD VALUE IF NOT EXISTS 'github';

-- Add new briefing item types for tasks and code review
ALTER TYPE briefing_item_type ADD VALUE IF NOT EXISTS 'dm';
ALTER TYPE briefing_item_type ADD VALUE IF NOT EXISTS 'calendar_booking';
ALTER TYPE briefing_item_type ADD VALUE IF NOT EXISTS 'pull_request';
