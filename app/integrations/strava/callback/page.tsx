"use client";

import { useEffect, useState } from "react";
import { exchangeStravaCode } from "@/lib/strava/oauth";

// This is Strava's OAuth redirect_uri — standard web flow, Strava sends the
// browser here directly with ?code=... after the user approves access.
function getCodeFromLocation(): string | null {
  if (typeof window === "undefined") return null;
  return new URLSearchParams(window.location.search).get("code");
}

export default function StravaCallbackPage() {
  const [code] = useState(getCodeFromLocation);
  const [status, setStatus] = useState<"pending" | "error">(code ? "pending" : "error");
  const [errorMessage, setErrorMessage] = useState(
    code ? "" : "No authorization code received from Strava.",
  );

  useEffect(() => {
    if (!code) return;
    exchangeStravaCode(code).catch((error: Error) => {
      setStatus("error");
      setErrorMessage(error.message);
    });
  }, [code]);

  return (
    <main className="flex flex-1 items-center justify-center px-4 text-center">
      <p className={status === "error" ? "text-warning" : "text-muted"}>
        {status === "error" ? errorMessage : "Connecting to Strava..."}
      </p>
    </main>
  );
}
