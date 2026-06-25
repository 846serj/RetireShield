import { NextResponse } from "next/server";
import { analyzeAffordability, computeSafeToSpend, type AffordabilityInput, type DecisionResult } from "@/lib/engine/affordability";
import type { FinancialProfile } from "@/lib/engine/types";
import { createClient } from "@/lib/supabase/server";
import { getSubscriptionAccess } from "@/lib/subscription";

function publicResult(result: DecisionResult) {
  return {
    verdict: result.verdict,
    headline: result.headline,
    trigger: result.trigger,
    safeMax: result.safeMax,
    essentials: result.essentials,
    moneyLasts: { afterAge: result.moneyLasts.afterAge },
    needsProfile: result.needsProfile,
  };
}

function plusResult(result: DecisionResult) {
  return { ...publicResult(result), ripple: result.ripple, alternatives: result.alternatives, trace: result.trace };
}

export async function POST(req: Request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Sign in required" }, { status: 401 });

  const body = await req.json().catch(() => null) as Partial<AffordabilityInput> | null;
  if (!body || body.kind !== "spend" || !["oneoff", "recurring"].includes(body.timing as string) || !Number.isFinite(Number(body.amount))) {
    return NextResponse.json({ error: "kind, timing, and amount are required" }, { status: 400 });
  }

  const [{ data: profileRow }, { data: scoreRow }, access] = await Promise.all([
    supabase.from("profiles").select("*").eq("user_id", user.id).maybeSingle(),
    supabase.from("scores").select("overall, band, sub_scores, created_at").eq("user_id", user.id).order("created_at", { ascending: false }).limit(1).maybeSingle(),
    getSubscriptionAccess(user.id),
  ]);
  if (!profileRow) return NextResponse.json({ needsProfile: true }, { status: 400 });

  const input: AffordabilityInput = { kind: "spend", timing: body.timing as "oneoff" | "recurring", amount: Number(body.amount), fundingSource: body.fundingSource, startAge: body.startAge };
  const result = analyzeAffordability(input, profileRow as FinancialProfile);
  const safeToSpend = computeSafeToSpend(profileRow as FinancialProfile);
  const isPlusDepth = ["plus", "premium", "concierge"].includes(access.tier);
  const response = { ...(isPlusDepth ? plusResult(result) : publicResult(result)), safeToSpend, latestScore: scoreRow ?? null };

  if (isPlusDepth && !result.needsProfile) {
    await supabase.from("decisions").insert({ user_id: user.id, input, result, verdict: result.verdict, tier: access.tier });
  }

  return NextResponse.json(response);
}
