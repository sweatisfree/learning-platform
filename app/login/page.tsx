import { Suspense } from "react";
import { AuthCard } from "@/components/auth/AuthCard";

export default function LoginPage() {
  return (
    <main className="flex flex-1 items-center justify-center px-4">
      {/* AuthCard reads ?next=checkout via useSearchParams, which opts this
          page out of prerendering unless it sits behind a Suspense boundary. */}
      <Suspense fallback={null}>
        <AuthCard />
      </Suspense>
    </main>
  );
}
