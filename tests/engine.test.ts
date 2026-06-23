import { test } from "node:test";
import assert from "node:assert";
import { federalOrdinaryIncomeTax, rmdAmount, standardDeduction, taxableSocialSecurity } from "../lib/engine/tax";
import { runProjection } from "../lib/engine/projection";
import type { FinancialProfile } from "../lib/engine/types";

const baseProfile: FinancialProfile = {
  user_id: "test",
  birthdate: "1961-07-01",
  marital_status: "single",
  spouse_birthdate: null,
  state: "TX",
  balance_taxable: 0,
  taxable_cost_basis: null,
  balance_tax_deferred: 0,
  balance_roth: 0,
  stock_pct: 60,
  bond_pct: 30,
  cash_pct: 10,
  ss_benefit_fra: 2500,
  ss_claim_age: 67,
  spouse_ss_benefit_fra: null,
  spouse_ss_claim_age: null,
  pension_amount: null,
  pension_start_age: null,
  pension_has_cola: false,
  pension_survivor_pct: null,
  spending_essential_monthly: 3500,
  spending_discretionary_monthly: 500,
  inflation_assumption: 0.03,
  target_retirement_age: 67,
  planning_horizon_age: 95,
  updated_at: null,
};

test("tax helpers match hand-computed ordinary and Social Security cases", () => {
  assert.equal(standardDeduction("single", [66], 40000), 23000);
  assert.equal(federalOrdinaryIncomeTax(60000, "single"), 8114);
  assert.equal(taxableSocialSecurity(24000, 20000, 0, "single"), 3500);
});

test("RMDs start at age 73 using the Uniform Lifetime divisor", () => {
  assert.equal(rmdAmount(72, 265000), 0);
  assert.equal(rmdAmount(73, 265000), 10000);
});

test("fully funded retiree does not deplete", () => {
  const projection = runProjection({ ...baseProfile, balance_taxable: 400000, balance_tax_deferred: 900000, balance_roth: 250000 });
  assert.equal(projection.depletionAge, null);
  assert.ok((projection.years.at(-1)?.endBalances.total ?? 0) > 0);
});

test("underfunded retiree depletes at the expected age", () => {
  const projection = runProjection({ ...baseProfile, balance_taxable: 20000, balance_tax_deferred: 60000, balance_roth: 0 });
  assert.equal(projection.depletionAge, 66);
});

test("projection forces RMDs in the first age-73 year", () => {
  const projection = runProjection({ ...baseProfile, balance_tax_deferred: 265000, spending_essential_monthly: 1000, spending_discretionary_monthly: 0 });
  assert.equal(projection.years.find((row) => row.age === 72)?.withdrawals.rmd, 0);
  assert.ok((projection.years.find((row) => row.age === 73)?.withdrawals.rmd ?? 0) > 0);
});

test("Monte Carlo gives strong plans a high success rate and weak plans a low rate", async () => {
  const { runMonteCarlo } = await import("../lib/engine/montecarlo");
  const strong = runMonteCarlo({ ...baseProfile, balance_taxable: 500000, balance_tax_deferred: 1200000, balance_roth: 300000 }, 300, { seed: "strong-plan" });
  const weak = runMonteCarlo({ ...baseProfile, balance_taxable: 10000, balance_tax_deferred: 30000, balance_roth: 0 }, 300, { seed: "weak-plan" });

  assert.ok(strong.probabilityOfSuccess > 0.85, `expected strong plan success > 85%, got ${strong.probabilityOfSuccess}`);
  assert.ok(weak.probabilityOfSuccess < 0.25, `expected weak plan success < 25%, got ${weak.probabilityOfSuccess}`);
  assert.equal(strong.paths.length, runProjection(baseProfile).years.length);
});

test("Social Security early reductions and delayed credits match SSA monthly formulas", async () => {
  const { socialSecurityClaimAdjustment, compareSocialSecurity } = await import("../lib/engine/socialSecurity");

  assert.equal(Math.round(socialSecurityClaimAdjustment(62) * 1000) / 1000, 0.7);
  assert.equal(Math.round(socialSecurityClaimAdjustment(67) * 1000) / 1000, 1);
  assert.equal(Math.round(socialSecurityClaimAdjustment(70) * 1000) / 1000, 1.24);

  const comparison = compareSocialSecurity({ ...baseProfile, ss_benefit_fra: 2000, planning_horizon_age: 90 }, { monteCarloRuns: 10 });
  assert.equal(comparison.framing, "education");
  assert.equal(comparison.strategies.find((strategy) => strategy.claimAge === 62)?.monthlyBenefit, 1400);
  assert.equal(comparison.strategies.find((strategy) => strategy.claimAge === 67)?.monthlyBenefit, 2000);
  assert.equal(comparison.strategies.find((strategy) => strategy.claimAge === 70)?.monthlyBenefit, 2480);
  assert.ok(comparison.breakEvenAges.some((item) => item.earlierClaimAge === 62 && item.laterClaimAge === 70));
});

test("safe spending solver finds the highest spending near the target success rate", async () => {
  const { solveSafeSpending } = await import("../lib/engine/withdrawal");
  const result = solveSafeSpending({ ...baseProfile, balance_taxable: 500000, balance_tax_deferred: 900000, balance_roth: 100000 }, 0.85);

  assert.ok(result.annualSpending > 0, "expected a positive safe spending amount");
  assert.ok(result.monthlySpending > 0, "expected a positive monthly spending amount");
  assert.ok(result.successRate >= 0.85, `expected solved success rate to hit target, got ${result.successRate}`);
  assert.equal(result.targetSuccess, 0.85);
});

test("guardrails returns modified Guyton-Klinger rules and a simulated path", async () => {
  const { guardrails } = await import("../lib/engine/withdrawal");
  const result = guardrails({ ...baseProfile, balance_taxable: 600000, balance_tax_deferred: 800000, balance_roth: 100000 });

  assert.ok(result.rules.note.includes("Guyton-Klinger"));
  assert.ok(result.rules.raiseTrigger < result.rules.withdrawalRate);
  assert.ok(result.rules.cutTrigger > result.rules.withdrawalRate);
  assert.equal(result.rules.raisePct, 0.10);
  assert.equal(result.rules.cutPct, 0.10);
  assert.equal(result.path.length, runProjection(baseProfile).years.length);
  assert.equal(result.path[0]?.action, "start");
  assert.ok((result.path[0]?.spending ?? 0) > 0);
});
