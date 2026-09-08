export type ActivitySource = "strava" | "file" | "manual";

// The shape every input path (Strava OAuth, GPX/TCX upload, manual entry)
// normalizes into, so the calculation engines run identically regardless of
// where the data came from.
export interface Activity {
  id: string;
  source: ActivitySource;
  name: string;
  type: string;
  startDate: string; // ISO 8601
  movingTimeSeconds: number;
  distanceMeters: number;
  averageHeartRate: number | null;
  averageWatts: number | null;
  rpe: number | null; // Borg CR10 — only ever set by manual entries
}
