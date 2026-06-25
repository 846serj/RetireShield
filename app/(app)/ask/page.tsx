import type { Metadata } from "next";
import AskClient from "./AskClient";
import { computeSafeToSpend } from "@/lib/engine/affordability";
import type { FinancialProfile } from "@/lib/engine/types";
import { createClient } from "@/lib/supabase/server";
import { isProfileScoreable } from "@/lib/profileCompleteness";

export const metadata: Metadata = { title: "Ask before you spend", description: "Check whether a purchase fits your retirement plan before you spend." };

export default async function AskPage({ searchParams }: { searchParams?: { firstQuestion?: string } }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const [{ data: profile }, { data: latest }, { data: recent }, { data: connections }] = await Promise.all([
    supabase.from("profiles").select("*").eq("user_id", user!.id).maybeSingle(),
    supabase.from("scores").select("score_source").eq("user_id", user!.id).order("created_at", { ascending: false }).limit(1).maybeSingle(),
    supabase.from("decisions").select("id, verdict, created_at, input").eq("user_id", user!.id).order("created_at", { ascending: false }).limit(5),
    supabase.from("plaid_items").select("id").eq("user_id", user!.id).limit(1),
  ]);
  const hasDataScore = ["quiz", "connected", "monthly_rescore"].includes(String(latest?.score_source ?? ""));
  const scoreable = isProfileScoreable(profile, hasDataScore);
  const safe = profile && scoreable ? computeSafeToSpend(profile as FinancialProfile) : { annualDiscretionarySpend: null, needsProfile: true };
  return <AskClient initialPrompt={searchParams?.firstQuestion ? "Ask your first question" : undefined} initialSafeMonthly={safe.annualDiscretionarySpend ? Math.round(safe.annualDiscretionarySpend / 12) : null} horizonAge={scoreable ? profile?.planning_horizon_age ?? null : null} connected={Boolean(connections?.length) || ["connected", "monthly_rescore"].includes(String(latest?.score_source ?? ""))} profileComplete={scoreable} recent={(recent ?? []) as never} />;
}
