import { supabase } from "@/lib/supabase/client";

// Calls one of our own API routes with the caller's Supabase session token
// attached. The server side of this is verifyRequestUser().
export async function authorizedFetch(path: string, init?: RequestInit): Promise<Response> {
  const { data: sessionData } = await supabase.auth.getSession();
  const accessToken = sessionData.session?.access_token;
  if (!accessToken) {
    throw new Error("You must be signed in to do that.");
  }
  return fetch(path, {
    ...init,
    headers: { ...init?.headers, Authorization: `Bearer ${accessToken}` },
  });
}
