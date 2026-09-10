export const metadata = { title: "Cookies Notice — Thríamvos" };

export default function CookiesPage() {
  return (
    <>
      <h1>Cookies Notice</h1>
      <p>Last updated: September 9, 2026</p>

      <p>
        Thríamvos uses a very limited form of browser storage — no advertising or tracking cookies of any
        kind.
      </p>

      <h2>1. What We Use</h2>
      <ul>
        <li>
          <strong>Authentication storage (strictly necessary):</strong> our authentication provider,
          Supabase, stores your session token in your browser&apos;s local storage so you stay signed in
          between visits. Without this, you would need to log in again on every page load.
        </li>
      </ul>
      <p>
        That is the only storage the Service sets. Because it is strictly necessary to provide the service
        you&apos;ve requested (staying logged in), it does not require the cookie-consent banner that
        applies to non-essential cookies under EU ePrivacy rules.
      </p>

      <h2>2. What We Don&apos;t Use</h2>
      <p>
        We do not use analytics cookies, advertising cookies, third-party tracking pixels, or any similar
        technology. No data about your browsing is sold or shared with advertisers.
      </p>

      <h2>3. Managing Storage</h2>
      <p>
        You can clear your browser&apos;s local storage or cookies at any time through your browser settings.
        Doing so will simply log you out of the Service; it does not delete your account or data.
      </p>

      <h2>4. Changes to This Notice</h2>
      <p>
        If this changes in the future — for example, if we add optional analytics — we will update this
        notice and, where required, ask for your consent first.
      </p>

      <h2>5. Contact</h2>
      <p>Questions about this notice can be sent to sweatisfree@gmail.com.</p>
    </>
  );
}
