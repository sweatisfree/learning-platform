import type { StravaActivity } from "./types";

const STRAVA_API_BASE = "https://www.strava.com/api/v3";

interface RawStravaActivity {
  id: number;
  name: string;
  type: string;
  start_date: string;
  moving_time: number;
  distance: number;
  average_heartrate: number | null;
  average_watts: number | null;
}

// Talks to Strava directly with a short-lived access_token obtained via the
// Supabase Edge Function (see lib/strava/oauth.ts). Never send the
// client_secret from here.
export async function fetchRecentActivities(
  accessToken: string,
  perPage = 30,
): Promise<StravaActivity[]> {
  const response = await fetch(`${STRAVA_API_BASE}/athlete/activities?per_page=${perPage}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!response.ok) {
    throw new Error(`Strava API error: ${response.status}`);
  }
  const raw = (await response.json()) as RawStravaActivity[];
  return raw.map((activity) => ({
    id: activity.id,
    name: activity.name,
    type: activity.type,
    startDate: activity.start_date,
    movingTimeSeconds: activity.moving_time,
    distanceMeters: activity.distance,
    averageHeartRate: activity.average_heartrate,
    averageWatts: activity.average_watts,
  }));
}
