import type { ReactNode } from "react";
import { AppSidebar } from "@/components/layout/AppSidebar";

// Shell for the signed-in product. A route group, so /dashboard and /settings
// keep their URLs — the parentheses are stripped from the path.
export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-4 px-4 py-8 sm:flex-row sm:gap-6 sm:px-6">
      <AppSidebar />
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}
