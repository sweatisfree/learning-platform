import Link from "next/link";

// Hero visual: a self-contained readiness-score mockup built from the app's
// real data shape (ACWR, Autonomic Recovery Index) rather than a stock photo
// or fabricated testimonial — there's no photography asset for this product,
// and inventing "real person" imagery would be misleading.
function ReadinessPreview() {
  return (
    <div className="mx-auto w-full max-w-sm rounded-[var(--radius-theme)] border border-border bg-surface p-6">
      <p className="text-sm text-muted">Today&apos;s Readiness</p>
      <p className="mt-1 font-heading text-6xl font-bold text-success">78</p>
      <p className="mt-1 text-sm text-success">Green — good to train</p>

      <div className="mt-6 space-y-4 border-t border-border pt-5">
        <div>
          <div className="flex items-baseline justify-between text-sm">
            <span className="text-muted">Acute:Chronic Workload</span>
            <span className="font-semibold text-foreground">1.08</span>
          </div>
          <div className="mt-1.5 h-1.5 rounded-full bg-background">
            <div className="h-1.5 w-[54%] rounded-full bg-accent" />
          </div>
        </div>
        <div>
          <div className="flex items-baseline justify-between text-sm">
            <span className="text-muted">Autonomic Recovery Index</span>
            <span className="font-semibold text-foreground">+0.6 SD</span>
          </div>
          <div className="mt-1.5 h-1.5 rounded-full bg-background">
            <div className="h-1.5 w-[70%] rounded-full bg-success" />
          </div>
        </div>
      </div>
    </div>
  );
}

export function Hero() {
  return (
    <section className="mx-auto grid w-full max-w-6xl items-center gap-12 px-4 py-16 sm:px-6 lg:grid-cols-2 lg:py-24">
      <div>
        <h1 className="font-heading text-4xl font-bold leading-tight sm:text-5xl">
          Know when to push. Know when to rest.
        </h1>
        <p className="mt-5 text-lg text-muted">
          Thríamvos turns your Strava training data and Apple Health biometrics into one daily readiness
          score — so you stop guessing whether today is a green light or a warning sign.
        </p>

        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <Link
            href="/login"
            className="rounded-[var(--radius-theme)] bg-accent px-7 py-3 text-center font-sans font-semibold text-foreground transition-colors hover:bg-accent-hover"
          >
            Start Free — No Card Required
          </Link>
          <Link
            href="/transparency"
            className="rounded-[var(--radius-theme)] border border-accent bg-transparent px-7 py-3 text-center font-sans font-semibold text-foreground transition-colors hover:bg-accent/10"
          >
            See How It&apos;s Calculated
          </Link>
        </div>
        <p className="mt-4 text-sm text-muted">
          3-day free trial · cancel anytime · no credit card to start
        </p>
      </div>

      <ReadinessPreview />
    </section>
  );
}
