// Occupies the slot the reference design uses for a stats row (downloads,
// ratings, countries). Those numbers would be fabricated for this product, so
// this states what's actually tracked instead.
const HIGHLIGHTS = [
  { metric: "ACWR", label: "Acute:chronic workload, from every Strava activity" },
  { metric: "HRV + RHR", label: "Recovery scored against your own rolling baseline" },
  { metric: "TRIMP + sRPE", label: "Cardio and strength load on a single scale" },
];

export function Highlights() {
  return (
    <section className="bg-landing-light px-6 pb-4 pt-16 sm:pt-20">
      <div className="mx-auto grid max-w-5xl gap-10 text-center sm:grid-cols-3">
        {HIGHLIGHTS.map((highlight) => (
          <div key={highlight.metric}>
            <p className="font-heading text-3xl font-semibold tracking-[-0.02em] text-landing-ink sm:text-4xl">
              {highlight.metric}
            </p>
            <p className="mx-auto mt-2 max-w-[16rem] text-sm leading-relaxed text-landing-ink-muted">
              {highlight.label}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
