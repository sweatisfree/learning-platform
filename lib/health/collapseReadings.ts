import type { AutonomicReading } from "@/lib/engine/loadCalculator";
import type { HealthReadingSource, HrvMethod } from "@/lib/types/health-reading";

// A stored row reduced to what collapsing needs. Deliberately structural and
// free of any Supabase import, so the logic is unit-testable on plain objects.
export interface DatedReading extends AutonomicReading {
  recordedDate: string; // YYYY-MM-DD
  source: HealthReadingSource;
  hrvMethod?: HrvMethod | null;
}

// One reading per date, with the HRV method that survived the pick, so a later
// phase can key baselines on (signal, source, method) without re-querying.
export interface CollapsedReading extends AutonomicReading {
  recordedDate: string;
  hrvMethod: HrvMethod | null;
}

// Consulted only when a single date carries readings from more than one source.
// Automated sources beat hand entry because Settings documents manual entry as
// a backup "for days the webhook misses" rather than a correction to a device.
// Replaced by a per-user, per-signal preference in a later phase; see
// docs/integration-discovery.md.
export const DEFAULT_SOURCE_PRIORITY: readonly HealthReadingSource[] = [
  "whoop",
  "oura",
  "garmin",
  "fitbit",
  "webhook",
  "manual",
];

function sourceRank(source: string, priority: readonly string[]): number {
  const index = priority.indexOf(source);
  // An unrecognised source still works, it just loses every tie to a known one.
  return index === -1 ? priority.length : index;
}

type MetricKey = "restingHeartRate" | "hrv" | "sleepHours" | "respiratoryRate";
const METRIC_KEYS: readonly MetricKey[] = [
  "restingHeartRate",
  "hrv",
  "sleepHours",
  "respiratoryRate",
];

function hasAnySignal(reading: AutonomicReading): boolean {
  return METRIC_KEYS.some((key) => reading[key] != null);
}

/**
 * Reduces stored rows to at most one reading per date.
 *
 * `health_readings` is unique on (user_id, recorded_date, source), so one date
 * can legally hold several rows — a webhook reading and a hand-typed one today,
 * a reading per connected wearable once more sources exist. Feeding those
 * straight to the engine counts that day once per source: it skews the day's
 * weight in the user's own baseline, and reaches the seven-reading threshold
 * before seven real days have passed.
 *
 * Each metric is taken whole from the highest-priority source that actually
 * has a value, so a device that reported sleep but not HRV does not block a
 * second source from supplying the HRV. Values are never averaged across
 * sources: two devices are two opinions, not two measurements of one thing.
 *
 * Input order is preserved — callers fetch date-ascending and the engine treats
 * the last entry as today.
 */
export function collapseReadingsByDate(
  stored: readonly DatedReading[],
  priority: readonly HealthReadingSource[] = DEFAULT_SOURCE_PRIORITY,
): CollapsedReading[] {
  const byDate = new Map<string, DatedReading[]>();
  for (const reading of stored) {
    const existing = byDate.get(reading.recordedDate);
    if (existing) existing.push(reading);
    else byDate.set(reading.recordedDate, [reading]);
  }

  const collapsed: CollapsedReading[] = [];

  for (const [recordedDate, rows] of byDate) {
    const ranked = [...rows].sort(
      (a, b) => sourceRank(a.source, priority) - sourceRank(b.source, priority),
    );

    const winner: CollapsedReading = { recordedDate, hrvMethod: null };

    for (const key of METRIC_KEYS) {
      const row = ranked.find((candidate) => candidate[key] != null);
      if (!row) continue;
      winner[key] = row[key];
      // The method belongs to whichever row supplied the HRV, not to the date.
      if (key === "hrv") winner.hrvMethod = row.hrvMethod ?? null;
    }

    if (hasAnySignal(winner)) collapsed.push(winner);
  }

  return collapsed;
}
