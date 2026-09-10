"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSupabaseAuth } from "@/components/providers/SupabaseProvider";
import { supabase } from "@/lib/supabase/client";
import { cn } from "@/lib/utils/cn";

const NAV_LINKS = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/settings", label: "Settings" },
];

// Rendered globally in app/layout.tsx so every signed-in page has a way to
// navigate — previously the only path anywhere in the app was typing a URL
// directly, since neither the post-login homepage nor the Dashboard linked
// anywhere once a Strava connection existed.
const PUBLIC_NAV_LINKS = [
  { href: "/#roadmap", label: "Roadmap" },
  { href: "/#pricing", label: "Pricing" },
];

export function NavBar() {
  const { session, isLoading } = useSupabaseAuth();
  const pathname = usePathname();

  if (isLoading) return null;

  async function handleLogout() {
    await supabase.auth.signOut();
  }

  // Floating pill nav for signed-out visitors. Kept in flow (sticky, not fixed)
  // so pages that aren't the landing page don't need offset padding; the hero
  // pulls itself up underneath it with a negative margin.
  if (!session) {
    return (
      <div className="sticky top-0 z-50 px-3 pt-3 sm:px-4 sm:pt-4">
        {/* Opaque enough to read consistently over both the dark hero and the
            light bento sections it scrolls across. */}
        <nav className="mx-auto flex max-w-6xl items-center justify-between rounded-full border border-white/10 bg-[#141417]/90 py-2.5 pl-5 pr-2.5 backdrop-blur-xl">
          <Link href="/" className="flex items-center gap-2 font-heading text-lg font-semibold text-white">
            <Image src="/thriamvos-mark.svg" alt="" width={22} height={22} />
            Thríamvos
          </Link>
          <div className="flex items-center gap-1 sm:gap-2">
            {PUBLIC_NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="hidden rounded-full px-4 py-2 text-sm text-white/75 transition-colors hover:text-white sm:inline-block"
              >
                {link.label}
              </Link>
            ))}
            <span className="mx-1 hidden h-5 w-px bg-white/15 sm:block" />
            <Link
              href="/login"
              className="rounded-full px-3 py-2 text-sm text-white/75 transition-colors hover:text-white sm:px-4"
            >
              Login
            </Link>
            <Link
              href="/login"
              className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-[var(--landing-ink)] transition-opacity hover:opacity-90 sm:px-5"
            >
              Get Started
            </Link>
          </div>
        </nav>
      </div>
    );
  }

  return (
    <nav className="flex items-center justify-between border-b border-border px-4 py-3 sm:px-6">
      <Link href="/dashboard" className="flex items-center gap-2 font-heading font-bold">
        <Image src="/thriamvos-mark.svg" alt="" width={24} height={24} className="rounded-[6px]" />
        Thríamvos
      </Link>
      <div className="flex items-center gap-5 text-sm">
        {NAV_LINKS.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className={cn(pathname === link.href ? "text-accent" : "text-muted hover:text-foreground")}
          >
            {link.label}
          </Link>
        ))}
        <button type="button" onClick={handleLogout} className="text-muted hover:text-foreground">
          Log Out
        </button>
      </div>
    </nav>
  );
}
