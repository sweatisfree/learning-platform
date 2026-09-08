import { env } from "@/lib/config/env";
import { supabase } from "@/lib/supabase/client";
import type { Activity } from "@/lib/types/activity";
import type { StravaConnection } from "./types";

const STRAVA_AUTHORIZE_URL = "https://www.strava.com/oauth/authorize";

export function buildStravaAuthorizeUrl(): string {
  if (!env.NEXT_PUBLIC_STRAVA_CLIENT_ID || !env.NEXT_PUBLIC_STRAVA_REDIRECT_URI) {
    throw new Error("Strava client id/redirect URI are not configured");
  }
  const params = new URLSearchParams({
    client_id: env.NEXT_PUBLIC_STRAVA_CLIENT_ID,
    redirect_uri: env.NEXT_PUBLIC_STRAVA_REDIRECT_URI,
    response_type: "code",
    approval_prompt: "auto",
    scope: "activity:read_all",
  });
  return `${STRAVA_AUTHORIZE_URL}?${params.toString()}`;
}

// Standard web OAuth: full-page redirect to Strava's consent screen.
export function startStravaAuthorization(): void {
  window.location.href = buildStravaAuthorizeUrl();
}

async function authorizedFetch(path: string, init?: RequestInit): Promise<Response> {
  const { data: sessionData } = await supabase.auth.getSession();
  const accessToken = sessionData.session?.access_token;
  if (!accessToken) {
    throw new Error("You must be signed in to use Strava.");
  }
  return fetch(path, {
    ...init,
    headers: { ...init?.headers, Authorization: `Bearer ${accessToken}` },
  });
}

// Calls our own /api/strava/exchange route, which holds the client_secret
// server-side and never exposes it to the browser.
export async function exchangeStravaCode(code: string): Promise<StravaConnection> {
  const response = await authorizedFetch("/api/strava/exchange", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ code }),
  });

  if (!response.ok) {
    const body = (await response.json().catch(() => ({}))) as { error?: string };
    throw new Error(body.error ?? `Strava exchange failed: ${response.status}`);
  }

  return (await response.json()) as StravaConnection;
}

export interface StravaStatus {
  connected: boolean;
  athleteFirstname?: string | null;
  athleteLastname?: string | null;
  connectedAt?: string;
}

export async function fetchStravaStatus(): Promise<StravaStatus> {
  const response = await authorizedFetch("/api/strava/status");
  if (!response.ok) {
    throw new Error(`Failed to fetch Strava status: ${response.status}`);
  }
  return (await response.json()) as StravaStatus;
}

// Returns [] if Strava isn't connected (404), rather than throwing — that's
// an expected, common state, not an error condition for callers to handle.
export async function fetchStravaActivitiesFromApi(): Promise<Activity[]> {
  const response = await authorizedFetch("/api/strava/activities");
  if (response.status === 404) return [];
  if (!response.ok) {
    throw new Error(`Failed to fetch Strava activities: ${response.status}`);
  }
  return (await response.json()) as Activity[];
}
