"use client";

import { useEffect, useState } from "react";
import { exchangeStravaCode } from "@/lib/strava/oauth";
import type { StravaConnection } from "@/lib/strava/types";

// This is Strava's OAuth redirect_uri — standard web flow, Strava sends the
// browser here directly with ?code=... after the user approves access.
function getCodeFromLocation(): string | null {
  if (typeof window === "undefined") return null;
  return new URLSearchParams(window.location.search).get("code");
}

export default function StravaCallbackPage() {
  const [code] = useState(getCodeFromLocation);
  const [status, setStatus] = useState<"pending" | "error" | "success">(code ? "pending" : "error");
  const [errorMessage, setErrorMessage] = useState(
    code ? "" : "No authorization code received from Strava.",
  );
  const [connection, setConnection] = useState<StravaConnection | null>(null);

  useEffect(() => {
    if (!code) return;
    exchangeStravaCode(code)
      .then((result) => {
        setConnection(result);
        setStatus("success");
      })
      .catch((error: Error) => {
        setStatus("error");
        setErrorMessage(error.message);
      });
  }, [code]);

  return (
    <main className="flex flex-1 items-center justify-center px-4 text-center">
      {status === "error" && <p className="text-warning">{errorMessage}</p>}
      {status === "pending" && <p className="text-muted">Connecting to Strava...</p>}
      {status === "success" && connection && (
        <p className="text-success">
          Connected as {connection.athlete.firstname} {connection.athlete.lastname}.
        </p>
      )}
    </main>
  );
}
