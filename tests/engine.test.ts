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
