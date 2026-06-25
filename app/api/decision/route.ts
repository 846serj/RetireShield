import { NextResponse } from "next/server";
import { analyzeAffordability, computeSafeToSpend, type AffordabilityInput, type DecisionResult } from "@/lib/engine/affordability";
import type { FinancialProfile } from "@/lib/engine/types";
import { createClient } from "@/lib/supabase/server";
import { getSubscriptionAccess } from "@/lib/subscription";
import { isProfileScoreable } from "@/lib/profileCompleteness";
import type { Answers } from "@/lib/scoring";

function publicResult(result: DecisionResult) {
  return {
    verdict: result.verdict,
    headline: result.headline,
    trigger: result.trigger,
    safeMax: result.safeMax,
    essentials: result.essentials,
    moneyLasts: result.moneyLasts,
    score: result.score,
    needsProfile: result.needsProfile,
  };
}

function plusResult(result: DecisionResult) {
  return { ...publicResult(result), ripple: result.ripple, alternatives: result.alternatives, trace: result.trace };
}

function tierEntitlements(tier: string) {
  return {
    tier,
    included: {
      free: ["verdict", "trigger", "safeMax", "safeToSpend"],
      plus: tier === "plus" || tier === "premium" || tier === "concierge"
        ? ["taxMedicareRipple", "alternatives", "calculationTrace", "savedDecisionHistory", "connectAccounts"]
        : [],
      premium: tier === "premium" || tier === "concierge"
        ? ["medicareIrmaa", "socialSecurityPlanning", "scoreHistory"]
        : [],
      concierge: tier === "concierge" ? ["humanCheckups", "doneForYou"] : [],
    },
    rollingOut: tier === "premium" || tier === "concierge" ? ["expandedMedicarePlanner", "expandedSocialSecurityOptimizer"] : [],
  };
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
    supabase.from("scores").select("overall, band, sub_scores, answers, created_at, score_source").eq("user_id", user.id).order("created_at", { ascending: false }).limit(1).maybeSingle(),
    getSubscriptionAccess(user.id),
  ]);
  const hasDataScore = ["quiz", "connected", "monthly_rescore"].includes(String(scoreRow?.score_source ?? ""));
  if (!profileRow || !isProfileScoreable(profileRow, hasDataScore)) return NextResponse.json({ needsProfile: true }, { status: 400 });

  const input: AffordabilityInput = { kind: "spend", timing: body.timing as "oneoff" | "recurring", amount: Number(body.amount), fundingSource: body.fundingSource, startAge: body.startAge, label: typeof body.label === "string" ? body.label : undefined };
  const result = analyzeAffordability(input, profileRow as FinancialProfile, (scoreRow?.answers as Answers | null) ?? null);
  const safeToSpend = computeSafeToSpend(profileRow as FinancialProfile);
  const isPlusDepth = ["plus", "premium", "concierge"].includes(access.tier);
  const response = { ...(isPlusDepth ? plusResult(result) : publicResult(result)), safeToSpend, latestScore: scoreRow ?? null, entitlements: tierEntitlements(access.tier) };

  if (isPlusDepth && !result.needsProfile) {
    await supabase.from("decisions").insert({ user_id: user.id, input, result, verdict: result.verdict, tier: access.tier });
  }

  return NextResponse.json(response);
}
