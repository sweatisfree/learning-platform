import { NextRequest, NextResponse } from "next/server";
import { verifyRequestUser } from "@/lib/supabase/verifyRequestUser";
import {
  getHealthReadingsForExport,
  getStravaConnection,
  getSubscriptionByUserId,
  getUserProfileForExport,
} from "@/lib/supabase/service-role";

// Data export, per GDPR Arts. 15 and 20. Returns everything we hold about the
// caller as a single JSON download.
//
// Credentials are excluded on purpose: the Strava access and refresh tokens
// and the health-webhook token hash are our secrets rather than the user's
// personal data, and writing live OAuth tokens into a file someone downloads
// and might forward would be a security own-goal. The export says so in place
// of the values, so their absence is explained rather than silent.
export async function GET(request: NextRequest) {
  const authResult = await verifyRequestUser(request);
  if ("errorResponse" in authResult) return authResult.errorResponse;
  const { user } = authResult;

  try {
    const [profile, readings, strava, subscription] = await Promise.all([
      getUserProfileForExport(user.id),
      getHealthReadingsForExport(user.id),
      getStravaConnection(user.id),
      getSubscriptionByUserId(user.id),
    ]);

    const payload = {
      exportedAt: new Date().toISOString(),
      account: {
        id: user.id,
        email: user.email ?? null,
        createdAt: user.created_at ?? null,
      },
      athleteProfile: profile,
      healthReadings: readings,
      strava: strava
        ? {
            athleteId: strava.athleteId,
            athleteFirstname: strava.athleteFirstname,
            athleteLastname: strava.athleteLastname,
            connectedAt: strava.connectedAt,
            // See the note at the top of this file.
            tokensOmitted:
              "Access and refresh tokens are deliberately excluded from this export because they are credentials, not personal data.",
          }
        : null,
      subscription: subscription
        ? {
            status: subscription.status,
            currentPeriodEnd: subscription.currentPeriodEnd,
            cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
            trialEnd: subscription.trialEnd,
          }
        : null,
      notes: {
        activities:
          "Strava activities are fetched live from Strava on each request and are not stored by Thríamvos, so there is nothing to export here. Request them from Strava directly.",
        healthWebhookToken:
          "Your health-sync token is stored only as a one-way hash and cannot be recovered or exported.",
      },
    };

    const filename = `thriamvos-export-${new Date().toISOString().slice(0, 10)}.json`;
    return new NextResponse(JSON.stringify(payload, null, 2), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error("Account export failed", error instanceof Error ? error.message : error);
    return NextResponse.json({ error: "Could not build your export" }, { status: 500 });
  }
}
