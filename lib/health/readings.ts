import { supabase } from "@/lib/supabase/client";
import type { AutonomicReading } from "@/lib/engine/loadCalculator";

export interface ReadingsResult {
  readings: AutonomicReading[];
  error: string | null;
}

// Shared by the settings page and the dashboard. Rows with no usable signal at
// all are skipped; everything else feeds the engine's graceful degradation
// (any subset of the four metrics is fine).
export async function fetchAutonomicReadings(): Promise<ReadingsResult> {
  const { data, error } = await supabase
    .from("health_readings")
    .select("recorded_date, resting_heart_rate, hrv, sleep_hours, respiratory_rate")
    .order("recorded_date", { ascending: true });
  if (error) return { readings: [], error: error.message };

  const readings: AutonomicReading[] = (data ?? [])
    .map((row) => ({
      restingHeartRate: row.resting_heart_rate ?? undefined,
      hrv: row.hrv ?? undefined,
      sleepHours: row.sleep_hours ?? undefined,
      respiratoryRate: row.respiratory_rate ?? undefined,
    }))
    .filter(
      (reading) =>
        reading.restingHeartRate != null ||
        reading.hrv != null ||
        reading.sleepHours != null ||
        reading.respiratoryRate != null,
    );
  return { readings, error: null };
}
