import test from "node:test";
import assert from "node:assert/strict";
import { detectFraudFlags } from "../lib/engine/fraud";
import { getMatchedAlerts, type Alert } from "../lib/alerts";

function supabaseWith(data: Alert[]) {
  return {
    from() {
      return {
        select() { return this; },
        or() { return this; },
        order() { return this; },
        limit() { return Promise.resolve({ data }); },
      };
    },
  } as any;
}

test("fraud engine scores a $9,000 wire to a brand-new payee and gift-card spend", () => {
  const transactions = [
    { transaction_id: "old-1", account_id: "checking", date: "2026-05-01", amount: 80, name: "Grocery Store", category: "Food and Drink" },
    { transaction_id: "wire-1", account_id: "checking", date: "2026-06-20", amount: 9000, name: "WIRE TRANSFER ACME SETTLEMENT", personal_finance_category: "TRANSFER_OUT_ACCOUNT_TRANSFER" },
    { transaction_id: "gift-1", account_id: "checking", date: "2026-06-21", amount: 600, merchant_name: "Best Buy Gift Card", category: "Shops > Gift Cards" },
  ];

  const flags = detectFraudFlags(transactions, { accounts: [{ account_id: "checking", type: "depository", subtype: "checking", current_balance: 12000 }] });

  assert.equal(flags[0].transaction.transaction_id, "wire-1");
  assert.equal(flags[0].riskScore, 95);
  assert.match(flags[0].reason, /brand-new payee/);
  const giftCard = flags.find((flag) => flag.transaction.transaction_id === "gift-1");
  assert.ok(giftCard);
  assert.equal(giftCard!.riskScore, 92);
});

test("getMatchedAlerts surfaces high-risk fraud flags as personalized scam alerts", async () => {
  const alerts = await getMatchedAlerts(
    supabaseWith([]),
    { age: 70, worry: "scams", state: "CA" },
    5,
    {
      transactions: [
        { transaction_id: "wire-1", account_id: "checking", date: "2026-06-20", amount: 9000, name: "WIRE TRANSFER ACME SETTLEMENT", personal_finance_category: "TRANSFER_OUT_ACCOUNT_TRANSFER" },
        { transaction_id: "gift-1", account_id: "checking", date: "2026-06-21", amount: 600, merchant_name: "Best Buy Gift Card", category: "Shops > Gift Cards" },
      ],
      accounts: [{ account_id: "checking", type: "depository", subtype: "checking", current_balance: 12000 }],
      now: new Date("2026-06-24T00:00:00Z"),
    },
  );

  const scam = alerts.find((alert) => alert.id === "fraud-wire-1");
  assert.ok(scam);
  assert.equal(scam!.category, "scam");
  assert.equal(scam!.personalized, true);
  assert.match(scam!.action_line, /^Verify steps:/);
  assert.match(scam!.body, /Risk score: 95\/100/);
});
