-- 023_user_routines.sql
-- User-defined scheduled routines: daily briefing, end of day, weekly/monthly reviews

create type routine_frequency as enum ('daily', 'weekly', 'monthly');
create type routine_type as enum ('daily_briefing', 'end_of_day', 'weekly_review', 'monthly_review', 'custom');

create table user_routines (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  description text,
  routine_type routine_type not null default 'custom',
  frequency routine_frequency not null default 'daily',
  scheduled_time time not null default '08:00',
  scheduled_day smallint,
  is_enabled boolean not null default true,
  instructions text not null default '',
  last_run_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table routine_outputs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  routine_id uuid not null references user_routines(id) on delete cascade,
  content text not null,
  generation_model text,
  generation_ms integer,
  created_at timestamptz not null default now()
);

alter table user_routines enable row level security;
alter table routine_outputs enable row level security;

create policy "Users can manage their own routines"
  on user_routines for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Service role can manage all routines"
  on user_routines for all
  to service_role
  using (true)
  with check (true);

create policy "Users can read their own routine outputs"
  on routine_outputs for select
  using (auth.uid() = user_id);

create policy "Service role can manage all routine outputs"
  on routine_outputs for all
  to service_role
  using (true)
  with check (true);

create index user_routines_user_id_idx on user_routines(user_id);
create index user_routines_enabled_idx on user_routines(user_id, is_enabled) where is_enabled = true;
create index routine_outputs_routine_id_idx on routine_outputs(routine_id, created_at desc);
create index routine_outputs_user_id_idx on routine_outputs(user_id, created_at desc);
