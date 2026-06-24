"use client";

import { useState } from "react";
import type { SubscriptionTier } from "@/lib/subscription";

type CalculationTrace = { tool: string; inputs: unknown; outputs: unknown };
type ChatMessage = { role: "user" | "assistant"; content: string; calculations?: CalculationTrace[] };
const STARTERS = [
  "What does my Retirement Safety Score mean?",
  "What questions should I ask a fiduciary about Social Security timing?",
  "Run a plain-English explanation of my retirement projection.",
];

const PLUS_COPY = "Plus includes a monthly coach allowance. Premium includes unlimited coach messages, subject to abuse prevention.";

export default function CoachChat({ tier = "premium" }: { tier?: SubscriptionTier }) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState(STARTERS[0]);
  const [loading, setLoading] = useState(false);

  async function send(text = input) {
    const trimmed = text.trim();
    if (!trimmed || loading) return;
    const next: ChatMessage[] = [...messages, { role: "user", content: trimmed }];
    setMessages(next);
    setInput("");
    setLoading(true);
    try {
      const res = await fetch("/api/coach", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: next.slice(-10) }),
      });
      const payload = await res.json().catch(() => null) as { answer?: string; calculations?: CalculationTrace[] } | null;
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
    <section className="mb-8 rounded-3xl border-2 border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="rg-kicker text-emerald-700">Real math, not AI guesswork</p>
          <h2 className="mt-2 text-2xl font-bold">Ask RetireShield</h2>
          <p className="mt-2 text-slate-700">Ask anything about your retirement.</p>
        </div>
        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-extrabold uppercase tracking-[0.14em] text-slate-600">
          {tier === "plus" ? "Plus allowance" : "Premium unlimited"}
        </span>
      </div>
      <p className="mb-3 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm font-semibold text-emerald-950">
        We don't do the math with AI. Numbers come from proven retirement and tax calculations; the AI explains them in plain English.
      </p>
      <p className="mb-4 rounded-xl bg-blue-50 p-3 text-sm text-slate-700">
        Education only — not financial, tax, legal, or investment advice. Never share account numbers, SSNs, passwords, or payment details. {tier === "plus" ? PLUS_COPY : "Premium members can ask unlimited coach questions, subject to abuse prevention."}
      </p>
      <div className="mb-4 flex flex-wrap gap-2">
        {STARTERS.map((q) => (
          <button key={q} type="button" onClick={() => send(q)} className="rounded-full border border-slate-300 px-3 py-2 text-left text-sm font-semibold hover:bg-slate-50">
            {q}
          </button>
        ))}
      </div>
      <div className="mb-4 max-h-96 min-h-48 space-y-3 overflow-y-auto rounded-2xl border border-slate-100 bg-slate-50 p-4">
        {messages.length === 0 ? <p className="text-sm text-slate-600">Start with a question. The coach will use your saved answers and deterministic calculations when numbers are needed.</p> : null}
        {messages.map((m, i) => (
          <div key={i} className={m.role === "user" ? "text-right" : "text-left"}>
            <div className={`inline-block max-w-[85%] whitespace-pre-wrap rounded-xl px-4 py-2 text-sm ${m.role === "user" ? "bg-brand text-white" : "bg-white text-slate-800 shadow-sm"}`}>
              {m.content || "…"}
              {m.role === "assistant" && m.calculations && m.calculations.length > 0 ? (
                <details className="mt-3 rounded-lg border border-slate-200 bg-slate-50 p-2 text-left text-xs text-slate-600">
                  <summary className="cursor-pointer font-bold text-slate-700">How this was calculated</summary>
                  <ul className="mt-2 space-y-2">
                    {m.calculations.map((calc, calcIndex) => (
                      <li key={`${calc.tool}-${calcIndex}`}>
                        <span className="font-bold">{calc.tool}</span>
                        <pre className="mt-1 max-h-48 overflow-auto whitespace-pre-wrap rounded bg-white p-2">{JSON.stringify({ inputs: calc.inputs, outputs: calc.outputs }, null, 2)}</pre>
                      </li>
                    ))}
                  </ul>
                </details>
              ) : null}
            </div>
          </div>
        ))}
      </div>
      <form onSubmit={(e) => { e.preventDefault(); send(); }} className="flex flex-col gap-2 sm:flex-row">
        <input value={input} onChange={(e) => setInput(e.target.value)} className="min-w-0 flex-1 rounded-xl border border-slate-300 px-3 py-2" placeholder="Ask an education-only retirement question" />
        <button disabled={loading} className="rounded-xl bg-brand px-4 py-2 font-bold text-white disabled:opacity-50">{loading ? "Thinking…" : "Send"}</button>
      </form>
    </section>
  );
}
