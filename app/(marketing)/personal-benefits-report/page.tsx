import type { Metadata } from "next";
import { Check } from "lucide-react";
import { BenefitsReportCheckout } from "@/components/BenefitsReportCheckout";
import { BENEFITS_CHECKLIST_PRODUCT, money } from "@/lib/benefitsChecklist";
import { BENEFITS_REPORT_PRICE, reportCredit, reportPrice } from "@/lib/benefitsReport";
import { pageMetadata } from "@/lib/seo";
import { stripe } from "@/lib/stripe";

export const dynamic = "force-dynamic";
export const metadata: Metadata = pageMetadata({ title: "The Personal Benefits Report | RetireShield", description: "A report based on your own answers, state rules, and benefit limits.", path: "/personal-benefits-report/" });

type SearchParams = Record<string, string | string[] | undefined>;
const first = (value: string | string[] | undefined) => Array.isArray(value) ? value[0] : value;

async function sourceOrder(id: string) {
  if (!/^pi_[A-Za-z0-9]+$/.test(id) || !process.env.STRIPE_SECRET_KEY) return null;
  try {
    const intent = await stripe.paymentIntents.retrieve(id, { expand: ["latest_charge"] });
    const charge = typeof intent.latest_charge === "object" ? intent.latest_charge : null;
    if (intent.status !== "succeeded" || intent.amount_received < intent.amount || intent.metadata.product !== BENEFITS_CHECKLIST_PRODUCT || charge?.refunded || (charge?.amount_refunded ?? 0) >= intent.amount_received) return null;
    return intent;
  } catch { return null; }
}

export default async function PersonalBenefitsReportPage({ searchParams }: { searchParams: SearchParams }) {
  const from = first(searchParams.from) || "";
  const source = await sourceOrder(from);
  const credit = source ? reportCredit(source.metadata.state_pack === "1") : 0;
  const price = reportPrice(credit);
  const initial = { email: source?.receipt_email || "", firstName: source?.metadata.buyer_name || "", state: source?.metadata.buyer_state || "", zip: source?.metadata.buyer_zip || "" };

  return (
    <div className="bg-white text-ink">
      <div className="bg-brand-dark px-4 py-3 text-center text-sm font-extrabold uppercase tracking-[0.08em] text-white">Level 3 · What you paid already comes off the price</div>
      <main className="mx-auto max-w-[780px] px-4 py-10 sm:px-6 sm:py-16">
        <p className="text-sm font-extrabold uppercase tracking-[0.08em] text-brand">The Personal Benefits Report</p>
        <h1 className="mt-3 text-4xl font-bold leading-[1.08] sm:text-6xl">The guide is for everyone. This report is for you.</h1>
        <p className="mt-5 text-lg leading-8 text-slate-700">You tell us about your home and money. You tell us what you pay for care. We check the rules in your state. Then we make your report.</p>

        {credit > 0 && (
          <div className="mt-7 rounded-xl border-2 border-[#167A4A] bg-[#F1FAF5] p-5">
            <strong className="text-xl">Your credit is ready.</strong>
            <p className="mt-2 text-lg">{money(BENEFITS_REPORT_PRICE)} − {money(credit)} paid today = <strong>{money(price)}</strong></p>
          </div>
        )}

        <section className="mt-12">
          <h2 className="text-3xl font-bold">What you get</h2>
          <div className="mt-5 divide-y divide-slate-200 border-y border-slate-200">
            {[
              ["One top number", "See the yearly value that may fit. This is a floor. It is not a promise."],
              ["A mark for each program", "See what looks clear or close. See what is over a limit. We may need more facts."],
              ["The best call order", "One yes can help with the next call. The right order can save time."],
              ["Your close calls", "See if you are near a limit. See what to ask the office."],
              ["Short call scripts", "Use words that fit the facts you gave us."],
              ["Your state dates", "See key dates for tax and heat help. See what may need to be done soon."],
            ].map(([title, copy]) => <div key={title} className="flex gap-3 py-4"><Check className="mt-1 h-5 w-5 shrink-0 text-[#167A4A]" /><p className="leading-7"><strong className="block text-lg">{title}</strong>{copy}</p></div>)}
          </div>
        </section>

        <section className="mt-12 rounded-xl bg-[#F4F7FB] p-6 sm:p-8">
          <h2 className="text-3xl font-bold">What we do not ask for</h2>
          <p className="mt-4 text-lg leading-8">We do not ask for your Social Security number. We do not ask for your Medicare or bank number. We do not need them.</p>
        </section>

        <section className="py-12">
          <h2 className="text-3xl font-bold">How it works</h2>
          <ol className="mt-5 grid gap-4 sm:grid-cols-3">
            <li className="rounded-xl border border-slate-200 p-5"><strong className="text-brand">1. Buy</strong><p className="mt-2 leading-7">Use the safe card form below.</p></li>
            <li className="rounded-xl border border-slate-200 p-5"><strong className="text-brand">2. Answer</strong><p className="mt-2 leading-7">Fill out a short step-by-step form. A best guess is fine.</p></li>
            <li className="rounded-xl border border-slate-200 p-5"><strong className="text-brand">3. Get the report</strong><p className="mt-2 leading-7">We send it by email in two work days.</p></li>
          </ol>
        </section>

        <section className="rounded-xl border-2 border-brand-dark p-6 text-center sm:p-8">
          <h2 className="text-3xl font-bold">Your price</h2>
          <div className="mt-4 font-serif text-5xl font-bold text-brand-dark">{money(price)}</div>
          {credit > 0 && <p className="mt-2 text-[#167A4A]">Your {money(credit)} credit is already in this price.</p>}
          <a href="#report-secure-checkout" className="mt-6 block rounded-lg bg-[#167A4A] px-5 py-4 text-xl font-extrabold text-white no-underline">Start my report</a>
        </section>

        <p className="mt-10 text-sm leading-6 text-slate-600">This report is not a yes or no from an office. Each office makes its own choice. We use the facts you give us. We use the rules we can check. We cannot promise that an office will say yes.</p>
      </main>
      <BenefitsReportCheckout sourcePaymentIntentId={source ? source.id : ""} credit={credit} price={price} initial={initial} />
    </div>
  );
}
