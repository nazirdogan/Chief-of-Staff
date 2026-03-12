-- Daily message usage tracking for free tier limiting
CREATE TABLE IF NOT EXISTS daily_message_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  usage_date DATE NOT NULL DEFAULT CURRENT_DATE,
  message_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, usage_date)
);

-- RLS
ALTER TABLE daily_message_usage ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own usage"
ON daily_message_usage FOR SELECT
USING (auth.uid() = user_id);

-- Service role can do everything
CREATE POLICY "Service role full access on daily_message_usage"
ON daily_message_usage FOR ALL
USING (true)
WITH CHECK (true);

CREATE INDEX idx_daily_message_usage_user_date ON daily_message_usage (user_id, usage_date);
