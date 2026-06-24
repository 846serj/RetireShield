import { test } from "node:test";
import assert from "node:assert/strict";
import { buildFinancialPicture } from "@/lib/engine/spending";
import { buildPortfolioAnalysis } from "@/lib/engine/portfolio";
import { computeScores } from "@/lib/scoring";
import { buildConnectedAnswers, buildConnectedProfileUpdate, updateProfileFromConnectedWithClient } from "@/lib/connected/profileSync";

const userId = "00000000-0000-0000-0000-000000000001";
const accounts = [
  { account_id: "checking", type: "depository", subtype: "checking", current_balance: 6_000, available_balance: 6_000 },
  { account_id: "taxable", type: "investment", subtype: "brokerage", current_balance: 0 },
  { account_id: "ira", type: "investment", subtype: "ira", current_balance: 0 },
  { account_id: "roth", type: "investment", subtype: "roth ira", current_balance: 0 },
];
const securities = [
  { security_id: "vti", ticker: "VTI", name: "Vanguard Total Stock", type: "etf", is_cash_equivalent: false, expense_ratio: 0.0003 },
  { security_id: "bnd", ticker: "BND", name: "Vanguard Bond", type: "etf", is_cash_equivalent: false, expense_ratio: 0.0003 },
  { security_id: "cash", ticker: null, name: "Cash", type: "cash", is_cash_equivalent: true, expense_ratio: 0 },
];
const holdings = [
  { account_id: "taxable", security_id: "vti", ticker: "VTI", name: "Vanguard Total Stock", type: "etf", institution_value: 100_000, cost_basis: 70_000 },
  { account_id: "ira", security_id: "bnd", ticker: "BND", name: "Vanguard Bond", type: "etf", institution_value: 50_000, cost_basis: 45_000 },
  { account_id: "roth", security_id: "cash", ticker: null, name: "Cash", type: "cash", institution_value: 25_000, cost_basis: 25_000 },
];
const transactions = [
  { transaction_id: "rent-1", account_id: "checking", date: "2026-04-02", amount: 2000, name: "Rent", personal_finance_category: "RENT" },
  { transaction_id: "rent-2", account_id: "checking", date: "2026-05-02", amount: 2000, name: "Rent", personal_finance_category: "RENT" },
  { transaction_id: "rent-3", account_id: "checking", date: "2026-06-02", amount: 2000, name: "Rent", personal_finance_category: "RENT" },
  { transaction_id: "fun-1", account_id: "checking", date: "2026-04-10", amount: 600, name: "Restaurant", personal_finance_category: "FOOD_AND_DRINK_RESTAURANT" },
  { transaction_id: "fun-2", account_id: "checking", date: "2026-05-10", amount: 600, name: "Restaurant", personal_finance_category: "FOOD_AND_DRINK_RESTAURANT" },
  { transaction_id: "fun-3", account_id: "checking", date: "2026-06-10", amount: 600, name: "Restaurant", personal_finance_category: "FOOD_AND_DRINK_RESTAURANT" },
  { transaction_id: "ssa-1", account_id: "checking", date: "2026-04-03", amount: -1500, name: "SSA BENEFIT", personal_finance_category: "INCOME_RETIREMENT_PENSION" },
  { transaction_id: "ssa-2", account_id: "checking", date: "2026-05-03", amount: -1500, name: "SSA BENEFIT", personal_finance_category: "INCOME_RETIREMENT_PENSION" },
  { transaction_id: "ssa-3", account_id: "checking", date: "2026-06-03", amount: -1500, name: "SSA BENEFIT", personal_finance_category: "INCOME_RETIREMENT_PENSION" },
];

test("connected picture and portfolio map to profile fields and connected Answers", () => {
  const picture = buildFinancialPicture(transactions, accounts);
  const portfolio = buildPortfolioAnalysis(holdings, securities, accounts);
  const existingProfile = {
    user_id: userId,
    birthdate: "1961-06-01",
    state: "CA",
    ss_benefit_fra: 1800,
    pension_amount: 300,
    marital_status: "single" as const,
  };

  const profile = buildConnectedProfileUpdate({ userId, existingProfile, financialPicture: picture, portfolio, holdings, accounts, now: new Date("2026-06-24T00:00:00Z") });
  assert.equal(profile.balance_taxable, 100000);
  assert.equal(profile.balance_tax_deferred, 50000);
  assert.equal(profile.balance_roth, 25000);
  assert.equal(profile.taxable_cost_basis, 70000);
  assert.equal(profile.stock_pct, 57.14);
  assert.equal(profile.bond_pct, 28.57);
  assert.equal(profile.cash_pct, 14.29);
  assert.equal(profile.spending_essential_monthly, 2000);
  assert.equal(profile.spending_discretionary_monthly, 600);
  assert.equal(profile.birthdate, "1961-06-01");
  assert.equal(profile.state, "CA");

  const answers = buildConnectedAnswers({ profile, financialPicture: picture, portfolio, quizAnswers: { debt: "some", worry: "inflation" }, now: new Date("2026-06-24T00:00:00Z") });
  assert.deepEqual({
    age: answers.age,
    savings: answers.savings,
    essentialExpenses: answers.essentialExpenses,
    guaranteedIncome: answers.guaranteedIncome,
    stockPct: answers.stockPct,
    emergencyFund: answers.emergencyFund,
    debt: answers.debt,
    worry: answers.worry,
    state: answers.state,
  }, {
    age: 65,
    savings: 181000,
    essentialExpenses: 2000,
    guaranteedIncome: 1500,
    stockPct: 50,
    emergencyFund: "3-6",
    debt: "some",
    worry: "inflation",
    state: "CA",
  });

  const result = computeScores(answers);
  const scoreRow = { user_id: userId, overall: result.overall, sub_scores: result.sub, band: result.band, answers, score_source: "connected" };
  assert.equal(scoreRow.score_source, "connected");
  assert.equal(scoreRow.answers.savings, 181000);
});


test("updateProfileFromConnectedWithClient upserts profile and inserts connected score", async () => {
  const writes: Record<string, unknown[]> = { profiles: [], scores: [] };
  const rows: Record<string, unknown> = {
    transactions,
    financial_accounts: accounts,
    holdings,
    securities,
    profiles: { user_id: userId, birthdate: "1961-06-01", state: "CA", ss_benefit_fra: 1800, marital_status: "single" },
    scores: { answers: { debt: "some", worry: "inflation" } },
  };

  function resultFor(table: string) {
    return { data: rows[table], error: null };
  }

  const fakeService = {
    from(table: string) {
      return {
        select(columns?: string) { return table === "securities" && columns === "*" ? resultFor(table) : this; },
        eq() { return table === "transactions" || table === "financial_accounts" || table === "holdings" ? resultFor(table) : this; },
        order() { return this; },
        limit() { return this; },
        maybeSingle() { return resultFor(table); },
        single() { return { data: { id: "score-id", user_id: userId }, error: null }; },
        upsert(row: unknown) { writes[table].push(row); return this; },
        insert(row: unknown) { writes[table].push(row); return this; },
      };
    },
  };

  const { profile, answers } = await updateProfileFromConnectedWithClient(fakeService as never, userId);
  assert.equal(profile.balance_taxable, 100000);
  assert.equal(answers.stockPct, 50);
  assert.equal(writes.profiles.length, 1);
  assert.equal(writes.scores.length, 1);
  assert.equal((writes.scores[0] as { score_source: string }).score_source, "connected");
});
