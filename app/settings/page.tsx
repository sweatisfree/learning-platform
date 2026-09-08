"use client";

import { useEffect, useState } from "react";
import { useSupabaseAuth } from "@/components/providers/SupabaseProvider";
import { Button } from "@/components/ui/Button";
import { startStravaAuthorization, fetchStravaStatus, type StravaStatus } from "@/lib/strava/oauth";
import { supabase } from "@/lib/supabase/client";
import { sha256Hex } from "@/lib/utils/sha256";
import { ManualHealthReadingForm } from "@/components/health/ManualHealthReadingForm";
import {
  computeAutonomicBaseline,
  computeAutonomicRecoveryIndex,
  type AutonomicReading,
  type AutonomicRecoveryIndex,
} from "@/lib/engine/loadCalculator";

type TokenStatus = "loading" | "none" | "configured";

const BAND_COLOR_CLASS: Record<AutonomicRecoveryIndex["band"], string> = {
  high: "text-success",
  moderate: "text-warning",
  low: "text-danger",
};

// Plain data fetchers with no setState inside — state updates always happen
// in an explicit .then() callback at the call site, never inside the effect
// body itself (React Compiler's set-state-in-effect rule flags the latter).
async function loadTokenStatus(): Promise<TokenStatus> {
  const { data } = await supabase.from("health_webhook_tokens").select("user_id").maybeSingle();
  return data ? "configured" : "none";
}

interface ReadingsResult {
  readings: AutonomicReading[];
  error: string | null;
}

async function loadReadings(): Promise<ReadingsResult> {
  const { data, error } = await supabase
    .from("health_readings")
    .select("recorded_date, resting_heart_rate, hrv, sleep_hours, respiratory_rate")
    .order("recorded_date", { ascending: true });
  if (error) return { readings: [], error: error.message };
  const readings: AutonomicReading[] = (data ?? [])
    .map((row) => ({
      restingHeartRate: row.resting_heart_rate ?? undefined,
      hrv: row.hrv ?? undefined,
      sleepHours: row.sleep_hours ?? undefined,
      respiratoryRate: row.respiratory_rate ?? undefined,
    }))
    // Skip rows with no usable signal at all — everything else feeds the
    // engine's graceful degradation (any subset of the four is fine).
    .filter(
      (reading) =>
        reading.restingHeartRate != null ||
        reading.hrv != null ||
        reading.sleepHours != null ||
        reading.respiratoryRate != null,
    );
  return { readings, error: null };
}

export default function SettingsPage() {
  const { session, isLoading } = useSupabaseAuth();
  const userId = session?.user.id ?? null;

  const [connectError, setConnectError] = useState<string | null>(null);
  const [stravaStatus, setStravaStatus] = useState<StravaStatus | null>(null);
  const [stravaStatusError, setStravaStatusError] = useState<string | null>(null);
  const [tokenStatus, setTokenStatus] = useState<TokenStatus>("loading");
  const [generatedToken, setGeneratedToken] = useState<string | null>(null);
  const [tokenError, setTokenError] = useState<string | null>(null);
  const [readings, setReadings] = useState<AutonomicReading[]>([]);
  const [readingsError, setReadingsError] = useState<string | null>(null);

  useEffect(() => {
    if (!userId) return;
    loadTokenStatus().then(setTokenStatus);
    loadReadings().then((result) => {
      setReadings(result.readings);
      setReadingsError(result.error);
    });
    fetchStravaStatus()
      .then(setStravaStatus)
      .catch((error: Error) => setStravaStatusError(error.message));
  }, [userId]);

  function refreshReadings() {
    loadReadings().then((result) => {
      setReadings(result.readings);
      setReadingsError(result.error);
    });
  }

  async function handleGenerateToken() {
    if (!userId) return;
    setTokenError(null);
    const token = crypto.randomUUID();
    const tokenHash = await sha256Hex(token);
    const { error } = await supabase
      .from("health_webhook_tokens")
      .upsert({ user_id: userId, token_hash: tokenHash }, { onConflict: "user_id" });
    if (error) {
      setTokenError(error.message);
      return;
    }
    setGeneratedToken(token);
    setTokenStatus("configured");
  }

  function handleConnectStrava() {
    setConnectError(null);
    try {
      startStravaAuthorization();
    } catch (error) {
      setConnectError(error instanceof Error ? error.message : "Unable to start Strava connection.");
    }
  }

  if (isLoading) return null;

  if (!session) {
    return (
      <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-10 text-center">
        <h1 className="font-heading text-2xl font-bold">Settings</h1>
        <p className="mt-2 text-muted">Not signed in.</p>
      </main>
    );
  }

  const recoveryIndex =
    readings.length > 0
      ? computeAutonomicRecoveryIndex(
          readings[readings.length - 1],
          computeAutonomicBaseline(readings.length > 1 ? readings.slice(0, -1) : readings),
        )
      : null;

  const webhookUrl = typeof window !== "undefined" ? `${window.location.origin}/api/health/webhook` : "";

  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-10 text-center">
      <h1 className="font-heading text-2xl font-bold">Settings</h1>
      <p className="mt-2 text-muted">{session.user.email}</p>

      <section className="mt-8 rounded-[var(--radius-theme)] border border-border bg-surface p-5 text-left">
        <p className="mb-1 text-sm font-semibold">Integrations</p>
        {stravaStatus?.connected ? (
          <>
            <p className="mb-4 text-sm text-muted">
              Connected to Strava as {stravaStatus.athleteFirstname} {stravaStatus.athleteLastname}.
            </p>
            <Button variant="ghost" onClick={handleConnectStrava}>
              Reconnect Strava
            </Button>
          </>
        ) : (
          <>
            <p className="mb-4 text-sm text-muted">
              Connect your Strava account to pull in activities automatically.
            </p>
            <Button onClick={handleConnectStrava}>Connect Strava</Button>
          </>
        )}
        {connectError && <p className="mt-3 text-sm text-warning">{connectError}</p>}
        {stravaStatusError && <p className="mt-3 text-sm text-warning">{stravaStatusError}</p>}
      </section>

      <section className="mt-6 rounded-[var(--radius-theme)] border border-border bg-surface p-5 text-left">
        <p className="mb-1 text-sm font-semibold">HealthKit Sync</p>
        <p className="mb-3 text-sm text-muted">
          Requires an Apple Watch (or similar wearable) and the Health Auto Export app (Premium tier) from
          the App Store.
        </p>
        <ol className="mb-4 list-decimal space-y-1 pl-5 text-sm text-muted">
          <li>Generate a token below and copy it.</li>
          <li>In Health Auto Export, create a REST API automation using the URL below.</li>
          <li>
            Add a header named <code>X-Health-Token</code> set to your token.
          </li>
          <li>Select Resting Heart Rate, HRV, Sleep, and Respiratory Rate, then run it.</li>
        </ol>
        <p className="mb-4 text-sm text-muted">
          No watch? Manual entry below works as a backup — no setup required.
        </p>

        <div className="space-y-1 text-sm">
          <p className="text-muted">Webhook URL</p>
          <p className="break-all rounded-[var(--radius-theme)] border border-border bg-background px-3 py-2 font-mono text-xs">
            {webhookUrl || "POST /api/health/webhook"}
          </p>
        </div>

        <div className="mt-4">
          {tokenStatus === "loading" && <p className="text-sm text-muted">Checking…</p>}

          {tokenStatus !== "loading" && !generatedToken && (
            <Button variant="ghost" onClick={handleGenerateToken}>
              {tokenStatus === "configured" ? "Regenerate Token" : "Generate Token"}
            </Button>
          )}

          {generatedToken && (
            <div className="space-y-1 text-sm">
              <p className="text-warning">
                Copy this now — it won&apos;t be shown again. Set it as the <code>X-Health-Token</code>{" "}
                header value in your export app.
              </p>
              <p className="break-all rounded-[var(--radius-theme)] border border-border bg-background px-3 py-2 font-mono text-xs">
                {generatedToken}
              </p>
              <Button variant="ghost" onClick={handleGenerateToken} className="mt-2">
                Regenerate
              </Button>
            </div>
          )}

          {tokenStatus === "configured" && !generatedToken && (
            <p className="mt-2 text-xs text-muted">
              A webhook token is already configured. Regenerating replaces it and invalidates the old one.
            </p>
          )}

          {tokenError && <p className="mt-3 text-sm text-warning">{tokenError}</p>}
        </div>
      </section>

      <section className="mt-6 rounded-[var(--radius-theme)] border border-border bg-surface p-5 text-left">
        <p className="mb-1 text-sm font-semibold">Manual entry (backup)</p>
        <p className="mb-4 text-sm text-muted">
          Log resting HR, HRV, sleep, or respiratory rate by hand for days the webhook misses — any subset is
          fine.
        </p>
        <ManualHealthReadingForm userId={session.user.id} onSaved={refreshReadings} />
        {readingsError && <p className="mt-3 text-sm text-warning">{readingsError}</p>}
      </section>

      {recoveryIndex && (
        <section className="mt-6 rounded-[var(--radius-theme)] border border-border bg-surface p-5 text-left">
          <p className="mb-1 text-sm font-semibold">Latest Autonomic Recovery Index</p>
          <p className={`font-heading text-2xl font-bold capitalize ${BAND_COLOR_CLASS[recoveryIndex.band]}`}>
            {recoveryIndex.score.toFixed(0)} · {recoveryIndex.band}
          </p>
          <p className="mt-1 text-xs text-muted">
            Computed from {recoveryIndex.signalsUsed} of 4 signals, across {readings.length} stored reading(s).
          </p>
        </section>
      )}
    </main>
  );
}
