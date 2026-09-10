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

  if (!session) {
    return (
      <nav className="flex items-center justify-between border-b border-border px-4 py-3 sm:px-6">
        <Link href="/" className="flex items-center gap-2 font-heading font-bold">
          <Image src="/thriamvos-mark.svg" alt="" width={24} height={24} className="rounded-[6px]" />
          Thríamvos
        </Link>
        <div className="flex items-center gap-5 text-sm">
          {PUBLIC_NAV_LINKS.map((link) => (
            <Link key={link.href} href={link.href} className="hidden text-muted hover:text-foreground sm:inline">
              {link.label}
            </Link>
          ))}
          <Link href="/login" className="text-muted hover:text-foreground">
            Login
          </Link>
          <Link
            href="/login"
            className="rounded-[var(--radius-theme)] bg-accent px-4 py-2 font-semibold text-foreground transition-colors hover:bg-accent-hover"
          >
            Get Started
          </Link>
        </div>
      </nav>
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
