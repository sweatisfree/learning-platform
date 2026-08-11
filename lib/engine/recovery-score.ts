export interface RecoveryScoreInput {
  hrv: number;
  restingHeartRate: number;
  sleepScore: number;
  acwr: number;
}

export interface RecoveryScore {
  score: number; // 0-100
  band: "low" | "moderate" | "high";
}

// Weighting HRV/sleep/ACWR against each other is a product decision, not a
// closed-form formula like ACWR/TRIMP/sRPE — deliberately not implemented yet.
export function computeRecoveryScore(_input: RecoveryScoreInput): RecoveryScore {
  throw new Error("computeRecoveryScore is not implemented yet");
}
