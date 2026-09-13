import type { ReactNode } from "react";
import { Panel } from "@/components/ui/Panel";
import { PageHeader } from "@/components/layout/PageHeader";

// Was a route-group layout, but a layout cannot see its page's title, so every
// document opened with a bare <h1> on flat background. As a component each page
// passes its own title up into the shared header band.
export function LegalDoc({
  title,
  updated,
  children,
}: {
  title: string;
  updated: string;
  children: ReactNode;
}) {
  return (
    <>
      <PageHeader title={title}>Last updated: {updated}</PageHeader>

      <main className="mx-auto w-full max-w-3xl flex-1 px-4 pb-16 pt-8 sm:px-6">
        <Panel padding="dense" className="text-sm text-muted">
          This page is a general template, not legal advice. It has not been reviewed by an attorney and may
          not satisfy every requirement in your jurisdiction. Consult a qualified lawyer before relying on it.
        </Panel>

        {/* Headings here mirror PageHeading/SectionHeading — semibold with the
            same negative tracking — but must be applied via descendant selectors
            because the legal pages are plain markup, not components. */}
        <article className="prose-legal mt-8 space-y-6 leading-relaxed text-body [&_h2]:font-heading [&_h2]:text-lg [&_h2]:font-semibold [&_h2]:tracking-[-0.01em] [&_h2]:text-foreground [&_h2]:mt-8 [&_li]:ml-5 [&_li]:list-disc [&_strong]:text-foreground [&_a]:text-accent [&_a]:underline">
          {children}
        </article>
      </main>
    </>
  );
}
