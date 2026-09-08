import type { Activity } from "@/lib/types/activity";

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

// Talks to Strava directly with a short-lived access_token. Never send the
// client_secret from here — that only ever happens server-side in
// app/api/strava/exchange and lib/strava/getValidAccessToken.
//
// Strava's activities endpoint returns the most recent N activities by
// count when unfiltered, not by time window — an active athlete could get
// back less than a week of history despite a generous perPage. Filtering
// by `after` (and using a high perPage) ensures enough days land for the
// 7/28-day ACWR windows to be meaningful right after a fresh connect.
export async function fetchRecentActivities(
  accessToken: string,
  { afterDaysAgo = 42, perPage = 100 }: { afterDaysAgo?: number; perPage?: number } = {},
): Promise<Activity[]> {
  const afterUnixSeconds = Math.floor(Date.now() / 1000) - afterDaysAgo * 24 * 60 * 60;
  const response = await fetch(
    `${STRAVA_API_BASE}/athlete/activities?per_page=${perPage}&after=${afterUnixSeconds}`,
    { headers: { Authorization: `Bearer ${accessToken}` } },
  );
  if (!response.ok) {
    throw new Error(`Strava API error: ${response.status}`);
  }
  const raw = (await response.json()) as RawStravaActivity[];
  return raw.map((activity) => ({
    id: String(activity.id),
    source: "strava",
    name: activity.name,
    type: activity.type,
    startDate: activity.start_date,
    movingTimeSeconds: activity.moving_time,
    distanceMeters: activity.distance,
    averageHeartRate: activity.average_heartrate,
    averageWatts: activity.average_watts,
    rpe: null,
  }));
}
