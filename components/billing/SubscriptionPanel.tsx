"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import {
  describeSubscription,
  openBillingPortal,
  startCheckout,
  type Subscription,
} from "@/lib/stripe/subscription";

// A subscription row exists as soon as checkout is started, but only counts as
// a real subscription once Stripe reports a status back through the webhook.
function hasStartedSubscription(subscription: Subscription | null): boolean {
  return subscription?.status != null;
}

export function SubscriptionPanel({
  subscription,
  isLoaded,
}: {
  subscription: Subscription | null;
  isLoaded: boolean;
}) {
  const [error, setError] = useState<string | null>(null);
  const [isBusy, setIsBusy] = useState(false);
  const [promotionCode, setPromotionCode] = useState("");

  async function run(action: () => Promise<void>) {
    setError(null);
    setIsBusy(true);
    try {
      await action();
      // On success the browser navigates to Stripe, so isBusy stays true.
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : "Something went wrong.");
      setIsBusy(false);
    }
  }

  if (!isLoaded) {
    return <p className="text-sm text-muted">Loading…</p>;
  }

  if (!hasStartedSubscription(subscription)) {
    return (
      <>
        <p className="mb-4 text-sm text-muted">
          14 days free, then $4.99/month. Card details are taken up front so the subscription starts
          automatically when the trial ends — cancel any time before then and you won&apos;t be charged.
        </p>

        {/* One button, not two. Previously a separate "apply code" button sat
            below the main one, and the obvious button was the wrong one for
            anyone holding a code — they'd land on Stripe with no way to enter
            it, because we don't expose Stripe's own promo field. The code is
            now simply part of this form: filled means apply it, empty means
            the normal card-collecting path. */}
        <label className="mb-4 block">
          <span className="mb-1 block text-sm text-muted">Code (optional)</span>
          <Input
            value={promotionCode}
            onChange={(event) => setPromotionCode(event.target.value)}
            placeholder="Enter a code, or leave blank"
            autoComplete="off"
          />
        </label>

        <Button onClick={() => run(() => startCheckout(promotionCode))} disabled={isBusy}>
          {isBusy ? "Opening…" : "Start free trial"}
        </Button>

        {promotionCode.trim() !== "" && (
          <p className="mt-3 text-xs text-muted">
            The code is applied before checkout opens. If it covers the full amount you won&apos;t be
            asked for a card — and with nothing on file, the subscription stops at the end of the
            trial instead of converting.
          </p>
        )}

        {error && <p className="mt-3 text-sm text-warning">{error}</p>}
      </>
    );
  }

  return (
    <>
      <p className="mb-1 text-sm text-foreground">{describeSubscription(subscription!)}</p>
      <p className="mb-4 text-sm text-muted">
        Cancelling stops future billing and keeps your access until the end of the period
        you&apos;ve already paid for. Charges already made are not refunded.
      </p>
      <Button variant="ghost" onClick={() => run(openBillingPortal)} disabled={isBusy}>
        {isBusy ? "Opening…" : "Manage billing"}
      </Button>
      {error && <p className="mt-3 text-sm text-warning">{error}</p>}
    </>
  );
}
