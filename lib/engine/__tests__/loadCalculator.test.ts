import { describe, expect, it } from "vitest";
import type { Activity } from "@/lib/types/activity";
import { computeSrpe } from "../srpe";
import { computeTrimp } from "../trimp";
import {
  computeAcuteChronicLoad,
  computeActivityLoad,
  computeAutonomicBaseline,
  computeAutonomicRecoveryIndex,
  computeModalitySrpe,
  type AutonomicBaseline,
  type MetricBaseline,
} from "../loadCalculator";

function makeActivity(overrides: Partial<Activity> = {}): Activity {
  return {
    id: "1",
    source: "strava",
    name: "Ride",
    type: "Ride",
    startDate: "2024-06-01T08:00:00Z",
    movingTimeSeconds: 3600,
    distanceMeters: 20000,
    averageHeartRate: null,
    averageWatts: null,
    rpe: null,
    ...overrides,
  };
}

const ABSENT: MetricBaseline = { mean: null, stdDev: null, readingCount: 0 };

function makeBaseline(overrides: Partial<AutonomicBaseline> = {}): AutonomicBaseline {
  return {
    restingHeartRate: ABSENT,
    hrv: ABSENT,
    sleepHours: ABSENT,
    respiratoryRate: ABSENT,
    ...overrides,
  };
}

// Deep enough to clear the default minimum, so tests exercise the z-score math
// rather than the insufficient-baseline path.
function metric(mean: number, stdDev: number, readingCount = 10): MetricBaseline {
  return { mean, stdDev, readingCount };
}

describe("computeActivityLoad", () => {
  it("falls back to moving-time minutes when there is no heart-rate or RPE data", () => {
    const activity = makeActivity({ movingTimeSeconds: 1800, averageHeartRate: null });
    expect(computeActivityLoad(activity)).toEqual({ value: 30, method: "duration" });
  });

  it("reports the duration fallback when heart-rate data is present but no profile is supplied", () => {
    const activity = makeActivity({ movingTimeSeconds: 1800, averageHeartRate: 150 });
    const load = computeActivityLoad(activity);
    expect(load.value).toBe(30);
    expect(load.method).toBe("duration");
  });

  it("uses TRIMP when heart-rate data and a full profile are supplied", () => {
    const activity = makeActivity({ movingTimeSeconds: 3600, averageHeartRate: 150 });
    const options = { restingHeartRate: 60, maxHeartRate: 190, sex: "male" as const };
    const expected = computeTrimp({
      durationMinutes: 60,
      restingHeartRate: 60,
      maxHeartRate: 190,
      averageHeartRate: 150,
      sex: "male",
    });
    const load = computeActivityLoad(activity, options);
    expect(load.value).toBeCloseTo(expected);
    expect(load.method).toBe("trimp");
  });

  it("uses modality sRPE when the activity has a logged RPE, ignoring HR/profile", () => {
    const activity = makeActivity({
      source: "manual",
      movingTimeSeconds: 2700,
      averageHeartRate: 150,
      rpe: 7,
    });
    const options = { restingHeartRate: 60, maxHeartRate: 190, sex: "male" as const };
    const expected = computeModalitySrpe({ rpe: 7, durationMinutes: 45, modality: "non-gps" });
    const load = computeActivityLoad(activity, options);
    expect(load.value).toBeCloseTo(expected);
    expect(load.method).toBe("srpe");
  });

  it("prefers RPE over TRIMP even when a full HR profile is also available", () => {
    const withRpeOnly = computeActivityLoad(
      makeActivity({ movingTimeSeconds: 1800, averageHeartRate: null, rpe: 6 }),
    );
    const withRpeAndHr = computeActivityLoad(
      makeActivity({ movingTimeSeconds: 1800, averageHeartRate: 150, rpe: 6 }),
      { restingHeartRate: 60, maxHeartRate: 190, sex: "male" },
    );
    expect(withRpeAndHr.value).toBeCloseTo(withRpeOnly.value);
    expect(withRpeAndHr.method).toBe("srpe");
  });
});

describe("computeAcuteChronicLoad", () => {
  it("returns zeros and empty coverage for no activities", () => {
    const result = computeAcuteChronicLoad([]);
    expect(result.acute).toBe(0);
    expect(result.chronic).toBe(0);
    expect(result.ratio).toBe(0);
    expect(result.coverage.activityCount).toBe(0);
    expect(result.coverage.daysSpanned).toBe(0);
  });

  it("resolves to ratio 1.0 for a single activity", () => {
    const { ratio } = computeAcuteChronicLoad([makeActivity()]);
    expect(ratio).toBeCloseTo(1.0);
  });

  it("reports which formula produced the underlying loads", () => {
    const activities = [
      makeActivity({ id: "1", averageHeartRate: 150 }),
      makeActivity({ id: "2", averageHeartRate: null, startDate: "2024-06-02T08:00:00Z" }),
      makeActivity({ id: "3", rpe: 6, startDate: "2024-06-03T08:00:00Z" }),
    ];
    const options = { restingHeartRate: 60, maxHeartRate: 190, sex: "male" as const };
    const { coverage } = computeAcuteChronicLoad(activities, options);
    expect(coverage.activityCount).toBe(3);
    expect(coverage.byMethod).toEqual({ trimp: 1, duration: 1, srpe: 1 });
  });

  it("reports a ratio built entirely from the duration fallback", () => {
    const { coverage } = computeAcuteChronicLoad([makeActivity({ averageHeartRate: 150 })]);
    expect(coverage.byMethod.trimp).toBe(0);
    expect(coverage.byMethod.duration).toBe(1);
  });

  it("flags when TRIMP was computed from an estimated max heart rate", () => {
    const activities = [makeActivity({ averageHeartRate: 150 })];
    const base = { restingHeartRate: 60, maxHeartRate: 190, sex: "male" as const };

    const measured = computeAcuteChronicLoad(activities, {
      ...base,
      maxHeartRateSource: "measured",
    });
    expect(measured.coverage.usesEstimatedMaxHeartRate).toBe(false);

    const estimated = computeAcuteChronicLoad(activities, {
      ...base,
      maxHeartRateSource: "estimated",
    });
    expect(estimated.coverage.usesEstimatedMaxHeartRate).toBe(true);
  });

  it("does not flag estimated max HR when no activity actually used TRIMP", () => {
    const { coverage } = computeAcuteChronicLoad([makeActivity({ averageHeartRate: null })], {
      restingHeartRate: 60,
      maxHeartRate: 190,
      sex: "male",
      maxHeartRateSource: "estimated",
    });
    expect(coverage.byMethod.trimp).toBe(0);
    expect(coverage.usesEstimatedMaxHeartRate).toBe(false);
  });

  it("sums same-day activities before running EWMA", () => {
    const activities = [
      makeActivity({ id: "1", movingTimeSeconds: 1800, startDate: "2024-06-01T07:00:00Z" }),
      makeActivity({ id: "2", movingTimeSeconds: 1800, startDate: "2024-06-01T18:00:00Z" }),
    ];
    const { acute, chronic, coverage } = computeAcuteChronicLoad(activities);
    // Single calendar day in the series -> EWMA seeds on (and stays at) the summed value.
    expect(acute).toBeCloseTo(60);
    expect(chronic).toBeCloseTo(60);
    expect(coverage.daysSpanned).toBe(1);
  });

  it("mixes activities from different sources in the same daily series", () => {
    const activities = [
      makeActivity({ id: "1", source: "strava", movingTimeSeconds: 1800, startDate: "2024-06-01T07:00:00Z" }),
      makeActivity({
        id: "2",
        source: "manual",
        movingTimeSeconds: 2700,
        startDate: "2024-06-01T18:00:00Z",
        rpe: 6,
      }),
    ];
    const stravaOnlyLoad = computeActivityLoad(activities[0]).value;
    const manualLoad = computeActivityLoad(activities[1]).value;
    const { acute } = computeAcuteChronicLoad(activities);
    expect(acute).toBeCloseTo(stravaOnlyLoad + manualLoad);
  });

  it("resolves to ratio 1.0 across many days of constant daily load", () => {
    const start = new Date("2024-06-01T08:00:00Z");
    const activities = Array.from({ length: 40 }, (_, i) => {
      const date = new Date(start);
      date.setUTCDate(date.getUTCDate() + i);
      return makeActivity({ id: String(i), startDate: date.toISOString(), movingTimeSeconds: 3600 });
    });
    const { ratio, coverage } = computeAcuteChronicLoad(activities);
    expect(ratio).toBeCloseTo(1.0, 5);
    expect(coverage.daysSpanned).toBe(40);
  });

  it("zero-fills rest days instead of skipping them", () => {
    const load = 120; // minutes
    const withGap = computeAcuteChronicLoad([
      makeActivity({ id: "1", startDate: "2024-06-01T08:00:00Z", movingTimeSeconds: load * 60 }),
      makeActivity({ id: "2", startDate: "2024-06-11T08:00:00Z", movingTimeSeconds: load * 60 }),
    ]);
    // If the 9 rest days between the two activities were skipped rather than
    // zero-filled, the acute EWMA would sit much closer to the raw load.
    expect(withGap.acute).toBeLessThan(load);
    expect(withGap.acute).toBeGreaterThan(0);
    expect(withGap.coverage.daysSpanned).toBe(11);
  });
});

describe("computeModalitySrpe", () => {
  const base = { rpe: 7, durationMinutes: 45 };

  it("applies no multiplier for strength sessions", () => {
    expect(computeModalitySrpe({ ...base, modality: "strength" })).toBe(computeSrpe(base));
  });

  it("applies no multiplier for generic non-GPS sessions", () => {
    expect(computeModalitySrpe({ ...base, modality: "non-gps" })).toBe(computeSrpe(base));
  });

  it("weights ISOPHIT isometric sessions above baseline sRPE", () => {
    const isophit = computeModalitySrpe({ ...base, modality: "isophit" });
    expect(isophit).toBeGreaterThan(computeSrpe(base));
  });
});

describe("computeAutonomicBaseline", () => {
  it("computes mean, sample standard deviation, and reading count", () => {
    const baseline = computeAutonomicBaseline([
      { restingHeartRate: 48, hrv: 60 },
      { restingHeartRate: 50, hrv: 60 },
      { restingHeartRate: 52, hrv: 60 },
    ]);
    expect(baseline.restingHeartRate.mean).toBeCloseTo(50);
    expect(baseline.restingHeartRate.stdDev).toBeCloseTo(2);
    expect(baseline.restingHeartRate.readingCount).toBe(3);
    expect(baseline.hrv.mean).toBeCloseTo(60);
    expect(baseline.hrv.stdDev).toBeCloseTo(0);
  });

  it("returns zero standard deviation for a single reading", () => {
    const baseline = computeAutonomicBaseline([{ restingHeartRate: 50, hrv: 60 }]);
    expect(baseline.restingHeartRate.stdDev).toBe(0);
    expect(baseline.hrv.stdDev).toBe(0);
  });

  it("returns null mean/stddev and a zero count for a metric with no readings at all", () => {
    const baseline = computeAutonomicBaseline([{ restingHeartRate: 50, hrv: 60 }]);
    expect(baseline.sleepHours.mean).toBeNull();
    expect(baseline.sleepHours.stdDev).toBeNull();
    expect(baseline.sleepHours.readingCount).toBe(0);
    expect(baseline.respiratoryRate.readingCount).toBe(0);
  });

  it("computes each metric independently when readings only partially overlap", () => {
    const baseline = computeAutonomicBaseline([
      { restingHeartRate: 50 }, // no hrv/sleep this day
      { hrv: 60, sleepHours: 7 }, // no restingHeartRate this day
      { restingHeartRate: 52, hrv: 62, sleepHours: 8 },
    ]);
    expect(baseline.restingHeartRate.mean).toBeCloseTo(51);
    expect(baseline.restingHeartRate.readingCount).toBe(2);
    expect(baseline.sleepHours.mean).toBeCloseTo(7.5);
    expect(baseline.sleepHours.readingCount).toBe(2);
    expect(baseline.respiratoryRate.mean).toBeNull();
  });
});

describe("computeAutonomicRecoveryIndex", () => {
  const baseline = makeBaseline({
    restingHeartRate: metric(50, 2),
    hrv: metric(60, 5),
  });

  it("scores exactly at the midpoint when today matches baseline (HRV+RHR only)", () => {
    const result = computeAutonomicRecoveryIndex({ restingHeartRate: 50, hrv: 60 }, baseline);
    expect(result.hrvDropSd).toBeCloseTo(0);
    expect(result.restingHrRiseSd).toBeCloseTo(0);
    expect(result.score).toBeCloseTo(50);
    expect(result.band).toBe("moderate");
    expect(result.coverage.signalsUsed).toBe(2);
  });

  it("scores 100 (high) when HRV is up and resting HR is down 2 SD", () => {
    const result = computeAutonomicRecoveryIndex({ restingHeartRate: 46, hrv: 70 }, baseline);
    expect(result.score).toBeCloseTo(100);
    expect(result.band).toBe("high");
  });

  it("scores 0 (low) when HRV drops and resting HR rises 2 SD", () => {
    const result = computeAutonomicRecoveryIndex({ restingHeartRate: 54, hrv: 50 }, baseline);
    expect(result.score).toBeCloseTo(0);
    expect(result.band).toBe("low");
  });

  it("does not produce NaN/Infinity when baseline standard deviation is zero", () => {
    const flatBaseline = makeBaseline({
      restingHeartRate: metric(50, 0),
      hrv: metric(60, 0),
    });
    const result = computeAutonomicRecoveryIndex({ restingHeartRate: 55, hrv: 40 }, flatBaseline);
    expect(Number.isFinite(result.score)).toBe(true);
    expect(result.hrvDropSd).toBe(0);
    expect(result.restingHrRiseSd).toBe(0);
  });

  it("ignores a metric today has data for but no baseline", () => {
    const result = computeAutonomicRecoveryIndex(
      { restingHeartRate: 50, hrv: 60, sleepHours: 8 },
      baseline,
    );
    expect(result.sleepDeficitSd).toBeNull();
    expect(result.coverage.signalsUsed).toBe(2);
    expect(result.coverage.signalsPresentToday).toBe(3);
    expect(result.coverage.signalsShortOfBaseline).toBe(1);
  });

  it("uses all four signals when all have today's data and a deep enough baseline", () => {
    const fullBaseline = makeBaseline({
      restingHeartRate: metric(50, 2),
      hrv: metric(60, 5),
      sleepHours: metric(7.5, 1),
      respiratoryRate: metric(14, 1),
    });
    const result = computeAutonomicRecoveryIndex(
      { restingHeartRate: 50, hrv: 60, sleepHours: 7.5, respiratoryRate: 14 },
      fullBaseline,
    );
    expect(result.coverage.signalsUsed).toBe(4);
    expect(result.sleepDeficitSd).toBeCloseTo(0);
    expect(result.respiratoryRateRiseSd).toBeCloseTo(0);
    expect(result.score).toBeCloseTo(50);
  });

  it("scores a sleep deficit as reduced recovery, same direction as an HRV drop", () => {
    const sleepBaseline = makeBaseline({ sleepHours: metric(8, 1) });
    const result = computeAutonomicRecoveryIndex({ sleepHours: 6 }, sleepBaseline);
    expect(result.coverage.signalsUsed).toBe(1);
    expect(result.sleepDeficitSd).toBeCloseTo(2); // 2 hours short, 1 SD wide -> 2 SD deficit
    expect(result.score!).toBeLessThan(50);
  });

  it("returns null rather than a neutral midpoint when no signals are available at all", () => {
    const result = computeAutonomicRecoveryIndex({}, makeBaseline());
    expect(result.coverage.signalsUsed).toBe(0);
    expect(result.coverage.insufficientData).toBe(true);
    expect(result.score).toBeNull();
    expect(result.band).toBeNull();
  });

  it("excludes a metric whose baseline is thinner than the minimum", () => {
    const thin = makeBaseline({ hrv: metric(60, 5, 3) });
    const result = computeAutonomicRecoveryIndex({ hrv: 40 }, thin);
    expect(result.hrvDropSd).toBeNull();
    expect(result.coverage.signalsUsed).toBe(0);
    expect(result.coverage.signalsShortOfBaseline).toBe(1);
    expect(result.score).toBeNull();
  });

  it("honours a caller-supplied minimum", () => {
    const thin = makeBaseline({ hrv: metric(60, 5, 3) });
    const result = computeAutonomicRecoveryIndex({ hrv: 40 }, thin, { minReadingsPerMetric: 3 });
    expect(result.coverage.signalsUsed).toBe(1);
    expect(result.coverage.minReadingsPerMetric).toBe(3);
    expect(result.score).not.toBeNull();
  });
});
