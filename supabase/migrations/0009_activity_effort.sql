-- Run this in the Supabase SQL Editor (Project -> SQL Editor -> New query).
-- No migration tooling is wired up yet, so this is applied manually.
--
-- Lets a user attach a perceived effort to an activity that arrived without
-- one, so weight-room work stops scoring as bare minutes.
--
-- Why a separate table rather than a column on an activities table: there is
-- no activities table. Strava activities are fetched live on each load and
-- never stored, which the privacy policy states as a deliberate promise. This
-- stores only what the user typed, keyed by the provider's own activity id,
-- so that promise survives — we hold a number and an opaque reference, not
-- the workout.

create table if not exists activity_effort (
  user_id uuid not null references auth.users(id) on delete cascade,
  -- Which provider the activity_id belongs to. Ids are only unique within a
  -- provider, so both are needed to identify a session.
  source text not null check (source in ('strava', 'file', 'manual')),
  activity_id text not null,
  -- Borg CR10. Stored to one decimal because lifters commonly use half points
  -- (7.5, 8.5) and rounding them away loses a real distinction.
  rpe numeric not null check (rpe >= 0 and rpe <= 10),
  -- Chooses the multiplier in MODALITY_MULTIPLIER (lib/engine/loadCalculator.ts).
  -- Null means the generic non-GPS weighting, which is what every RPE-logged
  -- activity received before this table existed.
  modality text check (modality is null or modality in ('strength', 'isophit', 'non-gps')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, source, activity_id)
);

alter table activity_effort enable row level security;

-- Ordinary owner policies, unlike strava_connections. This holds a number the
-- user typed about their own session, not a credential, so the owner reading
-- and writing it directly under RLS is correct and needs no service-role route.
-- Scoped through app_can_access_athlete rather than an inlined auth.uid()
-- check, per the rule in CLAUDE.md.

drop policy if exists "users read their own activity effort" on activity_effort;
create policy "users read their own activity effort" on activity_effort
  for select using (public.app_can_access_athlete(user_id));

drop policy if exists "users insert their own activity effort" on activity_effort;
create policy "users insert their own activity effort" on activity_effort
  for insert with check (public.app_can_access_athlete(user_id));

drop policy if exists "users update their own activity effort" on activity_effort;
create policy "users update their own activity effort" on activity_effort
  for update using (public.app_can_access_athlete(user_id))
  with check (public.app_can_access_athlete(user_id));

drop policy if exists "users delete their own activity effort" on activity_effort;
create policy "users delete their own activity effort" on activity_effort
  for delete using (public.app_can_access_athlete(user_id));

-- ---------------------------------------------------------------------------
-- Check it worked
-- ---------------------------------------------------------------------------
-- Expect the table listed with rowsecurity = true, and four policies.

-- select tablename, rowsecurity from pg_tables where tablename = 'activity_effort';
-- select policyname, cmd from pg_policies where tablename = 'activity_effort';
