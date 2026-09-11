import Link from "next/link";
import type { ReactNode } from "react";
import { PageHeading } from "@/components/ui/Heading";

export const metadata = { title: "FAQ — Thríamvos" };

// Deliberately outside the (legal) route group: those pages carry a
// "not legal advice" banner that would be wrong here, but the prose styling
// is shared so the two read as the same document family.
const PROSE_CLASS =
  "mt-8 space-y-5 text-sm leading-relaxed text-muted [&_strong]:text-foreground [&_a]:text-accent [&_a]:underline";

interface Entry {
  question: string;
  answer: ReactNode;
}

interface Section {
  title: string;
  entries: Entry[];
}

const SECTIONS: Section[] = [
  {
    title: "How it works",
    entries: [
      {
        question: "Why don’t I have a readiness score yet?",
        answer: (
          <>
            A signal needs at least <strong>7 daily readings</strong> before we will measure a day
            against it. Below that, the standard deviation is dominated by day-to-day noise, and a
            score computed from it would look precise while meaning very little. Until you clear that
            threshold you will see training load — which works immediately from your Strava history —
            and an explicit &quot;not scored yet&quot; where the readiness figure will go.
          </>
        ),
      },
      {
        question: "Why does the app sometimes show nothing instead of a number?",
        answer: (
          <>
            Because that is the honest output. Most apps always show you something. If the data behind
            a figure is too thin to support it, we show nothing and say why. A number you cannot trust
            is worse than no number, particularly when you are about to make a training decision with
            it.
          </>
        ),
      },
      {
        question: "Is any of this AI?",
        answer: (
          <>
            No. Every metric is arithmetic — established sports-science formulas computed the same way
            every time, given the same inputs. Nothing you provide is used to train any model. Two of
            the numbers are our own judgement rather than published literature: the weighting applied
            to isometric work, and the recovery-versus-load split behind the readiness score. Both are
            stated in full, with their exact values, on the{" "}
            <Link href="/transparency">transparency page</Link>.
          </>
        ),
      },
      {
        question: "Is this medical advice?",
        answer: (
          <>
            No. Thríamvos is not a medical device and does not diagnose, treat or assess medical risk.
            The figures are general wellness indicators derived from sports-science formulas, not a
            substitute for professional judgement. Consult a qualified physician before making
            decisions about your training or health, and seek medical attention for any concern
            regardless of what the app shows.
          </>
        ),
      },
    ],
  },
  {
    title: "Devices and integrations",
    entries: [
      {
        question: "Why only Strava and Apple Health?",
        answer: (
          <>
            Because both are <strong>hubs rather than endpoints</strong>. A great many watches, bike
            computers and training apps can already push their activities into Strava, so connecting
            Strava often captures data from hardware we have never integrated with directly — that is
            Strava&apos;s own integrations doing the work, not ours. Apple Health plays the same role
            for an Apple Watch and the iPhone apps that write to it. Supporting the two aggregation
            points reaches far more data than chasing individual devices would.
          </>
        ),
      },
      {
        question: "Isn’t that just because it’s easier?",
        answer: (
          <>
            Partly, and worth saying so. Every integration is real ongoing work — authentication, token
            refresh, rate limits, mapping someone else&apos;s data model onto ours — and it keeps
            costing after launch. Two supported properly is better than six supported badly. Additional
            sources are on the <Link href="/#roadmap">roadmap</Link> rather than promised.
          </>
        ),
      },
      {
        question: "Why Apple Health rather than another source of vitals?",
        answer: (
          <>
            HealthKit has the strongest privacy architecture of the mainstream options. Readings are
            held encrypted on your device; an app must request permission for each specific data type
            rather than receiving blanket access; you can grant or revoke those permissions
            individually; and Apple prohibits using HealthKit data for advertising. Starting from the
            most protective source means the weakest link in the chain is our own handling — which is
            the part we document rather than the part we hide.
          </>
        ),
      },
      {
        question: "Then why do I need a separate third-party app to sync it?",
        answer: (
          <>
            This is the real caveat, and we would rather state it than describe the setup as
            &quot;Apple Health integration&quot; and leave the bridge unmentioned.{" "}
            <strong>
              HealthKit is an on-device iOS interface. A website cannot read it — there is no browser
              access to HealthKit at all.
            </strong>{" "}
            Thríamvos is currently a web app, so the only route is an app on your phone that you
            configure to forward readings to us, and we point at Health Auto Export for that. It is
            chosen and configured by you, it is not controlled by us, and its own privacy practices
            govern how it reads your Apple Health data before sending it on. A native iOS app would
            remove that hop entirely; it is not built yet.
          </>
        ),
      },
      {
        question: "Do I need an Apple Watch?",
        answer: (
          <>
            For automatic recovery data, effectively yes — resting heart rate and heart-rate
            variability come from a wearable worn overnight, and detailed sleep staging needs one too.
            Without a watch you can enter readings by hand in Settings, and training load from Strava
            works regardless of what you wear.
          </>
        ),
      },
      {
        question: "What if I’ve never measured my maximum heart rate?",
        answer: (
          <>
            Then every heart-rate-weighted load figure is partly an estimate, and the app says so. When
            you enter a maximum heart rate we ask whether you <strong>measured</strong> it in a real
            effort or <strong>estimated</strong> it from an age formula, we store that answer, and we
            label the numbers that depend on it. If it is estimated, treat load as directional rather
            than precise.
          </>
        ),
      },
    ],
  },
  {
    title: "Your data",
    entries: [
      {
        question: "Who can see my data?",
        answer: (
          <>
            Only you. Every table holding your activity or health data uses row-level security scoped
            to your account. There are no third-party analytics, advertising or tracking SDKs in the
            Service, and we do not sell or share your data with anyone — not aggregated, not
            anonymised, not raw. The <Link href="/privacy">Privacy Policy</Link> has the full picture.
          </>
        ),
      },
      {
        question: "What happens to my Strava access tokens?",
        answer: (
          <>
            They are stored server-side only and never exposed to your browser. They are locked down
            further than the rest of your data: not even you can read them back through the app,
            because only a narrow, purpose-built server process is permitted to touch them.
          </>
        ),
      },
      {
        question: "Can I delete my data?",
        answer: (
          <>
            Yes — email <strong>sweatisfree@gmail.com</strong> and we will delete it. There is no
            self-service delete button in the app yet. That is a genuine gap rather than a policy, and
            requests are handled manually in the meantime.
          </>
        ),
      },
    ],
  },
  {
    title: "Trial and billing",
    entries: [
      {
        question: "Why is the free trial 14 days?",
        answer: (
          <>
            Because a shorter one could not show you the product. The readiness score needs roughly a
            week of readings before it produces a number at all, so a three-day trial would have ended
            before you ever saw the thing you were being asked to pay for.
          </>
        ),
      },
      {
        question: "Do you take card details up front?",
        answer: (
          <>
            Yes. Payment details are collected when the trial starts so the subscription can begin
            automatically at the end of it. You are not charged during the trial, and cancelling any
            time before it ends means you are not charged at all.
          </>
        ),
      },
      {
        question: "What happens if I cancel?",
        answer: (
          <>
            Future billing stops and your access continues until the end of the period you have
            already paid for. Charges already taken are not refunded — see the{" "}
            <Link href="/refund-policy">Refund Policy</Link>.
          </>
        ),
      },
    ],
  },
];

export default function FaqPage() {
  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-10 sm:px-6">
      <Link href="/" className="text-sm text-accent underline">
        ← Back to Thríamvos
      </Link>

      <div className="mt-6">
        <PageHeading>Questions</PageHeading>
        <p className="mt-3 text-muted">
          The things worth knowing before you trust a number about your own body.
        </p>
      </div>

      {SECTIONS.map((section) => (
        <section key={section.title} className="mt-12">
          <h2 className="font-heading text-lg font-semibold tracking-[-0.01em] text-foreground">
            {section.title}
          </h2>
          <div className={PROSE_CLASS}>
            {section.entries.map((entry) => (
              <div key={entry.question}>
                <h3 className="font-semibold text-foreground">{entry.question}</h3>
                <p className="mt-1.5">{entry.answer}</p>
              </div>
            ))}
          </div>
        </section>
      ))}

      <p className="mt-14 text-sm text-muted">
        Something not answered here? Email{" "}
        <strong className="text-foreground">sweatisfree@gmail.com</strong>.
      </p>
    </main>
  );
}
