"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSupabaseAuth } from "@/components/providers/SupabaseProvider";
import { fetchStravaStatus, fetchStravaActivitiesFromApi, type StravaStatus } from "@/lib/strava/oauth";
import {
  computeAcuteChronicLoad,
  computeAutonomicBaseline,
  computeAutonomicRecoveryIndex,
  type AcuteChronicLoad,
  type AutonomicRecoveryIndex,
} from "@/lib/engine/loadCalculator";
import { computeRecoveryScore, type RecoveryScore } from "@/lib/engine/recovery-score";
import { fetchAthleteProfile, toActivityLoadOptions } from "@/lib/health/athleteProfile";
import { fetchAutonomicReadings } from "@/lib/health/readings";
import { fetchSubscription, hasActiveAccess, type Subscription } from "@/lib/stripe/subscription";
import { Panel } from "@/components/ui/Panel";
import { PageHeading } from "@/components/ui/Heading";
import { Stat } from "@/components/ui/Stat";
import { EmptyState } from "@/components/ui/EmptyState";
import { Button } from "@/components/ui/Button";
import { BandBadge, bandTextClass } from "@/components/ui/BandBadge";
import { cn } from "@/lib/utils/cn";
import type { AthleteProfileFields } from "@/lib/types/user-profile";
import type { Activity } from "@/lib/types/activity";

interface DashboardData {
  status: StravaStatus;
  activities: Activity[];
  acwr: AcuteChronicLoad | null;
  profile: AthleteProfileFields | null;
  readiness: RecoveryScore | null;
  autonomic: AutonomicRecoveryIndex;
  subscription: Subscription | null;
}

// Plain fetcher, no setState inside — matches the pattern established in
// app/settings/page.tsx (React Compiler's set-state-in-effect rule flags
// calling a setState-triggering function directly from an effect body).
async function loadDashboardData(
  userId: string,
): Promise<{ data: DashboardData | null; error: string | null }> {
  try {
    // The profile is optional context, not a prerequisite — if that table is
    // missing or unreadable, load still computes (via the duration fallback)
    // rather than the whole dashboard collapsing into an error message.
    const [status, profile, readingsResult, subscription] = await Promise.all([
      fetchStravaStatus(),
      fetchAthleteProfile(userId).catch(() => null),
      fetchAutonomicReadings(),
      fetchSubscription().catch(() => null),
    ]);

    const activities = status.connected ? await fetchStravaActivitiesFromApi() : [];
    const acwr =
      activities.length > 0
        ? computeAcuteChronicLoad(activities, toActivityLoadOptions(profile))
        : null;

    // Today's reading is scored against a baseline built from every earlier
    // reading — never against itself, which would flatten every deviation.
    const { readings } = readingsResult;
    const autonomic = computeAutonomicRecoveryIndex(
      readings[readings.length - 1] ?? {},
      computeAutonomicBaseline(readings.length > 1 ? readings.slice(0, -1) : readings),
    );

    const readiness = computeRecoveryScore({ autonomic, load: acwr });

    return {
      data: { status, activities, acwr, profile, readiness, autonomic, subscription },
      error: null,
    };
  } catch (error) {
    return { data: null, error: error instanceof Error ? error.message : "Failed to load dashboard data." };
  }
}

// Every number the dashboard prints says which formula produced it. A ratio
// built from the duration fallback is a real number, but it is not the same
// claim as one built from heart-rate-weighted TRIMP, and the difference is
// the athlete's to see rather than ours to smooth over.
function LoadProvenance({ acwr }: { acwr: AcuteChronicLoad }) {
  const { byMethod, activityCount, daysSpanned, usesEstimatedMaxHeartRate } = acwr.coverage;
  const parts: string[] = [];
  if (byMethod.trimp > 0) parts.push(`${byMethod.trimp} via TRIMP (heart rate)`);
  if (byMethod.srpe > 0) parts.push(`${byMethod.srpe} via sRPE (self-reported)`);
  if (byMethod.duration > 0) parts.push(`${byMethod.duration} via duration only`);

  return (
    <div className="mt-3 border-t border-border pt-3 text-xs text-muted">
      <p>
        {activityCount} activit{activityCount === 1 ? "y" : "ies"} across {daysSpanned} day
        {daysSpanned === 1 ? "" : "s"} — {parts.join(", ")}.
      </p>
      {byMethod.duration === activityCount && activityCount > 0 && (
        <p className="mt-1 text-warning">
          This ratio is measured in minutes, not physiological load. Add your sex, resting HR and
          max HR in{" "}
          <Link href="/settings" className="underline">
            Settings
          </Link>{" "}
          to weight it by heart rate.
        </p>
      )}
      {usesEstimatedMaxHeartRate && (
        <p className="mt-1 text-warning">
          Heart-rate weighting used an <strong>estimated</strong> max HR, so part of this number
          comes from an age formula rather than a measured effort.
        </p>
      )}
    </div>
  );
}

// The composite is shown with both halves broken out, always. A single number
// nobody can take apart is exactly what /transparency promises this isn't.
function ReadinessCard({ readiness }: { readiness: RecoveryScore }) {
  if (readiness.score == null) {
    return (
      <EmptyState title="Readiness — not scored yet">
        Needs either a training history or a health-reading baseline to stand on. Neither is there
        yet, so there is no number to give you.
      </EmptyState>
    );
  }

  const rows = [
    { label: "Autonomic recovery", component: readiness.autonomic },
    { label: "Training load", component: readiness.load },
  ];

  // The hero of the page: the number carries the most visual weight, paired
  // with the band word so the state never depends on hue alone.
  return (
    <Panel>
      <p className="text-sm text-muted">Readiness</p>
      <div className="mt-2 flex flex-wrap items-center gap-x-5 gap-y-2">
        <span
          className={cn(
            "font-heading text-6xl font-semibold leading-none tracking-[-0.03em] sm:text-7xl",
            readiness.band ? bandTextClass(readiness.band) : "text-foreground",
          )}
        >
          {readiness.score.toFixed(0)}
        </span>
        {readiness.band && <BandBadge band={readiness.band} />}
      </div>

      <div className="mt-6 space-y-2 border-t border-border pt-4 text-xs">
        {rows.map(({ label, component }) => (
          <div key={label} className="flex items-baseline justify-between gap-3">
            <span className="text-muted">
              {label}
              {component.available && ` · ${Math.round(component.weight * 100)}% weight`}
            </span>
            <span className={component.available ? "text-foreground" : "text-muted"}>
              {component.available && component.value != null
                ? `${component.value.toFixed(0)} → ${component.contribution!.toFixed(1)} pts`
                : "no data"}
            </span>
          </div>
        ))}
      </div>

      <p className="mt-4 text-xs text-muted">
        Weighting v{readiness.formulaVersion} —{" "}
        <Link href="/transparency" className="underline">
          published in full
        </Link>
        .
      </p>
    </Panel>
  );
}

// The recovery index was computed for the readiness score but never shown
// here — it only appeared in Settings. Surfaced as its own card.
function RecoveryCard({ autonomic }: { autonomic: AutonomicRecoveryIndex }) {
  if (autonomic.score == null || autonomic.band == null) {
    return (
      <EmptyState title="Recovery — building baseline">
        A signal needs {autonomic.coverage.minReadingsPerMetric} readings before a day can be
        measured against it. Below that it would be noise wearing a number.
      </EmptyState>
    );
  }

  return (
    <Panel>
      <p className="text-sm text-muted">Recovery</p>
      <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-2">
        <span
          className={cn(
            "font-heading text-4xl font-semibold leading-none tracking-[-0.02em]",
            bandTextClass(autonomic.band),
          )}
        >
          {autonomic.score.toFixed(0)}
        </span>
        <BandBadge band={autonomic.band} />
      </div>
      <p className="mt-3 text-xs text-muted">
        From {autonomic.coverage.signalsUsed} of 4 signals, against your own rolling baseline.
      </p>
    </Panel>
  );
}

function formatDuration(seconds: number): string {
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes} min`;
  return `${Math.floor(minutes / 60)}h ${minutes % 60}m`;
}

function RecentActivityCard({ activities }: { activities: Activity[] }) {
  if (activities.length === 0) {
    return (
      <EmptyState title="No recent activity">
        Nothing recorded in the last 42 days. Activities appear here as soon as Strava has them.
      </EmptyState>
    );
  }

  const recent = [...activities]
    .sort((a, b) => b.startDate.localeCompare(a.startDate))
    .slice(0, 5);

  return (
    <Panel>
      <p className="mb-3 text-sm text-muted">Recent activity</p>
      <ul className="divide-y divide-border">
        {recent.map((activity) => (
          <li key={activity.id} className="flex items-baseline justify-between gap-3 py-2 first:pt-0">
            <div className="min-w-0">
              <p className="truncate text-sm text-foreground">{activity.name}</p>
              <p className="text-xs text-muted">
                {new Date(activity.startDate).toLocaleDateString()} · {activity.type}
              </p>
            </div>
            <p className="shrink-0 text-xs text-muted">
              {formatDuration(activity.movingTimeSeconds)}
              {activity.distanceMeters > 0 &&
                ` · ${(activity.distanceMeters / 1000).toFixed(1)} km`}
            </p>
          </li>
        ))}
      </ul>
    </Panel>
  );
}

export default function DashboardPage() {
  const { session, isLoading } = useSupabaseAuth();
  const userId = session?.user.id ?? null;
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoadingData, setIsLoadingData] = useState(true);

  useEffect(() => {
    if (!userId) return;
    loadDashboardData(userId).then((result) => {
      setData(result.data);
      setError(result.error);
      setIsLoadingData(false);
    });
  }, [userId]);

  if (isLoading) return null;

  if (!session) {
    return (
      <main className="flex flex-1 items-center justify-center px-4 text-center">
        <p className="text-muted">
          You need to be signed in to view this page.{" "}
          <Link href="/login" className="text-accent underline">
            Log in
          </Link>
        </p>
      </main>
    );
  }

  // Single source of truth for the gate, so no paid panel can render without it.
  const hasAccess = data != null && hasActiveAccess(data.subscription);

  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-10 sm:px-6">
      <PageHeading>Dashboard</PageHeading>

      {isLoadingData && <p className="mt-6 text-muted">Loading…</p>}

      {/* Gate. Access is decided solely by the Stripe status the webhook
          wrote — the subscriptions table has no write policy, so the browser
          can never grant itself access. Settings is deliberately left open so
          a locked-out user can still subscribe, cancel, export or delete. */}
      {data && !hasActiveAccess(data.subscription) && (
        <div className="mt-6">
          <EmptyState
            title="Your subscription isn't active"
            action={
              <Link href="/settings">
                <Button>Go to Settings</Button>
              </Link>
            }
          >
            {data.subscription?.status == null
              ? "Start your 14-day free trial in Settings to see your training load and readiness. Cancel any time before it ends and you won't be charged."
              : `Your subscription status is "${data.subscription.status}", so the dashboard is locked. Manage billing in Settings to restore access.`}
          </EmptyState>
        </div>
      )}
      {error && <p className="mt-6 text-warning">{error}</p>}

      {hasAccess && data?.readiness && (
        <div className="mt-6">
          <ReadinessCard readiness={data.readiness} />
        </div>
      )}

      {/* Recovery, training load and recent activity share a two-column grid
          below the readiness hero, collapsing to one column on phones. */}
      {hasAccess && data && (
        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          <RecoveryCard autonomic={data.autonomic} />

          {data.status.connected ? (
            data.acwr ? (
              <Panel>
                <Stat
                  label="Training load"
                  value={data.acwr.ratio.toFixed(2)}
                  size="md"
                  caption={`acute ${data.acwr.acute.toFixed(1)} · chronic ${data.acwr.chronic.toFixed(1)}`}
                />
                <LoadProvenance acwr={data.acwr} />
              </Panel>
            ) : (
              <EmptyState title="No training load yet">
                Strava is connected but has no activities in the last 42 days, so there is nothing to
                compute a workload ratio from.
              </EmptyState>
            )
          ) : (
            <EmptyState
              title="Strava not connected"
              action={
                <Link href="/settings">
                  <Button>Connect in Settings</Button>
                </Link>
              }
            >
              Training load needs your activity history. Recovery data comes separately, from Apple
              Health or manual entry.
            </EmptyState>
          )}

          <div className="lg:col-span-2">
            <RecentActivityCard activities={data.activities} />
          </div>
        </div>
      )}
    </main>
  );
}
