import { NextRequest, NextResponse } from "next/server";
import { env } from "@/lib/config/env";
import { serverEnv } from "@/lib/config/server-env";
import { toClientConnection, toStravaTokenResponse, type RawStravaTokenResponse } from "@/lib/strava/exchange";
import { saveNewStravaConnection } from "@/lib/supabase/service-role";
import { verifyRequestUser } from "@/lib/supabase/verifyRequestUser";

const STRAVA_TOKEN_URL = "https://www.strava.com/oauth/token";

// Holds STRAVA_CLIENT_SECRET server-side. Verifies the caller's Supabase
// session, exchanges the Strava OAuth `code` for tokens, and returns only a
// short-lived access_token + athlete info to the client — the
// client_secret and refresh_token never leave this route.
export async function POST(request: NextRequest) {
  const authResult = await verifyRequestUser(request);
  if ("errorResponse" in authResult) return authResult.errorResponse;
  const { user } = authResult;

  const { code } = (await request.json()) as { code?: string };
  if (!code) {
    return NextResponse.json({ error: "Missing code" }, { status: 400 });
  }

  if (!serverEnv.STRAVA_CLIENT_SECRET || !env.NEXT_PUBLIC_STRAVA_CLIENT_ID) {
    return NextResponse.json({ error: "Strava is not configured yet" }, { status: 501 });
  }

  const tokenResponse = await fetch(STRAVA_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: env.NEXT_PUBLIC_STRAVA_CLIENT_ID,
      client_secret: serverEnv.STRAVA_CLIENT_SECRET,
      code,
      grant_type: "authorization_code",
    }),
  });

  if (!tokenResponse.ok) {
    const errorBody = await tokenResponse.text();
    console.error("Strava token exchange failed", tokenResponse.status, errorBody);
    return NextResponse.json({ error: "Strava rejected the authorization code" }, { status: 502 });
  }

  const raw = (await tokenResponse.json()) as RawStravaTokenResponse;
  const full = toStravaTokenResponse(raw);

  // user.id comes from the verified session above, never from client
  // input — this is the one place a mixup would write tokens into the
  // wrong user's row.
  try {
    await saveNewStravaConnection(user.id, full);
  } catch (error) {
    console.error("Failed to persist Strava connection", error instanceof Error ? error.message : error);
    return NextResponse.json({ error: "Failed to save Strava connection" }, { status: 500 });
  }

  return NextResponse.json(toClientConnection(full));
}
