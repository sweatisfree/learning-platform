import type { ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils/cn";

type ButtonVariant = "primary" | "ghost";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
}

export function Button({ variant = "primary", className, ...props }: ButtonProps) {
  return (
    <button
      className={cn(
        "rounded-[var(--radius-theme)] px-7 py-3 font-sans font-semibold transition-colors cursor-pointer",
        variant === "primary" && "bg-accent text-foreground hover:bg-accent-hover",
        variant === "ghost" &&
          "bg-transparent border border-accent text-foreground hover:bg-accent/10",
        className,
      )}
      {...props}
    />
  );
}
