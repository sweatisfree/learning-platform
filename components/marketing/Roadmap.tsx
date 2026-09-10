// Kept deliberately non-committal — these are directions, not promises. Worth
// a review against the real roadmap before any push that changes them.
const ROADMAP_ITEMS = [
  {
    stage: "Shipped",
    title: "Provenance on every number",
    body: "Each figure names the formula behind it, and says when it rests on an estimate rather than something you measured.",
  },
  {
    stage: "Next",
    title: "Longer history",
    body: "Twelve months of volume and consistency, rather than the current rolling six-week window.",
  },
  {
    stage: "Exploring",
    title: "Zone provenance from Strava",
    body: "Reading your configured zones to show which came from real efforts and which from an age formula.",
  },
];

export function Roadmap() {
  return (
    <section id="roadmap" className="scroll-mt-24 bg-landing-black px-6 pb-24">
      <div className="mx-auto max-w-6xl border-t border-white/10 pt-20">
        <h2 className="font-heading text-4xl font-semibold leading-[1.1] tracking-[-0.02em] text-white sm:text-5xl">
          What&apos;s next
        </h2>
        <p className="mt-5 max-w-xl text-lg leading-relaxed text-white/60">
          Thríamvos is actively evolving. Here&apos;s what we&apos;re building toward.
        </p>

        <div className="mt-12 grid gap-4 md:grid-cols-3">
          {ROADMAP_ITEMS.map((item) => (
            <div
              key={item.title}
              className="rounded-[var(--radius-bento)] border border-white/10 bg-white/[0.04] p-8"
            >
              <p className="text-xs uppercase tracking-wider text-accent">{item.stage}</p>
              <p className="mt-4 font-heading text-2xl font-semibold tracking-[-0.01em] text-white">
                {item.title}
              </p>
              <p className="mt-3 leading-relaxed text-white/60">{item.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
