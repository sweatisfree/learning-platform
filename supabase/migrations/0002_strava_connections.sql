create table if not exists strava_connections (
  user_id uuid primary key references auth.users(id) on delete cascade,
  access_token text not null,
  refresh_token text not null,
  expires_at bigint not null,
  athlete_id bigint not null,
  athlete_firstname text,
  athlete_lastname text,
  connected_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table strava_connections enable row level security;

-- Deliberately zero policies on this table, not restrictive ones. RLS
-- enabled with no policy means anon/authenticated get zero rows on every
-- operation; only the service-role key (which bypasses RLS entirely)
-- can read or write it. This is stronger than the health_webhook_tokens
-- pattern on purpose: these are raw, directly-usable Strava credentials,
-- not a one-way hash, so they must never be client-readable, even by
-- their own owner. Supabase's own advisor will flag this table as an
-- "RLS enabled, no policy" warning -- that is expected and intentional.
-- Do not "fix" it by adding a permissive owner policy.
