export const CURRENT_YEAR = 2026;
export const FULL_RETIREMENT_AGE = 67;
export const SOCIAL_SECURITY_COLA = 0.026;
export const RMD_START_AGE = 73;

export const EXPECTED_RETURNS = {
  stock: 0.07,
  bond: 0.04,
  cash: 0.02,
} as const;

export const ORDINARY_BRACKETS = {
  single: [
    { upTo: 11925, rate: 0.10 },
    { upTo: 48475, rate: 0.12 },
    { upTo: 103350, rate: 0.22 },
    { upTo: 197300, rate: 0.24 },
    { upTo: 250525, rate: 0.32 },
    { upTo: 626350, rate: 0.35 },
    { upTo: Infinity, rate: 0.37 },
  ],
  married: [
    { upTo: 23850, rate: 0.10 },
    { upTo: 96950, rate: 0.12 },
    { upTo: 206700, rate: 0.22 },
    { upTo: 394600, rate: 0.24 },
    { upTo: 501050, rate: 0.32 },
    { upTo: 751600, rate: 0.35 },
    { upTo: Infinity, rate: 0.37 },
  ],
} as const;

export const STANDARD_DEDUCTION = {
  single: 15000,
  married: 30000,
} as const;

export const ADDITIONAL_STANDARD_DEDUCTION_65 = {
  single: 2000,
  marriedPerSpouse: 1600,
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

export const LTCG_BRACKETS = {
  single: [
    { upTo: 48350, rate: 0 },
    { upTo: 533400, rate: 0.15 },
    { upTo: Infinity, rate: 0.20 },
  ],
  married: [
    { upTo: 96700, rate: 0 },
    { upTo: 600050, rate: 0.15 },
    { upTo: Infinity, rate: 0.20 },
  ],
} as const;

export const UNIFORM_LIFETIME_DIVISORS: Record<number, number> = {
  73: 26.5, 74: 25.5, 75: 24.6, 76: 23.7, 77: 22.9, 78: 22.0, 79: 21.1, 80: 20.2,
  81: 19.4, 82: 18.5, 83: 17.7, 84: 16.8, 85: 16.0, 86: 15.2, 87: 14.4, 88: 13.7,
  89: 12.9, 90: 12.2, 91: 11.5, 92: 10.8, 93: 10.1, 94: 9.5, 95: 8.9, 96: 8.4,
  97: 7.8, 98: 7.3, 99: 6.8, 100: 6.4, 101: 6.0, 102: 5.6, 103: 5.2, 104: 4.9,
  105: 4.6, 106: 4.3, 107: 4.1, 108: 3.9, 109: 3.7, 110: 3.5, 111: 3.4, 112: 3.3,
  113: 3.1, 114: 3.0, 115: 2.9, 116: 2.8, 117: 2.7, 118: 2.5, 119: 2.3, 120: 2.0,
};

export const IRMAA_BRACKETS = {
  single: [
    { upTo: 106000, annualSurcharge: 0 },
    { upTo: 133000, annualSurcharge: 1036.8 },
    { upTo: 167000, annualSurcharge: 2604 },
    { upTo: 200000, annualSurcharge: 4171.2 },
    { upTo: 500000, annualSurcharge: 5738.4 },
    { upTo: Infinity, annualSurcharge: 6205.2 },
  ],
  married: [
    { upTo: 212000, annualSurcharge: 0 },
    { upTo: 266000, annualSurcharge: 2073.6 },
    { upTo: 334000, annualSurcharge: 5208 },
    { upTo: 400000, annualSurcharge: 8342.4 },
    { upTo: 750000, annualSurcharge: 11476.8 },
    { upTo: Infinity, annualSurcharge: 12410.4 },
  ],
} as const;
