export type MaritalStatus = "single" | "married" | "partnered" | "widowed" | "divorced";

export type FinancialProfile = {
  user_id: string;
  birthdate: string | null;
  marital_status: MaritalStatus | null;
  spouse_birthdate: string | null;
  state: string | null;
  balance_taxable: number;
  taxable_cost_basis: number | null;
  balance_tax_deferred: number;
  balance_roth: number;
  stock_pct: number;
  bond_pct: number;
  cash_pct: number;
  ss_benefit_fra: number | null;
  ss_claim_age: number | null;
  spouse_ss_benefit_fra: number | null;
  spouse_ss_claim_age: number | null;
  pension_amount: number | null;
  pension_start_age: number | null;
  pension_has_cola: boolean;
  pension_survivor_pct: number | null;
  spending_essential_monthly: number;
  spending_discretionary_monthly: number;
  inflation_assumption: number;
  target_retirement_age: number | null;
  planning_horizon_age: number;
  updated_at: string | null;
};

export const FINANCIAL_PROFILE_DEFAULTS = {
  inflation_assumption: 0.03,
  planning_horizon_age: 95,
} as const;
