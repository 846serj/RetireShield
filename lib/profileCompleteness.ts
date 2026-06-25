import type { FinancialProfile } from "@/lib/engine/types";

type ProfileLike = Partial<FinancialProfile> & { age?: number | string | null };

const REQUIRED_MANUAL_FIELDS = [
  "balance_taxable",
  "balance_tax_deferred",
  "balance_roth",
  "stock_pct",
  "bond_pct",
  "cash_pct",
  "ss_benefit_fra",
  "spending_essential_monthly",
  "spending_discretionary_monthly",
] as const;

function finiteNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
}

function hasRealAgeOrBirthdate(profile: ProfileLike | null | undefined) {
  if (!profile) return false;
  const age = finiteNumber(profile.age);
  if (age !== null && age > 0) return true;
  if (typeof profile.birthdate !== "string" || profile.birthdate.trim() === "") return false;
  const time = new Date(profile.birthdate).getTime();
  return Number.isFinite(time);
}

function hasKnownValue(value: unknown) {
  return value !== null && value !== undefined && value !== "";
}

function hasCompleteManualInputs(profile: ProfileLike | null | undefined) {
  if (!profile) return false;
  return REQUIRED_MANUAL_FIELDS.every((field) => hasKnownValue(profile[field]));
}

export function isProfileScoreable(profile: ProfileLike | null | undefined, hasQuizScore: boolean): boolean {
  if (hasQuizScore) return true;
  return hasRealAgeOrBirthdate(profile) && hasCompleteManualInputs(profile);
}
