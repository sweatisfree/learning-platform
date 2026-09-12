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

  // Optional. When a code is supplied we pre-apply it server-side, which makes
  // the total $0 and lets us skip card collection for that session only.
  let requestedPromotionCode: string | null = null;
  try {
    const body = (await request.json()) as { promotionCode?: unknown };
    if (typeof body.promotionCode === "string" && body.promotionCode.trim() !== "") {
      requestedPromotionCode = body.promotionCode.trim();
    }
  } catch {
    // No body, or not JSON — the normal card-collecting path.
  }

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

    // Resolve the submitted code to the COUPON it points at, and apply that
    // rather than the promotion code itself. Stripe's order summary shows an
    // applied promotion code verbatim, which would print the redeemable string
    // on the checkout page for anyone to reuse. Applying the coupon shows only
    // the coupon's display name, so the code never leaves our server.
    let couponId: string | null = null;
    if (requestedPromotionCode) {
      const matches = await stripe.promotionCodes.list({
        code: requestedPromotionCode,
        active: true,
        limit: 1,
      });
      // A promotion code points at a `promotion`, whose `coupon` is either an
      // id string or an expanded object depending on API version.
      const promotion = matches.data[0]?.promotion as
        | { coupon?: string | { id?: string } }
        | undefined;
      const coupon = promotion?.coupon;
      couponId = typeof coupon === "string" ? coupon : coupon?.id ?? null;
      if (!couponId) {
        return NextResponse.json({ error: "That code isn't valid." }, { status: 400 });
      }
    }

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer: customerId,
      line_items: [{ price: priceId, quantity: 1 }],
      subscription_data: {
        trial_period_days: TRIAL_PERIOD_DAYS,
        metadata: { userId: user.id },
        // Only relevant on the no-card path: with nothing on file there is
        // nothing to charge when the trial ends, so Stripe requires us to say
        // what happens. Cancelling is the honest outcome — a subscription that
        // was never paid for shouldn't silently persist.
        ...(couponId
          ? { trial_settings: { end_behavior: { missing_payment_method: "cancel" as const } } }
          : {}),
      },
      // allow_promotion_codes is deliberately NOT set. Enabling it renders a
      // promotion-code field on Stripe's public checkout page, which advertises
      // that codes exist and invites guessing at a 100%-off one. Codes are
      // accepted only server-side, from an authenticated request.
      //
      // With a code: apply the coupon so the total is $0, paired with
      // if_required so no card is collected. payment_method_collection isn't
      // coupon-aware and a 14-day trial already makes the amount due $0 for
      // everyone, so this is the only way to skip the card for discounted
      // checkouts without skipping it for real subscribers too.
      ...(couponId
        ? {
            discounts: [{ coupon: couponId }],
            payment_method_collection: "if_required" as const,
          }
        : {}),
      // Stripe Managed Payments gets switched on automatically during merchant
      // onboarding. It requires a tax_code on every product and bills an
      // add-on fee, and without the tax code it rejects session creation
      // outright. We don't want either, so it's disabled per-session — the
      // documented alternative is adding tax_code to every line item.
      managed_payments: { enabled: false },
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
    // Surface the real Stripe failure rather than a generic string. "Could not
    // start checkout" told us nothing about whether the price was missing, the
    // key was from the wrong account, or the customer create failed.
    //
    // Stripe's error messages are developer-facing and contain no credentials,
    // and this route already requires a verified session, so returning the
    // detail exposes nothing the caller could not see in their own dashboard.
    const detail = describeStripeError(error);
    console.error("Stripe checkout failed", detail);
    return NextResponse.json({ error: `Could not start checkout: ${detail.message}`, detail }, { status: 500 });
  }
}

interface StripeErrorDetail {
  message: string;
  type?: string;
  code?: string;
  statusCode?: number;
  param?: string;
  requestId?: string;
}

function describeStripeError(error: unknown): StripeErrorDetail {
  if (typeof error !== "object" || error === null) {
    return { message: String(error) };
  }
  const candidate = error as {
    message?: unknown;
    type?: unknown;
    code?: unknown;
    statusCode?: unknown;
    param?: unknown;
    requestId?: unknown;
  };
  return {
    message: typeof candidate.message === "string" ? candidate.message : "Unknown error",
    type: typeof candidate.type === "string" ? candidate.type : undefined,
    code: typeof candidate.code === "string" ? candidate.code : undefined,
    statusCode: typeof candidate.statusCode === "number" ? candidate.statusCode : undefined,
    param: typeof candidate.param === "string" ? candidate.param : undefined,
    requestId: typeof candidate.requestId === "string" ? candidate.requestId : undefined,
  };
}
