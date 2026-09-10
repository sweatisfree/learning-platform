// Deliberately limited to the two integrations that actually exist today.
// No third-party logo images are used (no redistribution rights for them) —
// plain text/wordmark badges instead.
const INTEGRATIONS = [
  { name: "Strava", detail: "Activities, duration, distance, heart rate & power" },
  { name: "Apple Health", detail: "Resting heart rate & HRV, via a HealthKit export app" },
];

export function Integrations() {
  return (
    <section className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6">
      <h2 className="text-center font-heading text-3xl font-bold">Works With What You Already Wear</h2>
      <p className="mx-auto mt-3 max-w-xl text-center text-muted">
        No new hardware to buy. Connect the accounts you already use.
      </p>

      <div className="mx-auto mt-10 grid max-w-2xl gap-4 sm:grid-cols-2">
        {INTEGRATIONS.map((integration) => (
          <div
            key={integration.name}
            className="rounded-[var(--radius-theme)] border border-border bg-surface p-6 text-center"
          >
            <p className="font-heading text-xl font-bold">{integration.name}</p>
            <p className="mt-2 text-sm text-muted">{integration.detail}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
