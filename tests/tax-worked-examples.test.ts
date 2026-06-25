import { test } from "node:test";
import assert from "node:assert";
import { federalOrdinaryIncomeTax, irmaaSurcharge, longTermCapitalGainsTax, rmdAmount, taxableSocialSecurity, totalIncomeTaxes } from "../lib/engine/tax";
import { IRMAA_BRACKETS, IRMAA_STANDARD_PART_B_PREMIUM_MONTHLY, LTCG_BRACKETS, ORDINARY_BRACKETS, UNIFORM_LIFETIME_DIVISORS } from "../lib/engine/params/2026";

test("ordinary tax worked example uses 2026 single brackets", () => {
  assert.equal(federalOrdinaryIncomeTax(50000, "single"), 5752);
  assert.equal(federalOrdinaryIncomeTax(120000, "single"), 21398);
});

test("Social Security taxation caps at 85% of annual benefits", () => {
  assert.equal(taxableSocialSecurity(36000, 10000, 0, "single"), 4500);
  assert.equal(taxableSocialSecurity(36000, 100000, 0, "single"), 30600);
});

test("long-term capital gain tax stacks on ordinary income", () => {
  assert.equal(longTermCapitalGainsTax(10000, 40000, "single"), 0);
  assert.equal(longTermCapitalGainsTax(10000, 50000, "single"), 1500);
});

test("IRMAA boundary and RMD worked examples", () => {
  assert.equal(irmaaSurcharge(109000, "single"), 0);
  assert.equal(irmaaSurcharge(109001, "single"), 974.4);
  assert.equal(Math.round(rmdAmount(75, 246000)), 10000);
});

test("total tax combines federal, state estimate, taxable SS, and IRMAA", () => {
  const tax = totalIncomeTaxes({ status: "single", ages: [66], ordinaryIncome: 80000, socialSecurity: 24000, longTermCapitalGains: 10000, state: "CA", stateFlatRate: 0.05 });
  assert.equal(tax.taxableSocialSecurity, 20400);
  assert.equal(tax.irmaa, 974.4);
  assert.ok(tax.federalOrdinary > 0);
  assert.ok(tax.federalLtcg >= 0);
  assert.ok(tax.state > 0);
  assert.equal(tax.total, tax.federalOrdinary + tax.federalLtcg + tax.irmaa + tax.state);
});


test("2026 decision-engine parameters have no placeholders in sourced tables", () => {
  const assertFiniteNumber = (value: unknown, label: string) => {
    assert.equal(typeof value, "number", label);
    assert.ok(Number.isFinite(value), `${label} must be finite`);
  };

  assertFiniteNumber(IRMAA_STANDARD_PART_B_PREMIUM_MONTHLY, "Part B standard premium");

  for (const [status, brackets] of Object.entries({ IRMAA_BRACKETS, ORDINARY_BRACKETS, LTCG_BRACKETS }).flatMap(([name, table]) =>
    Object.entries(table).map(([status, brackets]) => [`${name}.${status}`, brackets] as const)
  )) {
    assert.ok(brackets.length > 0, `${status} must have brackets`);
    brackets.forEach((bracket, index) => {
      assert.equal(typeof bracket.upTo, "number", `${status}[${index}].upTo`);
      assert.ok(Number.isFinite(bracket.upTo) || bracket.upTo === Infinity, `${status}[${index}].upTo must be a threshold or Infinity`);
      const rateOrSurcharge = "rate" in bracket ? bracket.rate : bracket.annualSurcharge;
      assertFiniteNumber(rateOrSurcharge, `${status}[${index}] rate/surcharge`);
    });
  }

  for (let age = 72; age <= 120; age += 1) {
    assertFiniteNumber(UNIFORM_LIFETIME_DIVISORS[age], `Uniform Lifetime divisor age ${age}`);
  }
});
