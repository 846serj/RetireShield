import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { sendToList } from "@/lib/email";

// Saves a captured lead. If Supabase env vars are set, it persists to the `leads` table;
// otherwise it logs to the server console so the app runs with zero setup.
export async function POST(req: NextRequest) {
  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "bad json" }, { status: 400 });
  }

  const { email, answers, result, source, campaign } = body ?? {};
  if (!email || typeof email !== "string" || !email.includes("@")) {
    return NextResponse.json({ ok: false, error: "invalid email" }, { status: 400 });
  }

  const row = {
    email,
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

  await sendToList(email, "free");
  return NextResponse.json({ ok: true });
}
