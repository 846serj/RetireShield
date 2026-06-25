import { test } from "node:test";
import assert from "node:assert/strict";
import { isProfileScoreable } from "@/lib/profileCompleteness";

test("brand-new null profile is not scoreable", () => {
  assert.equal(isProfileScoreable(null, false), false);
});

test("manual profile requires real age and complete known planning inputs", () => {
  const partial = { birthdate: "1961-06-01", balance_taxable: 0, balance_tax_deferred: null, balance_roth: null };
  assert.equal(isProfileScoreable(partial, false), false);

  const complete = {
    birthdate: "1961-06-01",
    balance_taxable: 0,
    balance_tax_deferred: 0,
    balance_roth: 0,
    stock_pct: 60,
    bond_pct: 30,
    cash_pct: 10,
    ss_benefit_fra: 0,
    spending_essential_monthly: 0,
    spending_discretionary_monthly: 0,
  };
  assert.equal(isProfileScoreable(complete, false), true);
});

test("saved quiz score remains scoreable without manual profile fields", () => {
  assert.equal(isProfileScoreable(null, true), true);
});
