import type { Activity, ActivitySource, NonGpsModality } from "@/lib/types/activity";

export interface ActivityEffort {
  source: ActivitySource;
  activityId: string;
  rpe: number;
  modality: NonGpsModality | null;
}

export const RPE_MIN = 0;
export const RPE_MAX = 10;

/**
 * Attaches saved efforts to activities fetched from a provider.
 *
 * Activities are not stored — Strava is called live on each load — so the
 * rating and the session meet here, in memory, keyed by the provider's own id.
 *
 * An activity that already carries an RPE keeps it. Manual entries set theirs
 * at creation, and a stored effort for the same id would be the user rating
 * their own rating.
 *
 * Kept free of any Supabase import so it is testable on plain objects; the
 * queries live in ./effort.ts.
 */
export function applyEfforts(
  activities: readonly Activity[],
  efforts: readonly ActivityEffort[],
): Activity[] {
  if (efforts.length === 0) return [...activities];

  const byKey = new Map(efforts.map((effort) => [`${effort.source}:${effort.activityId}`, effort]));

  return activities.map((activity) => {
    if (activity.rpe != null) return activity;
    const effort = byKey.get(`${activity.source}:${activity.id}`);
    if (!effort) return activity;
    return { ...activity, rpe: effort.rpe, modality: effort.modality };
  });
}
