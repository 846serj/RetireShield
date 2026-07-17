// v2 calibration fixtures — expected values computed by executing the v2 model
// (see _Shared/AI-Tool-Master/05-Launch/Score-Model-QA-Fable.md).
// If any persona lands outside its ±3 window or in the wrong band, STOP and report —
// do NOT tune scoring.ts or widen these windows to force a pass.
import { test } from "node:test";
import assert from "node:assert";
import { computeScores, type Answers } from "../lib/scoring";

const PERSONAS: Array<[string, Answers, number, string]> = [
  ["D1 well-prepared", {
    age: 68, maritalStatus: "married", status: "retired", guaranteedIncome: 6000, essentialExpenses: 4000,
    desiredLifestyleSpending: 6000, savings: 900000, ssaBenefitEstimate: 2800, spouseSsaBenefitEstimate: 1400,
    pensionAmount: 1500, pensionHasCola: "yes", pensionSurvivorPct: 100, stockPct: 50, emergencyFund: "6+",
    debt: "none", ownsHome: "yes", homeEquity: 350000, balance_taxable: 200000, balance_tax_deferred: 500000,
    balance_roth: 200000, claimedSocialSecurity: "yes", worry: "skip", state: "TX",
  }, 91, "Secure"],
  ["D2 comfortable near-retiree", {
    age: 63, maritalStatus: "married", status: "near", guaranteedIncome: 3500, essentialExpenses: 3800,
    desiredLifestyleSpending: 5000, savings: 400000, ssaBenefitEstimate: 2200, spouseSsaBenefitEstimate: 1000,
    stockPct: 50, emergencyFund: "3-6", debt: "some", ownsHome: "yes", homeEquity: 150000,
    balance_tax_deferred: 350000, balance_roth: 50000, claimedSocialSecurity: "no", targetRetirementAge: 66,
    worry: "running_out", state: "OH",
  }, 79, "Mostly Secure"],
  ["D3 average retiree", {
    age: 66, maritalStatus: "single", status: "retired", guaranteedIncome: 2100, essentialExpenses: 2600,
    desiredLifestyleSpending: 3500, savings: 180000, ssaBenefitEstimate: 2100, stockPct: 50,
    emergencyFund: "1-3", debt: "some", ownsHome: "no", balance_tax_deferred: 180000,
    claimedSocialSecurity: "yes", worry: "skip",
  }, 54, "At Risk"],
  ["D4 behind pre-retiree", {
    age: 60, maritalStatus: "married", status: "working", guaranteedIncome: 0, essentialExpenses: 3500,
    desiredLifestyleSpending: 5500, savings: 120000, ssaBenefitEstimate: 1800, spouseSsaBenefitEstimate: 900,
    stockPct: 75, emergencyFund: "0", debt: "heavy", ownsHome: "no", balance_tax_deferred: 120000,
    claimedSocialSecurity: "no", targetRetirementAge: 67, worry: "skip", state: "CA",
  }, 42, "At Risk"],
  ["D5 vulnerable widow", {
    age: 72, maritalStatus: "widowed", status: "retired", guaranteedIncome: 1500, essentialExpenses: 2800,
    desiredLifestyleSpending: 3200, savings: 25000, ssaBenefitEstimate: 1500, stockPct: 25,
    emergencyFund: "0", debt: "heavy", ownsHome: "no", claimedSocialSecurity: "yes", worry: "skip",
  }, 36, "Vulnerable"],
  ["P6 core-only with quiz defaults", {
    age: 67, maritalStatus: "single", status: "retired", guaranteedIncome: 2500, essentialExpenses: 3500,
    desiredLifestyleSpending: 5000, savings: 100000, stockPct: 50, emergencyFund: "1-3", debt: "some",
    worry: "skip", planning_horizon_age: 95,
  }, 44, "At Risk"],
  ["P7 zero savings, essentials exactly covered (no cliff)", {
    age: 72, maritalStatus: "single", status: "retired", guaranteedIncome: 1500, essentialExpenses: 1500,
    desiredLifestyleSpending: 2500, savings: 0, balance_taxable: 0, balance_tax_deferred: 0, balance_roth: 0,
    ssaBenefitEstimate: 1500, ownsHome: "no", stockPct: 25, emergencyFund: "0", debt: "none",
    claimedSocialSecurity: "yes", worry: "skip",
  }, 51, "At Risk"],
  ["P8 essentials-safe with huge lifestyle wish (survival-first)", {
    age: 67, maritalStatus: "single", status: "retired", guaranteedIncome: 3500, essentialExpenses: 2500,
    desiredLifestyleSpending: 11000, savings: 100000, ssaBenefitEstimate: 2200, ownsHome: "yes",
    homeEquity: 175000, stockPct: 50, emergencyFund: "3-6", debt: "none", claimedSocialSecurity: "yes",
    worry: "skip",
  }, 63, "Mostly Secure"],
  ["P9 young pre-retiree, SSA estimate never answered (imputation)", {
    age: 45, maritalStatus: "single", status: "working", guaranteedIncome: 500, essentialExpenses: 3500,
    desiredLifestyleSpending: 5000, savings: 100000, stockPct: 75, emergencyFund: "1-3", debt: "some",
    ownsHome: "no", worry: "skip",
  }, 43, "At Risk"],
  ["P10 married survivor cliff (0% survivor pension)", {
    age: 67, maritalStatus: "married", status: "retired", guaranteedIncome: 4500, essentialExpenses: 3500,
    desiredLifestyleSpending: 6000, savings: 400000, ssaBenefitEstimate: 2000, spouseSsaBenefitEstimate: 1500,
    hasPension: "yes", pensionAmount: 1000, pensionHasCola: "no", pensionSurvivorPct: 0, stockPct: 50,
    emergencyFund: "3-6", debt: "none", ownsHome: "yes", homeEquity: 175000, claimedSocialSecurity: "yes",
    worry: "skip",
  }, 78, "Mostly Secure"],
];

test("v2 persona calibration: band + overall within +/-3", () => {
  for (const [name, answers, expectedOverall, expectedBand] of PERSONAS) {
    const r = computeScores(answers);
    assert.equal(r.band, expectedBand,
      `${name}: expected band ${expectedBand}, got ${r.band} (${r.overall}) — STOP and report, do not retune`);
    assert.ok(Math.abs(r.overall - expectedOverall) <= 3,
      `${name}: expected overall ~${expectedOverall} (±3), got ${r.overall} — STOP and report, do not retune`);
  }
});

test("v2 regression: no zero-savings cliff at the coverage boundary", () => {
  const base: Answers = {
    age: 68, status: "retired", guaranteedIncome: 3000, essentialExpenses: 3000,
    savings: 0, stockPct: 50, emergencyFund: "1-3", debt: "none", worry: "skip",
  };
  const covered = computeScores(base);
  const tenShort = computeScores({ ...base, guaranteedIncome: 2990 });
  assert.ok(covered.sub.sustainability - tenShort.sub.sustainability <= 5,
    `$10/mo should not swing sustainability: ${covered.sub.sustainability} vs ${tenShort.sub.sustainability}`);
});

test("v2 regression: slightly-worse input never outscores covered (branch inversion)", () => {
  const base: Answers = {
    age: 68, status: "retired", guaranteedIncome: 3000, essentialExpenses: 3000,
    savings: 300000, stockPct: 50, emergencyFund: "3-6", debt: "none", worry: "skip",
  };
  const covered = computeScores(base);
  const slightlyShort = computeScores({ ...base, guaranteedIncome: 2950 });
  assert.ok(slightlyShort.sub.sustainability <= covered.sub.sustainability,
    `being $50 short must not score higher: ${slightlyShort.sub.sustainability} vs ${covered.sub.sustainability}`);
});
