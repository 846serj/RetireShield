import { test } from "node:test";
import assert from "node:assert";
import { computeScores, type Answers } from "../lib/scoring";

const base: Answers = {
  age: 65,
  status: "retired",
  guaranteedIncome: 3000,
  essentialExpenses: 3000,
  savings: 400000,
  stockPct: 50,
  emergencyFund: "3-6",
  debt: "none",
  worry: "running_out",
};

test("zero guaranteed income and zero essentials stay bounded", () => {
  const score = computeScores({ ...base, essentialExpenses: 0, guaranteedIncome: 0, savings: 0 });
  assert.equal(score.sub.income, 0);
  assert.equal(score.sub.sustainability, 0);
  assert.equal(score.sub.inflation, 40);
  assert.ok(score.overall >= 30);
});

test("full guaranteed-income coverage still depends on savings for sustainability", () => {
  const noSavings = computeScores({ ...base, guaranteedIncome: 4500, essentialExpenses: 3000, savings: 0 });
  const ampleSavings = computeScores({ ...base, guaranteedIncome: 4500, essentialExpenses: 3000, savings: 750000 });
  assert.equal(noSavings.sub.income, 100);
  assert.ok(noSavings.sub.sustainability < 100, "covered essentials should not auto-max sustainability");
  assert.ok(ampleSavings.sub.sustainability > noSavings.sub.sustainability, "sustainability should reward savings even when income covers essentials");
});

test("extreme ages remain bounded and age-appropriate market risk changes", () => {
  const young = computeScores({ ...base, age: 55, stockPct: 100, emergencyFund: "6+" });
  const older = computeScores({ ...base, age: 95, stockPct: 100, emergencyFund: "6+" });

  for (const result of [young, older]) {
    assert.ok(result.overall >= 0 && result.overall <= 100);
    for (const subScore of Object.values(result.sub)) assert.ok(subScore >= 0 && subScore <= 100);
  }
  assert.ok(older.sub.market < young.sub.market, "100% stock exposure should be penalized more at age 95 than 55");
});
