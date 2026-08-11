import { describe, expect, it } from "vitest";
import { computeEwma } from "../ewma";

describe("computeEwma", () => {
  it("returns an empty series for empty input", () => {
    expect(computeEwma([], 7)).toEqual([]);
  });

  it("stays constant when the input is constant", () => {
    const result = computeEwma([100, 100, 100, 100, 100], 7);
    result.forEach((v) => expect(v).toBeCloseTo(100));
  });

  it("moves toward a step change without overshooting", () => {
    const result = computeEwma([0, 0, 0, 100, 100, 100, 100, 100], 7);
    for (let i = 1; i < result.length; i++) {
      expect(result[i]).toBeGreaterThanOrEqual(result[i - 1] - 1e-9);
    }
    expect(result[result.length - 1]).toBeLessThan(100);
    expect(result[result.length - 1]).toBeGreaterThan(0);
  });

  it("reacts faster with a shorter time constant", () => {
    const series = [0, 0, 0, 100, 100, 100, 100, 100];
    const fast = computeEwma(series, 3);
    const slow = computeEwma(series, 28);
    expect(fast[fast.length - 1]).toBeGreaterThan(slow[slow.length - 1]);
  });
});
