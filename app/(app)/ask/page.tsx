import type { Metadata } from "next";
import CoachChat from "@/components/CoachChat";
import { computeSafeToSpend } from "@/lib/engine/affordability";
import type { FinancialProfile } from "@/lib/engine/types";
import { createClient } from "@/lib/supabase/server";
import { isProfileScoreable } from "@/lib/profileCompleteness";
import { hydrateProfileForEngine } from "@/lib/profileForEngine";

export const metadata: Metadata = { title: "Ask RetireShield", description: "Chat with your retirement coach about spending, Social Security, markets, and your plan." };

function scoreStatus(band?: string | null) {
  if (band === "Secure" || band === "Mostly Secure") return "On track";
  if (band === "At Risk") return "Needs attention";
  if (band === "Vulnerable") return "Review soon";
  return "On track";
}

export default async function AskPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const [{ data: profile }, { data: latest }] = await Promise.all([
    supabase.from("profiles").select("*").eq("user_id", user!.id).maybeSingle(),
    supabase.from("scores").select("overall, band, score_source, answers").eq("user_id", user!.id).order("created_at", { ascending: false }).limit(1).maybeSingle(),
  ]);
  const hasDataScore = ["quiz", "connected", "monthly_rescore"].includes(String(latest?.score_source ?? ""));
  const hydrated = hydrateProfileForEngine(profile, latest?.answers);
  const scoreable = isProfileScoreable(hydrated, hasDataScore);
  const safe = scoreable ? computeSafeToSpend(hydrated as FinancialProfile) : { annualDiscretionarySpend: null, needsProfile: true };
  const safeMonthly = safe.annualDiscretionarySpend ? Math.round(safe.annualDiscretionarySpend / 12) : null;

  return (
    <div className="mx-auto max-w-6xl py-6 sm:py-10">
      <CoachChat
        scoreSummary={scoreable && latest?.overall ? {
          score: Math.round(Number(latest.overall)),
          status: scoreStatus(latest.band),
          safeMonthly,
        } : null}
      />
    </div>
  );
}
