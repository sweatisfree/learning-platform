"use client";

import { useRef, useState, type ChangeEvent } from "react";
import type { Activity } from "@/lib/types/activity";
import { parseWorkoutFile } from "@/lib/activities/parseWorkoutFile";

const SAMPLE_FILES = [
  { name: "morning-run.gpx", href: "/sample-workouts/morning-run.gpx" },
  { name: "interval-ride.tcx", href: "/sample-workouts/interval-ride.tcx" },
  { name: "easy-recovery-run.gpx", href: "/sample-workouts/easy-recovery-run.gpx" },
];

export function WorkoutUploadForm({ onAdd }: { onAdd: (activity: Activity) => void }) {
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setError(null);
    try {
      const activity = await parseWorkoutFile(file);
      onAdd(activity);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to parse workout file.");
    } finally {
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <div className="space-y-3">
      <label className="block">
        <span className="mb-1 block text-sm text-muted">Upload a GPX or TCX file</span>
        <input
          ref={inputRef}
          type="file"
          accept=".gpx,.tcx"
          onChange={handleFileChange}
          className="block w-full text-sm text-muted file:mr-3 file:rounded-[var(--radius-theme)] file:border-0 file:bg-accent file:px-4 file:py-2 file:text-sm file:font-semibold file:text-foreground"
        />
      </label>
      {error && <p className="text-sm text-warning">{error}</p>}
      <div className="text-sm text-muted">
        No file handy? Try a sample:
        <div className="mt-1 flex flex-wrap gap-3">
          {SAMPLE_FILES.map((sample) => (
            <a key={sample.name} href={sample.href} download className="text-accent underline">
              {sample.name}
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}
