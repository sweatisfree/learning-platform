import { NextRequest, NextResponse } from "next/server";
import { getValidStravaAccessToken } from "@/lib/strava/getValidAccessToken";
import { fetchRecentActivities } from "@/lib/strava/client";
import { verifyRequestUser } from "@/lib/supabase/verifyRequestUser";

export async function GET(request: NextRequest) {
  const authResult = await verifyRequestUser(request);
  if ("errorResponse" in authResult) return authResult.errorResponse;
  const { user } = authResult;

  const accessToken = await getValidStravaAccessToken(user.id);
  if (!accessToken) {
    return NextResponse.json({ error: "Strava is not connected" }, { status: 404 });
  }

  try {
    const activities = await fetchRecentActivities(accessToken);
    return NextResponse.json(activities);
  } catch (error) {
    console.error("Failed to fetch Strava activities", error instanceof Error ? error.message : error);
    return NextResponse.json({ error: "Failed to fetch Strava activities" }, { status: 502 });
  }
}
