import type { Metadata } from "next";
import Link from "next/link";
import { getSubscriptionAccess } from "@/lib/subscription";
import { getMatchedAlerts, type Alert } from "@/lib/alerts";
import { buildActionPlan } from "@/lib/actionPlan";
import type { Answers } from "@/lib/scoring";
import LockedTeaser from "@/components/LockedTeaser";
import ScoreHydrator from "@/components/ScoreHydrator";
import { ScoreGauge } from "@/components/ScoreGauge";
import { Button, Eyebrow } from "@/components/ui";
import { formatCheckedDate, getLatestScore, requireUser, SUB_SCORE_LABELS, syncCheckoutSession } from "./_lib/dashboard";

const PRIORITY_RANK = { High: 0, Medium: 1, Low: 2 } as const;

type DashboardProps = { searchParams?: { session_id?: string; welcome?: string } };

type ScoreRow = {
  id: string;
  overall: number;
  band: string;
  sub_scores?: Record<string, number> | null;
  answers?: Answers | null;
  created_at: string;
  score_source?: string | null;
};

export const metadata: Metadata = {
  title: "Retirement Dashboard",
  description: "A light summary of your Retirement Safety Score, latest changes, top alerts, and next action.",
};

function formatDelta(delta?: number | null) {
  if (delta === null || delta === undefined || !Number.isFinite(delta)) return "No prior score yet";
  if (delta === 0) return "No change";
  return `${delta > 0 ? "▲" : "▼"}${Math.abs(delta)}`;
}

function sourceLabel(source?: string | null) {
  return ["connected", "monthly_rescore"].includes(String(source ?? "")) ? "Connected accounts" : "Score quiz";
}

function sinceLine(latest: ScoreRow | null, priorScore: ScoreRow | null, lastSeenAt?: string | null, newAlertCount = 0) {
  if (!lastSeenAt || !latest || !priorScore) {
    return "Welcome in — this is your calm home base for what changed, what needs attention, and your next best step.";
  }
  const delta = Math.round(Number(latest.overall ?? 0) - Number(priorScore.overall ?? 0));
  const alerts = `${newAlertCount} new ${newAlertCount === 1 ? "alert" : "alerts"}`;
  return `Since ${formatCheckedDate(lastSeenAt)}: your score went ${priorScore.overall} → ${latest.overall} (${formatDelta(delta)}), ${alerts}.`;
}

function firstStep(planItem?: { steps?: string[] }) {
  return planItem?.steps?.[0] ?? "Review your saved score and confirm the inputs still look right.";
}

function actionHref(area?: string) {
  const key = String(area ?? "").toLowerCase();
  if (["fraud safety", "healthcare", "inflation"].some((match) => key.includes(match))) return "/dashboard/monitoring";
  if (["income", "withdrawals", "cash buffer", "risk fit", "debt"].some((match) => key.includes(match))) return "/dashboard/score";
  return "/dashboard/score";
}

function QuickCard({ title, href, status }: { title: string; href: string; status: string }) {
  return (
    <Link href={href} className="rg-card no-underline transition hover:-translate-y-0.5 hover:border-brand">
      <p className="rg-kicker">{title}</p>
      <p className="mt-3 text-sm font-semibold text-slate-600">{status}</p>
    </Link>
  );
}

export default async function Dashboard({ searchParams }: DashboardProps) {
  const { supabase, user } = await requireUser("/dashboard");
  const latest = (await getLatestScore(supabase, user.id)) as ScoreRow | null;
  const sessionAccess = searchParams?.session_id ? await syncCheckoutSession(searchParams.session_id, user.id) : false;
  const subscriptionAccess = await getSubscriptionAccess(user.id);
  const paid = sessionAccess || subscriptionAccess.active;
  const answers = latest?.answers as Answers | undefined;

  const [{ data: profile }, { data: previousScore }] = await Promise.all([
    supabase.from("profiles").select("last_seen_at").eq("user_id", user.id).maybeSingle(),
    supabase.from("scores").select("id,overall,band,created_at,score_source").eq("user_id", user.id).neq("id", latest?.id ?? "").order("created_at", { ascending: false }).limit(1).maybeSingle(),
  ]);
  const lastSeenAt = profile?.last_seen_at as string | null | undefined;
  const { data: scoreAtLastSeen } = lastSeenAt
    ? await supabase.from("scores").select("id,overall,band,created_at,score_source").eq("user_id", user.id).lte("created_at", lastSeenAt).order("created_at", { ascending: false }).limit(1).maybeSingle()
    : { data: null };

  const alerts = answers ? await getMatchedAlerts(supabase, { state: answers.state, age: answers.age, worry: answers.worry }, 12) : [];
  const plan = latest && answers ? buildActionPlan(answers, { overall: latest.overall, band: latest.band as never, sub: latest.sub_scores ?? {} }) : [];
  const newAlertCount = lastSeenAt ? alerts.filter((alert: Alert) => new Date(alert.created_at) > new Date(lastSeenAt)).length : 0;
  const topAlerts = alerts.slice(0, 3);
  const nextAction = [...plan].sort((a, b) => PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority])[0];
  const scoreSubScores = latest?.sub_scores ? (Object.entries(SUB_SCORE_LABELS) as [keyof typeof SUB_SCORE_LABELS, string][]).map(([key, label]) => ({ label, value: Number(latest.sub_scores?.[key] ?? 0), scoreKey: key })) : [];
  const monthDelta = latest && previousScore ? Math.round(Number(latest.overall) - Number(previousScore.overall)) : null;
  const hasConnectedScore = ["connected", "monthly_rescore"].includes(String(latest?.score_source ?? ""));

  await supabase.from("profiles").update({ last_seen_at: new Date().toISOString() }).eq("user_id", user.id);

  return (
    <div className="mx-auto max-w-6xl py-8 sm:py-10">
      <ScoreHydrator hasScore={!!latest} />
      {searchParams?.welcome ? (
        <div className="mb-6 rounded-3xl border border-emerald-200 bg-emerald-50 p-5 shadow-sm">
          <p className="rg-kicker text-emerald-700">Trial started</p>
          <h2 className="mt-1 text-2xl font-extrabold">Welcome to your full RetireShield dashboard.</h2>
          <p className="mt-2 text-slate-700">Your focused score, monitoring, coach, and account pages are available from here.</p>
        </div>
      ) : null}

      <div className="mb-8 max-w-3xl">
        <Eyebrow>Summary home</Eyebrow>
        <h1 className="mb-2 mt-3 text-4xl font-bold sm:text-5xl">Hi — here&apos;s what matters today.</h1>
        <p className="text-lg text-slate-700">{sinceLine(latest, scoreAtLastSeen as ScoreRow | null, lastSeenAt, newAlertCount)}</p>
      </div>

      <section className="mb-8 grid gap-6 lg:grid-cols-[minmax(0,1.05fr)_minmax(320px,0.95fr)] lg:items-stretch">
        {latest ? <ScoreGauge value={latest.overall} band={latest.band as never} subScores={scoreSubScores} delta={formatDelta(monthDelta)} badge={sourceLabel(latest.score_source)} subtitle={`${sourceLabel(latest.score_source)} · Last checked ${formatCheckedDate(latest.created_at)}`} /> : (
          <div className="rg-card flex min-h-[28rem] flex-col items-center justify-center text-center">
            <p className="rg-kicker">Safety Score</p><h2 className="mt-3 text-3xl font-extrabold">Take your first check-in</h2>
            <p className="mt-3 max-w-md text-slate-700">Answer a short quiz to create your Retirement Safety Score and unlock personalized monitoring.</p><Button href="/quiz" className="mt-6">Take the Score quiz</Button>
          </div>
        )}

        <div className="rg-card-highlight">
          <p className="rg-kicker">What needs you now</p>
          <h2 className="mt-2 text-3xl font-extrabold">Top alerts</h2>
          {topAlerts.length > 0 ? <div className="mt-5 space-y-3">{topAlerts.map((alert) => <Link key={alert.id} href="/dashboard/monitoring" className="block rounded-2xl border border-white/70 bg-white/75 p-4 no-underline transition hover:-translate-y-0.5"><p className="font-serif text-xl font-semibold text-ink">{alert.title}</p><p className="mt-2 text-sm font-semibold text-slate-700">{alert.action_line}</p></Link>)}</div> : <p className="mt-5 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 font-semibold text-emerald-800">All clear — we&apos;re watching.</p>}
          <Button href="/dashboard/monitoring" variant="secondary" className="mt-5">Open monitoring</Button>
        </div>
      </section>

      <section className="rg-card mb-8 flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="rg-kicker">Your next step</p>
          <h2 className="mt-2 text-3xl font-extrabold">{nextAction?.title ?? (latest ? "Review your score details" : "Create your first Safety Score")}</h2>
          <p className="mt-3 text-slate-700">{nextAction ? firstStep(nextAction) : latest ? "Open your score page for the full breakdown when you have a minute." : "Start with the quick quiz so RetireShield can personalize your dashboard."}</p>
        </div>
        <Button href={nextAction ? actionHref(nextAction.area) : latest ? "/dashboard/score" : "/quiz"} className="shrink-0">{nextAction ? "Take this step" : latest ? "Review score" : "Start quiz"}</Button>
      </section>

      <section className="mb-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <QuickCard title="Score" href="/dashboard/score" status={latest ? `${latest.overall} ${latest.band} · ${formatDelta(monthDelta)} this month` : "No score yet — take the quiz"} />
        <QuickCard title="Coach" href="/dashboard/coach" status={paid ? "Ready for focused retirement questions" : "Upgrade unlocks saved-score context"} />
        <QuickCard title="Monitoring" href="/dashboard/monitoring" status={topAlerts.length > 0 ? `${topAlerts.length} item${topAlerts.length === 1 ? "" : "s"} need review` : "All clear right now"} />
        <QuickCard title="Accounts" href="/dashboard/accounts" status={hasConnectedScore ? "Connected score is active" : "Connect accounts for automatic updates"} />
      </section>

      {!paid ? <LockedTeaser eyebrow="Premium" title="Want RetireShield to keep watching for you?" description="Upgrade when you're ready for connected-account monitoring, the AI coach, and richer score history — all from the focused sub-pages."><div className="grid gap-4 sm:grid-cols-3"><QuickCard title="Monitoring" href="/dashboard/monitoring" status="Matched alerts" /><QuickCard title="Coach" href="/dashboard/coach" status="Saved-score context" /><QuickCard title="History" href="/dashboard/score" status="Score over time" /></div></LockedTeaser> : null}
    </div>
  );
}
