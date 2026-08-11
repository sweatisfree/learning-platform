export interface StravaAthlete {
  id: number;
  firstname: string;
  lastname: string;
  profile: string | null;
}

export interface StravaActivity {
  id: number;
  name: string;
  type: string;
  startDate: string;
  movingTimeSeconds: number;
  distanceMeters: number;
  averageHeartRate: number | null;
  averageWatts: number | null;
}

export interface StravaTokenResponse {
  accessToken: string;
  refreshToken: string;
  expiresAt: number; // unix seconds
  athlete: StravaAthlete;
}
