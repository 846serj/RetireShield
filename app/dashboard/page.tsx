import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { hasPaidAccess } from "@/lib/subscription";
import { buildActionPlan, type PlanItem } from "@/lib/actionPlan";
import { generateAIActionPlan } from "@/lib/ai/actionPlan";
import CoachChat from "@/components/CoachChat";
import { getMatchedAlerts } from "@/lib/alerts";
import type { Answers } from "@/lib/scoring";
import ScoreHydrator from "@/components/ScoreHydrator";
import { ScoreGauge } from "@/components/ScoreGauge";
import LockedTeaser from "@/components/LockedTeaser";
import PlanList from "@/components/PlanList";
import AlertFeed from "@/components/AlertFeed";
import { stripe } from "@/lib/stripe";
import { Button, Disclaimer, Eyebrow } from "@/components/ui";


type DashboardProps = {
  searchParams?: { session_id?: string; welcome?: string };
};

const SUB_SCORE_LABELS = {
  income: "Guaranteed income",
  withdrawal: "Spending sustainability",
  inflation: "Inflation exposure",
  market: "Market-drop cushion",
} as const;

function formatCheckedDate(value?: string) {
  if (!value) return "Not checked yet";
  return new Intl.DateTimeFormat("en-US", { month: "long", day: "numeric", year: "numeric" }).format(new Date(value));
}

async function syncCheckoutSession(sessionId: string, userId: string) {
  if (!process.env.STRIPE_SECRET_KEY || !process.env.SUPABASE_SERVICE_ROLE_KEY) return false;

  try {
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    if (session.client_reference_id !== userId || typeof session.subscription !== "string") return false;

    const subscription = await stripe.subscriptions.retrieve(session.subscription);
    await createServiceClient().from("subscriptions").upsert({
      user_id: userId,
      stripe_customer_id: typeof subscription.customer === "string" ? subscription.customer : subscription.customer.id,
      stripe_subscription_id: subscription.id,
      status: subscription.status,
      plan: subscription.metadata?.plan ?? null,
      trial_end: subscription.trial_end ? new Date(subscription.trial_end * 1000).toISOString() : null,
      current_period_end: subscription.current_period_end ? new Date(subscription.current_period_end * 1000).toISOString() : null,
      updated_at: new Date().toISOString(),
    });

    return ["trialing", "active"].includes(subscription.status);
  } catch (error) {
    console.error("dashboard checkout sync failed:", error);
    return false;
  }
}

export default async function Dashboard({ searchParams }: DashboardProps) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: latest } = await supabase
    .from("scores").select("*").eq("user_id", user.id)
    .order("created_at", { ascending: false }).limit(1).maybeSingle();

  const sessionAccess = searchParams?.session_id ? await syncCheckoutSession(searchParams.session_id, user.id) : false;
  const paid = sessionAccess || await hasPaidAccess(user.id);
  const answers = latest?.answers as Answers | undefined;

  let plan: PlanItem[] = [];
  if (answers && latest) {
    const result = { overall: latest.overall, band: latest.band, sub: latest.sub_scores };
    const ruleBasedPlan = buildActionPlan(answers, result);
    plan = Array.isArray(latest.ai_plan) && latest.ai_plan.length > 0
      ? latest.ai_plan as PlanItem[]
      : await generateAIActionPlan(answers, result, ruleBasedPlan);

    if (!latest.ai_plan && plan !== ruleBasedPlan) {
      await supabase.from("scores").update({ ai_plan: plan }).eq("id", latest.id);
    }
  }
  const alerts = paid && answers
    ? await getMatchedAlerts(supabase, { state: answers.state, age: answers.age, worry: answers.worry })
    : [];
  const scoreSubScores = latest?.sub_scores
    ? (Object.entries(SUB_SCORE_LABELS) as [keyof typeof SUB_SCORE_LABELS, string][]).map(([key, label]) => ({
        label,
        value: Number(latest.sub_scores[key] ?? 0),
        scoreKey: key,
      }))
    : [];
  const checkedDate = formatCheckedDate(latest?.created_at);

  return (
    <div className="rg-page-shell">
    <div className="mx-auto max-w-6xl px-4 py-12 sm:py-16">
      <ScoreHydrator hasScore={!!latest} />
      {searchParams?.welcome ? (
        <div className="mb-6 rounded-3xl border border-emerald-200 bg-emerald-50 p-5 shadow-sm">
          <p className="rg-kicker text-emerald-700">Trial started</p>
          <h2 className="mt-1 text-2xl font-extrabold">Welcome to your full RetireShield dashboard.</h2>
          <p className="mt-2 text-slate-700">Your planning tools, action items, alerts, and coach are available below.</p>
        </div>
      ) : null}
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <Eyebrow>Member workspace</Eyebrow>
          <h1 className="mb-2 mt-3 text-4xl font-bold sm:text-5xl">Your retirement dashboard</h1>
          <p className="text-slate-600">{user.email}</p>
        </div>
        {paid ? <Button href="/api/portal" variant="secondary" className="text-base">Manage subscription</Button> : null}
      </div>

      <section className="mb-8 grid gap-6 lg:grid-cols-[minmax(0,1.05fr)_minmax(320px,0.95fr)] lg:items-stretch">
        {latest ? (
          <ScoreGauge
            value={latest.overall}
            band={latest.band}
            subScores={scoreSubScores}
            badge="First check-in"
            subtitle="Your current retirement readiness snapshot"
          />
        ) : (
          <div className="rg-card flex min-h-[28rem] flex-col items-center justify-center text-center">
            <p className="rg-kicker">Safety Score</p>
            <h2 className="mt-3 text-3xl font-extrabold">Take your first check-in</h2>
            <p className="mt-3 max-w-md text-slate-700">Answer a short quiz to create your Retirement Safety Score and unlock personalized monitoring.</p>
            <Button href="/quiz" className="mt-6">Take the Score quiz</Button>
          </div>
        )}
        <div className="rg-card-highlight flex flex-col justify-between">
          <div>
            <p className="rg-kicker">Monthly monitoring</p>
            <h2 className="mt-2 text-3xl font-extrabold">A calm home base for your retirement plan.</h2>
            <p className="mt-4 text-lg text-slate-700">
              Last checked: <span className="font-bold text-ink">{checkedDate}</span>. We re-check monthly.
            </p>
            <p className="mt-3 text-slate-700">
              Keep your score, action plan, alerts, and education-only coach in one place so you always know what to review next.
            </p>
          </div>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row lg:flex-col">
            <Button href="/quiz">Retake the quiz</Button>
            {!paid ? <Button href="/upgrade" variant="secondary">Unlock paid sections</Button> : null}
          </div>
        </div>
      </section>

      {!paid ? (
        <div className="space-y-6">
          <LockedTeaser
            eyebrow="Action plan"
            title="Unlock your prioritized next steps"
            description="Paid members see the personalized plan built from their score, answers, and RetireShield rules."
          >
            <div className="space-y-4">
              {(plan.length > 0 ? plan.slice(0, 1) : [
                { priority: "High" as const, area: "Income", title: "Review income coverage", why: "See which gaps matter first.", steps: ["Compare guaranteed income with essentials.", "Prepare questions for a fiduciary review."] },
              ]).map((p, i) => (
                <div key={i} className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-left">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full border border-red-200 bg-red-50 px-3 py-1 text-xs font-extrabold uppercase tracking-[0.14em] text-bad">{p.priority} priority</span>
                    <span className="rounded-full bg-brand/10 px-3 py-1 text-xs font-extrabold uppercase tracking-[0.14em] text-brand">{p.area}</span>
                  </div>
                  <h3 className="mt-3 font-serif text-xl font-semibold">{p.title}</h3>
                  <p className="mt-1 text-slate-600">{p.why}</p>
                </div>
              ))}
            </div>
          </LockedTeaser>
          <LockedTeaser
            eyebrow="Alerts + coach"
            title="Unlock matched alerts and the AI coach"
            description="Get alerts matched to your state, age, and worries, plus education-only help deciding what to review next."
          >
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-left">
              <div className="flex items-center justify-between gap-3">
                <p className="rounded-full bg-accent/10 px-3 py-1 text-xs font-extrabold uppercase tracking-[0.14em] text-accent">Benefit</p>
                <p className="text-sm font-semibold text-slate-500">Jun 24, 2026</p>
              </div>
              <h3 className="mt-3 font-serif text-xl font-semibold">Sample retirement alert</h3>
              <p className="mt-1 text-sm text-slate-600">Matched alerts appear here when they fit your profile.</p>
              <p className="mt-3 rounded-xl bg-white p-3 text-xs font-semibold text-slate-600">What to ask: Does this change anything I should review?</p>
            </div>
          </LockedTeaser>
        </div>
      ) : (
        <>
          <section className="mb-8 grid gap-4 md:grid-cols-3">
            <Link href="/plan/setup" className="rg-card-highlight no-underline transition hover:-translate-y-0.5 hover:border-brand">
              <p className="rg-kicker">Planning lab</p>
              <h2 className="mt-2 text-xl font-extrabold">Build your retirement plan</h2>
              <p className="mt-2 text-sm text-slate-700">Run projections, Monte Carlo, Roth conversion, Social Security, and withdrawal guardrail tools.</p>
            </Link>
            <Link href="/quiz" className="rg-card no-underline transition hover:-translate-y-0.5 hover:border-brand">
              <p className="rg-kicker text-slate-500">Risk score</p>
              <h2 className="mt-2 text-xl font-extrabold">Update your Safety Score</h2>
              <p className="mt-2 text-sm text-slate-700">Refresh your profile so your plan and alerts stay personalized.</p>
            </Link>
            <a href="#coach" className="rg-card no-underline transition hover:-translate-y-0.5 hover:border-emerald-400">
              <p className="rg-kicker text-emerald-700">AI coach</p>
              <h2 className="mt-2 text-xl font-extrabold">Ask what to do next</h2>
              <p className="mt-2 text-sm text-slate-700">Get education-only help interpreting the tools and next steps.</p>
            </a>
          </section>

          <PlanList items={plan} />

          <div id="coach"><CoachChat /></div>

          <AlertFeed alerts={alerts} />
        </>
      )}
      <Disclaimer className="mt-8" />
    </div>
    </div>
  );
}
