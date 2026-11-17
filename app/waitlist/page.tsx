import Link from "next/link";
import { PageHeader } from "@/components/layout/PageHeader";
import { Panel } from "@/components/ui/Panel";
import { WaitlistForm } from "@/components/marketing/WaitlistForm";

export const metadata = {
  title: "Under 18 — Thríamvos",
  description: "Join the list to hear when Thríamvos can take athletes under 18.",
};

export default function WaitlistPage() {
  return (
    <>
      <PageHeader title="Not yet, but tell us you're waiting">
        Thríamvos is 18 and over today. If you&apos;re younger, or you&apos;re a parent of someone
        who is, this is how to hear when that changes.
      </PageHeader>

      <main className="mx-auto w-full max-w-3xl flex-1 px-4 pb-16 pt-8 sm:px-6">
        <div className="space-y-4 leading-relaxed text-body">
          <p>
            Plenty of the people who want this are still at school, and we&apos;d rather say that
            plainly than quietly let them tick a box claiming otherwise.
          </p>
          <p>
            Serving athletes under 18 properly means more than lowering a number on a form. Someone
            who can&apos;t enter a contract can&apos;t agree to terms or hold a subscription, so a
            parent has to stand behind the account, and that has to be recorded rather than assumed.
            We want a lawyer to tell us what that must look like before we build it, not after.
          </p>
          <p>
            There&apos;s a second reason, and it has nothing to do with paperwork. The readiness
            thresholds in the app come from research on adult athletes. A fifteen-year-old
            mid-growth-spurt has a resting heart rate and an HRV that move for reasons that
            aren&apos;t fatigue, and a score that reads those as accumulated load would be
            confidently wrong about something that matters.{" "}
            <Link href="/transparency">How your scores are calculated</Link> sets out the formulas
            as they stand.
          </p>
        </div>

        <Panel as="section" className="mt-8">
          <h2 className="font-heading text-lg font-semibold tracking-[-0.01em] text-foreground">
            Tell us you&apos;re waiting
          </h2>
          <p className="mb-5 mt-1.5 text-sm text-muted">
            One email address, used once, to tell you when this opens. No newsletter.
          </p>
          <WaitlistForm />
        </Panel>

        <p className="mt-8 text-sm text-muted">
          Already 18 or over?{" "}
          <Link href="/login" className="text-accent underline">
            Create an account
          </Link>
          .
        </p>
      </main>
    </>
  );
}
