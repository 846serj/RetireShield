"use client";

import { FormEvent, useMemo, useState } from "react";
import Link from "next/link";
import DecisionCard from "@/components/DecisionCard";
import type { DecisionResult } from "@/lib/engine/affordability";

type Template = "purchase" | "gift" | "trip" | "car" | "repair" | "else";
type ApiResult = DecisionResult & { safeToSpend?: { annualDiscretionarySpend?: number | null; needsProfile?: boolean } };

const templates: { id: Template; label: string }[] = [
  { id: "purchase", label: "A big purchase" },
  { id: "gift", label: "Help family/a gift" },
  { id: "trip", label: "A trip" },
  { id: "car", label: "A new car" },
  { id: "repair", label: "A home repair" },
  { id: "else", label: "Something else" },
];

function money(value?: number | null) {
  return Number.isFinite(Number(value)) ? new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(Number(value)) : "—";
}

export default function AskClient({ initialPrompt, initialSafeMonthly, horizonAge, connected, profileComplete, recent }: { initialPrompt?: string; initialSafeMonthly?: number | null; horizonAge?: number | null; connected: boolean; profileComplete: boolean; recent: { id: string; verdict: string; created_at: string; input?: { amount?: number; timing?: string } | null }[] }) {
  const [template, setTemplate] = useState<Template>("purchase");
  const [amount, setAmount] = useState("");
  const [timing, setTiming] = useState<"oneoff" | "recurring">("oneoff");
  const [fundingSource, setFundingSource] = useState("auto");
  const [carMode, setCarMode] = useState<"cash" | "financed">("cash");
  const [result, setResult] = useState<ApiResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const effectiveTiming = useMemo(() => template === "car" && carMode === "financed" ? "recurring" : timing, [template, carMode, timing]);
  const selectedTemplate = templates.find((item) => item.id === template);
  const templateLabel = selectedTemplate?.label.replace(/^A\s+/i, "").replace(/^Help family\/a gift$/i, "family gift").toLowerCase() ?? "purchase";
  const showTiming = ["gift", "trip", "else"].includes(template);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setLoading(true); setError(null); setResult(null);
    try {
      const response = await fetch("/api/decision", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ kind: "spend", amount: Number(amount), timing: effectiveTiming, fundingSource, label: templateLabel }) });
      const json = await response.json();
      if (!response.ok && !json.needsProfile) throw new Error(json.error || "We couldn't check this right now.");
      setResult(json);
    } catch (err) {
      setError(err instanceof Error ? err.message : "We couldn't check this right now.");
    } finally { setLoading(false); }
  }

  return (
    <div className="mx-auto max-w-6xl py-6 sm:py-10">
      <section className="mb-6 rounded-3xl border border-brand/20 bg-band p-4 shadow-sm sm:p-5">
        {profileComplete ? <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xl font-extrabold text-ink">Safe to spend this year: {money(initialSafeMonthly)}/mo · money lasts to age {horizonAge ?? "—"}</p>
          <div className="flex flex-wrap items-center gap-3"><span className="text-sm font-bold text-slate-600">{connected ? "Based on your connected accounts" : "Based on your saved profile"}</span><button form="ask-form" className="rounded-xl border-2 border-brand bg-white px-4 py-2 font-extrabold text-brand">Recheck</button></div>
        </div> : <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xl font-extrabold text-ink">Complete your details to see safe-to-spend guidance.</p>
          <Link href="/dashboard/tools/plan/setup" className="rounded-xl border-2 border-brand bg-white px-4 py-2 text-center font-extrabold text-brand">Add profile details</Link>
        </div>}
      </section>

      <div className="mb-8 max-w-3xl"><p className="rg-kicker">Ask before you spend</p><h1 className="mt-3 text-5xl sm:text-7xl">{initialPrompt ?? "What are you thinking about?"}</h1><p className="mt-4 text-xl text-slate-700">Pick a template, add the amount, choose one-off or recurring, set the funding source, and get a plain-English retirement decision card.</p></div>

      <section className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        <form id="ask-form" onSubmit={submit} className="rg-card space-y-5">
          <div className="flex flex-wrap gap-2">{templates.map((item) => <button key={item.id} type="button" onClick={() => setTemplate(item.id)} className={`rounded-full border px-4 py-2 text-base font-extrabold ${template === item.id ? "border-brand bg-brand text-white" : "border-slate-200 bg-white text-ink"}`}>{item.label}</button>)}</div>
          <label className="block"><span className="text-lg font-extrabold">Amount</span><input className="rg-input mt-2 text-2xl font-bold" inputMode="decimal" required min="1" type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="25000" /></label>
          {showTiming ? <div><p className="text-lg font-extrabold">Timing</p><div className="mt-2 grid grid-cols-2 gap-2"><button type="button" onClick={() => setTiming("oneoff")} className={`rounded-xl border-2 p-3 font-extrabold ${timing === "oneoff" ? "border-brand bg-band" : "border-slate-200"}`}>One-off</button><button type="button" onClick={() => setTiming("recurring")} className={`rounded-xl border-2 p-3 font-extrabold ${timing === "recurring" ? "border-brand bg-band" : "border-slate-200"}`}>Recurring / yr</button></div></div> : null}
          {template === "car" ? <div><p className="text-lg font-extrabold">Car payment style</p><div className="mt-2 grid grid-cols-2 gap-2"><button type="button" onClick={() => setCarMode("cash")} className={`rounded-xl border-2 p-3 font-extrabold ${carMode === "cash" ? "border-brand bg-band" : "border-slate-200"}`}>Cash</button><button type="button" onClick={() => setCarMode("financed")} className={`rounded-xl border-2 p-3 font-extrabold ${carMode === "financed" ? "border-brand bg-band" : "border-slate-200"}`}>Financed / yr</button></div></div> : null}
          <label className="block"><span className="text-lg font-extrabold">Funding source</span><select className="rg-input mt-2" value={fundingSource} onChange={(e) => setFundingSource(e.target.value)}><option value="auto">Auto</option><option value="taxable">Taxable</option><option value="tax_deferred">Tax-deferred</option><option value="roth">Roth</option><option value="cash">Cash</option></select></label>
          <button disabled={loading} className="min-h-16 w-full rounded-2xl bg-brand px-6 py-4 text-xl font-extrabold text-white disabled:opacity-60">{loading ? "Checking…" : "Check this decision"}</button>
          {error ? <p className="rounded-2xl bg-red-50 p-4 font-bold text-red-700">{error}</p> : null}
        </form>

        <aside className="rg-card h-fit"><p className="rg-kicker">Recent questions</p>{recent.length ? <div className="mt-4 space-y-3">{recent.map((item) => <div key={item.id} className="rounded-2xl border border-slate-200 p-4"><p className="font-extrabold">{item.verdict} · {money(item.input?.amount)}</p><p className="text-sm font-semibold text-slate-500">{new Date(item.created_at).toLocaleDateString()}</p></div>)}</div> : <p className="mt-4 text-slate-700">Saved recent questions are available for Plus members.</p>}<Link href="/upgrade" className="mt-4 inline-flex font-extrabold">Save decisions with Plus →</Link></aside>
      </section>

      <div className="mt-8">{loading ? <div className="rg-card animate-pulse text-2xl font-extrabold">Building your Decision Card…</div> : result ? <DecisionCard result={result} /> : <div className="rg-card text-xl text-slate-700">Your Decision Card will appear here after you ask.</div>}</div>
    </div>
  );
}
