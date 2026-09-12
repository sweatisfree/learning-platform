-- Run this in the Supabase SQL Editor (Project -> SQL Editor -> New query).
-- No migration tooling is wired up yet, so this is applied manually.
--
-- PURPOSE, in order of importance:
--
-- 1. Security hygiene, today. "Who is allowed to read this athlete's health
--    data?" was answered in four separate policies across two migration files.
--    A mistake in any one of them leaks another person's biometric data, so
--    the rule now lives in exactly one auditable place.
--
-- 2. It is also the extension point for parent-managed accounts, should those
--    ever be in scope. Supporting a guardian would mean changing this one
--    function body rather than rewriting four policies. That does NOT make
--    guardianship free — the column renames, the app-code updates and any
--    live-data migration all remain — but it removes the part where an error
--    is a security hole rather than a bug.
--
-- BEHAVIOUR IS UNCHANGED. This function returns exactly what the four
-- inlined checks returned: true only for the athlete themselves.

create or replace function public.app_can_access_athlete(athlete uuid)
returns boolean
language sql
stable
security invoker
set search_path = ''
as $$
  -- Wrapped in a sub-select so Postgres can cache it per statement rather
  -- than re-evaluating auth.uid() for every row.
  select (select auth.uid()) = athlete;
$$;

comment on function public.app_can_access_athlete(uuid) is
  'Single source of truth for athlete-scoped RLS. Currently: the athlete themselves. Widen here, not in individual policies.';

-- health_webhook_tokens
drop policy if exists "users manage their own webhook token" on health_webhook_tokens;
create policy "users manage their own webhook token" on health_webhook_tokens
  for all
  using (public.app_can_access_athlete(user_id))
  with check (public.app_can_access_athlete(user_id));

-- health_readings. No policy covers webhook inserts, on purpose: that path
-- uses the service-role key server-side (app/api/health/webhook/route.ts),
-- since there is no user session on an inbound webhook.
drop policy if exists "users read their own health readings" on health_readings;
create policy "users read their own health readings" on health_readings
  for select
  using (public.app_can_access_athlete(user_id));

drop policy if exists "users insert their own manual health readings" on health_readings;
create policy "users insert their own manual health readings" on health_readings
  for insert
  with check (public.app_can_access_athlete(user_id));

-- user_profiles
drop policy if exists "users manage their own profile" on user_profiles;
create policy "users manage their own profile" on user_profiles
  for all
  using (public.app_can_access_athlete(user_id))
  with check (public.app_can_access_athlete(user_id));

-- DELIBERATELY NOT CHANGED:
--
-- * subscriptions — scoped to the ACCOUNT that pays, not the athlete the data
--   describes. Today they are the same person; under a parent-managed model
--   one account could cover several athletes. Routing it through the athlete
--   function would merge two concepts that need to stay apart, so it keeps its
--   own inlined auth.uid() check.
--
-- * strava_connections — RLS enabled with zero policies by design, so that raw
--   OAuth tokens are unreadable by everyone including their owner. There is no
--   policy here to centralise, and adding one would defeat the point.
