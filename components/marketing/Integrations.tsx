import Link from "next/link";

// Only the two integrations that actually exist are shown, and as text tiles
// rather than third-party logo files (no redistribution rights for those).
const INTEGRATIONS = [
  { name: "Strava", detail: "Activities, duration, distance, heart rate & power" },
  { name: "Apple Health", detail: "Resting heart rate & HRV via a HealthKit export app" },
];

function PhoneMockup() {
  return (
    <div className="relative w-[258px] rounded-[38px] border border-white/15 bg-[#0f1115] p-2.5 shadow-2xl">
      <div className="overflow-hidden rounded-[30px] bg-background">
        <div className="flex items-center justify-between px-5 pb-3 pt-4 text-[10px] text-white/60">
          <span>9:41</span>
          <span className="h-4 w-16 rounded-full bg-black/60" />
          <span>100%</span>
        </div>

        <div className="px-5 pb-6">
          <p className="text-xs text-muted">Good morning</p>
          <p className="font-heading text-lg font-semibold text-white">Today&apos;s readiness</p>

          <div className="mt-4 rounded-2xl border border-border bg-surface p-4 text-center">
            <p className="font-heading text-5xl font-bold text-success">78</p>
            <p className="mt-1 text-[10px] text-muted">recovery 60% · load 40%</p>
          </div>

          <div className="mt-3 space-y-2">
            {[
              { label: "ACWR", value: "1.08", width: "54%", color: "var(--accent)" },
              { label: "Recovery", value: "+0.6 SD", width: "72%", color: "var(--success)" },
              { label: "7-day load", value: "412", width: "38%", color: "var(--warning)" },
            ].map((row) => (
              <div key={row.label} className="rounded-xl border border-border bg-surface p-3">
                <div className="flex items-baseline justify-between text-[11px]">
                  <span className="text-muted">{row.label}</span>
                  <span className="font-semibold text-white">{row.value}</span>
                </div>
                <div className="mt-2 h-1 rounded-full bg-background">
                  <div
                    className="h-1 rounded-full"
                    style={{ width: row.width, background: row.color }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function IntegrationTile({ name, detail }: { name: string; detail: string }) {
  return (
    <div className="w-full max-w-[236px] rounded-3xl border border-white/12 bg-white/[0.06] p-5 backdrop-blur-sm">
      <p className="font-heading text-lg font-semibold text-white">{name}</p>
      <p className="mt-1.5 text-sm leading-relaxed text-white/60">{detail}</p>
      <p className="mt-3 inline-flex items-center gap-1.5 text-xs text-success">
        <span className="h-1.5 w-1.5 rounded-full bg-success" />
        Connected
      </p>
    </div>
  );
}

export function Integrations() {
  return (
    <section className="overflow-hidden bg-landing-black px-6 pb-6 pt-20 sm:pt-24">
      <div className="mx-auto max-w-6xl">
        <div className="flex flex-col items-center gap-12 lg:flex-row lg:justify-center lg:gap-16">
          <div className="order-2 flex w-full flex-col items-center gap-4 sm:flex-row sm:justify-center lg:order-1 lg:w-auto lg:flex-col lg:items-end">
            <IntegrationTile {...INTEGRATIONS[0]} />
            <div className="w-full max-w-[236px] rounded-3xl border border-dashed border-white/12 p-5">
              <p className="font-heading text-lg font-semibold text-white/50">More sources</p>
              <p className="mt-1.5 text-sm leading-relaxed text-white/35">
                Additional wearables are on the roadmap.
              </p>
              <Link href="#roadmap" className="mt-3 inline-block text-xs text-white/60 underline">
                See what&apos;s next
              </Link>
            </div>
          </div>

          <div className="order-1 lg:order-2">
            <PhoneMockup />
          </div>

          <div className="order-3 flex w-full justify-center lg:w-auto">
            <IntegrationTile {...INTEGRATIONS[1]} />
          </div>
        </div>

        <div className="mt-16 max-w-2xl">
          <h2 className="font-heading text-4xl font-semibold leading-[1.1] tracking-[-0.02em] text-white sm:text-5xl">
            Sync what you
            <br />
            already wear
          </h2>
          <p className="mt-5 text-lg leading-relaxed text-white/60">
            No new hardware, no extra straps. Connect the accounts you already use and Thríamvos does the
            rest — quietly, in the background, every day.
          </p>
        </div>
      </div>
    </section>
  );
}
