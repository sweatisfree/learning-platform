"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSupabaseAuth } from "@/components/providers/SupabaseProvider";
import { cn } from "@/lib/utils/cn";

// Section navigation for the signed-in product. Deliberately the ONLY place
// these links appear — NavBar's signed-in branch keeps brand and account
// actions only, so nothing is duplicated between the two navigations.
const SECTIONS = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/settings", label: "Settings" },
];

export function AppSidebar() {
  const pathname = usePathname();
  const { session, isLoading } = useSupabaseAuth();

  // Nothing to navigate to when signed out — those pages show a sign-in
  // prompt, and offering app sections to someone who can't open them is noise.
  if (isLoading || !session) return null;

  return (
    <nav
      aria-label="Sections"
      // self-start stops the sidebar stretching to the full height of the flex
      // row, which made it read as a tall empty panel beside short content.
      className="rounded-[var(--radius-md)] border border-border bg-surface p-2 sm:sticky sm:top-24 sm:w-52 sm:shrink-0 sm:self-start"
    >
      {/* Horizontal row on phones, stacked column from sm up — a fixed
          sidebar costs more vertical room than it earns on a small screen. */}
      <ul className="flex gap-1 sm:flex-col">
        {SECTIONS.map((section) => {
          const isActive = pathname === section.href;
          return (
            <li key={section.href} className="flex-1 sm:flex-none">
              <Link
                href={section.href}
                aria-current={isActive ? "page" : undefined}
                className={cn(
                  "relative block rounded-[var(--radius-sm)] px-3 py-2 text-sm transition-colors",
                  isActive
                    ? "bg-accent/10 font-semibold text-accent"
                    : "text-muted hover:bg-white/5 hover:text-foreground",
                )}
              >
                {/* Teal edge marker, so the active item is identifiable by
                    position and weight as well as by hue. */}
                {isActive && (
                  <span className="absolute inset-y-1 left-0 w-0.5 rounded-full bg-accent" aria-hidden />
                )}
                {section.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
