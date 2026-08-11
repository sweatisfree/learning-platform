import { env } from "@/lib/config/env";
import { supabase } from "@/lib/supabase/client";
import type { StravaTokenResponse } from "./types";

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

// Calls our own /api/strava/exchange route, which holds the client_secret
// server-side and never exposes it to the browser.
export async function exchangeStravaCode(code: string): Promise<StravaTokenResponse> {
  const { data: sessionData } = await supabase.auth.getSession();
  const accessToken = sessionData.session?.access_token;
  if (!accessToken) {
    throw new Error("You must be signed in to connect Strava");
  }

  const response = await fetch("/api/strava/exchange", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({ code }),
  });

  if (!response.ok) {
    const body = (await response.json().catch(() => ({}))) as { error?: string };
    throw new Error(body.error ?? `Strava exchange failed: ${response.status}`);
  }

  return (await response.json()) as StravaTokenResponse;
}
