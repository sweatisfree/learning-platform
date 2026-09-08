alter table health_readings
  add column if not exists sleep_hours numeric,
  add column if not exists respiratory_rate numeric;
