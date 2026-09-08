-- Run this in the Supabase SQL Editor (Project -> SQL Editor -> New query).
-- No migration tooling is wired up yet, so this is applied manually.

create table if not exists health_webhook_tokens (
  user_id uuid primary key references auth.users(id) on delete cascade,
  token_hash text not null,              -- sha256 of the token, never the raw value
  created_at timestamptz not null default now(),
  rotated_at timestamptz
);

alter table health_webhook_tokens enable row level security;

create policy "users manage their own webhook token" on health_webhook_tokens
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create table if not exists health_readings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  source text not null check (source in ('webhook', 'manual')),
  recorded_date date not null,
  resting_heart_rate numeric,
  hrv numeric,                            -- ms. Apple HealthKit's SDNN metric, not rMSSD.
  created_at timestamptz not null default now(),
  unique (user_id, recorded_date, source)
);

alter table health_readings enable row level security;

create policy "users read their own health readings" on health_readings
  for select
  using (auth.uid() = user_id);

create policy "users insert their own manual health readings" on health_readings
  for insert
  with check (auth.uid() = user_id);

-- No policy covers webhook inserts on purpose — that path uses the
-- service-role key server-side (app/api/health/webhook/route.ts),
-- deliberately bypassing RLS since there is no user session on an inbound
-- webhook request. The route handler itself is the only thing preventing
-- cross-user writes on that path.
