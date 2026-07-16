// Retirement Safety Score — 7-pillar, reality-based scoring. Education only, NOT advice.
import { DEFAULT_ASSUMPTIONS } from "@/lib/engine/params/2026";
import { projectDepletion } from "@/lib/engine/projection";
import type { ScoreBandLabel } from "@/lib/verdicts";

export type Answers = {
  age: number;
  maritalStatus?: "single" | "married" | "widowed" | "divorced";
  status: "working" | "near" | "retired";
  guaranteedIncome: number;
  essentialExpenses: number;
  desiredLifestyleSpending?: number;
  savings: number;
  savingsBucket?: "<50k" | "50-150k" | "150-500k" | "500k-1M" | "1M+";
  filingStatus?: "single" | "married_joint" | "married_separate" | "head_of_household" | "skip";
  targetRetirementAge?: number;
  ssaBenefitEstimate?: number;
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
  state?: string;
  planning_horizon_age?: 85 | 90 | 95 | 100 | number;
};

export type SubScores = {
  income: number;
  sustainability: number;
  inflation: number;
  market: number;
  timing: number;
  reserves: number;
  taxes: number;
};
export type Result = { overall: number; band: ScoreBandLabel; sub: SubScores };

type ScoreWeights = Record<keyof SubScores, number>;
const WEIGHT_BASE: ScoreWeights = {
  income: 0.24, sustainability: 0.24, inflation: 0.12, market: 0.1,
  timing: 0.1, reserves: 0.12, taxes: 0.08,
};
export const WEIGHTS = WEIGHT_BASE;

const FRA = 67;
const EFUND_MONTHS = { "0": 0, "1-3": 2, "3-6": 4.5, "6+": 7, skip: 0 } as const;
const HIGH_COL = new Set(["HI","CA","NY","MA","NJ","CT","WA","OR","MD","CO","RI","AK","VT","NH"]);
const LOW_COL = new Set(["MS","AL","AR","OK","KS","MO","TN","KY","WV","IN","IA","OH","ND","SD","NE"]);

const clamp = (n: number, lo = 0, hi = 100) => Math.max(lo, Math.min(hi, n));
const num = (v: unknown, d = 0) => (Number.isFinite(v as number) ? Number(v) : d);

const colMultiplier = (state?: string): number => {
  const c = state?.toUpperCase();
  if (!c) return 1;
  if (HIGH_COL.has(c)) return 0.92;
  if (LOW_COL.has(c)) return 1.08;
  return 1;
};

const planningHorizonAge = (a: Answers) =>
  Number.isFinite(a.planning_horizon_age) ? Math.max(Math.floor(num(a.age, 65)), Number(a.planning_horizon_age)) : 95;
const yearsToHorizon = (a: Answers) => Math.max(0, planningHorizonAge(a) - Math.floor(num(a.age, 65)));
const ssTotal = (a: Answers) => Math.max(0, num(a.ssaBenefitEstimate)) + Math.max(0, num(a.spouseSsaBenefitEstimate));
const investable = (a: Answers) =>
  Math.max(Math.max(0, num(a.savings)), Math.max(0, num(a.balance_taxable)) + Math.max(0, num(a.balance_tax_deferred)) + Math.max(0, num(a.balance_roth)));

const effectiveGuaranteed = (a: Answers) =>
  a.status !== "retired" ? Math.max(num(a.guaranteedIncome), ssTotal(a)) : num(a.guaranteedIncome);

const coverageScore = (coverage: number): number => {
  if (!Number.isFinite(coverage)) return 0;
  return coverage < 1 ? coverage * 70 : 70 + Math.min(30, ((coverage - 1) / 0.5) * 30);
};

function survivorGuaranteedIncome(a: Answers): number {
  const own = Math.max(0, num(a.ssaBenefitEstimate));
  const spouse = Math.max(0, num(a.spouseSsaBenefitEstimate));
  const lostSs = own > 0 && spouse > 0 ? Math.min(own, spouse) : 0;
  const pension = Math.max(0, num(a.pensionAmount));
  const survPct = Number.isFinite(a.pensionSurvivorPct) ? clamp(Number(a.pensionSurvivorPct), 0, 100) : 50;
  const lostPension = pension * (1 - survPct / 100);
  return Math.max(0, effectiveGuaranteed(a) - lostSs - lostPension);
}

function income(a: Answers): number {
  const essentials = Math.max(1, num(a.essentialExpenses));
  let s = coverageScore(effectiveGuaranteed(a) / essentials);
  if (a.maritalStatus === "married") {
    const surv = coverageScore(survivorGuaranteedIncome(a) / essentials);
    s = s * 0.7 + surv * 0.3;
  }
  return clamp(s * colMultiplier(a.state));
}

function sustainability(a: Answers): number {
  const essentials = Math.max(1, num(a.essentialExpenses));
  const desired = num(a.desiredLifestyleSpending) > 0 ? Math.max(num(a.desiredLifestyleSpending), essentials) : essentials;
  const target = essentials + 0.6 * Math.max(0, desired - essentials);
  const savings = investable(a) * 0.85;
  const gap = Math.max(0, target - effectiveGuaranteed(a));
  if (gap <= 0) {
    const cov = effectiveGuaranteed(a) / target;
    const surplus = 78 + Math.min(12, ((cov - 1) / 0.5) * 12);
    const buffer = Math.min(10, (savings / (target * 12)) * 2);
    return clamp((surplus + buffer) * colMultiplier(a.state));
  }
  const proj = projectDepletion({
    currentAge: num(a.age, 65), realSavings: savings, monthlyGap: gap,
    horizonAge: planningHorizonAge(a), stockPct: num(a.stockPct, 60), bondPct: 100 - num(a.stockPct, 60), cashPct: 0,
    inflationRate: DEFAULT_ASSUMPTIONS.inflation, socialSecurityCola: DEFAULT_ASSUMPTIONS.socialSecurityCola,
    monthlySocialSecurity: Math.min(effectiveGuaranteed(a), Math.max(0, num(a.ssaBenefitEstimate))),
  });
  const horizonYears = Math.max(1, yearsToHorizon(a));
  let s: number;
  if (proj.depletionAge === null) {
    const endYears = proj.realEndingBalance / Math.max(gap * 12, 1);
    s = 88 + Math.min(12, endYears * 2);
  } else {
    s = (Math.max(0, proj.depletionAge - Math.floor(num(a.age, 65))) / horizonYears) * 88;
  }
  return clamp(s * colMultiplier(a.state));
}

function inflation(a: Answers): number {
  const essentials = Math.max(1, num(a.essentialExpenses));
  const years = yearsToHorizon(a);
  const inf = DEFAULT_ASSUMPTIONS.inflation;
  const cola = DEFAULT_ASSUMPTIONS.socialSecurityCola;
  const gi = effectiveGuaranteed(a);
  const ss = ssTotal(a);
  const pensionCola = a.pensionHasCola === "yes" ? Math.max(0, num(a.pensionAmount)) : 0;
  const colaIncome = ss > 0 || pensionCola > 0 ? Math.min(gi, ss + pensionCola) : gi * 0.6;
  const fixed = Math.max(0, gi - colaIncome);
  const realCola = colaIncome * (((1 + cola) / (1 + inf)) ** years);
  const realFixed = fixed / ((1 + inf) ** years);
  return clamp(40 + ((realCola + realFixed) / essentials) * 60);
}

function market(a: Answers): number {
  const maxEquity = clamp(110 - num(a.age, 65), 20, 90);
  const over = Math.max(0, num(a.stockPct, 60) - maxEquity);
  let s = 74 - over * 0.9;
  s += Math.min(EFUND_MONTHS[a.emergencyFund] ?? 0, 6) * 4.5;
  if (a.debt === "some") s -= 10;
  if (a.debt === "heavy") s -= 24;
  return clamp(s);
}

function timing(a: Answers): number {
  const age = num(a.age, 65);
  let s = 68;
  if (a.claimedSocialSecurity === "no" && age < 70) s += 10;
  else if (a.claimedSocialSecurity === "yes") s += age >= FRA ? 5 : -8;
  if (a.status === "working") s += 8;
  else if (a.status === "near") s += 4;
  if (a.status !== "retired" && Number.isFinite(a.targetRetirementAge) && num(a.targetRetirementAge) > age) s += 4;
  const h = planningHorizonAge(a);
  if (h >= 95) s += 5;
  else if (h < 85) s -= 5;
  if (a.maritalStatus === "married" && Number.isFinite(a.spouseAge) && num(a.spouseAge) < age - 5) s -= 5;
  return clamp(s);
}

function reserves(a: Answers): number {
  let s = 52;
  if (a.ownsHome === "yes") {
    const eq = Math.max(0, num(a.homeEquity));
    s += eq >= 250000 ? 18 : eq >= 100000 ? 12 : eq > 0 ? 6 : 8;
    if (a.planToDownsize === "yes") s += 6;
  }
  s += Math.min(EFUND_MONTHS[a.emergencyFund] ?? 0, 6) * 3;
  if (a.debt === "some") s -= 6;
  if (a.debt === "heavy") s -= 15;
  if (a.status === "working") s += 8;
  else if (a.status === "near") s += 4;
  return clamp(s);
}

function taxes(a: Answers): number {
  const t = Math.max(0, num(a.balance_taxable));
  const d = Math.max(0, num(a.balance_tax_deferred));
  const r = Math.max(0, num(a.balance_roth));
  const total = t + d + r;
  if (total <= 0) return 60;
  const buckets = [t, d, r].filter((x) => x / total > 0.05).length;
  let s = buckets >= 3 ? 90 : buckets === 2 ? 72 : 50;
  if (r / total > 0.05) s += 8;
  if (a.filingStatus === "married_joint") s += 2;
  return clamp(s);
}

const worryAdjustedWeights = (worry: Answers["worry"]): ScoreWeights => {
  const w = { ...WEIGHT_BASE };
  if (worry === "running_out" || worry === "healthcare") w.sustainability += 0.04;
  else if (worry === "inflation") w.inflation += 0.04;
  else if (worry === "market") w.market += 0.04;
  const total = (Object.values(w) as number[]).reduce((s, x) => s + x, 0);
  (Object.keys(w) as (keyof SubScores)[]).forEach((k) => (w[k] = w[k] / total));
  return w;
};

export function computeScores(a: Answers): Result {
  const sub: SubScores = {
    income: Math.round(income(a)),
    sustainability: Math.round(sustainability(a)),
    inflation: Math.round(inflation(a)),
    market: Math.round(market(a)),
    timing: Math.round(timing(a)),
    reserves: Math.round(reserves(a)),
    taxes: Math.round(taxes(a)),
  };
  const w = worryAdjustedWeights(a.worry);
  const overall = Math.round(
    (Object.keys(sub) as (keyof SubScores)[]).reduce((s, k) => s + sub[k] * w[k], 0)
  );
  const band: ScoreBandLabel =
    overall >= 80 ? "Secure" : overall >= 60 ? "Mostly Secure" : overall >= 40 ? "At Risk" : "Vulnerable";
  return { overall, band, sub };
}

export const ACTION_LIB: Record<keyof SubScores, string> = {
  income: "Your guaranteed income covers only part of your essentials. Before claiming Social Security, ask a fiduciary whether delaying raises your lifetime guaranteed income.",
  sustainability: "Your savings may not last through your planning horizon at the spending you want. Map a withdrawal order and a sustainable spending plan to review with a fiduciary.",
  inflation: "A large share of your income isn't inflation-adjusted. List which income sources have a cost-of-living adjustment and which are fixed, so you can plan for rising costs.",
  market: "Your stock exposure, cash cushion, or debt may leave you exposed to a bad market year early in retirement. Have a 'what mix fits me' conversation — not a specific buy/sell call.",
  timing: "Your Social Security and retirement timing may be leaving guaranteed income on the table. Compare claiming ages and target dates before you lock them in.",
  reserves: "Your backstops are thin. Review your emergency fund, home-equity options, and debt so an unexpected cost doesn't force a bad decision.",
  taxes: "Your savings sit mostly in one tax bucket. Knowing your taxable, tax-deferred, and Roth balances can lower lifetime taxes and IRMAA surprises — worth a fiduciary review.",
};

export function actions(_a: Answers, r: Result): string[] {
  const ranked = (Object.entries(r.sub) as [keyof SubScores, number][]).sort((x, y) => x[1] - y[1]);
  return [
    ACTION_LIB[ranked[0][0]],
    ACTION_LIB[ranked[1][0]],
    "Run a quick scam check: confirm how your bank and the SSA actually contact you, and never act on an unsolicited call, text, or email about your money.",
  ].slice(0, 3);
}
