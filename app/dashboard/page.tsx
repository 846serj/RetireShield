import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { getSubscriptionAccess } from "@/lib/subscription";
import { getScoreHistory } from "@/lib/scoreHistory";
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
import ScoreHistoryChart from "@/components/ScoreHistoryChart";
import { stripe } from "@/lib/stripe";
import { Button, Disclaimer, Eyebrow } from "@/components/ui";


type DashboardProps = {
  searchParams?: { session_id?: string; welcome?: string };
};

export const metadata: Metadata = {
  title: "Retirement Dashboard",
  description: "Review your Retirement Safety Score, monitoring status, action plan, matched alerts, and account subscription.",
};

const SUB_SCORE_LABELS = {
  income: "Guaranteed income",
  withdrawal: "Spending sustainability",
  inflation: "Inflation exposure",
  market: "Market-drop cushion",
} as const;

const TOOL_CARDS = [
  {
    title: "Medicare + IRMAA check",
    href: "/features/medicare-social-security",
    eyebrow: "Coming to Premium",
    description: "Estimate what income thresholds, Medicare premiums, and enrollment windows to review before you make tax or withdrawal decisions.",
    ask: "Ask a fiduciary or tax professional: could this year's income create an IRMAA surprise?",
  },
  {
    title: "Social Security timing guide",
    href: "/features/medicare-social-security",
    eyebrow: "Coming to Premium",
    description: "Compare the education tradeoffs around claiming at 62, full retirement age, or 70 using your RetireShield profile.",
    ask: "Ask a fiduciary: how do health, survivor benefits, and guaranteed income needs affect my claiming window?",
  },
] as const;

function formatRenewDate(value?: string | null) {
  if (!value) return "Not available yet";
  return new Intl.DateTimeFormat("en-US", { month: "long", day: "numeric", year: "numeric" }).format(new Date(value));
}

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
  const subscriptionAccess = await getSubscriptionAccess(user.id);
  const paid = sessionAccess || subscriptionAccess.active;
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
  const scoreHistory = paid ? await getScoreHistory(supabase, user.id) : [];

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

      <section className="mb-8" aria-labelledby="premium-tools-heading">
        <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="rg-kicker">Tools ⚙️ Premium</p>
            <h2 id="premium-tools-heading" className="mt-2 text-3xl font-extrabold">Medicare/IRMAA + Social Security mini-tools</h2>
            <p className="mt-3 max-w-3xl text-slate-700">Simple guided calculators are scoped for v2 and will reuse the RetireShield engine. For now, these cards show what Premium members will be able to review and what to ask a fiduciary.</p>
          </div>
          {!paid ? <Button href="/upgrade" variant="secondary">Start your free trial</Button> : null}
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          {TOOL_CARDS.map((tool) => (
            <Link key={tool.title} href={tool.href} className="rg-card no-underline transition hover:-translate-y-0.5 hover:border-brand">
              <p className="rg-kicker text-brand">{tool.eyebrow}</p>
              <h3 className="mt-3 font-serif text-2xl font-semibold text-ink">{tool.title}</h3>
              <p className="mt-3 text-slate-700">{tool.description}</p>
              <p className="mt-4 rounded-2xl bg-band p-4 text-sm font-semibold text-slate-700">{tool.ask}</p>
            </Link>
          ))}
        </div>
      </section>

      {!paid ? (
        <div className="space-y-6">
          <LockedTeaser
            eyebrow="Score over time"
            title="Unlock your score trend"
            description="Premium members see a month-by-month chart built from their saved score history."
          >
            <ScoreHistoryChart points={[]} />
          </LockedTeaser>
          <LockedTeaser
            eyebrow="Action plan"
            title="Unlock your full action plan"
            description="See every step and check them off as you go. Start your free trial."
          >
            <div className="space-y-4">
              {(plan.length > 0 ? plan : [
                { priority: "High" as const, area: "Income", title: "Review income coverage", why: "See which gaps matter first.", steps: ["Compare guaranteed income with essentials.", "Prepare questions for a fiduciary review."] },
                { priority: "Medium" as const, area: "Healthcare", title: "Preview Medicare questions", why: "Healthcare costs can change your retirement budget.", steps: ["List Medicare dates.", "Ask about IRMAA."] },
              ]).map((p, i) => (
                <div key={i} className={`rounded-2xl border border-slate-200 bg-slate-50 p-4 text-left ${i > 0 ? "opacity-70 blur-[1px]" : ""}`}>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full border border-red-200 bg-red-50 px-3 py-1 text-xs font-extrabold uppercase tracking-[0.14em] text-bad">{p.priority} priority</span>
                    <span className="rounded-full bg-brand/10 px-3 py-1 text-xs font-extrabold uppercase tracking-[0.14em] text-brand">{p.area}</span>
                  </div>
                  <h3 className="mt-3 font-serif text-xl font-semibold">{p.title}</h3>
                  <p className="mt-1 text-slate-600">{p.why}</p>
                  <ul className="mt-3 space-y-2 text-sm text-slate-700">{p.steps.slice(0, 2).map((step) => <li key={step}>☐ {step}</li>)}</ul>
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
            <Link href="/coach" className="rg-card no-underline transition hover:-translate-y-0.5 hover:border-emerald-400">
              <p className="rg-kicker text-emerald-700">AI coach</p>
              <h2 className="mt-2 text-xl font-extrabold">Ask what to do next</h2>
              <p className="mt-2 text-sm text-slate-700">Get education-only help interpreting the tools and next steps.</p>
            </Link>
          </section>

          <ScoreHistoryChart points={scoreHistory} />

          <PlanList items={plan} />

          <div id="coach"><CoachChat tier={subscriptionAccess.tier} /></div>

          <AlertFeed alerts={alerts} />
        </>
      )}
      <section className="rg-card mt-8" aria-labelledby="account-heading">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="rg-kicker">Account / subscription</p>
            <h2 id="account-heading" className="mt-2 text-3xl font-extrabold">{paid ? `${subscriptionAccess.tier.charAt(0).toUpperCase()}${subscriptionAccess.tier.slice(1)} plan` : "Free plan"}</h2>
            <p className="mt-2 text-slate-700">Renew date: <span className="font-bold text-ink">{paid ? formatRenewDate(subscriptionAccess.currentPeriodEnd) : "Upgrade to start a trial"}</span></p>
          </div>
          {paid ? <Button href="/api/portal" variant="secondary">Manage subscription</Button> : <Button href="/upgrade">Start your free trial</Button>}
        </div>
        <p className="mt-5 border-t border-slate-100 pt-4 text-sm text-slate-500">RetireShield is education-only and does not provide financial, tax, legal, or investment advice.</p>
      </section>

      <Disclaimer className="mt-8" />
    </div>
    </div>
  );
}
