import "server-only";
import { z } from "zod";
import { optionalString } from "./optional-string";

// Server-only secrets. Never import this from a "use client" component —
// the `server-only` import above makes that a build error, not just a rule.
const serverEnvSchema = z.object({
  STRAVA_CLIENT_SECRET: optionalString,
  SUPABASE_SERVICE_ROLE_KEY: optionalString,
});

export const serverEnv = serverEnvSchema.parse({
  STRAVA_CLIENT_SECRET: process.env.STRAVA_CLIENT_SECRET,
  SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
});
