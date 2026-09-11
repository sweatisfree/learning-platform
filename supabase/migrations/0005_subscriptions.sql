-- Run this in the Supabase SQL Editor (Project -> SQL Editor -> New query).
-- No migration tooling is wired up yet, so this is applied manually.

create table if not exists subscriptions (
  user_id uuid primary key references auth.users(id) on delete cascade,
  stripe_customer_id text not null unique,
  stripe_subscription_id text unique,
  status text,                          -- Stripe's own: trialing, active, past_due, canceled, ...
  price_id text,
  current_period_end timestamptz,
  cancel_at_period_end boolean not null default false,
  trial_end timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists subscriptions_stripe_customer_id_idx
  on subscriptions (stripe_customer_id);

alter table subscriptions enable row level security;

-- SELECT ONLY, and deliberately no insert/update/delete policies at all.
--
-- This is the security-critical difference from user_profiles, which grants
-- the owner full CRUD. A user must be able to SEE their subscription, but must
-- never be able to WRITE one — a permissive policy here would let anyone grant
-- themselves paid status straight from the browser with the anon key.
--
-- Every write arrives from app/api/stripe/webhook/route.ts using the
-- service-role key, which bypasses RLS entirely, and only after Stripe's
-- signature has been verified. Do not "fix" the missing policies: Supabase's
-- advisor flags write-policy-less tables, and that warning is intentional here.
create policy "users read their own subscription" on subscriptions
  for select
  using (auth.uid() = user_id);
