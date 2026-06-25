import { computeScores, type Answers, type Result as ScoreResult } from "@/lib/scoring";
import { CURRENT_YEAR, IRMAA_BRACKETS } from "./params/2026";
import { runMonteCarlo, simulateOutcomes } from "./montecarlo";
import { runProjection } from "./projection";
import { filingStatusFromMaritalStatus, totalIncomeTaxes } from "./tax";
import type { FinancialProfile } from "./types";

export const VERDICT_PERCENTILE = 0.40;
export const POOR_PERCENTILE = 0.25;
const AFFORDABILITY_RUNS = 500;
const SAFE_MAX_RUNS = 200;
const SAFE_MAX_ITERATIONS = 12;
const AFFORDABILITY_SEED = "affordability-sequence-risk";

type FundingSource = "taxable" | "tax_deferred" | "roth" | "cash" | "auto";
export type AffordabilityInput = { kind: "spend"; timing: "oneoff" | "recurring"; amount: number; fundingSource?: FundingSource; startAge?: number };
export type DecisionResult = {
  verdict: "YES" | "NO" | "CAUTION";
  headline: string;
  trigger: string;
  essentials: { coveredForLife: boolean; uncoveredAge?: number };
  moneyLasts: { baselineAge: number | null; afterAge: number | null };
  score: { before: number | null; after: number | null; band: string | null };
  ripple?: Record<string, unknown>;
  safeMax?: number;
  alternatives: string[];
  trace: Record<string, unknown>;
  needsProfile?: boolean;
};

type PercentileOutcome = { essentialsUncoveredAge: number | null; depletionAge: number | null };

const bandRank: Record<string, number> = { Vulnerable: 0, "At Risk": 1, "Mostly Secure": 2, Secure: 3 };
const known = (v: number | null | undefined) => Number.isFinite(Number(v)) ? Number(v) : 0;
const currentAge = (profile: FinancialProfile) => profile.birthdate ? CURRENT_YEAR - Number(profile.birthdate.slice(0, 4)) : 0;
const totalPortfolio = (profile: FinancialProfile) => known(profile.balance_taxable) + known(profile.balance_tax_deferred) + known(profile.balance_roth);

function isScoreable(profile: FinancialProfile) {
  return currentAge(profile) > 0 && profile.spending_essential_monthly !== null && totalPortfolio(profile) > 0;
}

function essentialsProfile(profile: FinancialProfile) {
  return { ...profile, spending_discretionary_monthly: 0 } as FinancialProfile;
}

function mcOutcomes(profile: FinancialProfile, runs: number, seedSuffix: string) {
  const essentials = simulateOutcomes(essentialsProfile(profile), { runs, seed: `${AFFORDABILITY_SEED}-${seedSuffix}-essentials` });
  const full = simulateOutcomes(profile, { runs, seed: `${AFFORDABILITY_SEED}-${seedSuffix}-full` });
  const at = (pct: number): PercentileOutcome => ({
    essentialsUncoveredAge: essentials.percentileEssentialsUncoveredAge(pct),
    depletionAge: full.percentileDepletionAge(pct),
  });
  return { essentials, full, base: at(VERDICT_PERCENTILE), poor: at(POOR_PERCENTILE) };
}

function coveredThroughHorizon(age: number | null, horizon: number) {
  return age === null || age >= horizon;
}

function lastsThroughHorizon(age: number | null, horizon: number) {
  return age === null || age >= horizon;
}

function guaranteedCoversEssentialsForLife(profile: FinancialProfile, horizon: number) {
  const deterministic = runProjection(essentialsProfile(profile), { annualReturns: Array(Math.max(1, horizon - currentAge(profile) + 1)).fill(0) });
  const uncoveredAge = deterministic.years.find((year) => year.income < year.spending)?.age ?? null;
  return coveredThroughHorizon(uncoveredAge, horizon);
}

function resolveFunding(input: AffordabilityInput, profile: FinancialProfile): Exclude<FundingSource, "auto"> {
  if (input.fundingSource && input.fundingSource !== "auto") return input.fundingSource;
  if (known(profile.balance_taxable) >= input.amount) return "taxable";
  if (known(profile.balance_tax_deferred) >= input.amount) return "tax_deferred";
  if (known(profile.balance_roth) >= input.amount) return "roth";
  return "cash";
}

function applyDecision(profile: FinancialProfile, input: AffordabilityInput) {
  const p = { ...profile };
  const source = resolveFunding(input, profile);
  if (input.timing === "recurring") p.spending_discretionary_monthly = known(p.spending_discretionary_monthly) + input.amount / 12;
  else if (source === "taxable") p.balance_taxable = Math.max(0, known(p.balance_taxable) - input.amount);
  else if (source === "tax_deferred") p.balance_tax_deferred = Math.max(0, known(p.balance_tax_deferred) - input.amount);
  else if (source === "roth") p.balance_roth = Math.max(0, known(p.balance_roth) - input.amount);
  else p.balance_taxable = Math.max(0, known(p.balance_taxable) - input.amount);
  return { profile: p as FinancialProfile, source };
}

function scoreFromProfile(profile: FinancialProfile): ScoreResult {
  const age = currentAge(profile);
  const guaranteed = known(profile.ss_benefit_fra) + known(profile.spouse_ss_benefit_fra) + known(profile.pension_amount);
  const answers: Answers = { age, status: age >= 67 ? "retired" : "near", guaranteedIncome: guaranteed, essentialExpenses: known(profile.spending_essential_monthly), savings: totalPortfolio(profile), stockPct: (known(profile.stock_pct) >= 75 ? 75 : known(profile.stock_pct) >= 50 ? 50 : known(profile.stock_pct) >= 25 ? 25 : 0) as Answers["stockPct"], emergencyFund: "3-6", debt: "none", worry: "running_out", state: profile.state ?? undefined };
  return computeScores(answers);
}

function ripple(input: AffordabilityInput, profile: FinancialProfile, source: string) {
  if (source !== "tax_deferred" || input.amount <= 0) return undefined;
  const age = input.startAge ?? currentAge(profile);
  const status = filingStatusFromMaritalStatus(profile.marital_status);
  const base = totalIncomeTaxes({ status, ages: [age], ordinaryIncome: 0, socialSecurity: 0, longTermCapitalGains: 0, state: profile.state });
  const after = totalIncomeTaxes({ status, ages: [age], ordinaryIncome: input.amount, socialSecurity: 0, longTermCapitalGains: 0, state: profile.state });
  const bracket = IRMAA_BRACKETS[status].find((b) => input.amount <= b.upTo);
  const distanceToNextIrmaaCliff = bracket?.upTo === Infinity ? null : Math.max(0, (bracket?.upTo ?? 0) - input.amount);
  const taxableAvailable = known(profile.balance_taxable) >= input.amount;
  return { fundingSource: source, extraOrdinaryTax: after.total - base.total, irmaaIncrease: after.irmaa - base.irmaa, distanceToNextIrmaaCliff, cheaperAlternative: taxableAvailable ? "taxable" : null, estimatedSavingsUsingTaxable: taxableAvailable ? Math.max(0, after.total - base.total) : 0 };
}

function evaluate(input: AffordabilityInput, profile: FinancialProfile, includeSafeMax: boolean, runs = AFFORDABILITY_RUNS): DecisionResult {
  if (!isScoreable(profile)) return { verdict: "CAUTION", headline: "Add a few profile details first.", trigger: "Not enough profile data to run the affordability engine.", essentials: { coveredForLife: false }, moneyLasts: { baselineAge: null, afterAge: null }, score: { before: null, after: null, band: null }, alternatives: ["Add account types, balances, age, and essential expenses."], trace: {}, needsProfile: true };
  const horizon = profile.planning_horizon_age ?? 95;
  const { profile: afterProfile, source } = applyDecision(profile, input);
  const beforeScore = scoreFromProfile(profile);
  const afterScore = scoreFromProfile(afterProfile);
  const baselineMc = mcOutcomes(profile, runs, "decision");
  const afterMc = mcOutcomes(afterProfile, runs, "decision");
  const baseAfter = afterMc.base;
  const poorAfter = afterMc.poor;
  const essentialsCovered = coveredThroughHorizon(baseAfter.essentialsUncoveredAge, horizon);
  const baselineAge = baselineMc.base.depletionAge;
  const afterAge = baseAfter.depletionAge;
  const guaranteedFloor = guaranteedCoversEssentialsForLife(afterProfile, horizon);
  const portfolioLasts = lastsThroughHorizon(afterAge, horizon) || guaranteedFloor;
  const poorMiss = !coveredThroughHorizon(poorAfter.essentialsUncoveredAge, horizon) || !lastsThroughHorizon(poorAfter.depletionAge, horizon);
  const bandDrop = (bandRank[afterScore.band ?? ""] ?? -1) < (bandRank[beforeScore.band ?? ""] ?? -1);
  const runwayLoss = (baselineAge ?? horizon) - (afterAge ?? horizon) >= 3;
  const taxRipple = ripple(input, profile, source);
  const taxCaution = Boolean(taxRipple && Number(taxRipple.irmaaIncrease ?? 0) > 0);
  let verdict: DecisionResult["verdict"] = essentialsCovered && portfolioLasts ? (poorMiss || bandDrop || runwayLoss || taxCaution ? "CAUTION" : "YES") : "NO";
  const alternatives = [source !== "taxable" && known(profile.balance_taxable) >= input.amount ? "Use taxable funds instead." : "", input.timing === "oneoff" ? "Spread the purchase over multiple tax years." : "Reduce the recurring commitment.", "Delay until a future plan review.", verdict !== "YES" ? "Reduce the amount to the safe maximum." : ""].filter(Boolean);
  const poorRunwayAge = poorAfter.essentialsUncoveredAge ?? poorAfter.depletionAge;
  const trigger = poorMiss && poorRunwayAge !== null ? `Yes — but in a poor market this shortens your runway to age ${poorRunwayAge}` : "This holds even in a poor market path.";
  return { verdict, headline: verdict === "YES" ? "This looks affordable." : verdict === "NO" ? "This does not look affordable." : "This may be affordable, with tradeoffs.", trigger, essentials: { coveredForLife: essentialsCovered, uncoveredAge: baseAfter.essentialsUncoveredAge ?? undefined }, moneyLasts: { baselineAge, afterAge }, score: { before: beforeScore.overall, after: afterScore.overall, band: afterScore.band }, ripple: taxRipple, safeMax: includeSafeMax ? safeMax(input, profile) : undefined, alternatives, trace: { horizon, fundingSource: source, pathResults: { BASE: { before: baselineMc.base, after: afterMc.base }, POOR: { before: baselineMc.poor, after: afterMc.poor } }, verdictPercentile: VERDICT_PERCENTILE, poorPercentile: POOR_PERCENTILE, runs, monteCarloBaseSuccess: runMonteCarlo(profile, 120, { seed: "affordability-base" }).probabilityOfSuccess } };
}

function safeMax(input: AffordabilityInput, profile: FinancialProfile) {
  let low = 0;
  let high = input.timing === "recurring" ? Math.max(input.amount * 2, known(profile.spending_discretionary_monthly) * 24, 120000) : Math.max(input.amount * 2, totalPortfolio(profile));
  for (let i = 0; i < SAFE_MAX_ITERATIONS; i++) {
    const mid = (low + high) / 2;
    const verdict = evaluate({ ...input, amount: mid }, profile, false, SAFE_MAX_RUNS).verdict;
    if (verdict === "YES") low = mid; else high = mid;
  }
  return Math.round(low);
}

export function analyzeAffordability(input: AffordabilityInput, profile: FinancialProfile): DecisionResult {
  return evaluate({ ...input, fundingSource: input.fundingSource ?? "auto", startAge: input.startAge ?? currentAge(profile), amount: Math.max(0, input.amount) }, profile, true);
}

export function computeSafeToSpend(profile: FinancialProfile) {
  if (!isScoreable(profile)) return { needsProfile: true, annualDiscretionarySpend: null };
  let low = 0, high = Math.max(120000, totalPortfolio(profile) / 5);
  for (let i = 0; i < SAFE_MAX_ITERATIONS; i++) {
    const mid = (low + high) / 2;
    const ok = evaluate({ kind: "spend", timing: "recurring", amount: mid }, { ...profile, spending_discretionary_monthly: 0 } as FinancialProfile, false, SAFE_MAX_RUNS).verdict === "YES";
    if (ok) low = mid; else high = mid;
  }
  return { needsProfile: false, annualDiscretionarySpend: Math.round(low) };
}
