"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase/client";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

// Postgres unique_violation. Someone already on the list should see the same
// confirmation as someone new — telling them the address is taken would turn
// this form into a way to test whether a given person has signed up.
const UNIQUE_VIOLATION = "23505";

export function WaitlistForm() {
  const [email, setEmail] = useState("");
  const [note, setNote] = useState("");
  const [status, setStatus] = useState<"idle" | "saving" | "done">("idle");
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setStatus("saving");

    const { error: insertError } = await supabase
      .from("waitlist")
      .insert({ email: email.trim(), note: note.trim() || null });

    if (insertError && insertError.code !== UNIQUE_VIOLATION) {
      setError(insertError.message);
      setStatus("idle");
      return;
    }
    setStatus("done");
  }

  if (status === "done") {
    return (
      <p className="text-body">
        You&apos;re on the list. We&apos;ll email you once Thríamvos can take athletes under 18, and
        for nothing else.
      </p>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
      <label className="flex flex-col gap-1.5">
        <span className="text-sm text-muted">Parent or guardian email</span>
        <Input
          id="waitlist-email"
          type="email"
          required
          placeholder="you@example.com"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
        />
      </label>

      <label className="flex flex-col gap-1.5">
        <span className="text-sm text-muted">Anything you want us to know (optional)</span>
        <Input
          id="waitlist-note"
          type="text"
          placeholder="What you're hoping this does"
          value={note}
          onChange={(event) => setNote(event.target.value)}
        />
        {/* Stated rather than merely enforced, so the reason is visible. */}
        <span className="text-xs text-muted">
          Please don&apos;t include your child&apos;s name, age or anything else about them. We only
          want your email.
        </span>
      </label>

      <Button type="submit" disabled={status === "saving"} className="self-start">
        {status === "saving" ? "Adding…" : "Join the waitlist"}
      </Button>

      {error && <p className="text-sm text-warning">{error}</p>}
    </form>
  );
}
