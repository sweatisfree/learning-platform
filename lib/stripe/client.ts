import "server-only";
import Stripe from "stripe";
import { serverEnv } from "@/lib/config/server-env";

// Single shared Stripe client. `server-only` makes importing this from a
// client component a build error, not just a convention — the secret key must
// never reach a browser bundle.
let cached: Stripe | null = null;

export function getStripe(): Stripe {
  if (!serverEnv.STRIPE_SECRET_KEY) {
    throw new Error("STRIPE_SECRET_KEY is not configured");
  }
  cached ??= new Stripe(serverEnv.STRIPE_SECRET_KEY);
  return cached;
}

export function getStripePriceId(): string {
  if (!serverEnv.STRIPE_PRICE_ID) {
    throw new Error("STRIPE_PRICE_ID is not configured");
  }
  return serverEnv.STRIPE_PRICE_ID;
}

export function getStripeWebhookSecret(): string {
  if (!serverEnv.STRIPE_WEBHOOK_SECRET) {
    throw new Error("STRIPE_WEBHOOK_SECRET is not configured");
  }
  return serverEnv.STRIPE_WEBHOOK_SECRET;
}

// The trial the Terms and the landing page both commit to. Changing this
// means changing those documents in the same commit.
export const TRIAL_PERIOD_DAYS = 14;
