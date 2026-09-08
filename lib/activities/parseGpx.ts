import { XMLParser } from "fast-xml-parser";
import type { Activity } from "@/lib/types/activity";

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
  removeNSPrefix: true, // strips exporter-specific extension namespace prefixes (gpxtpx:, ns3:, ...)
  parseTagValue: true,
  parseAttributeValue: true,
  isArray: (tagName) => tagName === "trk" || tagName === "trkseg" || tagName === "trkpt",
});

interface GpxTrackPoint {
  "@_lat"?: number;
  "@_lon"?: number;
  time?: string;
  hr?: number; // some exporters put hr directly on trkpt, no extensions wrapper
  extensions?: {
    TrackPointExtension?: { hr?: number } | Array<{ hr?: number }>;
  };
}

interface GpxTrack {
  name?: string;
  type?: string;
  trkseg?: Array<{ trkpt?: GpxTrackPoint[] }>;
}

interface GpxDocument {
  gpx?: { trk?: GpxTrack[] };
}

function haversineMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const earthRadiusMeters = 6371000;
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * earthRadiusMeters * Math.asin(Math.sqrt(a));
}

function extractHr(point: GpxTrackPoint): number | null {
  if (typeof point.hr === "number") return point.hr;
  const tpe = point.extensions?.TrackPointExtension;
  if (!tpe) return null;
  const node = Array.isArray(tpe) ? tpe[0] : tpe;
  return typeof node?.hr === "number" ? node.hr : null;
}

export function parseGpx(xml: string): Omit<Activity, "id" | "source"> {
  const doc = parser.parse(xml) as GpxDocument;
  const tracks = doc.gpx?.trk ?? [];
  if (tracks.length === 0) throw new Error("GPX file has no tracks");

  const points: GpxTrackPoint[] = [];
  for (const track of tracks) {
    for (const segment of track.trkseg ?? []) {
      points.push(...(segment.trkpt ?? []));
    }
  }
  if (points.length === 0) throw new Error("GPX file has no track points");

  const startDate = points[0].time ?? new Date().toISOString();
  const endDate = points[points.length - 1].time ?? startDate;
  // Elapsed time between first/last trackpoint — an approximation of moving
  // time, since it doesn't exclude stopped/paused segments.
  const movingTimeSeconds = Math.max(
    0,
    (new Date(endDate).getTime() - new Date(startDate).getTime()) / 1000,
  );

  let distanceMeters = 0;
  for (let i = 1; i < points.length; i++) {
    const { "@_lat": lat1, "@_lon": lon1 } = points[i - 1];
    const { "@_lat": lat2, "@_lon": lon2 } = points[i];
    if (
      typeof lat1 === "number" &&
      typeof lon1 === "number" &&
      typeof lat2 === "number" &&
      typeof lon2 === "number"
    ) {
      distanceMeters += haversineMeters(lat1, lon1, lat2, lon2);
    }
  }

  const hrValues = points.map(extractHr).filter((v): v is number => v != null);
  const averageHeartRate =
    hrValues.length > 0 ? hrValues.reduce((sum, v) => sum + v, 0) / hrValues.length : null;

  return {
    name: tracks[0].name ?? "Workout",
    type: tracks[0].type ?? "Workout",
    startDate,
    movingTimeSeconds,
    distanceMeters,
    averageHeartRate,
    averageWatts: null,
    rpe: null,
  };
}
