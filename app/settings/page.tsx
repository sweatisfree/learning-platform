"use client";

import { useSupabaseAuth } from "@/components/providers/SupabaseProvider";
import type { UserProfile } from "@/lib/types/user-profile";

export default function SettingsPage() {
  const { session, isLoading } = useSupabaseAuth();

  if (isLoading) return null;

  const profile: UserProfile | null = session
    ? {
        id: session.user.id,
        email: session.user.email ?? "",
        displayName: null,
        sex: null,
        restingHeartRate: null,
        maxHeartRate: null,
        createdAt: session.user.created_at,
      }
    : null;

  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-2 px-4 text-center">
      <h1 className="font-heading text-2xl font-bold">Settings</h1>
      {profile ? <p className="text-muted">{profile.email}</p> : <p className="text-muted">Not signed in.</p>}
    </main>
  );
}
