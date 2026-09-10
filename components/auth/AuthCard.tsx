"use client";

import { useState, type FormEvent } from "react";
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
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [message, setMessage] = useState<{ text: string; isError: boolean } | null>(null);

  async function handleLogin(event: FormEvent) {
    event.preventDefault();
    setMessage(null);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setMessage({ text: error.message, isError: true });
    }
  }

  async function handleSignup() {
    setMessage(null);
    if (!agreedToTerms) {
      setMessage({
        text: "You must agree to the Terms and Conditions and Privacy Policy to sign up.",
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
      setMessage({ text: "Check your email to confirm your account.", isError: false });
    }
  }

  async function handleLogout() {
    await supabase.auth.signOut();
  }

  if (isLoading) return null;

  if (session) {
    return (
      <Panel {...AUTH_PANEL_PROPS}>
        <p className="mb-8 text-lg text-muted">Welcome back, {session.user.email}!</p>
        <Button variant="ghost" onClick={handleLogout}>
          Log Out
        </Button>
      </Panel>
    );
  }

  return (
    <Panel {...AUTH_PANEL_PROPS}>
      <PageHeading className="mb-4">Welcome to Thríamvos</PageHeading>
      <p className="mb-8 text-lg text-muted">
        Training readiness and recovery, powered by Strava and Apple Health.
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
            I agree to the{" "}
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
