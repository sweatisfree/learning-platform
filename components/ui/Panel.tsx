import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils/cn";

// "none" exists so a caller supplying its own padding isn't fighting a default
// in the class list — cn() does not resolve Tailwind conflicts.
type PanelPadding = "dense" | "roomy" | "none";

const PADDING_CLASS: Record<PanelPadding, string> = {
  dense: "p-4 sm:p-5",
  roomy: "p-5 sm:p-7",
  none: "",
};

interface PanelProps extends HTMLAttributes<HTMLDivElement> {
  padding?: PanelPadding;
  as?: "div" | "section";
}

// The app's surface container. Before this existed the same border/background/
// radius combination was hand-written at 16 call sites, which is how the app
// and the marketing page drifted into different shape vocabularies.
export function Panel({ padding = "roomy", as: Element = "div", className, ...props }: PanelProps) {
  return (
    <Element
      className={cn(
        // No text-align here on purpose: cn() is a plain join with no conflict
        // resolution, so baking one in would silently beat any caller override.
        "rounded-[var(--radius-md)] border border-border bg-surface",
        PADDING_CLASS[padding],
        className,
      )}
      {...props}
    />
  );
}
