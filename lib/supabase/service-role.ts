import "server-only";
import { createClient } from "@supabase/supabase-js";
import { env } from "@/lib/config/env";
import { serverEnv } from "@/lib/config/server-env";
import { sha256Hex } from "@/lib/utils/sha256";
import type { StravaTokenResponse } from "@/lib/strava/types";

// Narrow, purpose-built functions only — never export a raw service-role
// client for general reuse. Every function here does exactly one scoped
// job, matching CLAUDE.md's "service-role access stays server-side and
// scoped to a specific job, not general reads" rule.
function getServiceClient() {
  if (!serverEnv.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY is not configured");
  }
  return createClient(env.NEXT_PUBLIC_SUPABASE_URL, serverEnv.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  });
}

// Resolves a webhook token to the user it belongs to. Returns null for any
// unknown token — callers should respond identically (404) whether a token
// is malformed or simply not found, to avoid a discovery oracle.
export async function resolveUserIdForToken(token: string): Promise<string | null> {
  const tokenHash = await sha256Hex(token);
  const client = getServiceClient();
  const { data, error } = await client
    .from("health_webhook_tokens")
    .select("user_id")
    .eq("token_hash", tokenHash)
    .maybeSingle();
  if (error || !data) return null;
  return data.user_id as string;
}

export interface HealthReadingUpsert {
  recordedDate: string; // YYYY-MM-DD
  restingHeartRate: number | null;
  hrv: number | null;
  sleepHours: number | null;
  respiratoryRate: number | null;
}

// Upserts webhook-sourced readings for exactly one user. `userId` must come
// from resolveUserIdForToken — never from request-body input — since this
// bypasses RLS and there's no other check preventing a cross-user write.
export async function upsertWebhookHealthReadings(
  userId: string,
  readings: readonly HealthReadingUpsert[],
): Promise<void> {
  if (readings.length === 0) return;
  const client = getServiceClient();
  const rows = readings.map((reading) => ({
    user_id: userId,
    source: "webhook" as const,
    recorded_date: reading.recordedDate,
    resting_heart_rate: reading.restingHeartRate,
    hrv: reading.hrv,
    sleep_hours: reading.sleepHours,
    respiratory_rate: reading.respiratoryRate,
  }));
  const { error } = await client
    .from("health_readings")
    .upsert(rows, { onConflict: "user_id,recorded_date,source" });
  if (error) {
    throw new Error(`Failed to upsert health readings: ${error.message}`);
  }
}

export interface StoredStravaConnection {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
  athleteId: number;
  athleteFirstname: string | null;
  athleteLastname: string | null;
  connectedAt: string;
}

interface StravaConnectionRow {
  access_token: string;
  refresh_token: string;
  expires_at: number;
  athlete_id: number;
  athlete_firstname: string | null;
  athlete_lastname: string | null;
  connected_at: string;
}

function toStoredConnection(row: StravaConnectionRow): StoredStravaConnection {
  return {
    accessToken: row.access_token,
    refreshToken: row.refresh_token,
    expiresAt: row.expires_at,
    athleteId: row.athlete_id,
    athleteFirstname: row.athlete_firstname,
    athleteLastname: row.athlete_lastname,
    connectedAt: row.connected_at,
  };
}

export async function getStravaConnection(userId: string): Promise<StoredStravaConnection | null> {
  const client = getServiceClient();
  const { data, error } = await client
    .from("strava_connections")
    .select("access_token, refresh_token, expires_at, athlete_id, athlete_firstname, athlete_lastname, connected_at")
    .eq("user_id", userId)
    .maybeSingle();
  if (error || !data) return null;
  return toStoredConnection(data as StravaConnectionRow);
}

// Full upsert including athlete fields — only called right after a fresh
// OAuth exchange, the one flow where Strava actually returns the athlete
// object. Never called from the refresh flow (see updateStravaTokens).
export async function saveNewStravaConnection(userId: string, full: StravaTokenResponse): Promise<void> {
  const client = getServiceClient();
  const { error } = await client.from("strava_connections").upsert(
    {
      user_id: userId,
      access_token: full.accessToken,
      refresh_token: full.refreshToken,
      expires_at: full.expiresAt,
      athlete_id: full.athlete.id,
      athlete_firstname: full.athlete.firstname,
      athlete_lastname: full.athlete.lastname,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" },
  );
  if (error) {
    throw new Error(`Failed to save Strava connection: ${error.message}`);
  }
}

// Partial update — token fields only. Strava's refresh-token grant response
// has no athlete object at all, so this deliberately never touches the
// stored athlete_* columns (a full upsert fed by that response would null
// them out or crash).
export async function updateStravaTokens(
  userId: string,
  tokens: { accessToken: string; refreshToken: string; expiresAt: number },
): Promise<void> {
  const client = getServiceClient();
  const { error } = await client
    .from("strava_connections")
    .update({
      access_token: tokens.accessToken,
      refresh_token: tokens.refreshToken,
      expires_at: tokens.expiresAt,
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", userId);
  if (error) {
    throw new Error(`Failed to update Strava tokens: ${error.message}`);
  }
}

// ---------------------------------------------------------------------------
// Stripe subscriptions.
//
// The subscriptions table has an owner SELECT policy and NO write policies, so
// these service-role functions are the only path that can write one. They are
// called exclusively from the verified Stripe webhook — see
// supabase/migrations/0005_subscriptions.sql for why that matters.
// ---------------------------------------------------------------------------

export interface StoredSubscription {
  userId: string;
  stripeCustomerId: string;
  stripeSubscriptionId: string | null;
  status: string | null;
  priceId: string | null;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
  trialEnd: string | null;
}

interface SubscriptionRow {
  user_id: string;
  stripe_customer_id: string;
  stripe_subscription_id: string | null;
  status: string | null;
  price_id: string | null;
  current_period_end: string | null;
  cancel_at_period_end: boolean;
  trial_end: string | null;
}

const SUBSCRIPTION_COLUMNS =
  "user_id, stripe_customer_id, stripe_subscription_id, status, price_id, current_period_end, cancel_at_period_end, trial_end";

function toStoredSubscription(row: SubscriptionRow): StoredSubscription {
  return {
    userId: row.user_id,
    stripeCustomerId: row.stripe_customer_id,
    stripeSubscriptionId: row.stripe_subscription_id,
    status: row.status,
    priceId: row.price_id,
    currentPeriodEnd: row.current_period_end,
    cancelAtPeriodEnd: row.cancel_at_period_end,
    trialEnd: row.trial_end,
  };
}

export async function getSubscriptionByUserId(userId: string): Promise<StoredSubscription | null> {
  const client = getServiceClient();
  const { data, error } = await client
    .from("subscriptions")
    .select(SUBSCRIPTION_COLUMNS)
    .eq("user_id", userId)
    .maybeSingle();
  if (error || !data) return null;
  return toStoredSubscription(data as SubscriptionRow);
}

// Used by the webhook to confirm that the userId carried in Stripe metadata
// really does own the customer the event is about, before trusting it.
export async function getSubscriptionByCustomerId(
  stripeCustomerId: string,
): Promise<StoredSubscription | null> {
  const client = getServiceClient();
  const { data, error } = await client
    .from("subscriptions")
    .select(SUBSCRIPTION_COLUMNS)
    .eq("stripe_customer_id", stripeCustomerId)
    .maybeSingle();
  if (error || !data) return null;
  return toStoredSubscription(data as SubscriptionRow);
}

// Records the Stripe customer before any subscription exists, so a checkout
// that is started but never completed still leaves us able to match the
// customer back to a user on a later webhook.
export async function linkStripeCustomer(userId: string, stripeCustomerId: string): Promise<void> {
  const client = getServiceClient();
  const { error } = await client
    .from("subscriptions")
    .upsert({ user_id: userId, stripe_customer_id: stripeCustomerId, updated_at: new Date().toISOString() }, {
      onConflict: "user_id",
    });
  if (error) throw new Error(error.message);
}

export interface SubscriptionUpdate {
  stripeSubscriptionId: string | null;
  status: string | null;
  priceId: string | null;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
  trialEnd: string | null;
}

// Idempotent by construction: Stripe retries and redelivers events, so this
// writes absolute state from the event rather than incrementing anything.
export async function upsertSubscriptionState(
  userId: string,
  stripeCustomerId: string,
  update: SubscriptionUpdate,
): Promise<void> {
  const client = getServiceClient();
  const { error } = await client.from("subscriptions").upsert(
    {
      user_id: userId,
      stripe_customer_id: stripeCustomerId,
      stripe_subscription_id: update.stripeSubscriptionId,
      status: update.status,
      price_id: update.priceId,
      current_period_end: update.currentPeriodEnd,
      cancel_at_period_end: update.cancelAtPeriodEnd,
      trial_end: update.trialEnd,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" },
  );
  if (error) throw new Error(error.message);
}

// ---------------------------------------------------------------------------
// Account export and deletion (GDPR Arts. 15/20 access and portability, and
// Art. 17 erasure). Both are driven from routes that have already verified the
// caller's session; the user id passed here is never taken from client input.
// ---------------------------------------------------------------------------

export interface ExportedHealthReading {
  recordedDate: string;
  source: string;
  restingHeartRate: number | null;
  hrv: number | null;
  sleepHours: number | null;
  respiratoryRate: number | null;
}

export async function getHealthReadingsForExport(userId: string): Promise<ExportedHealthReading[]> {
  const client = getServiceClient();
  const { data, error } = await client
    .from("health_readings")
    .select("recorded_date, source, resting_heart_rate, hrv, sleep_hours, respiratory_rate")
    .eq("user_id", userId)
    .order("recorded_date", { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []).map((row) => ({
    recordedDate: row.recorded_date as string,
    source: row.source as string,
    restingHeartRate: row.resting_heart_rate,
    hrv: row.hrv,
    sleepHours: row.sleep_hours,
    respiratoryRate: row.respiratory_rate,
  }));
}

export interface ExportedProfile {
  sex: string | null;
  restingHeartRate: number | null;
  maxHeartRate: number | null;
  maxHeartRateSource: string | null;
}

export async function getUserProfileForExport(userId: string): Promise<ExportedProfile | null> {
  const client = getServiceClient();
  const { data, error } = await client
    .from("user_profiles")
    .select("sex, resting_heart_rate, max_heart_rate, max_heart_rate_source")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return null;
  return {
    sex: data.sex,
    restingHeartRate: data.resting_heart_rate,
    maxHeartRate: data.max_heart_rate,
    maxHeartRateSource: data.max_heart_rate_source,
  };
}

// Deletes the auth user, which cascades every one of the five user-data tables
// via their `on delete cascade` foreign keys. Deliberately relies on that
// cascade rather than deleting table-by-table: a hand-written list would
// silently stop being complete the moment a new table is added.
//
// Any future table holding user data MUST keep `references auth.users(id) on
// delete cascade`, or erasure quietly becomes partial.
export async function deleteAuthUser(userId: string): Promise<void> {
  const client = getServiceClient();
  const { error } = await client.auth.admin.deleteUser(userId);
  if (error) throw new Error(error.message);
}
