import type { Metadata } from "next";
import Link from "next/link";
import { CheckCircle2, Mail } from "lucide-react";
import { BENEFITS_REPORT_PRODUCT } from "@/lib/benefitsReport";
import { stripe } from "@/lib/stripe";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Start Your Report | RetireShield", robots: { index: false, follow: false } };
type SearchParams = Record<string, string | string[] | undefined>;
const first = (value: string | string[] | undefined) => Array.isArray(value) ? value[0] : value;

export default async function BenefitsReportThanks({ searchParams }: { searchParams: SearchParams }) {
  const paymentIntentId = first(searchParams.payment_intent) || "";
  const token = first(searchParams.token) || "";
  let valid = false;
  if (/^pi_[A-Za-z0-9]+$/.test(paymentIntentId) && /^[a-f0-9]{48}$/.test(token) && process.env.STRIPE_SECRET_KEY) {
    try {
      const intent = await stripe.paymentIntents.retrieve(paymentIntentId, { expand: ["latest_charge"] });
      const charge = typeof intent.latest_charge === "object" ? intent.latest_charge : null;
      valid = intent.status === "succeeded" && intent.amount_received >= intent.amount && intent.metadata.product === BENEFITS_REPORT_PRODUCT && intent.metadata.intake_token === token && !charge?.refunded && (charge?.amount_refunded ?? 0) < intent.amount_received;
    } catch (error) { console.error("report thank-you lookup failed", error); }
  }

  if (!valid) return <section className="bg-surface px-4 py-16 text-center sm:py-24"><Mail className="mx-auto h-12 w-12 text-brand" /><h1 className="mt-5 text-3xl font-bold">We could not open that order yet.</h1><p className="mx-auto mt-4 max-w-xl text-lg leading-8 text-slate-600">If you just paid, wait a moment. We also sent the report link to your email.</p></section>;

  return <section className="bg-surface px-4 py-16 sm:py-24"><div className="mx-auto max-w-2xl rounded-xl border border-slate-200 bg-white p-6 text-center shadow-xl sm:p-10"><CheckCircle2 className="mx-auto h-12 w-12 text-[#167A4A]" /><p className="mt-3 text-sm font-extrabold uppercase tracking-[0.08em] text-[#167A4A]">Payment complete</p><h1 className="mt-3 text-3xl font-bold sm:text-5xl">Now tell us about you.</h1><p className="mt-5 text-lg leading-8 text-slate-700">The form takes about 10 minutes. A best guess is fine. You can stop and use the email link to come back.</p><Link href={`/benefits-report-intake/?payment_intent=${encodeURIComponent(paymentIntentId)}&token=${encodeURIComponent(token)}`} className="mt-7 block rounded-lg bg-[#167A4A] px-5 py-4 text-xl font-extrabold text-white no-underline hover:bg-[#0E633A] hover:text-white">Start my report</Link></div></section>;
}
