export const metadata = { title: "How Scores Are Calculated — Thríamvos" };

export default function TransparencyPage() {
  return (
    <>
      <h1>How Your Scores Are Calculated</h1>
      <p>Last updated: September 9, 2026</p>

      <p>
        This page explains, in plain language, how Thríamvos computes the numbers it shows you. We&apos;re
        publishing it because we think you should be able to see exactly how a score about your own body was
        produced — not just be told to trust it.
      </p>

      <h2>1. These Are Formulas, Not AI</h2>
      <p>
        Every metric in Thríamvos is calculated arithmetically — the same math every time, given the same
        inputs. Nothing in this Service uses machine learning, predictive models, or artificial intelligence
        to generate your scores, and nothing about you is used to train any model. There is no automated
        decision-making that produces legal or similarly significant effects about you (for example, nothing
        here is used to approve, deny, or price anything) — everything shown is informational, for your own
        use.
      </p>
      <p>
        Most of what follows comes straight from published sports-science literature. Two things do not: the
        isometric weighting in section 4 and the readiness weighting in section 6 are our own judgement
        calls. Both are stated in full below, with their exact numbers, so you can disagree with them
        knowingly rather than take them on trust.
      </p>

      <h2>2. Acute:Chronic Workload Ratio (ACWR)</h2>
      <p>
        Compares your last 7 days of training load (&quot;acute&quot;) against your rolling 28-day average
        (&quot;chronic&quot;), using an exponentially-weighted moving average (EWMA) rather than a simple
        weekly sum. A ratio meaningfully above 1 suggests load is rising faster than your body has adapted
        to; a ratio well below 1 suggests a lighter recent period. This is a widely used sports-science
        heuristic, not a personalized medical risk assessment.
      </p>

      <h2>3. TRIMP (Training Impulse)</h2>
      <p>
        Estimates how physiologically demanding a single workout was, using its duration and your heart rate
        relative to your resting and maximum heart rate (the Banister exponential formula). It requires
        heart-rate data from that activity <em>and</em> your sex, resting heart rate and maximum heart rate
        from your profile. Without all of those, that workout&apos;s load falls back to its duration in
        minutes — a proxy, not a physiological measure. We label which of the two produced any number you
        see rather than presenting them as the same thing.
      </p>
      <p>
        <strong>Where your maximum heart rate came from matters.</strong> When you enter it, we ask whether
        you measured it in a real effort or estimated it from an age formula, and we store that answer. An
        estimated maximum means every TRIMP value derived from it is partly a birthday formula rather than
        anything you have actually done, and we say so wherever those numbers appear. If you have never
        tested it, treat heart-rate-weighted load as directional.
      </p>

      <h2>4. Session RPE (sRPE)</h2>
      <p>
        For workouts that can&apos;t be measured by heart rate — strength training, isometric holds, and
        other non-GPS activities — we use your own self-reported perceived exertion (RPE, 0–10) multiplied by
        session duration instead.
      </p>
      <p>
        One session type carries a multiplier on top of that: ISOPHIT-style isometric holds are weighted at
        <strong> 1.2×</strong>, because sustained-tension work tends to under-report strain through
        RPE × duration alone. Everything else is weighted at 1.0×, meaning no adjustment. Unlike the Banister
        coefficients in TRIMP, that 1.2 is <em>our</em> judgement rather than a published constant — we name
        it here rather than fold it silently into your numbers.
      </p>

      <h2>5. Autonomic Recovery Index</h2>
      <p>
        Compares today&apos;s resting heart rate, HRV, sleep, and respiratory rate (whichever you&apos;ve
        provided) against your own rolling personal baseline, expressed in standard-deviation units. It uses
        only your own history — never anyone else&apos;s data — to build that baseline, and gracefully
        adjusts if you&apos;ve only provided some of the four signals on a given day.
      </p>
      <p>
        <strong>A note on HRV:</strong> Apple HealthKit&apos;s HRV metric is SDNN, not rMSSD — two related but
        different ways of measuring the same underlying signal. If your data comes from a different source,
        make sure it&apos;s reporting a consistent metric over time, since mixing HRV algorithms would distort
        your baseline.
      </p>
      <p>
        <strong>A minimum before we score anything:</strong> a signal needs at least{" "}
        <strong>7 readings</strong> before we will measure a day against it. Below that, the standard
        deviation is dominated by day-to-day noise and a z-score computed from it would look precise while
        meaning very little. Signals that haven&apos;t cleared the threshold are excluded, and if none have,
        we show no score at all rather than a neutral-looking number built from nothing.
      </p>

      <h2>6. Readiness Score</h2>
      <p>
        The single readiness number combines the Autonomic Recovery Index above with your training load.
        <strong> Unlike everything else on this page, this one is not a published formula.</strong> Weighing
        recovery against load is a product judgement, so rather than ship it as a proprietary index we
        publish the weighting here and version it. Current version: <strong>1.0.0</strong>.
      </p>
      <ul>
        <li>
          <strong>Autonomic recovery — 60%.</strong> The 0–100 index from section 5, used as-is.
        </li>
        <li>
          <strong>Training load — 40%.</strong> Derived from your ACWR. At or below <strong>1.30</strong>{" "}
          this contributes its full value: a low ratio means fresh legs, which is not a readiness problem.
          Above 1.30 it falls in a straight line to zero at <strong>2.00</strong>.
        </li>
        <li>
          <strong>When one half is missing</strong> — no health readings yet, or no activities yet — the
          other half carries the whole score, and we show which one did.
        </li>
        <li>
          <strong>When both are missing</strong>, there is no score. We say so instead of printing a number.
        </li>
      </ul>
      <p>
        Because the two halves are always shown separately alongside the total, you can see exactly how much
        of any given day&apos;s number came from your body and how much came from your training.
      </p>

      <h2>7. Limitations</h2>
      <ul>
        <li>
          These formulas are established heuristics from sports-science and physiology literature, not
          diagnostic tools, and are not validated against your individual medical history.
        </li>
        <li>
          Your personal baseline needs a meaningful history to be reliable — early scores, or scores computed
          from very few readings, are less statistically meaningful than ones built from weeks of consistent
          data.
        </li>
        <li>
          Missing or inconsistent source data (e.g. a wearable not worn overnight) will produce missing or
          less reliable scores, not an error — the Service is transparent about what it did and didn&apos;t
          have to work with.
        </li>
      </ul>

      <h2>8. Questions</h2>
      <p>
        If anything here is unclear, or you want more detail on a specific calculation, email
        sweatisfree@gmail.com.
      </p>
    </>
  );
}
