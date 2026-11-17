// Kept in step with the check constraint in
// supabase/migrations/0008_health_readings_source_and_hrv_method.sql. Widening
// one without the other means either the database rejects a row the app
// believes is valid, or the app meets a source it has no priority rule for.
export type HealthReadingSource =
  | "webhook" // Apple Health, bridged by a third-party export app
  | "manual"
  | "whoop"
  | "oura"
  | "garmin"
  | "fitbit";

// SDNN and rMSSD are different measures of heart-rate variability, not two
// scales of one measure, and must never be converted into each other or mixed
// in a single baseline. Apple reports SDNN; every other source here reports
// rMSSD. Stored per reading rather than derived from the source, so a vendor
// changing method does not silently corrupt the history behind it.
export type HrvMethod = "sdnn" | "rmssd";

export interface HealthReading {
  id: string;
  userId: string;
  source: HealthReadingSource;
  recordedDate: string; // YYYY-MM-DD
  restingHeartRate: number | null;
  hrv: number | null; // ms
  hrvMethod: HrvMethod | null;
  createdAt: string;
}
