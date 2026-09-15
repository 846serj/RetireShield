"use client";

import Script from "next/script";
import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { Check, LockKeyhole } from "lucide-react";
import { US_STATES } from "@/lib/usStates";
import { captureCommerce, commerceAnalyticsId, commerceAttribution, type CommerceAttribution } from "@/lib/commerceAnalytics";
const BENEFITS_REPORT_PRODUCT = "benefits-report";

type StripeElement = { mount: (target: HTMLElement) => void; destroy: () => void };
type StripeElements = { create: (type: "payment", options?: Record<string, unknown>) => StripeElement };
type StripeResult = { error?: { message?: string }; paymentIntent?: { id: string; status: string } };
type StripeClient = { elements: (options: Record<string, unknown>) => StripeElements; confirmPayment: (options: Record<string, unknown>) => Promise<StripeResult> };

declare global { interface Window { Stripe?: (key: string) => StripeClient } }

type IntentResponse = { clientSecret: string; publishableKey: string; subtotal: number; tax: number; total: number; returnUrl: string };

function dollars(cents: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(cents / 100);
}

export function BenefitsReportCheckout({
  sourcePaymentIntentId,
  sourceOrderId,
  sourceToken,
  credit,
  price,
  initial,
  attribution,
}: {
  sourcePaymentIntentId: string;
  sourceOrderId: string;
  sourceToken: string;
  credit: number;
  price: number;
  initial: { email: string; firstName: string; state: string; zip: string };
  attribution: CommerceAttribution;
}) {
  const [stripeReady, setStripeReady] = useState(false);
  const [stage, setStage] = useState<"details" | "payment">("details");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [intent, setIntent] = useState<IntentResponse | null>(null);
  const [form, setForm] = useState(initial);
  const paymentHost = useRef<HTMLDivElement>(null);
  const stripeClient = useRef<StripeClient | null>(null);
  const stripeElements = useRef<StripeElements | null>(null);
  const paymentElement = useRef<StripeElement | null>(null);
  const requestId = useMemo(() => typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`, []);

  useEffect(() => {
    if (stage !== "payment" || !intent || !stripeReady || !window.Stripe || !paymentHost.current || paymentElement.current) return;
    const client = window.Stripe(intent.publishableKey);
    const elements = client.elements({ clientSecret: intent.clientSecret, appearance: { theme: "stripe", variables: { colorPrimary: "#163A66", colorText: "#111827", borderRadius: "7px", fontSizeBase: "18px" } } });
    const element = elements.create("payment", { layout: "tabs" });
    element.mount(paymentHost.current);
    stripeClient.current = client;
    stripeElements.current = elements;
    paymentElement.current = element;
  }, [intent, stage, stripeReady]);

  async function start(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    captureCommerce("rgc_checkout_started", BENEFITS_REPORT_PRODUCT, {}, attribution);
    try {
      const response = await fetch("/api/benefits-report/payment-intent", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...form, sourcePaymentIntentId, sourceOrderId, sourceToken, requestId, analyticsId: commerceAnalyticsId(attribution), attribution: commerceAttribution(attribution) }) });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || "We could not start checkout.");
      setIntent(payload as IntentResponse);
      setStage("payment");
      requestAnimationFrame(() => document.getElementById("report-secure-checkout")?.scrollIntoView({ behavior: "smooth", block: "start" }));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "We could not start checkout.");
    } finally {
      setBusy(false);
    }
  }

  function edit() {
    paymentElement.current?.destroy();
    paymentElement.current = null;
    stripeElements.current = null;
    stripeClient.current = null;
    setIntent(null);
    setStage("details");
  }

  async function pay(event: FormEvent) {
    event.preventDefault();
    if (!intent || !stripeClient.current || !stripeElements.current) return setError("The payment box is still loading.");
    setBusy(true);
    setError("");
    captureCommerce("rgc_payment_attempted", BENEFITS_REPORT_PRODUCT, { payment_method: "card", credit_cents: credit }, attribution);
    try {
      const result = await stripeClient.current.confirmPayment({
        elements: stripeElements.current,
        confirmParams: { return_url: intent.returnUrl, payment_method_data: { billing_details: { name: form.firstName, email: form.email, address: { country: "US", postal_code: form.zip, state: form.state } } } },
        redirect: "if_required",
      });
      if (result.error) throw new Error(result.error.message || "That payment did not go through. You were not charged.");
      if (result.paymentIntent?.status === "succeeded") {
        const done = new URL(intent.returnUrl);
        done.searchParams.set("payment_intent", result.paymentIntent.id);
        window.location.assign(done.toString());
        return;
      }
      throw new Error("Stripe is still working on the payment. Please check your email.");
    } catch (caught) {
      captureCommerce("rgc_payment_failed", BENEFITS_REPORT_PRODUCT, { payment_method: "card" }, attribution);
      setError(caught instanceof Error ? caught.message : "That payment did not go through. You were not charged.");
      setBusy(false);
    }
  }

  return (
    <section id="report-checkout" className="border-y border-slate-200 bg-[#F4F7FB] px-4 py-12 sm:px-6">
      <Script src="https://js.stripe.com/v3/" strategy="afterInteractive" onLoad={() => setStripeReady(true)} />
      <div id="report-secure-checkout" className="mx-auto max-w-xl scroll-mt-24 rounded-xl border-2 border-brand-dark bg-white p-5 shadow-xl sm:p-8">
        <div className="flex items-center gap-2 text-sm font-extrabold uppercase tracking-[0.1em] text-brand"><LockKeyhole className="h-4 w-4" />Secure checkout</div>
        <h2 className="mt-3 text-3xl font-bold">Get my report.</h2>
        <div className="mt-5 rounded-lg bg-slate-50 p-4">
          <div className="flex justify-between gap-3"><span>Personal Benefits Report</span><span>$297.00</span></div>
          {credit > 0 && <div className="mt-2 flex justify-between gap-3 text-[#167A4A]"><span>Your credit</span><span>− {dollars(credit)}</span></div>}
          <div className="mt-3 flex justify-between gap-3 border-t border-slate-300 pt-3 text-xl font-extrabold"><span>{stage === "payment" ? "Total" : "Price before tax"}</span><span>{dollars(intent?.total ?? price)}</span></div>
        </div>

        {stage === "details" ? (
          <form className="mt-6 grid gap-4" onSubmit={start} noValidate>
            <p className="text-lg font-extrabold">1. Where should we send your report?</p>
            <label className="grid gap-2 font-bold">Email address<input required type="email" autoComplete="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="min-h-14 rounded-lg border border-slate-400 px-4 text-lg font-normal" /></label>
            <div className="grid gap-4 sm:grid-cols-[1fr_9rem]">
              <label className="grid gap-2 font-bold">First name<input required autoComplete="given-name" value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} className="min-h-14 rounded-lg border border-slate-400 px-4 text-lg font-normal" /></label>
              <label className="grid gap-2 font-bold">ZIP code<input required inputMode="numeric" maxLength={10} autoComplete="postal-code" value={form.zip} onChange={(e) => setForm({ ...form, zip: e.target.value })} className="min-h-14 rounded-lg border border-slate-400 px-4 text-lg font-normal" /></label>
            </div>
            <label className="grid gap-2 font-bold">State<select required autoComplete="address-level1" value={form.state} onChange={(e) => setForm({ ...form, state: e.target.value })} className="min-h-14 rounded-lg border border-slate-400 bg-white px-4 text-lg font-normal"><option value="">Choose your state</option>{US_STATES.map((state) => <option key={state.code} value={state.code}>{state.name}</option>)}</select></label>
            {error && <p role="alert" className="rounded-lg border border-red-300 bg-red-50 p-3 font-semibold text-red-800">{error}</p>}
            <button disabled={busy} className="min-h-16 rounded-lg bg-brand-dark px-5 py-4 text-xl font-extrabold text-white">{busy ? "Loading payment…" : `Go to secure payment — ${dollars(price)}`}</button>
          </form>
        ) : (
          <form className="mt-6" onSubmit={pay}>
            <div className="flex items-center justify-between"><p className="text-lg font-extrabold">2. Pay by card</p><button type="button" onClick={edit} className="text-sm font-bold text-brand underline">Change details</button></div>
            <div ref={paymentHost} className="mt-4 min-h-28" />
            {error && <p role="alert" className="mt-4 rounded-lg border border-red-300 bg-red-50 p-3 font-semibold text-red-800">{error}</p>}
            <button disabled={busy || !stripeReady} className="mt-5 min-h-16 w-full rounded-lg bg-[#167A4A] px-5 py-4 text-xl font-extrabold text-white">{busy ? "Sending payment…" : `Pay ${dollars(intent?.total ?? price)} and start my report`}</button>
          </form>
        )}

        <ul className="mt-6 space-y-2 border-t border-slate-200 pt-5 text-sm leading-6 text-slate-700">
          <li className="flex gap-2"><Check className="mt-1 h-4 w-4 shrink-0 text-[#167A4A]" />We never ask for your Social Security or Medicare number.</li>
          <li className="flex gap-2"><Check className="mt-1 h-4 w-4 shrink-0 text-[#167A4A]" />Your form starts right after you pay.</li>
          <li className="flex gap-2"><Check className="mt-1 h-4 w-4 shrink-0 text-[#167A4A]" />Your report is sent in two work days.</li>
        </ul>
      </div>
    </section>
  );
}
