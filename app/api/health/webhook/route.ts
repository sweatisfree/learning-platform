import { NextRequest, NextResponse } from "next/server";
import { resolveUserIdForToken, upsertWebhookHealthReadings } from "@/lib/supabase/service-role";
import { parseHealthAutoExportPayload } from "@/lib/health/parseHealthAutoExportPayload";

// Auth is a custom header, not a URL path segment or Supabase session — a
// third-party HealthKit-export app (e.g. Health Auto Export) can't do OAuth
// or send a session JWT, it can only POST to a fixed URL with configurable
// headers on a schedule. The unguessable per-user token IS the credential.
// See supabase/migrations/0001_health_data.sql and lib/supabase/service-role.ts.
export async function POST(request: NextRequest) {
  const token = request.headers.get("X-Health-Token");
  if (!token) {
    return NextResponse.json({ error: "Missing X-Health-Token header" }, { status: 401 });
  }

  let userId: string | null;
  try {
    userId = await resolveUserIdForToken(token);
  } catch (error) {
    // Most likely SUPABASE_SERVICE_ROLE_KEY isn't configured — fail loudly
    // rather than silently dropping incoming health data.
    console.error("Health webhook: failed to resolve token", error instanceof Error ? error.message : error);
    return NextResponse.json({ error: "Server misconfigured" }, { status: 500 });
  }

  // Uniform 404 whether the token is malformed or simply unknown — no
  // discovery oracle for which tokens are "close" to valid.
  if (!userId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const readings = parseHealthAutoExportPayload(payload);

  try {
    await upsertWebhookHealthReadings(userId, readings);
  } catch (error) {
    // Never log the full payload body — it's biometric data, and logging it
    // would create an unprotected shadow copy outside the RLS-protected table.
    console.error("Health webhook: failed to store readings", error instanceof Error ? error.message : error);
    return NextResponse.json({ error: "Failed to store readings" }, { status: 500 });
  }

  return NextResponse.json({ stored: readings.length });
}
