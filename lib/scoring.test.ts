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

test("state adjusts projection-based sustainability score in expected directions", () => {
  const baseline: Answers = {
    age: 62, status: "near", guaranteedIncome: 1500, essentialExpenses: 3500,
    savings: 325000, stockPct: 50, emergencyFund: "3-6", debt: "none", worry: "scams", state: "TX",
  };

  const neutral = computeScores(baseline);
  const lowCost = computeScores({ ...baseline, state: "MS" });
  const highCost = computeScores({ ...baseline, state: "CA" });

  assert.ok(lowCost.sub.sustainability > neutral.sub.sustainability, "low-COL state should improve sustainability score");
  assert.ok(lowCost.overall > neutral.overall, "low-COL profile should improve overall score");

  assert.ok(highCost.sub.sustainability < neutral.sub.sustainability, "high-COL state should reduce sustainability score");
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

  assert.equal(fixed.sub.income, 100, "1.5x guaranteed-income coverage should max income stability");
  assert.ok(fixed.sub.inflation < fixed.sub.income, `fixed-income inflation score should diverge: ${fixed.sub.inflation}`);
  assert.ok(cola.sub.inflation > fixed.sub.inflation, "COLA-backed income should improve inflation resilience without changing income score");
  assert.equal(cola.sub.income, fixed.sub.income, "income score should remain based on current coverage when not married");
});

test("sustainability score uses real savings instead of legacy bucket midpoint", () => {
  const baseline: Answers = {
    age: 65, status: "retired", guaranteedIncome: 2000, essentialExpenses: 5000,
    savings: 10000, savingsBucket: "1M+", stockPct: 50, emergencyFund: "3-6", debt: "none", worry: "running_out",
  };
  const lowSavings = computeScores(baseline);
  const highSavings = computeScores({ ...baseline, savings: 1500000, savingsBucket: "<50k" });

  assert.ok(lowSavings.sub.sustainability < 15, `low real savings should score low, got ${lowSavings.sub.sustainability}`);
  assert.ok(highSavings.sub.sustainability > lowSavings.sub.sustainability + 50, "higher real savings should drive projection sustainability");
});


test("covering essentials is passing but not perfect for income or sustainability", () => {
  const breakEven: Answers = {
    age: 68, status: "retired", guaranteedIncome: 3000, essentialExpenses: 3000,
    savings: 0, stockPct: 50, emergencyFund: "3-6", debt: "none", worry: "running_out",
  };
  const buffered = computeScores({ ...breakEven, guaranteedIncome: 4500, savings: 500000 });
  const current = computeScores(breakEven);

  assert.equal(current.sub.income, 70, "100% essential coverage should be a passing floor, not perfection");
  assert.ok(current.sub.sustainability < buffered.sub.sustainability, "sustainability score should still reflect savings and surplus");
  assert.ok(buffered.sub.income > current.sub.income, "income score should reward buffer above essentials");
});

test("married income score reflects survivor-risk exposure", () => {
  const household: Answers = {
    age: 68, maritalStatus: "married", status: "retired", guaranteedIncome: 5200, essentialExpenses: 4000,
    ssaBenefitEstimate: 2600, spouseSsaBenefitEstimate: 1800, pensionAmount: 800, pensionSurvivorPct: 0,
    savings: 400000, stockPct: 50, emergencyFund: "6+", debt: "none", worry: "running_out",
  };
  const exposed = computeScores(household);
  const singleEquivalent = computeScores({ ...household, maritalStatus: "single" });

  assert.ok(exposed.sub.income < singleEquivalent.sub.income, "survivor case should ding exposed married households");
  assert.ok(exposed.sub.income < 90, `survivor-risk blend should avoid inflated income scores, got ${exposed.sub.income}`);
});

const personas: Array<[string, Answers, string[]]> = [
  ["well-prepared", {
    age: 68, maritalStatus: "married", status: "retired", guaranteedIncome: 6000, essentialExpenses: 4000,
    desiredLifestyleSpending: 6000, savings: 900000, ssaBenefitEstimate: 2800, spouseSsaBenefitEstimate: 1400,
    pensionAmount: 1500, pensionHasCola: "yes", pensionSurvivorPct: 100, stockPct: 50, emergencyFund: "6+",
    debt: "none", ownsHome: "yes", homeEquity: 350000, balance_taxable: 200000, balance_tax_deferred: 500000,
    balance_roth: 200000, claimedSocialSecurity: "yes", worry: "skip", state: "TX",
  }, ["Secure"]],
  ["comfortable", {
    age: 63, maritalStatus: "married", status: "near", guaranteedIncome: 3500, essentialExpenses: 3800,
    desiredLifestyleSpending: 5000, savings: 400000, ssaBenefitEstimate: 2200, spouseSsaBenefitEstimate: 1000,
    stockPct: 50, emergencyFund: "3-6", debt: "some", ownsHome: "yes", homeEquity: 150000,
    balance_tax_deferred: 350000, balance_roth: 50000, claimedSocialSecurity: "no", targetRetirementAge: 66,
    worry: "running_out", state: "OH",
  }, ["Mostly Secure"]],
  ["average", {
    age: 66, maritalStatus: "single", status: "retired", guaranteedIncome: 2100, essentialExpenses: 2600,
    desiredLifestyleSpending: 3500, savings: 180000, ssaBenefitEstimate: 2100, stockPct: 50,
    emergencyFund: "1-3", debt: "some", ownsHome: "no", balance_tax_deferred: 180000,
    claimedSocialSecurity: "yes", worry: "skip",
  }, ["At Risk"]],
  ["behind pre-retiree", {
    age: 60, maritalStatus: "married", status: "working", guaranteedIncome: 0, essentialExpenses: 3500,
    desiredLifestyleSpending: 5500, savings: 120000, ssaBenefitEstimate: 1800, spouseSsaBenefitEstimate: 900,
    stockPct: 75, emergencyFund: "0", debt: "heavy", ownsHome: "no", balance_tax_deferred: 120000,
    claimedSocialSecurity: "no", targetRetirementAge: 67, worry: "skip", state: "CA",
  }, ["At Risk"]],
  ["vulnerable", {
    age: 72, maritalStatus: "widowed", status: "retired", guaranteedIncome: 1500, essentialExpenses: 2800,
    desiredLifestyleSpending: 3200, savings: 25000, ssaBenefitEstimate: 1500, stockPct: 25,
    emergencyFund: "0", debt: "heavy", ownsHome: "no", claimedSocialSecurity: "yes", worry: "skip",
  }, ["Vulnerable", "At Risk"]],
];

test("persona calibration bands", () => {
  for (const [name, answers, expectedBands] of personas) {
    const result = computeScores(answers);
    assert.ok(
      expectedBands.includes(result.band),
      `${name} expected ${expectedBands.join(" or ")}, got ${result.band} (${result.overall}) with ${JSON.stringify(result.sub)}`,
    );
  }
});
