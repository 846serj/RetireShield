export const CURRENT_YEAR = 2026;
export const paramsVerified = true;
export const FULL_RETIREMENT_AGE = 67;
// SSA press release, Oct. 24, 2025: 2026 Social Security COLA is 2.8%.
// https://www.ssa.gov/news/en/press/releases/2025-10-24.html
export const SOCIAL_SECURITY_COLA = 0.028;
export const RMD_START_AGE = 73;

// J.P. Morgan Asset Management, 2026 Long-Term Capital Market Assumptions (29th annual edition),
// released Oct. 20, 2025: U.S. large-cap equities 6.7%, U.S. aggregate bonds 5.0%, and cash 3.5%.
// Volatility assumptions retain the app's broad CMA buckets and are documented below as long-run nominal stdev inputs.
export const EXPECTED_RETURNS = {
  stock: 0.067,
  bond: 0.05,
  cash: 0.035,
} as const;

export const DEFAULT_ASSUMPTIONS = {
  inflation: 0.03,
  socialSecurityCola: SOCIAL_SECURITY_COLA,
  depletionBandReturnSpread: 0.02,
  allocationAssumptions: {
    // Vanguard VCMM forecasts, Apr. 22, 2026 (simulations as of Mar. 31, 2026), define volatility as return standard deviation.
    // These broad buckets use defensible planning stdevs for stocks/bonds/cash while returns above use J.P. Morgan 2026 LTCMA.
    stock: { expectedReturn: EXPECTED_RETURNS.stock, stdev: 0.16 },
    bond: { expectedReturn: EXPECTED_RETURNS.bond, stdev: 0.06 },
    cash: { expectedReturn: EXPECTED_RETURNS.cash, stdev: 0.01 },
  },
} as const;

// IRS IR-2025-103 / Rev. Proc. 2025-32, tax year 2026 marginal rates.
// https://www.irs.gov/newsroom/irs-releases-tax-inflation-adjustments-for-tax-year-2026-including-amendments-from-the-one-big-beautiful-bill
export const ORDINARY_BRACKETS = {
  single: [
    { upTo: 12400, rate: 0.10 },
    { upTo: 50400, rate: 0.12 },
    { upTo: 105700, rate: 0.22 },
    { upTo: 201775, rate: 0.24 },
    { upTo: 256225, rate: 0.32 },
    { upTo: 640600, rate: 0.35 },
    { upTo: Infinity, rate: 0.37 },
  ],
  married: [
    { upTo: 24800, rate: 0.10 },
    { upTo: 100800, rate: 0.12 },
    { upTo: 211400, rate: 0.22 },
    { upTo: 403550, rate: 0.24 },
    { upTo: 512450, rate: 0.32 },
    { upTo: 768700, rate: 0.35 },
    { upTo: Infinity, rate: 0.37 },
  ],
} as const;

// IRS Rev. Proc. 2025-32, sec. 3.14, tax year 2026 standard deductions.
export const STANDARD_DEDUCTION = {
  single: 16100,
  married: 32200,
} as const;

// IRS Rev. Proc. 2025-32, sec. 3.14(3), aged-or-blind additional standard deduction.
export const ADDITIONAL_STANDARD_DEDUCTION_65 = {
  single: 2050,
  marriedPerSpouse: 1650,
} as const;

export const OBBBA_SENIOR_BONUS_DEDUCTION = {
  amountPerEligiblePerson: 6000,
  minAge: 65,
  phaseoutStart: { single: 75000, married: 150000 },
  phaseoutRate: 0.06,
} as const;

export const SOCIAL_SECURITY_TAX_THRESHOLDS = {
  single: { base: 25000, adjusted: 34000 },
  married: { base: 32000, adjusted: 44000 },
} as const;

// SSA Office of the Chief Actuary, Benefit Formula Bend Points table, updated for 2026:
// PIA bend points are $1,286 and $7,749; family-benefit bend points are $1,643, $2,371, and $3,093.
// https://www.ssa.gov/oact/cola/bendpoints.html
export const SOCIAL_SECURITY_BEND_POINTS = {
  pia: { first: 1286, second: 7749 },
  maximumFamilyBenefit: { first: 1643, second: 2371, third: 3093 },
} as const;

// IRS Rev. Proc. 2025-32, tax year 2026 qualified dividends / net capital gain thresholds.
export const LTCG_BRACKETS = {
  single: [
    { upTo: 49450, rate: 0 },
    { upTo: 545500, rate: 0.15 },
    { upTo: Infinity, rate: 0.20 },
  ],
  married: [
    { upTo: 98900, rate: 0 },
    { upTo: 613700, rate: 0.15 },
    { upTo: Infinity, rate: 0.20 },
  ],
} as const;

// IRS Publication 590-B (2025), Appendix B, Table III (Uniform Lifetime);
// IRS states these denominators are used for 2026 RMDs based on age at birthday in 2026.
// https://www.irs.gov/publications/p590b#en_US_2025_publink100090310
export const UNIFORM_LIFETIME_DIVISORS: Record<number, number> = {
  72: 27.4, 73: 26.5, 74: 25.5, 75: 24.6, 76: 23.7, 77: 22.9, 78: 22.0, 79: 21.1, 80: 20.2,
  81: 19.4, 82: 18.5, 83: 17.7, 84: 16.8, 85: 16.0, 86: 15.2, 87: 14.4, 88: 13.7,
  89: 12.9, 90: 12.2, 91: 11.5, 92: 10.8, 93: 10.1, 94: 9.5, 95: 8.9, 96: 8.4,
  97: 7.8, 98: 7.3, 99: 6.8, 100: 6.4, 101: 6.0, 102: 5.6, 103: 5.2, 104: 4.9,
  105: 4.6, 106: 4.3, 107: 4.1, 108: 3.9, 109: 3.7, 110: 3.5, 111: 3.4, 112: 3.3,
  113: 3.1, 114: 3.0, 115: 2.9, 116: 2.8, 117: 2.7, 118: 2.5, 119: 2.3, 120: 2.0,
};

// CMS 2026 Medicare Parts A & B Premiums and Deductibles fact sheet, Nov. 14, 2025:
// standard Part B premium $202.90/month; full Part B IRMAA monthly adjustments $0.00,
// $81.20, $202.90, $324.60, $446.30, and $487.00.
// https://www.cms.gov/newsroom/fact-sheets/2026-medicare-parts-b-premiums-deductibles
export const IRMAA_STANDARD_PART_B_PREMIUM_MONTHLY = 202.90;

export const IRMAA_BRACKETS = {
  single: [
    { upTo: 109000, annualSurcharge: 0 },
    { upTo: 137000, annualSurcharge: 974.4 },
    { upTo: 171000, annualSurcharge: 2434.8 },
    { upTo: 205000, annualSurcharge: 3895.2 },
    { upTo: 500000, annualSurcharge: 5355.6 },
    { upTo: Infinity, annualSurcharge: 5844 },
  ],
  married: [
    { upTo: 218000, annualSurcharge: 0 },
    { upTo: 274000, annualSurcharge: 1948.8 },
    { upTo: 342000, annualSurcharge: 4869.6 },
    { upTo: 410000, annualSurcharge: 7790.4 },
    { upTo: 750000, annualSurcharge: 10711.2 },
    { upTo: Infinity, annualSurcharge: 11688 },
  ],
} as const;
