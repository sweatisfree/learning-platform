import { NextRequest, NextResponse } from "next/server";
import type Stripe from "stripe";
import { getStripe, getStripeWebhookSecret } from "@/lib/stripe/client";
import {
  getSubscriptionByCustomerId,
  upsertSubscriptionState,
  type SubscriptionUpdate,
} from "@/lib/supabase/service-role";

// Stripe's signature is the only credential on this route — there is no user
// session on an inbound webhook, same situation as the HealthKit webhook in
// app/api/health/webhook/route.ts. Nothing is written before the signature
// verifies.

function toIso(seconds: number | null | undefined): string | null {
  return seconds == null ? null : new Date(seconds * 1000).toISOString();
}

function customerIdOf(customer: string | Stripe.Customer | Stripe.DeletedCustomer | null): string | null {
  if (customer == null) return null;
  return typeof customer === "string" ? customer : customer.id;
}

// Resolves which of our users an event belongs to. Prefers the userId we
// stamped into metadata at checkout, but only accepts it when it matches the
// row already linked to that Stripe customer — so a forged metadata value on
// an otherwise-valid event can't retarget another account.
async function resolveUserId(
  customerId: string,
  metadataUserId: string | undefined,
): Promise<string | null> {
  const linked = await getSubscriptionByCustomerId(customerId);
  if (linked) {
    if (metadataUserId && metadataUserId !== linked.userId) {
      console.error("Stripe webhook: metadata userId does not match linked customer; ignoring metadata");
    }
    return linked.userId;
  }
  // No row yet (checkout completed before we stored anything) — the metadata
  // is the only source, and it came from a Stripe-signed payload.
  return metadataUserId ?? null;
}

function updateFromSubscription(subscription: Stripe.Subscription): SubscriptionUpdate {
  const item = subscription.items.data[0];
  return {
    stripeSubscriptionId: subscription.id,
    status: subscription.status,
    priceId: item?.price.id ?? null,
    // Period end lives on the subscription item in current API versions.
    currentPeriodEnd: toIso(item?.current_period_end),
    cancelAtPeriodEnd: subscription.cancel_at_period_end,
    trialEnd: toIso(subscription.trial_end),
  };
}

export async function POST(request: NextRequest) {
  const signature = request.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json({ error: "Missing stripe-signature header" }, { status: 400 });
  }

  let stripe;
  let webhookSecret;
  try {
    stripe = getStripe();
    webhookSecret = getStripeWebhookSecret();
  } catch (error) {
    console.error("Stripe webhook: not configured", error instanceof Error ? error.message : error);
    return NextResponse.json({ error: "Server misconfigured" }, { status: 500 });
  }

  // Raw body, not request.json() — parsing and re-serialising would change the
  // bytes the signature was computed over and every event would fail to verify.
  const rawBody = await request.text();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
  } catch (error) {
    console.error("Stripe webhook: signature verification failed", error instanceof Error ? error.message : error);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object;
        const customerId = customerIdOf(session.customer);
        if (!customerId) break;

        const userId = await resolveUserId(customerId, session.metadata?.userId);
        if (!userId) {
          console.error("Stripe webhook: no user for customer", customerId);
          break;
        }

        // The session carries only a subscription id, so fetch the object to
        // get status, period end and trial end in one consistent shape.
        const subscriptionId =
          typeof session.subscription === "string" ? session.subscription : session.subscription?.id;
        if (!subscriptionId) break;

        const subscription = await stripe.subscriptions.retrieve(subscriptionId);
        await upsertSubscriptionState(userId, customerId, updateFromSubscription(subscription));
        break;
      }

      case "customer.subscription.created":
      case "customer.subscription.updated":
      case "customer.subscription.deleted": {
        const subscription = event.data.object;
        const customerId = customerIdOf(subscription.customer);
        if (!customerId) break;

        const userId = await resolveUserId(customerId, subscription.metadata?.userId);
        if (!userId) {
          console.error("Stripe webhook: no user for customer", customerId);
          break;
        }

        await upsertSubscriptionState(userId, customerId, updateFromSubscription(subscription));
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object;
        const customerId = customerIdOf(invoice.customer);
        if (!customerId) break;

        const linked = await getSubscriptionByCustomerId(customerId);
        if (!linked) break;

        // Don't invent a status — re-read the subscription so what we store is
        // whatever Stripe actually thinks it is (past_due, unpaid, canceled).
        if (linked.stripeSubscriptionId) {
          const subscription = await stripe.subscriptions.retrieve(linked.stripeSubscriptionId);
          await upsertSubscriptionState(linked.userId, customerId, updateFromSubscription(subscription));
        }
        break;
      }

      default:
        // Unhandled event types are acknowledged, not errored — returning a
        // non-2xx would make Stripe retry something we deliberately ignore.
        break;
    }
  } catch (error) {
    // A 500 tells Stripe to retry, which is what we want for a transient
    // database failure. The upserts write absolute state, so a retry is safe.
    console.error("Stripe webhook: handler failed", event.type, error instanceof Error ? error.message : error);
    return NextResponse.json({ error: "Handler failed" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
