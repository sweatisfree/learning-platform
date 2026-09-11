import { NextRequest, NextResponse } from "next/server";
import { verifyRequestUser } from "@/lib/supabase/verifyRequestUser";
import { getStripe } from "@/lib/stripe/client";
import { getSubscriptionByUserId } from "@/lib/supabase/service-role";

// Opens Stripe's hosted Billing Portal, which handles cancellation, card
// updates and invoice history. The customer id is looked up from our own table
// by verified user id, so a caller cannot ask for someone else's portal.
export async function POST(request: NextRequest) {
  const authResult = await verifyRequestUser(request);
  if ("errorResponse" in authResult) return authResult.errorResponse;
  const { user } = authResult;

  let stripe;
  try {
    stripe = getStripe();
  } catch (error) {
    console.error("Stripe portal: not configured", error instanceof Error ? error.message : error);
    return NextResponse.json({ error: "Billing is not configured" }, { status: 500 });
  }

  try {
    const subscription = await getSubscriptionByUserId(user.id);
    if (!subscription) {
      return NextResponse.json({ error: "No billing account yet" }, { status: 404 });
    }

    const origin = request.headers.get("origin") ?? new URL(request.url).origin;
    const session = await stripe.billingPortal.sessions.create({
      customer: subscription.stripeCustomerId,
      return_url: `${origin}/settings`,
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error("Stripe portal failed", error instanceof Error ? error.message : error);
    return NextResponse.json({ error: "Could not open billing portal" }, { status: 500 });
  }
}
