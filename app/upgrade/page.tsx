"use client";

import { useState } from "react";

// Phase 6 compliance lives here: conspicuous auto-renew terms + explicit consent before Checkout.
export default function Upgrade() {
  const [consent, setConsent] = useState(false);
  const [loading, setLoading] = useState("");

  async function checkout(plan: "annual" | "monthly") {
    setLoading(plan);
    const res = await fetch("/api/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ plan }),
    });
    const { url } = await res.json();
    if (url) window.location.href = url;
    else setLoading("");
  }

  return (
    <div className="mx-auto max-w-xl px-4 py-12">
      <h1 className="text-3xl font-bold mb-6">Let RetireShield watch your retirement</h1>

      <div className="rounded-2xl border-2 border-brand p-6 mb-4">
        <div className="text-2xl font-extrabold">Premium — $199/year</div>
        <p className="text-slate-600 mt-1">3-day free trial. Then $199/year, automatically, unless you cancel. Cancel anytime in one click.</p>
        <button
          disabled={!consent || loading !== ""} onClick={() => checkout("annual")}
          className="mt-4 w-full rounded-xl bg-brand px-6 py-3 text-lg font-bold text-white disabled:opacity-50"
        >
          {loading === "annual" ? "…" : "Start 3-day free trial"}
        </button>
      </div>

      <div className="rounded-2xl border-2 border-slate-200 p-6 mb-6">
        <div className="text-xl font-bold">Or pay monthly — $29/month</div>
        <button
          disabled={!consent || loading !== ""} onClick={() => checkout("monthly")}
          className="mt-3 w-full rounded-xl border-2 border-slate-300 px-6 py-3 font-bold disabled:opacity-50"
        >
          {loading === "monthly" ? "…" : "Choose monthly"}
        </button>
      </div>

      <label className="flex items-start gap-3 text-sm text-slate-700">
        <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} className="mt-1 h-5 w-5" />
        <span>
          I understand my plan renews automatically and I will be charged unless I cancel before the trial/term
          ends. I can cancel anytime. See <a href="/terms" className="underline">Terms</a>,{" "}
          <a href="/refund-policy" className="underline">Refund Policy</a>, and <a href="/privacy" className="underline">Privacy</a>.
        </span>
      </label>
      <p className="mt-4 text-xs text-slate-500">
        ⚠️ Phase 6: a lawyer must review this exact copy + the consent/reminder/cancel flow before charging real customers.
      </p>
    </div>
  );
}
