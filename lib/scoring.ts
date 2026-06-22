// Retirement Safety Score — pure, testable scoring logic.
// Education only, NOT advice. No account/brokerage linking. See RetireShield-v0-Build-Layout.md §5.

export type Answers = {
  age: number;
  status: "working" | "near" | "retired";
  guaranteedIncome: number; // monthly $ from SS + pension + annuity
  essentialExpenses: number; // monthly $ essentials
  savingsBucket: "<50k" | "50-150k" | "150-500k" | "500k-1M" | "1M+";
  stockPct: 0 | 25 | 50 | 75 | 100;
  emergencyFund: "0" | "1-3" | "3-6" | "6+";
  debt: "none" | "some" | "heavy";
  worry: "running_out" | "inflation" | "market" | "scams" | "healthcare";
  state?: string; // 2-letter code; used for alert matching, not scoring
};

export type SubScores = { income: number; withdrawal: number; inflation: number; market: number };
export type Result = { overall: number; band: string; sub: SubScores };

const SAVINGS_MID: Record<Answers["savingsBucket"], number> = {
  "<50k": 25000, "50-150k": 100000, "150-500k": 325000, "500k-1M": 750000, "1M+": 1500000,
};
const EFUND_MONTHS: Record<Answers["emergencyFund"], number> = { "0": 0, "1-3": 2, "3-6": 4.5, "6+": 7 };

const clamp = (n: number, lo = 0, hi = 100) => Math.max(lo, Math.min(hi, n));

// Guaranteed income as a share of essentials, capped at 100%.
export function incomeStability(a: Answers): number {
  if (a.essentialExpenses <= 0) return 100;
  return clamp((a.guaranteedIncome / a.essentialExpenses) * 100);
}

// Can savings safely cover the monthly gap under a ~4%/yr safe-withdrawal lens?
export function withdrawalSustainability(a: Answers): number {
  const gap = Math.max(0, a.essentialExpenses - a.guaranteedIncome);
  if (gap <= 0) return 100;
  const safeMonthly = (SAVINGS_MID[a.savingsBucket] * 0.04) / 12;
  return clamp((safeMonthly / gap) * 100);
}

// Higher = better inflation protection. Guaranteed (COLA-leaning) income coverage is the proxy.
export function inflationImpact(a: Answers): number {
  const coverage = a.essentialExpenses > 0 ? a.guaranteedIncome / a.essentialExpenses : 1;
  let score = coverage * 70 + 15;
  if (a.worry === "inflation") score -= 10;
  return clamp(score);
}

// Age-appropriate equity mix + emergency cushion − debt drag. Rule of thumb target equity = 110 − age.
export function marketRiskBuffer(a: Answers): number {
  const targetEquity = clamp(110 - a.age);
  let score = 100 - Math.abs(a.stockPct - targetEquity);
  score += (EFUND_MONTHS[a.emergencyFund] - 3) * 4;
  if (a.debt === "some") score -= 8;
  if (a.debt === "heavy") score -= 18;
  return clamp(score);
}

export const WEIGHTS = { income: 0.35, withdrawal: 0.3, inflation: 0.15, market: 0.2 };

export function computeScores(a: Answers): Result {
  const sub: SubScores = {
    income: Math.round(incomeStability(a)),
    withdrawal: Math.round(withdrawalSustainability(a)),
    inflation: Math.round(inflationImpact(a)),
    market: Math.round(marketRiskBuffer(a)),
  };
  const overall = Math.round(
    sub.income * WEIGHTS.income +
      sub.withdrawal * WEIGHTS.withdrawal +
      sub.inflation * WEIGHTS.inflation +
      sub.market * WEIGHTS.market
  );
  const band = overall >= 80 ? "Secure" : overall >= 60 ? "Mostly Secure" : overall >= 40 ? "At Risk" : "Vulnerable";
  return { overall, band, sub };
}

const ACTION_LIB: Record<keyof SubScores, string> = {
  income:
    "Your guaranteed income covers only part of your essentials. Before claiming Social Security, ask a fiduciary whether delaying raises your lifetime guaranteed income.",
  withdrawal:
    "Your savings may not safely cover the gap between income and expenses. Map a withdrawal order (which accounts first) and a safe withdrawal rate to review with a fiduciary.",
  inflation:
    "Much of your income isn't inflation-adjusted. List which income sources have a cost-of-living adjustment and which are fixed, so you can plan for rising costs.",
  market:
    "Your stock exposure and cash cushion look off for your age. Have a 'what mix is appropriate for me' conversation — not a specific buy/sell call.",
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
