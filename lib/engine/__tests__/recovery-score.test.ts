import { describe, expect, it } from "vitest";
import type { AcuteChronicLoad, AutonomicRecoveryIndex } from "../loadCalculator";
import {
  AUTONOMIC_WEIGHT,
  LOAD_NEUTRAL_CEILING,
  LOAD_WEIGHT,
  LOAD_ZERO_FLOOR,
  RECOVERY_SCORE_FORMULA_VERSION,
  computeLoadComponent,
  computeRecoveryScore,
} from "../recovery-score";

function makeAutonomic(score: number | null): AutonomicRecoveryIndex {
  return {
    score,
    band: score == null ? null : "moderate",
    hrvDropSd: score == null ? null : 0,
    restingHrRiseSd: score == null ? null : 0,
    sleepDeficitSd: null,
    respiratoryRateRiseSd: null,
    coverage: {
      signalsUsed: score == null ? 0 : 2,
      signalsPresentToday: score == null ? 0 : 2,
      signalsShortOfBaseline: 0,
      minReadingsPerMetric: 7,
      insufficientData: score == null,
    },
  };
}

function makeLoad(overrides: Partial<AcuteChronicLoad> = {}): AcuteChronicLoad {
  return {
    acute: 100,
    chronic: 100,
    ratio: 1.0,
    coverage: {
      activityCount: 10,
      daysSpanned: 30,
      byMethod: { srpe: 0, trimp: 10, duration: 0 },
      usesEstimatedMaxHeartRate: false,
    },
    ...overrides,
  };
}

describe("computeLoadComponent", () => {
  it("applies no penalty at or below the neutral ceiling", () => {
    expect(computeLoadComponent(0.5)).toBe(100);
    expect(computeLoadComponent(1.0)).toBe(100);
    expect(computeLoadComponent(LOAD_NEUTRAL_CEILING)).toBe(100);
  });

  it("falls to zero at and beyond the floor", () => {
    expect(computeLoadComponent(LOAD_ZERO_FLOOR)).toBe(0);
    expect(computeLoadComponent(3.0)).toBe(0);
  });

  it("declines linearly between ceiling and floor", () => {
    const midpoint = (LOAD_NEUTRAL_CEILING + LOAD_ZERO_FLOOR) / 2;
    expect(computeLoadComponent(midpoint)).toBeCloseTo(50);
  });
});

describe("computeRecoveryScore", () => {
  it("stamps the formula version on every result", () => {
    const result = computeRecoveryScore({ autonomic: makeAutonomic(50), load: makeLoad() });
    expect(result.formulaVersion).toBe(RECOVERY_SCORE_FORMULA_VERSION);
  });

  it("combines both components at their documented weights", () => {
    const result = computeRecoveryScore({ autonomic: makeAutonomic(50), load: makeLoad() });
    // load ratio 1.0 -> component 100; autonomic 50
    expect(result.autonomic.weight).toBeCloseTo(AUTONOMIC_WEIGHT);
    expect(result.load.weight).toBeCloseTo(LOAD_WEIGHT);
    expect(result.score).toBeCloseTo(50 * AUTONOMIC_WEIGHT + 100 * LOAD_WEIGHT);
  });

  it("decomposes into contributions that sum to the score", () => {
    const result = computeRecoveryScore({ autonomic: makeAutonomic(70), load: makeLoad({ ratio: 1.65 }) });
    const summed = (result.autonomic.contribution ?? 0) + (result.load.contribution ?? 0);
    expect(summed).toBeCloseTo(result.score!);
  });

  it("treats a zero-chronic-base ratio as absent rather than as a low ratio", () => {
    const result = computeRecoveryScore({
      autonomic: makeAutonomic(80),
      load: makeLoad({
        chronic: 0,
        ratio: 0,
        coverage: {
          activityCount: 0,
          daysSpanned: 0,
          byMethod: { srpe: 0, trimp: 0, duration: 0 },
          usesEstimatedMaxHeartRate: false,
        },
      }),
    });
    expect(result.load.available).toBe(false);
    expect(result.score).toBeCloseTo(80);
  });

  it("gives the whole score to autonomic when there is no training history at all", () => {
    const result = computeRecoveryScore({
      autonomic: makeAutonomic(80),
      load: null,
    });
    expect(result.load.available).toBe(false);
    expect(result.autonomic.weight).toBeCloseTo(1);
    expect(result.score).toBeCloseTo(80);
  });

  it("gives the whole score to load when autonomic has no usable baseline", () => {
    const result = computeRecoveryScore({ autonomic: makeAutonomic(null), load: makeLoad() });
    expect(result.autonomic.available).toBe(false);
    expect(result.load.weight).toBeCloseTo(1);
    expect(result.score).toBeCloseTo(100);
  });

  it("returns null rather than a number when neither component is available", () => {
    const result = computeRecoveryScore({
      autonomic: makeAutonomic(null),
      load: null,
    });
    expect(result.score).toBeNull();
    expect(result.band).toBeNull();
    expect(result.insufficientData).toBe(true);
  });

  it("scores a heavy load spike below an equivalent unspiked week", () => {
    const calm = computeRecoveryScore({ autonomic: makeAutonomic(60), load: makeLoad({ ratio: 1.0 }) });
    const spiked = computeRecoveryScore({ autonomic: makeAutonomic(60), load: makeLoad({ ratio: 1.9 }) });
    expect(spiked.score!).toBeLessThan(calm.score!);
  });
});
