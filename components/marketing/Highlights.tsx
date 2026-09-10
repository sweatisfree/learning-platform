// Occupies the slot the reference design uses for a stats row (downloads,
// ratings, countries). Those numbers would be fabricated for this product, so
// this states what's actually tracked instead.
// Plain words first, the technical name second. A prospective user shouldn't
// have to decode four acronyms to work out what this product measures.
const HIGHLIGHTS = [
  {
    metric: "Training load",
    label: "How hard the last week has been, against the base you've actually built (ACWR)",
  },
  {
    metric: "Recovery",
    label: "Your morning heart-rate signals, judged against your own normal (HRV, resting HR)",
  },
  {
    metric: "Every effort counted",
    label: "Rides, runs and strength work measured on one scale (TRIMP, sRPE)",
  },
];

export function Highlights() {
  return (
    <section className="bg-landing-light px-6 pb-4 pt-16 sm:pt-20">
      <div className="mx-auto grid max-w-5xl gap-10 text-center sm:grid-cols-3">
        {HIGHLIGHTS.map((highlight) => (
          <div key={highlight.metric}>
            <p className="font-heading text-2xl font-semibold tracking-[-0.02em] text-landing-ink sm:text-3xl">
              {highlight.metric}
            </p>
            <p className="mx-auto mt-2 max-w-[19rem] text-sm leading-relaxed text-landing-ink-muted">
              {highlight.label}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
