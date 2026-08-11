"use client";

import { useState, type FormEvent } from "react";
import { supabase } from "@/lib/supabase/client";
import { useSupabaseAuth } from "@/components/providers/SupabaseProvider";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card } from "@/components/ui/Card";
import { cn } from "@/lib/utils/cn";

export function AuthCard() {
  const { session, isLoading } = useSupabaseAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
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
      <Card>
        <p className="mb-8 text-lg text-muted">Welcome back, {session.user.email}!</p>
        <Button variant="ghost" onClick={handleLogout}>
          Log Out
        </Button>
      </Card>
    );
  }

  return (
    <Card>
      <h1 className="mb-4 font-heading text-4xl font-bold">Welcome to Thríamvos</h1>
      <p className="mb-8 text-lg text-muted">
        Training readiness and recovery, computed on your device.
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
        <div className="flex gap-3">
          <Button type="submit" className="flex-1">
            Log In
          </Button>
          <Button type="button" variant="ghost" className="flex-1" onClick={handleSignup}>
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
    </Card>
  );
}
