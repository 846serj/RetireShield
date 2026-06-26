import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { FINANCIAL_PROFILE_DEFAULTS, type MaritalStatus } from "@/lib/engine/types";

function numericAnswer(answers: Record<string, unknown> | null | undefined, key: string) {
  const value = Number(answers?.[key]);
  return Number.isFinite(value) ? value : null;
}

function stringAnswer<T extends string>(answers: Record<string, unknown> | null | undefined, key: string, allowed: readonly T[]) {
  const value = answers?.[key];
  return typeof value === "string" && allowed.includes(value as T) ? value as T : null;
}

function booleanFromYesNo(answers: Record<string, unknown> | null | undefined, key: string) {
  const value = answers?.[key];
  if (value === "yes") return true;
  if (value === "no") return false;
  return null;
}

function quizPlanningHorizonAge(answers: Record<string, unknown> | null | undefined) {
  const value = numericAnswer(answers, "planning_horizon_age");
  return value ?? FINANCIAL_PROFILE_DEFAULTS.planning_horizon_age;
}

function birthdateFromAge(age: number | null) {
  if (age === null) return null;
  return `${new Date().getUTCFullYear() - Math.floor(age)}-01-01`;
}

function buildProfileFromQuiz(userId: string, answers: Record<string, unknown> | null | undefined) {
  const maritalStatus = stringAnswer<MaritalStatus>(answers, "maritalStatus", ["single", "married", "widowed", "divorced"]);
  const spouseAge = maritalStatus === "married" ? numericAnswer(answers, "spouseAge") : null;
  const hasPension = answers?.hasPension === "yes";
  const stockPct = numericAnswer(answers, "stockPct");
  const balanceTaxDeferred = numericAnswer(answers, "balance_tax_deferred") ?? numericAnswer(answers, "savings");

  return {
    user_id: userId,
    birthdate: birthdateFromAge(numericAnswer(answers, "age")),
    marital_status: maritalStatus,
    spouse_birthdate: birthdateFromAge(spouseAge),
    state: stringAnswer(answers, "state", [
      "AL", "AK", "AZ", "AR", "CA", "CO", "CT", "DE", "FL", "GA", "HI", "ID", "IL", "IN", "IA", "KS", "KY", "LA", "ME", "MD", "MA", "MI", "MN", "MS", "MO", "MT", "NE", "NV", "NH", "NJ", "NM", "NY", "NC", "ND", "OH", "OK", "OR", "PA", "RI", "SC", "SD", "TN", "TX", "UT", "VT", "VA", "WA", "WV", "WI", "WY",
    ] as const),
    balance_taxable: numericAnswer(answers, "balance_taxable"),
    balance_tax_deferred: balanceTaxDeferred,
    balance_roth: numericAnswer(answers, "balance_roth"),
    stock_pct: stockPct,
    bond_pct: stockPct === null ? null : Math.max(0, 100 - stockPct),
    cash_pct: stockPct === null ? null : 0,
    ss_benefit_fra: numericAnswer(answers, "ssaBenefitEstimate") ?? numericAnswer(answers, "guaranteedIncome"),
    ss_claim_age: null,
    spouse_ss_benefit_fra: maritalStatus === "married" ? numericAnswer(answers, "spouseSsaBenefitEstimate") : null,
    spouse_ss_claim_age: null,
    pension_amount: hasPension ? numericAnswer(answers, "pensionAmount") : null,
    pension_start_age: null,
    pension_has_cola: hasPension ? booleanFromYesNo(answers, "pensionHasCola") : null,
    pension_survivor_pct: hasPension ? numericAnswer(answers, "pensionSurvivorPct") : null,
    spending_essential_monthly: numericAnswer(answers, "essentialExpenses"),
    target_retirement_age: numericAnswer(answers, "targetRetirementAge"),
    planning_horizon_age: quizPlanningHorizonAge(answers),
    updated_at: new Date().toISOString(),
  };
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
  await supabase.from("profiles").upsert(buildProfileFromQuiz(user.id, answers), { onConflict: "user_id" });

  return NextResponse.json({ ok: true });
}
