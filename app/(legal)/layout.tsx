import Link from "next/link";
import type { ReactNode } from "react";

export default function LegalLayout({ children }: { children: ReactNode }) {
  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-10 sm:px-6">
      <Link href="/" className="text-sm text-accent underline">
        ← Back to Thríamvos
      </Link>

      <div className="mt-4 rounded-[var(--radius-theme)] border border-border bg-surface p-4 text-sm text-muted">
        This page is a general template, not legal advice. It has not been reviewed by an attorney and may
        not satisfy every requirement in your jurisdiction. Consult a qualified lawyer before relying on it.
      </div>

      <article className="prose-legal mt-8 space-y-6 text-sm leading-relaxed text-muted [&_h1]:font-heading [&_h1]:text-2xl [&_h1]:font-bold [&_h1]:text-foreground [&_h2]:font-heading [&_h2]:text-lg [&_h2]:font-bold [&_h2]:text-foreground [&_h2]:mt-8 [&_li]:ml-5 [&_li]:list-disc [&_strong]:text-foreground">
        {children}
      </article>
    </main>
  );
}
