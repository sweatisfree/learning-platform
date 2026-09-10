import Link from "next/link";

const INCLUDED = [
  "Strava sync for training load",
  "Apple Health sync for recovery data",
  "ACWR, TRIMP & sRPE calculations",
  "Autonomic Recovery Index",
  "Every formula documented, not black-boxed",
];

export function Pricing() {
  return (
    <section id="pricing" className="scroll-mt-24 bg-landing-light px-4 py-20 sm:px-6 sm:py-24">
      <div className="mx-auto max-w-6xl">
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="flex flex-col justify-center rounded-[var(--radius-bento)] bg-landing-light-card p-10 sm:p-12">
            <h2 className="font-heading text-4xl font-semibold leading-[1.1] tracking-[-0.02em] text-landing-ink sm:text-5xl">
              Simple,
              <br />
              honest pricing
            </h2>
            <p className="mt-6 max-w-sm text-lg leading-relaxed text-landing-ink-muted">
              One plan, everything included. Start free — we don&apos;t ask for a card to see whether this
              works for you.
            </p>
            <ul className="mt-8 space-y-3">
              {INCLUDED.map((item) => (
                <li key={item} className="flex items-start gap-3 text-landing-ink">
                  <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-landing-ink text-[11px] text-white">
                    ✓
                  </span>
                  <span className="leading-relaxed">{item}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="relative flex flex-col justify-center overflow-hidden rounded-[var(--radius-bento)] bg-landing-ink p-10 text-center sm:p-12">
            <p className="text-sm uppercase tracking-wider text-white/50">3-day free trial</p>
            <p className="mt-4 font-heading text-7xl font-semibold tracking-[-0.03em] text-white">$0</p>
            <p className="mt-3 text-white/60">then $4.99/month · cancel anytime</p>

            <Link
              href="/login"
              className="mt-10 rounded-full bg-white px-8 py-4 font-semibold text-landing-ink transition-opacity hover:opacity-90"
            >
              Start Free — No Card Required
            </Link>

            <p className="mt-6 text-xs leading-relaxed text-white/45">
              No refunds after a billing charge — see our{" "}
              <Link href="/refund-policy" className="underline hover:text-white/70">
                Refund Policy
              </Link>
              .
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
