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
          14 days free, then $4.99/month. We take card details up front so the subscription can start
          automatically when the trial ends — cancel any time before then and you won&apos;t be charged.
        </p>
        <Button onClick={() => run(() => startCheckout())} disabled={isBusy}>
          {isBusy ? "Opening…" : "Start free trial"}
        </Button>

        <div className="mt-5 border-t border-border pt-4">
          <label className="block">
            <span className="mb-1 block text-sm text-muted">Have a code?</span>
            <Input
              value={promotionCode}
              onChange={(event) => setPromotionCode(event.target.value)}
              placeholder="Promotion code"
              autoComplete="off"
            />
          </label>
          <p className="mt-2 text-xs text-muted">
            A code is applied before checkout opens. If it covers the full amount, no card is
            requested — so a fully-discounted subscription has nothing to charge when the trial ends
            and will simply stop rather than convert.
          </p>
          <Button
            variant="ghost"
            className="mt-3"
            onClick={() => run(() => startCheckout(promotionCode))}
            disabled={isBusy || promotionCode.trim() === ""}
          >
            {isBusy ? "Opening…" : "Apply code and continue"}
          </Button>
        </div>

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
