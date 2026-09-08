"use client";

import { useState, type FormEvent } from "react";
import type { AutonomicReading } from "@/lib/engine/loadCalculator";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

// Demo input only — a workout file/manual entry never contains HRV or
// resting-HR data, so this is the one place the test harness collects
// numbers purely to exercise computeAutonomicRecoveryIndex. Not persisted,
// and deliberately not called "Recovery Score" (that's the separate,
// still-unimplemented computeRecoveryScore stub in lib/engine/recovery-score.ts).
export function RecoveryCheckinForm({ onAdd }: { onAdd: (reading: AutonomicReading) => void }) {
  const [restingHeartRate, setRestingHeartRate] = useState("");
  const [hrv, setHrv] = useState("");
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    const restingValue = Number(restingHeartRate);
    const hrvValue = Number(hrv);
    if (!restingValue || !hrvValue) {
      setError("Both fields are required.");
      return;
    }
    onAdd({ restingHeartRate: restingValue, hrv: hrvValue });
    setRestingHeartRate("");
    setHrv("");
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <p className="text-sm font-semibold">Autonomic Recovery Index (demo input)</p>
      <div className="grid grid-cols-2 gap-3">
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
          <Input
            type="number"
            min="0"
            value={hrv}
            onChange={(e) => setHrv(e.target.value)}
            placeholder="63"
          />
        </label>
      </div>
      {error && <p className="text-sm text-warning">{error}</p>}
      <Button type="submit" variant="ghost">
        Add Check-in
      </Button>
    </form>
  );
}
