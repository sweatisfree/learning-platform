import { describe, expect, it } from "vitest";
import { parseHealthAutoExportPayload } from "../parseHealthAutoExportPayload";

describe("parseHealthAutoExportPayload", () => {
  it("extracts resting HR and HRV per date", () => {
    const payload = {
      data: {
        metrics: [
          {
            name: "resting_heart_rate",
            data: [{ date: "2026-08-20 00:00:00 -0500", qty: 54 }],
          },
          {
            name: "heart_rate_variability",
            data: [{ date: "2026-08-20 00:00:00 -0500", qty: 62.5 }],
          },
        ],
      },
    };
    expect(parseHealthAutoExportPayload(payload)).toEqual([
      { recordedDate: "2026-08-20", restingHeartRate: 54, hrv: 62.5, sleepHours: null, respiratoryRate: null },
    ]);
  });

  it("averages multiple same-day samples instead of last-write-wins", () => {
    const payload = {
      data: {
        metrics: [
          {
            name: "heart_rate_variability",
            data: [
              { date: "2026-08-20 08:00:00 -0500", qty: 60 },
              { date: "2026-08-20 20:00:00 -0500", qty: 80 },
            ],
          },
        ],
      },
    };
    const result = parseHealthAutoExportPayload(payload);
    expect(result).toEqual([
      { recordedDate: "2026-08-20", restingHeartRate: null, hrv: 70, sleepHours: null, respiratoryRate: null },
    ]);
  });

  it("groups readings across multiple dates separately", () => {
    const payload = {
      data: {
        metrics: [
          {
            name: "resting_heart_rate",
            data: [
              { date: "2026-08-19 00:00:00 -0500", qty: 50 },
              { date: "2026-08-20 00:00:00 -0500", qty: 52 },
            ],
          },
        ],
      },
    };
    const result = parseHealthAutoExportPayload(payload);
    expect(result).toHaveLength(2);
    expect(result.find((r) => r.recordedDate === "2026-08-19")?.restingHeartRate).toBe(50);
    expect(result.find((r) => r.recordedDate === "2026-08-20")?.restingHeartRate).toBe(52);
  });

  it("is case/spacing tolerant of metric names", () => {
    const payload = {
      data: {
        metrics: [
          {
            name: "Resting Heart Rate",
            data: [{ date: "2026-08-20 00:00:00 -0500", qty: 55 }],
          },
        ],
      },
    };
    expect(parseHealthAutoExportPayload(payload)[0].restingHeartRate).toBe(55);
  });

  it("ignores unrecognized metrics", () => {
    const payload = {
      data: {
        metrics: [
          {
            name: "step_count",
            data: [{ date: "2026-08-20 00:00:00 -0500", qty: 8000 }],
          },
        ],
      },
    };
    expect(parseHealthAutoExportPayload(payload)).toEqual([]);
  });

  it("returns an empty array for a malformed/empty payload", () => {
    expect(parseHealthAutoExportPayload({})).toEqual([]);
    expect(parseHealthAutoExportPayload(null)).toEqual([]);
    expect(parseHealthAutoExportPayload(undefined)).toEqual([]);
  });

  it("extracts respiratory rate using the same {qty, date} shape as resting HR", () => {
    const payload = {
      data: {
        metrics: [
          {
            name: "respiratory_rate",
            data: [{ date: "2026-08-20 00:00:00 -0500", qty: 14.2 }],
          },
        ],
      },
    };
    expect(parseHealthAutoExportPayload(payload)[0].respiratoryRate).toBeCloseTo(14.2);
  });

  it("extracts sleep hours from sleep_analysis using the 'asleep' field, not totalSleep", () => {
    const payload = {
      data: {
        metrics: [
          {
            name: "sleep_analysis",
            data: [
              {
                date: "2026-08-20",
                totalSleep: 7.5,
                asleep: 7.0,
                core: 3.5,
                deep: 1.5,
                rem: 2.0,
              },
            ],
          },
        ],
      },
    };
    const result = parseHealthAutoExportPayload(payload);
    expect(result[0].sleepHours).toBeCloseTo(7.0);
  });

  it("averages sleep_analysis across multiple same-day entries", () => {
    const payload = {
      data: {
        metrics: [
          {
            name: "sleep_analysis",
            data: [
              { date: "2026-08-20", asleep: 6.0 },
              { date: "2026-08-20", asleep: 8.0 },
            ],
          },
        ],
      },
    };
    expect(parseHealthAutoExportPayload(payload)[0].sleepHours).toBeCloseTo(7.0);
  });

  it("combines resting HR, HRV, sleep, and respiratory rate for the same date into one reading", () => {
    const payload = {
      data: {
        metrics: [
          { name: "resting_heart_rate", data: [{ date: "2026-08-20 00:00:00 -0500", qty: 54 }] },
          { name: "heart_rate_variability", data: [{ date: "2026-08-20 00:00:00 -0500", qty: 62 }] },
          { name: "respiratory_rate", data: [{ date: "2026-08-20 00:00:00 -0500", qty: 14 }] },
          { name: "sleep_analysis", data: [{ date: "2026-08-20", asleep: 7.5 }] },
        ],
      },
    };
    const result = parseHealthAutoExportPayload(payload);
    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({
      recordedDate: "2026-08-20",
      restingHeartRate: 54,
      hrv: 62,
      sleepHours: 7.5,
      respiratoryRate: 14,
    });
  });
});
