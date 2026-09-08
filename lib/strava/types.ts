export interface StravaAthlete {
  id: number;
  firstname: string;
  lastname: string;
  profile: string | null;
}

export interface StravaTokenResponse {
  accessToken: string;
  refreshToken: string;
  expiresAt: number; // unix seconds
  athlete: StravaAthlete;
}

// What's safe to send to the browser after the exchange — no refresh_token.
// It stays server-side (see app/api/strava/exchange/route.ts) since it's a
// long-lived credential, unlike the short-lived access_token.
export interface StravaConnection {
  accessToken: string;
  expiresAt: number;
  athlete: StravaAthlete;
}
