"use client";

import { Suspense, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Button, Disclaimer, Eyebrow } from "@/components/ui";

type CheckoutPlan = "annual" | "monthly";
type TierKey = "free" | "plus" | "premium" | "concierge";

type Tier = {
  key: TierKey;
  name: string;
  price: string;
  cadence: string;
  description: string;
  bullets: string[];
  cta: string;
  checkoutPlan?: CheckoutPlan;
  recommended?: boolean;
};

const checkoutLabel: Record<CheckoutPlan, string> = {
  annual: "Premium annual",
  monthly: "Plus monthly",
};

const tiers: Tier[] = [
  { key: "free", name: "Free", price: "$0", cadence: "current plan", description: "Keep your Safety Score and a preview of your first action items.", bullets: ["Current score", "First action visible", "Education-first guidance"], cta: "Current plan" },
  { key: "plus", name: "Plus", price: "$19", cadence: "per month", description: "Monthly monitoring, alerts, and guided next steps for one simple price.", bullets: ["Monthly monitoring", "Matched alerts", "Coach allowance"], cta: "Choose Plus", checkoutPlan: "monthly" },
  { key: "premium", name: "Premium", price: "$390", cadence: "per year", description: "The recommended plan for deeper tools, history, and unlimited education support.", bullets: ["3-day free trial", "Medicare/IRMAA tools", "Social Security timing guide"], cta: "Start free trial", checkoutPlan: "annual", recommended: true },
  { key: "concierge", name: "Concierge", price: "From $990", cadence: "per year", description: "Premium plus human checkups for households that want extra organization.", bullets: ["Premium included", "Human checkup", "Family-ready summary"], cta: "Contact us" },
];

// Conspicuous auto-renew terms + explicit consent before Checkout.
function UpgradeContent() {
  const searchParams = useSearchParams();
  const selectedPlan = useMemo<CheckoutPlan>(() => searchParams.get("plan") === "monthly" ? "monthly" : "annual", [searchParams]);
  const [consent, setConsent] = useState(false);
  const [loading, setLoading] = useState<CheckoutPlan | "">("");
  const [error, setError] = useState("");

  async function checkout(plan: CheckoutPlan) {
    setError("");

    if (!consent) {
      setError(`Please check the auto-renew consent box before continuing with ${checkoutLabel[plan]}.`);
      document.getElementById("auto-renew-consent")?.focus();
      return;
    }

    setLoading(plan);
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan }),
      });
      const payload = await res.json().catch(() => ({}));

      if (payload.url) {
        window.location.href = payload.url;
        return;
      }

      if (payload.redirectTo) {
        window.location.href = payload.redirectTo;
        return;
      }

      setError(payload.error || "We could not start checkout. Please try again.");
    } catch {
      setError("We could not reach checkout. Please check your connection and try again.");
    } finally {
      setLoading("");
    }
  }

  return (
    <div className="rg-page-shell">
      <div className="mx-auto max-w-6xl px-4 py-12 sm:py-16">
        <div className="mx-auto mb-10 max-w-3xl text-center">
          <Eyebrow>Upgrade</Eyebrow>
          <h1 className="mt-3 text-4xl font-bold sm:text-6xl">Start your free trial.</h1>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-slate-700">Try Premium for 3 days, cancel anytime, and keep every decision education-framed before you speak with a fiduciary.</p>
        </div>

        <div className="grid gap-5 lg:grid-cols-4">
          {tiers.map((tier) => (
            <article key={tier.key} className={`relative flex h-full flex-col rounded-3xl border p-6 shadow-sm ${tier.recommended ? "border-brand bg-brand text-white shadow-xl" : selectedPlan === tier.checkoutPlan ? "border-brand bg-white ring-4 ring-brand/10" : "border-slate-200 bg-white"}`}>
              {tier.recommended ? <span className="absolute right-5 top-5 rounded-full bg-white px-3 py-1 text-xs font-extrabold uppercase tracking-[0.14em] text-brand">Recommended</span> : null}
              <h2 className={`text-2xl font-extrabold ${tier.recommended ? "pr-32 text-white" : "text-ink"}`}>{tier.name}</h2>
              <p className={`mt-5 text-4xl font-extrabold ${tier.recommended ? "text-white" : "text-brand"}`}>{tier.price}</p>
              <p className={`mt-1 text-sm font-bold ${tier.recommended ? "text-white/80" : "text-slate-500"}`}>{tier.cadence}</p>
              <p className={`mt-5 flex-1 text-base font-semibold leading-7 ${tier.recommended ? "text-white/90" : "text-slate-700"}`}>{tier.description}</p>
              <ul className={`mt-5 space-y-2 text-sm font-semibold ${tier.recommended ? "text-white/90" : "text-slate-700"}`}>{tier.bullets.map((bullet) => <li key={bullet}>✓ {bullet}</li>)}</ul>
              {tier.checkoutPlan ? (
                <Button disabled={loading !== ""} onClick={() => checkout(tier.checkoutPlan!)} variant={tier.recommended ? "secondary" : "primary"} className="mt-7 w-full disabled:opacity-50">
                  {loading === tier.checkoutPlan ? "Starting checkout…" : tier.cta}
                </Button>
              ) : tier.key === "free" ? (
                <Button href="/dashboard" variant="secondary" className="mt-7 w-full">{tier.cta}</Button>
              ) : (
                <Button href="/about" variant="secondary" className="mt-7 w-full">{tier.cta}</Button>
              )}
            </article>
          ))}
        </div>

        <div className="mt-8 grid gap-5 lg:grid-cols-[1fr_0.9fr] lg:items-stretch">
          <div className="rg-card-highlight">
            <p className="rg-kicker">Trial terms</p>
            <h2 className="mt-2 text-2xl font-extrabold">3-day Premium trial. Cancel anytime.</h2>
            <p className="mt-3 text-slate-700">Checkout still runs through Stripe at <code>/api/checkout</code>. Paid plans renew automatically unless canceled before the trial or billing term ends.</p>
            <label className="mt-5 flex items-start gap-3 text-sm text-slate-700">
              <input id="auto-renew-consent" type="checkbox" checked={consent} onChange={(e) => { setConsent(e.target.checked); if (e.target.checked) setError(""); }} className="mt-1 h-5 w-5" />
              <span>I understand my plan renews automatically and I will be charged unless I cancel before the trial/term ends. I can cancel anytime. See <a href="/terms" className="underline">Terms</a>, <a href="/refund-policy" className="underline">Refund Policy</a>, and <a href="/privacy" className="underline">Privacy</a>.</span>
            </label>
            {error && <p className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-bad">{error}</p>}
          </div>
          <div className="rg-card bg-ink text-white">
            <p className="rg-kicker bg-white/10 text-white">Advisor cost check</p>
            <h2 className="mt-3 text-3xl font-extrabold text-white">Know what 1% can cost.</h2>
            <p className="mt-4 text-lg leading-8 text-white/85">An advisor charging 1% on $500,000 costs about $5,000 per year. RetireShield Premium is $390 per year — an education-first way to get organized before paying percentage-based fees.</p>
          </div>
        </div>

        <Disclaimer className="mx-auto mt-8 max-w-3xl">RetireShield provides educational information only and is not financial, tax, legal, or investment advice. Consider speaking with a qualified fiduciary, tax professional, or attorney about your personal situation.</Disclaimer>
      </div>
    </div>
  );
}

export default function Upgrade() {
  return (
    <Suspense fallback={<div className="mx-auto max-w-xl px-4 py-12">Loading upgrade options…</div>}>
      <UpgradeContent />
    </Suspense>
  );
}
