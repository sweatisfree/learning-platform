"use client";

import { useState, type FormEvent } from "react";
import { supabase } from "@/lib/supabase/client";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

function todayDateInputValue(): string {
  return new Date().toISOString().slice(0, 10);
}

// Real, persisted entry point — kept separate from the non-persisted
// RecoveryCheckinForm demo in the /dev/workouts test harness on purpose.
export function ManualHealthReadingForm({
  userId,
  onSaved,
}: {
  userId: string;
  onSaved: () => void;
}) {
  const [date, setDate] = useState(todayDateInputValue());
  const [restingHeartRate, setRestingHeartRate] = useState("");
  const [hrv, setHrv] = useState("");
  const [sleepHours, setSleepHours] = useState("");
  const [respiratoryRate, setRespiratoryRate] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);

    const restingValue = restingHeartRate ? Number(restingHeartRate) : null;
    const hrvValue = hrv ? Number(hrv) : null;
    const sleepValue = sleepHours ? Number(sleepHours) : null;
    const respiratoryValue = respiratoryRate ? Number(respiratoryRate) : null;
    if (!date || (restingValue == null && hrvValue == null && sleepValue == null && respiratoryValue == null)) {
      setError("Date and at least one of the fields below are required.");
      return;
    }

    setIsSaving(true);
    const { error: insertError } = await supabase.from("health_readings").upsert(
      {
        user_id: userId,
        source: "manual",
        recorded_date: date,
        resting_heart_rate: restingValue,
        hrv: hrvValue,
        sleep_hours: sleepValue,
        respiratory_rate: respiratoryValue,
      },
      { onConflict: "user_id,recorded_date,source" },
    );
    setIsSaving(false);

    if (insertError) {
      setError(insertError.message);
      return;
    }

    setRestingHeartRate("");
    setHrv("");
    setSleepHours("");
    setRespiratoryRate("");
    onSaved();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <label className="block">
          <span className="mb-1 block text-sm text-muted">Date</span>
          <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
        </label>
        <label className="block">
          <span className="mb-1 block text-sm text-muted">Resting HR</span>
          <Input
            type="number"
            min="0"
            value={restingHeartRate}
            onChange={(e) => setRestingHeartRate(e.target.value)}
            placeholder="52"
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-sm text-muted">HRV (ms)</span>
          <Input type="number" min="0" value={hrv} onChange={(e) => setHrv(e.target.value)} placeholder="63" />
        </label>
        <label className="block">
          <span className="mb-1 block text-sm text-muted">Sleep (hours)</span>
          <Input
            type="number"
            min="0"
            step="0.1"
            value={sleepHours}
            onChange={(e) => setSleepHours(e.target.value)}
            placeholder="7.5"
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-sm text-muted">Respiratory rate</span>
          <Input
            type="number"
            min="0"
            step="0.1"
            value={respiratoryRate}
            onChange={(e) => setRespiratoryRate(e.target.value)}
            placeholder="14"
          />
        </label>
      </div>
      {error && <p className="text-sm text-warning">{error}</p>}
      <Button type="submit" variant="ghost" disabled={isSaving}>
        {isSaving ? "Saving..." : "Save Reading"}
      </Button>
    </form>
  );
}
