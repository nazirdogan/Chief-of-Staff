-- Chat message feedback
-- Stores thumbs up/down ratings on Donna's assistant responses,
-- used for quality monitoring. Emails are sent to support@imdonna.app.

create table if not exists chat_message_feedback (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users(id) on delete cascade,
  message_id      text not null,
  conversation_id text not null,
  rating          text not null check (rating in ('thumbs_up', 'thumbs_down')),
  message_content text,
  feedback_text   text,
  created_at      timestamptz not null default now()
);

-- One rating per (user, message) — upsert overwrites if they change their mind
create unique index if not exists chat_message_feedback_user_message_idx
  on chat_message_feedback (user_id, message_id);

-- RLS
alter table chat_message_feedback enable row level security;

create policy "Users can manage their own feedback"
  on chat_message_feedback
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Service role has full access to chat_message_feedback"
  on chat_message_feedback
  for all
  to service_role
  using (true)
  with check (true);
