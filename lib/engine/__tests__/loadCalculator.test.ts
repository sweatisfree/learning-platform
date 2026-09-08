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

describe("computeActivityLoad", () => {
  it("falls back to moving-time minutes when there is no heart-rate or RPE data", () => {
    const activity = makeActivity({ movingTimeSeconds: 1800, averageHeartRate: null });
    expect(computeActivityLoad(activity)).toBe(30);
  });

  it("falls back to moving-time minutes when heart-rate data is present but no profile is supplied", () => {
    const activity = makeActivity({ movingTimeSeconds: 1800, averageHeartRate: 150 });
    expect(computeActivityLoad(activity)).toBe(30);
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
    expect(computeActivityLoad(activity, options)).toBeCloseTo(expected);
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
    expect(computeActivityLoad(activity, options)).toBeCloseTo(expected);
  });

  it("prefers RPE over TRIMP even when a full HR profile is also available", () => {
    const withRpeOnly = computeActivityLoad(
      makeActivity({ movingTimeSeconds: 1800, averageHeartRate: null, rpe: 6 }),
    );
    const withRpeAndHr = computeActivityLoad(
      makeActivity({ movingTimeSeconds: 1800, averageHeartRate: 150, rpe: 6 }),
      { restingHeartRate: 60, maxHeartRate: 190, sex: "male" },
    );
    expect(withRpeAndHr).toBeCloseTo(withRpeOnly);
  });
});

describe("computeAcuteChronicLoad", () => {
  it("returns zeros for no activities", () => {
    expect(computeAcuteChronicLoad([])).toEqual({ acute: 0, chronic: 0, ratio: 0 });
  });

  it("resolves to ratio 1.0 for a single activity", () => {
    const { ratio } = computeAcuteChronicLoad([makeActivity()]);
    expect(ratio).toBeCloseTo(1.0);
  });

  it("sums same-day activities before running EWMA", () => {
    const activities = [
      makeActivity({ id: "1", movingTimeSeconds: 1800, startDate: "2024-06-01T07:00:00Z" }),
      makeActivity({ id: "2", movingTimeSeconds: 1800, startDate: "2024-06-01T18:00:00Z" }),
    ];
    const { acute, chronic } = computeAcuteChronicLoad(activities);
    // Single calendar day in the series -> EWMA seeds on (and stays at) the summed value.
    expect(acute).toBeCloseTo(60);
    expect(chronic).toBeCloseTo(60);
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
    const stravaOnlyLoad = computeActivityLoad(activities[0]);
    const manualLoad = computeActivityLoad(activities[1]);
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
    const { ratio } = computeAcuteChronicLoad(activities);
    expect(ratio).toBeCloseTo(1.0, 5);
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
  it("computes mean and sample standard deviation", () => {
    const baseline = computeAutonomicBaseline([
      { restingHeartRate: 48, hrv: 60 },
      { restingHeartRate: 50, hrv: 60 },
      { restingHeartRate: 52, hrv: 60 },
    ]);
    expect(baseline.meanRestingHeartRate).toBeCloseTo(50);
    expect(baseline.stdDevRestingHeartRate).toBeCloseTo(2);
    expect(baseline.meanHrv).toBeCloseTo(60);
    expect(baseline.stdDevHrv).toBeCloseTo(0);
  });

  it("returns zero standard deviation for a single reading", () => {
    const baseline = computeAutonomicBaseline([{ restingHeartRate: 50, hrv: 60 }]);
    expect(baseline.stdDevRestingHeartRate).toBe(0);
    expect(baseline.stdDevHrv).toBe(0);
  });

  it("returns null mean/stddev for a metric with no readings at all", () => {
    const baseline = computeAutonomicBaseline([{ restingHeartRate: 50, hrv: 60 }]);
    expect(baseline.meanSleepHours).toBeNull();
    expect(baseline.stdDevSleepHours).toBeNull();
    expect(baseline.meanRespiratoryRate).toBeNull();
    expect(baseline.stdDevRespiratoryRate).toBeNull();
  });

  it("computes each metric independently when readings only partially overlap", () => {
    const baseline = computeAutonomicBaseline([
      { restingHeartRate: 50 }, // no hrv/sleep this day
      { hrv: 60, sleepHours: 7 }, // no restingHeartRate this day
      { restingHeartRate: 52, hrv: 62, sleepHours: 8 },
    ]);
    // restingHeartRate present on 2 of 3 days -> baseline from those 2
    expect(baseline.meanRestingHeartRate).toBeCloseTo(51);
    // sleepHours present on 2 of 3 days -> baseline from those 2
    expect(baseline.meanSleepHours).toBeCloseTo(7.5);
    expect(baseline.meanRespiratoryRate).toBeNull();
  });
});

describe("computeAutonomicRecoveryIndex", () => {
  const baseline = {
    meanRestingHeartRate: 50,
    stdDevRestingHeartRate: 2,
    meanHrv: 60,
    stdDevHrv: 5,
    meanSleepHours: null,
    stdDevSleepHours: null,
    meanRespiratoryRate: null,
    stdDevRespiratoryRate: null,
  };

  it("scores exactly at the midpoint when today matches baseline (HRV+RHR only, backward compatible)", () => {
    const result = computeAutonomicRecoveryIndex({ restingHeartRate: 50, hrv: 60 }, baseline);
    expect(result.hrvDropSd).toBeCloseTo(0);
    expect(result.restingHrRiseSd).toBeCloseTo(0);
    expect(result.score).toBeCloseTo(50);
    expect(result.band).toBe("moderate");
    expect(result.signalsUsed).toBe(2);
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
    const flatBaseline = {
      meanRestingHeartRate: 50,
      stdDevRestingHeartRate: 0,
      meanHrv: 60,
      stdDevHrv: 0,
      meanSleepHours: null,
      stdDevSleepHours: null,
      meanRespiratoryRate: null,
      stdDevRespiratoryRate: null,
    };
    const result = computeAutonomicRecoveryIndex({ restingHeartRate: 55, hrv: 40 }, flatBaseline);
    expect(Number.isFinite(result.score)).toBe(true);
    expect(result.hrvDropSd).toBe(0);
    expect(result.restingHrRiseSd).toBe(0);
  });

  it("returns null for sleep/respiratory z-scores when baseline has no data for them", () => {
    const result = computeAutonomicRecoveryIndex({ restingHeartRate: 50, hrv: 60, sleepHours: 8 }, baseline);
    expect(result.sleepDeficitSd).toBeNull();
    expect(result.respiratoryRateRiseSd).toBeNull();
    expect(result.signalsUsed).toBe(2); // sleep didn't count, no baseline for it
  });

  it("uses all four signals when all are present in both today and the baseline", () => {
    const fullBaseline = {
      meanRestingHeartRate: 50,
      stdDevRestingHeartRate: 2,
      meanHrv: 60,
      stdDevHrv: 5,
      meanSleepHours: 7.5,
      stdDevSleepHours: 1,
      meanRespiratoryRate: 14,
      stdDevRespiratoryRate: 1,
    };
    const result = computeAutonomicRecoveryIndex(
      { restingHeartRate: 50, hrv: 60, sleepHours: 7.5, respiratoryRate: 14 },
      fullBaseline,
    );
    expect(result.signalsUsed).toBe(4);
    expect(result.sleepDeficitSd).toBeCloseTo(0);
    expect(result.respiratoryRateRiseSd).toBeCloseTo(0);
    expect(result.score).toBeCloseTo(50);
  });

  it("scores a sleep deficit as reduced recovery, same direction as an HRV drop", () => {
    const sleepBaseline = {
      meanRestingHeartRate: null,
      stdDevRestingHeartRate: null,
      meanHrv: null,
      stdDevHrv: null,
      meanSleepHours: 8,
      stdDevSleepHours: 1,
      meanRespiratoryRate: null,
      stdDevRespiratoryRate: null,
    };
    const result = computeAutonomicRecoveryIndex({ sleepHours: 6 }, sleepBaseline);
    expect(result.signalsUsed).toBe(1);
    expect(result.sleepDeficitSd).toBeCloseTo(2); // 2 hours short, 1 SD wide -> 2 SD deficit
    expect(result.score).toBeLessThan(50);
  });

  it("defaults to a neutral midpoint when no signals are available at all", () => {
    const emptyBaseline = {
      meanRestingHeartRate: null,
      stdDevRestingHeartRate: null,
      meanHrv: null,
      stdDevHrv: null,
      meanSleepHours: null,
      stdDevSleepHours: null,
      meanRespiratoryRate: null,
      stdDevRespiratoryRate: null,
    };
    const result = computeAutonomicRecoveryIndex({}, emptyBaseline);
    expect(result.signalsUsed).toBe(0);
    expect(result.score).toBeCloseTo(50);
    expect(result.band).toBe("moderate");
  });
});
