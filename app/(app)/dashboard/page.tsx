import type { Metadata } from "next";
import Link from "next/link";
import { getSubscriptionAccess } from "@/lib/subscription";
import ScoreHydrator from "@/components/ScoreHydrator";
import { ScoreGauge } from "@/components/ScoreGauge";
import { Button, Eyebrow } from "@/components/ui";
import { getLatestScore, formatCheckedDate, requireUser, SUB_SCORE_LABELS, syncCheckoutSession } from "./_lib/dashboard";

type DashboardProps = { searchParams?: { session_id?: string; welcome?: string } };

export const metadata: Metadata = {
  title: "Retirement Dashboard",
  description: "Review your Retirement Safety Score, monitoring status, action plan, matched alerts, and account subscription.",
};

export default async function Dashboard({ searchParams }: DashboardProps) {
  const { supabase, user } = await requireUser("/dashboard");
  const latest = await getLatestScore(supabase, user.id);
  const sessionAccess = searchParams?.session_id ? await syncCheckoutSession(searchParams.session_id, user.id) : false;
  const subscriptionAccess = await getSubscriptionAccess(user.id);
  const paid = sessionAccess || subscriptionAccess.active;
  const scoreSubScores = latest?.sub_scores ? (Object.entries(SUB_SCORE_LABELS) as [keyof typeof SUB_SCORE_LABELS, string][]).map(([key, label]) => ({ label, value: Number(latest.sub_scores[key] ?? 0), scoreKey: key })) : [];
  const checkedDate = formatCheckedDate(latest?.created_at);

  return (
    <div className="mx-auto max-w-6xl py-8 sm:py-10">
      <ScoreHydrator hasScore={!!latest} />
      {searchParams?.welcome ? (
        <div className="mb-6 rounded-3xl border border-emerald-200 bg-emerald-50 p-5 shadow-sm">
          <p className="rg-kicker text-emerald-700">Trial started</p>
          <h2 className="mt-1 text-2xl font-extrabold">Welcome to your full RetireShield dashboard.</h2>
          <p className="mt-2 text-slate-700">Your planning tools, action items, alerts, and coach are available from the sidebar.</p>
        </div>
      ) : null}
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <Eyebrow>Member workspace</Eyebrow>
          <h1 className="mb-2 mt-3 text-4xl font-bold sm:text-5xl">Your retirement dashboard</h1>
          <p className="text-slate-600">Choose a focused workspace from the sidebar.</p>
        </div>
        {paid ? <Button href="/api/portal" variant="secondary" className="text-base">Manage subscription</Button> : <Button href="/upgrade" variant="secondary">Unlock paid sections</Button>}
      </div>

      <section className="mb-8 grid gap-6 lg:grid-cols-[minmax(0,1.05fr)_minmax(320px,0.95fr)] lg:items-stretch">
        {latest ? <ScoreGauge value={latest.overall} band={latest.band} subScores={scoreSubScores} badge="Latest check-in" subtitle="Based on your latest saved score" /> : (
          <div className="rg-card flex min-h-[28rem] flex-col items-center justify-center text-center">
            <p className="rg-kicker">Safety Score</p><h2 className="mt-3 text-3xl font-extrabold">Take your first check-in</h2>
            <p className="mt-3 max-w-md text-slate-700">Answer a short quiz to create your Retirement Safety Score and unlock personalized monitoring.</p><Button href="/quiz" className="mt-6">Take the Score quiz</Button>
          </div>
        )}
        <div className="rg-card-highlight flex flex-col justify-between">
          <div><p className="rg-kicker">Home</p><h2 className="mt-2 text-3xl font-extrabold">A calm home base for your retirement plan.</h2><p className="mt-4 text-lg text-slate-700">Last checked: <span className="font-bold text-ink">{checkedDate}</span>. We re-check monthly.</p><p className="mt-3 text-slate-700">Each dashboard feature now has its own focused route.</p></div>
          <div className="mt-6 grid gap-3 sm:grid-cols-2"><Button href="/dashboard/score">Review score</Button><Button href="/dashboard/monitoring" variant="secondary">View monitoring</Button></div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {[ ["Safety Score", "/dashboard/score"], ["Retirement Watch", "/dashboard/monitoring"], ["AI Coach", "/dashboard/coach"], ["Tools", "/dashboard/tools"], ["Accounts", "/dashboard/accounts"], ["Settings", "/dashboard/settings"] ].map(([title, href]) => <Link key={href} href={href} className="rg-card no-underline transition hover:-translate-y-0.5 hover:border-brand"><h2 className="font-serif text-2xl font-semibold text-ink">{title}</h2><p className="mt-2 text-sm font-semibold text-slate-600">Open {title}</p></Link>)}
      </section>
    </div>
  );
}
