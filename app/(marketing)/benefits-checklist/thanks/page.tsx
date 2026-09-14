import type { Metadata } from "next";
import Link from "next/link";
import { CheckCircle2, Download, Mail } from "lucide-react";
import { BENEFITS_CHECKLIST_PRODUCT, benefitsDownloadsForOrder, money } from "@/lib/benefitsChecklist";
import { BENEFITS_REPORT_PRICE, reportCredit, reportPrice } from "@/lib/benefitsReport";
import { stripe } from "@/lib/stripe";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Your Benefits Checklist | RetireShield",
  robots: { index: false, follow: false },
};

type SearchParams = Record<string, string | string[] | undefined>;

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function BenefitsChecklistThanks({ searchParams }: { searchParams: SearchParams }) {
  const paymentIntentId = first(searchParams.payment_intent) || "";
  const token = first(searchParams.token) || "";
  let intent = null;

  if (/^pi_[A-Za-z0-9]+$/.test(paymentIntentId) && /^[a-f0-9]{48}$/.test(token) && process.env.STRIPE_SECRET_KEY) {
    try {
      intent = await stripe.paymentIntents.retrieve(paymentIntentId, { expand: ["latest_charge"] });
    } catch (error) {
      console.error("benefits checklist thank-you lookup failed", error);
    }
  }

  const charge = intent && typeof intent.latest_charge === "object" ? intent.latest_charge : null;
  const paid = Boolean(
    intent &&
    intent.status === "succeeded" &&
    intent.amount_received >= intent.amount &&
    !charge?.refunded &&
    (charge?.amount_refunded ?? 0) < intent.amount_received &&
    intent.metadata.product === BENEFITS_CHECKLIST_PRODUCT &&
    intent.metadata.download_token === token,
  );

  if (!paid || !intent) {
    return (
      <section className="bg-surface py-16 sm:py-24">
        <div className="mx-auto max-w-2xl px-4 text-center sm:px-6">
          <Mail className="mx-auto h-12 w-12 text-brand" />
          <h1 className="mt-5 text-3xl font-bold sm:text-5xl">We could not open that order yet.</h1>
          <p className="mt-5 text-lg leading-8 text-slate-600">If you just paid, Stripe may still be finishing the confirmation. Your receipt and private download links will also be sent to the email entered at checkout.</p>
          <Link href="/benefits-checklist/#secure-checkout" className="mt-8 inline-flex min-h-14 items-center justify-center rounded-lg bg-brand-dark px-6 py-3 font-extrabold text-white no-underline hover:bg-brand hover:text-white">Go back to checkout</Link>
        </div>
      </section>
    );
  }

  const hasStatePack = intent.metadata.state_pack === "1";
  const downloads = benefitsDownloadsForOrder(intent.metadata.buyer_state || "", hasStatePack);
  const credit = reportCredit(hasStatePack);
  const upgradePrice = reportPrice(credit);

  return (
    <section className="bg-surface py-12 sm:py-20">
      <div className="mx-auto max-w-3xl px-4 sm:px-6">
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xl shadow-slate-900/10 sm:p-10">
          <div className="flex items-center gap-3 text-sm font-extrabold uppercase tracking-[0.12em] text-[#167A4A]"><CheckCircle2 className="h-6 w-6" />Payment complete</div>
          <h1 className="mt-4 text-3xl font-bold sm:text-5xl">Your downloads are ready.</h1>
          <p className="mt-5 text-lg leading-8 text-slate-600">We got your payment of {money(intent.amount_received)}. We also sent these links to your email.</p>
          <div className="mt-8 grid gap-4">
            {downloads.map((file) => {
              const href = `/api/benefits-checklist/download/${file.key}?payment_intent=${encodeURIComponent(intent.id)}&token=${encodeURIComponent(token)}`;
              return (
                <a key={file.key} href={href} className="flex min-h-16 items-center justify-between gap-4 rounded-xl border-2 border-brand-dark bg-white px-5 py-4 text-left font-extrabold text-brand-dark no-underline transition hover:bg-band hover:text-brand-dark">
                  <span>{file.label}</span><Download className="h-5 w-5 shrink-0" />
                </a>
              );
            })}
          </div>
          <p className="mt-7 text-sm leading-6 text-slate-500">Save the email with your links. If the guide does not help, reply in 30 days for a refund.</p>

          <section className="mt-9 rounded-xl border-2 border-[#167A4A] bg-[#F1FAF5] p-5 sm:p-7">
            <p className="text-sm font-extrabold uppercase tracking-[0.08em] text-[#167A4A]">Next step · your full credit is ready</p>
            <h2 className="mt-2 text-2xl font-bold sm:text-3xl">Want a report made for you?</h2>
            <p className="mt-3 text-base leading-7 text-slate-700">The guide is for everyone. The Personal Benefits Report uses your answers. It shows which programs may fit, which calls to make first, and what to ask.</p>
            <div className="mt-5 max-w-md rounded-lg bg-white p-4 text-base">
              <div className="flex justify-between gap-3"><span>Personal Benefits Report</span><span>{money(BENEFITS_REPORT_PRICE)}</span></div>
              <div className="mt-2 flex justify-between gap-3 text-[#167A4A]"><span>What you paid today</span><span>− {money(credit)}</span></div>
              <div className="mt-3 flex justify-between gap-3 border-t border-slate-300 pt-3 text-xl font-extrabold"><span>Your price</span><span>{money(upgradePrice)}</span></div>
            </div>
            <Link href={`/personal-benefits-report/?from=${encodeURIComponent(intent.id)}&source_token=${encodeURIComponent(token)}`} className="mt-5 block rounded-lg bg-[#167A4A] px-5 py-4 text-center text-lg font-extrabold text-white no-underline hover:bg-[#0E633A] hover:text-white">Use my {money(credit)} credit — finish for {money(upgradePrice)}</Link>
            <p className="mt-3 text-sm leading-6 text-slate-600">Your downloads are already safe. You do not need to buy the report.</p>
          </section>
        </div>
      </div>
    </section>
  );
}
