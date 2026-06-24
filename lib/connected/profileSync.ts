import { buildFinancialPicture, type SpendingAccount, type SpendingTransaction } from "@/lib/engine/spending";
import { buildPortfolioAnalysis, type FinancialAccountRow, type HoldingRow, type SecurityRow } from "@/lib/engine/portfolio";
import { FINANCIAL_PROFILE_DEFAULTS, type FinancialProfile } from "@/lib/engine/types";
import { computeScores, type Answers } from "@/lib/scoring";
import { createServiceClient } from "@/lib/supabase/server";

type HoldingWithBasis = HoldingRow & { cost_basis?: number | string | null };
type ExistingProfile = Partial<FinancialProfile> | null;
type QuizAnswers = Partial<Answers> | null;

const TAXABLE_SUBTYPES = new Set(["brokerage", "taxable"]);

function toNumber(value: unknown, fallback = 0): number {
  const n = Number(value ?? fallback);
  return Number.isFinite(n) ? n : fallback;
}

function roundCents(value: number): number {
  return Math.round(value * 100) / 100;
}

function roundPct(value: number): number {
  return Math.round(value * 10000) / 100;
}

function ageFromBirthdate(birthdate?: string | null, now = new Date()): number | null {
  if (!birthdate) return null;
  const birth = new Date(`${birthdate}T00:00:00Z`);
  if (Number.isNaN(birth.getTime())) return null;
  let age = now.getUTCFullYear() - birth.getUTCFullYear();
  const monthDiff = now.getUTCMonth() - birth.getUTCMonth();
  if (monthDiff < 0 || (monthDiff === 0 && now.getUTCDate() < birth.getUTCDate())) age -= 1;
  return Math.max(0, age);
}

function snapStockPct(stockPct: number): Answers["stockPct"] {
  const snapped = [0, 25, 50, 75, 100].reduce((best, candidate) => (Math.abs(candidate - stockPct) < Math.abs(best - stockPct) ? candidate : best), 0);
  return snapped as Answers["stockPct"];
}

function emergencyFundBucket(cushionMonths: number): Answers["emergencyFund"] {
  if (!Number.isFinite(cushionMonths) || cushionMonths >= 6) return "6+";
  if (cushionMonths >= 3) return "3-6";
  if (cushionMonths >= 1) return "1-3";
  return "0";
}

function fallbackGuaranteedIncome(profile: ExistingProfile): number {
  return toNumber(profile?.ss_benefit_fra) + toNumber(profile?.pension_amount);
}

function taxableCostBasis(holdings: HoldingWithBasis[], accounts: FinancialAccountRow[]): number | null {
  const accountById = new Map(accounts.map((account) => [account.account_id, account]));
  let found = false;
  const total = holdings.reduce((sum, holding) => {
    const subtype = (holding.account_id ? accountById.get(holding.account_id)?.subtype : "")?.toLowerCase() ?? "";
    if (!TAXABLE_SUBTYPES.has(subtype)) return sum;
    const basis = Number(holding.cost_basis);
    if (!Number.isFinite(basis)) return sum;
    found = true;
    return sum + basis;
  }, 0);
  return found ? roundCents(total) : null;
}

export function buildConnectedProfileUpdate(params: {
  userId: string;
  existingProfile: ExistingProfile;
  financialPicture: ReturnType<typeof buildFinancialPicture>;
  portfolio: ReturnType<typeof buildPortfolioAnalysis>;
  holdings: HoldingWithBasis[];
  accounts: FinancialAccountRow[];
  now?: Date;
}): FinancialProfile {
  const { userId, existingProfile, financialPicture, portfolio, holdings, accounts, now = new Date() } = params;
  return {
    user_id: userId,
    birthdate: existingProfile?.birthdate ?? null,
    marital_status: existingProfile?.marital_status ?? null,
    spouse_birthdate: existingProfile?.spouse_birthdate ?? null,
    state: existingProfile?.state ?? null,
    balance_taxable: roundCents(portfolio.byTaxBucket.taxable),
    taxable_cost_basis: taxableCostBasis(holdings, accounts) ?? existingProfile?.taxable_cost_basis ?? null,
    balance_tax_deferred: roundCents(portfolio.byTaxBucket.taxDeferred),
    balance_roth: roundCents(portfolio.byTaxBucket.roth),
    stock_pct: roundPct(portfolio.equityPct),
    bond_pct: roundPct(portfolio.bondPct),
    cash_pct: roundPct(portfolio.cashPct),
    ss_benefit_fra: toNumber(existingProfile?.ss_benefit_fra),
    ss_claim_age: existingProfile?.ss_claim_age ?? null,
    spouse_ss_benefit_fra: existingProfile?.spouse_ss_benefit_fra ?? null,
    spouse_ss_claim_age: existingProfile?.spouse_ss_claim_age ?? null,
    pension_amount: existingProfile?.pension_amount ?? null,
    pension_start_age: existingProfile?.pension_start_age ?? null,
    pension_has_cola: existingProfile?.pension_has_cola ?? false,
    pension_survivor_pct: existingProfile?.pension_survivor_pct ?? null,
    spending_essential_monthly: financialPicture.monthlyEssential,
    spending_discretionary_monthly: financialPicture.monthlyDiscretionary,
    inflation_assumption: existingProfile?.inflation_assumption ?? FINANCIAL_PROFILE_DEFAULTS.inflation_assumption,
    target_retirement_age: existingProfile?.target_retirement_age ?? null,
    planning_horizon_age: existingProfile?.planning_horizon_age ?? FINANCIAL_PROFILE_DEFAULTS.planning_horizon_age,
    updated_at: now.toISOString(),
  };
}

export function buildConnectedAnswers(params: {
  profile: ExistingProfile;
  financialPicture: ReturnType<typeof buildFinancialPicture>;
  portfolio: ReturnType<typeof buildPortfolioAnalysis>;
  quizAnswers?: QuizAnswers;
  now?: Date;
}): Answers {
  const { profile, financialPicture, portfolio, quizAnswers, now = new Date() } = params;
  const age = ageFromBirthdate(profile?.birthdate, now) ?? quizAnswers?.age ?? 65;
  const guaranteedIncome = financialPicture.guaranteedIncome > 0 ? financialPicture.guaranteedIncome : fallbackGuaranteedIncome(profile);
  return {
    age,
    status: age >= 67 ? "retired" : age >= 55 ? "near" : "working",
    guaranteedIncome,
    essentialExpenses: financialPicture.monthlyEssential,
    savings: roundCents(portfolio.totalValue + financialPicture.cashOnHand),
    ssaBenefitEstimate: toNumber(profile?.ss_benefit_fra) || undefined,
    stockPct: snapStockPct(roundPct(portfolio.equityPct)),
    emergencyFund: emergencyFundBucket(financialPicture.cushionMonths),
    debt: quizAnswers?.debt ?? "none",
    worry: quizAnswers?.worry ?? "running_out",
    state: profile?.state ?? undefined,
  };
}

async function must<T>(result: { data: T; error: { message?: string } | null }): Promise<T> {
  if (result.error) throw new Error(result.error.message ?? "Supabase query failed");
  return result.data;
}

export async function updateProfileFromConnectedWithClient(service: ReturnType<typeof createServiceClient>, userId: string) {
  const [transactions, accounts, holdings, securities, existingProfile, latestScore] = await Promise.all([
    must(service.from("transactions").select("*").eq("user_id", userId)),
    must(service.from("financial_accounts").select("*").eq("user_id", userId)),
    must(service.from("holdings").select("*").eq("user_id", userId)),
    must(service.from("securities").select("*")),
    must(service.from("profiles").select("*").eq("user_id", userId).maybeSingle()),
    must(service.from("scores").select("answers").eq("user_id", userId).eq("score_source", "quiz").order("created_at", { ascending: false }).limit(1).maybeSingle()),
  ]);

  const financialPicture = buildFinancialPicture(transactions as SpendingTransaction[], accounts as SpendingAccount[]);
  const portfolio = buildPortfolioAnalysis(holdings as HoldingWithBasis[], securities as SecurityRow[], accounts as FinancialAccountRow[]);
  const profile = buildConnectedProfileUpdate({ userId, existingProfile: existingProfile as ExistingProfile, financialPicture, portfolio, holdings: holdings as HoldingWithBasis[], accounts: accounts as FinancialAccountRow[] });

  await must(service.from("profiles").upsert(profile, { onConflict: "user_id" }).select("user_id").single());

  const answers = buildConnectedAnswers({ profile, financialPicture, portfolio, quizAnswers: (latestScore as { answers?: QuizAnswers } | null)?.answers ?? null });
  const result = computeScores(answers);
  await must(service.from("scores").insert({ user_id: userId, overall: result.overall, sub_scores: result.sub, band: result.band, answers, score_source: "connected" }).select("id").single());

  return { profile, answers, result };
}

export async function updateProfileFromConnected(userId: string) {
  return updateProfileFromConnectedWithClient(createServiceClient(), userId);
}
