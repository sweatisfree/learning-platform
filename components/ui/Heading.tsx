import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils/cn";

// Matches the marketing page's heading treatment — semibold rather than bold,
// with the same negative tracking — so a page title reads the same on either
// side of the login boundary.
const HEADING_BASE = "font-heading font-semibold tracking-[-0.02em] text-foreground";

export function PageHeading({ className, ...props }: HTMLAttributes<HTMLHeadingElement>) {
  return <h1 className={cn(HEADING_BASE, "text-3xl sm:text-4xl", className)} {...props} />;
}

export function SectionHeading({ className, ...props }: HTMLAttributes<HTMLHeadingElement>) {
  return <h2 className={cn(HEADING_BASE, "text-sm", className)} {...props} />;
}
