import type { Sex } from "@/lib/types/common";

export interface TrimpInput {
  durationMinutes: number;
  restingHeartRate: number;
  maxHeartRate: number;
  averageHeartRate: number;
  sex: Sex;
}

// Banister exponential TRIMP (Banister, 1991). The 0.64/1.92 vs 0.86/1.67
// coefficients come from the differing blood-lactate response curves used
// to derive the original male/female weighting exponents.
export function computeTrimp(input: TrimpInput): number {
  const { durationMinutes, restingHeartRate, maxHeartRate, averageHeartRate, sex } = input;
  const hrReserveRatio =
    (averageHeartRate - restingHeartRate) / (maxHeartRate - restingHeartRate);
  const [coefficient, exponentFactor] = sex === "male" ? [0.64, 1.92] : [0.86, 1.67];
  return (
    durationMinutes * hrReserveRatio * coefficient * Math.exp(exponentFactor * hrReserveRatio)
  );
}
