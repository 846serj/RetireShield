import { redirect } from "next/navigation";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { stripe } from "@/lib/stripe";
import { buildActionPlan, type PlanItem } from "@/lib/actionPlan";
import { generateAIActionPlan } from "@/lib/ai/actionPlan";
import type { Answers } from "@/lib/scoring";

export const SUB_SCORE_LABELS = {
  income: "Guaranteed income",
  withdrawal: "Spending sustainability",
  inflation: "Inflation exposure",
  market: "Market-drop cushion",
} as const;

export const TOOL_CARDS = [
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

export function formatRenewDate(value?: string | null) {
  if (!value) return "Not available yet";
  return new Intl.DateTimeFormat("en-US", { month: "long", day: "numeric", year: "numeric" }).format(new Date(value));
}

export function formatCheckedDate(value?: string) {
  if (!value) return "Not checked yet";
  return new Intl.DateTimeFormat("en-US", { month: "long", day: "numeric", year: "numeric" }).format(new Date(value));
}

export function formatMoney(value: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(Number.isFinite(value) ? value : 0);
}

export function formatPercent(value: number) {
  return `${Math.round((Number.isFinite(value) ? value : 0) * 100)}%`;
}

export function formatMonths(value: number) {
  if (value === Infinity) return "∞";
  return Number.isFinite(value) ? value.toFixed(1) : "0.0";
}

export async function requireUser(next = "/dashboard") {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(next)}`);
  return { supabase, user };
}

export async function getLatestScore(supabase: ReturnType<typeof createClient>, userId: string) {
  const { data: latest } = await supabase.from("scores").select("*").eq("user_id", userId).order("created_at", { ascending: false }).limit(1).maybeSingle();
  return latest;
}

export async function syncCheckoutSession(sessionId: string, userId: string) {
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

export async function getPlanForLatest(supabase: ReturnType<typeof createClient>, latest: any): Promise<PlanItem[]> {
  const answers = latest?.answers as Answers | undefined;
  if (!answers || !latest) return [];
  const result = { overall: latest.overall, band: latest.band, sub: latest.sub_scores };
  const ruleBasedPlan = buildActionPlan(answers, result);
  const plan = Array.isArray(latest.ai_plan) && latest.ai_plan.length > 0 ? latest.ai_plan as PlanItem[] : await generateAIActionPlan(answers, result, ruleBasedPlan);
  if (!latest.ai_plan && plan !== ruleBasedPlan) await supabase.from("scores").update({ ai_plan: plan }).eq("id", latest.id);
  return plan;
}

export async function saveTrustedContact(formData: FormData) {
  "use server";
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const consent = formData.get("consent") === "on";
  if (!name || !email) return;
  await supabase.from("trusted_contacts").upsert({ user_id: user.id, name, email, consent_at: consent ? new Date().toISOString() : null, updated_at: new Date().toISOString() }, { onConflict: "user_id,email" });
}
