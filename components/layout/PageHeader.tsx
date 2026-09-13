import Link from "next/link";
import type { ReactNode } from "react";
import { PageHeading } from "@/components/ui/Heading";

interface PageHeaderProps {
  title: string;
  children?: ReactNode;
  /** Set false on pages reached from inside the app rather than the landing page. */
  showBack?: boolean;
}

// Every page other than the landing page used to open with a strip of empty
// background and a small link floating in it, which left the sticky nav with
// nothing to sit against. This is the hero's job done plainly: the same pull-up
// under the nav, the same generous top padding, a title at the same scale.
export function PageHeader({ title, children, showBack = true }: PageHeaderProps) {
  return (
    <header className="relative -mt-20 border-b border-border bg-gradient-to-b from-surface to-background">
      <div className="mx-auto w-full max-w-3xl px-4 pb-10 pt-[124px] sm:px-6">
        {showBack && (
          <Link href="/" className="text-sm text-muted transition-colors hover:text-foreground">
            ← Back to Thríamvos
          </Link>
        )}
        <PageHeading className={showBack ? "mt-4" : undefined}>{title}</PageHeading>
        {children && <p className="mt-3 max-w-2xl text-lg leading-relaxed text-body">{children}</p>}
      </div>
    </header>
  );
}
