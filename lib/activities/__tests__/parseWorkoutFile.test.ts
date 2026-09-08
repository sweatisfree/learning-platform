import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { parseGpx } from "../parseGpx";
import { parseTcx } from "../parseTcx";

const SAMPLES_DIR = join(process.cwd(), "public", "sample-workouts");

function readSample(name: string): string {
  return readFileSync(join(SAMPLES_DIR, name), "utf-8");
}

describe("parseGpx — real sample files", () => {
  it("parses morning-run.gpx into sane fields", () => {
    const activity = parseGpx(readSample("morning-run.gpx"));
    expect(activity.name).toBe("Morning Run");
    expect(activity.type).toBe("running");
    expect(activity.startDate).toBe("2026-08-10T07:00:00Z");
    expect(activity.movingTimeSeconds).toBe(30 * 60);
    expect(activity.distanceMeters).toBeGreaterThan(3000);
    expect(activity.distanceMeters).toBeLessThan(7000);
    expect(activity.averageHeartRate).toBeGreaterThan(100);
    expect(activity.averageHeartRate).toBeLessThan(170);
    expect(activity.rpe).toBeNull();
  });

  it("parses easy-recovery-run.gpx with a distinctly lower heart rate", () => {
    const morning = parseGpx(readSample("morning-run.gpx"));
    const recovery = parseGpx(readSample("easy-recovery-run.gpx"));
    expect(recovery.movingTimeSeconds).toBe(18 * 60);
    expect(recovery.averageHeartRate).toBeGreaterThan(80);
    expect(recovery.averageHeartRate).toBeLessThan(120);
    expect(recovery.averageHeartRate).toBeLessThan(morning.averageHeartRate!);
  });
});

describe("parseTcx — real sample file", () => {
  it("sums across all laps rather than reading only the first", () => {
    const activity = parseTcx(readSample("interval-ride.tcx"));
    expect(activity.type).toBe("Biking");
    // 3 laps x 900s each
    expect(activity.movingTimeSeconds).toBe(2700);
    // 6000 + 7500 + 7000
    expect(activity.distanceMeters).toBeCloseTo(20500);
    // Time-weighted average across three equal-length laps (125+162+158)/3
    expect(activity.averageHeartRate).toBeCloseTo(148.33, 1);
  });
});

describe("parseGpx — synthetic edge cases", () => {
  it("includes points from every trkseg, not just the first", () => {
    const xml = `<?xml version="1.0"?>
<gpx><trk><name>Two Segments</name><type>running</type>
  <trkseg>
    <trkpt lat="10.0" lon="20.0"><time>2026-08-01T00:00:00Z</time></trkpt>
    <trkpt lat="10.1" lon="20.0"><time>2026-08-01T00:05:00Z</time></trkpt>
  </trkseg>
  <trkseg>
    <trkpt lat="10.2" lon="20.0"><time>2026-08-01T00:10:00Z</time></trkpt>
    <trkpt lat="10.3" lon="20.0"><time>2026-08-01T00:15:00Z</time></trkpt>
  </trkseg>
</trk></gpx>`;
    const activity = parseGpx(xml);
    // Elapsed time spans the first point of segment 1 to the last point of
    // segment 2 -> 15 minutes, not 5 (which is what a first-segment-only
    // parser would produce).
    expect(activity.movingTimeSeconds).toBe(15 * 60);
    expect(activity.distanceMeters).toBeGreaterThan(0);
  });

  it("matches heart-rate extensions regardless of namespace prefix", () => {
    const xml = `<?xml version="1.0"?>
<gpx><trk><name>Prefix Test</name><type>running</type>
  <trkseg>
    <trkpt lat="10.0" lon="20.0"><time>2026-08-01T00:00:00Z</time>
      <extensions><ns3:TrackPointExtension xmlns:ns3="http://example.com"><ns3:hr>140</ns3:hr></ns3:TrackPointExtension></extensions>
    </trkpt>
  </trkseg>
</trk></gpx>`;
    const activity = parseGpx(xml);
    expect(activity.averageHeartRate).toBe(140);
  });

  it("throws a clear error when the file has no track points", () => {
    const xml = `<?xml version="1.0"?><gpx><trk><name>Empty</name></trk></gpx>`;
    expect(() => parseGpx(xml)).toThrow(/track points/i);
  });
});

describe("parseTcx — synthetic edge cases", () => {
  it("throws a clear error when the file has no laps", () => {
    const xml = `<?xml version="1.0"?>
<TrainingCenterDatabase><Activities><Activity Sport="Running"><Id>x</Id></Activity></Activities></TrainingCenterDatabase>`;
    expect(() => parseTcx(xml)).toThrow(/laps/i);
  });

  it("throws a clear error when the file has no activities", () => {
    const xml = `<?xml version="1.0"?><TrainingCenterDatabase><Activities/></TrainingCenterDatabase>`;
    expect(() => parseTcx(xml)).toThrow(/activities/i);
  });
});
