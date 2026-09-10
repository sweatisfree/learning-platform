import type { Activity } from "@/lib/types/activity";
import type { AcwrResult } from "@/lib/engine/acwr";
import type { ActivityLoad, AutonomicRecoveryIndex } from "@/lib/engine/loadCalculator";

const LOAD_METHOD_LABEL: Record<ActivityLoad["method"], string> = {
  trimp: "TRIMP (heart rate)",
  srpe: "sRPE (self-reported)",
  duration: "duration only — no HR profile",
};

function formatDuration(seconds: number): string {
  const minutes = Math.round(seconds / 60);
  return `${minutes} min`;
}

function formatDistance(meters: number): string {
  if (meters <= 0) return "—";
  return `${(meters / 1000).toFixed(2)} km`;
}

const SOURCE_LABEL: Record<Activity["source"], string> = {
  strava: "Strava",
  file: "Uploaded file",
  manual: "Manual entry",
};

export function ActivityResultCard({
  activity,
  load,
  acwr,
  recovery,
}: {
  activity: Activity;
  load: ActivityLoad;
  acwr: AcwrResult;
  recovery: AutonomicRecoveryIndex | null;
}) {
  return (
    <div className="rounded-[var(--radius-theme)] border border-border bg-surface p-5">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="font-heading font-bold">{activity.name}</h3>
        <span className="rounded-full bg-accent/20 px-2 py-0.5 text-xs text-accent">
          {SOURCE_LABEL[activity.source]}
        </span>
      </div>

      <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
        <dt className="text-muted">Type</dt>
        <dd>{activity.type}</dd>
        <dt className="text-muted">Date</dt>
        <dd>{new Date(activity.startDate).toLocaleString()}</dd>
        <dt className="text-muted">Duration</dt>
        <dd>{formatDuration(activity.movingTimeSeconds)}</dd>
        <dt className="text-muted">Distance</dt>
        <dd>{formatDistance(activity.distanceMeters)}</dd>
        <dt className="text-muted">Avg HR</dt>
        <dd>{activity.averageHeartRate ?? "—"}</dd>
        <dt className="text-muted">RPE</dt>
        <dd>{activity.rpe ?? "—"}</dd>
      </dl>

      <div className="mt-4 border-t border-border pt-4">
        <p className="text-sm text-muted">Computed load (this activity)</p>
        <p className="font-heading text-xl font-bold">{load.value.toFixed(1)}</p>
        <p className="text-xs text-muted">via {LOAD_METHOD_LABEL[load.method]}</p>
      </div>

      <div className="mt-3">
        <p className="text-sm text-muted">Acute:Chronic Workload Ratio (all session activities)</p>
        <p className="font-heading text-xl font-bold">{acwr.ratio.toFixed(2)}</p>
        <p className="text-xs text-muted">
          acute {acwr.acute.toFixed(1)} · chronic {acwr.chronic.toFixed(1)}
        </p>
      </div>

      {recovery && (
        <div className="mt-3">
          <p className="text-sm text-muted">Autonomic Recovery Index</p>
          {recovery.score == null ? (
            <p className="text-sm text-muted">
              Not enough baseline yet — needs {recovery.coverage.minReadingsPerMetric} readings of a
              signal before a score means anything.
            </p>
          ) : (
            <>
              <p className="font-heading text-xl font-bold capitalize">
                {recovery.score.toFixed(0)} · {recovery.band}
              </p>
              <p className="text-xs text-muted">
                from {recovery.coverage.signalsUsed} of 4 signals
              </p>
            </>
          )}
        </div>
      )}
    </div>
  );
}
