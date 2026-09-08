import "server-only";
import { env } from "@/lib/config/env";
import { serverEnv } from "@/lib/config/server-env";
import { getStravaConnection, updateStravaTokens } from "@/lib/supabase/service-role";

const STRAVA_TOKEN_URL = "https://www.strava.com/oauth/token";
const EXPIRY_BUFFER_SECONDS = 300;

interface RawStravaRefreshResponse {
  access_token: string;
  refresh_token: string;
  expires_at: number;
}

interface RefreshedTokens {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
}

// Strava's refresh-token grant response has no athlete object at all,
// unlike the initial authorization_code exchange — a distinct, smaller
// shape, mapped separately rather than reusing toStravaTokenResponse.
async function refreshWithToken(refreshToken: string): Promise<RefreshedTokens | null> {
  const response = await fetch(STRAVA_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: env.NEXT_PUBLIC_STRAVA_CLIENT_ID,
      client_secret: serverEnv.STRAVA_CLIENT_SECRET,
      grant_type: "refresh_token",
      refresh_token: refreshToken,
    }),
  });
  if (!response.ok) {
    console.error("Strava token refresh failed", response.status, await response.text());
    return null;
  }
  const raw = (await response.json()) as RawStravaRefreshResponse;
  return { accessToken: raw.access_token, refreshToken: raw.refresh_token, expiresAt: raw.expires_at };
}

// Returns a valid access token for the user, refreshing via Strava if the
// stored one is expired or expiring soon. Returns null if there's no
// connection or the refresh genuinely fails.
export async function getValidStravaAccessToken(userId: string): Promise<string | null> {
  const connection = await getStravaConnection(userId);
  if (!connection) return null;

  const nowSeconds = Math.floor(Date.now() / 1000);
  if (connection.expiresAt - EXPIRY_BUFFER_SECONDS > nowSeconds) {
    return connection.accessToken;
  }

  const refreshed = await refreshWithToken(connection.refreshToken);
  if (refreshed) {
    await updateStravaTokens(userId, refreshed);
    return refreshed.accessToken;
  }

  // Strava rotates the refresh_token on every use, invalidating the old one
  // immediately — a concurrent request (e.g. the dashboard fetching status
  // + activities on mount) may have already refreshed and rotated it out
  // from under this call. Re-read once: if the stored refresh_token
  // changed, someone else won the race and their result is usable. If it's
  // unchanged, this is a genuine failure (e.g. revoked access), not a race.
  const latest = await getStravaConnection(userId);
  if (latest && latest.refreshToken !== connection.refreshToken) {
    return latest.accessToken;
  }

  return null;
}
