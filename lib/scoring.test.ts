// Run with: npm test  (uses node:test). Sanity checks on the scoring logic.
import { test } from "node:test";
import assert from "node:assert";
import { computeScores, type Answers } from "./scoring.ts";

const secure: Answers = {
  age: 68, status: "retired", guaranteedIncome: 4000, essentialExpenses: 3000,
  savings: 750000, stockPct: 50, emergencyFund: "6+", debt: "none", worry: "inflation",
};
const vulnerable: Answers = {
  age: 72, status: "retired", guaranteedIncome: 1200, essentialExpenses: 3500,
  savings: 25000, stockPct: 100, emergencyFund: "0", debt: "heavy", worry: "running_out",
};

test("secure profile scores high and is well-banded", () => {
  const r = computeScores(secure);
  assert.ok(r.overall >= 70, `expected >=70, got ${r.overall}`);
  assert.ok(["Secure", "Mostly Secure"].includes(r.band));
});

test("vulnerable profile scores low", () => {
  const r = computeScores(vulnerable);
  assert.ok(r.overall < 50, `expected <50, got ${r.overall}`);
  assert.ok(["At Risk", "Vulnerable"].includes(r.band));
});

test("scores are bounded 0-100", () => {
  for (const a of [secure, vulnerable]) {
    const r = computeScores(a);
    for (const v of [r.overall, ...Object.values(r.sub)]) {
      assert.ok(v >= 0 && v <= 100, `out of range: ${v}`);
    }
  }
});

test("state adjusts projection-based withdrawal score in expected directions", () => {
  const baseline: Answers = {
    age: 62, status: "near", guaranteedIncome: 1500, essentialExpenses: 3500,
    savings: 325000, stockPct: 50, emergencyFund: "3-6", debt: "none", worry: "scams", state: "TX",
  };

  const neutral = computeScores(baseline);
  const lowCost = computeScores({ ...baseline, state: "MS" });
  const highCost = computeScores({ ...baseline, state: "CA" });

  assert.ok(lowCost.sub.withdrawal > neutral.sub.withdrawal, "low-COL state should improve withdrawal score");
  assert.ok(lowCost.overall > neutral.overall, "low-COL profile should improve overall score");

  assert.ok(highCost.sub.withdrawal < neutral.sub.withdrawal, "high-COL state should reduce withdrawal score");
  assert.ok(highCost.overall < neutral.overall, "high-COL profile should reduce overall score");
});

test("inflation and income sub-scores can diverge for high-coverage users", () => {
  const fixedPension: Answers = {
    age: 68, status: "retired", guaranteedIncome: 5000, essentialExpenses: 3000,
    savings: 500000, stockPct: 25, emergencyFund: "6+", debt: "none", worry: "inflation",
  };
  const colaBacked: Answers = { ...fixedPension, ssaBenefitEstimate: 5000 };

  const fixed = computeScores(fixedPension);
  const cola = computeScores(colaBacked);

  assert.equal(fixed.sub.income, 100, "high guaranteed-income coverage should max income stability");
  assert.ok(fixed.sub.inflation < fixed.sub.income, `fixed-income inflation score should diverge: ${fixed.sub.inflation}`);
  assert.ok(cola.sub.inflation > fixed.sub.inflation, "COLA-backed income should improve inflation resilience without changing income score");
  assert.equal(cola.sub.income, fixed.sub.income, "income score should remain coverage-only");
});

test("withdrawal score uses real savings instead of legacy bucket midpoint", () => {
  const baseline: Answers = {
    age: 65, status: "retired", guaranteedIncome: 2000, essentialExpenses: 5000,
    savings: 10000, savingsBucket: "1M+", stockPct: 50, emergencyFund: "3-6", debt: "none", worry: "running_out",
  };
  const lowSavings = computeScores(baseline);
  const highSavings = computeScores({ ...baseline, savings: 1500000, savingsBucket: "<50k" });

  assert.ok(lowSavings.sub.withdrawal < 15, `low real savings should score low, got ${lowSavings.sub.withdrawal}`);
  assert.ok(highSavings.sub.withdrawal > lowSavings.sub.withdrawal + 50, "higher real savings should drive projection sustainability");
});
