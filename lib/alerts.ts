// Profile-matched alerts feed. Matches content_items to the user's state, age, and top worry.

import { IRMAA_BRACKETS } from "@/lib/engine/params/2026";
import type { Answers } from "@/lib/scoring";
import { monitorRuleAlerts, type MonitorRulesInput } from "@/lib/connected/monitorRules";
import type { SpendingAccount, SpendingTransaction } from "@/lib/engine/spending";
import { detectFraudFlags, type FraudFlag } from "@/lib/engine/fraud";

export type AlertCategory = "benefit" | "inflation" | "scam" | "tax" | "medicare" | "ss";
export type AlertStatus = "draft" | "approved" | "published" | "archived";

export type Alert = {
  id: string;
  title: string;
  body: string;
  category: AlertCategory | string;
  states: string[] | null;
  min_age: number | null;
  action_line: string;
  source_url: string | null;
  published_at: string | null;
  expires_at: string | null;
  status: AlertStatus | string;
  created_at: string;
  what_to_ask?: string | null;
  personalized?: boolean;
};

const WORRY_CATEGORY: Record<string, AlertCategory> = {
  running_out: "ss",
  inflation: "inflation",
  market: "inflation",
  scams: "scam",
  healthcare: "medicare",
};

const CATEGORY_FALLBACK: Record<string, AlertCategory> = {
  benefit: "benefit",
  costofliving: "inflation",
  healthcare: "medicare",
};

type SupabaseLike = { from: (t: string) => any };

type AlertProfile = Pick<Answers, "age" | "worry" | "state"> & Partial<Answers>;

type AlertMatchContext = MonitorRulesInput & { transactions?: SpendingTransaction[]; accounts?: SpendingAccount[] };

function normalizeCategory(category: string): AlertCategory | string {
  return CATEGORY_FALLBACK[category] ?? category;
}

function isLive(alert: Alert, now = new Date()) {
  if (!["approved", "published"].includes(alert.status ?? "published")) return false;
  if (alert.published_at && new Date(alert.published_at) > now) return false;
  if (alert.expires_at && new Date(alert.expires_at) < now) return false;
  return true;
}

function txnDate(txn: SpendingTransaction): Date | null {
  if (!txn.date) return null;
  const date = new Date(`${txn.date}T00:00:00Z`);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function realYtdIncomeFromTransactions(transactions: SpendingTransaction[] = [], now = new Date()): number | null {
  let total = 0;
  let found = false;
  const year = now.getUTCFullYear();
  for (const txn of transactions) {
    const date = txnDate(txn);
    const amount = Number(txn.amount ?? 0);
    if (!date || date.getUTCFullYear() !== year || !Number.isFinite(amount) || amount >= 0) continue;
    const text = `${txn.name ?? ""} ${txn.merchant_name ?? ""} ${typeof txn.personal_finance_category === "string" ? txn.personal_finance_category : ""} ${txn.category ?? ""}`.toUpperCase();
    if (/TRANSFER|LOAN|CREDIT CARD|PAYMENT|VENMO|ZELLE|CASH APP|SAVINGS|CHECKING/.test(text) && !/PAYROLL|PAYCHECK|SALARY|PENSION|SSA|SOCIAL SECURITY|DIVIDEND|INTEREST/.test(text)) continue;
    total += Math.abs(amount);
    found = true;
  }
  return found ? total : null;
}

function estimatedMagi(profile: AlertProfile, transactions?: SpendingTransaction[], now = new Date()) {
  const realYtdIncome = realYtdIncomeFromTransactions(transactions, now);
  if (realYtdIncome !== null) return realYtdIncome;
  const annualGuaranteed = Math.max(0, profile.guaranteedIncome ?? 0) * 12;
  const annualSs = Math.max(0, profile.ssaBenefitEstimate ?? 0) * 12;
  const taxableSsEstimate = annualSs * 0.85;
  const portfolioYieldEstimate = Math.max(0, profile.savings ?? 0) * 0.025;
  return Math.max(annualGuaranteed, taxableSsEstimate) + portfolioYieldEstimate;
}

function filingStatus(profile: AlertProfile): "single" | "married" {
  return profile.filingStatus === "married_joint" || profile.filingStatus === "married_separate" || (profile.spouseAge ?? 0) > 0 ? "married" : "single";
}

function personalizedAlerts(profile: AlertProfile, context?: AlertMatchContext): Alert[] {
  const now = (context?.now ?? new Date()).toISOString();
  const alerts: Alert[] = [];
  if (profile.age >= 63) {
    const status = filingStatus(profile);
    const magi = estimatedMagi(profile, context?.transactions ?? context?.recentTransactions, context?.now);
    const next = IRMAA_BRACKETS[status].find((bracket) => Number.isFinite(bracket.upTo) && bracket.upTo > magi);
    if (next) {
      const room = Math.max(0, Math.round(next.upTo - magi));
      alerts.push({
        id: `personalized-irmaa-${status}`,
        title: "Your estimated IRMAA room",
        body: `Based on your connected year-to-date income when available, you appear to be about $${room.toLocaleString()} under the next Medicare IRMAA line for ${status === "married" ? "married filers" : "single filers"}. Use this as an education-only prompt before Roth conversions, capital gains, or large withdrawals.`,
        category: "medicare",
        states: null,
        min_age: 63,
        action_line: "Ask: Could this year's income choices change Medicare premiums two years from now?",
        source_url: null,
        published_at: now,
        expires_at: null,
        status: "published",
        created_at: now,
        personalized: true,
      });
    }
  }

  if (profile.claimedSocialSecurity !== "yes" && profile.age >= 60 && profile.age < 70 && (profile.ssaBenefitEstimate ?? 0) > 0) {
    alerts.push({
      id: "personalized-ss-claiming-window",
      title: "Social Security claiming age check",
      body: `You entered an estimated Social Security benefit of $${Math.round(profile.ssaBenefitEstimate ?? 0).toLocaleString()}/mo. Claiming timing can change lifetime and survivor income, so compare age 62, full retirement age, and 70 before filing.`,
      category: "ss",
      states: null,
      min_age: 60,
      action_line: "Ask: What claiming age best supports my household income floor?",
      source_url: null,
      published_at: now,
      expires_at: null,
      status: "published",
      created_at: now,
      personalized: true,
    });
  }
  return alerts;
}

function fraudAlertBase(flag: FraudFlag, now: string): Alert {
  const amount = Math.round(Math.abs(Number(flag.transaction.amount ?? 0)));
  const payee = (flag.transaction.merchant_name ?? flag.transaction.name ?? "the payee").trim();
  const transactionId = flag.transaction.transaction_id ?? `${flag.transaction.account_id ?? "account"}-${flag.transaction.date ?? "date"}-${amount}`;
  return {
    id: `fraud-${transactionId}`,
    title: `Potential scam risk: ${payee}`,
    body: `${flag.reason}. Risk score: ${flag.riskScore}/100. Transaction amount: $${amount.toLocaleString()}.`,
    category: "scam",
    states: null,
    min_age: null,
    action_line: `Verify steps: ${flag.advice}`,
    source_url: null,
    published_at: now,
    expires_at: null,
    status: "published",
    created_at: now,
    personalized: true,
  };
}

function fraudAlerts(context?: AlertMatchContext): Alert[] {
  const flags = detectFraudFlags(context?.transactions ?? context?.recentTransactions ?? [], { accounts: context?.accounts, now: context?.now });
  const now = (context?.now ?? new Date()).toISOString();
  return flags.filter((flag) => flag.riskScore >= 80).map((flag) => fraudAlertBase(flag, now));
}

export async function getMatchedAlerts(
  supabase: SupabaseLike,
  profile: AlertProfile,
  limit = 12,
  context?: AlertMatchContext
): Promise<Alert[]> {
  const { data } = await supabase
    .from("content_items")
    .select("*")
    .or(`min_age.is.null,min_age.lte.${profile.age}`)
    .order("published_at", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false })
    .limit(80);

  const now = new Date();
  const items: Alert[] = (data ?? [])
    .map((it: Alert) => ({ ...it, category: normalizeCategory(String(it.category)), action_line: it.action_line ?? it.what_to_ask ?? "Ask: Does this change anything I should review in my retirement plan?", status: it.status ?? "published" }))
    .filter((it: Alert) => isLive(it, now))
    .filter((it: Alert) => !it.states || it.states.length === 0 || (profile.state ? it.states.includes(profile.state) : false));

  const topCat = WORRY_CATEGORY[profile.worry] ?? "";
  const connectedAlerts = context ? monitorRuleAlerts({ ...context, recentTransactions: context.recentTransactions ?? context.transactions }) : [];
  const scamAlerts = fraudAlerts(context);
  const combined = [...personalizedAlerts(profile, context), ...scamAlerts, ...connectedAlerts, ...items];
  combined.sort((a, b) => Number(b.personalized ?? false) - Number(a.personalized ?? false) || (b.category === topCat ? 1 : 0) - (a.category === topCat ? 1 : 0));
  return combined.slice(0, limit);
}
