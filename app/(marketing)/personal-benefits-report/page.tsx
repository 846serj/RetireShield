import type { Metadata } from "next";
import { Check } from "lucide-react";
import { BenefitsReportCheckout } from "@/components/BenefitsReportCheckout";
import { CommercePageAnalytics } from "@/components/CommerceAnalytics";
import { BENEFITS_CHECKLIST_PRODUCT, money } from "@/lib/benefitsChecklist";
import { BENEFITS_REPORT_PRICE, BENEFITS_REPORT_PRODUCT, reportCredit, reportPrice } from "@/lib/benefitsReport";
import { pageMetadata } from "@/lib/seo";
import { stripe } from "@/lib/stripe";

export const dynamic = "force-dynamic";
export const metadata: Metadata = pageMetadata({ title: "The Personal Benefits Report | RetireShield", description: "A report based on your own answers, state rules, and benefit limits.", path: "/personal-benefits-report/" });

type SearchParams = Record<string, string | string[] | undefined>;
const first = (value: string | string[] | undefined) => Array.isArray(value) ? value[0] : value;

async function sourceOrder(id: string, token: string) {
  if (!/^pi_[A-Za-z0-9]+$/.test(id) || !/^[a-f0-9]{48}$/.test(token) || !process.env.STRIPE_SECRET_KEY) return null;
  try {
    const intent = await stripe.paymentIntents.retrieve(id, { expand: ["latest_charge"] });
    const charge = typeof intent.latest_charge === "object" ? intent.latest_charge : null;
    if (intent.status !== "succeeded" || intent.amount_received < intent.amount || intent.metadata.product !== BENEFITS_CHECKLIST_PRODUCT || intent.metadata.download_token !== token || charge?.refunded || (charge?.amount_refunded ?? 0) >= intent.amount_received) return null;
    return intent;
  } catch { return null; }
}

export default async function PersonalBenefitsReportPage({ searchParams }: { searchParams: SearchParams }) {
  const from = first(searchParams.from) || "";
  const sourceToken = first(searchParams.source_token) || "";
  const source = await sourceOrder(from, sourceToken);
  const credit = source ? reportCredit(source.metadata.state_pack === "1") : 0;
  const price = reportPrice(credit);
  const initial = { email: source?.receipt_email || "", firstName: source?.metadata.buyer_name || "", state: source?.metadata.buyer_state || "", zip: source?.metadata.buyer_zip || "" };
  const attributionKeys = ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term", "aid", "cid", "plat", "first_aid", "first_cid", "first_plat", "click_count", "page_variant", "source_site"] as const;
  const attribution = Object.fromEntries(attributionKeys.flatMap((key) => {
    const fromSource = source?.metadata[key];
    const fromQuery = first(searchParams[key]);
    const value = fromSource || fromQuery;
    return value ? [[key, value.slice(0, 190)]] : [];
  }));
  attribution.utm_source ||= source ? "checklist-upgrade" : "retireshield";
  attribution.utm_medium ||= source ? "thank-you" : "web";
  attribution.utm_campaign ||= "personal-benefits-report";
  attribution.aid ||= source?.metadata.aid || "retireshield-personal-benefits-report";
  attribution.first_aid ||= source?.metadata.first_aid || attribution.aid;
  attribution.cid ||= source?.metadata.cid || "";
  attribution.first_cid ||= source?.metadata.first_cid || attribution.cid;
  attribution.plat ||= source?.metadata.plat || "web";
  attribution.first_plat ||= source?.metadata.first_plat || attribution.plat;
  attribution.page_variant ||= "a";
  attribution.source_site ||= source?.metadata.source_site || "retireshield.com";

  return (
    <div className="bg-white text-ink">
      <CommercePageAnalytics product={BENEFITS_REPORT_PRODUCT} attribution={attribution} />
      <div className="bg-brand-dark px-4 py-3 text-center text-sm font-extrabold uppercase tracking-[0.08em] text-white">Your past payment comes off the price</div>
      <main className="mx-auto max-w-[780px] px-4 py-10 sm:px-6 sm:py-16">
        <p className="text-sm font-extrabold uppercase tracking-[0.08em] text-brand">The Personal Benefits Report</p>
        <h1 className="mt-3 text-4xl font-bold leading-[1.08] sm:text-6xl">The guide is for everyone. This report is made for you.</h1>
        <p className="mt-5 text-lg leading-8 text-slate-700">Tell us about your home, money, and care costs. We check the rules in your state. Then we make your report.</p>

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
              ["One top number", "See how much help may fit your case. This is not a promise."],
              ["A clear list", "See what may fit, what may be close, and what may be over a limit."],
              ["The best call order", "One yes can help with the next call. The right order can save time."],
              ["Your close calls", "See when you are near a limit and what to ask the office."],
              ["Short call scripts", "Know what to say when you call."],
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
            <li className="rounded-xl border border-slate-200 p-5"><strong className="text-brand">2. Answer</strong><p className="mt-2 leading-7">Fill out a short form. A best guess is fine.</p></li>
            <li className="rounded-xl border border-slate-200 p-5"><strong className="text-brand">3. Get the report</strong><p className="mt-2 leading-7">We send it by email in two work days.</p></li>
          </ol>
        </section>

        <section className="rounded-xl border-2 border-brand-dark p-6 text-center sm:p-8">
          <h2 className="text-3xl font-bold">Your price</h2>
          <div className="mt-4 font-serif text-5xl font-bold text-brand-dark">{money(price)}</div>
          {credit > 0 && <p className="mt-2 text-[#167A4A]">Your {money(credit)} credit is already in this price.</p>}
          <a href="#report-secure-checkout" data-rgc-cta-position="report-offer" className="mt-6 block rounded-lg bg-[#167A4A] px-5 py-4 text-xl font-extrabold text-white no-underline">Start my report</a>
        </section>

        <p className="mt-10 text-sm leading-6 text-slate-600">This report is not a yes or no from an office. Each office makes its own choice. We use the facts you give us. We use the rules we can check. We cannot promise that an office will say yes.</p>
      </main>
      <BenefitsReportCheckout sourcePaymentIntentId={source ? source.id : ""} sourceToken={source ? sourceToken : ""} credit={credit} price={price} initial={initial} attribution={attribution} />
    </div>
  );
}
