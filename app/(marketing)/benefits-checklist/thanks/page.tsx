import type { Metadata } from "next";
import Link from "next/link";
import { CheckCircle2, Download, Mail } from "lucide-react";
import { BENEFITS_CHECKLIST_DOWNLOADS, BENEFITS_CHECKLIST_PRODUCT, money } from "@/lib/benefitsChecklist";
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
          <Link href="/benefits-checklist/#benefits-checkout" className="mt-8 inline-flex min-h-14 items-center justify-center rounded-lg bg-brand-dark px-6 py-3 font-extrabold text-white no-underline hover:bg-brand hover:text-white">Return to the Benefits Checklist</Link>
        </div>
      </section>
    );
  }

  return (
    <section className="bg-surface py-12 sm:py-20">
      <div className="mx-auto max-w-3xl px-4 sm:px-6">
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xl shadow-slate-900/10 sm:p-10">
          <div className="flex items-center gap-3 text-sm font-extrabold uppercase tracking-[0.12em] text-[#167A4A]"><CheckCircle2 className="h-6 w-6" />Payment successful</div>
          <h1 className="mt-4 text-3xl font-bold sm:text-5xl">Your downloads are ready.</h1>
          <p className="mt-5 text-lg leading-8 text-slate-600">RetireShield received your payment of {money(intent.amount_received)}. A copy of these private links is also being sent to your purchase email.</p>
          <div className="mt-8 grid gap-4">
            {Object.entries(BENEFITS_CHECKLIST_DOWNLOADS).map(([key, file]) => {
              const href = `/api/benefits-checklist/download/${key}?payment_intent=${encodeURIComponent(intent.id)}&token=${encodeURIComponent(token)}`;
              return (
                <a key={key} href={href} className="flex min-h-16 items-center justify-between gap-4 rounded-xl border-2 border-brand-dark bg-white px-5 py-4 text-left font-extrabold text-brand-dark no-underline transition hover:bg-band hover:text-brand-dark">
                  <span>{file.label}</span><Download className="h-5 w-5 shrink-0" />
                </a>
              );
            })}
          </div>
          <p className="mt-7 text-sm leading-6 text-slate-500">Save the email with your links. If the guide is not useful, reply to the receipt within 30 days for a refund.</p>
        </div>
      </div>
    </section>
  );
}
