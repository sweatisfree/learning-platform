"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { useSupabaseAuth } from "@/components/providers/SupabaseProvider";
import { supabase } from "@/lib/supabase/client";
import { cn } from "@/lib/utils/cn";

const NAV_LINKS = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/settings", label: "Settings" },
];

const PUBLIC_NAV_LINKS = [
  { href: "/#roadmap", label: "Roadmap" },
  { href: "/#pricing", label: "Pricing" },
];

const NAV_ITEM_CLASS = "rounded-full px-3 py-2 text-sm transition-colors sm:px-4";

// One shell for both signed-in and signed-out. Kept in flow (sticky, not
// fixed) so pages other than the landing page need no offset padding — the
// hero pulls itself up underneath it with a negative margin. Sharing the shell
// means the header doesn't change shape at the moment of login, which was the
// most visible seam between the marketing page and the app.
function NavShell({ home, children }: { home: string; children: ReactNode }) {
  return (
    <div className="sticky top-0 z-50 px-3 pt-3 sm:px-4 sm:pt-4">
      {/* Opaque enough to read consistently over the dark hero, the light
          bento sections it scrolls across, and the app's navy interior. */}
      <nav className="mx-auto flex max-w-6xl items-center justify-between rounded-full border border-white/10 bg-[#141417]/90 py-2.5 pl-5 pr-2.5 backdrop-blur-xl">
        <Link
          href={home}
          className="flex items-center gap-2 font-heading text-lg font-semibold tracking-[-0.01em] text-white"
        >
          <Image src="/thriamvos-mark.svg" alt="" width={22} height={22} />
          Thríamvos
        </Link>
        <div className="flex items-center gap-1 sm:gap-2">{children}</div>
      </nav>
    </div>
  );
}

export function NavBar() {
  const { session, isLoading } = useSupabaseAuth();
  const pathname = usePathname();

  if (isLoading) return null;

  async function handleLogout() {
    await supabase.auth.signOut();
  }

  if (!session) {
    return (
      <NavShell home="/">
        {PUBLIC_NAV_LINKS.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className={cn(NAV_ITEM_CLASS, "hidden text-white/75 hover:text-white sm:inline-block")}
          >
            {link.label}
          </Link>
        ))}
        <span className="mx-1 hidden h-5 w-px bg-white/15 sm:block" />
        <Link href="/login" className={cn(NAV_ITEM_CLASS, "text-white/75 hover:text-white")}>
          Login
        </Link>
        <Link
          href="/login"
          className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-[var(--landing-ink)] transition-opacity hover:opacity-90 sm:px-5"
        >
          Get Started
        </Link>
      </NavShell>
    );
  }

  return (
    <NavShell home="/dashboard">
      {NAV_LINKS.map((link) => (
        <Link
          key={link.href}
          href={link.href}
          className={cn(
            NAV_ITEM_CLASS,
            pathname === link.href ? "bg-white/10 text-white" : "text-white/75 hover:text-white",
          )}
        >
          {link.label}
        </Link>
      ))}
      <span className="mx-1 hidden h-5 w-px bg-white/15 sm:block" />
      <button
        type="button"
        onClick={handleLogout}
        className={cn(NAV_ITEM_CLASS, "cursor-pointer text-white/75 hover:text-white")}
      >
        Log Out
      </button>
    </NavShell>
  );
}
