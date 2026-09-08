import { XMLParser } from "fast-xml-parser";
import type { Activity } from "@/lib/types/activity";

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
  removeNSPrefix: true,
  parseTagValue: true,
  parseAttributeValue: true,
  isArray: (tagName) => tagName === "Activity" || tagName === "Lap",
});

interface TcxLap {
  "@_StartTime"?: string;
  TotalTimeSeconds?: number;
  DistanceMeters?: number;
  AverageHeartRateBpm?: { Value?: number };
}

interface TcxActivity {
  "@_Sport"?: string;
  Id?: string;
  Lap?: TcxLap[];
}

interface TcxDocument {
  TrainingCenterDatabase?: {
    Activities?: { Activity?: TcxActivity[] };
  };
}

export function parseTcx(xml: string): Omit<Activity, "id" | "source"> {
  const doc = parser.parse(xml) as TcxDocument;
  const activities = doc.TrainingCenterDatabase?.Activities?.Activity ?? [];
  if (activities.length === 0) throw new Error("TCX file has no activities");

  const activity = activities[0];
  const laps = activity.Lap ?? [];
  if (laps.length === 0) throw new Error("TCX activity has no laps");

  // Garmin devices produce multiple laps per activity from manual lap
  // presses — sum across all of them rather than reading only the first.
  let movingTimeSeconds = 0;
  let distanceMeters = 0;
  let weightedHrSum = 0;
  let weightedHrDuration = 0;

  for (const lap of laps) {
    const duration = lap.TotalTimeSeconds ?? 0;
    movingTimeSeconds += duration;
    distanceMeters += lap.DistanceMeters ?? 0;
    const avgHr = lap.AverageHeartRateBpm?.Value;
    if (typeof avgHr === "number" && duration > 0) {
      weightedHrSum += avgHr * duration;
      weightedHrDuration += duration;
    }
  }

  const averageHeartRate = weightedHrDuration > 0 ? weightedHrSum / weightedHrDuration : null;
  const startDate = laps[0]["@_StartTime"] ?? activity.Id ?? new Date().toISOString();
  const sport = activity["@_Sport"] ?? "Workout";

  return {
    name: `${sport} Activity`,
    type: sport,
    startDate,
    movingTimeSeconds,
    distanceMeters,
    averageHeartRate,
    averageWatts: null,
    rpe: null,
  };
}
