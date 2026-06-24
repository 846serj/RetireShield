export type SpendingTransaction = {
  transaction_id?: string | null;
  account_id?: string | null;
  date?: string | null;
  amount?: number | string | null;
  name?: string | null;
  merchant_name?: string | null;
  category?: string | null;
  personal_finance_category?: string | null | { primary?: string | null; detailed?: string | null };
  pending?: boolean | null;
  payment_channel?: string | null;
};

export type SpendingAccount = {
  account_id?: string | null;
  type?: string | null;
  subtype?: string | null;
  current_balance?: number | string | null;
  available_balance?: number | string | null;
};

export type ClassifiedTransaction = SpendingTransaction & {
  spendingType: "essential" | "discretionary";
};

export type RecurringIncomeSource = {
  name: string;
  kind: "social_security" | "pension" | "payroll" | "other";
  estimatedMonthlyAmount: number;
  occurrences: number;
};

export type RecurringBill = {
  name: string;
  estimatedMonthlyAmount: number;
  occurrences: number;
  isSubscription: boolean;
};

export type RecurringBillsResult = {
  bills: RecurringBill[];
  subscriptionCreep: { count: number; total: number };
};

const ESSENTIAL_CATEGORY_MATCHES = [
  "RENT",
  "MORTGAGE",
  "HOME",
  "HOUSING",
  "UTILITIES",
  "INSURANCE",
  "MEDICAL",
  "HEALTHCARE",
  "PHARMACIES",
  "PHARMACY",
  "GROCERIES",
  "LOAN",
];

const SUBSCRIPTION_MATCHES = ["SUBSCRIPTION", "STREAMING", "TV", "MUSIC", "DIGITAL", "ENTERTAINMENT"];

function amountOf(txn: SpendingTransaction): number {
  const amount = Number(txn.amount ?? 0);
  return Number.isFinite(amount) ? amount : 0;
}

function categoryOf(txn: SpendingTransaction): string {
  const pfc = txn.personal_finance_category;
  if (typeof pfc === "string") return pfc.toUpperCase();
  return `${pfc?.primary ?? ""} ${pfc?.detailed ?? ""} ${txn.category ?? ""}`.toUpperCase();
}

function nameOf(txn: SpendingTransaction): string {
  return (txn.merchant_name ?? txn.name ?? "Unknown").trim();
}

function normalizedName(txn: SpendingTransaction): string {
  return nameOf(txn)
    .toUpperCase()
    .replace(/\b\d{2,}\b/g, "")
    .replace(/[^A-Z ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function monthKey(date: Date): string {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}

function parseDate(txn: SpendingTransaction): Date | null {
  if (!txn.date) return null;
  const date = new Date(`${txn.date}T00:00:00Z`);
  return Number.isNaN(date.getTime()) ? null : date;
}

function trailingMonthKeys(txns: SpendingTransaction[], count = 3): Set<string> {
  const dates = txns.map(parseDate).filter((date): date is Date => date !== null);
  if (dates.length === 0) return new Set();
  const latest = new Date(Math.max(...dates.map((date) => date.getTime())));
  const keys = new Set<string>();
  for (let i = 0; i < count; i += 1) {
    keys.add(monthKey(new Date(Date.UTC(latest.getUTCFullYear(), latest.getUTCMonth() - i, 1))));
  }
  return keys;
}

function roundCents(value: number): number {
  return Math.round(value * 100) / 100;
}

export function classifyTransactions(txns: SpendingTransaction[]): ClassifiedTransaction[] {
  return txns.map((txn) => {
    const category = categoryOf(txn);
    const spendingType = ESSENTIAL_CATEGORY_MATCHES.some((match) => category.includes(match)) ? "essential" : "discretionary";
    return { ...txn, spendingType };
  });
}

function monthlySpendByType(txns: SpendingTransaction[], spendingType: "essential" | "discretionary"): number {
  const months = trailingMonthKeys(txns);
  const total = classifyTransactions(txns).reduce((sum, txn) => {
    const date = parseDate(txn);
    if (!date || !months.has(monthKey(date)) || txn.spendingType !== spendingType) return sum;
    // Plaid depository accounts use positive amounts for money leaving the account.
    // Only positive amounts are counted as spending outflows; negative amounts are inflows.
    return amountOf(txn) > 0 ? sum + amountOf(txn) : sum;
  }, 0);
  return roundCents(total / 3);
}

export function monthlyEssentialSpend(txns: SpendingTransaction[]): number {
  return monthlySpendByType(txns, "essential");
}

function monthlyDiscretionarySpend(txns: SpendingTransaction[]): number {
  return monthlySpendByType(txns, "discretionary");
}

function recurringGroups(txns: SpendingTransaction[], predicate: (txn: SpendingTransaction) => boolean) {
  const groups = new Map<string, SpendingTransaction[]>();
  for (const txn of txns.filter(predicate)) {
    const key = normalizedName(txn);
    if (!key) continue;
    groups.set(key, [...(groups.get(key) ?? []), txn]);
  }
  return [...groups.entries()];
}

function isStableMonthly(txns: SpendingTransaction[]): boolean {
  const months = new Set(txns.map(parseDate).filter((date): date is Date => date !== null).map(monthKey));
  if (months.size < 2) return false;
  const amounts = txns.map((txn) => Math.abs(amountOf(txn))).filter((amount) => amount > 0);
  if (amounts.length < 2) return false;
  const avg = amounts.reduce((sum, amount) => sum + amount, 0) / amounts.length;
  return amounts.every((amount) => Math.abs(amount - avg) <= Math.max(5, avg * 0.1));
}

function incomeKind(name: string): RecurringIncomeSource["kind"] {
  if (/\b(SSA|SOCIAL SECURITY)\b/i.test(name)) return "social_security";
  if (/PAYROLL|PAYCHECK|SALARY|DIRECT DEP/i.test(name)) return "payroll";
  if (/PENSION|ANNUITY|RETIREMENT/i.test(name)) return "pension";
  return "other";
}

export function detectRecurringIncome(txns: SpendingTransaction[]): { guaranteedMonthlyIncome: number; incomeSources: RecurringIncomeSource[] } {
  const incomeSources = recurringGroups(txns, (txn) => amountOf(txn) < 0)
    .filter(([, group]) => isStableMonthly(group))
    .map(([name, group]) => ({
      name,
      kind: incomeKind(name),
      estimatedMonthlyAmount: roundCents(group.reduce((sum, txn) => sum + Math.abs(amountOf(txn)), 0) / group.length),
      occurrences: group.length,
    }));

  const guaranteedMonthlyIncome = roundCents(
    incomeSources.filter((source) => source.kind === "social_security" || source.kind === "pension").reduce((sum, source) => sum + source.estimatedMonthlyAmount, 0),
  );

  return { guaranteedMonthlyIncome, incomeSources };
}

export function detectRecurringBills(txns: SpendingTransaction[]): RecurringBillsResult {
  const bills = recurringGroups(txns, (txn) => amountOf(txn) > 0)
    .filter(([, group]) => isStableMonthly(group))
    .map(([name, group]) => {
      const category = group.map(categoryOf).join(" ");
      const isSubscription = SUBSCRIPTION_MATCHES.some((match) => category.includes(match)) || /NETFLIX|HULU|SPOTIFY|APPLE|DISNEY|MAX|PARAMOUNT|PEACOCK/i.test(name);
      return {
        name,
        estimatedMonthlyAmount: roundCents(group.reduce((sum, txn) => sum + amountOf(txn), 0) / group.length),
        occurrences: group.length,
        isSubscription,
      };
    });

  const subscriptions = bills.filter((bill) => bill.isSubscription);
  return {
    bills,
    subscriptionCreep: {
      count: subscriptions.length,
      total: roundCents(subscriptions.reduce((sum, bill) => sum + bill.estimatedMonthlyAmount, 0)),
    },
  };
}

export function cashCushion(accounts: SpendingAccount[], monthlyEssential: number): number {
  const cashOnHand = accounts.reduce((sum, account) => {
    if ((account.type ?? "").toLowerCase() !== "depository") return sum;
    const balance = Number(account.available_balance ?? account.current_balance ?? 0);
    return Number.isFinite(balance) ? sum + balance : sum;
  }, 0);
  if (monthlyEssential <= 0) return cashOnHand > 0 ? Infinity : 0;
  return roundCents(cashOnHand / monthlyEssential);
}

export function buildFinancialPicture(txns: SpendingTransaction[], accounts: SpendingAccount[]) {
  const monthlyEssential = monthlyEssentialSpend(txns);
  const monthlyDiscretionary = monthlyDiscretionarySpend(txns);
  const { guaranteedMonthlyIncome: guaranteedIncome, incomeSources } = detectRecurringIncome(txns);
  const recurringBills = detectRecurringBills(txns);
  const cashOnHand = roundCents(
    accounts.reduce((sum, account) => {
      if ((account.type ?? "").toLowerCase() !== "depository") return sum;
      const balance = Number(account.available_balance ?? account.current_balance ?? 0);
      return Number.isFinite(balance) ? sum + balance : sum;
    }, 0),
  );

  return {
    monthlyEssential,
    monthlyDiscretionary,
    guaranteedIncome,
    recurringBills,
    cashOnHand,
    cushionMonths: cashCushion(accounts, monthlyEssential),
    incomeSources,
  };
}
