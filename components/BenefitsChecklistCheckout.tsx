"use client";

import Script from "next/script";
import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { Check, LockKeyhole } from "lucide-react";
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

export function BenefitsChecklistCheckout({
  attribution,
  statePacksReady,
}: {
  attribution: Record<string, string>;
  statePacksReady: boolean;
}) {
  const [stripeReady, setStripeReady] = useState(false);
  const [stage, setStage] = useState<"details" | "payment">("details");
  const [busy, setBusy] = useState(false);
  const [paying, setPaying] = useState(false);
  const [error, setError] = useState("");
  const [intent, setIntent] = useState<IntentResponse | null>(null);
  const [statePack, setStatePack] = useState(false);
  const [form, setForm] = useState({ email: "", firstName: "", zip: "", state: "" });
  const paymentHost = useRef<HTMLDivElement>(null);
  const stripeClient = useRef<StripeClient | null>(null);
  const stripeElements = useRef<StripeElements | null>(null);
  const paymentElement = useRef<StripeElement | null>(null);
  const requestId = useMemo(() => typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`, []);
  const stateName = US_STATES.find((item) => item.code === form.state)?.name || "your state";
  const shownSubtotal = 4_700 + (statePack ? 2_700 : 0);

  useEffect(() => {
    if (stage !== "payment" || !intent || !stripeReady || !window.Stripe || !paymentHost.current || paymentElement.current) return;
    const client = window.Stripe(intent.publishableKey);
    const elements = client.elements({
      clientSecret: intent.clientSecret,
      appearance: {
        theme: "stripe",
        variables: { colorPrimary: "#163A66", colorText: "#111827", borderRadius: "7px", fontSizeBase: "18px", spacingUnit: "5px" },
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
    if (field === "state" && !value) setStatePack(false);
  }

  async function continueToPayment(event: FormEvent) {
    event.preventDefault();
    setError("");
    setBusy(true);
    try {
      const response = await fetch("/api/benefits-checklist/payment-intent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, statePack, requestId, attribution }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || "We could not start checkout.");
      setIntent(payload as IntentResponse);
      setStage("payment");
      requestAnimationFrame(() => document.getElementById("secure-checkout")?.scrollIntoView({ behavior: "smooth", block: "start" }));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "We could not start checkout.");
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
      setError("The payment box is still loading. Please wait a moment.");
      return;
    }
    setError("");
    setPaying(true);
    try {
      const result = await stripeClient.current.confirmPayment({
        elements: stripeElements.current,
        confirmParams: {
          return_url: intent.returnUrl,
          payment_method_data: { billing_details: { name: form.firstName, email: form.email, address: { country: "US", postal_code: form.zip, state: form.state } } },
        },
        redirect: "if_required",
      });
      if (result.error) throw new Error(result.error.message || "That payment did not go through. You were not charged.");
      if (result.paymentIntent?.status === "succeeded") {
        const completed = new URL(intent.returnUrl);
        completed.searchParams.set("payment_intent", result.paymentIntent.id);
        window.location.assign(completed.toString());
        return;
      }
      throw new Error("Stripe is still working on the payment. Check your email for your receipt and links.");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "That payment did not go through. You were not charged.");
      setPaying(false);
    }
  }

  return (
    <section className="border-y border-slate-200 bg-[#F4F7FB] px-4 py-10 sm:px-6 sm:py-14">
      <Script src="https://js.stripe.com/v3/" strategy="afterInteractive" onLoad={() => setStripeReady(true)} />
      <div id="secure-checkout" className="mx-auto max-w-xl scroll-mt-20 rounded-xl border-2 border-brand-dark bg-white p-5 shadow-xl shadow-slate-900/10 sm:p-8">
        <div className="flex items-center gap-2 text-sm font-extrabold uppercase tracking-[0.1em] text-brand"><LockKeyhole className="h-4 w-4" />Secure checkout</div>
        <div className="mt-4 flex flex-wrap items-end gap-x-4 gap-y-1">
          <span className="text-base font-bold text-slate-500">Normal price <s>$97.00</s></span>
          <strong className="font-serif text-5xl leading-none text-brand-dark">$47.00</strong>
        </div>
        <p className="mt-3 rounded-lg bg-[#F1FAF5] px-4 py-3 font-bold text-[#0E633A]">You save $50 off the normal $97 price.</p>

        <div className="mt-5 rounded-lg border border-slate-200 bg-slate-50 p-4">
          <div className="flex justify-between gap-4"><span>The Benefits Checklist</span><strong>$47.00</strong></div>
          {statePack && <div className="mt-2 flex justify-between gap-4"><span>{stateName} State Pack</span><strong>$27.00</strong></div>}
          <div className="mt-3 flex justify-between gap-4 border-t border-slate-300 pt-3 text-lg font-extrabold"><span>{stage === "payment" ? "Total" : "Price before tax"}</span><span>{dollars(intent?.total ?? shownSubtotal)}</span></div>
          {stage === "details" && <p className="mt-2 text-sm text-slate-600">We show any sales tax before you pay.</p>}
        </div>

        {stage === "details" ? (
          <form className="mt-6" onSubmit={continueToPayment} noValidate>
            <p className="text-lg font-extrabold">1. Where should we send your guide?</p>
            <div className="mt-4 grid gap-4">
              <label className="grid gap-2 text-base font-bold">Email address
                <input required type="email" autoComplete="email" inputMode="email" value={form.email} onChange={(event) => update("email", event.target.value)} className="min-h-14 w-full rounded-lg border border-slate-400 bg-white px-4 text-lg font-normal text-ink outline-none focus:border-brand focus:ring-2 focus:ring-brand/25" />
              </label>
              <div className="grid gap-4 sm:grid-cols-[1fr_9rem]">
                <label className="grid gap-2 text-base font-bold">First name
                  <input required autoComplete="given-name" value={form.firstName} onChange={(event) => update("firstName", event.target.value)} className="min-h-14 w-full rounded-lg border border-slate-400 bg-white px-4 text-lg font-normal text-ink outline-none focus:border-brand focus:ring-2 focus:ring-brand/25" />
                </label>
                <label className="grid gap-2 text-base font-bold">ZIP code
                  <input required autoComplete="postal-code" inputMode="numeric" maxLength={10} value={form.zip} onChange={(event) => update("zip", event.target.value)} className="min-h-14 w-full rounded-lg border border-slate-400 bg-white px-4 text-lg font-normal text-ink outline-none focus:border-brand focus:ring-2 focus:ring-brand/25" />
                </label>
              </div>
              <label className="grid gap-2 text-base font-bold">Which state do you want help for?
                <select required autoComplete="address-level1" value={form.state} onChange={(event) => update("state", event.target.value)} className="min-h-14 w-full rounded-lg border border-slate-400 bg-white px-4 text-lg font-normal text-ink outline-none focus:border-brand focus:ring-2 focus:ring-brand/25">
                  <option value="">Choose your state</option>
                  {US_STATES.map((state) => <option key={state.code} value={state.code}>{state.name}</option>)}
                </select>
                <span className="text-sm font-normal leading-5 text-slate-600">Some rules and forms change by state. Pick the state where the person lives.</span>
              </label>
            </div>

            {statePacksReady && form.state && (
              <label className="mt-5 flex cursor-pointer gap-3 rounded-lg border-2 border-dashed border-[#167A4A] bg-[#F1FAF5] p-4">
                <input type="checkbox" checked={statePack} onChange={(event) => setStatePack(event.target.checked)} className="mt-1 h-6 w-6 shrink-0 accent-[#167A4A]" />
                <span>
                  <strong className="block text-lg">Add the {stateName} State Pack for $27</strong>
                  <span className="mt-1 block text-base leading-6 text-slate-700">Get 13–15 pages of state limits, local programs, dates, phone numbers, and short call scripts. This box starts off.</span>
                </span>
              </label>
            )}

            {error && <p role="alert" className="mt-5 rounded-lg border border-red-300 bg-red-50 p-3 font-semibold text-red-800">{error}</p>}
            <button disabled={busy} className="mt-6 min-h-16 w-full rounded-lg bg-brand-dark px-5 py-4 text-xl font-extrabold text-white shadow-md transition hover:bg-brand disabled:cursor-wait disabled:opacity-70">
              {busy ? "Loading card form…" : `Continue to card payment — ${dollars(shownSubtotal)}`}
            </button>
          </form>
        ) : (
          <form className="mt-6" onSubmit={pay}>
            <div className="flex items-center justify-between gap-4">
              <p className="text-lg font-extrabold">2. Pay by card</p>
              <button type="button" onClick={editDetails} className="text-sm font-bold text-brand underline">Change details</button>
            </div>
            <div ref={paymentHost} className="mt-4 min-h-28" />
            {error && <p role="alert" className="mt-5 rounded-lg border border-red-300 bg-red-50 p-3 font-semibold text-red-800">{error}</p>}
            <button disabled={paying || !stripeReady} className="mt-6 min-h-16 w-full rounded-lg bg-[#167A4A] px-5 py-4 text-xl font-extrabold text-white shadow-md transition hover:bg-[#0E633A] disabled:cursor-wait disabled:opacity-70">
              {paying ? "Sending payment…" : `Buy now — ${dollars(intent?.total ?? shownSubtotal)}`}
            </button>
          </form>
        )}

        <ul className="mt-6 space-y-2 border-t border-slate-200 pt-5 text-sm leading-6 text-slate-700">
          <li className="flex gap-2"><Check className="mt-1 h-4 w-4 shrink-0 text-[#167A4A]" />30-day refund. Just reply to your receipt.</li>
          <li className="flex gap-2"><Check className="mt-1 h-4 w-4 shrink-0 text-[#167A4A]" />Your files show after you pay and come by email.</li>
          <li className="flex gap-2"><Check className="mt-1 h-4 w-4 shrink-0 text-[#167A4A]" />Stripe handles your card. RetireShield does not store it.</li>
        </ul>
      </div>
    </section>
  );
}
