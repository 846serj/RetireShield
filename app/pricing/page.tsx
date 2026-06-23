"use client";

import { Fragment, useId, useState } from "react";
import { Check, Minus, ShieldCheck, Sparkles, UserRoundCheck } from "lucide-react";
import { Button, Container, Disclaimer, Eyebrow } from "@/components/ui";

type BillingCycle = "monthly" | "annual";
type TierKey = "free" | "plus" | "premium" | "concierge";
type FeatureValue = boolean | string;

type FeatureRow = {
  label: string;
  values: Record<TierKey, FeatureValue>;
};

type FeatureGroup = {
  name: string;
  rows: FeatureRow[];
};

const tiers: Array<{
  key: TierKey;
  name: string;
  monthlyPrice: string;
  annualPrice: string;
  annualSubtext: string;
  description: string;
  cta: string;
  popular?: boolean;
}> = [
  { key: "free", name: "Free", monthlyPrice: "$0", annualPrice: "$0", annualSubtext: "Always free", description: "Get your Safety Score and first actions without a credit card.", cta: "Start free" },
  { key: "plus", name: "Plus", monthlyPrice: "$19", annualPrice: "$190", annualSubtext: "2 months free", description: "Monthly monitoring, alerts, and coach help when your plan needs attention.", cta: "Choose Plus" },
  { key: "premium", name: "Premium", monthlyPrice: "$39", annualPrice: "$390", annualSubtext: "2 months free", description: "Deeper retirement tools, unlimited coach guidance, and score history.", cta: "Choose Premium", popular: true },
  { key: "concierge", name: "Concierge", monthlyPrice: "From $99", annualPrice: "From $990", annualSubtext: "2 months free", description: "Human checkups for families who want extra help staying organized.", cta: "Talk to us" },
];

const featureGroups: FeatureGroup[] = [
  { name: "Safety Score & actions", rows: [
    { label: "Retirement Safety Score", values: { free: true, plus: true, premium: true, concierge: true } },
    { label: "Personalized action plan", values: { free: "3 actions", plus: "Monthly refresh", premium: "Unlimited", concierge: "Unlimited + human review" } },
    { label: "Priority risk explanations", values: { free: false, plus: true, premium: true, concierge: true } },
  ] },
  { name: "Monthly monitoring & alerts", rows: [
    { label: "Monthly plan check", values: { free: false, plus: true, premium: true, concierge: true } },
    { label: "Risk alerts", values: { free: false, plus: "Email", premium: "Email + in-app", concierge: "Email + in-app + checkup" } },
    { label: "What changed summary", values: { free: false, plus: true, premium: true, concierge: true } },
  ] },
  { name: "AI coach", rows: [
    { label: "Ask retirement questions", values: { free: "Limited preview", plus: "Monthly allowance", premium: "Unlimited", concierge: "Unlimited" } },
    { label: "Scenario explanations", values: { free: false, plus: true, premium: true, concierge: true } },
    { label: "Plain-English action drafts", values: { free: false, plus: false, premium: true, concierge: true } },
  ] },
  { name: "Medicare & Social Security tools", rows: [
    { label: "Social Security timing guide", values: { free: false, plus: "Basics", premium: "Deep tools", concierge: "Deep tools + review" } },
    { label: "Medicare and IRMAA checks", values: { free: false, plus: false, premium: true, concierge: true } },
    { label: "Tax-sensitive education prompts", values: { free: false, plus: false, premium: true, concierge: true } },
  ] },
  { name: "Score history", rows: [
    { label: "Saved Safety Scores", values: { free: "Current only", plus: "12 months", premium: "Full history", concierge: "Full history" } },
    { label: "Trend view", values: { free: false, plus: true, premium: true, concierge: true } },
    { label: "Downloadable checkup summary", values: { free: false, plus: false, premium: true, concierge: true } },
  ] },
  { name: "Human Concierge checkups", rows: [
    { label: "Human retirement checkups", values: { free: false, plus: false, premium: false, concierge: true } },
    { label: "Family-ready summary", values: { free: false, plus: false, premium: false, concierge: true } },
    { label: "Done-for-you monitoring review", values: { free: false, plus: false, premium: false, concierge: true } },
  ] },
];

const faqs = [
  { question: "What's free?", answer: "The Free plan includes your Retirement Safety Score and three personalized actions so you can see your biggest risks before paying anything." },
  { question: "Do I need a credit card?", answer: "No. You can start the Free plan without a credit card. Paid plans only ask for payment when you choose to upgrade." },
  { question: "Can I cancel anytime?", answer: "Yes. There are no contracts, and you can cancel before your next renewal." },
  { question: "Is my data safe?", answer: "We use privacy-minded product design and keep your information protected. We never sell your personal data." },
  { question: "Do you link my bank?", answer: "No. RetireShield does not link your bank, brokerage, or retirement accounts. You enter only the information you want to use." },
  { question: "Is this financial advice?", answer: "No. RetireShield provides education and planning guidance, not financial, investment, tax, or legal advice." },
  { question: "What's Concierge?", answer: "Concierge adds human checkups for people who want another set of eyes on their RetireShield information and action plan." },
  { question: "How does the annual discount work?", answer: "Annual billing gives you 12 months for the price of 10 — the same as 2 months free compared with monthly billing." },
];

function FeatureCell({ value }: { value: FeatureValue }) {
  if (value === true) return <Check className="mx-auto h-5 w-5 text-good" aria-label="Included" />;
  if (value === false) return <Minus className="mx-auto h-5 w-5 text-slate-300" aria-label="Not included" />;
  return <span className="text-sm font-semibold text-slate-700">{value}</span>;
}

function BillingToggle({ billing, setBilling }: { billing: BillingCycle; setBilling: (billing: BillingCycle) => void }) {
  return <div className="inline-flex rounded-2xl border border-slate-200 bg-white p-1 shadow-sm" role="group" aria-label="Choose billing cycle">{(["monthly", "annual"] as BillingCycle[]).map((cycle) => <button key={cycle} type="button" onClick={() => setBilling(cycle)} aria-pressed={billing === cycle} className={`rounded-xl px-5 py-3 text-base font-extrabold transition ${billing === cycle ? "bg-brand text-white" : "text-slate-700 hover:bg-band"}`}>{cycle === "monthly" ? "Monthly" : "Annual"}{cycle === "annual" ? <span className="ml-2 rounded-full bg-alert px-2 py-0.5 text-xs text-ink">2 months free</span> : null}</button>)}</div>;
}

export default function PricingPage() {
  const [billing, setBilling] = useState<BillingCycle>("monthly");
  const faqHeadingId = useId();

  return (
    <main>
      <section className="bg-gradient-to-b from-band via-white to-white py-16 sm:py-20 lg:py-24"><Container><div className="mx-auto max-w-3xl text-center"><Eyebrow>Pricing</Eyebrow><h1 className="mt-5 text-5xl font-extrabold tracking-tight text-ink sm:text-6xl lg:text-7xl">Simple pricing. Start free.</h1><p className="mx-auto mt-6 max-w-2xl text-2xl font-semibold leading-9 text-slate-700">No contracts. Cancel anytime.</p><div className="mt-8"><BillingToggle billing={billing} setBilling={setBilling} /></div></div><div className="mt-12 grid gap-5 lg:grid-cols-4">{tiers.map((tier) => <article key={tier.key} className={`relative flex h-full flex-col rounded-3xl border p-6 shadow-sm ${tier.popular ? "border-brand bg-brand text-white shadow-xl" : "border-slate-200 bg-white text-ink"}`}>{tier.popular ? <span className="absolute right-5 top-5 rounded-full bg-white px-3 py-1 text-xs font-extrabold uppercase tracking-[0.14em] text-brand">Most popular</span> : null}<h2 className={`text-2xl font-extrabold ${tier.popular ? "pr-28 text-white" : "text-ink"}`}>{tier.name}</h2><p className={`mt-5 text-4xl font-extrabold tracking-tight ${tier.popular ? "text-white" : "text-brand"}`}>{billing === "monthly" ? tier.monthlyPrice : tier.annualPrice}</p><p className={`mt-1 text-sm font-bold ${tier.popular ? "text-white/80" : "text-slate-500"}`}>{billing === "monthly" ? "per month" : tier.annualSubtext}</p><p className={`mt-5 flex-1 text-lg font-semibold leading-8 ${tier.popular ? "text-white/90" : "text-slate-700"}`}>{tier.description}</p><Button href={tier.key === "free" ? "/quiz" : "/upgrade"} variant={tier.popular ? "secondary" : "primary"} className="mt-7 w-full">{tier.cta}</Button></article>)}</div></Container></section>

      <section className="py-14 sm:py-20" aria-labelledby="comparison-heading"><Container><div className="mb-8 max-w-3xl"><Eyebrow>Compare tiers</Eyebrow><h2 id="comparison-heading" className="mt-4 text-4xl font-extrabold tracking-tight text-ink sm:text-5xl">Full feature comparison</h2></div><div className="overflow-x-auto rounded-3xl border border-slate-200 bg-white shadow-sm"><table className="w-full min-w-[920px] border-collapse text-left"><caption className="sr-only">ComparisonTable of RetireShield pricing tier features</caption><thead className="bg-band text-sm uppercase tracking-[0.14em] text-slate-600"><tr><th scope="col" className="w-1/3 px-6 py-5">Feature</th>{tiers.map((tier) => <th key={tier.key} scope="col" className="px-4 py-5 text-center">{tier.name}</th>)}</tr></thead><tbody>{featureGroups.map((group) => <Fragment key={group.name}><tr className="border-t border-slate-200 bg-slate-50"><th scope="colgroup" colSpan={5} className="px-6 py-4 text-lg font-extrabold text-ink">{group.name}</th></tr>{group.rows.map((row) => <tr key={row.label} className="border-t border-slate-100"><th scope="row" className="px-6 py-4 text-base font-bold text-slate-800">{row.label}</th>{tiers.map((tier) => <td key={tier.key} className="px-4 py-4 text-center"><FeatureCell value={row.values[tier.key]} /></td>)}</tr>)}</Fragment>)}</tbody></table></div></Container></section>

      <section className="bg-ink py-14 text-white sm:py-20" aria-labelledby="advisor-cost-heading"><Container className="grid gap-8 lg:grid-cols-[1.2fr_0.8fr] lg:items-center"><div><Eyebrow className="bg-white/10 text-white">Advisor cost check</Eyebrow><h2 id="advisor-cost-heading" className="mt-4 text-4xl font-extrabold tracking-tight text-white sm:text-5xl">Know what 1% can cost.</h2><p className="mt-6 text-2xl font-semibold leading-10 text-white/85">An advisor typically charges about 1% of your savings every year. On $500,000 that&apos;s roughly $5,000 a year. RetireShield Premium is $468 a year.</p></div><div className="rounded-3xl border border-white/15 bg-white/10 p-6 shadow-xl"><ShieldCheck className="h-12 w-12 text-alert" aria-hidden="true" /><p className="mt-5 text-3xl font-extrabold">$4,532 less per year</p><p className="mt-3 text-lg text-white/75">A simple education-first option before paying percentage-based fees.</p></div></Container></section>

      <section className="py-14 sm:py-20" aria-labelledby={faqHeadingId}><Container><div className="mx-auto max-w-3xl text-center"><Sparkles className="mx-auto h-10 w-10 text-brand" aria-hidden="true" /><h2 id={faqHeadingId} className="mt-4 text-4xl font-extrabold tracking-tight text-ink sm:text-5xl">Pricing FAQ</h2></div><div className="mx-auto mt-10 max-w-3xl space-y-4">{faqs.map((faq) => <details key={faq.question} className="group rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"><summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-xl font-extrabold text-ink">{faq.question}<UserRoundCheck className="h-6 w-6 shrink-0 text-brand transition group-open:rotate-45" aria-hidden="true" /></summary><p className="mt-4 text-lg leading-8 text-slate-700">{faq.answer}</p></details>)}</div><Disclaimer className="mx-auto mt-10 max-w-3xl">RetireShield provides educational information only and is not financial, tax, legal, or investment advice. Consider speaking with a qualified professional about your personal situation.</Disclaimer></Container></section>
    </main>
  );
}
