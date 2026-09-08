import type { Activity } from "@/lib/types/activity";
import type { Sex } from "@/lib/types/common";
import { computeAcwr, type AcwrResult } from "./acwr";
import { computeSrpe, type SrpeInput } from "./srpe";
import { computeTrimp } from "./trimp";

// ---------------------------------------------------------------------------
// 1. EWMA acute (7-day) vs chronic (28-day) workload — source-agnostic, runs
//    identically over Strava, uploaded-file, or manually-entered activities.
// ---------------------------------------------------------------------------

export interface ActivityLoadOptions {
  restingHeartRate?: number;
  maxHeartRate?: number;
  sex?: Sex;
}

// Per-activity load: sRPE when the athlete logged an RPE (manual entries
// only), TRIMP when heart-rate data and a profile are available, otherwise
// moving time in minutes — the one load proxy every activity guarantees.
export function computeActivityLoad(activity: Activity, options: ActivityLoadOptions = {}): number {
  if (activity.rpe != null) {
    return computeModalitySrpe({
      rpe: activity.rpe,
      durationMinutes: activity.movingTimeSeconds / 60,
      // The manual entry form has no modality selector (date/duration/
      // distance/avg HR/RPE only), so every RPE-logged activity is treated
      // as generic non-GPS work rather than guessing strength vs. isophit.
      modality: "non-gps",
    });
  }

  const { restingHeartRate, maxHeartRate, sex } = options;
  if (
    activity.averageHeartRate != null &&
    restingHeartRate != null &&
    maxHeartRate != null &&
    sex != null
  ) {
    return computeTrimp({
      durationMinutes: activity.movingTimeSeconds / 60,
      restingHeartRate,
      maxHeartRate,
      averageHeartRate: activity.averageHeartRate,
      sex,
    });
  }
  return activity.movingTimeSeconds / 60;
}

function dailyLoadByDate(
  activities: readonly Activity[],
  options: ActivityLoadOptions,
): Map<string, number> {
  const byDay = new Map<string, number>();
  for (const activity of activities) {
    const dayKey = activity.startDate.slice(0, 10); // YYYY-MM-DD
    const load = computeActivityLoad(activity, options);
    byDay.set(dayKey, (byDay.get(dayKey) ?? 0) + load);
  }
  return byDay;
}

// EWMA assumes one array element per elapsed day — rest days must appear as
// explicit zero-load entries, not be skipped, or the 7/28-day time constants
// stop corresponding to real elapsed time.
function zeroFillDailySeries(byDay: ReadonlyMap<string, number>): number[] {
  const keys = Array.from(byDay.keys()).sort();
  if (keys.length === 0) return [];
  const series: number[] = [];
  const cursor = new Date(`${keys[0]}T00:00:00Z`);
  const end = new Date(`${keys[keys.length - 1]}T00:00:00Z`);
  while (cursor <= end) {
    const key = cursor.toISOString().slice(0, 10);
    series.push(byDay.get(key) ?? 0);
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return series;
}

// Buckets activities from any source into a zero-filled daily load series,
// then runs the existing EWMA-based ACWR (see acwr.ts) over it.
export function computeAcuteChronicLoad(
  activities: readonly Activity[],
  options: ActivityLoadOptions = {},
): AcwrResult {
  const dailySeries = zeroFillDailySeries(dailyLoadByDate(activities, options));
  return computeAcwr(dailySeries);
}

// ---------------------------------------------------------------------------
// 2. sRPE with a modality multiplier, for sessions Strava can't quantify via
//    GPS/power (strength training, ISOPHIT isometric holds, other non-GPS work).
// ---------------------------------------------------------------------------

export type NonGpsModality = "strength" | "isophit" | "non-gps";

// Tunable business multipliers, not a peer-reviewed constant like Banister
// TRIMP's coefficients — ISOPHIT's isometric holds are weighted above
// baseline because sustained-tension work tends to under-report strain
// through RPE×duration alone. Adjust as real athlete feedback comes in.
export const MODALITY_MULTIPLIER: Record<NonGpsModality, number> = {
  strength: 1.0,
  isophit: 1.2,
  "non-gps": 1.0,
};

export interface ModalitySrpeInput extends SrpeInput {
  modality: NonGpsModality;
}

export function computeModalitySrpe(input: ModalitySrpeInput): number {
  return computeSrpe(input) * MODALITY_MULTIPLIER[input.modality];
}

// ---------------------------------------------------------------------------
// 3. Autonomic Recovery Index — resting HR, HRV, sleep, and respiratory rate
//    deviation from a rolling personal baseline, in standard-deviation
//    units. HRV here is whatever metric the source provides (Apple
//    HealthKit exposes SDNN, not rMSSD — the z-score math is unit-agnostic
//    against its own rolling baseline, so any consistent HRV metric works).
//    All four signals are optional per reading — the score gracefully
//    degrades to whichever subset is actually present (e.g. HRV+RHR only,
//    matching the original two-signal behavior, when sleep/respiratory
//    data isn't available). Pure function: the Webhook/Supabase sync that
//    produces `readings` lives elsewhere.
// ---------------------------------------------------------------------------

export interface AutonomicReading {
  restingHeartRate?: number;
  hrv?: number;
  sleepHours?: number;
  respiratoryRate?: number;
}

export interface AutonomicBaseline {
  meanRestingHeartRate: number | null;
  stdDevRestingHeartRate: number | null;
  meanHrv: number | null;
  stdDevHrv: number | null;
  meanSleepHours: number | null;
  stdDevSleepHours: number | null;
  meanRespiratoryRate: number | null;
  stdDevRespiratoryRate: number | null;
}

export interface AutonomicRecoveryIndex {
  score: number; // 0-100
  band: "low" | "moderate" | "high";
  hrvDropSd: number | null; // SDs today's HRV sits below baseline (positive = drop); null if unavailable
  restingHrRiseSd: number | null; // SDs today's resting HR sits above baseline (positive = elevated); null if unavailable
  sleepDeficitSd: number | null; // SDs today's sleep sits below baseline (positive = deficit); null if unavailable
  respiratoryRateRiseSd: number | null; // SDs today's respiratory rate sits above baseline; null if unavailable
  signalsUsed: number; // how many of the four signals actually contributed to the score
}

function mean(values: readonly number[]): number {
  return values.reduce((sum, v) => sum + v, 0) / values.length;
}

// Sample standard deviation (n-1) — a baseline built from a handful of daily
// readings is a sample of the athlete's true distribution, not the population.
function sampleStdDev(values: readonly number[]): number {
  if (values.length < 2) return 0;
  const m = mean(values);
  const variance = values.reduce((sum, v) => sum + (v - m) ** 2, 0) / (values.length - 1);
  return Math.sqrt(variance);
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function extractPresent(
  readings: readonly AutonomicReading[],
  key: keyof AutonomicReading,
): number[] {
  const values: number[] = [];
  for (const reading of readings) {
    const value = reading[key];
    if (value != null) values.push(value);
  }
  return values;
}

// No readings with this metric present at all -> no baseline can be
// computed for it (null, not 0 — 0 would look identical to "every reading
// had this exact same value").
function computeMetricBaseline(values: readonly number[]): { mean: number | null; stdDev: number | null } {
  if (values.length === 0) return { mean: null, stdDev: null };
  return { mean: mean(values), stdDev: sampleStdDev(values) };
}

export function computeAutonomicBaseline(readings: readonly AutonomicReading[]): AutonomicBaseline {
  const restingHeartRate = computeMetricBaseline(extractPresent(readings, "restingHeartRate"));
  const hrv = computeMetricBaseline(extractPresent(readings, "hrv"));
  const sleepHours = computeMetricBaseline(extractPresent(readings, "sleepHours"));
  const respiratoryRate = computeMetricBaseline(extractPresent(readings, "respiratoryRate"));
  return {
    meanRestingHeartRate: restingHeartRate.mean,
    stdDevRestingHeartRate: restingHeartRate.stdDev,
    meanHrv: hrv.mean,
    stdDevHrv: hrv.stdDev,
    meanSleepHours: sleepHours.mean,
    stdDevSleepHours: sleepHours.stdDev,
    meanRespiratoryRate: respiratoryRate.mean,
    stdDevRespiratoryRate: respiratoryRate.stdDev,
  };
}

// A z-score only exists when today's reading AND the baseline both have
// this metric. "lowIsBad" (HRV, sleep) scores a drop below baseline as
// positive; "highIsBad" (resting HR, respiratory rate) scores a rise as
// positive — both conventions feed into the same combined-strain average.
function zScoreIfAvailable(
  todayValue: number | undefined,
  baselineMean: number | null,
  baselineStdDev: number | null,
  direction: "lowIsBad" | "highIsBad",
): number | null {
  if (todayValue == null || baselineMean == null || baselineStdDev == null) return null;
  if (baselineStdDev === 0) return 0;
  return direction === "lowIsBad"
    ? (baselineMean - todayValue) / baselineStdDev
    : (todayValue - baselineMean) / baselineStdDev;
}

export function computeAutonomicRecoveryIndex(
  today: AutonomicReading,
  baseline: AutonomicBaseline,
): AutonomicRecoveryIndex {
  const hrvDropSd = zScoreIfAvailable(today.hrv, baseline.meanHrv, baseline.stdDevHrv, "lowIsBad");
  const restingHrRiseSd = zScoreIfAvailable(
    today.restingHeartRate,
    baseline.meanRestingHeartRate,
    baseline.stdDevRestingHeartRate,
    "highIsBad",
  );
  const sleepDeficitSd = zScoreIfAvailable(
    today.sleepHours,
    baseline.meanSleepHours,
    baseline.stdDevSleepHours,
    "lowIsBad",
  );
  const respiratoryRateRiseSd = zScoreIfAvailable(
    today.respiratoryRate,
    baseline.meanRespiratoryRate,
    baseline.stdDevRespiratoryRate,
    "highIsBad",
  );

  const availableScores = [hrvDropSd, restingHrRiseSd, sleepDeficitSd, respiratoryRateRiseSd].filter(
    (value): value is number => value !== null,
  );

  // Equal-weighted average of whatever signals are actually available,
  // mapped from [-2 SD, +2 SD] onto [100, 0] and clamped at the extremes.
  // No signals at all -> neutral midpoint, same as "matches baseline exactly".
  const combinedStrainSd =
    availableScores.length > 0 ? availableScores.reduce((sum, v) => sum + v, 0) / availableScores.length : 0;
  const score = clamp(100 - (combinedStrainSd + 2) * 25, 0, 100);
  const band: AutonomicRecoveryIndex["band"] =
    score >= 67 ? "high" : score >= 34 ? "moderate" : "low";

  return {
    score,
    band,
    hrvDropSd,
    restingHrRiseSd,
    sleepDeficitSd,
    respiratoryRateRiseSd,
    signalsUsed: availableScores.length,
  };
}
