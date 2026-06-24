import { test } from "node:test";
import assert from "node:assert";
import { allocation, buildPortfolioAnalysis, feeDrag } from "../lib/engine/portfolio";
import type { FinancialAccountRow, HoldingRow, SecurityRow } from "../lib/engine/portfolio";

const holdings: HoldingRow[] = [
  { account_id: "acct-1", security_id: "voo", ticker: "VOO", name: "Vanguard S&P 500 ETF", type: "etf", institution_value: 70_000 },
  { account_id: "acct-1", security_id: "bnd", ticker: "BND", name: "Vanguard Total Bond Market ETF", type: "etf", institution_value: 20_000 },
  { account_id: "acct-1", security_id: "aapl", ticker: "AAPL", name: "Apple Inc.", type: "equity", institution_value: 10_000 },
];

const securities: SecurityRow[] = [
  { security_id: "voo", ticker: "VOO", name: "Vanguard S&P 500 ETF", type: "etf", is_cash_equivalent: false, expense_ratio: null },
  { security_id: "bnd", ticker: "BND", name: "Vanguard Total Bond Market ETF", type: "etf", is_cash_equivalent: false, expense_ratio: null },
  { security_id: "aapl", ticker: "AAPL", name: "Apple Inc.", type: "equity", is_cash_equivalent: false, expense_ratio: null },
];

const accounts: FinancialAccountRow[] = [{ account_id: "acct-1", type: "investment", subtype: "brokerage", current_balance: 100_000 }];

test("portfolio analysis handles 70% VOO / 20% BND / 10% single-stock allocation, concentration, and fee drag", () => {
  const result = buildPortfolioAnalysis(holdings, securities, accounts);

  assert.equal(result.totalValue, 100_000);
  assert.equal(result.equityPct, 0.8);
  assert.equal(result.bondPct, 0.2);
  assert.equal(result.cashPct, 0);
  assert.equal(result.byTaxBucket.taxable, 100_000);
  assert.equal(result.concentration.largestPositionPct, 0.7);
  assert.equal(result.concentration.flagged, true);
  assert.equal(result.feeDragAnnual, 27);
  assert.equal(result.feeDragPct, 0.0003);
  assert.equal(result.partial, false);
});

test("unknown fund ticker sets partial true and excludes unknown value from fee drag", () => {
  const unknownHoldings: HoldingRow[] = [{ account_id: "acct-1", security_id: "mystery", ticker: "MYST", name: "Mystery ETF", type: "etf", institution_value: 50_000 }];
  const unknownSecurities: SecurityRow[] = [{ security_id: "mystery", ticker: "MYST", name: "Mystery ETF", type: "etf", is_cash_equivalent: false, expense_ratio: null }];

  const result = feeDrag(unknownHoldings, unknownSecurities);

  assert.equal(result.annualDollars, 0);
  assert.equal(result.pct, 0);
  assert.equal(result.partial, true);
  assert.deepEqual(result.unknownTickers, ["MYST"]);
});

test("allocation treats cash equivalents as cash", () => {
  const result = allocation([{ account_id: "cash", security_id: "cash", ticker: null, type: "cash", institution_value: 10_000 }], [{ security_id: "cash", ticker: null, type: "cash", is_cash_equivalent: true }]);

  assert.equal(result.cashPct, 1);
  assert.equal(result.totalValue, 10_000);
});
