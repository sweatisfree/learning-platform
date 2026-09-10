"use client";

import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { saveAthleteProfile } from "@/lib/health/athleteProfile";
import type { MaxHeartRateSource } from "@/lib/engine/loadCalculator";
import type { AthleteProfileFields } from "@/lib/types/user-profile";
import type { Sex } from "@/lib/types/common";

const SELECT_CLASS =
  "block w-full rounded-[var(--radius-theme)] border border-border bg-surface px-3 py-2.5 text-foreground focus:border-accent focus:outline-none";

function toStringValue(value: number | null): string {
  return value == null ? "" : String(value);
}

// Sex, resting HR and max HR are the three inputs Banister TRIMP needs. Without
// all three, load falls back to duration alone — so this form is what makes
// heart-rate-weighted load possible at all.
export function AthleteProfileForm({
  userId,
  profile,
  onSaved,
}: {
  userId: string;
  profile: AthleteProfileFields | null;
  onSaved: () => void;
}) {
  const [sex, setSex] = useState<Sex | "">(profile?.sex ?? "");
  const [restingHeartRate, setRestingHeartRate] = useState(
    toStringValue(profile?.restingHeartRate ?? null),
  );
  const [maxHeartRate, setMaxHeartRate] = useState(toStringValue(profile?.maxHeartRate ?? null));
  const [maxHeartRateSource, setMaxHeartRateSource] = useState<MaxHeartRateSource | "">(
    profile?.maxHeartRateSource ?? "",
  );
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [hasSaved, setHasSaved] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setHasSaved(false);

    if (maxHeartRate && !maxHeartRateSource) {
      setError("Tell us where the max heart rate came from — it changes how much to trust it.");
      return;
    }

    setIsSaving(true);
    try {
      await saveAthleteProfile(userId, {
        sex: sex === "" ? null : sex,
        restingHeartRate: restingHeartRate ? Number(restingHeartRate) : null,
        maxHeartRate: maxHeartRate ? Number(maxHeartRate) : null,
        maxHeartRateSource: maxHeartRateSource === "" ? null : maxHeartRateSource,
      });
      setHasSaved(true);
      onSaved();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Could not save your profile.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <label className="block">
          <span className="mb-1 block text-sm text-muted">Sex</span>
          <select
            className={SELECT_CLASS}
            value={sex}
            onChange={(event) => setSex(event.target.value as Sex | "")}
          >
            <option value="">—</option>
            <option value="female">Female</option>
            <option value="male">Male</option>
          </select>
        </label>
        <label className="block">
          <span className="mb-1 block text-sm text-muted">Resting HR</span>
          <Input
            type="number"
            min="0"
            value={restingHeartRate}
            onChange={(event) => setRestingHeartRate(event.target.value)}
            placeholder="52"
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-sm text-muted">Max HR</span>
          <Input
            type="number"
            min="0"
            value={maxHeartRate}
            onChange={(event) => setMaxHeartRate(event.target.value)}
            placeholder="186"
          />
        </label>
      </div>

      <label className="block">
        <span className="mb-1 block text-sm text-muted">Where did that max HR come from?</span>
        <select
          className={SELECT_CLASS}
          value={maxHeartRateSource}
          onChange={(event) => setMaxHeartRateSource(event.target.value as MaxHeartRateSource | "")}
        >
          <option value="">—</option>
          <option value="measured">Measured — I hit it in a real effort or test</option>
          <option value="estimated">Estimated — from an age formula</option>
        </select>
        <span className="mt-1 block text-xs text-muted">
          An estimated max HR means every heart-rate-weighted load number below is partly a
          birthday formula. We&apos;ll keep saying so wherever it&apos;s used.
        </span>
      </label>

      {error && <p className="text-sm text-warning">{error}</p>}
      {hasSaved && !error && <p className="text-sm text-success">Profile saved.</p>}
      <Button type="submit" variant="ghost" disabled={isSaving}>
        {isSaving ? "Saving..." : "Save Profile"}
      </Button>
    </form>
  );
}
