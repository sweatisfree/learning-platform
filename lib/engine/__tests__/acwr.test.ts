import { describe, expect, it } from "vitest";
import { computeAcwr } from "../acwr";

describe("computeAcwr", () => {
  it("returns zeros for an empty series", () => {
    expect(computeAcwr([])).toEqual({ acute: 0, chronic: 0, ratio: 0 });
  });

  it("resolves to a ratio of 1.0 for a constant training load", () => {
    const dailyLoad = Array(40).fill(300);
    const { ratio } = computeAcwr(dailyLoad);
    expect(ratio).toBeCloseTo(1.0, 5);
  });

  it("flags ratio > 1 after a sudden spike in acute load", () => {
    const baseline = Array(30).fill(200);
    const spike = Array(5).fill(600);
    const { ratio } = computeAcwr([...baseline, ...spike]);
    expect(ratio).toBeGreaterThan(1);
  });

  it("flags ratio < 1 after a sudden drop in acute load", () => {
    const baseline = Array(30).fill(500);
    const rest = Array(5).fill(50);
    const { ratio } = computeAcwr([...baseline, ...rest]);
    expect(ratio).toBeLessThan(1);
  });
});
