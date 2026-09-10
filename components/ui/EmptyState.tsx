import type { ReactNode } from "react";
import { Panel } from "./Panel";

// A first-class component for the states this product spends most of its time
// in: no activities yet, baseline too thin to score, nothing connected. These
// are the default view for every new account, not edge cases, so they get a
// real treatment rather than a bare line of muted text.
export function EmptyState({
  title,
  children,
  action,
}: {
  title: string;
  children?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <Panel>
      <p className="font-heading text-lg font-semibold tracking-[-0.01em] text-muted">{title}</p>
      {children && <div className="mt-2 text-sm leading-relaxed text-muted">{children}</div>}
      {action && <div className="mt-4">{action}</div>}
    </Panel>
  );
}
