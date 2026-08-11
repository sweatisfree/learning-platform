import type { InputHTMLAttributes } from "react";
import { cn } from "@/lib/utils/cn";

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        "block w-full rounded-[var(--radius-theme)] border border-border bg-surface px-3 py-2.5",
        "text-foreground placeholder:text-muted focus:outline-none focus:border-accent",
        className,
      )}
      {...props}
    />
  );
}
