-- Run this in the Supabase SQL Editor (Project -> SQL Editor -> New query).
-- No migration tooling is wired up yet, so this is applied manually.

-- Holds the athlete profile TRIMP needs (sex, resting HR, max HR). Until this
-- table existed, computeActivityLoad had no profile to work with and every
-- ACWR in the app silently fell back to the moving-time-minutes proxy.
--
-- max_heart_rate_source records HOW the max HR was arrived at. An estimated
-- max HR means every TRIMP value derived from it is partly an age formula
-- rather than a measured effort, and the UI says so rather than hiding it.
create table if not exists user_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  sex text check (sex in ('male', 'female')),
  resting_heart_rate numeric,
  max_heart_rate numeric,
  max_heart_rate_source text check (max_heart_rate_source in ('measured', 'estimated')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table user_profiles enable row level security;

-- Owner-scoped policies, following the health_readings pattern above.
-- Deliberately NOT the zero-policy pattern used by strava_connections: that
-- table hides raw OAuth tokens from everyone including their owner, whereas a
-- user must be able to read and edit their own profile.
create policy "users manage their own profile" on user_profiles
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
