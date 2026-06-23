import { runMonteCarlo } from "./montecarlo";
import { runProjection } from "./projection";
import type { FinancialProfile } from "./types";

export type SafeSpendingResult = {
  annualSpending: number;
  monthlySpending: number;
  targetSuccess: number;
  successRate: number;
  iterations: number;
};

export type GuardrailRuleSet = {
  withdrawalRate: number;
  raiseTrigger: number;
  cutTrigger: number;
  raisePct: number;
  cutPct: number;
  inflationAdjustment: number;
  spendingFloor: number;
  spendingCeiling: number;
  note: string;
};

export type GuardrailPathPoint = {
  year: number;
  age: number;
  spending: number;
  balance: number;
  withdrawalRate: number;
  action: "start" | "raise" | "cut" | "inflation" | "floor" | "ceiling";
};

export type GuardrailsResult = {
  rules: GuardrailRuleSet;
  path: GuardrailPathPoint[];
};

type SpendingProfileOptions = {
  preserveEssential?: boolean;
};

function currentAnnualSpending(profile: FinancialProfile) {
  return (profile.spending_essential_monthly + profile.spending_discretionary_monthly) * 12;
}

function totalPortfolio(profile: FinancialProfile) {
  return profile.balance_taxable + profile.balance_tax_deferred + profile.balance_roth;
}

function withAnnualSpending(profile: FinancialProfile, annualSpending: number, options: SpendingProfileOptions = {}): FinancialProfile {
  const safeAnnual = Math.max(0, annualSpending);
  if (!options.preserveEssential) {
    return { ...profile, spending_essential_monthly: safeAnnual / 12, spending_discretionary_monthly: 0 };
  }

  const essentialAnnual = Math.min(profile.spending_essential_monthly * 12, safeAnnual);
  return {
    ...profile,
    spending_essential_monthly: essentialAnnual / 12,
    spending_discretionary_monthly: Math.max(0, safeAnnual - essentialAnnual) / 12,
  };
}

export function solveSafeSpending(profile: FinancialProfile, targetSuccess = 0.85): SafeSpendingResult {
  const target = Math.min(0.99, Math.max(0.01, targetSuccess));
  const startingSpending = Math.max(1, currentAnnualSpending(profile));
  const portfolio = totalPortfolio(profile);
  let low = 0;
  let high = Math.max(startingSpending * 2, portfolio * 0.12, 120_000);
  let bestSpending = 0;
  let bestSuccess = 1;
  let iterations = 0;

  const successFor = (annualSpending: number) => runMonteCarlo(
    withAnnualSpending(profile, annualSpending),
    400,
    { seed: `safe-spending:${profile.user_id}:${Math.round(annualSpending)}` },
  ).probabilityOfSuccess;

  while (successFor(high) >= target && high < Math.max(1_000_000, portfolio)) {
    low = high;
    bestSpending = high;
    bestSuccess = successFor(high);
    high *= 1.5;
  }

  for (iterations = 0; iterations < 18; iterations++) {
    const mid = (low + high) / 2;
    const successRate = successFor(mid);
    if (successRate >= target) {
      low = mid;
      bestSpending = mid;
      bestSuccess = successRate;
    } else {
      high = mid;
    }
  }

  return {
    annualSpending: Math.round(bestSpending),
    monthlySpending: Math.round(bestSpending / 12),
    targetSuccess: target,
    successRate: bestSuccess,
    iterations,
  };
}

export function guardrails(profile: FinancialProfile): GuardrailsResult {
  const safe = solveSafeSpending(profile);
  const startingBalance = Math.max(1, totalPortfolio(profile));
  const withdrawalRate = safe.annualSpending / startingBalance;
  const rules: GuardrailRuleSet = {
    withdrawalRate,
    raiseTrigger: withdrawalRate * 0.8,
    cutTrigger: withdrawalRate * 1.2,
    raisePct: 0.10,
    cutPct: 0.10,
    inflationAdjustment: profile.inflation_assumption,
    spendingFloor: safe.annualSpending * 0.75,
    spendingCeiling: safe.annualSpending * 1.5,
    note: "Modified Guyton-Klinger: start from the Monte Carlo safe spending amount, take inflation raises while the current withdrawal rate stays inside the guardrails, skip the inflation raise and cut spending by 10% above the upper guardrail, and raise spending by 10% below the lower guardrail.",
  };

  const projection = runProjection(withAnnualSpending(profile, safe.annualSpending, { preserveEssential: true }));
  let spending = safe.annualSpending;
  const path = projection.years.map((year, index): GuardrailPathPoint => {
    const balance = Math.max(0, year.endBalances.total);
    const currentRate = balance > 0 ? spending / balance : Number.POSITIVE_INFINITY;
    let action: GuardrailPathPoint["action"] = index === 0 ? "start" : "inflation";

    if (index > 0) {
      if (currentRate > rules.cutTrigger) {
        spending *= 1 - rules.cutPct;
        action = "cut";
      } else if (currentRate < rules.raiseTrigger) {
        spending *= 1 + profile.inflation_assumption + rules.raisePct;
        action = "raise";
      } else {
        spending *= 1 + profile.inflation_assumption;
      }

      if (spending < rules.spendingFloor) {
        spending = rules.spendingFloor;
        action = "floor";
      } else if (spending > rules.spendingCeiling) {
        spending = rules.spendingCeiling;
        action = "ceiling";
      }
    }

    return { year: year.year, age: year.age, spending: Math.round(spending), balance, withdrawalRate: balance > 0 ? spending / balance : Number.POSITIVE_INFINITY, action };
  });

  return { rules, path };
}
