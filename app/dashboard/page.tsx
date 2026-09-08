"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSupabaseAuth } from "@/components/providers/SupabaseProvider";
import { fetchStravaStatus, fetchStravaActivitiesFromApi, type StravaStatus } from "@/lib/strava/oauth";
import { computeAcuteChronicLoad } from "@/lib/engine/loadCalculator";
import type { Activity } from "@/lib/types/activity";
import type { AcwrResult } from "@/lib/engine/acwr";

interface DashboardData {
  status: StravaStatus;
  activities: Activity[];
  acwr: AcwrResult | null;
}

// Plain fetcher, no setState inside — matches the pattern established in
// app/settings/page.tsx (React Compiler's set-state-in-effect rule flags
// calling a setState-triggering function directly from an effect body).
async function loadDashboardData(): Promise<{ data: DashboardData | null; error: string | null }> {
  try {
    const status = await fetchStravaStatus();
    if (!status.connected) {
      return { data: { status, activities: [], acwr: null }, error: null };
    }
    const activities = await fetchStravaActivitiesFromApi();
    const acwr = activities.length > 0 ? computeAcuteChronicLoad(activities) : null;
    return { data: { status, activities, acwr }, error: null };
  } catch (error) {
    return { data: null, error: error instanceof Error ? error.message : "Failed to load dashboard data." };
  }
}

export default function DashboardPage() {
  const { session, isLoading } = useSupabaseAuth();
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoadingData, setIsLoadingData] = useState(true);

  useEffect(() => {
    if (!session) return;
    loadDashboardData().then((result) => {
      setData(result.data);
      setError(result.error);
      setIsLoadingData(false);
    });
  }, [session]);

  if (isLoading) return null;

  if (!session) {
    return (
      <main className="flex flex-1 items-center justify-center px-4 text-center">
        <p className="text-muted">
          You need to be signed in to view this page.{" "}
          <Link href="/" className="text-accent underline">
            Go back
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
            </div>
          ) : (
            <p className="text-sm text-muted">No recent activities to compute a workload ratio from yet.</p>
          )}
        </div>
      )}
    </main>
  );
}
