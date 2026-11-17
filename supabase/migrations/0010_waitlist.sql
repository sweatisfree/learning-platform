-- Run this in the Supabase SQL Editor (Project -> SQL Editor -> New query).
-- No migration tooling is wired up yet, so this is applied manually.
--
-- A list of adults who want to be told when the app can serve under-18
-- athletes. Deliberately holds nothing about the minor — no name, no age, no
-- sport — because the moment a row describes a child this table is processing
-- a minor's personal data and falls behind the legal review that has not
-- happened yet. An adult's own email, given voluntarily, is ordinary business.

create table if not exists waitlist (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  -- Free text the person chose to write. The form says not to include
  -- anything about a child; this is not a field we ask questions into.
  note text,
  created_at timestamptz not null default now(),
  unique (email)
);

alter table waitlist enable row level security;

-- Insert-only, and open to signed-out visitors, because the whole point is
-- reaching people who cannot create an account.
drop policy if exists "anyone may join the waitlist" on waitlist;
create policy "anyone may join the waitlist" on waitlist
  for insert to anon, authenticated
  with check (true);

-- No select, update or delete policy, on purpose. RLS with no policy for an
-- operation means nobody gets rows, so the list cannot be read back by a
-- visitor, by a signed-in user, or by someone probing whether a given address
-- is already on it. Read it yourself in the SQL Editor, which runs as a
-- privileged role and bypasses RLS:
--
--   select email, note, created_at from waitlist order by created_at desc;
--
-- Supabase's advisor will flag this table as "RLS enabled, no policy" for
-- select. That is expected and intentional, the same stance taken by
-- strava_connections in migration 0002. Do not add a read policy.
