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
        // Pill, matching the marketing CTAs. The shape is what carries across
        // the login boundary; the fill stays contextual (teal on the app's dark
        // surfaces, white on the landing page's photography).
        "rounded-full px-7 py-3 font-sans font-semibold transition-colors cursor-pointer disabled:cursor-not-allowed disabled:opacity-50",
        variant === "primary" && "bg-accent text-foreground hover:bg-accent-hover",
        variant === "ghost" &&
          "bg-transparent border border-accent text-foreground hover:bg-accent/10",
        className,
      )}
      {...props}
    />
  );
}
