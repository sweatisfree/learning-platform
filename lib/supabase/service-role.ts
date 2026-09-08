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
