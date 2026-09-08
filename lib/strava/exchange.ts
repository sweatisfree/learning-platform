import type { StravaConnection, StravaTokenResponse } from "./types";

// Strava's raw /oauth/token JSON shape (snake_case, per their API docs).
export interface RawStravaTokenResponse {
  access_token: string;
  refresh_token: string;
  expires_at: number;
  athlete: {
    id: number;
    firstname: string;
    lastname: string;
    profile: string | null;
  };
}

export function toStravaTokenResponse(raw: RawStravaTokenResponse): StravaTokenResponse {
  return {
    accessToken: raw.access_token,
    refreshToken: raw.refresh_token,
    expiresAt: raw.expires_at,
    athlete: {
      id: raw.athlete.id,
      firstname: raw.athlete.firstname,
      lastname: raw.athlete.lastname,
      profile: raw.athlete.profile ?? null,
    },
  };
}

// Strips the refresh_token before a token response ever crosses the
// server/client boundary.
export function toClientConnection(full: StravaTokenResponse): StravaConnection {
  return { accessToken: full.accessToken, expiresAt: full.expiresAt, athlete: full.athlete };
}
