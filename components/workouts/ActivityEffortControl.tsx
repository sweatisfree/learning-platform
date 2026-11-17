"use client";

import { useState } from "react";
import { saveActivityEffort, deleteActivityEffort } from "@/lib/activities/effort";
import type { Activity, NonGpsModality } from "@/lib/types/activity";

// Borg CR10, whole points. The column stores one decimal so a half point
// entered elsewhere survives, but offering 21 options here would trade the
// speed this control exists for against a precision nobody reports reliably.
const EFFORT_OPTIONS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

const MODALITY_LABELS: Record<NonGpsModality, string> = {
  "non-gps": "General",
  strength: "Weights",
  isophit: "Isometric holds",
};

interface Props {
  activity: Activity;
  userId: string;
  // Load is recomputed from every activity at once, so the page reloads rather
  // than this control patching a number in place.
  onSaved: () => void;
}

export function ActivityEffortControl({ activity, userId, onSaved }: Props) {
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Manual entries carry an effort from creation and own it; there is nothing
  // here to add.
  if (activity.source === "manual") return null;

  async function persist(rpe: number | null, modality: NonGpsModality | null) {
    setError(null);
    setIsSaving(true);
    try {
      if (rpe == null) await deleteActivityEffort(activity.source, activity.id);
      else await saveActivityEffort(userId, { source: activity.source, activityId: activity.id, rpe, modality });
      onSaved();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Could not save.");
    } finally {
      setIsSaving(false);
    }
  }

  const selectClass =
    "rounded-[var(--radius-sm)] border border-border bg-background px-2 py-1 text-xs text-foreground disabled:opacity-50";

  return (
    <div className="mt-1.5 flex flex-wrap items-center gap-2">
      <label className="flex items-center gap-1.5 text-xs text-muted">
        <span>Effort</span>
        <select
          id={`effort-${activity.source}-${activity.id}`}
          className={selectClass}
          disabled={isSaving}
          value={activity.rpe ?? ""}
          onChange={(event) =>
            persist(event.target.value === "" ? null : Number(event.target.value), activity.modality ?? null)
          }
        >
          <option value="">Not rated</option>
          {EFFORT_OPTIONS.map((value) => (
            <option key={value} value={value}>
              {value}
            </option>
          ))}
        </select>
      </label>

      {/* Only meaningful once an effort exists, since the multiplier it picks
          is applied to the sRPE value and nothing else. */}
      {activity.rpe != null && (
        <label className="flex items-center gap-1.5 text-xs text-muted">
          <span className="sr-only">Session type</span>
          <select
            id={`modality-${activity.source}-${activity.id}`}
            className={selectClass}
            disabled={isSaving}
            value={activity.modality ?? "non-gps"}
            onChange={(event) => persist(activity.rpe, event.target.value as NonGpsModality)}
          >
            {(Object.keys(MODALITY_LABELS) as NonGpsModality[]).map((key) => (
              <option key={key} value={key}>
                {MODALITY_LABELS[key]}
              </option>
            ))}
          </select>
        </label>
      )}

      {isSaving && <span className="text-xs text-muted">Saving…</span>}
      {error && <span className="text-xs text-warning">{error}</span>}
    </div>
  );
}
