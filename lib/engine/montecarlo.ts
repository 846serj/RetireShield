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

type MonteCarloOptions = {
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

function allocationStats(profile: FinancialProfile) {
  const assumptions = DEFAULT_ASSUMPTIONS.allocationAssumptions;
  const weights = {
    stock: profile.stock_pct / 100,
    bond: profile.bond_pct / 100,
    cash: profile.cash_pct / 100,
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

function percentile(values: number[], pct: number) {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const index = (sorted.length - 1) * pct;
  const lower = Math.floor(index);
  const upper = Math.ceil(index);
  if (lower === upper) return sorted[lower];
  return sorted[lower] + (sorted[upper] - sorted[lower]) * (index - lower);
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
