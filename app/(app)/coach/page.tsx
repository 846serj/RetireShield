import type { Metadata } from "next";
import CoachChat from "@/components/CoachChat";
import { computeSafeToSpend } from "@/lib/engine/affordability";
import type { FinancialProfile } from "@/lib/engine/types";
import { getRequestContext } from "@/lib/auth/currentUser";
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
  const { profile, latestScore: latest } = await getRequestContext();
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
