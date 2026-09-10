import type { ReactNode } from "react";
import { cn } from "@/lib/utils/cn";

type StatSize = "md" | "lg";

const VALUE_CLASS: Record<StatSize, string> = {
  md: "text-2xl",
  lg: "text-4xl",
};

// The recurring "label / big number / caption" trio. Centralised so every
// figure in the app is typeset identically — the readiness score, the ACWR
// ratio and the recovery index previously each set their own sizes.
export function Stat({
  label,
  value,
  caption,
  size = "lg",
  valueClassName,
  children,
}: {
  label: string;
  value: ReactNode;
  caption?: ReactNode;
  size?: StatSize;
  valueClassName?: string;
  children?: ReactNode;
}) {
  return (
    <div>
      <p className="text-sm text-muted">{label}</p>
      <p
        className={cn(
          "mt-1 font-heading font-semibold tracking-[-0.02em]",
          VALUE_CLASS[size],
          valueClassName,
        )}
      >
        {value}
      </p>
      {caption && <p className="mt-1 text-xs text-muted">{caption}</p>}
      {children}
    </div>
  );
}
