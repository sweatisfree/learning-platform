export const metadata = { title: "Terms and Conditions — Thríamvos" };

export default function TermsPage() {
  return (
    <>
      <h1>Terms and Conditions</h1>
      <p>Last updated: September 9, 2026</p>

      <p>
        These Terms and Conditions (&quot;Terms&quot;) govern your access to and use of Thríamvos (the
        &quot;Service&quot;), operated by Fitness and Sports Network, LLC, an Oklahoma limited liability
        company doing business as Sweat Is Free (&quot;we,&quot; &quot;us,&quot; or &quot;our&quot;). By
        creating an account or using the Service, you agree to these Terms. If you do not agree, do not use
        the Service.
      </p>

      <h2>1. Eligibility</h2>
      <p>
        You must be at least 18 years old to create an account, since the Service involves paid
        subscriptions and processes health-related data. By registering, you represent that you meet this
        requirement.
      </p>

      <h2>2. Description of the Service</h2>
      <p>
        Thríamvos aggregates athletic training data from Strava and recovery-related biometric data from
        Apple HealthKit (via a third-party export app you configure yourself) or your own manual entries, to
        compute training-load and recovery metrics such as ACWR, TRIMP, sRPE, and an Autonomic Recovery
        Index. See our{" "}
        <a href="/transparency" className="text-accent underline">
          transparency page
        </a>{" "}
        for how these are calculated.
      </p>

      <h2>3. Not Medical Advice</h2>
      <p>
        <strong>
          Thríamvos is not a medical device and does not provide medical advice, diagnosis, or treatment.
        </strong>{" "}
        The metrics and scores shown are general wellness indicators derived from established sports-science
        formulas, not a substitute for professional medical judgment. Always consult a qualified physician
        before making decisions about your training, health, or medication based on information from this
        Service, and seek immediate medical attention for any health concern regardless of what the Service
        shows.
      </p>

      <h2>4. Subscriptions and Billing</h2>
      <p>The Service is offered on the following subscription terms, which may change as described below:</p>
      <ul>
        <li>New accounts receive a 3-day free trial at $0.00 USD.</li>
        <li>
          Unless cancelled before the trial ends, your subscription automatically begins at $4.99 USD per
          month, billed on a recurring monthly cycle.
        </li>
        <li>
          Pricing may change in the future. We will provide reasonable advance notice before any price change
          takes effect for existing subscribers.
        </li>
        <li>
          <strong>No refunds are provided once a billing charge has been made.</strong> See our{" "}
          <a href="/refund-policy" className="text-accent underline">
            Refund Policy
          </a>{" "}
          for full details.
        </li>
        <li>
          Cancelling your subscription stops future billing but does not refund the current period — you
          retain access until the end of the billing period already paid for.
        </li>
      </ul>

      <h2>5. Third-Party Integrations</h2>
      <p>
        The Service connects to Strava and can receive data from third-party HealthKit export apps you
        choose to configure. We are not responsible for the availability, accuracy, security, or practices of
        these third-party services, which have their own terms and privacy policies. Your use of them is
        governed by their respective agreements, not ours.
      </p>

      <h2>6. Acceptable Use</h2>
      <p>You agree not to:</p>
      <ul>
        <li>Use the Service for any unlawful purpose or in violation of these Terms;</li>
        <li>Attempt to gain unauthorized access to another user&apos;s account or data;</li>
        <li>Interfere with, disrupt, or attempt to bypass the security of the Service;</li>
        <li>Use automated means to scrape or extract data from the Service without our written consent.</li>
      </ul>

      <h2>7. Intellectual Property</h2>
      <p>
        The Service, including its design, calculation engines, and branding, is owned by Sweat Is Free. Your
        own data (activities, health readings, and account information) remains yours; we do not claim
        ownership of it.
      </p>

      <h2>8. Disclaimer of Warranties</h2>
      <p>
        The Service is provided &quot;as is&quot; and &quot;as available,&quot; without warranties of any
        kind, express or implied, including fitness for a particular purpose, accuracy, or uninterrupted
        availability. Calculated metrics are estimates based on the data available to us and may be
        incomplete or inaccurate, particularly when underlying source data (e.g. from a wearable device) is
        missing or unreliable.
      </p>

      <h2>9. Limitation of Liability</h2>
      <p>
        To the maximum extent permitted by law, Sweat Is Free will not be liable for any indirect,
        incidental, special, or consequential damages arising from your use of the Service, including any
        decisions made based on the metrics it displays. Our total liability for any claim will not exceed
        the amount you paid us in the 12 months preceding the claim.
      </p>

      <h2>10. Termination</h2>
      <p>
        You may stop using the Service and cancel your subscription at any time. We may suspend or terminate
        accounts that violate these Terms, engage in abusive behavior, or misuse the Service.
      </p>

      <h2>11. Governing Law</h2>
      <p>
        These Terms are governed by the laws of the State of Oklahoma, USA, without regard to its conflict of
        law principles.
      </p>

      <h2>12. Changes to These Terms</h2>
      <p>
        We may update these Terms from time to time. Material changes will be announced via the Service or
        by email. Continued use of the Service after changes take effect constitutes acceptance of the
        revised Terms.
      </p>

      <h2>13. Contact</h2>
      <p>Questions about these Terms can be sent to sweatisfree@gmail.com.</p>
    </>
  );
}
