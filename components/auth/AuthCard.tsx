"use client";

import { useState, type FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import { useSupabaseAuth } from "@/components/providers/SupabaseProvider";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Panel } from "@/components/ui/Panel";
import { PageHeading } from "@/components/ui/Heading";
import { cn } from "@/lib/utils/cn";

const AUTH_PANEL_CLASS = "mx-auto w-full max-w-md p-8 text-center sm:p-10";
const AUTH_PANEL_PROPS = { padding: "none", className: AUTH_PANEL_CLASS } as const;

export function AuthCard() {
  const { session, isLoading } = useSupabaseAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  // Landing-page CTAs arrive as /login?next=checkout. Stripe Checkout has to
  // be created server-side against a verified user id, so an anonymous
  // visitor cannot go straight to payment — but the intent shouldn't be lost
  // at the login screen either, which is what used to happen.
  const wantsCheckout = searchParams.get("next") === "checkout";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [message, setMessage] = useState<{ text: string; isError: boolean } | null>(null);
  const [isRedirecting, setIsRedirecting] = useState(false);

  // Goes to Settings rather than straight to Stripe. Checkout used to be
  // opened directly from here, which meant anyone holding a code was sent to
  // Stripe with no way to apply it: payment_method_collection is fixed when
  // the session is created, so a code typed on Stripe's own page can never
  // remove the card requirement. Settings is the one screen with the code
  // field, so the journey has to pass through it.
  function continueToSubscribe() {
    setIsRedirecting(true);
    router.push("/settings");
  }

  async function handleLogin(event: FormEvent) {
    event.preventDefault();
    setMessage(null);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setMessage({ text: error.message, isError: true });
      return;
    }
    if (wantsCheckout) continueToSubscribe();
  }

  async function handleSignup() {
    setMessage(null);
    if (!agreedToTerms) {
      setMessage({
        text: "You must confirm you are 18 or older and agree to the Terms and Privacy Policy to sign up.",
        isError: true,
      });
      return;
    }
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) {
      setMessage({ text: error.message, isError: true });
      return;
    }
    if (!data.session) {
      // Email confirmation is on, so there's no session to check out with yet.
      setMessage({
        text: wantsCheckout
          ? "Check your email to confirm your account, then sign in to start your trial."
          : "Check your email to confirm your account.",
        isError: false,
      });
      return;
    }
    if (wantsCheckout) continueToSubscribe();
  }

  async function handleLogout() {
    await supabase.auth.signOut();
  }

  if (isLoading) return null;

  if (session) {
    return (
      <Panel {...AUTH_PANEL_PROPS}>
        <p className="mb-6 text-lg text-muted">Welcome back, {session.user.email}!</p>

        {/* Already signed in and arrived here from a trial CTA — offer the
            next step rather than dead-ending on a log-out button. */}
        {wantsCheckout && (
          <>
            <Button className="mb-3 w-full" onClick={continueToSubscribe} disabled={isRedirecting}>
              {isRedirecting ? "Opening…" : "Continue to your free trial"}
            </Button>
            <p className="mb-6 text-sm text-muted">
              14 days free, then $4.99/month. Cancel any time before it ends.
            </p>
          </>
        )}

        {message && (
          <p className={cn("mb-4 text-sm", message.isError ? "text-warning" : "text-success")}>
            {message.text}
          </p>
        )}

        <Button variant="ghost" onClick={handleLogout} disabled={isRedirecting}>
          Log Out
        </Button>
      </Panel>
    );
  }

  return (
    <Panel {...AUTH_PANEL_PROPS}>
      <PageHeading className="mb-4">Welcome to Thríamvos</PageHeading>
      <p className="mb-8 text-lg text-muted">
        {wantsCheckout
          ? "Create an account to start your 14-day free trial. We need it to attach the subscription to you."
          : "Training readiness and recovery, powered by Strava and Apple Health."}
      </p>
      <form onSubmit={handleLogin} className="space-y-3">
        <Input
          type="email"
          placeholder="Email"
          autoComplete="email"
          required
          value={email}
          onChange={(event) => setEmail(event.target.value)}
        />
        <Input
          type="password"
          placeholder="Password"
          autoComplete="current-password"
          required
          value={password}
          onChange={(event) => setPassword(event.target.value)}
        />
        <label className="flex items-start gap-2 text-sm text-muted">
          <input
            type="checkbox"
            className="mt-0.5"
            checked={agreedToTerms}
            onChange={(event) => setAgreedToTerms(event.target.checked)}
          />
          <span>
            I am 18 or older, and I agree to the{" "}
            <a href="/terms" target="_blank" rel="noopener noreferrer" className="text-accent underline">
              Terms and Conditions
            </a>{" "}
            and{" "}
            <a href="/privacy" target="_blank" rel="noopener noreferrer" className="text-accent underline">
              Privacy Policy
            </a>
            .
          </span>
        </label>
        <div className="flex gap-3">
          <Button type="submit" className="flex-1">
            Log In
          </Button>
          <Button
            type="button"
            variant="ghost"
            className="flex-1"
            onClick={handleSignup}
            disabled={!agreedToTerms}
          >
            Sign Up
          </Button>
        </div>
      </form>
      {message && (
        <p
          className={cn(
            "mt-3 min-h-[1.2rem] text-sm",
            message.isError ? "text-warning" : "text-success",
          )}
        >
          {message.text}
        </p>
      )}
    </Panel>
  );
}
