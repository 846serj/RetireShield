"use client";

import { Suspense, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";

type Plan = "annual" | "monthly";

const PLAN_LABEL: Record<Plan, string> = {
  annual: "annual",
  monthly: "monthly",
};

// Phase 6 compliance lives here: conspicuous auto-renew terms + explicit consent before Checkout.
function UpgradeContent() {
  const searchParams = useSearchParams();
  const selectedPlan = useMemo<Plan>(() => {
    return searchParams.get("plan") === "monthly" ? "monthly" : "annual";
  }, [searchParams]);

  const [consent, setConsent] = useState(false);
  const [loading, setLoading] = useState<Plan | "">("");
  const [error, setError] = useState("");

  async function checkout(plan: Plan) {
    setError("");

    if (!consent) {
      setError(`Please check the auto-renew consent box before continuing with the ${PLAN_LABEL[plan]} plan.`);
      document.getElementById("auto-renew-consent")?.focus();
      return;
    }

    setLoading(plan);
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan }),
      });
      const payload = await res.json().catch(() => ({}));

      if (payload.url) {
        window.location.href = payload.url;
        return;
      }

      if (payload.redirectTo) {
        window.location.href = payload.redirectTo;
        return;
      }

      setError(payload.error || "We could not start checkout. Please try again.");
    } catch {
      setError("We could not reach checkout. Please check your connection and try again.");
    } finally {
      setLoading("");
    }
  }

  return (
    <div className="mx-auto max-w-xl px-4 py-12">
      <h1 className="text-3xl font-bold mb-6">Let RetireShield watch your retirement</h1>

      <div className={`rounded-2xl border-2 p-6 mb-4 ${selectedPlan === "annual" ? "border-brand" : "border-slate-200"}`}>
        <div className="text-2xl font-extrabold">Premium — $199/year</div>
        <p className="text-slate-600 mt-1">3-day free trial. Then $199/year, automatically, unless you cancel. Cancel anytime in one click.</p>
        <button
          disabled={loading !== ""} onClick={() => checkout("annual")}
          className="mt-4 w-full rounded-xl bg-brand px-6 py-3 text-lg font-bold text-white disabled:opacity-50"
        >
          {loading === "annual" ? "Starting checkout…" : "Start 3-day free trial"}
        </button>
      </div>

      <div className={`rounded-2xl border-2 p-6 mb-6 ${selectedPlan === "monthly" ? "border-brand" : "border-slate-200"}`}>
        <div className="text-xl font-bold">Or pay monthly — $29/month</div>
        <button
          disabled={loading !== ""} onClick={() => checkout("monthly")}
          className="mt-3 w-full rounded-xl border-2 border-slate-300 px-6 py-3 font-bold disabled:opacity-50"
        >
          {loading === "monthly" ? "Starting checkout…" : "Choose monthly"}
        </button>
      </div>

      <label className="flex items-start gap-3 text-sm text-slate-700">
        <input
          id="auto-renew-consent"
          type="checkbox"
          checked={consent}
          onChange={(e) => {
            setConsent(e.target.checked);
            if (e.target.checked) setError("");
          }}
          className="mt-1 h-5 w-5"
        />
        <span>
          I understand my plan renews automatically and I will be charged unless I cancel before the trial/term
          ends. I can cancel anytime. See <a href="/terms" className="underline">Terms</a>,{" "}
          <a href="/refund-policy" className="underline">Refund Policy</a>, and <a href="/privacy" className="underline">Privacy</a>.
        </span>
      </label>
      {error && <p className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-bad">{error}</p>}
      <p className="mt-4 text-xs text-slate-500">
        ⚠️ Phase 6: a lawyer must review this exact copy + the consent/reminder/cancel flow before charging real customers.
      </p>
    </div>
  );
}

export default function Upgrade() {
  return (
    <Suspense fallback={<div className="mx-auto max-w-xl px-4 py-12">Loading upgrade options…</div>}>
      <UpgradeContent />
    </Suspense>
  );
}
