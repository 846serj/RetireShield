import { FULL_RETIREMENT_AGE, SOCIAL_SECURITY_COLA } from "./params/2026";
import { runMonteCarlo } from "./montecarlo";
import type { FinancialProfile } from "./types";

export type SocialSecurityClaimComparison = {
  claimAge: number;
  monthlyBenefit: number;
  householdMonthlyBenefit: number;
  adjustmentPct: number;
  successRate: number;
  lifetimeValueToHorizon: number;
  tradeoffs: string[];
  spouse?: {
    spouseMonthlyBenefit: number;
    combinedMonthlyBenefit: number;
    estimatedSurvivorMonthlyBenefit: number;
  };
};

export type SocialSecurityBreakEven = {
  earlierClaimAge: number;
  laterClaimAge: number;
  breakEvenAge: number | null;
};

export type SocialSecurityComparison = {
  framing: "education";
  assumptions: {
    fullRetirementAge: number;
    cola: number;
    planningHorizonAge: number;
    monteCarloRuns: number;
    note: string;
  };
  strategies: SocialSecurityClaimComparison[];
  breakEvenAges: SocialSecurityBreakEven[];
  spouseSurvivor?: {
    note: string;
    examples: { claimAge: number; survivorMonthlyBenefit: number }[];
  };
  tradeoffs: string[];
};

export function socialSecurityClaimAdjustment(claimAge: number, fullRetirementAge = FULL_RETIREMENT_AGE) {
  const monthsEarly = Math.max(0, Math.round((fullRetirementAge - claimAge) * 12));
  const first36Months = Math.min(36, monthsEarly);
  const additionalMonths = Math.max(0, monthsEarly - 36);
  const earlyReduction = first36Months * (5 / 9 / 100) + additionalMonths * (5 / 12 / 100);
  const delayedMonths = Math.max(0, Math.round((claimAge - fullRetirementAge) * 12));
  const delayedCredit = delayedMonths * (8 / 12 / 100);
  return 1 - earlyReduction + delayedCredit;
}

function monthlyBenefit(monthlyFraBenefit: number, claimAge: number) {
  return monthlyFraBenefit * socialSecurityClaimAdjustment(claimAge);
}

function cumulativeBenefit(monthly: number, claimAge: number, throughAge: number) {
  let total = 0;
  for (let age = claimAge; age <= throughAge; age++) {
    total += monthly * 12 * (1 + SOCIAL_SECURITY_COLA) ** (age - claimAge);
  }
  return total;
}

function breakEvenAge(earlier: SocialSecurityClaimComparison, later: SocialSecurityClaimComparison, horizonAge: number) {
  let earlierTotal = 0;
  let laterTotal = 0;
  for (let age = Math.min(earlier.claimAge, later.claimAge); age <= horizonAge; age++) {
    if (age >= earlier.claimAge) earlierTotal += earlier.householdMonthlyBenefit * 12 * (1 + SOCIAL_SECURITY_COLA) ** (age - earlier.claimAge);
    if (age >= later.claimAge) laterTotal += later.householdMonthlyBenefit * 12 * (1 + SOCIAL_SECURITY_COLA) ** (age - later.claimAge);
    if (laterTotal >= earlierTotal) return age;
  }
  return null;
}

function strategyTradeoffs(claimAge: number) {
  if (claimAge < FULL_RETIREMENT_AGE) {
    return ["Earlier claiming starts income sooner but permanently reduces the monthly check.", "This can help reduce near-term portfolio withdrawals if cash flow is tight."];
  }
  if (claimAge > FULL_RETIREMENT_AGE) {
    return ["Delaying raises the monthly inflation-adjusted income base.", "The tradeoff is using savings or work income for more years before checks begin."];
  }
  return ["Claiming at full retirement age avoids early reductions and delayed credits.", "It is a middle path between near-term income and a larger age-70 check."];
}

export function compareSocialSecurity(profile: FinancialProfile, options: { monteCarloRuns?: number } = {}): SocialSecurityComparison {
  const runs = options.monteCarloRuns ?? 300;
  const hasSpouse = Boolean(profile.spouse_ss_benefit_fra && profile.marital_status === "married");
  const strategies = Array.from({ length: 9 }, (_, i) => 62 + i).map((claimAge) => {
    const workerMonthly = monthlyBenefit(profile.ss_benefit_fra, claimAge);
    const spouseClaimAge = profile.spouse_ss_claim_age ?? claimAge;
    const spouseMonthly = hasSpouse ? monthlyBenefit(profile.spouse_ss_benefit_fra ?? 0, spouseClaimAge) : 0;
    const householdMonthlyBenefit = workerMonthly + spouseMonthly;
    const comparedProfile = { ...profile, ss_claim_age: claimAge };
    const successRate = runMonteCarlo(comparedProfile, runs, { seed: `${profile.user_id}-ss-${claimAge}` }).probabilityOfSuccess;
    const spouse = hasSpouse ? {
      spouseMonthlyBenefit: Math.round(spouseMonthly),
      combinedMonthlyBenefit: Math.round(householdMonthlyBenefit),
      estimatedSurvivorMonthlyBenefit: Math.round(Math.max(workerMonthly, spouseMonthly)),
    } : undefined;

    return {
      claimAge,
      monthlyBenefit: Math.round(workerMonthly),
      householdMonthlyBenefit: Math.round(householdMonthlyBenefit),
      adjustmentPct: Math.round((socialSecurityClaimAdjustment(claimAge) - 1) * 1000) / 10,
      successRate,
      lifetimeValueToHorizon: Math.round(cumulativeBenefit(householdMonthlyBenefit, claimAge, profile.planning_horizon_age)),
      tradeoffs: strategyTradeoffs(claimAge),
      spouse,
    };
  });

  const breakEvenAges = strategies.flatMap((earlier, index) => strategies.slice(index + 1).map((later) => ({
    earlierClaimAge: earlier.claimAge,
    laterClaimAge: later.claimAge,
    breakEvenAge: breakEvenAge(earlier, later, profile.planning_horizon_age),
  })));

  return {
    framing: "education",
    assumptions: {
      fullRetirementAge: FULL_RETIREMENT_AGE,
      cola: SOCIAL_SECURITY_COLA,
      planningHorizonAge: profile.planning_horizon_age,
      monteCarloRuns: runs,
      note: "For education only: compares claiming ages using saved profile inputs, 2026 assumptions, and seeded market simulations; it is not a directive to claim at any age.",
    },
    strategies,
    breakEvenAges,
    spouseSurvivor: hasSpouse ? {
      note: "Basic household view: while both spouses are alive this adds both checks; a simple survivor illustration keeps the larger check.",
      examples: strategies.map((strategy) => ({ claimAge: strategy.claimAge, survivorMonthlyBenefit: strategy.spouse?.estimatedSurvivorMonthlyBenefit ?? strategy.monthlyBenefit })),
    } : undefined,
    tradeoffs: [
      "Earlier claiming can improve near-term cash flow and may help if longevity or employment is uncertain.",
      "Later claiming can increase guaranteed inflation-adjusted income and survivor income, but requires bridge resources.",
      "Break-even ages show when cumulative dollars from a later strategy catch up to an earlier one; taxes, health, and survivor needs can change the practical picture.",
    ],
  };
}
