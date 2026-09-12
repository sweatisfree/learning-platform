import { supabase } from "@/lib/supabase/client";
import type { AutonomicReading } from "@/lib/engine/loadCalculator";

export type HealthReadingSource = "webhook" | "manual";

// A row as stored, addressable by id so it can be deleted individually. The
// engine's AutonomicReading is derived from this rather than fetched
// separately, so there is one query and one source of truth.
export interface StoredHealthReading extends AutonomicReading {
  id: string;
  recordedDate: string;
  source: HealthReadingSource;
}

export interface StoredReadingsResult {
  readings: StoredHealthReading[];
  error: string | null;
}

export interface ReadingsResult {
  readings: AutonomicReading[];
  error: string | null;
}

function hasAnySignal(reading: AutonomicReading): boolean {
  return (
    reading.restingHeartRate != null ||
    reading.hrv != null ||
    reading.sleepHours != null ||
    reading.respiratoryRate != null
  );
}

// Unfiltered on purpose: a row with no usable signal still exists in the
// database, and filtering it here would make it invisible and therefore
// undeletable in the management list.
export async function fetchStoredHealthReadings(): Promise<StoredReadingsResult> {
  const { data, error } = await supabase
    .from("health_readings")
    .select("id, recorded_date, source, resting_heart_rate, hrv, sleep_hours, respiratory_rate")
    .order("recorded_date", { ascending: true });
  if (error) return { readings: [], error: error.message };

  const readings: StoredHealthReading[] = (data ?? []).map((row) => ({
    id: row.id as string,
    recordedDate: row.recorded_date as string,
    source: row.source as HealthReadingSource,
    restingHeartRate: row.resting_heart_rate ?? undefined,
    hrv: row.hrv ?? undefined,
    sleepHours: row.sleep_hours ?? undefined,
    respiratoryRate: row.respiratory_rate ?? undefined,
  }));
  return { readings, error: null };
}

// Drops rows with no usable signal at all — everything else feeds the engine's
// graceful degradation, where any subset of the four metrics is fine.
export function toAutonomicReadings(stored: readonly StoredHealthReading[]): AutonomicReading[] {
  return stored.filter(hasAnySignal).map((reading) => ({
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
