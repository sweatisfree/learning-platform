import Link from "next/link";

const INCLUDED = [
  "Strava sync for training load",
  "Apple Health sync for recovery data",
  "ACWR, TRIMP & sRPE calculations",
  "Autonomic Recovery Index",
];

export function Pricing() {
  return (
    <section id="pricing" className="mx-auto w-full max-w-6xl scroll-mt-20 px-4 py-16 sm:px-6">
      <h2 className="text-center font-heading text-3xl font-bold">Simple, Honest Pricing</h2>
      <p className="mx-auto mt-3 max-w-xl text-center text-muted">One plan. Everything included.</p>

      <div className="mx-auto mt-10 max-w-sm rounded-[var(--radius-theme)] border border-accent bg-surface p-8 text-center">
        <p className="text-sm text-muted">3-day free trial</p>
        <p className="font-heading text-5xl font-bold">$0</p>
        <p className="mt-1 text-sm text-muted">then $4.99/mo</p>

        <ul className="mt-6 space-y-2 text-left text-sm text-muted">
          {INCLUDED.map((item) => (
            <li key={item} className="flex items-start gap-2">
              <span className="mt-0.5 text-success">✓</span>
              {item}
            </li>
          ))}
        </ul>

        <Link
          href="/login"
          className="mt-7 block rounded-[var(--radius-theme)] bg-accent px-7 py-3 font-sans font-semibold text-foreground transition-colors hover:bg-accent-hover"
        >
          Start Free Trial
        </Link>
        <p className="mt-4 text-xs text-muted">
          No refunds after a billing charge — see our{" "}
          <Link href="/refund-policy" className="text-accent underline">
            Refund Policy
          </Link>
          .
        </p>
      </div>
    </section>
  );
}
