"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useSupabaseAuth } from "@/components/providers/SupabaseProvider";
import { WorkoutUploadForm } from "@/components/workouts/WorkoutUploadForm";
import { ManualWorkoutForm } from "@/components/workouts/ManualWorkoutForm";
import { RecoveryCheckinForm } from "@/components/workouts/RecoveryCheckinForm";
import { ActivityResultCard } from "@/components/workouts/ActivityResultCard";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import type { Activity } from "@/lib/types/activity";
import type { Sex } from "@/lib/types/common";
import type { AutonomicReading } from "@/lib/engine/loadCalculator";
import {
  computeAcuteChronicLoad,
  computeActivityLoad,
  computeAutonomicBaseline,
  computeAutonomicRecoveryIndex,
} from "@/lib/engine/loadCalculator";

export default function WorkoutsTestHarnessPage() {
  const { session, isLoading } = useSupabaseAuth();

  const [activities, setActivities] = useState<Activity[]>([]);
  const [lastAdded, setLastAdded] = useState<Activity | null>(null);
  const [readings, setReadings] = useState<AutonomicReading[]>([]);

  const [restingHeartRate, setRestingHeartRate] = useState("");
  const [maxHeartRate, setMaxHeartRate] = useState("");
  const [sex, setSex] = useState<Sex | "">("");

  const profileOptions = {
    restingHeartRate: restingHeartRate ? Number(restingHeartRate) : undefined,
    maxHeartRate: maxHeartRate ? Number(maxHeartRate) : undefined,
    sex: sex || undefined,
  };

  const acwr = useMemo(
    () => computeAcuteChronicLoad(activities, profileOptions),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [activities, restingHeartRate, maxHeartRate, sex],
  );

  const recovery = useMemo(() => {
    if (readings.length === 0) return null;
    const baseline = computeAutonomicBaseline(readings.length > 1 ? readings.slice(0, -1) : readings);
    return computeAutonomicRecoveryIndex(readings[readings.length - 1], baseline);
  }, [readings]);

  function handleAddActivity(activity: Activity) {
    setActivities((prev) => [...prev, activity]);
    setLastAdded(activity);
  }

  function handleAddReading(reading: AutonomicReading) {
    setReadings((prev) => [...prev, reading]);
  }

  function handleReset() {
    setActivities([]);
    setLastAdded(null);
    setReadings([]);
  }

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
    <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-10">
      <h1 className="font-heading text-2xl font-bold">Workout Test Harness</h1>
      <p className="mt-1 text-sm text-muted">
        Feed in workouts without a live Strava connection — file upload and manual entry both
        produce the same <code>Activity</code> shape Strava does, so the load and recovery engines
        run on them identically.
      </p>

      <section className="mt-6 rounded-[var(--radius-theme)] border border-border bg-surface p-5">
        <p className="mb-3 text-sm font-semibold">
          Profile (optional — enables TRIMP for heart-rate activities without a logged RPE)
        </p>
        <div className="grid grid-cols-3 gap-3">
          <label className="block">
            <span className="mb-1 block text-sm text-muted">Resting HR</span>
            <Input
              type="number"
              value={restingHeartRate}
              onChange={(e) => setRestingHeartRate(e.target.value)}
              placeholder="55"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-sm text-muted">Max HR</span>
            <Input
              type="number"
              value={maxHeartRate}
              onChange={(e) => setMaxHeartRate(e.target.value)}
              placeholder="190"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-sm text-muted">Sex</span>
            <select
              value={sex}
              onChange={(e) => setSex(e.target.value as Sex | "")}
              className="block w-full rounded-[var(--radius-theme)] border border-border bg-surface px-3 py-2.5 text-foreground focus:outline-none focus:border-accent"
            >
              <option value="">—</option>
              <option value="male">Male</option>
              <option value="female">Female</option>
            </select>
          </label>
        </div>
      </section>

      <div className="mt-6 grid gap-6 md:grid-cols-2">
        <section className="rounded-[var(--radius-theme)] border border-border bg-surface p-5">
          <p className="mb-3 text-sm font-semibold">Upload a workout file</p>
          <WorkoutUploadForm onAdd={handleAddActivity} />
        </section>
        <section className="rounded-[var(--radius-theme)] border border-border bg-surface p-5">
          <p className="mb-3 text-sm font-semibold">Enter a workout manually</p>
          <ManualWorkoutForm onAdd={handleAddActivity} />
        </section>
      </div>

      <section className="mt-6 rounded-[var(--radius-theme)] border border-border bg-surface p-5">
        <RecoveryCheckinForm onAdd={handleAddReading} />
      </section>

      {lastAdded && (
        <section className="mt-6">
          <p className="mb-3 text-sm font-semibold">Just added</p>
          <ActivityResultCard
            activity={lastAdded}
            load={computeActivityLoad(lastAdded, profileOptions)}
            acwr={acwr}
            recovery={recovery}
          />
        </section>
      )}

      {activities.length > 0 && (
        <section className="mt-6">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-sm font-semibold">Session activities ({activities.length})</p>
            <Button variant="ghost" onClick={handleReset}>
              Reset session
            </Button>
          </div>
          <ul className="divide-y divide-border rounded-[var(--radius-theme)] border border-border bg-surface">
            {activities.map((activity) => (
              <li key={activity.id} className="flex items-center justify-between px-4 py-2 text-sm">
                <span>{activity.name}</span>
                <span className="text-muted">
                  {new Date(activity.startDate).toLocaleDateString()} ·{" "}
                  {computeActivityLoad(activity, profileOptions).value.toFixed(1)} load
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </main>
  );
}
