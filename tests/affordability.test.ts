import { test } from "node:test";
import assert from "node:assert";
import { analyzeAffordability } from "../lib/engine/affordability";
import type { FinancialProfile } from "../lib/engine/types";

const profile = (patch: Partial<FinancialProfile> = {}): FinancialProfile => ({
  user_id: "u1",
  birthdate: "1961-01-01",
  marital_status: "single",
  spouse_birthdate: null,
  state: "CA",
  balance_taxable: 600000,
  taxable_cost_basis: 500000,
  balance_tax_deferred: 600000,
  balance_roth: 200000,
  stock_pct: 50,
  bond_pct: 40,
  cash_pct: 10,
  ss_benefit_fra: 3200,
  ss_claim_age: 67,
  spouse_ss_benefit_fra: null,
  spouse_ss_claim_age: null,
  pension_amount: 1500,
  pension_start_age: 65,
  pension_has_cola: false,
  pension_survivor_pct: null,
  spending_essential_monthly: 3500,
  spending_discretionary_monthly: 1500,
  inflation_assumption: 0.03,
  target_retirement_age: 67,
  planning_horizon_age: 95,
  updated_at: null,
  ...patch,
});

test("affordable one-off returns yes", () => {
  const result = analyzeAffordability({ kind: "spend", timing: "oneoff", amount: 10000, fundingSource: "taxable" }, profile());
  assert.equal(result.verdict, "YES");
  assert.equal(result.essentials.coveredForLife, true);
});

test("IRA-funded one-off crossing IRMAA line cautions and suggests taxable with safeMax", () => {
  const result = analyzeAffordability({ kind: "spend", timing: "oneoff", amount: 120000, fundingSource: "tax_deferred", startAge: 65 }, profile({ balance_taxable: 200000 }));
  assert.notEqual(result.verdict, "NO");
  assert.ok(["CAUTION", "YES"].includes(result.verdict));
  assert.ok(result.ripple);
  assert.equal(result.ripple?.cheaperAlternative, "taxable");
  assert.ok(result.alternatives.some((a) => a.toLowerCase().includes("taxable")));
  assert.ok((result.safeMax ?? 0) > 0);
});

test("unaffordable recurring returns no", () => {
  const result = analyzeAffordability({ kind: "spend", timing: "recurring", amount: 180000 }, profile({ balance_taxable: 30000, balance_tax_deferred: 30000, balance_roth: 0, ss_benefit_fra: 1000, pension_amount: 0 }));
  assert.equal(result.verdict, "NO");
});

test("sparse profile needs profile", () => {
  const result = analyzeAffordability({ kind: "spend", timing: "oneoff", amount: 1000 }, profile({ birthdate: null, spending_essential_monthly: null, balance_taxable: null, balance_tax_deferred: null, balance_roth: null }));
  assert.equal(result.needsProfile, true);
});
