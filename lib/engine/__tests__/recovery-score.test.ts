import { describe, expect, it } from "vitest";
import { computeRecoveryScore } from "../recovery-score";

describe("computeRecoveryScore", () => {
  it("is not implemented yet", () => {
    expect(() =>
      computeRecoveryScore({ hrv: 50, restingHeartRate: 55, sleepScore: 80, acwr: 1.1 }),
    ).toThrow();
  });
});
