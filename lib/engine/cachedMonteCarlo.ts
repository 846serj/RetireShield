import { unstable_cache } from "next/cache";
import { createHash } from "crypto";
import { runMonteCarlo } from "@/lib/engine/montecarlo";
import type { FinancialProfile } from "@/lib/engine/types";

const ENGINE_FIELDS: (keyof FinancialProfile)[] = [
  "birthdate", "marital_status", "spouse_birthdate", "state", "balance_taxable", "taxable_cost_basis",
  "balance_tax_deferred", "balance_roth", "stock_pct", "bond_pct", "cash_pct", "ss_benefit_fra",
  "ss_claim_age", "spouse_ss_benefit_fra", "spouse_ss_claim_age", "pension_amount", "pension_start_age",
  "pension_has_cola", "pension_survivor_pct", "other_taxable_income", "spending_essential_monthly",
  "spending_discretionary_monthly", "inflation_assumption", "target_retirement_age", "planning_horizon_age",
];

export function monteCarloProfileHash(profile: FinancialProfile) {
  const relevant = Object.fromEntries(ENGINE_FIELDS.map((field) => [field, profile[field]]));
  return createHash("sha256").update(JSON.stringify(relevant)).digest("hex").slice(0, 16);
}

const runCachedMonteCarlo = unstable_cache(
  async (_hash: string, profile: FinancialProfile, runs: number, seed: string) => runMonteCarlo(profile, runs, { seed }),
  ["monte-carlo"],
  { revalidate: 600 }
);

export function getCachedMonteCarlo(profile: FinancialProfile, runs: number, seed: string) {
  return runCachedMonteCarlo(monteCarloProfileHash(profile), profile, runs, seed);
}
