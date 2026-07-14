// Retirement Safety Score — pure, testable scoring logic.
// Education only, NOT advice. No account/brokerage linking. See RetireShield-v0-Build-Layout.md §5.

import { DEFAULT_ASSUMPTIONS } from "@/lib/engine/params/2026";
import { projectDepletion } from "@/lib/engine/projection";
import type { ScoreBandLabel } from "@/lib/verdicts";

export type Answers = {
  age: number;
  maritalStatus?: "single" | "married" | "widowed" | "divorced";
  status: "working" | "near" | "retired";
  guaranteedIncome: number; // monthly $ from SS + pension + annuity
  essentialExpenses: number; // monthly $ essentials
  savings: number; // exact retirement savings estimate collected by the quiz
  savingsBucket?: "<50k" | "50-150k" | "150-500k" | "500k-1M" | "1M+"; // legacy saved scores, ignored by current scoring
  filingStatus?: "single" | "married_joint" | "married_separate" | "head_of_household" | "skip";
  targetRetirementAge?: number;
  ssaBenefitEstimate?: number; // optional monthly Social Security estimate
  claimedSocialSecurity?: "yes" | "no" | "skip";
  spouseAge?: number;
  spouseSsaBenefitEstimate?: number;
  hasPension?: "yes" | "no" | "skip";
  pensionAmount?: number;
  pensionHasCola?: "yes" | "no" | "skip";
  pensionSurvivorPct?: number;
  ownsHome?: "yes" | "no" | "skip";
  homeEquity?: number;
  planToDownsize?: "yes" | "no" | "skip";
  balance_taxable?: number;
  balance_tax_deferred?: number;
  balance_roth?: number;
  stockPct: 0 | 25 | 50 | 75 | 100;
  emergencyFund: "0" | "1-3" | "3-6" | "6+" | "skip";
  debt: "none" | "some" | "heavy" | "skip";
  worry: "running_out" | "inflation" | "market" | "scams" | "healthcare" | "skip";
  state?: string; // 2-letter code
  planning_horizon_age?: 85 | 90 | 95 | 100 | number;
};

export type SubScores = { income: number; withdrawal: number; inflation: number; market: number };
export type Result = { overall: number; band: ScoreBandLabel; sub: SubScores };

const EFUND_MONTHS = { "0": 0, "1-3": 2, "3-6": 4.5, "6+": 7, skip: 0 } as const;
const HIGH_COL_STATES = new Set(["HI", "CA", "NY", "MA", "NJ", "CT", "WA", "OR", "MD", "CO", "RI", "AK", "VT", "NH"]);
const LOW_COL_STATES = new Set(["MS", "AL", "AR", "OK", "KS", "MO", "TN", "KY", "WV", "IN", "IA", "OH", "ND", "SD", "NE"]);

const PLANNING_HORIZON_AGE = 95;
function planningHorizonAge(a: Answers): number {
  return Number.isFinite(a.planning_horizon_age) ? Math.max(Math.floor(a.age), Number(a.planning_horizon_age)) : PLANNING_HORIZON_AGE;
}
type ScoreWeights = Record<keyof SubScores, number>;
const WEIGHT_BASE: ScoreWeights = { income: 0.3, withdrawal: 0.32, inflation: 0.18, market: 0.2 };

const clamp = (n: number, lo = 0, hi = 100) => Math.max(lo, Math.min(hi, n));

const costOfLivingMultiplier = (state?: string): number => {
  const code = state?.toUpperCase();
  if (!code) return 1;
  if (HIGH_COL_STATES.has(code)) return 0.92;
  if (LOW_COL_STATES.has(code)) return 1.08;
  return 1;
};

function realSavings(a: Answers): number {
  return Number.isFinite(a.savings) ? Math.max(0, a.savings) : 0;
}

function yearsToHorizon(a: Answers): number {
  return Math.max(0, planningHorizonAge(a) - Math.floor(a.age));
}

function coverageScore(coverage: number): number {
  if (!Number.isFinite(coverage)) return 0;
  return coverage < 1 ? coverage * 65 : 65 + ((coverage - 1) / 0.5) * 35;
}

function socialSecurityChecks(a: Answers): [number, number] {
  return [Math.max(0, a.ssaBenefitEstimate ?? 0), Math.max(0, a.spouseSsaBenefitEstimate ?? 0)];
}

function pensionSurvivorPercent(a: Answers): number {
  if (!Number.isFinite(a.pensionSurvivorPct)) return 50;
  return clamp(Number(a.pensionSurvivorPct), 0, 100);
}

function survivorGuaranteedIncome(a: Answers): number {
  const [ownSs, spouseSs] = socialSecurityChecks(a);
  const knownHouseholdSs = ownSs + spouseSs;
  const lostSocialSecurity = ownSs > 0 && spouseSs > 0 ? Math.min(ownSs, spouseSs) : 0;
  const explicitPension = Math.max(0, a.pensionAmount ?? 0);
  const inferredPension = Math.max(0, a.guaranteedIncome - knownHouseholdSs);
  const pension = explicitPension > 0 ? Math.min(explicitPension, a.guaranteedIncome) : inferredPension;
  const lostPension = pension * (1 - pensionSurvivorPercent(a) / 100);
  return Math.max(0, a.guaranteedIncome - lostSocialSecurity - lostPension);
}

// Guaranteed income covering essentials is a passing floor; buffers and survivor resilience earn higher scores.
export function incomeStability(a: Answers): number {
  if (a.essentialExpenses <= 0) return 100;
  const currentScore = clamp(coverageScore(a.guaranteedIncome / a.essentialExpenses));
  if (a.maritalStatus !== "married") return currentScore;

  const survivorScore = clamp(coverageScore(survivorGuaranteedIncome(a) / a.essentialExpenses));
  return clamp(currentScore * 0.7 + survivorScore * 0.3);
}

function projectionWithdrawalScore(a: Answers, monthlyGap: number, stressedSavings: number): number {
  const projection = projectDepletion({
    currentAge: a.age,
    realSavings: stressedSavings,
    monthlyGap,
    horizonAge: planningHorizonAge(a),
    stockPct: a.stockPct,
    bondPct: 100 - a.stockPct,
    cashPct: 0,
    inflationRate: DEFAULT_ASSUMPTIONS.inflation,
    socialSecurityCola: DEFAULT_ASSUMPTIONS.socialSecurityCola,
    monthlySocialSecurity: Math.min(a.guaranteedIncome, Math.max(0, a.ssaBenefitEstimate ?? 0)),
  });

  const horizonYears = Math.max(1, yearsToHorizon(a));
  if (projection.depletionAge === null) {
    const endingBalanceYears = projection.realEndingBalance / Math.max(monthlyGap * 12, 1);
    return clamp((92 + Math.min(8, endingBalanceYears * 2)) * costOfLivingMultiplier(a.state));
  }
  const runway = Math.max(0, projection.depletionAge - Math.floor(a.age));
  return clamp((runway / horizonYears) * 90 * costOfLivingMultiplier(a.state));
}

// Projection-based sustainability: stressed savings, runway to horizon, and no automatic 100 for covered essentials.
export function withdrawalSustainability(a: Answers): number {
  if (a.essentialExpenses <= 0) return 100;
  const stressedSavings = realSavings(a) * 0.85;
  const gap = Math.max(0, a.essentialExpenses - a.guaranteedIncome);
  if (gap > 0) return projectionWithdrawalScore(a, gap, stressedSavings);

  const coverage = a.guaranteedIncome / a.essentialExpenses;
  const surplusScore = clamp(65 + Math.min(15, Math.max(0, coverage - 1) / 0.5 * 15));
  const savingsYearsOfEssentials = stressedSavings / Math.max(a.essentialExpenses * 12, 1);
  const savingsScore = clamp(Math.min(20, savingsYearsOfEssentials * 4));
  return clamp((surplusScore + savingsScore) * costOfLivingMultiplier(a.state));
}

// Distinct inflation signal: future real purchasing power of COLA and non-COLA income vs today's essentials.
export function inflationImpact(a: Answers): number {
  if (a.essentialExpenses <= 0) return 100;
  const years = yearsToHorizon(a);
  const inflation = DEFAULT_ASSUMPTIONS.inflation;
  const ssCola = DEFAULT_ASSUMPTIONS.socialSecurityCola;
  const colaIncome = Math.min(a.guaranteedIncome, Math.max(0, a.ssaBenefitEstimate ?? 0));
  const fixedIncome = Math.max(0, a.guaranteedIncome - colaIncome);
  const realColaIncomeAtHorizon = colaIncome * ((1 + ssCola) / (1 + inflation)) ** years;
  const realFixedIncomeAtHorizon = fixedIncome / (1 + inflation) ** years;
  const horizonRealCoverage = (realColaIncomeAtHorizon + realFixedIncomeAtHorizon) / a.essentialExpenses;

  return clamp(25 + horizonRealCoverage * 75);
}

// Over-exposure-for-age + cash cushion − debt drag. Conservative allocations are not penalized.
export function marketRiskBuffer(a: Answers): number {
  const maxAgeAppropriateEquity = clamp(110 - a.age, 20, 90);
  const overExposure = Math.max(0, a.stockPct - maxAgeAppropriateEquity);
  let score = 65 - overExposure * 0.9;
  score += Math.min(EFUND_MONTHS[a.emergencyFund] ?? 0, 6) * 5;
  if (a.debt === "some") score -= 10;
  if (a.debt === "heavy") score -= 24;
  return clamp(score);
}

export const WEIGHTS = WEIGHT_BASE;

const worryAdjustedWeights = (worry: Answers["worry"]): ScoreWeights => {
  const adjusted = { ...WEIGHT_BASE };
  if (worry === "running_out" || worry === "healthcare") adjusted.withdrawal += 0.05;
  if (worry === "inflation") adjusted.inflation += 0.05;
  if (worry === "market") adjusted.market += 0.05;

  const total = adjusted.income + adjusted.withdrawal + adjusted.inflation + adjusted.market;
  return {
    income: adjusted.income / total,
    withdrawal: adjusted.withdrawal / total,
    inflation: adjusted.inflation / total,
    market: adjusted.market / total,
  };
};

export function computeScores(a: Answers): Result {
  const sub: SubScores = {
    income: Math.round(incomeStability(a)),
    withdrawal: Math.round(withdrawalSustainability(a)),
    inflation: Math.round(inflationImpact(a)),
    market: Math.round(marketRiskBuffer(a)),
  };
  const weights = worryAdjustedWeights(a.worry);
  const overall = Math.round(
    sub.income * weights.income +
      sub.withdrawal * weights.withdrawal +
      sub.inflation * weights.inflation +
      sub.market * weights.market
  );
  const band: ScoreBandLabel = overall >= 80 ? "Secure" : overall >= 60 ? "Mostly Secure" : overall >= 40 ? "At Risk" : "Vulnerable";
  return { overall, band, sub };
}

const ACTION_LIB: Record<keyof SubScores, string> = {
  income:
    "Your guaranteed income covers only part of your essentials. Before claiming Social Security, ask a fiduciary whether delaying raises your lifetime guaranteed income.",
  withdrawal:
    "Your savings may not last through your planning horizon. Map a withdrawal order (which accounts first) and a sustainable spending plan to review with a fiduciary.",
  inflation:
    "Much of your income isn't inflation-adjusted. List which income sources have a cost-of-living adjustment and which are fixed, so you can plan for rising costs.",
  market:
    "Your stock exposure, debt, or cash cushion may leave you exposed to sequence risk. Have a 'what mix is appropriate for me' conversation — not a specific buy/sell call.",
};

// Three personalized actions: from the two weakest sub-scores + one universal scam-safety action.
export function actions(_a: Answers, r: Result): string[] {
  const ranked = (Object.entries(r.sub) as [keyof SubScores, number][]).sort((x, y) => x[1] - y[1]);
  const out = [ACTION_LIB[ranked[0][0]], ACTION_LIB[ranked[1][0]]];
  out.push(
    "Run a quick scam check: confirm how your bank and the SSA actually contact you, and never act on an unsolicited call, text, or email about your money."
  );
  return out.slice(0, 3);
}
