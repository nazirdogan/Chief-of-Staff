-- Add is_favorite column to chat_conversations
ALTER TABLE chat_conversations
ADD COLUMN IF NOT EXISTS is_favorite boolean NOT NULL DEFAULT false;

-- Index for sidebar query: favorites first, then by recency
CREATE INDEX IF NOT EXISTS idx_chat_conversations_sidebar
  ON chat_conversations (user_id, is_favorite DESC, updated_at DESC);
