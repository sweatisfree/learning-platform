import { supabase } from "@/lib/supabase/client";
import type { AutonomicReading } from "@/lib/engine/loadCalculator";
import { collapseReadingsByDate } from "@/lib/health/collapseReadings";
import type { HealthReadingSource, HrvMethod } from "@/lib/types/health-reading";

export type { HealthReadingSource } from "@/lib/types/health-reading";

// A row as stored, addressable by id so it can be deleted individually. The
// engine's AutonomicReading is derived from this rather than fetched
// separately, so there is one query and one source of truth.
export interface StoredHealthReading extends AutonomicReading {
  id: string;
  recordedDate: string;
  source: HealthReadingSource;
  hrvMethod: HrvMethod | null;
}

export interface StoredReadingsResult {
  readings: StoredHealthReading[];
  error: string | null;
}

export interface ReadingsResult {
  readings: AutonomicReading[];
  error: string | null;
}

// Unfiltered on purpose: a row with no usable signal still exists in the
// database, and filtering it here would make it invisible and therefore
// undeletable in the management list.
export async function fetchStoredHealthReadings(): Promise<StoredReadingsResult> {
  const { data, error } = await supabase
    .from("health_readings")
    .select("id, recorded_date, source, resting_heart_rate, hrv, hrv_method, sleep_hours, respiratory_rate")
    .order("recorded_date", { ascending: true });
  if (error) return { readings: [], error: error.message };

  const readings: StoredHealthReading[] = (data ?? []).map((row) => ({
    id: row.id as string,
    recordedDate: row.recorded_date as string,
    source: row.source as HealthReadingSource,
    hrvMethod: (row.hrv_method ?? null) as HrvMethod | null,
    restingHeartRate: row.resting_heart_rate ?? undefined,
    hrv: row.hrv ?? undefined,
    sleepHours: row.sleep_hours ?? undefined,
    respiratoryRate: row.respiratory_rate ?? undefined,
  }));
  return { readings, error: null };
}

// One reading per date, not one per stored row. Several rows can share a date
// (one per source), and handing the engine all of them weights that day once
// per source. See collapseReadingsByDate for the picking rule.
//
// Rows with no usable signal are dropped there, so what reaches the engine is
// only days that measured something — any subset of the four metrics is fine.
export function toAutonomicReadings(stored: readonly StoredHealthReading[]): AutonomicReading[] {
  return collapseReadingsByDate(stored).map((reading) => ({
    restingHeartRate: reading.restingHeartRate,
    hrv: reading.hrv,
    sleepHours: reading.sleepHours,
    respiratoryRate: reading.respiratoryRate,
  }));
}

// Kept for the dashboard and settings, which only ever needed engine input.
export async function fetchAutonomicReadings(): Promise<ReadingsResult> {
  const { readings, error } = await fetchStoredHealthReadings();
  if (error) return { readings: [], error };
  return { readings: toAutonomicReadings(readings), error: null };
}

// Deleted directly under RLS rather than through an API route: the DELETE
// policy added in 0007 scopes this to the caller's own rows, and there is no
// server-side side effect to coordinate. Contrast strava_connections, which
// has no policies at all and therefore needs a service-role route.
export async function deleteHealthReading(id: string): Promise<void> {
  const { error } = await supabase.from("health_readings").delete().eq("id", id);
  if (error) throw new Error(error.message);
}
