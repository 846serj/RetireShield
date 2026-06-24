import { test } from "node:test";
import assert from "node:assert";
import {
  buildFinancialPicture,
  cashCushion,
  classifyTransactions,
  detectRecurringBills,
  detectRecurringIncome,
  monthlyEssentialSpend,
  type SpendingAccount,
  type SpendingTransaction,
} from "../lib/engine/spending";

const fixtureTransactions: SpendingTransaction[] = [
  { transaction_id: "ssa-jan", date: "2026-01-03", amount: -1800, name: "SSA TREAS 310 SOCIAL SECURITY", personal_finance_category: "INCOME_RETIREMENT_PENSION" },
  { transaction_id: "ssa-feb", date: "2026-02-03", amount: -1800, name: "SSA TREAS 310 SOCIAL SECURITY", personal_finance_category: "INCOME_RETIREMENT_PENSION" },
  { transaction_id: "ssa-mar", date: "2026-03-03", amount: -1800, name: "SSA TREAS 310 SOCIAL SECURITY", personal_finance_category: "INCOME_RETIREMENT_PENSION" },
  { transaction_id: "pension-jan", date: "2026-01-01", amount: -950, name: "ACME Pension Trust", personal_finance_category: "INCOME_RETIREMENT_PENSION" },
  { transaction_id: "pension-feb", date: "2026-02-01", amount: -950, name: "ACME Pension Trust", personal_finance_category: "INCOME_RETIREMENT_PENSION" },
  { transaction_id: "pension-mar", date: "2026-03-01", amount: -950, name: "ACME Pension Trust", personal_finance_category: "INCOME_RETIREMENT_PENSION" },
  { transaction_id: "payroll-jan", date: "2026-01-15", amount: -1200, name: "PAYROLL RETIREMENT JOB", personal_finance_category: "INCOME_WAGES" },
  { transaction_id: "payroll-feb", date: "2026-02-15", amount: -1200, name: "PAYROLL RETIREMENT JOB", personal_finance_category: "INCOME_WAGES" },
  { transaction_id: "payroll-mar", date: "2026-03-15", amount: -1200, name: "PAYROLL RETIREMENT JOB", personal_finance_category: "INCOME_WAGES" },
  { transaction_id: "rent-jan", date: "2026-01-05", amount: 1400, name: "Riverside Rent", personal_finance_category: "RENT_AND_UTILITIES_RENT" },
  { transaction_id: "rent-feb", date: "2026-02-05", amount: 1400, name: "Riverside Rent", personal_finance_category: "RENT_AND_UTILITIES_RENT" },
  { transaction_id: "rent-mar", date: "2026-03-05", amount: 1400, name: "Riverside Rent", personal_finance_category: "RENT_AND_UTILITIES_RENT" },
  { transaction_id: "utility-jan", date: "2026-01-10", amount: 200, name: "City Electric", personal_finance_category: "RENT_AND_UTILITIES_GAS_AND_ELECTRICITY" },
  { transaction_id: "utility-feb", date: "2026-02-10", amount: 220, name: "City Electric", personal_finance_category: "RENT_AND_UTILITIES_GAS_AND_ELECTRICITY" },
  { transaction_id: "utility-mar", date: "2026-03-10", amount: 180, name: "City Electric", personal_finance_category: "RENT_AND_UTILITIES_GAS_AND_ELECTRICITY" },
  { transaction_id: "grocery-jan", date: "2026-01-12", amount: 300, merchant_name: "Fresh Market", personal_finance_category: "FOOD_AND_DRINK_GROCERIES" },
  { transaction_id: "grocery-feb", date: "2026-02-12", amount: 310, merchant_name: "Fresh Market", personal_finance_category: "FOOD_AND_DRINK_GROCERIES" },
  { transaction_id: "grocery-mar", date: "2026-03-12", amount: 290, merchant_name: "Fresh Market", personal_finance_category: "FOOD_AND_DRINK_GROCERIES" },
  { transaction_id: "netflix-jan", date: "2026-01-20", amount: 15.49, name: "Netflix", personal_finance_category: "ENTERTAINMENT_TV_AND_MOVIES" },
  { transaction_id: "netflix-feb", date: "2026-02-20", amount: 15.49, name: "Netflix", personal_finance_category: "ENTERTAINMENT_TV_AND_MOVIES" },
  { transaction_id: "netflix-mar", date: "2026-03-20", amount: 15.49, name: "Netflix", personal_finance_category: "ENTERTAINMENT_TV_AND_MOVIES" },
  { transaction_id: "refund", date: "2026-03-22", amount: -45, name: "Fresh Market Refund", personal_finance_category: "FOOD_AND_DRINK_GROCERIES" },
];

const fixtureAccounts: SpendingAccount[] = [
  { account_id: "checking", type: "depository", subtype: "checking", current_balance: 4000, available_balance: 3900 },
  { account_id: "savings", type: "depository", subtype: "savings", current_balance: 6100, available_balance: null },
  { account_id: "ira", type: "investment", subtype: "ira", current_balance: 100000 },
];

test("classifyTransactions marks override categories as essential", () => {
  const classified = classifyTransactions(fixtureTransactions);
  assert.equal(classified.find((txn) => txn.transaction_id === "grocery-jan")?.spendingType, "essential");
  assert.equal(classified.find((txn) => txn.transaction_id === "netflix-jan")?.spendingType, "discretionary");
});

test("monthlyEssentialSpend averages trailing three months of positive Plaid outflows only", () => {
  // Positive Plaid depository amounts are money leaving the account; the grocery refund is negative and is not spending.
  assert.equal(monthlyEssentialSpend(fixtureTransactions), 1900);
});

test("detectRecurringIncome finds SSA and pension as guaranteed monthly income", () => {
  const income = detectRecurringIncome(fixtureTransactions);
  assert.equal(income.guaranteedMonthlyIncome, 2750);
  assert.equal(income.incomeSources.find((source) => source.kind === "social_security")?.estimatedMonthlyAmount, 1800);
  assert.equal(income.incomeSources.find((source) => source.kind === "pension")?.estimatedMonthlyAmount, 950);
  assert.equal(income.incomeSources.find((source) => source.kind === "payroll")?.estimatedMonthlyAmount, 1200);
});

test("detectRecurringBills flags subscription creep", () => {
  const bills = detectRecurringBills(fixtureTransactions);
  assert.equal(bills.subscriptionCreep.count, 1);
  assert.equal(bills.subscriptionCreep.total, 15.49);
  assert.equal(bills.bills.find((bill) => bill.name === "NETFLIX")?.isSubscription, true);
});

test("cashCushion divides depository balances by monthly essentials", () => {
  assert.equal(cashCushion(fixtureAccounts, 1900), 5.26);
});

test("buildFinancialPicture computes the core spending picture", () => {
  const picture = buildFinancialPicture(fixtureTransactions, fixtureAccounts);
  assert.equal(picture.monthlyEssential, 1900);
  assert.equal(picture.monthlyDiscretionary, 15.49);
  assert.equal(picture.guaranteedIncome, 2750);
  assert.equal(picture.cashOnHand, 10000);
  assert.equal(picture.cushionMonths, 5.26);
  assert.equal(picture.incomeSources.length, 3);
});
