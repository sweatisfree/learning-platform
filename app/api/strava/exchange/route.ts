import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";
import { env } from "@/lib/config/env";
import { serverEnv } from "@/lib/config/server-env";

// Holds STRAVA_CLIENT_SECRET server-side. Verifies the caller's Supabase
// session, exchanges the Strava OAuth `code` for tokens, and (once
// implemented) stores the refresh_token in a user-scoped, RLS-protected
// table — only a short-lived access_token goes back to the client.
export async function POST(request: NextRequest) {
  const authHeader = request.headers.get("Authorization");
  if (!authHeader) {
    return NextResponse.json({ error: "Missing Authorization header" }, { status: 401 });
  }

  const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: authHeader } },
  });

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  if (userError || !user) {
    return NextResponse.json({ error: "Invalid session" }, { status: 401 });
  }

  const { code } = (await request.json()) as { code?: string };
  if (!code) {
    return NextResponse.json({ error: "Missing code" }, { status: 400 });
  }

  if (!serverEnv.STRAVA_CLIENT_SECRET || !env.NEXT_PUBLIC_STRAVA_CLIENT_ID) {
    return NextResponse.json({ error: "Strava is not configured yet" }, { status: 501 });
  }

  // TODO: exchange `code` with Strava's /oauth/token using
  // NEXT_PUBLIC_STRAVA_CLIENT_ID/STRAVA_CLIENT_SECRET, store the
  // refresh_token against user.id in a strava_tokens table (RLS-protected),
  // and return { accessToken, expiresAt } to the client. Needs a registered
  // Strava API app before this can be implemented for real.
  return NextResponse.json({ error: "Not implemented" }, { status: 501 });
}
