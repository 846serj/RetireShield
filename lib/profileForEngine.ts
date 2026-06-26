import { FINANCIAL_PROFILE_DEFAULTS, type FinancialProfile } from "@/lib/engine/types";
import type { Answers } from "@/lib/scoring";

const SUSTAINABLE_WITHDRAWAL_RATE = 0.04;

function isMissing(value: unknown) {
  return value === null || value === undefined || value === "";
}

function numericValue(value: unknown) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
}

function knownNumber(value: unknown) {
  return numericValue(value) ?? 0;
}

function birthdateFromAge(age: unknown, monthDay = "07-01") {
  const numeric = numericValue(age);
  if (numeric === null || numeric <= 0) return null;
  return `${new Date().getUTCFullYear() - Math.floor(numeric)}-${monthDay}`;
}

function firstKnownNumber(...values: unknown[]) {
  for (const value of values) {
    const numeric = numericValue(value);
    if (numeric !== null) return numeric;
  }
  return null;
}

function fillIfMissing<T extends Partial<FinancialProfile>, K extends keyof FinancialProfile>(profile: T, field: K, value: FinancialProfile[K] | null | undefined) {
  if (!isMissing(profile[field]) || isMissing(value)) return;
  (profile as Partial<FinancialProfile>)[field] = value as FinancialProfile[K];
}

export function totalPortfolioForEngine(profile: Partial<FinancialProfile> | null | undefined, answers?: Partial<Answers> | null) {
  if (!profile) return knownNumber(answers?.savings);
  const profileTotal = knownNumber(profile.balance_taxable) + knownNumber(profile.balance_tax_deferred) + knownNumber(profile.balance_roth);
  return profileTotal || knownNumber(answers?.savings);
}

export function guaranteedMonthlyIncomeForEngine(profile: Partial<FinancialProfile> | null | undefined, answers?: Partial<Answers> | null) {
  if (!profile) return knownNumber(answers?.guaranteedIncome);
  const profileIncome = knownNumber(profile.ss_benefit_fra) + knownNumber(profile.spouse_ss_benefit_fra) + knownNumber(profile.pension_amount);
  return profileIncome || knownNumber(answers?.guaranteedIncome);
}

export function estimatedMonthlyIncomeForEngine(profile: Partial<FinancialProfile> | null | undefined, answers?: Partial<Answers> | null) {
  const sustainableWithdrawal = (totalPortfolioForEngine(profile, answers) * SUSTAINABLE_WITHDRAWAL_RATE) / 12;
  return guaranteedMonthlyIncomeForEngine(profile, answers) + sustainableWithdrawal;
}

export function hydrateProfileForEngine(profile: Partial<FinancialProfile> | null | undefined, answers?: Partial<Answers> | null): Partial<FinancialProfile> {
  const hydrated: Partial<FinancialProfile> = { ...(profile ?? {}) };
  if (!answers) return hydrated;

  fillIfMissing(hydrated, "birthdate", birthdateFromAge(answers.age));
  fillIfMissing(hydrated, "marital_status", answers.maritalStatus ?? null);
  fillIfMissing(hydrated, "state", answers.state ?? null);
  fillIfMissing(hydrated, "balance_taxable", numericValue(answers.balance_taxable));
  fillIfMissing(hydrated, "balance_tax_deferred", firstKnownNumber(answers.balance_tax_deferred, answers.savings));
  fillIfMissing(hydrated, "balance_roth", numericValue(answers.balance_roth));

  const stockPct = firstKnownNumber(answers.stockPct, 60);
  fillIfMissing(hydrated, "stock_pct", stockPct);
  if (isMissing(hydrated.bond_pct) && stockPct !== null) hydrated.bond_pct = Math.max(0, 100 - stockPct);
  fillIfMissing(hydrated, "cash_pct", 0);

  fillIfMissing(hydrated, "ss_benefit_fra", firstKnownNumber((answers as Record<string, unknown>).ssaBenefitEstimate, answers.guaranteedIncome));
  fillIfMissing(hydrated, "ss_claim_age", answers.claimedSocialSecurity === "yes" ? numericValue(answers.age) : (numericValue(answers.targetRetirementAge) ?? 67));
  fillIfMissing(hydrated, "spending_essential_monthly", numericValue(answers.essentialExpenses));
  fillIfMissing(hydrated, "spending_discretionary_monthly", 0);
  fillIfMissing(hydrated, "inflation_assumption", FINANCIAL_PROFILE_DEFAULTS.inflation_assumption);
  fillIfMissing(hydrated, "target_retirement_age", numericValue(answers.targetRetirementAge));
  fillIfMissing(hydrated, "planning_horizon_age", numericValue((answers as Record<string, unknown>).planning_horizon_age) ?? FINANCIAL_PROFILE_DEFAULTS.planning_horizon_age);

  return hydrated;
}
