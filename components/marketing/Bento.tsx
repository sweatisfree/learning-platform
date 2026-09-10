import Link from "next/link";

// Card background images are placeholder gradient assets in /public/marketing —
// swap them for real photography without touching this file.
const CARD_BASE =
  "relative flex min-h-[440px] flex-col overflow-hidden rounded-[var(--radius-bento)] p-8 sm:p-10";

// Shows the score with the split that produced it, never a verdict word. The
// app deliberately dropped prescriptive labels ("good to train") in favour of
// descriptive ones, and the marketing page has to make the same promise.
function ReadinessRing() {
  const circumference = 2 * Math.PI * 42;
  return (
    <div className="shrink-0 text-center">
      <div className="relative h-[104px] w-[104px]">
        <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90">
          <circle cx="50" cy="50" r="42" fill="rgba(0,0,0,0.45)" />
          <circle cx="50" cy="50" r="42" fill="none" stroke="rgba(255,255,255,0.14)" strokeWidth="7" />
          <circle
            cx="50"
            cy="50"
            r="42"
            fill="none"
            stroke="var(--accent)"
            strokeWidth="7"
            strokeLinecap="round"
            strokeDasharray={`${circumference * 0.78} ${circumference}`}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="font-heading text-2xl font-semibold text-white">78</span>
          <span className="text-[10px] uppercase tracking-wider text-white/55">today</span>
        </div>
      </div>
      <p className="mt-2 text-[11px] text-white/55">recovery 60% · load 40%</p>
    </div>
  );
}

function LoadChart() {
  return (
    <svg viewBox="0 0 400 130" className="w-full" role="img" aria-label="Illustrative training load chart">
      <defs>
        <linearGradient id="loadFill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="var(--accent)" stopOpacity="0.35" />
          <stop offset="1" stopColor="var(--accent)" stopOpacity="0" />
        </linearGradient>
      </defs>
      <g stroke="rgba(255,255,255,0.09)" strokeWidth="1">
        <line x1="0" y1="35" x2="400" y2="35" />
        <line x1="0" y1="75" x2="400" y2="75" />
        <line x1="0" y1="115" x2="400" y2="115" />
      </g>
      <rect x="96" y="58" width="9" height="57" rx="4.5" fill="var(--success)" opacity="0.85" />
      <rect x="188" y="44" width="9" height="71" rx="4.5" fill="var(--warning)" opacity="0.85" />
      <rect x="286" y="70" width="9" height="45" rx="4.5" fill="var(--success)" opacity="0.6" />
      <path
        d="M0 100 C 48 96, 72 66, 116 62 C 158 58, 186 50, 214 62 C 248 76, 284 92, 320 86 C 356 80, 378 70, 400 66 L400 130 L0 130 Z"
        fill="url(#loadFill)"
      />
      <path
        d="M0 100 C 48 96, 72 66, 116 62 C 158 58, 186 50, 214 62 C 248 76, 284 92, 320 86 C 356 80, 378 70, 400 66"
        fill="none"
        stroke="var(--accent)"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      <circle cx="320" cy="86" r="9" fill="var(--accent)" opacity="0.25" />
      <circle cx="320" cy="86" r="4.5" fill="var(--accent)" />
    </svg>
  );
}

function BaselineBars() {
  const bars = [38, 52, 44, 61, 49, 66, 58, 71, 55, 74, 63, 80, 69, 92];
  return (
    <div className="flex h-32 items-end gap-1.5">
      {bars.map((height, index) => (
        <div
          key={index}
          className="flex-1 rounded-full"
          style={{
            height: `${height}%`,
            background: index === bars.length - 1 ? "var(--success)" : "rgba(255,255,255,0.16)",
          }}
        />
      ))}
    </div>
  );
}

export function Bento() {
  return (
    <section className="bg-landing-light px-4 py-16 sm:px-6 sm:py-20">
      <div className="mx-auto grid max-w-6xl gap-4 lg:grid-cols-2">
        {/* Light copy card with the in-grid CTA, mirroring the reference layout. */}
        <div className={`${CARD_BASE} justify-center bg-landing-light-card`}>
          <h2 className="max-w-sm font-heading text-4xl font-semibold leading-[1.1] tracking-[-0.02em] text-landing-ink sm:text-5xl">
            One number,
            <br />
            and its reasons
          </h2>
          <p className="mt-6 max-w-sm text-lg leading-relaxed text-landing-ink-muted">
            The training you already log and the vitals you already record become a single readiness
            figure each morning — split into the two halves that made it, so you can judge it for
            yourself instead of taking it on faith.
          </p>
          <Link
            href="/login"
            className="mt-9 w-fit rounded-full bg-landing-ink px-7 py-3.5 font-semibold text-white transition-opacity hover:opacity-90"
          >
            Start free
          </Link>
        </div>

        {/* Dark photo card + data viz. */}
        <div className={CARD_BASE}>
          <div
            className="absolute inset-0 bg-cover bg-center"
            style={{ backgroundImage: "url(/marketing/energy-placeholder.svg)" }}
          />
          <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/40 to-black/80" />
          <div className="relative flex h-full flex-col">
            <div className="flex items-start justify-between gap-6">
              <div>
                <h2 className="max-w-xs font-heading text-3xl font-semibold leading-[1.12] tracking-[-0.02em] text-white sm:text-4xl">
                  See your load
                  <br />
                  before you feel it
                </h2>
                <p className="mt-4 max-w-sm leading-relaxed text-white/75">
                  Your last week measured against the base you&apos;ve actually built, so a spike
                  shows up as a number first rather than an injury later.
                </p>
              </div>
              <ReadinessRing />
            </div>
            <div className="mt-auto pt-10">
              <LoadChart />
            </div>
          </div>
        </div>

        {/* Row two. */}
        <div className={CARD_BASE}>
          <div
            className="absolute inset-0 bg-cover bg-center"
            style={{ backgroundImage: "url(/marketing/stress-placeholder.svg)" }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/40 to-black/25" />
          <div className="relative mt-auto">
            <h2 className="max-w-sm font-heading text-3xl font-semibold leading-[1.12] tracking-[-0.02em] text-white sm:text-4xl">
              When it doesn&apos;t know,
              <br />
              it says so
            </h2>
            <p className="mt-4 max-w-md leading-relaxed text-white/75">
              Most apps always show you a number. If your history is too thin for one to mean
              anything, this one shows nothing and tells you why. Every figure that does appear names
              the formula behind it — and flags when it&apos;s leaning on an estimate rather than
              something you actually measured.
            </p>
            <Link
              href="/transparency"
              className="mt-7 inline-block rounded-full border border-white/30 bg-white/10 px-6 py-3 text-sm font-semibold text-white backdrop-blur-sm transition-colors hover:bg-white/20"
            >
              Read the math
            </Link>
          </div>
        </div>

        <div className={CARD_BASE}>
          <div
            className="absolute inset-0 bg-cover bg-center"
            style={{ backgroundImage: "url(/marketing/recovery-placeholder.svg)" }}
          />
          <div className="absolute inset-0 bg-gradient-to-b from-black/75 via-black/45 to-black/80" />
          <div className="relative flex h-full flex-col">
            <h2 className="max-w-sm font-heading text-3xl font-semibold leading-[1.12] tracking-[-0.02em] text-white sm:text-4xl">
              Let recovery
              <br />
              lead the way
            </h2>
            <p className="mt-4 max-w-sm leading-relaxed text-white/75">
              Your normal is built from your own mornings, over weeks — never from a chart of what an
              average body is supposed to do.
            </p>
            <div className="mt-auto pt-10">
              <BaselineBars />
              <div className="mt-4 flex items-center justify-between text-xs text-white/55">
                <span>14-day baseline</span>
                <span className="text-success">+0.6 SD today</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
