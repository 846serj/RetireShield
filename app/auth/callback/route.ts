import { NextResponse } from "next/server";
import { getPublicBaseUrl } from "@/lib/siteUrl";
import { createClient } from "@/lib/supabase/server";

// Exchanges password-recovery codes for a session so the visitor can set a new password.
// Magic-link sign-in is intentionally not used in the account flow.
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const type = searchParams.get("type");

  if (code) {
    const supabase = createClient();
    await supabase.auth.exchangeCodeForSession(code);
  }

  const path = type === "recovery" ? "/auth/update-password" : "/coach?firstQuestion=1";
  return NextResponse.redirect(`${getPublicBaseUrl(request.url)}${path}`);
}
