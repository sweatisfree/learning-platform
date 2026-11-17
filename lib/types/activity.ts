export type ActivitySource = "strava" | "file" | "manual";

// Lives here rather than in the engine so Activity can carry it without the
// types module importing the engine that imports it back.
export type NonGpsModality = "strength" | "isophit" | "non-gps";

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
  // Borg CR10. Null as it arrives from Strava or a file, which neither carry
  // perceived effort; filled in afterwards from activity_effort when the user
  // has rated the session, or set directly by manual entry.
  rpe: number | null;
  // Which multiplier the sRPE path should use. Null means the generic non-GPS
  // weighting. Only meaningful when rpe is set.
  modality?: NonGpsModality | null;
}
