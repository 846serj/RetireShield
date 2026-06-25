import { DEFAULT_ASSUMPTIONS } from "./params/2026";
import { runProjection } from "./projection";
import type { FinancialProfile } from "./types";

export type MonteCarloBalancePoint = {
  age: number;
  p10: number;
  p50: number;
  p90: number;
};

export type MonteCarloResult = {
  probabilityOfSuccess: number;
  runs: number;
  paths: MonteCarloBalancePoint[];
};

export type MonteCarloOptions = {
  seed?: number | string;
};

function hashSeed(seed: number | string) {
  if (typeof seed === "number") return seed >>> 0;
  let hash = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    hash ^= seed.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function seededRandom(seed: number | string = Date.now()) {
  let state = hashSeed(seed) || 1;
  return () => {
    state |= 0;
    state = (state + 0x6D2B79F5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function normalRandom(random: () => number) {
  const u1 = Math.max(Number.EPSILON, random());
  const u2 = random();
  return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
}

function knownNumber(value: number | null | undefined) { return value ?? 0; }

function allocationStats(profile: FinancialProfile) {
  const assumptions = DEFAULT_ASSUMPTIONS.allocationAssumptions;
  const weights = {
    stock: knownNumber(profile.stock_pct) / 100,
    bond: knownNumber(profile.bond_pct) / 100,
    cash: knownNumber(profile.cash_pct) / 100,
  };
  const expectedReturn = weights.stock * assumptions.stock.expectedReturn
    + weights.bond * assumptions.bond.expectedReturn
    + weights.cash * assumptions.cash.expectedReturn;
  const stdev = Math.sqrt(
    (weights.stock * assumptions.stock.stdev) ** 2
    + (weights.bond * assumptions.bond.stdev) ** 2
    + (weights.cash * assumptions.cash.stdev) ** 2,
  );
  return { expectedReturn, stdev };
}

export function percentile(values: number[], pct: number) {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const index = (sorted.length - 1) * pct;
  const lower = Math.floor(index);
  const upper = Math.ceil(index);
  if (lower === upper) return sorted[lower];
  return sorted[lower] + (sorted[upper] - sorted[lower]) * (index - lower);
}

export type MonteCarloOutcome = {
  essentialsUncoveredAge: number | null;
  depletionAge: number | null;
};

export type SimulateOutcomesResult = {
  runs: number;
  essentialsUncoveredAges: (number | null)[];
  depletionAges: (number | null)[];
  outcomes: MonteCarloOutcome[];
  percentileEssentialsUncoveredAge: (pct: number) => number | null;
  percentileDepletionAge: (pct: number) => number | null;
};

function percentileNullableAge(values: (number | null)[], pct: number, horizonAge: number) {
  if (values.length === 0) return null;
  const sentinel = horizonAge + 1;
  const value = percentile(values.map((age) => age ?? sentinel), pct);
  return value >= horizonAge ? null : Math.round(value);
}

export function simulateOutcomes(profile: FinancialProfile, options: MonteCarloOptions & { runs?: number } = {}): SimulateOutcomesResult {
  const safeRuns = Math.max(1, Math.floor(options.runs ?? 500));
  const baseline = runProjection(profile);
  const horizonLength = baseline.years.length;
  const horizonAge = baseline.years.at(-1)?.age ?? profile.planning_horizon_age;
  const { expectedReturn, stdev } = allocationStats(profile);
  const random = seededRandom(options.seed);
  const essentialsUncoveredAges: (number | null)[] = [];
  const depletionAges: (number | null)[] = [];
  const outcomes: MonteCarloOutcome[] = [];

  for (let run = 0; run < safeRuns; run++) {
    const annualReturns = Array.from({ length: horizonLength }, () => expectedReturn + stdev * normalRandom(random));
    const projection = runProjection(profile, { annualReturns });
    const essentialsUncoveredAge = projection.years.find((year) => year.income < year.spending && year.endBalances.total <= 1)?.age ?? null;
    const outcome = { essentialsUncoveredAge, depletionAge: projection.depletionAge };
    essentialsUncoveredAges.push(outcome.essentialsUncoveredAge);
    depletionAges.push(outcome.depletionAge);
    outcomes.push(outcome);
  }

  return {
    runs: safeRuns,
    essentialsUncoveredAges,
    depletionAges,
    outcomes,
    percentileEssentialsUncoveredAge: (pct: number) => percentileNullableAge(essentialsUncoveredAges, pct, horizonAge),
    percentileDepletionAge: (pct: number) => percentileNullableAge(depletionAges, pct, horizonAge),
  };
}

export function runMonteCarlo(profile: FinancialProfile, runs = 1000, options: MonteCarloOptions = {}): MonteCarloResult {
  const safeRuns = Math.max(1, Math.floor(runs));
  const baseline = runProjection(profile);
  const horizonLength = baseline.years.length;
  const { expectedReturn, stdev } = allocationStats(profile);
  const random = seededRandom(options.seed);
  const balancesByYear = Array.from({ length: horizonLength }, () => [] as number[]);
  let successes = 0;

  for (let run = 0; run < safeRuns; run++) {
    const annualReturns = Array.from({ length: horizonLength }, () => expectedReturn + stdev * normalRandom(random));
    const projection = runProjection(profile, { annualReturns });
    if (projection.depletionAge === null) successes += 1;
    projection.years.forEach((year, index) => balancesByYear[index]?.push(year.endBalances.total));
  }

  return {
    probabilityOfSuccess: successes / safeRuns,
    runs: safeRuns,
    paths: baseline.years.map((year, index) => ({
      age: year.age,
      p10: percentile(balancesByYear[index], 0.1),
      p50: percentile(balancesByYear[index], 0.5),
      p90: percentile(balancesByYear[index], 0.9),
    })),
  };
}
