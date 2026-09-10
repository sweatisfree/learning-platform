import type { AcuteChronicLoad, AutonomicRecoveryIndex } from "./loadCalculator";
import { bandForScore } from "./loadCalculator";

// ---------------------------------------------------------------------------
// Composite readiness score.
//
// Unlike ACWR, TRIMP and sRPE, this is NOT a closed-form formula from the
// literature — weighting autonomic recovery against training load is a product
// decision. It is therefore versioned and published on /transparency rather
// than shipped as a proprietary index. If you change a constant here, bump
// RECOVERY_SCORE_FORMULA_VERSION and update that page in the same commit.
// ---------------------------------------------------------------------------

export const RECOVERY_SCORE_FORMULA_VERSION = "1.0.0";

export const AUTONOMIC_WEIGHT = 0.6;
export const LOAD_WEIGHT = 0.4;

// Readiness-to-train reading of ACWR: an acute:chronic ratio at or below the
// ceiling carries no fatigue penalty (a low ratio means fresh legs, which is
// not a readiness problem even if it is a fitness one). Above it, readiness
// falls linearly to zero at the floor.
export const LOAD_NEUTRAL_CEILING = 1.3;
export const LOAD_ZERO_FLOOR = 2.0;

export interface RecoveryScoreInput {
  autonomic: AutonomicRecoveryIndex;
  // null when there is no training history at all. Deliberately not a zeroed
  // AcuteChronicLoad — an absent ratio and a ratio of zero are different claims.
  load: AcuteChronicLoad | null;
}

export interface RecoveryScoreComponent {
  available: boolean;
  value: number | null; // 0-100 before weighting
  weight: number; // effective weight after renormalising over available components
  contribution: number | null; // points this component added to the final score
}

export interface RecoveryScore {
  score: number | null; // 0-100, or null when neither component is available
  band: "low" | "moderate" | "high" | null;
  formulaVersion: string;
  autonomic: RecoveryScoreComponent;
  load: RecoveryScoreComponent;
  insufficientData: boolean;
}

// ACWR -> 0-100 readiness contribution.
export function computeLoadComponent(ratio: number): number {
  if (ratio <= LOAD_NEUTRAL_CEILING) return 100;
  if (ratio >= LOAD_ZERO_FLOOR) return 0;
  const spanAboveCeiling = ratio - LOAD_NEUTRAL_CEILING;
  const penaltyRange = LOAD_ZERO_FLOOR - LOAD_NEUTRAL_CEILING;
  return 100 * (1 - spanAboveCeiling / penaltyRange);
}

function unavailable(weight: number): RecoveryScoreComponent {
  return { available: false, value: null, weight, contribution: null };
}

export function computeRecoveryScore(input: RecoveryScoreInput): RecoveryScore {
  const { autonomic, load } = input;

  const autonomicValue = autonomic.score;
  // A ratio computed with no activities, or against a zero chronic base, is
  // not a low ratio — it is an absent one.
  const loadAvailable = load != null && load.coverage.activityCount > 0 && load.chronic > 0;
  const loadValue = loadAvailable ? computeLoadComponent(load.ratio) : null;

  // Whichever components are available carry the whole score between them.
  const totalWeight =
    (autonomicValue != null ? AUTONOMIC_WEIGHT : 0) + (loadValue != null ? LOAD_WEIGHT : 0);

  if (totalWeight === 0) {
    return {
      score: null,
      band: null,
      formulaVersion: RECOVERY_SCORE_FORMULA_VERSION,
      autonomic: unavailable(0),
      load: unavailable(0),
      insufficientData: true,
    };
  }

  const autonomicWeight = autonomicValue != null ? AUTONOMIC_WEIGHT / totalWeight : 0;
  const loadEffectiveWeight = loadValue != null ? LOAD_WEIGHT / totalWeight : 0;

  const autonomicContribution = autonomicValue != null ? autonomicValue * autonomicWeight : null;
  const loadContribution = loadValue != null ? loadValue * loadEffectiveWeight : null;

  const score = (autonomicContribution ?? 0) + (loadContribution ?? 0);

  return {
    score,
    band: bandForScore(score),
    formulaVersion: RECOVERY_SCORE_FORMULA_VERSION,
    autonomic:
      autonomicValue != null
        ? {
            available: true,
            value: autonomicValue,
            weight: autonomicWeight,
            contribution: autonomicContribution,
          }
        : unavailable(0),
    load:
      loadValue != null
        ? {
            available: true,
            value: loadValue,
            weight: loadEffectiveWeight,
            contribution: loadContribution,
          }
        : unavailable(0),
    insufficientData: false,
  };
}
