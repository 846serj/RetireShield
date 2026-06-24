import { EXPENSE_RATIOS } from "../data/expenseRatios";

export type HoldingRow = {
  account_id: string | null;
  security_id: string | null;
  ticker?: string | null;
  name?: string | null;
  type?: string | null;
  institution_value: number | null;
};

export type SecurityRow = {
  security_id: string;
  ticker?: string | null;
  name?: string | null;
  type?: string | null;
  is_cash_equivalent?: boolean | null;
  expense_ratio?: number | null;
};

export type FinancialAccountRow = {
  account_id: string;
  type?: string | null;
  subtype?: string | null;
  current_balance?: number | null;
};

export type TaxBucketTotals = {
  taxable: number;
  taxDeferred: number;
  roth: number;
  cash: number;
  other: number;
};

export type Allocation = {
  equityPct: number;
  bondPct: number;
  cashPct: number;
  otherPct: number;
  totalValue: number;
};

export type Concentration = {
  largestPositionPct: number;
  flagged: boolean;
};

export type FeeDrag = {
  annualDollars: number;
  pct: number;
  partial: boolean;
  unknownTickers: string[];
};

export type TopPosition = {
  ticker: string | null;
  name: string | null;
  value: number;
  pct: number;
};

const TAXABLE_SUBTYPES = new Set(["brokerage", "taxable"]);
const TAX_DEFERRED_SUBTYPES = new Set(["401k", "401(k)", "ira", "traditional ira", "403b", "403(b)", "457b", "457(b)", "pension"]);
const ROTH_SUBTYPES = new Set(["roth", "roth ira", "roth 401k", "roth 401(k)"]);
const CASH_ACCOUNT_TYPES = new Set(["depository"]);
const CASH_SUBTYPES = new Set(["checking", "savings", "cash management", "cd", "money market", "paypal", "prepaid"]);
const BOND_TICKERS = new Set(["BND", "AGG", "BNDX", "BSV", "BIV", "BLV", "VCIT", "VCSH", "VGIT", "VGSH", "VGLT", "SCHZ", "SCHP", "SCHR", "SCHO", "LQD", "HYG", "TLT", "IEF", "SHY", "MUB"]);

function valueOf(holding: HoldingRow): number {
  return holding.institution_value ?? 0;
}

function normalize(value?: string | null): string {
  return (value ?? "").trim().toLowerCase();
}

function tickerOf(row?: { ticker?: string | null }): string | null {
  const ticker = row?.ticker?.trim().toUpperCase();
  return ticker || null;
}

function round(value: number): number {
  return Math.round(value * 10000) / 10000;
}

function securityMap(securities: SecurityRow[]): Map<string, SecurityRow> {
  return new Map(securities.map((security) => [security.security_id, security]));
}

export function byTaxBucket(holdings: HoldingRow[], accounts: FinancialAccountRow[]): TaxBucketTotals {
  const accountById = new Map(accounts.map((account) => [account.account_id, account]));
  const totals: TaxBucketTotals = { taxable: 0, taxDeferred: 0, roth: 0, cash: 0, other: 0 };

  const holdingAccountIds = new Set(holdings.map((holding) => holding.account_id).filter(Boolean));

  for (const holding of holdings) {
    const account = holding.account_id ? accountById.get(holding.account_id) : undefined;
    const subtype = normalize(account?.subtype);
    const type = normalize(account?.type);
    const value = valueOf(holding);

    if (CASH_ACCOUNT_TYPES.has(type) || CASH_SUBTYPES.has(subtype)) totals.cash += value;
    else if (ROTH_SUBTYPES.has(subtype)) totals.roth += value;
    else if (TAX_DEFERRED_SUBTYPES.has(subtype)) totals.taxDeferred += value;
    else if (TAXABLE_SUBTYPES.has(subtype)) totals.taxable += value;
    else totals.other += value;
  }

  for (const account of accounts) {
    if (!holdingAccountIds.has(account.account_id) && CASH_ACCOUNT_TYPES.has(normalize(account.type))) {
      totals.cash += account.current_balance ?? 0;
    }
  }

  return totals;
}

export function allocation(holdings: HoldingRow[], securities: SecurityRow[]): Allocation {
  const securitiesById = securityMap(securities);
  let equity = 0;
  let bond = 0;
  let cash = 0;
  let other = 0;
  const totalValue = holdings.reduce((sum, holding) => sum + valueOf(holding), 0);

  for (const holding of holdings) {
    const security = holding.security_id ? securitiesById.get(holding.security_id) : undefined;
    const type = normalize(security?.type ?? holding.type);
    const ticker = tickerOf(security) ?? tickerOf(holding);
    const value = valueOf(holding);

    if (security?.is_cash_equivalent) cash += value;
    else if (type.includes("fixed income") || type === "bond" || type === "municipal" || (type === "etf" && ticker && BOND_TICKERS.has(ticker))) bond += value;
    else if (type === "equity" || type === "etf" || type === "mutual fund") equity += value;
    else if (type === "cash") cash += value;
    else other += value;
  }

  const pct = (amount: number) => (totalValue > 0 ? round(amount / totalValue) : 0);
  return { equityPct: pct(equity), bondPct: pct(bond), cashPct: pct(cash), otherPct: pct(other), totalValue };
}

export function concentration(holdings: HoldingRow[]): Concentration {
  const totalValue = holdings.reduce((sum, holding) => sum + valueOf(holding), 0);
  const largest = holdings.reduce((max, holding) => Math.max(max, valueOf(holding)), 0);
  const largestPositionPct = totalValue > 0 ? round(largest / totalValue) : 0;
  return { largestPositionPct, flagged: largestPositionPct > 0.1 };
}

export function feeDrag(holdings: HoldingRow[], securities: SecurityRow[]): FeeDrag {
  const securitiesById = securityMap(securities);
  const unknown = new Set<string>();
  let annualDollars = 0;
  const totalValue = holdings.reduce((sum, holding) => sum + valueOf(holding), 0);

  for (const holding of holdings) {
    const security = holding.security_id ? securitiesById.get(holding.security_id) : undefined;
    const ticker = tickerOf(security) ?? tickerOf(holding);
    const ratio = security?.expense_ratio ?? (ticker ? EXPENSE_RATIOS[ticker] : undefined);
    if (ratio == null && normalize(security?.type ?? holding.type) === "equity") {
      continue;
    }
    if (ratio == null) {
      if (ticker) unknown.add(ticker);
      continue;
    }
    annualDollars += valueOf(holding) * ratio;
  }

  return {
    annualDollars: round(annualDollars),
    pct: totalValue > 0 ? round(annualDollars / totalValue) : 0,
    partial: unknown.size > 0,
    unknownTickers: [...unknown].sort(),
  };
}

export function topPositions(holdings: HoldingRow[], limit = 5): TopPosition[] {
  const totalValue = holdings.reduce((sum, holding) => sum + valueOf(holding), 0);
  return [...holdings]
    .sort((a, b) => valueOf(b) - valueOf(a))
    .slice(0, limit)
    .map((holding) => ({ ticker: tickerOf(holding), name: holding.name ?? null, value: valueOf(holding), pct: totalValue > 0 ? round(valueOf(holding) / totalValue) : 0 }));
}

export function buildPortfolioAnalysis(holdings: HoldingRow[], securities: SecurityRow[], accounts: FinancialAccountRow[]) {
  const assetAllocation = allocation(holdings, securities);
  const portfolioConcentration = concentration(holdings);
  const drag = feeDrag(holdings, securities);

  return {
    totalValue: assetAllocation.totalValue,
    byTaxBucket: byTaxBucket(holdings, accounts),
    equityPct: assetAllocation.equityPct,
    bondPct: assetAllocation.bondPct,
    cashPct: assetAllocation.cashPct,
    concentration: portfolioConcentration,
    feeDragAnnual: drag.annualDollars,
    feeDragPct: drag.pct,
    partial: drag.partial,
    topPositions: topPositions(holdings),
  };
}
