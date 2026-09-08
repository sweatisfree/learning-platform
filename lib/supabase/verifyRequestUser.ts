import { createClient, type User } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";
import { env } from "@/lib/config/env";

export type VerifyRequestUserResult = { user: User } | { errorResponse: NextResponse };

// Shared session check for API routes that require a signed-in Supabase
// user. Verifies the caller's own session token — never touches
// service-role or any elevated credential.
export async function verifyRequestUser(request: NextRequest): Promise<VerifyRequestUserResult> {
  const authHeader = request.headers.get("Authorization");
  if (!authHeader) {
    return { errorResponse: NextResponse.json({ error: "Missing Authorization header" }, { status: 401 }) };
  }

  const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: authHeader } },
  });

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error || !user) {
    return { errorResponse: NextResponse.json({ error: "Invalid session" }, { status: 401 }) };
  }

  return { user };
}
