import { NextRequest, NextResponse } from "next/server";
import { verifyRequestUser } from "@/lib/supabase/verifyRequestUser";
import { getStripe } from "@/lib/stripe/client";
import { serverEnv } from "@/lib/config/server-env";
import { deauthorizeStrava } from "@/lib/strava/deauthorize";
import {
  deleteAuthUser,
  getStravaConnection,
  getSubscriptionByUserId,
} from "@/lib/supabase/service-role";

// Irreversible account deletion, per GDPR Art. 17.
//
// The step order matters more than anything else here: billing is cancelled
// FIRST and aborts the whole operation on failure. The alternative ordering
// risks deleting the account while a Stripe subscription keeps charging
// someone who no longer has any way to see or stop it.
export async function POST(request: NextRequest) {
  const authResult = await verifyRequestUser(request);
  if ("errorResponse" in authResult) return authResult.errorResponse;
  const { user } = authResult;

  // Typed confirmation, re-checked here against the verified session rather
  // than trusted from the client — the browser check is only a convenience.
  let body: { confirmEmail?: unknown };
  try {
    body = (await request.json()) as { confirmEmail?: unknown };
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const confirmEmail = typeof body.confirmEmail === "string" ? body.confirmEmail.trim() : "";
  if (!user.email || confirmEmail.toLowerCase() !== user.email.toLowerCase()) {
    return NextResponse.json(
      { error: "Type your account email exactly to confirm deletion." },
      { status: 400 },
    );
  }

  if (!serverEnv.SUPABASE_SERVICE_ROLE_KEY) {
    console.error("Account deletion: service role key not configured");
    return NextResponse.json({ error: "Server misconfigured" }, { status: 500 });
  }

  // --- Step 1: cancel billing. Hard gate — abort and delete nothing on failure.
  try {
    const subscription = await getSubscriptionByUserId(user.id);
    if (subscription?.stripeSubscriptionId) {
      await getStripe().subscriptions.cancel(subscription.stripeSubscriptionId);
    }
  } catch (error) {
    console.error(
      "Account deletion: could not cancel subscription, aborting",
      error instanceof Error ? error.message : error,
    );
    return NextResponse.json(
      {
        error:
          "We could not cancel your subscription, so nothing was deleted. Try again, or cancel in the billing portal first.",
      },
      { status: 502 },
    );
  }

  // --- Step 2: revoke Strava. Best-effort: a third-party outage must not
  // block someone's erasure right, and our copy of the token dies in step 3
  // regardless. Shared with the disconnect route so the two cannot drift.
  try {
    const strava = await getStravaConnection(user.id);
    if (strava?.accessToken) {
      await deauthorizeStrava(strava.accessToken);
    }
  } catch (error) {
    console.error(
      "Account deletion: could not read Strava connection, continuing",
      error instanceof Error ? error.message : error,
    );
  }

  // --- Step 3: delete the auth user, cascading all five user-data tables.
  try {
    await deleteAuthUser(user.id);
  } catch (error) {
    console.error("Account deletion: failed to delete user", error instanceof Error ? error.message : error);
    return NextResponse.json({ error: "Could not delete your account" }, { status: 500 });
  }

  return NextResponse.json({ deleted: true });
}
