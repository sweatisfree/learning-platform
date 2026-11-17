-- Run this in the Supabase SQL Editor (Project -> SQL Editor -> New query).
-- No migration tooling is wired up yet, so this is applied manually.
--
-- Two changes, both on health_readings, both safe to re-run:
--   1. Record which method produced an HRV value.
--   2. Allow readings from sources other than the original two.
--
-- Nothing here deletes or rewrites a measurement. Adding a column leaves
-- existing rows untouched, and widening a check constraint only permits more
-- than before, so no stored row can be rejected by it.

-- ---------------------------------------------------------------------------
-- 1. HRV method
-- ---------------------------------------------------------------------------
-- SDNN and rMSSD are different measures of heart-rate variability, not two
-- scales of one measure. Apple HealthKit reports SDNN; WHOOP, Oura, Garmin and
-- Fitbit all report rMSSD. Comparing one against a baseline built from the
-- other produces a confident, meaningless number.
--
-- Until now the method lived only in a code comment, which the application
-- cannot read. This stores it per reading rather than deriving it from the
-- source, so a vendor changing method later does not retroactively relabel the
-- history recorded before the change.

alter table health_readings
  add column if not exists hrv_method text;

alter table health_readings
  drop constraint if exists health_readings_hrv_method_check;

alter table health_readings
  add constraint health_readings_hrv_method_check
  check (hrv_method is null or hrv_method in ('sdnn', 'rmssd'));

-- Backfill. Every HRV value stored before this migration came from Apple
-- Health, either forwarded by the export app or copied by hand from the same
-- place, so all of it is SDNN.
--
-- Manual rows are included deliberately. Leaving them null would make them
-- incomparable to everything around them and would change the scores of
-- existing users, which is a worse outcome than recording the assumption the
-- application has always made about them anyway.
update health_readings
   set hrv_method = 'sdnn'
 where hrv is not null
   and hrv_method is null;

-- ---------------------------------------------------------------------------
-- 2. Allow new sources
-- ---------------------------------------------------------------------------
-- The original constraint permitted only 'webhook' and 'manual'. The first
-- reading from any new provider would be rejected outright by the database.
--
-- Kept as an explicit list rather than dropped altogether: an unconstrained
-- text column accepts a typo as readily as a provider name, and a misspelled
-- source silently becomes its own baseline. Add a value here in the same
-- migration that adds the provider, and widen HealthReadingSource in
-- lib/types/health-reading.ts to match.

alter table health_readings
  drop constraint if exists health_readings_source_check;

alter table health_readings
  add constraint health_readings_source_check
  check (source in ('webhook', 'manual', 'whoop', 'oura', 'garmin', 'fitbit'));

-- ---------------------------------------------------------------------------
-- Check it worked
-- ---------------------------------------------------------------------------
-- Expect: hrv_method listed as a text column, and every row that has an hrv
-- value also having a method. A fresh account with no readings returns zero
-- rows from the second query, which is correct rather than a failure.

-- select column_name, data_type
--   from information_schema.columns
--  where table_name = 'health_readings'
--  order by ordinal_position;

-- select source, hrv_method, count(*)
--   from health_readings
--  where hrv is not null
--  group by source, hrv_method;
