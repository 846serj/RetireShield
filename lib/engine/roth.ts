import { CURRENT_YEAR, EXPECTED_RETURNS, IRMAA_BRACKETS, ORDINARY_BRACKETS, RMD_START_AGE, SOCIAL_SECURITY_COLA } from "./params/2026";
import { filingStatusFromMaritalStatus, rmdAmount, standardDeduction, taxableSocialSecurity, totalIncomeTaxes, type FilingStatus } from "./tax";
import type { FinancialProfile } from "./types";

export type RothConversionYear = {
  year: number;
  age: number;
  conversion: number;
  targetTaxableOrdinary: number;
  projectedMagi: number;
  federalTaxWithConversion: number;
  federalTaxWithoutConversion: number;
  irmaaWithConversion: number;
  irmaaWithoutConversion: number;
};

export type RothConversionAnalysis = {
  framing: "education";
  targetBracketRate: number;
  lifetimeFederalTaxWithConversions: number;
  lifetimeFederalTaxWithoutConversions: number;
  lifetimeFederalTaxImpact: number;
  lifetimeIrmaaWithConversions: number;
  lifetimeIrmaaWithoutConversions: number;
  lifetimeIrmaaImpact: number;
  totalConverted: number;
  years: RothConversionYear[];
  note: string;
};

function currentAge(birthdate: string | null) {
  if (!birthdate) return 0;
  return CURRENT_YEAR - Number(birthdate.slice(0, 4));
}

function expectedReturn(profile: FinancialProfile) {
  return (profile.stock_pct / 100) * EXPECTED_RETURNS.stock + (profile.bond_pct / 100) * EXPECTED_RETURNS.bond + (profile.cash_pct / 100) * EXPECTED_RETURNS.cash;
}

function socialSecurityForAge(monthlyFraBenefit: number, claimAge: number | null, age: number) {
  if (!claimAge || age < claimAge) return 0;
  const adjustment = claimAge < 67 ? 1 - (67 - claimAge) * 0.06 : 1 + (claimAge - 67) * 0.08;
  return monthlyFraBenefit * 12 * adjustment * (1 + SOCIAL_SECURITY_COLA) ** (age - claimAge);
}

export function ordinaryBracketCeiling(status: FilingStatus, targetBracketRate = 0.12) {
  return ORDINARY_BRACKETS[status].find((bracket) => bracket.rate >= targetBracketRate)?.upTo ?? ORDINARY_BRACKETS[status].at(-1)?.upTo ?? Infinity;
}

export function nextIrmaaCliff(magi: number, status: FilingStatus) {
  return IRMAA_BRACKETS[status].find((bracket) => magi < bracket.upTo)?.upTo ?? Infinity;
}

export function bracketFillRoom(input: { status: FilingStatus; ages: number[]; ordinaryIncome: number; socialSecurity: number; longTermCapitalGains?: number; targetBracketRate?: number; avoidIrmaa?: boolean }) {
  const longTermCapitalGains = input.longTermCapitalGains ?? 0;
  const taxableSs = taxableSocialSecurity(input.socialSecurity, input.ordinaryIncome + longTermCapitalGains, 0, input.status);
  const gross = input.ordinaryIncome + longTermCapitalGains + taxableSs;
  const deduction = standardDeduction(input.status, input.ages, gross);
  const taxableOrdinary = Math.max(0, input.ordinaryIncome + taxableSs - deduction);
  const bracketRoom = Math.max(0, ordinaryBracketCeiling(input.status, input.targetBracketRate) - taxableOrdinary);
  const magi = gross;
  const irmaaRoom = input.avoidIrmaa && input.ages.some((age) => age >= 63) ? Math.max(0, nextIrmaaCliff(magi, input.status) - magi) : Infinity;
  return Math.max(0, Math.min(bracketRoom, irmaaRoom));
}

function baselineIncome(profile: FinancialProfile, age: number) {
  const ss = socialSecurityForAge(profile.ss_benefit_fra, profile.ss_claim_age, age) + socialSecurityForAge(profile.spouse_ss_benefit_fra ?? 0, profile.spouse_ss_claim_age, age);
  const pensionBase = profile.pension_start_age && age >= profile.pension_start_age ? (profile.pension_amount ?? 0) * 12 : 0;
  const pension = profile.pension_has_cola ? pensionBase * (1 + profile.inflation_assumption) ** Math.max(0, age - (profile.pension_start_age ?? age)) : pensionBase;
  return { ss, pension };
}

function lifetimeScenario(profile: FinancialProfile, convert: boolean, targetBracketRate: number) {
  const status = filingStatusFromMaritalStatus(profile.marital_status);
  const startAge = currentAge(profile.birthdate);
  const rate = expectedReturn(profile);
  const balances = { taxDeferred: profile.balance_tax_deferred, roth: profile.balance_roth };
  let federal = 0;
  let irmaa = 0;
  let converted = 0;
  const years: RothConversionYear[] = [];

  for (let age = startAge; age <= profile.planning_horizon_age; age++) {
    const { ss, pension } = baselineIncome(profile, age);
    const rmd = Math.min(balances.taxDeferred, rmdAmount(age, balances.taxDeferred));
    balances.taxDeferred -= rmd;
    const ordinaryBeforeConversion = pension + rmd;
    const conversion = convert && age < RMD_START_AGE
      ? Math.min(balances.taxDeferred, bracketFillRoom({ status, ages: [age], ordinaryIncome: ordinaryBeforeConversion, socialSecurity: ss, targetBracketRate, avoidIrmaa: true }))
      : 0;
    balances.taxDeferred -= conversion;
    balances.roth += conversion;
    const without = totalIncomeTaxes({ status, ages: [age], ordinaryIncome: ordinaryBeforeConversion, socialSecurity: ss, longTermCapitalGains: 0, state: profile.state });
    const withConversion = totalIncomeTaxes({ status, ages: [age], ordinaryIncome: ordinaryBeforeConversion + conversion, socialSecurity: ss, longTermCapitalGains: 0, state: profile.state });
    const selected = convert ? withConversion : without;
    federal += selected.federalOrdinary + selected.federalLtcg;
    irmaa += selected.irmaa;
    converted += conversion;
    if (convert && conversion > 0) years.push({ year: CURRENT_YEAR + age - startAge, age, conversion, targetTaxableOrdinary: ordinaryBracketCeiling(status, targetBracketRate), projectedMagi: ordinaryBeforeConversion + conversion + withConversion.taxableSocialSecurity, federalTaxWithConversion: withConversion.federalOrdinary + withConversion.federalLtcg, federalTaxWithoutConversion: without.federalOrdinary + without.federalLtcg, irmaaWithConversion: withConversion.irmaa, irmaaWithoutConversion: without.irmaa });
    balances.taxDeferred *= 1 + rate;
    balances.roth *= 1 + rate;
  }
  return { federal, irmaa, converted, years };
}

export function analyzeRothConversion(profile: FinancialProfile, options: { targetBracketRate?: number } = {}): RothConversionAnalysis {
  const targetBracketRate = options.targetBracketRate ?? 0.12;
  const without = lifetimeScenario(profile, false, targetBracketRate);
  const withConversions = lifetimeScenario(profile, true, targetBracketRate);
  return {
    framing: "education",
    targetBracketRate,
    lifetimeFederalTaxWithConversions: withConversions.federal,
    lifetimeFederalTaxWithoutConversions: without.federal,
    lifetimeFederalTaxImpact: withConversions.federal - without.federal,
    lifetimeIrmaaWithConversions: withConversions.irmaa,
    lifetimeIrmaaWithoutConversions: without.irmaa,
    lifetimeIrmaaImpact: withConversions.irmaa - without.irmaa,
    totalConverted: withConversions.converted,
    years: withConversions.years,
    note: "Educational estimate only: models bracket-filling Roth conversions before RMD age and stops at the next projected IRMAA cliff when possible; it is not tax advice.",
  };
}
