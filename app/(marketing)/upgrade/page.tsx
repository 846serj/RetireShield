"use client";

import { Suspense, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { BillingToggle } from "@/components/BillingToggle";
import { Button, Eyebrow } from "@/components/ui";
import { alternatePrice, type BillingCycle, pricingTiers, primaryPrice, type PriceTier } from "@/lib/pricing";

type CheckoutPlan = { tier: "plus" | "premium"; cadence: BillingCycle };

type Tier = PriceTier & {
  bullets: string[];
  cta: string;
};


const tiers: Tier[] = pricingTiers.map((tier) => ({
  ...tier,
  description: {
    free: "Verdict, trigger, safe max, and your safe-to-spend number.",
    plus: "Unlock decision depth: tax/Medicare ripple, alternatives, calculation trace, history, and connected accounts.",
    premium: "Plus features with existing Medicare/IRMAA, Social Security, and score-history tools; more included tools are rolling out.",
    concierge: "Premium plus human checkups and done-for-you organization."
  }[tier.key],
  bullets: {
    free: ["Verdict + trigger", "Safe max", "Safe-to-spend number"],
    plus: ["7-day free trial", "Tax/Medicare ripple", "Alternatives + calculation trace", "Saved decision history", "Connect accounts"],
    premium: ["7-day free trial", "Medicare/IRMAA tools", "Social Security planning tools", "Score history", "Included — rolling out: expanded deep planners"],
    concierge: ["Premium included", "Human checkups", "Done-for-you organization", "Talk-to-sales / waitlist"]
  }[tier.key],
  cta: { free: "Current plan", plus: "Start 7-day trial", premium: "Start 7-day trial", concierge: "Talk to us" }[tier.key],
  selfServe: tier.key === "plus" || tier.key === "premium",
}));


// Conspicuous auto-renew terms + explicit consent before Checkout.
function UpgradeContent() {
  const searchParams = useSearchParams();
  const selectedCadence = useMemo<BillingCycle>(() => searchParams.get("cadence") === "monthly" || searchParams.get("plan") === "monthly" ? "monthly" : "annual", [searchParams]);
  const selectedTier = useMemo(() => searchParams.get("tier"), [searchParams]);
  const [billing, setBilling] = useState<BillingCycle>(selectedCadence);
  const [consent, setConsent] = useState(false);
  const [loading, setLoading] = useState<string>("");
  const [error, setError] = useState("");

  async function checkout({ tier, cadence }: CheckoutPlan) {
    setError("");

    if (!consent) {
      setError(`Please check the auto-renew consent box before continuing with ${tier} ${cadence}.`);
      document.getElementById("auto-renew-consent")?.focus();
      return;
    }

    const loadingKey = `${tier}_${cadence}`;
    setLoading(loadingKey);
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tier, cadence }),
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
          <h1 className="mt-3 text-4xl font-bold sm:text-6xl">Compare every RetireShield tier.</h1>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-slate-700">Keep Free for the verdict and number, or start a card-required 7-day trial of Plus or Premium. Concierge is talk-to-sales.</p>
          <div className="mt-6"><BillingToggle billing={billing} setBilling={setBilling} /></div>
        </div>

        <div className="grid gap-5 lg:grid-cols-4">
          {tiers.map((tier) => (
            <article key={tier.key} className={`relative flex h-full flex-col rounded-3xl border p-6 shadow-sm ${tier.popular ? "border-brand bg-brand text-white shadow-xl" : selectedTier === tier.key ? "border-brand bg-white ring-4 ring-brand/10" : "border-slate-200 bg-white"}`}>
              {tier.popular ? <div className="mb-4 flex justify-center"><span className="rounded-full bg-white px-3 py-1 text-xs font-extrabold uppercase tracking-[0.14em] text-brand shadow-sm">Most popular</span></div> : null}
              <h2 className={`text-2xl font-extrabold ${tier.popular ? "text-white" : "text-ink"}`}>{tier.name}</h2>
              <p className={`mt-5 text-4xl font-extrabold ${tier.popular ? "text-white" : "text-brand"}`}>{primaryPrice(tier, billing)}</p>
              <p className={`mt-1 text-sm font-bold ${tier.popular ? "text-white/80" : "text-slate-500"}`}>{alternatePrice(tier, billing)}</p>
              <p className={`mt-5 flex-1 text-base font-semibold leading-7 ${tier.popular ? "text-white/90" : "text-slate-700"}`}>{tier.description}</p>
              <ul className={`mt-5 space-y-2 text-sm font-semibold ${tier.popular ? "text-white/90" : "text-slate-700"}`}>{tier.bullets.map((bullet) => <li key={bullet}>✓ {bullet}</li>)}</ul>
              {tier.selfServe ? (
                <Button disabled={loading !== ""} onClick={() => checkout({ tier: tier.key as "plus" | "premium", cadence: billing })} variant={tier.popular ? "secondary" : "primary"} className="mt-7 w-full disabled:opacity-50">
                  {loading === `${tier.key}_${billing}` ? "Starting checkout…" : tier.cta}
                </Button>
              ) : tier.key === "free" ? (
                <Button href="/dashboard" variant="secondary" className="mt-7 w-full">{tier.cta}</Button>
              ) : (
                <Button href="mailto:hello@retireshield.com" variant="secondary" className="mt-7 w-full">{tier.cta}</Button>
              )}
            </article>
          ))}
        </div>

        <div className="mt-8 grid gap-5 lg:grid-cols-[1fr_0.9fr] lg:items-stretch">
          <div className="rg-card-highlight">
            <p className="rg-kicker">Trial terms</p>
            <h2 className="mt-2 text-2xl font-extrabold">7-day Plus/Premium trial. Cancel anytime.</h2>
            <p className="mt-3 text-slate-700">Your Plus or Premium trial requires a card and auto-converts after 7 days. You won't be charged if you cancel before it ends. After that, your plan renews automatically until you cancel — and you can cancel anytime from your account.</p>
            <label className="mt-5 flex items-start gap-3 text-sm text-slate-700">
              <input id="auto-renew-consent" type="checkbox" checked={consent} onChange={(e) => { setConsent(e.target.checked); if (e.target.checked) setError(""); }} className="mt-1 h-5 w-5" />
              <span>I understand my plan renews automatically and I will be charged unless I cancel before the trial/term ends. I can cancel anytime. See <a href="/terms" className="underline">Terms</a>, <a href="/refund-policy" className="underline">Refund Policy</a>, and <a href="/privacy" className="underline">Privacy</a>.</span>
            </label>
            {error && <p className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-bad">{error}</p>}
          </div>
          <div className="rg-card bg-ink text-white">
            <p className="rg-kicker bg-white/10 text-white">Advisor cost check</p>
            <h2 className="mt-3 text-3xl font-extrabold text-white">Know what 1% can cost.</h2>
            <p className="mt-4 text-lg leading-8 text-white/85">An advisor charging 1% on $500,000 costs about $5,000 per year. RetireShield Premium is $390 per year — a lower-cost way to get organized before paying percentage-based fees.</p>
          </div>
        </div>
        <p className="mt-6 text-sm leading-6 text-slate-600">RetireShield is analytical education software, not individualized investment, tax, legal, or insurance advice. Use outputs as planning context and questions to review with qualified professionals.</p>
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
