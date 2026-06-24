import { NextResponse } from "next/server";
import type { User } from "@supabase/supabase-js";
import { computeScores, type Answers } from "@/lib/scoring";
import { createServiceClient } from "@/lib/supabase/server";
import { sendRetirementWatchEmail } from "@/lib/email";
import { getMatchedAlerts } from "@/lib/alerts";

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
  const { error: insertError } = await supabase.from("scores").insert({
    user_id: user.id,
    overall: result.overall,
    sub_scores: result.sub,
    band: result.band,
    answers: row.answers,
    score_source: "monthly_rescore",
  });

  if (insertError) return { userId: user.id, inserted: false, error: insertError.message };

  if (user.email) {
    const alerts = await getMatchedAlerts(supabase, answers, 5);
    await sendRetirementWatchEmail(user.email, {
      previousOverall: row.overall,
      nextOverall: result.overall,
      band: result.band,
      alertCount: alerts.length,
      topAlertTitle: alerts[0]?.title ?? null,
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
