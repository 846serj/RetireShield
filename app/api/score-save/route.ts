import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { FINANCIAL_PROFILE_DEFAULTS } from "@/lib/engine/types";

function quizPlanningHorizonAge(answers: Record<string, unknown> | null | undefined) {
  const value = Number(answers?.planning_horizon_age);
  return Number.isFinite(value) ? value : FINANCIAL_PROFILE_DEFAULTS.planning_horizon_age;
}

// Persists an authed user's Score (used to "claim" the score taken anonymously before sign-up).
export async function POST(req: Request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ ok: false }, { status: 401 });

  const { answers, result } = await req.json();
  if (!result?.overall) return NextResponse.json({ ok: false, error: "no result" }, { status: 400 });

  // Keep every completed score so Premium members can see progress over time.
  await supabase.from("scores").insert({
    user_id: user.id,
    overall: result.overall,
    sub_scores: result.sub,
    band: result.band,
    answers,
    score_source: "quiz",
  });

  // Carry quiz onboarding assumptions into the planning profile used by /ask.
  await supabase.from("profiles").upsert({
    user_id: user.id,
    planning_horizon_age: quizPlanningHorizonAge(answers),
    updated_at: new Date().toISOString(),
  }, { onConflict: "user_id" });

  return NextResponse.json({ ok: true });
}
