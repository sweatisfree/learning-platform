import { supabase } from "@/lib/supabase/client";
import type { AthleteProfileFields } from "@/lib/types/user-profile";
import type { ActivityLoadOptions } from "@/lib/engine/loadCalculator";

interface UserProfileRow {
  sex: string | null;
  resting_heart_rate: number | null;
  max_heart_rate: number | null;
  max_heart_rate_source: string | null;
}

function toAthleteProfile(row: UserProfileRow): AthleteProfileFields {
  return {
    sex: row.sex === "male" || row.sex === "female" ? row.sex : null,
    restingHeartRate: row.resting_heart_rate,
    maxHeartRate: row.max_heart_rate,
    maxHeartRateSource:
      row.max_heart_rate_source === "measured" || row.max_heart_rate_source === "estimated"
        ? row.max_heart_rate_source
        : null,
  };
}

// Returns null when the athlete hasn't filled in a profile yet — the caller is
// expected to say so rather than substitute defaults, since a guessed max HR
// would silently change every TRIMP value downstream.
export async function fetchAthleteProfile(userId: string): Promise<AthleteProfileFields | null> {
  const { data, error } = await supabase
    .from("user_profiles")
    .select("sex, resting_heart_rate, max_heart_rate, max_heart_rate_source")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) return null;
  return toAthleteProfile(data as UserProfileRow);
}

export async function saveAthleteProfile(
  userId: string,
  profile: AthleteProfileFields,
): Promise<void> {
  const { error } = await supabase.from("user_profiles").upsert(
    {
      user_id: userId,
      sex: profile.sex,
      resting_heart_rate: profile.restingHeartRate,
      max_heart_rate: profile.maxHeartRate,
      max_heart_rate_source: profile.maxHeartRateSource,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" },
  );
  if (error) throw new Error(error.message);
}

// TRIMP needs all three of sex, resting HR and max HR. A partial profile
// yields no options at all rather than a half-populated set, so the load
// engine's own fallback (and its "duration" method label) stays truthful.
export function toActivityLoadOptions(
  profile: AthleteProfileFields | null,
): ActivityLoadOptions {
  if (!profile) return {};
  const { sex, restingHeartRate, maxHeartRate, maxHeartRateSource } = profile;
  if (sex == null || restingHeartRate == null || maxHeartRate == null) return {};
  return {
    sex,
    restingHeartRate,
    maxHeartRate,
    maxHeartRateSource: maxHeartRateSource ?? undefined,
  };
}
