import { supabase } from "@/lib/supabase/client";
import { authorizedFetch } from "@/lib/supabase/authorizedFetch";

async function errorMessageFrom(response: Response, fallback: string): Promise<string> {
  const body = (await response.json().catch(() => ({}))) as { error?: string };
  return body.error ?? fallback;
}

// Downloads the export as a file. Fetched with the session token rather than
// navigating to the URL, because the route requires an Authorization header
// that a plain link cannot send.
export async function downloadMyData(): Promise<void> {
  const response = await authorizedFetch("/api/account/export");
  if (!response.ok) {
    throw new Error(await errorMessageFrom(response, "Could not build your export."));
  }

  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  try {
    const link = document.createElement("a");
    link.href = url;
    link.download = `thriamvos-export-${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
  } finally {
    URL.revokeObjectURL(url);
  }
}

// Irreversible. The server re-checks confirmEmail against the verified
// session, so this is a convenience check rather than the real gate.
export async function deleteMyAccount(confirmEmail: string): Promise<void> {
  const response = await authorizedFetch("/api/account/delete", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ confirmEmail }),
  });
  if (!response.ok) {
    throw new Error(await errorMessageFrom(response, "Could not delete your account."));
  }
  // The account no longer exists, so the local session is dead — clear it so
  // the UI doesn't sit on a token that can never be used again.
  await supabase.auth.signOut();
}
