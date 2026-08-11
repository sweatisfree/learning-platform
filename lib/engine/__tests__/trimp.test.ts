import { describe, expect, it } from "vitest";
import { computeTrimp } from "../trimp";

describe("computeTrimp", () => {
  it("is zero when average HR equals resting HR", () => {
    const trimp = computeTrimp({
      durationMinutes: 60,
      restingHeartRate: 60,
      maxHeartRate: 190,
      averageHeartRate: 60,
      sex: "male",
    });
    expect(trimp).toBeCloseTo(0);
  });

  it("is zero for a zero-duration session", () => {
    const trimp = computeTrimp({
      durationMinutes: 0,
      restingHeartRate: 60,
      maxHeartRate: 190,
      averageHeartRate: 150,
      sex: "male",
    });
    expect(trimp).toBeCloseTo(0);
  });

  it("increases monotonically with average heart rate", () => {
    const base = { durationMinutes: 60, restingHeartRate: 60, maxHeartRate: 190, sex: "male" as const };
    const lower = computeTrimp({ ...base, averageHeartRate: 130 });
    const higher = computeTrimp({ ...base, averageHeartRate: 170 });
    expect(higher).toBeGreaterThan(lower);
  });

  it("falls in a sane range for a moderate-intensity hour-long session", () => {
    const trimp = computeTrimp({
      durationMinutes: 60,
      restingHeartRate: 60,
      maxHeartRate: 190,
      averageHeartRate: 150,
      sex: "male",
    });
    expect(trimp).toBeGreaterThan(80);
    expect(trimp).toBeLessThan(120);
  });

  it("uses different coefficients for male vs female", () => {
    const shared = {
      durationMinutes: 60,
      restingHeartRate: 60,
      maxHeartRate: 190,
      averageHeartRate: 150,
    };
    const male = computeTrimp({ ...shared, sex: "male" });
    const female = computeTrimp({ ...shared, sex: "female" });
    expect(male).not.toBeCloseTo(female, 5);
  });
});
