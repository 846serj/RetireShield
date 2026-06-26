import Link from "next/link";
import { Button, Eyebrow } from "@/components/ui";
import { ScoreGauge } from "@/components/ScoreGauge";
import { bandVerdict } from "@/lib/verdicts";
import { runMonteCarlo } from "@/lib/engine/montecarlo";
import { FINANCIAL_PROFILE_DEFAULTS, type FinancialProfile } from "@/lib/engine/types";
import { isProfileScoreable } from "@/lib/profileCompleteness";
import { estimatedMonthlyIncomeForEngine, guaranteedMonthlyIncomeForEngine, hydrateProfileForEngine, totalPortfolioForEngine } from "@/lib/profileForEngine";
import type { Answers } from "@/lib/scoring";
import { formatMoney, formatPercent, getLatestScore, getPlanForLatest, requireUser } from "./_lib/dashboard";

const MONTE_CARLO_RUNS = 1000;
const SUSTAINABLE_WITHDRAWAL_RATE = 0.04;

function knownNumber(value: number | null | undefined) {
  return Number.isFinite(Number(value)) ? Number(value) : 0;
}

function canRunMonteCarlo(profile: Partial<FinancialProfile> | null | undefined) {
  return !!profile?.birthdate && knownNumber(profile.spending_essential_monthly) + knownNumber(profile.spending_discretionary_monthly) > 0;
}

function profileForEngine(profile: Partial<FinancialProfile>): FinancialProfile {
  return {
    user_id: String(profile.user_id ?? "dashboard"),
    birthdate: profile.birthdate ?? null,
    marital_status: profile.marital_status ?? "single",
    spouse_birthdate: profile.spouse_birthdate ?? null,
    state: profile.state ?? null,
    balance_taxable: profile.balance_taxable ?? 0,
    taxable_cost_basis: profile.taxable_cost_basis ?? null,
    balance_tax_deferred: profile.balance_tax_deferred ?? 0,
    balance_roth: profile.balance_roth ?? 0,
    stock_pct: profile.stock_pct ?? 60,
    bond_pct: profile.bond_pct ?? 30,
    cash_pct: profile.cash_pct ?? 10,
    ss_benefit_fra: profile.ss_benefit_fra ?? 0,
    ss_claim_age: profile.ss_claim_age ?? 67,
    spouse_ss_benefit_fra: profile.spouse_ss_benefit_fra ?? null,
    spouse_ss_claim_age: profile.spouse_ss_claim_age ?? null,
    pension_amount: profile.pension_amount ?? null,
    pension_start_age: profile.pension_start_age ?? profile.target_retirement_age ?? 67,
    pension_has_cola: profile.pension_has_cola ?? false,
    pension_survivor_pct: profile.pension_survivor_pct ?? null,
    other_taxable_income: profile.other_taxable_income ?? null,
    spending_essential_monthly: profile.spending_essential_monthly ?? 0,
    spending_discretionary_monthly: profile.spending_discretionary_monthly ?? 0,
    inflation_assumption: profile.inflation_assumption ?? FINANCIAL_PROFILE_DEFAULTS.inflation_assumption,
    target_retirement_age: profile.target_retirement_age ?? 67,
    planning_horizon_age: profile.planning_horizon_age ?? FINANCIAL_PROFILE_DEFAULTS.planning_horizon_age,
    updated_at: profile.updated_at ?? null,
  };
}

function confidence(profile: Partial<FinancialProfile> | null | undefined, seed: string) {
  if (!canRunMonteCarlo(profile)) return null;
  return runMonteCarlo(profileForEngine(profile!), MONTE_CARLO_RUNS, { seed }).probabilityOfSuccess;
}

function StatTile({ label, value, detail }: { label: string; value: string; detail: string }) {
  return <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
    <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-slate-500">{label}</p>
    <p className="mt-1 text-2xl font-extrabold tracking-tight text-ink">{value}</p>
    <p className="mt-2 text-sm font-semibold text-slate-600">{detail}</p>
  </div>;
}

export default async function RetirementScoreDashboard({ next = "/score" }: { next?: string }) {
  const { supabase, user } = await requireUser(next);
  const latest = await getLatestScore(supabase, user.id);
  const { data: profile } = await supabase.from("profiles").select("*").eq("user_id", user.id).maybeSingle();
  const answers = latest?.answers as Answers | null | undefined;
  const hasQuizScore = latest?.score_source === "quiz";
  const connectedScored = ["connected", "monthly_rescore"].includes(String(latest?.score_source ?? ""));
  const scoreable = isProfileScoreable(profile, hasQuizScore || connectedScored);
  const plan = scoreable ? await getPlanForLatest(supabase, latest) : [];
  const biggestRisk = plan[0];
  const biggestOpportunity = plan.find((item) => item.title !== biggestRisk?.title) ?? plan[1];
  const hydratedProfile = hydrateProfileForEngine(profile, answers);
  const engineProfile = canRunMonteCarlo(profile) ? profile : { ...hydratedProfile, user_id: hydratedProfile.user_id ?? user.id };
  const probability = scoreable ? confidence(engineProfile, user.id) : null;
  const monthlyIncome = scoreable ? estimatedMonthlyIncomeForEngine(profile, answers) : null;

  if (!scoreable || !latest) {
    return <div className="mx-auto max-w-5xl py-8 sm:py-10">
      <section className="rg-card text-center">
        <Eyebrow>Retirement Score</Eyebrow>
        <h1 className="mt-2 text-2xl font-extrabold sm:text-3xl">Get your one-glance retirement dashboard</h1>
        <p className="mx-auto mt-4 max-w-2xl text-slate-700">Take the quick check-in so RetireShield can show your score, confidence, income estimate, and top next steps on one screen.</p>
        <Button href="/quiz" className="mt-6">Take the Score quiz</Button>
      </section>
    </div>;
  }

  return <div className="mx-auto max-w-6xl py-6 sm:py-8">
    <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <Eyebrow>Retirement Score</Eyebrow>
        <h1 className="mt-1 text-2xl font-extrabold tracking-tight sm:text-3xl">Your one-glance retirement dashboard</h1>
        <p className="mt-2 max-w-3xl text-base font-semibold text-slate-700">{bandVerdict(latest.band)}</p>
      </div>
      <Button href="/coach" className="shrink-0">Ask the coach about this →</Button>
    </div>

    <section className="grid gap-5 lg:grid-cols-[minmax(300px,0.95fr)_1.4fr]">
      <ScoreGauge value={latest.overall} band={latest.band} subScores={[]} badge="Latest" subtitle="Retirement Score" />

      <div className="grid content-start gap-4 sm:grid-cols-2">
        <StatTile label="Confidence" value={probability === null ? "Add profile" : formatPercent(probability)} detail={probability === null ? "Complete profile details to run Monte Carlo." : `${MONTE_CARLO_RUNS.toLocaleString()} Monte Carlo paths`} />
        <StatTile label="Estimated monthly income" value={monthlyIncome === null ? "—" : formatMoney(monthlyIncome)} detail="Guaranteed income + sustainable withdrawal" />
        <StatTile label="Guaranteed income" value={formatMoney(guaranteedMonthlyIncomeForEngine(profile, answers))} detail="Social Security, pension, or other steady income" />
        <StatTile label="Portfolio draw" value={formatMoney((totalPortfolioForEngine(profile, answers) * SUSTAINABLE_WITHDRAWAL_RATE) / 12)} detail="4% sustainable withdrawal estimate" />

        <div className="rounded-3xl border border-amber-200 bg-amber-50 p-5 sm:col-span-2">
          <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-amber-700">Biggest risk</p>
          <p className="mt-2 text-xl font-extrabold text-ink">{biggestRisk?.title ?? "Keep your score current"}</p>
          <p className="mt-1 line-clamp-2 text-sm font-semibold text-slate-700">{biggestRisk?.why ?? "Refresh your profile when income, spending, or accounts change."}</p>
        </div>

        <div className="rounded-3xl border border-emerald-200 bg-emerald-50 p-5 sm:col-span-2">
          <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-emerald-700">Biggest opportunity</p>
          <p className="mt-2 text-xl font-extrabold text-ink">{biggestOpportunity?.title ?? "Ask one focused planning question"}</p>
          <p className="mt-1 line-clamp-2 text-sm font-semibold text-slate-700">{biggestOpportunity?.why ?? "Use the coach to turn this snapshot into your next educational planning step."}</p>
        </div>
      </div>
    </section>

    <Link href="/coach" className="mt-5 inline-flex text-sm font-extrabold text-brand underline sm:hidden">Ask the coach about this →</Link>
  </div>;
}
