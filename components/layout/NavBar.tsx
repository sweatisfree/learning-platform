"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { useSupabaseAuth } from "@/components/providers/SupabaseProvider";
import { supabase } from "@/lib/supabase/client";
import { cn } from "@/lib/utils/cn";

const PUBLIC_NAV_LINKS = [
  { href: "/#roadmap", label: "Roadmap" },
  { href: "/#pricing", label: "Pricing" },
  { href: "/faq", label: "FAQ" },
];

// Section navigation for the signed-in product. It belongs here, in the one
// component that renders on EVERY page, rather than in a shell scoped to the
// app routes — otherwise a signed-in reader on the FAQ or a policy page has no
// way back to their dashboard.
const APP_NAV_LINKS = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/settings", label: "Settings" },
];

// whitespace-nowrap because "Log Out" wrapped to two lines and pushed the bar
// out of shape once the signed-in nav gained its section links.
const NAV_ITEM_CLASS = "whitespace-nowrap rounded-full px-2.5 py-2 text-sm transition-colors sm:px-4";

// One shell for both signed-in and signed-out. Kept in flow (sticky, not
// fixed) so pages other than the landing page need no offset padding — the
// hero pulls itself up underneath it with a negative margin. Sharing the shell
// means the header doesn't change shape at the moment of login, which was the
// most visible seam between the marketing page and the app.
function NavShell({
  home,
  compactBrand = false,
  children,
}: {
  home: string;
  // The signed-in bar carries two section links on top of the account action,
  // which is more than fits beside the wordmark on a phone. Drop to the mark
  // alone there; the full wordmark returns from sm up and on marketing pages,
  // where the brand is doing more work than the navigation.
  compactBrand?: boolean;
  children: ReactNode;
}) {
  return (
    <div className="sticky top-0 z-50 px-3 pt-3 sm:px-4 sm:pt-4">
      {/* --surface, the same colour as every card in the app, rather than the
          warm near-black this used to be. Over the hero photography either
          reads as dark glass, but on a flat --background page the old value
          was visibly a different hue sitting on navy. Opaque enough to stay
          readable across the light bento sections it scrolls over. */}
      <nav className="mx-auto flex max-w-6xl items-center justify-between gap-2 rounded-full border border-white/10 bg-surface/90 py-2.5 pl-4 pr-2.5 backdrop-blur-xl sm:pl-5">
        <Link
          href={home}
          className="flex shrink-0 items-center gap-2 font-heading text-lg font-semibold tracking-[-0.01em] text-white"
        >
          <Image src="/thriamvos-mark.svg" alt="" width={22} height={22} />
          <span className={cn(compactBrand && "hidden sm:inline")}>Thríamvos</span>
        </Link>
        <div className="flex items-center gap-0.5 sm:gap-2">{children}</div>
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
    <NavShell home="/dashboard" compactBrand>
      {APP_NAV_LINKS.map((link) => {
        const isActive = pathname === link.href;
        return (
          <Link
            key={link.href}
            href={link.href}
            aria-current={isActive ? "page" : undefined}
            className={cn(
              NAV_ITEM_CLASS,
              // Teal marks the active section, the same signal the rest of the
              // app uses for "you are here" and primary actions.
              isActive ? "bg-accent/10 font-semibold text-accent" : "text-white/75 hover:text-white",
            )}
          >
            {link.label}
          </Link>
        );
      })}
      <Link href="/faq" className={cn(NAV_ITEM_CLASS, "hidden text-white/75 hover:text-white sm:inline-block")}>
        FAQ
      </Link>
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
