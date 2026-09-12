-- Run this in the Supabase SQL Editor (Project -> SQL Editor -> New query).
-- No migration tooling is wired up yet, so this is applied manually.
--
-- Lets an athlete delete their own health readings, one row at a time.
--
-- WHY THIS IS NEEDED, beyond the privacy right: manual readings feed
-- computeAutonomicBaseline, so a mis-typed value (HRV entered as 630 rather
-- than 63) skews both the baseline mean and its standard deviation for as long
-- as it sits in the window, quietly corrupting every recovery score after it.
-- Without a delete there was no way to correct that short of deleting the whole
-- account. Privacy §7 promises the right to "correct" as well as delete; this
-- is what correction means in practice here.
--
-- This is the first new write permission on health_readings since launch, so
-- it is scoped exactly like the existing ones: the owner and nobody else, via
-- the single access function from 0006. If a bug ever widens access, it widens
-- there and is caught in one place.

drop policy if exists "users delete their own health readings" on health_readings;
create policy "users delete their own health readings" on health_readings
  for delete
  using (public.app_can_access_athlete(user_id));
