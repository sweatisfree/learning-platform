"use client";

import { useState } from "react";
import { deleteHealthReading, type StoredHealthReading } from "@/lib/health/readings";

const VISIBLE_LIMIT = 30;

function formatMetrics(reading: StoredHealthReading): string {
  const parts: string[] = [];
  if (reading.restingHeartRate != null) parts.push(`RHR ${reading.restingHeartRate}`);
  if (reading.hrv != null) parts.push(`HRV ${reading.hrv}`);
  if (reading.sleepHours != null) parts.push(`sleep ${reading.sleepHours}h`);
  if (reading.respiratoryRate != null) parts.push(`resp ${reading.respiratoryRate}`);
  return parts.length > 0 ? parts.join(" · ") : "no values";
}

export function HealthReadingsList({
  readings,
  onDeleted,
}: {
  readings: StoredHealthReading[];
  onDeleted: () => void;
}) {
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleDelete(id: string) {
    setError(null);
    setDeletingId(id);
    try {
      await deleteHealthReading(id);
      setConfirmingId(null);
      onDeleted();
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "Could not delete that reading.");
    } finally {
      setDeletingId(null);
    }
  }

  if (readings.length === 0) {
    return <p className="text-sm text-muted">No readings stored yet.</p>;
  }

  // Newest first for the management view, while the engine consumes them
  // oldest-first — ordering is presentational here, not semantic.
  const newestFirst = [...readings].reverse();
  const visible = newestFirst.slice(0, VISIBLE_LIMIT);
  const hasWebhookRows = visible.some((reading) => reading.source === "webhook");

  return (
    <>
      <p className="mb-3 text-sm text-muted">
        Deleting a reading removes it from your baseline, so your recovery scores will change. Re-enter
        it below if you delete one by mistake.
      </p>

      <ul className="divide-y divide-border rounded-[var(--radius-sm)] border border-border">
        {visible.map((reading) => (
          <li key={reading.id} className="flex flex-wrap items-center justify-between gap-2 px-3 py-2.5">
            <div className="min-w-0">
              <p className="text-sm text-foreground">{reading.recordedDate}</p>
              <p className="text-xs text-muted">
                {formatMetrics(reading)}
                {reading.source === "webhook" && " · synced"}
              </p>
            </div>

            {confirmingId === reading.id ? (
              <span className="flex items-center gap-2 text-xs">
                <button
                  type="button"
                  className="cursor-pointer rounded-full border border-danger px-3 py-1 font-semibold text-danger hover:bg-danger/10 disabled:opacity-50"
                  onClick={() => handleDelete(reading.id)}
                  disabled={deletingId === reading.id}
                >
                  {deletingId === reading.id ? "Deleting…" : "Confirm"}
                </button>
                <button
                  type="button"
                  className="cursor-pointer text-muted hover:text-foreground"
                  onClick={() => setConfirmingId(null)}
                  disabled={deletingId === reading.id}
                >
                  Cancel
                </button>
              </span>
            ) : (
              <button
                type="button"
                className="cursor-pointer text-xs text-muted hover:text-danger"
                onClick={() => {
                  setError(null);
                  setConfirmingId(reading.id);
                }}
              >
                Delete
              </button>
            )}
          </li>
        ))}
      </ul>

      {newestFirst.length > VISIBLE_LIMIT && (
        <p className="mt-2 text-xs text-muted">
          Showing the {VISIBLE_LIMIT} most recent of {newestFirst.length} readings.
        </p>
      )}

      {hasWebhookRows && (
        <p className="mt-3 text-xs text-muted">
          Readings marked <strong className="text-foreground">synced</strong> came from your HealthKit
          export app. Deleting one here removes it now, but that app will re-send the same date on its
          next sync and the reading will come back. Entries you typed yourself stay deleted.
        </p>
      )}

      {error && <p className="mt-3 text-sm text-warning">{error}</p>}
    </>
  );
}
