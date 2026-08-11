"use client";

import Link from "next/link";
import { useSupabaseAuth } from "@/components/providers/SupabaseProvider";

export default function DashboardPage() {
  const { session, isLoading } = useSupabaseAuth();

  if (isLoading) return null;

  if (!session) {
    return (
      <main className="flex flex-1 items-center justify-center px-4 text-center">
        <p className="text-muted">
          You need to be signed in to view this page.{" "}
          <Link href="/" className="text-accent underline">
            Go back
          </Link>
        </p>
      </main>
    );
  }

  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-2 px-4 text-center">
      <h1 className="font-heading text-2xl font-bold">Dashboard</h1>
      <p className="text-muted">
        ACWR, TRIMP, and recovery views land here once real Strava data flows in.
      </p>
    </main>
  );
}
