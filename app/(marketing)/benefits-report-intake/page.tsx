import type { Metadata } from "next";
import { Mail } from "lucide-react";
import { BenefitsReportIntake } from "@/components/BenefitsReportIntake";
import { BENEFITS_REPORT_PRODUCT } from "@/lib/benefitsReport";
import { stripe } from "@/lib/stripe";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Your Report Questions | RetireShield", robots: { index: false, follow: false } };
type SearchParams = Record<string, string | string[] | undefined>;
const first = (value: string | string[] | undefined) => Array.isArray(value) ? value[0] : value;

export default async function BenefitsReportIntakePage({ searchParams }: { searchParams: SearchParams }) {
  const paymentIntentId = first(searchParams.payment_intent) || "";
  const token = first(searchParams.token) || "";
  let intent = null;
  if (/^pi_[A-Za-z0-9]+$/.test(paymentIntentId) && /^[a-f0-9]{48}$/.test(token) && process.env.STRIPE_SECRET_KEY) {
    try { intent = await stripe.paymentIntents.retrieve(paymentIntentId, { expand: ["latest_charge"] }); } catch (error) { console.error("report intake lookup failed", error); }
  }
  const charge = intent && typeof intent.latest_charge === "object" ? intent.latest_charge : null;
  const valid = Boolean(intent && intent.status === "succeeded" && intent.amount_received >= intent.amount && intent.metadata.product === BENEFITS_REPORT_PRODUCT && intent.metadata.intake_token === token && !charge?.refunded && (charge?.amount_refunded ?? 0) < intent.amount_received);
  if (!valid || !intent) return <section className="bg-surface px-4 py-16 text-center sm:py-24"><Mail className="mx-auto h-12 w-12 text-brand" /><h1 className="mt-5 text-3xl font-bold">Use the link in your receipt.</h1><p className="mx-auto mt-4 max-w-xl text-lg leading-8 text-slate-600">This form opens only for a paid report. If you need help, reply to your receipt.</p></section>;

  return <section className="bg-[#F4F7FB] px-4 py-10 sm:px-6 sm:py-16"><div className="mx-auto max-w-3xl"><BenefitsReportIntake paymentIntentId={paymentIntentId} token={token} initial={{ state: intent.metadata.buyer_state || "" }} /></div></section>;
}
