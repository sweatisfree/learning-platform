import type { Sex } from "./common";
import type { MaxHeartRateSource } from "@/lib/engine/loadCalculator";

export interface UserProfile {
  id: string;
  email: string;
  displayName: string | null;
  sex: Sex | null;
  restingHeartRate: number | null;
  maxHeartRate: number | null;
  // How the max heart rate was arrived at. "estimated" means every TRIMP
  // value derived from it is partly an age formula, which the UI surfaces.
  maxHeartRateSource: MaxHeartRateSource | null;
  createdAt: string;
}

// The subset the athlete actually edits, and the shape the load engine needs.
export interface AthleteProfileFields {
  sex: Sex | null;
  restingHeartRate: number | null;
  maxHeartRate: number | null;
  maxHeartRateSource: MaxHeartRateSource | null;
}
