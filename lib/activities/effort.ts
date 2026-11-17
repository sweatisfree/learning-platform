import { supabase } from "@/lib/supabase/client";
import { RPE_MAX, RPE_MIN, type ActivityEffort } from "@/lib/activities/applyEfforts";
import type { ActivitySource, NonGpsModality } from "@/lib/types/activity";

export { applyEfforts, RPE_MIN, RPE_MAX, type ActivityEffort } from "@/lib/activities/applyEfforts";

// Read and written directly under RLS rather than through an API route: the
// owner policies in migration 0009 scope every operation to the caller's own
// rows, and there is no server-side side effect to coordinate. Same reasoning
// as deleteHealthReading; contrast strava_connections, which holds credentials
// and therefore carries no policies at all.
export async function fetchActivityEfforts(): Promise<ActivityEffort[]> {
  const { data, error } = await supabase
    .from("activity_effort")
    .select("source, activity_id, rpe, modality");
  if (error) throw new Error(error.message);

  return (data ?? []).map((row) => ({
    source: row.source as ActivitySource,
    activityId: row.activity_id as string,
    rpe: Number(row.rpe),
    modality: (row.modality ?? null) as NonGpsModality | null,
  }));
}

export async function saveActivityEffort(userId: string, effort: ActivityEffort): Promise<void> {
  if (!Number.isFinite(effort.rpe) || effort.rpe < RPE_MIN || effort.rpe > RPE_MAX) {
    throw new Error(`Effort must be between ${RPE_MIN} and ${RPE_MAX}.`);
  }
  const { error } = await supabase.from("activity_effort").upsert(
    {
      user_id: userId,
      source: effort.source,
      activity_id: effort.activityId,
      rpe: effort.rpe,
      modality: effort.modality,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id,source,activity_id" },
  );
  if (error) throw new Error(error.message);
}

export async function deleteActivityEffort(
  source: ActivitySource,
  activityId: string,
): Promise<void> {
  const { error } = await supabase
    .from("activity_effort")
    .delete()
    .eq("source", source)
    .eq("activity_id", activityId);
  if (error) throw new Error(error.message);
}
