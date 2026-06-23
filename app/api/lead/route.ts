import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { sendToList } from "@/lib/email";
import { getPublicBaseUrl } from "@/lib/siteUrl";

function isValidEmail(email: unknown): email is string {
  return typeof email === "string" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

async function sendVerificationLink(req: NextRequest, email: string) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    console.log(`[auth stub] would send verification link to ${email}`);
    return { sent: false, reason: "auth not configured" };
  }

  const supabase = createClient(url, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });

  const callbackUrl = new URL(`${getPublicBaseUrl(req.url)}/auth/callback`);
  callbackUrl.searchParams.set("next", "/upgrade?plan=annual");

  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: callbackUrl.toString(),
      shouldCreateUser: true,
    },
  });

  if (error) {
    console.error("verification email failed:", error.message);
    return { sent: false, reason: error.message };
  }

  return { sent: true };
}

// Saves a captured lead and emails a Supabase magic link so the visitor can verify
// their address / create an account before starting checkout.
export async function POST(req: NextRequest) {
  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "bad json" }, { status: 400 });
  }

  const { email, answers, result, source, campaign } = body ?? {};
  if (!isValidEmail(email)) {
    return NextResponse.json({ ok: false, error: "invalid email" }, { status: 400 });
  }

  const normalizedEmail = email.trim().toLowerCase();
  const row = {
    email: normalizedEmail,
    answers,
    overall_score: result?.overall ?? null,
    sub_scores: result?.sub ?? null,
    band: result?.band ?? null,
    source: source ?? "direct",
    campaign: campaign ?? "",
    created_at: new Date().toISOString(),
  };

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (url && key) {
    const supabase = createClient(url, key);
    const { error } = await supabase.from("leads").insert(row);
    if (error) {
      console.error("lead insert failed:", error.message);
      return NextResponse.json({ ok: false, error: "db" }, { status: 500 });
    }
  } else {
    console.log("[lead captured — no DB configured]", JSON.stringify(row));
  }

  await sendToList(normalizedEmail, "free");
  const verification = await sendVerificationLink(req, normalizedEmail);

  return NextResponse.json({ ok: true, verificationEmailSent: verification.sent });
}
