-- Migration 032: Donna-initiated conversations
-- Tracks conversations that Donna proactively opens (VIP reply nudges,
-- task deadline reminders, auto meeting prep) vs ones the user starts.

ALTER TABLE chat_conversations ADD COLUMN IF NOT EXISTS trigger_source TEXT DEFAULT 'user';
ALTER TABLE chat_conversations ADD COLUMN IF NOT EXISTS is_donna_initiated BOOLEAN DEFAULT FALSE;
ALTER TABLE chat_conversations ADD COLUMN IF NOT EXISTS handled_at TIMESTAMPTZ;

COMMENT ON COLUMN chat_conversations.trigger_source IS
  'Identifies what triggered this conversation. User-initiated = ''user''. '
  'Donna-initiated examples: ''vip_reply:<inbox_item_id>'', ''task_deadline:<iso_ts>'', ''meeting_prep:<event_source_ref>''.';

COMMENT ON COLUMN chat_conversations.is_donna_initiated IS
  'TRUE when Donna opened this conversation proactively. Used to split sidebar into "Donna''s Drafts" vs "My Chats".';

COMMENT ON COLUMN chat_conversations.handled_at IS
  'Set when the user dismisses or acts on a donna-initiated chat. NULL = unhandled (shows in "Donna''s Drafts").';

CREATE INDEX IF NOT EXISTS idx_chat_conversations_donna_initiated
  ON chat_conversations (user_id, is_donna_initiated, handled_at)
  WHERE is_donna_initiated = TRUE;
