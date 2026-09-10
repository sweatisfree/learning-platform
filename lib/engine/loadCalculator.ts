import type { Activity } from "@/lib/types/activity";
import type { Sex } from "@/lib/types/common";
import { computeAcwr, type AcwrResult } from "./acwr";
import { computeSrpe, type SrpeInput } from "./srpe";
import { computeTrimp } from "./trimp";

// ---------------------------------------------------------------------------
// 1. EWMA acute (7-day) vs chronic (28-day) workload — source-agnostic, runs
//    identically over Strava, uploaded-file, or manually-entered activities.
// ---------------------------------------------------------------------------

// Where a max heart rate came from. An estimated max HR means every TRIMP
// value derived from it is partly a birthday formula rather than a measured
// effort, which callers are expected to surface rather than bury.
export type MaxHeartRateSource = "measured" | "estimated";

export interface ActivityLoadOptions {
  restingHeartRate?: number;
  maxHeartRate?: number;
  maxHeartRateSource?: MaxHeartRateSource;
  sex?: Sex;
}

// Which formula actually produced a load value. "duration" is the fallback
// when neither an RPE nor a full HR profile is available — it is a proxy, not
// a physiological measure, and is reported so it can be labelled as such.
export type LoadMethod = "srpe" | "trimp" | "duration";

export interface ActivityLoad {
  value: number;
  method: LoadMethod;
}

export interface LoadCoverage {
  activityCount: number;
  daysSpanned: number;
  byMethod: Record<LoadMethod, number>;
  // True when any TRIMP in this window was computed from an estimated max HR.
  usesEstimatedMaxHeartRate: boolean;
}

export interface AcuteChronicLoad extends AcwrResult {
  coverage: LoadCoverage;
}

// Per-activity load: sRPE when the athlete logged an RPE (manual entries
// only), TRIMP when heart-rate data and a profile are available, otherwise
// moving time in minutes — the one load proxy every activity guarantees.
export function computeActivityLoad(
  activity: Activity,
  options: ActivityLoadOptions = {},
): ActivityLoad {
  if (activity.rpe != null) {
    return {
      value: computeModalitySrpe({
        rpe: activity.rpe,
        durationMinutes: activity.movingTimeSeconds / 60,
        // The manual entry form has no modality selector (date/duration/
        // distance/avg HR/RPE only), so every RPE-logged activity is treated
        // as generic non-GPS work rather than guessing strength vs. isophit.
        modality: "non-gps",
      }),
      method: "srpe",
    };
  }

  const { restingHeartRate, maxHeartRate, sex } = options;
  if (
    activity.averageHeartRate != null &&
    restingHeartRate != null &&
    maxHeartRate != null &&
    sex != null
  ) {
    return {
      value: computeTrimp({
        durationMinutes: activity.movingTimeSeconds / 60,
        restingHeartRate,
        maxHeartRate,
        averageHeartRate: activity.averageHeartRate,
        sex,
      }),
      method: "trimp",
    };
  }
  return { value: activity.movingTimeSeconds / 60, method: "duration" };
}

function dailyLoadByDate(
  activities: readonly Activity[],
  options: ActivityLoadOptions,
): { byDay: Map<string, number>; coverage: LoadCoverage } {
  const byDay = new Map<string, number>();
  const byMethod: Record<LoadMethod, number> = { srpe: 0, trimp: 0, duration: 0 };
  for (const activity of activities) {
    const dayKey = activity.startDate.slice(0, 10); // YYYY-MM-DD
    const { value, method } = computeActivityLoad(activity, options);
    byMethod[method] += 1;
    byDay.set(dayKey, (byDay.get(dayKey) ?? 0) + value);
  }
  return {
    byDay,
    coverage: {
      activityCount: activities.length,
      daysSpanned: 0, // filled in once the series is zero-filled
      byMethod,
      usesEstimatedMaxHeartRate: byMethod.trimp > 0 && options.maxHeartRateSource === "estimated",
    },
  };
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
// then runs the existing EWMA-based ACWR (see acwr.ts) over it. The returned
// coverage says which formula produced the underlying numbers, so a ratio
// built entirely from the duration fallback can be presented as exactly that.
export function computeAcuteChronicLoad(
  activities: readonly Activity[],
  options: ActivityLoadOptions = {},
): AcuteChronicLoad {
  const { byDay, coverage } = dailyLoadByDate(activities, options);
  const dailySeries = zeroFillDailySeries(byDay);
  return {
    ...computeAcwr(dailySeries),
    coverage: { ...coverage, daysSpanned: dailySeries.length },
  };
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
// Documented on /transparency; keep the two in sync.
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
//    degrades to whichever subset is actually present. A metric whose
//    baseline rests on fewer than `minReadingsPerMetric` readings does not
//    contribute at all: a thin baseline produces a confident-looking number
//    from noise, which is worse than reporting no number. Pure function: the
//    Webhook/Supabase sync that produces `readings` lives elsewhere.
// ---------------------------------------------------------------------------

// A rolling baseline needs enough readings for its standard deviation to mean
// anything. Seven is one full week of daily readings — below that, day-to-day
// variation dominates and z-scores are noise.
export const DEFAULT_MIN_READINGS_PER_METRIC = 7;

export interface AutonomicReading {
  restingHeartRate?: number;
  hrv?: number;
  sleepHours?: number;
  respiratoryRate?: number;
}

export interface MetricBaseline {
  mean: number | null;
  stdDev: number | null;
  readingCount: number;
}

export interface AutonomicBaseline {
  restingHeartRate: MetricBaseline;
  hrv: MetricBaseline;
  sleepHours: MetricBaseline;
  respiratoryRate: MetricBaseline;
}

export interface AutonomicCoverage {
  signalsUsed: number; // signals that actually contributed to the score
  signalsPresentToday: number; // signals present in today's reading, contributing or not
  signalsShortOfBaseline: number; // present today, but baseline too thin to use
  minReadingsPerMetric: number;
  insufficientData: boolean; // true when no signal qualified -> score is null
}

export interface AutonomicRecoveryIndex {
  score: number | null; // 0-100, or null when no signal had a usable baseline
  band: "low" | "moderate" | "high" | null;
  hrvDropSd: number | null; // SDs today's HRV sits below baseline (positive = drop); null if unavailable
  restingHrRiseSd: number | null; // SDs today's resting HR sits above baseline (positive = elevated); null if unavailable
  sleepDeficitSd: number | null; // SDs today's sleep sits below baseline (positive = deficit); null if unavailable
  respiratoryRateRiseSd: number | null; // SDs today's respiratory rate sits above baseline; null if unavailable
  coverage: AutonomicCoverage;
}

export interface AutonomicRecoveryOptions {
  minReadingsPerMetric?: number;
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
function computeMetricBaseline(values: readonly number[]): MetricBaseline {
  if (values.length === 0) return { mean: null, stdDev: null, readingCount: 0 };
  return { mean: mean(values), stdDev: sampleStdDev(values), readingCount: values.length };
}

export function computeAutonomicBaseline(readings: readonly AutonomicReading[]): AutonomicBaseline {
  return {
    restingHeartRate: computeMetricBaseline(extractPresent(readings, "restingHeartRate")),
    hrv: computeMetricBaseline(extractPresent(readings, "hrv")),
    sleepHours: computeMetricBaseline(extractPresent(readings, "sleepHours")),
    respiratoryRate: computeMetricBaseline(extractPresent(readings, "respiratoryRate")),
  };
}

type SignalOutcome =
  | { status: "used"; zScore: number }
  | { status: "short-of-baseline" }
  | { status: "absent" };

// A z-score only exists when today's reading AND a sufficiently deep baseline
// both have this metric. "lowIsBad" (HRV, sleep) scores a drop below baseline
// as positive; "highIsBad" (resting HR, respiratory rate) scores a rise as
// positive — both conventions feed into the same combined-strain average.
function evaluateSignal(
  todayValue: number | undefined,
  baseline: MetricBaseline,
  direction: "lowIsBad" | "highIsBad",
  minReadings: number,
): SignalOutcome {
  if (todayValue == null) return { status: "absent" };
  if (baseline.mean == null || baseline.stdDev == null) return { status: "short-of-baseline" };
  if (baseline.readingCount < minReadings) return { status: "short-of-baseline" };
  if (baseline.stdDev === 0) return { status: "used", zScore: 0 };
  const zScore =
    direction === "lowIsBad"
      ? (baseline.mean - todayValue) / baseline.stdDev
      : (todayValue - baseline.mean) / baseline.stdDev;
  return { status: "used", zScore };
}

export function computeAutonomicRecoveryIndex(
  today: AutonomicReading,
  baseline: AutonomicBaseline,
  options: AutonomicRecoveryOptions = {},
): AutonomicRecoveryIndex {
  const minReadingsPerMetric = options.minReadingsPerMetric ?? DEFAULT_MIN_READINGS_PER_METRIC;

  const hrv = evaluateSignal(today.hrv, baseline.hrv, "lowIsBad", minReadingsPerMetric);
  const restingHr = evaluateSignal(
    today.restingHeartRate,
    baseline.restingHeartRate,
    "highIsBad",
    minReadingsPerMetric,
  );
  const sleep = evaluateSignal(
    today.sleepHours,
    baseline.sleepHours,
    "lowIsBad",
    minReadingsPerMetric,
  );
  const respiratoryRate = evaluateSignal(
    today.respiratoryRate,
    baseline.respiratoryRate,
    "highIsBad",
    minReadingsPerMetric,
  );

  const outcomes = [hrv, restingHr, sleep, respiratoryRate];
  const used = outcomes.filter(
    (outcome): outcome is { status: "used"; zScore: number } => outcome.status === "used",
  );

  const coverage: AutonomicCoverage = {
    signalsUsed: used.length,
    signalsPresentToday: outcomes.filter((outcome) => outcome.status !== "absent").length,
    signalsShortOfBaseline: outcomes.filter((outcome) => outcome.status === "short-of-baseline")
      .length,
    minReadingsPerMetric,
    insufficientData: used.length === 0,
  };

  const zScoreOrNull = (outcome: SignalOutcome) =>
    outcome.status === "used" ? outcome.zScore : null;

  // Nothing qualified -> no score. Returning a neutral midpoint here would be
  // indistinguishable from "today matches your baseline exactly", which is a
  // confident claim built on no data.
  if (used.length === 0) {
    return {
      score: null,
      band: null,
      hrvDropSd: null,
      restingHrRiseSd: null,
      sleepDeficitSd: null,
      respiratoryRateRiseSd: null,
      coverage,
    };
  }

  // Equal-weighted average of whatever signals qualified, mapped from
  // [-2 SD, +2 SD] onto [100, 0] and clamped at the extremes.
  const combinedStrainSd = used.reduce((sum, outcome) => sum + outcome.zScore, 0) / used.length;
  const score = clamp(100 - (combinedStrainSd + 2) * 25, 0, 100);

  return {
    score,
    band: bandForScore(score),
    hrvDropSd: zScoreOrNull(hrv),
    restingHrRiseSd: zScoreOrNull(restingHr),
    sleepDeficitSd: zScoreOrNull(sleep),
    respiratoryRateRiseSd: zScoreOrNull(respiratoryRate),
    coverage,
  };
}

export function bandForScore(score: number): "low" | "moderate" | "high" {
  return score >= 67 ? "high" : score >= 34 ? "moderate" : "low";
}
