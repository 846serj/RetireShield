"use client";

import Link from "next/link";
import { useState } from "react";
import { COACH_MESSAGE_CAPS, type SubscriptionTier } from "@/lib/subscription-types";

type CalculationTrace = { tool: string; inputs: unknown; outputs: unknown };
type ChatMessage = { role: "user" | "assistant"; content: string; calculations?: CalculationTrace[] };
type UsageMeta = { tier: SubscriptionTier; remaining: number | null; cap: number | null };

const SUGGESTED_QUESTIONS = [
  "Can I retire?",
  "Can I afford a big purchase?",
  "When should I claim Social Security?",
  "What if I retire earlier?",
];

const OPENING_MESSAGE: ChatMessage = {
  role: "assistant",
  content: "Hi — I can explain your saved retirement profile, score, Social Security options, taxes, IRMAA, RMDs, and Roth conversion examples. Ask a question below.",
};

function formatTraceValue(value: unknown) {
  return JSON.stringify(value, null, 2);
}

type ScoreSummary = { score: number; status: string; safeMonthly: number | null };

function money(value?: number | null) {
  return Number.isFinite(Number(value)) ? new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(Number(value)) : "—";
}

export default function CoachChat({ tier = "premium", scoreSummary = null }: { tier?: SubscriptionTier; scoreSummary?: ScoreSummary | null }) {
  const [messages, setMessages] = useState<ChatMessage[]>([OPENING_MESSAGE]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [, setUsage] = useState<UsageMeta>({ tier, remaining: tier === "plus" ? COACH_MESSAGE_CAPS.plus : null, cap: tier === "plus" ? COACH_MESSAGE_CAPS.plus : null });

  async function send(text = input) {
    const trimmed = text.trim();
    if (!trimmed || loading) return;
    const history = messages.filter((m) => m !== OPENING_MESSAGE);
    const next: ChatMessage[] = [...messages, { role: "user", content: trimmed }];
    setMessages(next);
    setInput("");
    setLoading(true);
    try {
      const res = await fetch("/api/coach", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: [...history, { role: "user", content: trimmed }].slice(-10) }),
      });
      const payload = await res.json().catch(() => null) as { answer?: string; calculations?: CalculationTrace[]; usage?: UsageMeta } | null;
      if (payload?.usage) setUsage(payload.usage);
      if (!res.ok) throw new Error(payload?.answer || "Coach unavailable");
      setMessages([...next, { role: "assistant", content: payload?.answer || "Coach unavailable", calculations: payload?.calculations ?? [] }]);
    } catch (error) {
      const message = error instanceof Error && error.message ? error.message : "The AI coach is unavailable right now. Please try again later. For personal decisions, talk with a licensed fiduciary.";
      setMessages([...next, { role: "assistant", content: message }]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="flex min-h-[calc(100vh-6.5rem)] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm lg:min-h-[calc(100vh-2.5rem)]">
      {scoreSummary ? (
        <Link href="/dashboard" className="block border-b border-emerald-200 bg-emerald-50 px-4 py-3 text-base font-extrabold text-emerald-950 no-underline transition hover:bg-emerald-100 sm:px-6">
          Retirement Score {scoreSummary.score} · {scoreSummary.status} · safe to spend ~{money(scoreSummary.safeMonthly)}/mo
        </Link>
      ) : (
        <Link href="/quiz" className="block border-b border-blue-200 bg-blue-50 px-4 py-3 text-base font-extrabold text-blue-950 no-underline transition hover:bg-blue-100 sm:px-6">
          Set your numbers (2-min quiz)
        </Link>
      )}

      <div className="flex min-h-0 flex-1 flex-col gap-4 p-4 sm:p-6">
        <div className="flex flex-wrap gap-2">
          {SUGGESTED_QUESTIONS.map((q) => (
            <button key={q} type="button" onClick={() => send(q)} className="min-h-12 rounded-full border-2 border-slate-300 bg-white px-4 py-2 text-left text-base font-bold text-slate-800 shadow-sm transition hover:border-brand hover:bg-blue-50 disabled:opacity-50" disabled={loading}>
              {q}
            </button>
          ))}
        </div>

        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto rounded-3xl border border-slate-200 bg-slate-50 p-3 sm:p-5" aria-live="polite">
          {messages.map((m, i) => (
            <div key={i} className={m.role === "user" ? "text-right" : "text-left"}>
              <div className={`inline-block max-w-[92%] whitespace-pre-wrap rounded-2xl px-4 py-3 text-left text-base leading-7 sm:max-w-[82%] ${m.role === "user" ? "bg-brand text-white" : "bg-white text-slate-800 shadow-sm ring-1 ring-slate-200"}`}>
                {m.content || "…"}
                {m.role === "assistant" && m.calculations && m.calculations.length > 0 ? (
                  <details className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-3 text-left text-sm leading-6 text-slate-700">
                    <summary className="cursor-pointer text-base font-extrabold text-slate-900">How this was calculated</summary>
                    <p className="mt-2 font-semibold text-slate-700">Calculation details used for this answer.</p>
                    <ul className="mt-3 space-y-3">
                      {m.calculations.map((calc, calcIndex) => (
                        <li key={`${calc.tool}-${calcIndex}`} className="rounded-xl border border-amber-200 bg-white p-3">
                          <span className="font-extrabold text-slate-900">{calc.tool}</span>
                          <pre className="mt-2 max-h-56 overflow-auto whitespace-pre-wrap rounded-lg bg-slate-950 p-3 text-xs leading-5 text-slate-50">{formatTraceValue({ inputs: calc.inputs, outputs: calc.outputs })}</pre>
                        </li>
                      ))}
                    </ul>
                  </details>
                ) : null}
              </div>
            </div>
          ))}
          {loading ? <p className="text-base font-semibold text-slate-600">RetireShield is checking…</p> : null}
        </div>

        <div className="mt-auto space-y-2">
          <form onSubmit={(e) => { e.preventDefault(); send(); }} className="flex flex-col gap-3 sm:flex-row">
            <label className="sr-only" htmlFor="coach-question">Ask a retirement question</label>
            <input id="coach-question" value={input} onChange={(e) => setInput(e.target.value)} className="rg-input min-w-0 flex-1" placeholder="Ask: Will an extra withdrawal raise my Medicare?" />
            <button type="submit" disabled={loading || !input.trim()} className="min-h-12 rounded-xl bg-brand px-5 py-3 text-base font-extrabold text-white shadow-sm transition hover:bg-brand-dark disabled:cursor-not-allowed disabled:opacity-50">
              {loading ? "Thinking…" : "Send"}
            </button>
          </form>
          <p className="text-xs text-slate-400">Do not share account numbers, SSNs, passwords, or payment details.</p>
        </div>
      </div>
    </section>
  );
}
