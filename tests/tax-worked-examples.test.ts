import { test } from "node:test";
import assert from "node:assert";
import { federalOrdinaryIncomeTax, irmaaSurcharge, longTermCapitalGainsTax, rmdAmount, taxableSocialSecurity, totalIncomeTaxes } from "../lib/engine/tax";

test("ordinary tax worked example uses 2026 single brackets", () => {
  assert.equal(federalOrdinaryIncomeTax(50000, "single"), 6053);
  assert.equal(federalOrdinaryIncomeTax(120000, "single"), 22386);
});

test("Social Security taxation caps at 85% of annual benefits", () => {
  assert.equal(taxableSocialSecurity(36000, 10000, 0, "single"), 4500);
  assert.equal(taxableSocialSecurity(36000, 100000, 0, "single"), 30600);
});

test("long-term capital gain tax stacks on ordinary income", () => {
  assert.equal(longTermCapitalGainsTax(10000, 40000, "single"), 0);
  assert.equal(longTermCapitalGainsTax(10000, 50000, "single"), 1295.25);
});

test("IRMAA boundary and RMD worked examples", () => {
  assert.equal(irmaaSurcharge(109000, "single"), 0);
  assert.equal(irmaaSurcharge(109001, "single"), 1062);
  assert.equal(Math.round(rmdAmount(75, 246000)), 10000);
});

test("total tax combines federal, state estimate, taxable SS, and IRMAA", () => {
  const tax = totalIncomeTaxes({ status: "single", ages: [66], ordinaryIncome: 80000, socialSecurity: 24000, longTermCapitalGains: 10000, state: "CA", stateFlatRate: 0.05 });
  assert.equal(tax.taxableSocialSecurity, 20400);
  assert.equal(tax.irmaa, 1062);
  assert.ok(tax.federalOrdinary > 0);
  assert.ok(tax.federalLtcg >= 0);
  assert.ok(tax.state > 0);
  assert.equal(tax.total, tax.federalOrdinary + tax.federalLtcg + tax.irmaa + tax.state);
});
