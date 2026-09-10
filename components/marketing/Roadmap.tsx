// Placeholder copy — directionally plausible, deliberately non-committal.
// Replace with the actual roadmap before shipping; these are not promises.
const ROADMAP_ITEMS = [
  {
    title: "Sleep & respiratory-rate tracking",
    body: "Folding two more HealthKit vitals into the Autonomic Recovery Index alongside HRV and resting heart rate.",
  },
  {
    title: "Deeper recovery insights",
    body: "More context on why a score moved, not just the number.",
  },
  {
    title: "Expanded wearable support",
    body: "Exploring additional sources beyond Strava and Apple Health.",
  },
];

export function Roadmap() {
  return (
    <section id="roadmap" className="mx-auto w-full max-w-6xl scroll-mt-20 px-4 py-16 sm:px-6">
      <h2 className="text-center font-heading text-3xl font-bold">What&apos;s Next</h2>
      <p className="mx-auto mt-3 max-w-xl text-center text-muted">
        Thríamvos is actively evolving. Here&apos;s what we&apos;re exploring.
      </p>

      <div className="mx-auto mt-10 grid max-w-4xl gap-4 sm:grid-cols-3">
        {ROADMAP_ITEMS.map((item) => (
          <div key={item.title} className="rounded-[var(--radius-theme)] border border-border bg-surface p-6">
            <p className="font-semibold text-foreground">{item.title}</p>
            <p className="mt-2 text-sm text-muted">{item.body}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
