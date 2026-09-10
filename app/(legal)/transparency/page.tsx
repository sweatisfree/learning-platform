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
        Every metric in Thríamvos is calculated using fixed, published sports-science formulas — the same
        math every time, given the same inputs. Nothing in this Service uses machine learning, predictive
        models, or artificial intelligence to generate your scores, and nothing about you is used to train
        any model. There is no automated decision-making that produces legal or similarly significant effects
        about you (for example, nothing here is used to approve, deny, or price anything) — everything shown
        is informational, for your own use.
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
        heart-rate data from that activity; workouts without heart-rate data fall back to duration alone.
      </p>

      <h2>4. Session RPE (sRPE)</h2>
      <p>
        For workouts that can&apos;t be measured by heart rate — strength training, isometric holds, and
        other non-GPS activities — we use your own self-reported perceived exertion (RPE, 0–10) multiplied by
        session duration instead.
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

      <h2>6. Limitations</h2>
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

      <h2>7. Questions</h2>
      <p>
        If anything here is unclear, or you want more detail on a specific calculation, email
        sweatisfree@gmail.com.
      </p>
    </>
  );
}
