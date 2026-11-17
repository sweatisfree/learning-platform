import { describe, it, expect } from "vitest";
import { applyEfforts, type ActivityEffort } from "@/lib/activities/applyEfforts";
import { computeActivityLoad } from "@/lib/engine/loadCalculator";
import type { Activity } from "@/lib/types/activity";

function activity(partial: Partial<Activity> & { id: string }): Activity {
  return {
    source: "strava",
    name: "Session",
    type: "WeightTraining",
    startDate: "2026-11-17T08:00:00Z",
    movingTimeSeconds: 3600,
    distanceMeters: 0,
    averageHeartRate: null,
    averageWatts: null,
    rpe: null,
    ...partial,
  };
}

const effort = (partial: Partial<ActivityEffort> & { activityId: string }): ActivityEffort => ({
  source: "strava",
  rpe: 8,
  modality: "strength",
  ...partial,
});

describe("applyEfforts", () => {
  it("attaches a saved rating to the matching activity", () => {
    const [result] = applyEfforts([activity({ id: "123" })], [effort({ activityId: "123" })]);

    expect(result.rpe).toBe(8);
    expect(result.modality).toBe("strength");
  });

  it("leaves an activity with no saved rating untouched", () => {
    const [result] = applyEfforts([activity({ id: "123" })], [effort({ activityId: "999" })]);

    expect(result.rpe).toBeNull();
  });

  it("matches on source as well as id, since ids only repeat across providers", () => {
    const [result] = applyEfforts(
      [activity({ id: "123", source: "strava" })],
      [effort({ activityId: "123", source: "file" })],
    );

    expect(result.rpe).toBeNull();
  });

  // Manual entries carry an RPE from creation. A stored effort for the same id
  // would be the user rating their own rating.
  it("never overwrites an RPE the activity already has", () => {
    const [result] = applyEfforts(
      [activity({ id: "123", source: "manual", rpe: 5 })],
      [effort({ activityId: "123", source: "manual", rpe: 9 })],
    );

    expect(result.rpe).toBe(5);
  });

  it("returns activities unchanged when nothing is stored", () => {
    const activities = [activity({ id: "1" }), activity({ id: "2" })];

    expect(applyEfforts(activities, [])).toEqual(activities);
  });
});

// The point of the feature: a rated lift must stop scoring as bare minutes.
describe("effect on training load", () => {
  const lift = activity({ id: "123", movingTimeSeconds: 3600 });

  it("falls back to duration while the session is unrated", () => {
    const load = computeActivityLoad(lift);

    expect(load.method).toBe("duration");
    expect(load.value).toBe(60);
  });

  it("scores by sRPE once rated, and well above the duration fallback", () => {
    const [rated] = applyEfforts([lift], [effort({ activityId: "123", rpe: 8 })]);
    const load = computeActivityLoad(rated);

    expect(load.method).toBe("srpe");
    expect(load.value).toBe(480); // 8 x 60 minutes x 1.0 for strength
    expect(load.value).toBeGreaterThan(60);
  });

  // The 1.2x documented on /transparency could not be reached before, because
  // computeActivityLoad hardcoded the non-GPS modality for every rated session.
  it("applies the ISOPHIT multiplier when the session is categorised as one", () => {
    const [isophit] = applyEfforts(
      [lift],
      [effort({ activityId: "123", rpe: 8, modality: "isophit" })],
    );
    const [strength] = applyEfforts(
      [lift],
      [effort({ activityId: "123", rpe: 8, modality: "strength" })],
    );

    expect(computeActivityLoad(isophit).value).toBeCloseTo(576, 6); // 480 x 1.2
    expect(computeActivityLoad(isophit).value).toBeGreaterThan(
      computeActivityLoad(strength).value,
    );
  });

  it("treats an uncategorised rating as generic non-GPS work, as before", () => {
    const [rated] = applyEfforts([lift], [effort({ activityId: "123", rpe: 8, modality: null })]);

    expect(computeActivityLoad(rated).value).toBe(480);
  });

  // An hour of hard lifting and an hour of easy anything scored identically
  // until the session could be rated. That was the whole problem.
  it("separates a hard hour from an easy hour of the same length", () => {
    const hard = applyEfforts([lift], [effort({ activityId: "123", rpe: 9 })])[0];
    const easy = applyEfforts([lift], [effort({ activityId: "123", rpe: 3 })])[0];

    expect(computeActivityLoad(hard).value).toBeGreaterThan(computeActivityLoad(easy).value);
  });
});
