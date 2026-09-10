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
} from "@/lib/engine/loadCalculator";
import { computeRecoveryScore, type RecoveryScore } from "@/lib/engine/recovery-score";
import { fetchAthleteProfile, toActivityLoadOptions } from "@/lib/health/athleteProfile";
import { fetchAutonomicReadings } from "@/lib/health/readings";
import type { AthleteProfileFields } from "@/lib/types/user-profile";
import type { Activity } from "@/lib/types/activity";

interface DashboardData {
  status: StravaStatus;
  activities: Activity[];
  acwr: AcuteChronicLoad | null;
  profile: AthleteProfileFields | null;
  readiness: RecoveryScore | null;
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
    const [status, profile, readingsResult] = await Promise.all([
      fetchStravaStatus(),
      fetchAthleteProfile(userId).catch(() => null),
      fetchAutonomicReadings(),
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

    return { data: { status, activities, acwr, profile, readiness }, error: null };
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
      <div className="rounded-[var(--radius-theme)] border border-border bg-surface p-5 text-left">
        <p className="mb-1 text-sm font-semibold">Readiness</p>
        <p className="font-heading text-2xl font-bold text-muted">Not scored yet</p>
        <p className="mt-2 text-xs text-muted">
          Needs either a training history or a health-reading baseline to stand on. Neither is there
          yet, so there is no number to give you.
        </p>
      </div>
    );
  }

  const rows = [
    { label: "Autonomic recovery", component: readiness.autonomic },
    { label: "Training load", component: readiness.load },
  ];

  return (
    <div className="rounded-[var(--radius-theme)] border border-border bg-surface p-5 text-left">
      <p className="mb-1 text-sm font-semibold">Readiness</p>
      <p className="font-heading text-3xl font-bold">{readiness.score.toFixed(0)}</p>

      <div className="mt-4 space-y-2 border-t border-border pt-3 text-xs">
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

      <p className="mt-3 text-xs text-muted">
        Weighting v{readiness.formulaVersion} —{" "}
        <Link href="/transparency" className="underline">
          published in full
        </Link>
        .
      </p>
    </div>
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

  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-10 text-center">
      <h1 className="font-heading text-2xl font-bold">Dashboard</h1>

      {isLoadingData && <p className="mt-4 text-muted">Loading…</p>}
      {error && <p className="mt-4 text-warning">{error}</p>}

      {data?.readiness && (
        <div className="mt-6">
          <ReadinessCard readiness={data.readiness} />
        </div>
      )}

      {data && !data.status.connected && (
        <div className="mt-6 rounded-[var(--radius-theme)] border border-border bg-surface p-5 text-left">
          <p className="text-sm text-muted">
            Get started in{" "}
            <Link href="/settings" className="text-accent underline">
              Settings
            </Link>
            : connect Strava for training load, and sync your Apple Watch for recovery data. Or{" "}
            <Link href="/dev/workouts" className="text-accent underline">
              test with an uploaded or manually-entered workout
            </Link>{" "}
            first.
          </p>
        </div>
      )}

      {data?.status.connected && (
        <div className="mt-6 space-y-6">
          <div className="rounded-[var(--radius-theme)] border border-border bg-surface p-5 text-left">
            <p className="text-sm text-muted">
              Connected as {data.status.athleteFirstname} {data.status.athleteLastname}
            </p>
            <p className="mt-1 text-sm text-muted">
              {data.activities.length} activit{data.activities.length === 1 ? "y" : "ies"} in the last 42 days.
            </p>
          </div>

          {data.acwr ? (
            <div className="rounded-[var(--radius-theme)] border border-border bg-surface p-5 text-left">
              <p className="mb-1 text-sm font-semibold">Acute:Chronic Workload Ratio</p>
              <p className="font-heading text-3xl font-bold">{data.acwr.ratio.toFixed(2)}</p>
              <p className="mt-1 text-xs text-muted">
                acute {data.acwr.acute.toFixed(1)} · chronic {data.acwr.chronic.toFixed(1)}
              </p>
              <LoadProvenance acwr={data.acwr} />
            </div>
          ) : (
            <p className="text-sm text-muted">No recent activities to compute a workload ratio from yet.</p>
          )}
        </div>
      )}
    </main>
  );
}
