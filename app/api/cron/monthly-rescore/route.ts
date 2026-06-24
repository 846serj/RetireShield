import { NextResponse } from "next/server";
import type { User } from "@supabase/supabase-js";
import { computeScores, type Answers } from "@/lib/scoring";
import { createServiceClient } from "@/lib/supabase/server";
import { sendRetirementWatchEmail, sendTrustedContactFraudEmail } from "@/lib/email";
import { getMatchedAlerts } from "@/lib/alerts";
import { buildFinancialPicture, type SpendingAccount, type SpendingTransaction } from "@/lib/engine/spending";
import { buildPortfolioAnalysis, type FinancialAccountRow, type HoldingRow, type SecurityRow } from "@/lib/engine/portfolio";
import { detectFraudFlags } from "@/lib/engine/fraud";

type LatestScoreRow = {
  id: string;
  user_id: string;
  answers: Answers | null;
  overall: number | null;
  created_at: string | null;
};

type RescoreResult = {
  userId: string;
  inserted: boolean;
  previousOverall?: number | null;
  nextOverall?: number;
  error?: string;
};

const PAGE_SIZE = 100;

function isAuthorized(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return process.env.NODE_ENV !== "production";
  const header = req.headers.get("authorization") ?? "";
  return header === `Bearer ${secret}`;
}

async function listAllUsers(supabase: ReturnType<typeof createServiceClient>) {
  const users: User[] = [];
  for (let page = 1; ; page += 1) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: PAGE_SIZE });
    if (error) throw error;
    users.push(...(data.users ?? []));
    if (!data.users || data.users.length < PAGE_SIZE) break;
  }
  return users;
}

async function rescoreUser(supabase: ReturnType<typeof createServiceClient>, user: User): Promise<RescoreResult> {
  const { data: latest, error } = await supabase
    .from("scores")
    .select("id, user_id, answers, overall, created_at")
    .eq("user_id", user.id)
    .not("answers", "is", null)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) return { userId: user.id, inserted: false, error: error.message };
  if (!latest?.answers) return { userId: user.id, inserted: false, error: "No saved answers" };

  const row = latest as LatestScoreRow;
  const answers = row.answers as Answers;
  const result = computeScores(answers);
  const [transactionsResult, accountsResult, holdingsResult, securitiesResult, historyResult, trustedContactsResult] = await Promise.all([
    supabase.from("transactions").select("*").eq("user_id", user.id),
    supabase.from("financial_accounts").select("*").eq("user_id", user.id),
    supabase.from("holdings").select("*").eq("user_id", user.id),
    supabase.from("securities").select("*"),
    supabase.from("scores").select("answers, created_at").eq("user_id", user.id).not("answers", "is", null).order("created_at", { ascending: true }),
    supabase.from("trusted_contacts").select("name,email,consent_at").eq("user_id", user.id).not("consent_at", "is", null),
  ]);
  const hasConnectedAccounts = (accountsResult.data?.length ?? 0) > 0 || (transactionsResult.data?.length ?? 0) > 0;
  const connectedContext = hasConnectedAccounts && transactionsResult.data && accountsResult.data
    ? {
        transactions: transactionsResult.data as SpendingTransaction[],
        accounts: accountsResult.data as SpendingAccount[],
        financialPicture: buildFinancialPicture(transactionsResult.data as SpendingTransaction[], accountsResult.data as SpendingAccount[]),
        portfolioAnalysis: buildPortfolioAnalysis((holdingsResult.data ?? []) as HoldingRow[], (securitiesResult.data ?? []) as SecurityRow[], accountsResult.data as FinancialAccountRow[]),
        scoreHistory: (historyResult.data ?? []) as { answers?: { savings?: number | string | null } | null; created_at?: string | null }[],
      }
    : undefined;
  const alerts = await getMatchedAlerts(supabase, answers, 5, connectedContext);
  const { error: insertError } = await supabase.from("scores").insert({
    user_id: user.id,
    overall: result.overall,
    sub_scores: result.sub,
    band: result.band,
    answers: row.answers,
    score_source: "monthly_rescore",
    matched_alerts: alerts,
  });

  if (insertError) return { userId: user.id, inserted: false, error: insertError.message };

  const highRiskFlags = detectFraudFlags((transactionsResult.data ?? []) as SpendingTransaction[], { accounts: (accountsResult.data ?? []) as SpendingAccount[] }).filter((flag) => flag.riskScore >= 80);
  const trustedContacts = (trustedContactsResult.data ?? []) as { email?: string | null; consent_at?: string | null }[];
  if (highRiskFlags.length > 0) {
    await Promise.all(trustedContacts.filter((contact) => contact.email && contact.consent_at).map((contact) => sendTrustedContactFraudEmail(contact.email!, {
      memberEmail: user.email,
      flagCount: highRiskFlags.length,
      topReason: highRiskFlags[0].reason,
      topAdvice: highRiskFlags[0].advice,
    })));
  }

  if (user.email) {
    await sendRetirementWatchEmail(user.email, {
      previousOverall: row.overall,
      nextOverall: result.overall,
      band: result.band,
      alertCount: alerts.length,
      topAlertTitle: alerts[0]?.title ?? null,
      alerts: alerts.slice(0, 3).map((alert) => ({ title: alert.title, action: alert.action_line })),
    });
  }

  return { userId: user.id, inserted: true, previousOverall: row.overall, nextOverall: result.overall };
}

export async function POST(req: Request) {
  if (!isAuthorized(req)) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) return NextResponse.json({ ok: false, error: "missing service role" }, { status: 500 });

  const supabase = createServiceClient();
  const users = await listAllUsers(supabase);
  const results: RescoreResult[] = [];

  for (const user of users) {
    results.push(await rescoreUser(supabase, user));
  }

  const inserted = results.filter((result) => result.inserted).length;
  return NextResponse.json({ ok: true, users: users.length, inserted, skipped: results.length - inserted, results });
}

export async function GET(req: Request) {
  return POST(req);
}
