import type { SpendingAccount, SpendingTransaction } from "@/lib/engine/spending";

export type FraudFlag = {
  riskScore: number;
  reason: string;
  transaction: SpendingTransaction;
  advice: string;
};

type Options = { accounts?: SpendingAccount[]; now?: Date };

function amountOf(txn: SpendingTransaction): number {
  const amount = Number(txn.amount ?? 0);
  return Number.isFinite(amount) ? amount : 0;
}

function dateOf(txn: SpendingTransaction): Date | null {
  if (!txn.date) return null;
  const date = new Date(`${txn.date}T00:00:00Z`);
  return Number.isNaN(date.getTime()) ? null : date;
}

function daysBetween(a: Date, b: Date) {
  return Math.abs(a.getTime() - b.getTime()) / 86_400_000;
}

function textOf(txn: SpendingTransaction): string {
  const pfc = txn.personal_finance_category;
  const category = typeof pfc === "string" ? pfc : `${pfc?.primary ?? ""} ${pfc?.detailed ?? ""}`;
  return `${txn.name ?? ""} ${txn.merchant_name ?? ""} ${txn.category ?? ""} ${category} ${txn.payment_channel ?? ""}`.toUpperCase();
}

function payeeOf(txn: SpendingTransaction): string {
  return (txn.merchant_name ?? txn.name ?? "Unknown payee").trim().replace(/\s+/g, " ");
}

function norm(value: string): string {
  return value.toUpperCase().replace(/\b\d{2,}\b/g, "").replace(/[^A-Z ]/g, " ").replace(/\s+/g, " ").trim();
}

function keyOf(txn: SpendingTransaction): string {
  const text = textOf(txn);
  const category = typeof txn.personal_finance_category === "string" ? txn.personal_finance_category : txn.category;
  return norm(category || txn.merchant_name || txn.name || text);
}

function pushFlag(flags: FraudFlag[], flag: FraudFlag) {
  const existing = flags.find((candidate) => candidate.transaction === flag.transaction);
  if (existing) {
    if (flag.riskScore > existing.riskScore) existing.riskScore = flag.riskScore;
    existing.reason = `${existing.reason}; ${flag.reason}`;
    return;
  }
  flags.push(flag);
}

function isTransferWire(txn: SpendingTransaction): boolean {
  return /WIRE|TRANSFER|ACH|ZELLE|VENMO|CASH APP|PAYPAL|P2P|MONEY TRANSFER|REMITTANCE/.test(textOf(txn));
}

function isGiftCryptoMoneyTransfer(txn: SpendingTransaction): boolean {
  return /GIFT[ -]?CARD|GIFT_CARD|CRYPTO|BITCOIN|COINBASE|KRAKEN|BINANCE|MONEY TRANSFER|WESTERN UNION|MONEYGRAM|REMITTANCE/.test(textOf(txn));
}

function highRiskAdvice(payee: string) {
  return `Pause payment activity. Verify ${payee} by calling a known official number, do not use links from texts or email, and contact your bank's fraud desk if this was not intended.`;
}

export function detectFraudFlags(transactions: SpendingTransaction[] = [], options: Options = {}): FraudFlag[] {
  const sorted = transactions
    .filter((txn) => !txn.pending)
    .map((txn, index) => ({ txn, date: dateOf(txn), index }))
    .filter((row): row is { txn: SpendingTransaction; date: Date; index: number } => row.date !== null)
    .sort((a, b) => a.date.getTime() - b.date.getTime() || a.index - b.index);
  const flags: FraudFlag[] = [];
  const seenPayees = new Set<string>();

  for (const row of sorted) {
    const amount = amountOf(row.txn);
    if (amount <= 0) {
      seenPayees.add(norm(payeeOf(row.txn)));
      continue;
    }
    const payee = payeeOf(row.txn);
    const normalizedPayee = norm(payee);

    if (isTransferWire(row.txn) && amount > 1500 && normalizedPayee && !seenPayees.has(normalizedPayee)) {
      pushFlag(flags, {
        riskScore: amount >= 5000 ? 95 : 88,
        reason: `$${Math.round(amount).toLocaleString()} transfer/wire to brand-new payee ${payee}`,
        transaction: row.txn,
        advice: highRiskAdvice(payee),
      });
    }

    if (isGiftCryptoMoneyTransfer(row.txn)) {
      pushFlag(flags, {
        riskScore: amount >= 500 ? 92 : 82,
        reason: `High-risk merchant category for ${payee}: gift card, crypto, or money-transfer activity`,
        transaction: row.txn,
        advice: "Treat requests for gift cards, crypto, or money transfers as scam signals. Verify independently before sending more money.",
      });
    }

    seenPayees.add(normalizedPayee);
  }

  const accounts = new Map((options.accounts ?? []).map((account) => [account.account_id ?? "", account]));
  const byAccount = new Map<string, typeof sorted>();
  for (const row of sorted.filter((row) => amountOf(row.txn) > 0 && row.txn.account_id)) {
    byAccount.set(row.txn.account_id!, [...(byAccount.get(row.txn.account_id!) ?? []), row]);
  }
  for (const [accountId, rows] of byAccount) {
    const account = accounts.get(accountId);
    const isDepository = !account || /depository|checking|savings|cash/i.test(`${account.type ?? ""} ${account.subtype ?? ""}`);
    if (!isDepository) continue;
    for (let i = 0; i < rows.length; i += 1) {
      const cluster = rows.filter((row) => daysBetween(row.date, rows[i].date) <= 2);
      const total = cluster.reduce((sum, row) => sum + amountOf(row.txn), 0);
      const balance = Number(account?.current_balance ?? account?.available_balance ?? 0);
      const drainsKnownBalance = balance > 0 && total >= balance * 0.6;
      if (cluster.length >= 3 && (total >= 1500 || drainsKnownBalance)) {
        const largest = cluster.reduce((max, row) => (amountOf(row.txn) > amountOf(max.txn) ? row : max), cluster[0]);
        pushFlag(flags, {
          riskScore: drainsKnownBalance ? 94 : 86,
          reason: `Rapid sequence of ${cluster.length} withdrawals totaling $${Math.round(total).toLocaleString()} from a depository account`,
          transaction: largest.txn,
          advice: "Freeze or slow additional withdrawals until you confirm each transaction with your bank and a trusted helper.",
        });
        break;
      }
    }
  }

  const latestDate = sorted.at(-1)?.date ?? options.now ?? new Date();
  for (const row of sorted) {
    const amount = amountOf(row.txn);
    if (amount <= 0 || daysBetween(row.date, latestDate) > 45) continue;
    const key = keyOf(row.txn);
    const prior = sorted.filter((candidate) => candidate.date < row.date && keyOf(candidate.txn) === key && amountOf(candidate.txn) > 0);
    if (prior.length < 3) continue;
    const avg = prior.reduce((sum, candidate) => sum + amountOf(candidate.txn), 0) / prior.length;
    if (amount >= Math.max(500, avg * 4)) {
      pushFlag(flags, {
        riskScore: amount >= avg * 8 ? 90 : 80,
        reason: `$${Math.round(amount).toLocaleString()} spend is far outside the $${Math.round(avg).toLocaleString()} baseline for ${key.toLowerCase()}`,
        transaction: row.txn,
        advice: "Check whether this purchase was authorized and whether the merchant or category matches what you expected.",
      });
    }
  }

  return flags.sort((a, b) => b.riskScore - a.riskScore);
}
