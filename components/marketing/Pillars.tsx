const PILLARS = [
  {
    title: "Training Load, Quantified",
    body:
      "Every run and ride you log on Strava feeds an exponentially-weighted Acute:Chronic Workload Ratio — the same load-monitoring math sports scientists use to flag when training is ramping up faster than your body has adapted to.",
  },
  {
    title: "Recovery That Listens to You",
    body:
      "Resting heart rate and HRV from Apple Health — or your own manual entries — build a personal baseline, then measure each day against it. No generic benchmarks, just your own history.",
  },
];

export function Pillars() {
  return (
    <section className="mx-auto grid w-full max-w-6xl gap-6 px-4 py-16 sm:px-6 md:grid-cols-2">
      {PILLARS.map((pillar) => (
        <div key={pillar.title} className="rounded-[var(--radius-theme)] border border-border bg-surface p-8">
          <h2 className="font-heading text-2xl font-bold">{pillar.title}</h2>
          <p className="mt-3 text-muted">{pillar.body}</p>
        </div>
      ))}
    </section>
  );
}
