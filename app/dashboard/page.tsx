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
import { stripe } from "@/lib/stripe";

const PRIORITY_STYLE: Record<string, string> = {
  High: "bg-red-100 text-bad", Medium: "bg-amber-100 text-warn", Low: "bg-slate-100 text-slate-600",
};

type DashboardProps = {
  searchParams?: { session_id?: string; welcome?: string };
};

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

  return (
    <div className="mx-auto max-w-5xl px-4 py-12">
      <ScoreHydrator hasScore={!!latest} />
      {searchParams?.welcome ? (
        <div className="mb-6 rounded-2xl border-2 border-emerald-200 bg-emerald-50 p-5">
          <p className="text-sm font-bold uppercase tracking-wide text-emerald-700">Trial started</p>
          <h2 className="mt-1 text-2xl font-extrabold">Welcome to your full RetireShield dashboard.</h2>
          <p className="mt-2 text-slate-700">Your planning tools, action items, alerts, and coach are available below.</p>
        </div>
      ) : null}
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold mb-1">Your retirement dashboard</h1>
          <p className="text-slate-600">{user.email}</p>
        </div>
        {paid ? <Link href="/api/portal" className="text-brand underline">Manage subscription</Link> : null}
      </div>

      <section className="rounded-2xl border-2 border-slate-200 p-6 mb-6">
        <h2 className="text-xl font-bold mb-2">Retirement Safety Score</h2>
        {latest ? (
          <div className="text-5xl font-extrabold">
            {latest.overall} <span className="text-lg font-semibold text-slate-500">{latest.band}</span>
          </div>
        ) : (
          <Link href="/quiz" className="text-brand underline">Take the Score quiz →</Link>
        )}
      </section>

      {!paid ? (
        <section className="rounded-2xl border-2 border-brand bg-blue-50 p-6 text-center">
          <h2 className="text-xl font-bold mb-2">Unlock your action plan + alerts</h2>
          <p className="text-slate-600 mb-4">
            Get your personalized, prioritized plan and ongoing alerts matched to your state, age, and worries.
          </p>
          <Link href="/upgrade" className="inline-block rounded-xl bg-brand px-6 py-3 font-bold text-white">
            Start 3-day free trial
          </Link>
        </section>
      ) : (
        <>
          <section className="mb-8 grid gap-4 md:grid-cols-3">
            <Link href="/plan/setup" className="rounded-2xl border-2 border-blue-100 bg-blue-50 p-5 hover:border-brand">
              <p className="text-sm font-bold uppercase tracking-wide text-brand">Planning lab</p>
              <h2 className="mt-2 text-xl font-extrabold">Build your retirement plan</h2>
              <p className="mt-2 text-sm text-slate-700">Run projections, Monte Carlo, Roth conversion, Social Security, and withdrawal guardrail tools.</p>
            </Link>
            <Link href="/quiz" className="rounded-2xl border-2 border-slate-200 p-5 hover:border-brand">
              <p className="text-sm font-bold uppercase tracking-wide text-slate-500">Risk score</p>
              <h2 className="mt-2 text-xl font-extrabold">Update your Safety Score</h2>
              <p className="mt-2 text-sm text-slate-700">Refresh your profile so your plan and alerts stay personalized.</p>
            </Link>
            <a href="#coach" className="rounded-2xl border-2 border-emerald-100 bg-emerald-50 p-5 hover:border-emerald-400">
              <p className="text-sm font-bold uppercase tracking-wide text-emerald-700">AI coach</p>
              <h2 className="mt-2 text-xl font-extrabold">Ask what to do next</h2>
              <p className="mt-2 text-sm text-slate-700">Get education-only help interpreting the tools and next steps.</p>
            </a>
          </section>

          {plan.length > 0 ? (
            <section className="mb-8">
              <h2 className="text-2xl font-bold mb-4">Your action plan</h2>
              <div className="space-y-4">
                {plan.map((p, i) => (
                  <div key={i} className="rounded-2xl border-2 border-slate-200 p-5">
                    <div className="flex items-center gap-3 mb-1">
                      <span className={`text-xs font-bold px-2 py-1 rounded ${PRIORITY_STYLE[p.priority]}`}>{p.priority}</span>
                      <span className="text-xs uppercase tracking-wide text-slate-400">{p.area}</span>
                    </div>
                    <h3 className="text-lg font-bold">{p.title}</h3>
                    <p className="text-slate-600 mt-1">{p.why}</p>
                    <ul className="mt-3 space-y-1 list-disc list-inside text-slate-700">
                      {p.steps.map((s, j) => <li key={j}>{s}</li>)}
                    </ul>
                  </div>
                ))}
              </div>
            </section>
          ) : (
            <section className="mb-8 rounded-2xl border-2 border-slate-200 p-6">
              <h2 className="text-2xl font-bold">Create your personalized action plan</h2>
              <p className="mt-2 text-slate-600">Take the quick Safety Score quiz so RetireShield can prioritize your first actions.</p>
              <Link href="/quiz" className="mt-4 inline-block rounded-xl bg-brand px-5 py-3 font-bold text-white">Take the quiz</Link>
            </section>
          )}

          <div id="coach"><CoachChat /></div>

          <section className="mb-8">
            <h2 className="text-2xl font-bold mb-4">Alerts for you</h2>
            <div className="space-y-3">
              {alerts.length === 0 && <p className="text-slate-500">No alerts match your profile yet — check back soon.</p>}
              {alerts.map((al) => (
                <div key={al.id} className="rounded-xl border-2 border-slate-200 p-4">
                  <div className="text-xs uppercase tracking-wide text-brand font-semibold">{al.category}</div>
                  <h3 className="font-bold">{al.title}</h3>
                  <p className="text-slate-600 text-sm mt-1">{al.body}</p>
                </div>
              ))}
            </div>
          </section>
        </>
      )}
    </div>
  );
}
