import {
  ADDITIONAL_STANDARD_DEDUCTION_65,
  IRMAA_BRACKETS,
  LTCG_BRACKETS,
  OBBBA_SENIOR_BONUS_DEDUCTION,
  ORDINARY_BRACKETS,
  RMD_START_AGE,
  SOCIAL_SECURITY_TAX_THRESHOLDS,
  STANDARD_DEDUCTION,
  UNIFORM_LIFETIME_DIVISORS,
} from "./params/2026";
import type { MaritalStatus } from "./types";

export type FilingStatus = "single" | "married";

export function filingStatusFromMaritalStatus(status: MaritalStatus | null | undefined): FilingStatus {
  return status === "married" ? "married" : "single";
}

function progressiveTax(amount: number, brackets: readonly { upTo: number; rate: number }[]) {
  let remaining = Math.max(0, amount);
  let lower = 0;
  let tax = 0;
  for (const bracket of brackets) {
    const taxableInBracket = Math.min(remaining, bracket.upTo - lower);
    if (taxableInBracket <= 0) break;
    tax += taxableInBracket * bracket.rate;
    remaining -= taxableInBracket;
    lower = bracket.upTo;
  }
  return tax;
}

export function seniorBonusDeduction(status: FilingStatus, ages: number[], grossIncome: number) {
  const eligible = ages.filter((age) => age >= OBBBA_SENIOR_BONUS_DEDUCTION.minAge).length;
  const grossBonus = eligible * OBBBA_SENIOR_BONUS_DEDUCTION.amountPerEligiblePerson;
  const excess = Math.max(0, grossIncome - OBBBA_SENIOR_BONUS_DEDUCTION.phaseoutStart[status]);
  return Math.max(0, grossBonus - excess * OBBBA_SENIOR_BONUS_DEDUCTION.phaseoutRate);
}

export function standardDeduction(status: FilingStatus, ages: number[], grossIncome = 0) {
  const base = STANDARD_DEDUCTION[status];
  const ageBonus = status === "married"
    ? ages.filter((age) => age >= 65).length * ADDITIONAL_STANDARD_DEDUCTION_65.marriedPerSpouse
    : ages.some((age) => age >= 65) ? ADDITIONAL_STANDARD_DEDUCTION_65.single : 0;
  return base + ageBonus + seniorBonusDeduction(status, ages, grossIncome);
}

export function taxableSocialSecurity(annualBenefit: number, nonSsIncome: number, taxExemptInterest: number, status: FilingStatus) {
  const provisional = nonSsIncome + taxExemptInterest + annualBenefit / 2;
  const thresholds = SOCIAL_SECURITY_TAX_THRESHOLDS[status];
  const firstTier = Math.min(Math.max(0, provisional - thresholds.base), thresholds.adjusted - thresholds.base) * 0.5;
  const secondTier = Math.max(0, provisional - thresholds.adjusted) * 0.85;
  return Math.min(annualBenefit * 0.85, firstTier + secondTier);
}

export function federalOrdinaryIncomeTax(taxableOrdinaryIncome: number, status: FilingStatus) {
  return progressiveTax(taxableOrdinaryIncome, ORDINARY_BRACKETS[status]);
}

export function longTermCapitalGainsTax(longTermGains: number, taxableOrdinaryIncome: number, status: FilingStatus) {
  let remaining = Math.max(0, longTermGains);
  let lower = 0;
  let tax = 0;
  for (const bracket of LTCG_BRACKETS[status]) {
    const room = Math.max(0, bracket.upTo - Math.max(lower, taxableOrdinaryIncome));
    const amount = Math.min(remaining, room);
    tax += amount * bracket.rate;
    remaining -= amount;
    lower = bracket.upTo;
    if (remaining <= 0) break;
  }
  return tax;
}

export function rmdAmount(age: number, priorYearEndTaxDeferredBalance: number) {
  if (age < RMD_START_AGE) return 0;
  const divisor = UNIFORM_LIFETIME_DIVISORS[Math.min(120, Math.floor(age))];
  return divisor ? priorYearEndTaxDeferredBalance / divisor : 0;
}

export function irmaaSurcharge(magi: number, status: FilingStatus) {
  return IRMAA_BRACKETS[status].find((bracket) => magi <= bracket.upTo)?.annualSurcharge ?? 0;
}

export function stateIncomeTax(taxableIncome: number, state: string | null | undefined, flatRate?: number) {
  if (!flatRate || ["AK", "FL", "NV", "SD", "TN", "TX", "WA", "WY"].includes((state ?? "").toUpperCase())) return 0;
  return Math.max(0, taxableIncome) * flatRate;
}

export function totalIncomeTaxes(input: {
  status: FilingStatus;
  ages: number[];
  ordinaryIncome: number;
  socialSecurity: number;
  longTermCapitalGains: number;
  state?: string | null;
  stateFlatRate?: number;
}) {
  const taxableSs = taxableSocialSecurity(input.socialSecurity, input.ordinaryIncome + input.longTermCapitalGains, 0, input.status);
  const gross = input.ordinaryIncome + input.longTermCapitalGains + taxableSs;
  const deduction = standardDeduction(input.status, input.ages, gross);
  const taxableOrdinary = Math.max(0, input.ordinaryIncome + taxableSs - deduction);
  const federalOrdinary = federalOrdinaryIncomeTax(taxableOrdinary, input.status);
  const federalLtcg = longTermCapitalGainsTax(input.longTermCapitalGains, taxableOrdinary, input.status);
  const magi = input.ordinaryIncome + input.longTermCapitalGains + taxableSs;
  const irmaa = input.ages.some((age) => age >= 65) ? irmaaSurcharge(magi, input.status) : 0;
  const state = stateIncomeTax(taxableOrdinary + input.longTermCapitalGains, input.state, input.stateFlatRate);
  return { federalOrdinary, federalLtcg, taxableSocialSecurity: taxableSs, irmaa, state, total: federalOrdinary + federalLtcg + irmaa + state };
}
