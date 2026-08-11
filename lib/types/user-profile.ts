import type { Sex } from "./common";

export interface UserProfile {
  id: string;
  email: string;
  displayName: string | null;
  sex: Sex | null;
  restingHeartRate: number | null;
  maxHeartRate: number | null;
  createdAt: string;
}
