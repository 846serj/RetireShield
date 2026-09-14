"use client";

import Script from "next/script";
import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { LockKeyhole, ShieldCheck } from "lucide-react";
import { US_STATES } from "@/lib/usStates";

type StripeElement = { mount: (target: HTMLElement) => void; destroy: () => void };
type StripeElements = { create: (type: "payment", options?: Record<string, unknown>) => StripeElement };
type StripeResult = { error?: { message?: string }; paymentIntent?: { id: string; status: string } };
type StripeClient = {
  elements: (options: Record<string, unknown>) => StripeElements;
  confirmPayment: (options: Record<string, unknown>) => Promise<StripeResult>;
};

declare global {
  interface Window {
    Stripe?: (key: string) => StripeClient;
  }
}

type IntentResponse = {
  clientSecret: string;
  paymentIntentId: string;
  publishableKey: string;
  subtotal: number;
  tax: number;
  total: number;
  returnUrl: string;
};

function dollars(cents: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(cents / 100);
}

export function BenefitsChecklistCheckout({ attribution }: { attribution: Record<string, string> }) {
  const [stripeReady, setStripeReady] = useState(false);
  const [stage, setStage] = useState<"details" | "payment">("details");
  const [busy, setBusy] = useState(false);
  const [paying, setPaying] = useState(false);
  const [error, setError] = useState("");
  const [intent, setIntent] = useState<IntentResponse | null>(null);
  const [form, setForm] = useState({ email: "", firstName: "", zip: "", state: "" });
  const paymentHost = useRef<HTMLDivElement>(null);
  const stripeClient = useRef<StripeClient | null>(null);
  const stripeElements = useRef<StripeElements | null>(null);
  const paymentElement = useRef<StripeElement | null>(null);
  const requestId = useMemo(() => typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`, []);

  useEffect(() => {
    if (stage !== "payment" || !intent || !stripeReady || !window.Stripe || !paymentHost.current || paymentElement.current) return;
    const client = window.Stripe(intent.publishableKey);
    const elements = client.elements({
      clientSecret: intent.clientSecret,
      appearance: {
        theme: "stripe",
        variables: {
          colorPrimary: "#163A66",
          colorText: "#111827",
          borderRadius: "8px",
          fontSizeBase: "18px",
          spacingUnit: "5px",
        },
      },
    });
    const element = elements.create("payment", { layout: "tabs" });
    element.mount(paymentHost.current);
    stripeClient.current = client;
    stripeElements.current = elements;
    paymentElement.current = element;
  }, [intent, stage, stripeReady]);

  function update(field: keyof typeof form, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  async function continueToPayment(event: FormEvent) {
    event.preventDefault();
    setError("");
    setBusy(true);
    try {
      const response = await fetch("/api/benefits-checklist/payment-intent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, requestId, attribution }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || "Checkout could not be started.");
      setIntent(payload as IntentResponse);
      setStage("payment");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Checkout could not be started.");
    } finally {
      setBusy(false);
    }
  }

  function editDetails() {
    paymentElement.current?.destroy();
    paymentElement.current = null;
    stripeElements.current = null;
    stripeClient.current = null;
    setIntent(null);
    setStage("details");
    setError("");
  }

  async function pay(event: FormEvent) {
    event.preventDefault();
    if (!intent || !stripeClient.current || !stripeElements.current) {
      setError("The secure payment form is still loading. Please wait a moment.");
      return;
    }
    setError("");
    setPaying(true);
    try {
      const result = await stripeClient.current.confirmPayment({
        elements: stripeElements.current,
        confirmParams: {
          return_url: intent.returnUrl,
          payment_method_data: {
            billing_details: {
              name: form.firstName,
              email: form.email,
              address: { country: "US", postal_code: form.zip, state: form.state },
            },
          },
        },
        redirect: "if_required",
      });
      if (result.error) throw new Error(result.error.message || "That payment did not go through. You have not been charged.");
      if (result.paymentIntent?.status === "succeeded") {
        const completed = new URL(intent.returnUrl);
        completed.searchParams.set("payment_intent", result.paymentIntent.id);
        window.location.assign(completed.toString());
        return;
      }
      throw new Error("Stripe is still processing that payment. Please check your email for the receipt and download links.");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "That payment did not go through. You have not been charged.");
      setPaying(false);
    }
  }

  return (
    <section id="benefits-checkout" className="scroll-mt-6 border-y border-slate-200 bg-white py-14 sm:py-20">
      <Script src="https://js.stripe.com/v3/" strategy="afterInteractive" onLoad={() => setStripeReady(true)} />
      <div className="mx-auto grid max-w-container items-start gap-8 px-4 sm:px-6 lg:grid-cols-[.82fr_1.18fr] lg:gap-12 lg:px-8">
        <div>
          <p className="rg-kicker">Buy directly from RetireShield</p>
          <h2 className="mt-3 text-3xl font-bold sm:text-5xl">Get all three downloads today.</h2>
          <div className="mt-6 rounded-2xl border border-slate-200 bg-surface p-5 sm:p-6">
            <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
              <span className="text-lg text-slate-500">Regularly <s>$97</s></span>
              <strong className="font-serif text-4xl text-brand-dark">$47</strong>
            </div>
            <p className="mt-2 text-sm leading-6 text-slate-600">One payment. No subscription. Any required sales tax is shown before payment.</p>
            <ul className="mt-5 space-y-3 text-base font-semibold text-ink">
              <li className="flex gap-3"><ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-accent" />69-page Benefits Checklist</li>
              <li className="flex gap-3"><ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-accent" />Printable application tracker</li>
              <li className="flex gap-3"><ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-accent" />Open-settlements insert</li>
            </ul>
            <p className="mt-5 border-t border-slate-200 pt-5 text-sm leading-6 text-slate-600">Immediate private download links are also emailed to you. Covered by a 30-day money-back guarantee.</p>
          </div>
        </div>

        <div className="rounded-2xl border-2 border-brand-dark bg-white p-5 shadow-xl shadow-slate-900/10 sm:p-8">
          {stage === "details" ? (
            <form onSubmit={continueToPayment} noValidate>
              <div className="flex items-center gap-2 text-sm font-extrabold uppercase tracking-[0.12em] text-brand"><LockKeyhole className="h-4 w-4" />Secure checkout</div>
              <h3 className="mt-3 text-2xl font-bold">Where should we send your guide?</h3>
              <div className="mt-6 grid gap-5">
                <label className="grid gap-2 text-base font-bold">Email address
                  <input required type="email" autoComplete="email" inputMode="email" value={form.email} onChange={(event) => update("email", event.target.value)} className="min-h-14 w-full rounded-lg border border-slate-400 bg-white px-4 text-lg font-normal text-ink outline-none focus:border-brand focus:ring-2 focus:ring-brand/25" />
                </label>
                <div className="grid gap-5 sm:grid-cols-[1fr_9rem]">
                  <label className="grid gap-2 text-base font-bold">First name
                    <input required autoComplete="given-name" value={form.firstName} onChange={(event) => update("firstName", event.target.value)} className="min-h-14 w-full rounded-lg border border-slate-400 bg-white px-4 text-lg font-normal text-ink outline-none focus:border-brand focus:ring-2 focus:ring-brand/25" />
                  </label>
                  <label className="grid gap-2 text-base font-bold">ZIP code
                    <input required autoComplete="postal-code" inputMode="numeric" maxLength={10} value={form.zip} onChange={(event) => update("zip", event.target.value)} className="min-h-14 w-full rounded-lg border border-slate-400 bg-white px-4 text-lg font-normal text-ink outline-none focus:border-brand focus:ring-2 focus:ring-brand/25" />
                  </label>
                </div>
                <label className="grid gap-2 text-base font-bold">State
                  <select required autoComplete="address-level1" value={form.state} onChange={(event) => update("state", event.target.value)} className="min-h-14 w-full rounded-lg border border-slate-400 bg-white px-4 text-lg font-normal text-ink outline-none focus:border-brand focus:ring-2 focus:ring-brand/25">
                    <option value="">Choose your state</option>
                    {US_STATES.map((state) => <option key={state.code} value={state.code}>{state.name}</option>)}
                  </select>
                </label>
              </div>
              {error && <p role="alert" className="mt-5 rounded-lg border border-red-300 bg-red-50 p-3 font-semibold text-red-800">{error}</p>}
              <button disabled={busy} className="mt-6 min-h-16 w-full rounded-xl bg-brand-dark px-5 py-4 text-lg font-extrabold text-white shadow-md transition hover:bg-brand disabled:cursor-wait disabled:opacity-70">
                {busy ? "Preparing secure payment…" : "Continue to secure payment"}
              </button>
              <p className="mt-4 text-center text-sm leading-6 text-slate-500">Your card details stay inside Stripe’s encrypted payment form.</p>
            </form>
          ) : (
            <form onSubmit={pay}>
              <div className="flex items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 text-sm font-extrabold uppercase tracking-[0.12em] text-brand"><LockKeyhole className="h-4 w-4" />Secure checkout</div>
                  <h3 className="mt-2 text-2xl font-bold">Payment</h3>
                </div>
                <button type="button" onClick={editDetails} className="text-sm font-bold text-brand underline">Edit details</button>
              </div>
              <div className="mt-5 rounded-xl bg-surface p-4 text-base">
                <div className="flex justify-between gap-3"><span>The Benefits Checklist</span><strong>{dollars(intent?.subtotal ?? 4700)}</strong></div>
                <div className="mt-2 flex justify-between gap-3 text-slate-600"><span>Sales tax</span><span>{dollars(intent?.tax ?? 0)}</span></div>
                <div className="mt-3 flex justify-between gap-3 border-t border-slate-300 pt-3 text-lg font-extrabold"><span>Total</span><span>{dollars(intent?.total ?? 4700)}</span></div>
              </div>
              <div ref={paymentHost} className="mt-6 min-h-28" />
              {error && <p role="alert" className="mt-5 rounded-lg border border-red-300 bg-red-50 p-3 font-semibold text-red-800">{error}</p>}
              <button disabled={paying || !stripeReady} className="mt-6 min-h-16 w-full rounded-xl bg-[#167A4A] px-5 py-4 text-xl font-extrabold text-white shadow-md transition hover:bg-[#0E633A] disabled:cursor-wait disabled:opacity-70">
                {paying ? "Processing payment…" : `Pay ${dollars(intent?.total ?? 4700)} and get instant access`}
              </button>
              <p className="mt-4 text-center text-sm leading-6 text-slate-500">Processed securely by Stripe on RetireShield.</p>
            </form>
          )}
        </div>
      </div>
    </section>
  );
}
