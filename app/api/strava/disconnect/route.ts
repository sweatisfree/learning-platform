import { NextRequest, NextResponse } from "next/server";
import { verifyRequestUser } from "@/lib/supabase/verifyRequestUser";
import { deauthorizeStrava } from "@/lib/strava/deauthorize";
import { deleteStravaConnection, getStravaConnection } from "@/lib/supabase/service-role";

// Drops the Strava integration without touching the account.
//
// Deliberately narrow: this removes the row in strava_connections and nothing
// else. Health readings and the athlete profile survive, because they come
// from a different source — dropping one integration should not silently
// erase another's data. Deleting the whole account is a separate, explicit
// action at /api/account/delete.
export async function POST(request: NextRequest) {
  const authResult = await verifyRequestUser(request);
  if ("errorResponse" in authResult) return authResult.errorResponse;
  const { user } = authResult;

  try {
    const connection = await getStravaConnection(user.id);
    if (!connection) {
      return NextResponse.json({ error: "Strava is not connected" }, { status: 404 });
    }

    // Best-effort; our stored token is deleted either way.
    const revoked = await deauthorizeStrava(connection.accessToken);

    await deleteStravaConnection(user.id);

    return NextResponse.json({ disconnected: true, revokedAtStrava: revoked });
  } catch (error) {
    console.error("Strava disconnect failed", error instanceof Error ? error.message : error);
    return NextResponse.json({ error: "Could not disconnect Strava" }, { status: 500 });
  }
}
