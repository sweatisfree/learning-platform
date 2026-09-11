"use client";

import { useEffect, useState } from "react";
import { useSupabaseAuth } from "@/components/providers/SupabaseProvider";
import { Button } from "@/components/ui/Button";
import { Panel } from "@/components/ui/Panel";
import { PageHeading, SectionHeading } from "@/components/ui/Heading";
import { startStravaAuthorization, fetchStravaStatus, type StravaStatus } from "@/lib/strava/oauth";
import { supabase } from "@/lib/supabase/client";
import { sha256Hex } from "@/lib/utils/sha256";
import { ManualHealthReadingForm } from "@/components/health/ManualHealthReadingForm";
import { AthleteProfileForm } from "@/components/health/AthleteProfileForm";
import { fetchAthleteProfile } from "@/lib/health/athleteProfile";
import { fetchAutonomicReadings } from "@/lib/health/readings";
import { SubscriptionPanel } from "@/components/billing/SubscriptionPanel";
import { AccountDataPanel } from "@/components/account/AccountDataPanel";
import { fetchSubscription, type Subscription } from "@/lib/stripe/subscription";
import type { AthleteProfileFields } from "@/lib/types/user-profile";
import {
  computeAutonomicBaseline,
  computeAutonomicRecoveryIndex,
  type AutonomicReading,
  type AutonomicRecoveryIndex,
} from "@/lib/engine/loadCalculator";

type TokenStatus = "loading" | "none" | "configured";

const BAND_COLOR_CLASS: Record<NonNullable<AutonomicRecoveryIndex["band"]>, string> = {
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

interface ProfileResult {
  profile: AthleteProfileFields | null;
  error: string | null;
}

async function loadProfile(userId: string): Promise<ProfileResult> {
  try {
    return { profile: await fetchAthleteProfile(userId), error: null };
  } catch (error) {
    return { profile: null, error: error instanceof Error ? error.message : "Unknown error" };
  }
}

const loadReadings = fetchAutonomicReadings;

interface SubscriptionResult {
  subscription: Subscription | null;
  error: string | null;
}

async function loadSubscription(): Promise<SubscriptionResult> {
  try {
    return { subscription: await fetchSubscription(), error: null };
  } catch (error) {
    return { subscription: null, error: error instanceof Error ? error.message : "Unknown error" };
  }
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
  const [profile, setProfile] = useState<AthleteProfileFields | null>(null);
  const [profileError, setProfileError] = useState<string | null>(null);
  // Distinguishes "still fetching" from "fetched, no profile saved yet" —
  // AthleteProfileForm seeds its inputs on mount, so it must not mount until
  // the real values are available or it renders permanently empty.
  const [isProfileLoaded, setIsProfileLoaded] = useState(false);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [subscriptionError, setSubscriptionError] = useState<string | null>(null);
  const [isSubscriptionLoaded, setIsSubscriptionLoaded] = useState(false);

  useEffect(() => {
    if (!userId) return;
    loadTokenStatus().then(setTokenStatus);
    loadSubscription().then((result) => {
      setSubscription(result.subscription);
      setSubscriptionError(result.error);
      setIsSubscriptionLoaded(true);
    });
    loadReadings().then((result) => {
      setReadings(result.readings);
      setReadingsError(result.error);
    });
    loadProfile(userId).then((result) => {
      setProfile(result.profile);
      setProfileError(result.error);
      setIsProfileLoaded(true);
    });
    fetchStravaStatus()
      .then(setStravaStatus)
      .catch((error: Error) => setStravaStatusError(error.message));
  }, [userId]);

  function refreshProfile() {
    if (!userId) return;
    loadProfile(userId).then((result) => {
      setProfile(result.profile);
      setProfileError(result.error);
    });
  }

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
      <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-10 sm:px-6">
        <PageHeading>Settings</PageHeading>
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
    <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-10 sm:px-6">
      <PageHeading>Settings</PageHeading>
      <p className="mt-2 text-muted">{session.user.email}</p>

      <Panel as="section" className="mt-6">
        <SectionHeading className="mb-1">Integrations</SectionHeading>
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
      </Panel>

      <Panel as="section" className="mt-4">
        <SectionHeading className="mb-1">Subscription</SectionHeading>
        <SubscriptionPanel subscription={subscription} isLoaded={isSubscriptionLoaded} />
        {subscriptionError && <p className="mt-3 text-sm text-warning">{subscriptionError}</p>}
      </Panel>

      <Panel as="section" className="mt-4">
        <SectionHeading className="mb-1">Athlete Profile</SectionHeading>
        <p className="mb-4 text-sm text-muted">
          Sex, resting heart rate and max heart rate are what Banister TRIMP needs. Without all
          three, training load is measured by duration alone — a proxy, not a physiological measure.
        </p>
        {isProfileLoaded ? (
          <AthleteProfileForm userId={session.user.id} profile={profile} onSaved={refreshProfile} />
        ) : (
          <p className="text-sm text-muted">Loading…</p>
        )}
        {profileError && <p className="mt-3 text-sm text-warning">{profileError}</p>}
      </Panel>

      <Panel as="section" className="mt-4">
        <SectionHeading className="mb-1">HealthKit Sync</SectionHeading>
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
          <p className="break-all rounded-[var(--radius-sm)] border border-border bg-background px-3 py-2 font-mono text-xs">
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
              <p className="break-all rounded-[var(--radius-sm)] border border-border bg-background px-3 py-2 font-mono text-xs">
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
      </Panel>

      <Panel as="section" className="mt-4">
        <SectionHeading className="mb-1">Manual entry (backup)</SectionHeading>
        <p className="mb-4 text-sm text-muted">
          Log resting HR, HRV, sleep, or respiratory rate by hand for days the webhook misses — any subset is
          fine.
        </p>
        <ManualHealthReadingForm userId={session.user.id} onSaved={refreshReadings} />
        {readingsError && <p className="mt-3 text-sm text-warning">{readingsError}</p>}
      </Panel>

      {recoveryIndex && (
        <Panel as="section" className="mt-4">
          <SectionHeading className="mb-1">Latest Autonomic Recovery Index</SectionHeading>
          {recoveryIndex.score == null || recoveryIndex.band == null ? (
            <>
              <p className="font-heading text-2xl font-bold text-muted">Not scored yet</p>
              <p className="mt-1 text-xs text-muted">
                A signal needs {recoveryIndex.coverage.minReadingsPerMetric} readings before its
                baseline is worth scoring against — you have {readings.length}. Deviations measured
                against a thinner baseline are noise, not signal.
              </p>
            </>
          ) : (
            <>
              <p
                className={`font-heading text-2xl font-bold capitalize ${BAND_COLOR_CLASS[recoveryIndex.band]}`}
              >
                {recoveryIndex.score.toFixed(0)} · {recoveryIndex.band}
              </p>
              <p className="mt-1 text-xs text-muted">
                Computed from {recoveryIndex.coverage.signalsUsed} of 4 signals, across{" "}
                {readings.length} stored reading(s).
                {recoveryIndex.coverage.signalsShortOfBaseline > 0 &&
                  ` ${recoveryIndex.coverage.signalsShortOfBaseline} more had data today but too thin a baseline to use.`}
              </p>
            </>
          )}
        </Panel>
      )}

      {/* Last on the page on purpose — it holds the destructive action. */}
      <Panel as="section" className="mt-4">
        <SectionHeading className="mb-1">Your data</SectionHeading>
        <AccountDataPanel email={session.user.email ?? ""} />
      </Panel>
    </main>
  );
}
