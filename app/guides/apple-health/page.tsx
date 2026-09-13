import Link from "next/link";
import type { ReactNode } from "react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Panel } from "@/components/ui/Panel";

export const metadata = {
  title: "Connecting Apple Health — Thríamvos",
  description:
    "How to forward resting heart rate, HRV, sleep and respiratory rate from Apple Health to Thríamvos using Health Auto Export.",
};

// Public on purpose. The commonest question this answers — "will this work with
// my watch, and what will it cost me?" — is asked before signing up, so putting
// it behind the login would be answering it for the wrong people.

function Step({ n, title, children }: { n: number; title: string; children: ReactNode }) {
  return (
    <li className="flex gap-4">
      <span
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-accent/40 font-heading text-sm font-semibold text-accent"
        aria-hidden
      >
        {n}
      </span>
      <div className="min-w-0 pt-1">
        <h3 className="font-heading font-semibold text-foreground">{title}</h3>
        <div className="mt-1.5 space-y-2 leading-relaxed text-body">{children}</div>
      </div>
    </li>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="mt-12">
      <h2 className="font-heading text-lg font-semibold tracking-[-0.01em] text-foreground">{title}</h2>
      <div className="mt-4 space-y-4 leading-relaxed text-body">{children}</div>
    </section>
  );
}

const METRICS = [
  { name: "Resting Heart Rate", use: "The baseline signal — a rise above your own normal is the clearest sign of accumulated fatigue." },
  { name: "Heart Rate Variability", use: "Beat-to-beat variation overnight, the main input to the Autonomic Recovery Index." },
  { name: "Sleep Analysis", use: "Duration, measured against your own average rather than a fixed eight-hour target." },
  { name: "Respiratory Rate", use: "Overnight breathing rate, which drifts up under illness or heavy load." },
];

export default function AppleHealthGuidePage() {
  return (
    <>
      <PageHeader title="Connecting Apple Health">
        Resting heart rate, HRV, sleep and respiratory rate, forwarded from your watch to Thríamvos.
        About ten minutes, once.
      </PageHeader>

      <main className="mx-auto w-full max-w-3xl flex-1 px-4 pb-16 pt-8 sm:px-6">
        <Panel padding="dense" className="text-body">
          <h2 className="font-heading font-semibold text-foreground">Before you start</h2>
          <ul className="mt-2 space-y-1.5 text-sm [&_li]:ml-5 [&_li]:list-disc">
            <li>An Apple Watch, or another wearable that writes to Apple Health, worn overnight.</li>
            <li>
              An iPhone with the <strong className="text-foreground">Health Auto Export</strong> app.
              Automations are a paid feature of that app — a few dollars a month, paid to its
              developer, not to us.
            </li>
            <li>A Thríamvos account, to generate your token in Settings.</li>
          </ul>
        </Panel>

        <Section title="Why a second app is needed at all">
          <p>
            This is the real caveat, and we would rather state it plainly than call it &quot;Apple Health
            integration&quot; and leave the bridge unmentioned.{" "}
            <strong className="text-foreground">
              HealthKit is an on-device iOS interface. A website cannot read it — there is no browser
              access to HealthKit at all.
            </strong>{" "}
            Thríamvos is a web app, so the only route is an app on your phone that you configure to
            forward readings to us.
          </p>
          <p>
            Health Auto Export is chosen and configured by you, it is not controlled by us, and its own
            privacy practices govern how it reads your Apple Health data before sending it on. A native
            iOS app would remove that hop entirely. It is on the{" "}
            <Link href="/#roadmap" className="text-accent underline">
              roadmap
            </Link>
            , not built.
          </p>
          <p>
            We point at HealthKit rather than a vendor API because it has the strongest privacy
            architecture of the mainstream options: readings held encrypted on your device, per-data-type
            permission rather than blanket access, and an Apple rule against using that data for
            advertising.
          </p>
        </Section>

        <Section title="Setting it up">
          <ol className="mt-4 space-y-6">
            <Step n={1} title="Generate your token">
              <p>
                In Thríamvos, open{" "}
                <Link href="/settings" className="text-accent underline">
                  Settings → HealthKit Sync
                </Link>{" "}
                and press <strong className="text-foreground">Generate Token</strong>. Copy it straight
                away — it is shown once and never again. The same screen shows your webhook URL.
              </p>
              <p className="text-sm text-muted">
                Treat the token like a password: anyone holding it can post readings to your account.
                Regenerating replaces it and immediately invalidates the old one.
              </p>
            </Step>

            <Step n={2} title="Create a REST API automation">
              <p>
                In Health Auto Export, go to <strong className="text-foreground">Automations</strong> and
                add a new one. Choose <strong className="text-foreground">REST API</strong> as the type
                and paste your webhook URL as the destination. Leave the method as POST and the format
                as JSON.
              </p>
            </Step>

            <Step n={3} title="Add your token as a header">
              <p>
                In the automation&apos;s headers, add one named{" "}
                <code className="rounded bg-background px-1.5 py-0.5 font-mono text-sm text-foreground">
                  X-Health-Token
                </code>{" "}
                and paste your token as its value. This is what tells us the readings are yours — without
                it the request is rejected.
              </p>
            </Step>

            <Step n={4} title="Choose the four metrics">
              <p>
                Select Resting Heart Rate, Heart Rate Variability, Sleep Analysis and Respiratory Rate.
                Anything else you send is ignored rather than stored.
              </p>
            </Step>

            <Step n={5} title="Run it once, then let it schedule">
              <p>
                Trigger the automation by hand to confirm it works, then set it to run daily. Morning is
                the sensible slot — the overnight readings it depends on are complete by then.
              </p>
              <p>
                Back in Thríamvos, <strong className="text-foreground">Settings → Stored readings</strong>{" "}
                should list what arrived within a minute or so.
              </p>
            </Step>
          </ol>
        </Section>

        <Section title="What we ask for, and why">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="py-2 pr-4 font-heading font-semibold text-foreground">Metric</th>
                  <th className="py-2 font-heading font-semibold text-foreground">What it is used for</th>
                </tr>
              </thead>
              <tbody>
                {METRICS.map((m) => (
                  <tr key={m.name} className="border-b border-border/60 align-top">
                    <td className="whitespace-nowrap py-3 pr-4 font-medium text-foreground">{m.name}</td>
                    <td className="py-3 text-body">{m.use}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p>
            Each signal needs <strong className="text-foreground">seven daily readings</strong> before we
            will score a day against it. Below that the spread is mostly noise, so you will see the
            reading stored but no recovery figure yet — that is deliberate, not a fault.
          </p>
        </Section>

        <Section title="When nothing arrives">
          <ul className="space-y-3 [&_li]:ml-5 [&_li]:list-disc">
            <li>
              <strong className="text-foreground">Rejected as unauthorised.</strong> The header name must
              be exactly <code className="font-mono">X-Health-Token</code>, and the value must be the
              token as copied — a trailing space is the usual culprit. If you have generated a token
              since setting the automation up, the old one no longer works.
            </li>
            <li>
              <strong className="text-foreground">Accepted, but nothing stored.</strong> The export
              probably contained none of the four metrics above. Check the automation&apos;s selection,
              and check the watch actually recorded that night — HRV and resting heart rate need it worn
              while you sleep.
            </li>
            <li>
              <strong className="text-foreground">It worked once and stopped.</strong> Health Auto Export
              needs background permission on the phone to run on a schedule. Confirm the automation is
              enabled and that the app is allowed to refresh in the background.
            </li>
            <li>
              <strong className="text-foreground">Readings land on the wrong day.</strong> We record a
              reading against the date the export gives it. An automation running before midnight can
              attribute a night to the previous day; moving the schedule to the morning fixes it.
            </li>
          </ul>
        </Section>

        <Section title="No watch?">
          <p>
            Training load works regardless — it comes from{" "}
            <Link href="/settings" className="text-accent underline">
              Strava
            </Link>
            , which needs no wearable at all. Recovery scoring needs overnight vitals, but you can type
            them in yourself under <strong className="text-foreground">Settings → Manual entry</strong>;
            any subset is fine, and the same seven-reading threshold applies.
          </p>
        </Section>

        <Section title="What we receive">
          <p>
            Only the four metrics listed above, as daily values. We do not receive your workouts from
            Apple Health, your location, or anything else in your Health app. What arrives is stored
            against your account under row-level security, and covered by the{" "}
            <Link href="/privacy" className="text-accent underline">
              Privacy Policy
            </Link>
            . You can export or delete all of it from{" "}
            <Link href="/settings" className="text-accent underline">
              Settings → Your data
            </Link>{" "}
            at any time, and delete individual readings one by one.
          </p>
        </Section>

        <p className="mt-14 text-sm text-muted">
          Stuck on a step? Email{" "}
          <strong className="text-foreground">sweatisfree@gmail.com</strong> and say which number you
          reached.
        </p>
      </main>
    </>
  );
}
