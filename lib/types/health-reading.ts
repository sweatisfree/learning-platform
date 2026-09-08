export type HealthReadingSource = "webhook" | "manual";

export interface HealthReading {
  id: string;
  userId: string;
  source: HealthReadingSource;
  recordedDate: string; // YYYY-MM-DD
  restingHeartRate: number | null;
  hrv: number | null; // ms — whatever HRV metric the source provides (Apple HealthKit: SDNN)
  createdAt: string;
}
