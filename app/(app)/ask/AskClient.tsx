"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import type { CalculationTrace } from "@/lib/ai/coachNumbers";
import { AnswerRenderer } from "@/components/answer/AnswerCharts";

type CoachResult = { answer: string; calculations?: CalculationTrace[]; usage?: { remaining: number | null; cap: number | null } };
type RecentQuestion = { id: string; verdict: string; created_at: string; input?: { question?: string } | null; result?: { answer?: string } | null };

const starterQuestions = [
  "Can I afford a $25,000 remodel?",
  "Should I claim Social Security now or wait?",
  "Will my money last if the market drops?",
  "How much can I safely spend this year?",
  "Will a big withdrawal raise my Medicare?",
];

function money(value?: number | null) {
  return Number.isFinite(Number(value)) ? new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(Number(value)) : "—";
}

function shortSummary(answer?: string) {
  if (!answer) return "Coach answer saved";
  const firstLine = answer.split("\n").find(Boolean) ?? answer;
  return firstLine.length > 120 ? `${firstLine.slice(0, 117)}…` : firstLine;
}

function calculationLabel(calculation: CalculationTrace) {
  return calculation.tool.replace(/_/g, " ").replace(/\b\w/g, (char) => char.toUpperCase());
}

export default function AskClient({ initialPrompt, initialSafeMonthly, horizonAge, connected, profileComplete, recent }: { initialPrompt?: string; initialSafeMonthly?: number | null; horizonAge?: number | null; connected: boolean; profileComplete: boolean; recent: RecentQuestion[] }) {
  const [question, setQuestion] = useState("");
  const [result, setResult] = useState<CoachResult | null>(null);
  const [recentItems, setRecentItems] = useState(recent);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: FormEvent) {
    event.preventDefault();
    const trimmed = question.trim();
    if (!trimmed) {
      setError("Type a money question first.");
      return;
    }
    setLoading(true); setError(null); setResult(null);
    try {
      const response = await fetch("/api/coach", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ messages: [{ role: "user", content: trimmed }] }) });
      const json = await response.json();
      if (!response.ok) throw new Error(json.answer || json.error || "We couldn't ask the coach right now.");
      setResult(json);
      setRecentItems((items) => [{ id: `local-${Date.now()}`, verdict: shortSummary(json.answer), created_at: new Date().toISOString(), input: { question: trimmed }, result: { answer: json.answer } }, ...items].slice(0, 5));
    } catch (err) {
      setError(err instanceof Error ? err.message : "We couldn't ask the coach right now.");
    } finally { setLoading(false); }
  }

  return (
    <div className="mx-auto max-w-6xl py-6 sm:py-10">
      <section className="mb-6 rounded-3xl border border-brand/20 bg-band p-4 shadow-sm sm:p-5">
        {profileComplete ? <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xl font-extrabold text-ink">Safe to spend this year: {money(initialSafeMonthly)}/mo · money lasts to age {horizonAge ?? "—"}</p>
          <div className="flex flex-wrap items-center gap-3"><span className="text-sm font-bold text-slate-600">{connected ? "Based on your connected accounts" : "Based on your saved profile"}</span><button form="ask-form" className="rounded-xl border-2 border-brand bg-white px-4 py-2 font-extrabold text-brand">Recheck</button></div>
        </div> : <div className="space-y-4">
          <div>
            <p className="text-xl font-extrabold text-ink">Want a sharper answer? Set your numbers when you are ready.</p>
            <p className="mt-1 text-base font-semibold text-slate-700">You can still ask a question now. We will offer the quiz or account connection, not force it.</p>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            <a href="#ask-form" className="flex min-h-32 flex-col justify-center rounded-2xl border-2 border-brand bg-white p-5 text-ink no-underline shadow-sm transition hover:bg-band">
              <span className="text-2xl font-extrabold">Ask a question</span>
              <span className="mt-2 font-semibold text-slate-700">Ask in your own words about spending, withdrawals, Social Security, taxes, or market stress.</span>
            </a>
            <div className="flex min-h-32 flex-col justify-center rounded-2xl border-2 border-brand bg-white p-5 shadow-sm">
              <p className="text-2xl font-extrabold text-ink">Set your numbers</p>
              <p className="mt-2 font-semibold text-slate-700">Take the 2-minute quiz or connect your accounts for personalized guidance.</p>
              <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                <Link href="/quiz" className="inline-flex min-h-11 flex-1 items-center justify-center rounded-xl bg-brand px-4 py-2 text-center font-extrabold text-white no-underline">Take the quiz</Link>
                <Link href="/dashboard/accounts" className="inline-flex min-h-11 flex-1 items-center justify-center rounded-xl border-2 border-brand px-4 py-2 text-center font-extrabold text-brand no-underline">Connect accounts</Link>
              </div>
            </div>
          </div>
        </div>}
      </section>

      <div className="mb-8 max-w-3xl"><p className="rg-kicker">Ask anything</p><h1 className="mt-3 text-5xl sm:text-7xl">{initialPrompt ?? "What money question is on your mind?"}</h1><p className="mt-4 text-xl text-slate-700">Use plain English. The coach will answer from your saved numbers and show the calculation trace it used.</p></div>

      <section className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        <form id="ask-form" onSubmit={submit} className="rg-card space-y-5">
          <label className="block"><span className="text-lg font-extrabold">Your question</span><textarea className="rg-input mt-2 min-h-44 resize-y text-2xl font-bold leading-snug" required value={question} onChange={(e) => setQuestion(e.target.value)} placeholder="Ask anything about your money…" /></label>
          <div><p className="text-sm font-extrabold uppercase tracking-[0.14em] text-slate-500">Starter questions</p><div className="mt-3 flex flex-wrap gap-2">{starterQuestions.map((starter) => <button key={starter} type="button" onClick={() => { setQuestion(starter); setError(null); }} className="rounded-full border border-slate-200 bg-white px-4 py-2 text-left text-sm font-extrabold text-ink shadow-sm transition hover:border-brand hover:bg-band">{starter}</button>)}</div></div>
          <button disabled={loading} className="min-h-16 w-full rounded-2xl bg-brand px-6 py-4 text-xl font-extrabold text-white disabled:opacity-60">{loading ? "Asking the coach…" : "Ask the coach"}</button>
          {error ? <p className="rounded-2xl bg-red-50 p-4 font-bold text-red-700">{error}</p> : null}
        </form>

        <aside className="rg-card h-fit"><p className="rg-kicker">Recent questions</p>{recentItems.length ? <div className="mt-4 space-y-3">{recentItems.map((item) => <div key={item.id} className="rounded-2xl border border-slate-200 p-4"><p className="font-extrabold text-ink">{item.input?.question ?? "Money question"}</p><p className="mt-2 text-sm font-semibold text-slate-600">{item.verdict || shortSummary(item.result?.answer)}</p><p className="mt-2 text-sm font-semibold text-slate-500">{new Date(item.created_at).toLocaleDateString()}</p></div>)}</div> : <p className="mt-4 text-slate-700">Saved recent questions are available for Plus members.</p>}<Link href="/upgrade" className="mt-4 inline-flex font-extrabold">Save decisions with Plus →</Link></aside>
      </section>

      <div className="mt-8">{loading ? <div className="rg-card animate-pulse text-2xl font-extrabold">Building your answer…</div> : result ? <article className="rg-card space-y-6"><AnswerRenderer result={result} /><details className="rounded-2xl border border-slate-200 bg-slate-50 p-4"><summary className="cursor-pointer text-lg font-extrabold text-ink">How this was calculated</summary>{result.calculations?.length ? <div className="mt-4 space-y-4">{result.calculations.map((calculation, index) => <div key={`${calculation.tool}-${index}`} className="rounded-2xl bg-white p-4"><p className="font-extrabold text-ink">{calculationLabel(calculation)}</p><pre className="mt-3 max-h-80 overflow-auto whitespace-pre-wrap rounded-xl bg-slate-950 p-4 text-xs leading-5 text-slate-100">{JSON.stringify({ inputs: calculation.inputs, outputs: calculation.outputs }, null, 2)}</pre></div>)}</div> : <p className="mt-3 font-semibold text-slate-700">The coach did not need a calculation tool for this answer.</p>}</details></article> : <div className="rg-card text-xl text-slate-700">Your plain-English answer will appear here after you ask.</div>}</div>
    </div>
  );
}
