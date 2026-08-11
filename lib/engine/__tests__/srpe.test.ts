import { describe, expect, it } from "vitest";
import { computeSrpe } from "../srpe";

describe("computeSrpe", () => {
  it("multiplies RPE by duration", () => {
    expect(computeSrpe({ rpe: 7, durationMinutes: 45 })).toBe(315);
  });

  it("is zero for a zero-duration session", () => {
    expect(computeSrpe({ rpe: 8, durationMinutes: 0 })).toBe(0);
  });

  it("is zero for RPE 0", () => {
    expect(computeSrpe({ rpe: 0, durationMinutes: 60 })).toBe(0);
  });
});
