import "server-only";
import { z } from "zod";
import { optionalString } from "./optional-string";

// Server-only secrets. Never import this from a "use client" component —
// the `server-only` import above makes that a build error, not just a rule.
const serverEnvSchema = z.object({
  STRAVA_CLIENT_SECRET: optionalString,
  SUPABASE_SERVICE_ROLE_KEY: optionalString,
  // Optional so the app still builds without billing configured — each is
  // checked at the point of use, which fails loudly rather than at import.
  STRIPE_SECRET_KEY: optionalString,
  STRIPE_WEBHOOK_SECRET: optionalString,
  STRIPE_PRICE_ID: optionalString,
});

export const serverEnv = serverEnvSchema.parse({
  STRAVA_CLIENT_SECRET: process.env.STRAVA_CLIENT_SECRET,
  SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
  STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY,
  STRIPE_WEBHOOK_SECRET: process.env.STRIPE_WEBHOOK_SECRET,
  STRIPE_PRICE_ID: process.env.STRIPE_PRICE_ID,
});
