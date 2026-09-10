import Link from "next/link";

// The background is a placeholder gradient asset — swap
// /public/marketing/hero-placeholder.svg for real photography.
export function Hero() {
  // -mt-20 (80px) intentionally exceeds the sticky nav's ~74px so the image
  // reaches the top edge at every breakpoint, with no background strip.
  return (
    <section className="relative -mt-20 flex min-h-[86svh] items-center overflow-hidden">
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{ backgroundImage: "url(/marketing/hero-placeholder.svg)" }}
      />
      <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/45 to-transparent" />
      <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-black/45 to-transparent" />

      <div className="relative mx-auto w-full max-w-6xl px-6 pb-16 pt-[136px]">
        <h1 className="max-w-3xl font-heading text-[2.75rem] font-medium leading-[1.06] tracking-[-0.02em] text-white sm:text-6xl lg:text-7xl">
          Know when to push.
          <br />
          Know when to rest.
        </h1>

        <p className="mt-7 max-w-xl text-lg leading-relaxed text-white/80">
          Thríamvos reads the training you already log and the recovery signals your body already
          gives off, and turns them into one number each morning — with the working shown, so you
          can see how it got there.
        </p>

        <div className="mt-10 flex flex-col gap-3 sm:flex-row">
          <Link
            href="/login"
            className="rounded-full bg-white px-8 py-4 text-center font-semibold text-[var(--landing-ink)] transition-opacity hover:opacity-90"
          >
            Start Free — No Card Required
          </Link>
          <Link
            href="/transparency"
            className="rounded-full border border-white/30 bg-white/5 px-8 py-4 text-center font-semibold text-white backdrop-blur-sm transition-colors hover:bg-white/15"
          >
            See How It&apos;s Calculated
          </Link>
        </div>

        <p className="mt-5 text-sm text-white/60">
          3-day free trial · cancel anytime · no credit card to start
        </p>
      </div>
    </section>
  );
}
