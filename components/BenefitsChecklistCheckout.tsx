"use client";

import Script from "next/script";
import { FormEvent, useEffect, useRef, useState } from "react";
import { Check, LockKeyhole } from "lucide-react";
import { US_STATES } from "@/lib/usStates";
import { captureCommerce, commerceAnalyticsId, commerceAttribution } from "@/lib/commerceAnalytics";
const BENEFITS_CHECKLIST_PRODUCT = "benefits-checklist";

type StripeError = { message?: string };
type StripeElementEvent = {
  availablePaymentMethods?: Record<string, boolean>;
  resolve?: (options?: Record<string, unknown>) => void;
  paymentFailed?: (options?: Record<string, unknown>) => void;
};
type StripeElement = {
  mount: (target: HTMLElement) => void;
  destroy: () => void;
  on?: (event: string, callback: (event: StripeElementEvent) => void) => void;
};
type StripeElements = {
  create: (type: "payment" | "expressCheckout", options?: Record<string, unknown>) => StripeElement;
  submit: () => Promise<{ error?: StripeError }>;
  update: (options: Record<string, unknown>) => void;
};
type StripeResult = { error?: StripeError; paymentIntent?: { id: string; status: string } };
type StripeClient = {
  elements: (options: Record<string, unknown>) => StripeElements;
  confirmPayment: (options: Record<string, unknown>) => Promise<StripeResult>;
};

type IntentResponse = {
  clientSecret: string;
  paymentIntentId: string;
  subtotal: number;
  tax: number;
  total: number;
  returnUrl: string;
};

type Quote = { key: string; subtotal: number; tax: number; total: number };
type Buyer = { email: string; firstName: string; zip: string; state: string };

function dollars(cents: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(cents / 100);
}

function newRequestId() {
  return typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function BenefitsChecklistCheckout({
  attribution,
  statePacksReady,
  stripePublishableKey,
}: {
  attribution: Record<string, string>;
  statePacksReady: boolean;
  stripePublishableKey: string;
}) {
  const [stripeReady, setStripeReady] = useState(false);
  const [paymentReady, setPaymentReady] = useState(false);
  const [expressReady, setExpressReady] = useState(false);
  const [paying, setPaying] = useState(false);
  const [error, setError] = useState("");
  const [intent, setIntent] = useState<IntentResponse | null>(null);
  const [quote, setQuote] = useState<Quote | null>(null);
  const [quoteLoading, setQuoteLoading] = useState(false);
  const [statePack, setStatePack] = useState(false);
  const [form, setForm] = useState<Buyer>({ email: "", firstName: "", zip: "", state: "" });
  const formHost = useRef<HTMLFormElement>(null);
  const paymentHost = useRef<HTMLDivElement>(null);
  const expressHost = useRef<HTMLDivElement>(null);
  const stripeClient = useRef<StripeClient | null>(null);
  const stripeElements = useRef<StripeElements | null>(null);
  const paymentElement = useRef<StripeElement | null>(null);
  const expressElement = useRef<StripeElement | null>(null);
  const checkoutState = useRef({ form, statePack, attribution });
  const payingNow = useRef(false);
  const checkoutStarted = useRef(false);
  const stateName = US_STATES.find((item) => item.code === form.state)?.name || "your state";
  const shownSubtotal = 4_700 + (statePack ? 2_700 : 0);
  const quoteKey = `${form.zip.trim()}|${form.state}|${statePack ? 1 : 0}`;
  const currentQuote = quote?.key === quoteKey ? quote : null;
  const shownTotal = intent?.total ?? currentQuote?.total ?? shownSubtotal;

  checkoutState.current = { form, statePack, attribution };

  useEffect(() => {
    const stripeFactory = (window as unknown as { Stripe?: (key: string) => StripeClient }).Stripe;
    if (!stripeReady || !stripePublishableKey || !stripeFactory || !paymentHost.current || paymentElement.current) return;

    const client = stripeFactory(stripePublishableKey);
    const elements = client.elements({
      mode: "payment",
      amount: 4_700,
      currency: "usd",
      paymentMethodTypes: ["card"],
      appearance: {
        theme: "stripe",
        variables: { colorPrimary: "#163A66", colorText: "#111827", borderRadius: "7px", fontSizeBase: "18px", spacingUnit: "5px" },
      },
    });
    const payment = elements.create("payment", {
      layout: { type: "accordion", defaultCollapsed: false, radios: "if_multiple", spacedAccordionItems: true },
      fields: { billingDetails: { name: "never", email: "never", address: { country: "never", postalCode: "never" } } },
    });
    payment.mount(paymentHost.current);

    let express: StripeElement | null = null;
    if (expressHost.current) {
      express = elements.create("expressCheckout", {
        buttonHeight: 52,
        layout: { maxColumns: 1, maxRows: 3 },
        paymentMethods: { applePay: "auto", googlePay: "auto", link: "auto", amazonPay: "never", paypal: "never", klarna: "never" },
      });
      express.on?.("ready", (event) => setExpressReady(Boolean(event.availablePaymentMethods)));
      express.on?.("click", (event) => {
        if (!formHost.current?.reportValidity()) return;
        event.resolve?.({ business: { name: "RetireShield" } });
      });
      express.on?.("confirm", (event) => void runPayment(event));
      express.mount(expressHost.current);
    }

    stripeClient.current = client;
    stripeElements.current = elements;
    paymentElement.current = payment;
    expressElement.current = express;
    setPaymentReady(true);

    return () => {
      payment.destroy();
      express?.destroy();
      paymentElement.current = null;
      expressElement.current = null;
      stripeElements.current = null;
      stripeClient.current = null;
      setPaymentReady(false);
      setExpressReady(false);
    };
    // Stripe Elements must mount once; price changes are sent through elements.update below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stripePublishableKey, stripeReady]);

  useEffect(() => {
    stripeElements.current?.update({ amount: shownTotal });
  }, [shownTotal]);

  useEffect(() => {
    const zip = form.zip.trim();
    if (!/^\d{5}(?:-\d{4})?$/.test(zip) || !form.state) {
      setQuote(null);
      setQuoteLoading(false);
      return;
    }

    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setQuoteLoading(true);
      try {
        const response = await fetch("/api/benefits-checklist/quote", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ zip, state: form.state, statePack }),
          signal: controller.signal,
        });
        const payload = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(payload.error || "We could not check sales tax.");
        setQuote({ key: quoteKey, subtotal: payload.subtotal, tax: payload.tax, total: payload.total });
      } catch (caught) {
        if (!controller.signal.aborted) setError(caught instanceof Error ? caught.message : "We could not check sales tax.");
      } finally {
        if (!controller.signal.aborted) setQuoteLoading(false);
      }
    }, 350);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [form.state, form.zip, quoteKey, statePack]);

  function update(field: keyof Buyer, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
    setIntent(null);
    setError("");
    if (field === "state" && !value) setStatePack(false);
  }

  function changeStatePack(checked: boolean) {
    setStatePack(checked);
    setIntent(null);
    setError("");
    captureCommerce("rgc_bump_changed", BENEFITS_CHECKLIST_PRODUCT, { accepted: checked }, attribution);
  }

  async function runPayment(expressEvent?: StripeElementEvent) {
    if (payingNow.current) return;
    if (!formHost.current?.reportValidity()) {
      expressEvent?.paymentFailed?.({ reason: "fail" });
      return;
    }
    if (!stripeClient.current || !stripeElements.current) {
      setError("The secure payment box is still loading. Please wait a moment.");
      expressEvent?.paymentFailed?.({ reason: "fail" });
      return;
    }

    payingNow.current = true;
    setPaying(true);
    setError("");
    const paymentMethod = expressEvent ? "wallet" : "card";
    captureCommerce("rgc_payment_attempted", BENEFITS_CHECKLIST_PRODUCT, { payment_method: paymentMethod, bump: checkoutState.current.statePack }, attribution);
    try {
      const submitted = await stripeElements.current.submit();
      if (submitted.error) throw new Error(submitted.error.message || "Please check your payment details.");

      const current = checkoutState.current;
      const response = await fetch("/api/benefits-checklist/payment-intent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...current.form,
          statePack: current.statePack,
          requestId: newRequestId(),
          analyticsId: commerceAnalyticsId(current.attribution),
          attribution: commerceAttribution(current.attribution),
        }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || "We could not start checkout.");
      const nextIntent = payload as IntentResponse;
      setIntent(nextIntent);
      stripeElements.current.update({ amount: nextIntent.total });

      const result = await stripeClient.current.confirmPayment({
        elements: stripeElements.current,
        clientSecret: nextIntent.clientSecret,
        confirmParams: {
          return_url: nextIntent.returnUrl,
          payment_method_data: {
            billing_details: {
              name: current.form.firstName,
              email: current.form.email,
              address: { country: "US", postal_code: current.form.zip, state: current.form.state },
            },
          },
        },
        redirect: "if_required",
      });
      if (result.error) throw new Error(result.error.message || "That payment did not go through. You were not charged.");
      if (result.paymentIntent?.status === "succeeded") {
        const completed = new URL(nextIntent.returnUrl);
        completed.searchParams.set("payment_intent", result.paymentIntent.id);
        window.location.assign(completed.toString());
        return;
      }
      throw new Error("Stripe is still working on the payment. Check your email for your receipt and links.");
    } catch (caught) {
      captureCommerce("rgc_payment_failed", BENEFITS_CHECKLIST_PRODUCT, { payment_method: paymentMethod }, attribution);
      setError(caught instanceof Error ? caught.message : "That payment did not go through. You were not charged.");
      expressEvent?.paymentFailed?.({ reason: "fail" });
      payingNow.current = false;
      setPaying(false);
    }
  }

  function pay(event: FormEvent) {
    event.preventDefault();
    void runPayment();
  }

  return (
    <section className="border-y border-slate-200 bg-[#F4F7FB] px-4 py-10 sm:px-6 sm:py-14">
      <Script src="https://js.stripe.com/v3/" strategy="afterInteractive" onLoad={() => setStripeReady(true)} onReady={() => setStripeReady(true)} />
      <div id="secure-checkout" className="mx-auto max-w-xl scroll-mt-20 rounded-xl border-2 border-brand-dark bg-white p-5 shadow-xl shadow-slate-900/10 sm:p-8">
        <div className="flex items-center gap-2 text-sm font-extrabold uppercase tracking-[0.1em] text-brand"><LockKeyhole className="h-4 w-4" />Secure checkout</div>
        <div className="mt-4 flex flex-wrap items-end gap-x-4 gap-y-1">
          <span className="text-base font-bold text-slate-500">Normal price <s>$97.00</s></span>
          <strong className="font-serif text-5xl leading-none text-brand-dark">$47.00</strong>
        </div>
        <p className="mt-3 rounded-lg bg-[#F1FAF5] px-4 py-3 font-bold text-[#0E633A]">You save $50 off the normal $97 price.</p>

        <div className="mt-5 rounded-lg border border-slate-200 bg-slate-50 p-4" aria-live="polite">
          <div className="flex justify-between gap-4"><span>The Benefits Checklist</span><strong>$47.00</strong></div>
          {statePack && <div className="mt-2 flex justify-between gap-4"><span>{stateName} State Pack</span><strong>$27.00</strong></div>}
          <div className="mt-2 flex justify-between gap-4 text-sm text-slate-600"><span>Sales tax</span><span>{quoteLoading ? "Checking…" : currentQuote ? dollars(currentQuote.tax) : "Enter your ZIP code"}</span></div>
          <div className="mt-3 flex justify-between gap-4 border-t border-slate-300 pt-3 text-lg font-extrabold"><span>Total</span><span>{dollars(shownTotal)}</span></div>
        </div>

        <form
          ref={formHost}
          className="mt-6"
          onSubmit={pay}
          onFocusCapture={() => {
            if (!checkoutStarted.current) {
              checkoutStarted.current = true;
              captureCommerce("rgc_checkout_started", BENEFITS_CHECKLIST_PRODUCT, {}, attribution);
            }
          }}
          noValidate
        >
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
                <input required autoComplete="postal-code" inputMode="numeric" pattern="[0-9]{5}(-[0-9]{4})?" title="Enter a 5-digit ZIP code" maxLength={10} value={form.zip} onChange={(event) => update("zip", event.target.value)} className="min-h-14 w-full rounded-lg border border-slate-400 bg-white px-4 text-lg font-normal text-ink outline-none focus:border-brand focus:ring-2 focus:ring-brand/25" />
              </label>
            </div>
            <label className="grid gap-2 text-base font-bold">Which state do you want help for?
              <select required autoComplete="address-level1" value={form.state} onChange={(event) => { update("state", event.target.value); if (event.target.value) captureCommerce("rgc_state_selected", BENEFITS_CHECKLIST_PRODUCT, {}, attribution); }} className="min-h-14 w-full rounded-lg border border-slate-400 bg-white px-4 text-lg font-normal text-ink outline-none focus:border-brand focus:ring-2 focus:ring-brand/25">
                <option value="">Choose your state</option>
                {US_STATES.map((state) => <option key={state.code} value={state.code}>{state.name}</option>)}
              </select>
              <span className="text-sm font-normal leading-5 text-slate-600">Some rules and forms change by state. Pick the state where the person lives.</span>
            </label>
          </div>

          {statePacksReady && form.state && (
            <label className="mt-5 flex cursor-pointer gap-3 rounded-lg border-2 border-dashed border-[#167A4A] bg-[#F1FAF5] p-4">
              <input type="checkbox" checked={statePack} onChange={(event) => changeStatePack(event.target.checked)} className="mt-1 h-6 w-6 shrink-0 accent-[#167A4A]" />
              <span>
                <strong className="block text-lg">Add the {stateName} State Pack for $27</strong>
                <span className="mt-1 block text-base leading-6 text-slate-700">Get 13–15 pages of state limits, local programs, dates, phone numbers, and short call scripts. This box starts off.</span>
              </span>
            </label>
          )}

          <div className={expressReady ? "mt-6" : "hidden"}>
            <p className="text-lg font-extrabold">2. Pay in one tap</p>
            <div ref={expressHost} className="mt-4 min-h-[52px]" />
            <div className="my-5 flex items-center gap-3 text-sm font-bold text-slate-500"><span className="h-px flex-1 bg-slate-300" /><span>or pay by card</span><span className="h-px flex-1 bg-slate-300" /></div>
          </div>
          <p className={expressReady ? "text-lg font-extrabold" : "mt-6 text-lg font-extrabold"}>2. Pay securely</p>
          <div ref={paymentHost} className="mt-4 min-h-32 rounded-lg" />
          {!stripePublishableKey && <p role="alert" className="mt-4 rounded-lg border border-red-300 bg-red-50 p-3 font-semibold text-red-800">Checkout is temporarily unavailable. Please contact support.</p>}
          {!paymentReady && stripePublishableKey && <p className="mt-3 text-sm text-slate-600">Loading the secure payment box…</p>}
          {error && <p role="alert" className="mt-5 rounded-lg border border-red-300 bg-red-50 p-3 font-semibold text-red-800">{error}</p>}
          <button disabled={paying || !paymentReady} className="mt-6 min-h-16 w-full rounded-lg bg-[#167A4A] px-5 py-4 text-xl font-extrabold text-white shadow-md transition hover:bg-[#0E633A] disabled:cursor-wait disabled:opacity-70">
            {paying ? "Sending payment…" : `Get the Benefits Checklist — ${dollars(shownTotal)}`}
          </button>
        </form>

        <ul className="mt-6 space-y-2 border-t border-slate-200 pt-5 text-sm leading-6 text-slate-700">
          <li className="flex gap-2"><Check className="mt-1 h-4 w-4 shrink-0 text-[#167A4A]" />30-day refund. Just reply to your receipt.</li>
          <li className="flex gap-2"><Check className="mt-1 h-4 w-4 shrink-0 text-[#167A4A]" />Your files show after you pay and come by email.</li>
          <li className="flex gap-2"><Check className="mt-1 h-4 w-4 shrink-0 text-[#167A4A]" />Stripe handles your card. RetireShield does not store it.</li>
        </ul>
      </div>
    </section>
  );
}
