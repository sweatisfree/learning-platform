import { Suspense } from "react";
import { AuthCard } from "@/components/auth/AuthCard";

export default function LoginPage() {
  return (
    // The card used to float alone on flat background. The same surface-to-
    // background wash the page headers use gives it something to sit on, and
    // -mt-20 lets it start under the nav the way the hero does.
    <main className="-mt-20 flex flex-1 items-center justify-center bg-gradient-to-b from-surface to-background px-4 pb-16 pt-[124px]">
      {/* AuthCard reads ?next=checkout via useSearchParams, which opts this
          page out of prerendering unless it sits behind a Suspense boundary. */}
      <Suspense fallback={null}>
        <AuthCard />
      </Suspense>
    </main>
  );
}
