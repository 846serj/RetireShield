import { CURRENT_YEAR, EXPECTED_RETURNS, FULL_RETIREMENT_AGE, RMD_START_AGE, SOCIAL_SECURITY_COLA } from "./params/2026";
import { bracketFillRoom } from "./roth";
import { filingStatusFromMaritalStatus, rmdAmount, totalIncomeTaxes } from "./tax";
import type { FinancialProfile } from "./types";

export type ProjectionYear = {
  year: number; age: number; income: number; spending: number; taxes: number;
  withdrawals: { taxable: number; taxDeferred: number; roth: number; rmd: number };
  taxStrategy?: string;
  endBalances: { taxable: number; taxDeferred: number; roth: number; total: number };
};

function currentAge(birthdate: string | null) {
  if (!birthdate) return 0;
  return CURRENT_YEAR - Number(birthdate.slice(0, 4));
}

function expectedReturn(profile: FinancialProfile) {
  return (profile.stock_pct / 100) * EXPECTED_RETURNS.stock + (profile.bond_pct / 100) * EXPECTED_RETURNS.bond + (profile.cash_pct / 100) * EXPECTED_RETURNS.cash;
}

function withdraw(amount: number, balances: { taxable: number; taxDeferred: number; roth: number }) {
  let need = Math.max(0, amount);
  const taxable = Math.min(balances.taxable, need); balances.taxable -= taxable; need -= taxable;
  const taxDeferred = Math.min(balances.taxDeferred, need); balances.taxDeferred -= taxDeferred; need -= taxDeferred;
  const roth = Math.min(balances.roth, need); balances.roth -= roth; need -= roth;
  return { taxable, taxDeferred, roth, unmet: need };
}

function withdrawTaxOptimized(amount: number, balances: { taxable: number; taxDeferred: number; roth: number }, taxDeferredRoom: number) {
  let need = Math.max(0, amount);
  const taxable = Math.min(balances.taxable, need); balances.taxable -= taxable; need -= taxable;
  const bracketTaxDeferred = Math.min(balances.taxDeferred, need, Math.max(0, taxDeferredRoom)); balances.taxDeferred -= bracketTaxDeferred; need -= bracketTaxDeferred;
  const roth = Math.min(balances.roth, need); balances.roth -= roth; need -= roth;
  const taxDeferred = bracketTaxDeferred + Math.min(balances.taxDeferred, need); balances.taxDeferred -= taxDeferred - bracketTaxDeferred; need -= taxDeferred - bracketTaxDeferred;
  return { taxable, taxDeferred, roth, unmet: need };
}

function socialSecurityForAge(monthlyFraBenefit: number, claimAge: number | null, age: number) {
  if (!claimAge || age < claimAge) return 0;
  const adjustment = claimAge < FULL_RETIREMENT_AGE ? 1 - (FULL_RETIREMENT_AGE - claimAge) * 0.06 : 1 + (claimAge - FULL_RETIREMENT_AGE) * 0.08;
  return monthlyFraBenefit * 12 * adjustment * (1 + SOCIAL_SECURITY_COLA) ** (age - claimAge);
}

export function runProjection(profile: FinancialProfile, options: { annualReturns?: number[]; drawdownMode?: "standard" | "taxOptimized"; targetBracketRate?: number } = {}) {
  const startAge = currentAge(profile.birthdate);
  const status = filingStatusFromMaritalStatus(profile.marital_status);
  const rate = expectedReturn(profile);
  const rows: ProjectionYear[] = [];
  const balances = { taxable: profile.balance_taxable, taxDeferred: profile.balance_tax_deferred, roth: profile.balance_roth };
  let depletionAge: number | null = null;

  for (let age = startAge; age <= profile.planning_horizon_age; age++) {
    const yearIndex = age - startAge;
    const ss = socialSecurityForAge(profile.ss_benefit_fra, profile.ss_claim_age, age)
      + socialSecurityForAge(profile.spouse_ss_benefit_fra ?? 0, profile.spouse_ss_claim_age, age);
    const pensionBase = profile.pension_start_age && age >= profile.pension_start_age ? (profile.pension_amount ?? 0) * 12 : 0;
    const pension = profile.pension_has_cola ? pensionBase * (1 + profile.inflation_assumption) ** Math.max(0, age - (profile.pension_start_age ?? age)) : pensionBase;
    const income = ss + pension;
    const spending = (profile.spending_essential_monthly + profile.spending_discretionary_monthly) * 12 * (1 + profile.inflation_assumption) ** yearIndex;

    const rmd = Math.min(balances.taxDeferred, rmdAmount(age, balances.taxDeferred));
    balances.taxDeferred -= rmd;
    const firstTax = totalIncomeTaxes({ status, ages: [age], ordinaryIncome: pension + rmd, socialSecurity: ss, longTermCapitalGains: 0, state: profile.state });
    const gapBeforeTaxes = Math.max(0, spending + firstTax.total - income - rmd);
    const taxDeferredRoom = options.drawdownMode === "taxOptimized"
      ? bracketFillRoom({ status, ages: [age], ordinaryIncome: pension + rmd, socialSecurity: ss, targetBracketRate: options.targetBracketRate ?? 0.12, avoidIrmaa: true })
      : Infinity;
    const draw = options.drawdownMode === "taxOptimized" ? withdrawTaxOptimized(gapBeforeTaxes, balances, taxDeferredRoom) : withdraw(gapBeforeTaxes, balances);
    const taxableBasisRatio = profile.balance_taxable > 0 ? Math.min(1, Math.max(0, (profile.taxable_cost_basis ?? profile.balance_taxable) / profile.balance_taxable)) : 1;
    const capGains = draw.taxable * (1 - taxableBasisRatio);
    const finalTax = totalIncomeTaxes({ status, ages: [age], ordinaryIncome: pension + rmd + draw.taxDeferred, socialSecurity: ss, longTermCapitalGains: capGains, state: profile.state });
    const extraTax = Math.max(0, finalTax.total - firstTax.total);
    const taxDraw = withdraw(extraTax, balances);
    const withdrawals = { taxable: draw.taxable + taxDraw.taxable, taxDeferred: draw.taxDeferred + taxDraw.taxDeferred, roth: draw.roth + taxDraw.roth, rmd };

    const annualReturn = options.annualReturns?.[yearIndex] ?? rate;
    balances.taxable *= 1 + annualReturn;
    balances.taxDeferred *= 1 + annualReturn;
    balances.roth *= 1 + annualReturn;
    const total = balances.taxable + balances.taxDeferred + balances.roth;
    if (depletionAge === null && total <= 1 && age < profile.planning_horizon_age) depletionAge = age;
    rows.push({ year: CURRENT_YEAR + yearIndex, age, income, spending, taxes: finalTax.total, withdrawals, endBalances: { ...balances, total }, taxStrategy: options.drawdownMode === "taxOptimized" ? "Fills low ordinary brackets with tax-deferred withdrawals, then uses Roth dollars before crossing the next projected IRMAA cliff when possible." : undefined });
  }
  return { years: rows, depletionAge };
}
