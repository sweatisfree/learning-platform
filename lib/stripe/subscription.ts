import { supabase } from "@/lib/supabase/client";
import { authorizedFetch } from "@/lib/supabase/authorizedFetch";

export interface Subscription {
  status: string | null;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
  trialEnd: string | null;
}

// Read directly through RLS rather than via an API route — the subscriptions
// table grants the owner SELECT, and no other user can see the row. Writes
// have no policy at all and only ever happen in the Stripe webhook.
export async function fetchSubscription(): Promise<Subscription | null> {
  const { data, error } = await supabase
    .from("subscriptions")
    .select("status, current_period_end, cancel_at_period_end, trial_end")
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) return null;

  return {
    status: data.status,
    currentPeriodEnd: data.current_period_end,
    cancelAtPeriodEnd: data.cancel_at_period_end,
    trialEnd: data.trial_end,
  };
}

async function redirectToStripe(path: string): Promise<void> {
  const response = await authorizedFetch(path, { method: "POST" });
  const body = (await response.json().catch(() => ({}))) as { url?: string; error?: string };
  if (!response.ok || !body.url) {
    throw new Error(body.error ?? `Request failed: ${response.status}`);
  }
  window.location.href = body.url;
}

export async function startCheckout(): Promise<void> {
  await redirectToStripe("/api/stripe/checkout");
}

export async function openBillingPortal(): Promise<void> {
  await redirectToStripe("/api/stripe/portal");
}

// Stripe's own status vocabulary, rendered in plain language. "trialing" and
// "active" both mean the user has access; the rest are stated plainly rather
// than softened, since billing problems need to be legible.
export function describeSubscription(subscription: Subscription): string {
  switch (subscription.status) {
    case "trialing":
      return subscription.trialEnd
        ? `Free trial — ends ${new Date(subscription.trialEnd).toLocaleDateString()}`
        : "Free trial";
    case "active":
      return subscription.cancelAtPeriodEnd && subscription.currentPeriodEnd
        ? `Active — ends ${new Date(subscription.currentPeriodEnd).toLocaleDateString()}, not renewing`
        : "Active";
    case "past_due":
      return "Payment failed — update your card to keep your subscription";
    case "unpaid":
      return "Unpaid — subscription suspended";
    case "canceled":
      return "Cancelled";
    case "incomplete":
    case "incomplete_expired":
      return "Checkout never completed";
    default:
      return subscription.status ?? "No subscription";
  }
}

// The single definition of "may use the paid app".
//
// Gated on Stripe's own status rather than anything we compute, because the
// webhook writes whatever Stripe reports and the subscriptions table has no
// write policy at all — so access can only ever be granted by a
// signature-verified Stripe event, never by the browser.
//
// "trialing" counts: a trial user has full access for the 14 days.
// "past_due" and "unpaid" do not, so a failed payment removes access.
// "canceled" does not, but note Stripe keeps a cancelled-at-period-end
// subscription as "active" until the period actually elapses — which is
// exactly what the Terms promise ("you retain access until the end of the
// billing period already paid for").
const ACCESS_STATUSES = new Set(["active", "trialing"]);

export function hasActiveAccess(subscription: Subscription | null): boolean {
  return subscription?.status != null && ACCESS_STATUSES.has(subscription.status);
}
