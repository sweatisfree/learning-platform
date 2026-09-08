"use client";

import { useState, type FormEvent } from "react";
import type { Activity } from "@/lib/types/activity";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

function todayDateInputValue(): string {
  return new Date().toISOString().slice(0, 10);
}

export function ManualWorkoutForm({ onAdd }: { onAdd: (activity: Activity) => void }) {
  const [date, setDate] = useState(todayDateInputValue());
  const [durationMinutes, setDurationMinutes] = useState("");
  const [distanceKm, setDistanceKm] = useState("");
  const [averageHeartRate, setAverageHeartRate] = useState("");
  const [rpe, setRpe] = useState("");
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);

    const durationValue = Number(durationMinutes);
    if (!date || !durationValue || durationValue <= 0) {
      setError("Date and a positive duration are required.");
      return;
    }

    const activity: Activity = {
      id: crypto.randomUUID(),
      source: "manual",
      name: "Manual Entry",
      type: "Workout",
      startDate: new Date(`${date}T12:00:00`).toISOString(),
      movingTimeSeconds: durationValue * 60,
      distanceMeters: distanceKm ? Number(distanceKm) * 1000 : 0,
      averageHeartRate: averageHeartRate ? Number(averageHeartRate) : null,
      averageWatts: null,
      rpe: rpe ? Number(rpe) : null,
    };

    onAdd(activity);
    setDurationMinutes("");
    setDistanceKm("");
    setAverageHeartRate("");
    setRpe("");
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <label className="block">
          <span className="mb-1 block text-sm text-muted">Date</span>
          <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
        </label>
        <label className="block">
          <span className="mb-1 block text-sm text-muted">Duration (min)</span>
          <Input
            type="number"
            min="1"
            value={durationMinutes}
            onChange={(e) => setDurationMinutes(e.target.value)}
            placeholder="45"
            required
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-sm text-muted">Distance (km, optional)</span>
          <Input
            type="number"
            min="0"
            step="0.1"
            value={distanceKm}
            onChange={(e) => setDistanceKm(e.target.value)}
            placeholder="5.0"
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-sm text-muted">Avg HR (optional)</span>
          <Input
            type="number"
            min="0"
            value={averageHeartRate}
            onChange={(e) => setAverageHeartRate(e.target.value)}
            placeholder="150"
          />
        </label>
        <label className="col-span-2 block">
          <span className="mb-1 block text-sm text-muted">RPE (0-10, optional)</span>
          <Input
            type="number"
            min="0"
            max="10"
            value={rpe}
            onChange={(e) => setRpe(e.target.value)}
            placeholder="7"
          />
        </label>
      </div>
      {error && <p className="text-sm text-warning">{error}</p>}
      <Button type="submit">Add Workout</Button>
    </form>
  );
}
