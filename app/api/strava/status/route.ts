import { NextRequest, NextResponse } from "next/server";
import { getStravaConnection } from "@/lib/supabase/service-role";
import { verifyRequestUser } from "@/lib/supabase/verifyRequestUser";

// Read-only status check — never returns token fields, and deliberately
// never calls the refresh flow (see lib/strava/getValidAccessToken.ts).
// Keeping this route refresh-free narrows the concurrent-refresh race to
// only the activities route.
export async function GET(request: NextRequest) {
  const authResult = await verifyRequestUser(request);
  if ("errorResponse" in authResult) return authResult.errorResponse;
  const { user } = authResult;

  const connection = await getStravaConnection(user.id);
  if (!connection) {
    return NextResponse.json({ connected: false });
  }

  return NextResponse.json({
    connected: true,
    athleteFirstname: connection.athleteFirstname,
    athleteLastname: connection.athleteLastname,
    connectedAt: connection.connectedAt,
  });
}
