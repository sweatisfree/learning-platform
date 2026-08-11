import { z } from "zod";
import { optionalString } from "./optional-string";

// Next.js inlines NEXT_PUBLIC_* vars at build time only when referenced as a
// static `process.env.X` literal — don't refactor this into a loop/object lookup.
const envSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
  NEXT_PUBLIC_STRAVA_CLIENT_ID: optionalString,
  NEXT_PUBLIC_STRAVA_REDIRECT_URI: optionalString,
});

export const env = envSchema.parse({
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  NEXT_PUBLIC_STRAVA_CLIENT_ID: process.env.NEXT_PUBLIC_STRAVA_CLIENT_ID,
  NEXT_PUBLIC_STRAVA_REDIRECT_URI: process.env.NEXT_PUBLIC_STRAVA_REDIRECT_URI,
});
