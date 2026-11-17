import { describe, it, expect } from "vitest";
import {
  collapseReadingsByDate,
  DEFAULT_SOURCE_PRIORITY,
  type DatedReading,
} from "@/lib/health/collapseReadings";
import type { HealthReadingSource } from "@/lib/types/health-reading";

function reading(partial: Partial<DatedReading> & { recordedDate: string }): DatedReading {
  return { source: "webhook", ...partial };
}

describe("collapseReadingsByDate", () => {
  it("passes through one row per date unchanged", () => {
    const result = collapseReadingsByDate([
      reading({ recordedDate: "2026-11-01", restingHeartRate: 52 }),
      reading({ recordedDate: "2026-11-02", restingHeartRate: 54 }),
    ]);

    expect(result).toHaveLength(2);
    expect(result.map((r) => r.restingHeartRate)).toEqual([52, 54]);
  });

  // The defect this module exists to fix: health_readings is unique on
  // (user_id, recorded_date, source), so these two rows are both legal, and
  // the old code handed the engine both as separate days.
  it("counts a date once when a webhook and a manual row share it", () => {
    const result = collapseReadingsByDate([
      reading({ recordedDate: "2026-11-01", source: "webhook", restingHeartRate: 52 }),
      reading({ recordedDate: "2026-11-01", source: "manual", restingHeartRate: 60 }),
    ]);

    expect(result).toHaveLength(1);
    expect(result[0].restingHeartRate).toBe(52);
  });

  it("never averages two sources", () => {
    const result = collapseReadingsByDate([
      reading({ recordedDate: "2026-11-01", source: "webhook", hrv: 40 }),
      reading({ recordedDate: "2026-11-01", source: "manual", hrv: 80 }),
    ]);

    expect(result[0].hrv).toBe(40);
    expect(result[0].hrv).not.toBe(60);
  });

  it("prefers an automated source over hand entry", () => {
    const result = collapseReadingsByDate([
      reading({ recordedDate: "2026-11-01", source: "manual", restingHeartRate: 60 }),
      reading({ recordedDate: "2026-11-01", source: "whoop", restingHeartRate: 51 }),
    ]);

    expect(result[0].restingHeartRate).toBe(51);
  });

  it("fills a metric from a lower-priority source when the preferred one lacks it", () => {
    const result = collapseReadingsByDate([
      reading({ recordedDate: "2026-11-01", source: "whoop", restingHeartRate: 51 }),
      reading({ recordedDate: "2026-11-01", source: "manual", sleepHours: 7.5, hrv: 44 }),
    ]);

    // Taken per metric, so a gap in the preferred source does not black out the day.
    expect(result[0].restingHeartRate).toBe(51);
    expect(result[0].hrv).toBe(44);
    expect(result[0].sleepHours).toBe(7.5);
  });

  it("carries the HRV method of whichever row supplied the HRV", () => {
    const result = collapseReadingsByDate([
      reading({ recordedDate: "2026-11-01", source: "whoop", restingHeartRate: 51 }),
      reading({ recordedDate: "2026-11-01", source: "webhook", hrv: 38, hrvMethod: "sdnn" }),
    ]);

    expect(result[0].hrv).toBe(38);
    expect(result[0].hrvMethod).toBe("sdnn");
  });

  it("reports no HRV method when no row supplied HRV", () => {
    const result = collapseReadingsByDate([
      reading({ recordedDate: "2026-11-01", restingHeartRate: 52, hrvMethod: "sdnn" }),
    ]);

    expect(result[0].hrv).toBeUndefined();
    expect(result[0].hrvMethod).toBeNull();
  });

  it("drops a date whose rows carry no signal at all", () => {
    const result = collapseReadingsByDate([
      reading({ recordedDate: "2026-11-01", source: "webhook" }),
      reading({ recordedDate: "2026-11-02", restingHeartRate: 52 }),
    ]);

    expect(result).toHaveLength(1);
    expect(result[0].recordedDate).toBe("2026-11-02");
  });

  it("preserves date order, because the engine treats the last entry as today", () => {
    const result = collapseReadingsByDate([
      reading({ recordedDate: "2026-11-01", restingHeartRate: 52 }),
      reading({ recordedDate: "2026-11-02", source: "manual", restingHeartRate: 53 }),
      reading({ recordedDate: "2026-11-02", source: "webhook", restingHeartRate: 55 }),
      reading({ recordedDate: "2026-11-03", restingHeartRate: 54 }),
    ]);

    expect(result.map((r) => r.recordedDate)).toEqual(["2026-11-01", "2026-11-02", "2026-11-03"]);
    expect(result[1].restingHeartRate).toBe(55);
  });

  // The seven-reading threshold is counted on what comes out of here, so a
  // duplicated date used to let scoring start a day early on a thinner baseline.
  it("does not reach seven readings until seven distinct dates exist", () => {
    const rows: DatedReading[] = [];
    for (let day = 1; day <= 6; day += 1) {
      const date = `2026-11-0${day}`;
      rows.push(reading({ recordedDate: date, source: "webhook", restingHeartRate: 50 + day }));
      rows.push(reading({ recordedDate: date, source: "manual", restingHeartRate: 60 + day }));
    }

    expect(rows).toHaveLength(12);
    expect(collapseReadingsByDate(rows)).toHaveLength(6);
  });

  it("keeps an unknown source usable, but loses ties to known ones", () => {
    // Deliberately outside HealthReadingSource: a row written by a provider
    // added to the database before the union was widened to match.
    const polar = "polar" as HealthReadingSource;
    const result = collapseReadingsByDate([
      reading({ recordedDate: "2026-11-01", source: polar, restingHeartRate: 49 }),
      reading({ recordedDate: "2026-11-01", source: "manual", restingHeartRate: 60 }),
      reading({ recordedDate: "2026-11-02", source: polar, restingHeartRate: 48 }),
    ]);

    expect(result[0].restingHeartRate).toBe(60);
    // Still used where nothing else competes, rather than silently discarded.
    expect(result[1].restingHeartRate).toBe(48);
  });

  it("honours an explicit priority over the default", () => {
    const rows = [
      reading({ recordedDate: "2026-11-01", source: "webhook", restingHeartRate: 52 }),
      reading({ recordedDate: "2026-11-01", source: "manual", restingHeartRate: 60 }),
    ];

    expect(collapseReadingsByDate(rows)[0].restingHeartRate).toBe(52);
    expect(collapseReadingsByDate(rows, ["manual", "webhook"])[0].restingHeartRate).toBe(60);
  });

  it("ranks hand entry last by default", () => {
    expect(DEFAULT_SOURCE_PRIORITY[DEFAULT_SOURCE_PRIORITY.length - 1]).toBe("manual");
  });

  it("returns nothing for no input", () => {
    expect(collapseReadingsByDate([])).toEqual([]);
  });
});
