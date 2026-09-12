import { NextRequest, NextResponse } from "next/server";
import { verifyRequestUser } from "@/lib/supabase/verifyRequestUser";
import { getStripe, getStripePriceId, TRIAL_PERIOD_DAYS } from "@/lib/stripe/client";
import { getSubscriptionByUserId, linkStripeCustomer } from "@/lib/supabase/service-role";

// Creates a Stripe Checkout Session for the signed-in user.
//
// The user id comes only from the verified Supabase session — never from the
// request body — and is stamped into the session's metadata so the webhook can
// match the resulting customer back to an account it can trust.
export async function POST(request: NextRequest) {
  const authResult = await verifyRequestUser(request);
  if ("errorResponse" in authResult) return authResult.errorResponse;
  const { user } = authResult;

  let stripe;
  let priceId;
  try {
    stripe = getStripe();
    priceId = getStripePriceId();
  } catch (error) {
    console.error("Stripe checkout: not configured", error instanceof Error ? error.message : error);
    return NextResponse.json({ error: "Billing is not configured" }, { status: 500 });
  }

  try {
    const existing = await getSubscriptionByUserId(user.id);

    // Reuse the customer if we've already made one, so a user who abandons
    // checkout and returns doesn't accumulate duplicate Stripe customers.
    let customerId = existing?.stripeCustomerId;
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email ?? undefined,
        metadata: { userId: user.id },
      });
      customerId = customer.id;
      await linkStripeCustomer(user.id, customerId);
    }

    const origin = request.headers.get("origin") ?? new URL(request.url).origin;

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer: customerId,
      line_items: [{ price: priceId, quantity: 1 }],
      subscription_data: {
        trial_period_days: TRIAL_PERIOD_DAYS,
        metadata: { userId: user.id },
      },
      // Lets a customer enter a promotion code (e.g. a 100%-off test code) on
      // the Stripe-hosted page. Without this, promo codes exist but are
      // unenterable.
      allow_promotion_codes: true,
      client_reference_id: user.id,
      metadata: { userId: user.id },
      success_url: `${origin}/settings?checkout=success`,
      cancel_url: `${origin}/settings?checkout=cancelled`,
    });

    if (!session.url) {
      return NextResponse.json({ error: "Stripe returned no checkout URL" }, { status: 502 });
    }
    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error("Stripe checkout failed", error instanceof Error ? error.message : error);
    return NextResponse.json({ error: "Could not start checkout" }, { status: 500 });
  }
}
