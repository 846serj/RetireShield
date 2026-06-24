"use client";

import { useMemo, useState } from "react";
import { COACH_MESSAGE_CAPS, type SubscriptionTier } from "@/lib/subscription-types";

type CalculationTrace = { tool: string; inputs: unknown; outputs: unknown };
type ChatMessage = { role: "user" | "assistant"; content: string; calculations?: CalculationTrace[] };
type UsageMeta = { tier: SubscriptionTier; remaining: number | null; cap: number | null };

const SUGGESTED_QUESTIONS = [
  "Can I afford X?",
  "Should I delay Social Security?",
  "Will an extra withdrawal raise my Medicare?",
];

const OPENING_MESSAGE: ChatMessage = {
  role: "assistant",
  content: "Hi — I can explain your saved retirement profile, score, Social Security options, taxes, IRMAA, RMDs, and Roth conversion examples. Ask a question below.",
};

function formatTraceValue(value: unknown) {
  return JSON.stringify(value, null, 2);
}

function tierLabel(tier: SubscriptionTier) {
  if (tier === "plus") return `Plus: ${COACH_MESSAGE_CAPS.plus} messages / month`;
  if (tier === "premium") return "Premium: unlimited messages";
  if (tier === "concierge") return "Concierge: unlimited messages";
  return "Paid coach access required";
}

export default function CoachChat({ tier = "premium" }: { tier?: SubscriptionTier }) {
  const [messages, setMessages] = useState<ChatMessage[]>([OPENING_MESSAGE]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [usage, setUsage] = useState<UsageMeta>({ tier, remaining: tier === "plus" ? COACH_MESSAGE_CAPS.plus : null, cap: tier === "plus" ? COACH_MESSAGE_CAPS.plus : null });

  const isLimited = usage.cap !== null;
  const allowanceText = useMemo(() => {
    if (!isLimited) return "Unlimited coach messages, subject to hourly safety limits.";
    const remaining = usage.remaining ?? 0;
    return `${remaining} of ${usage.cap} Plus messages remain this month.`;
  }, [isLimited, usage.cap, usage.remaining]);

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
    <section className="mb-8 overflow-hidden rounded-3xl border-2 border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-200 bg-gradient-to-br from-white via-emerald-50 to-blue-50 p-5 sm:p-7">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="rg-kicker text-emerald-700">Phase 2 coach chat</p>
            <h2 className="mt-2 text-3xl font-bold sm:text-4xl">Ask RetireShield</h2>
            <p className="mt-3 max-w-2xl text-lg font-semibold leading-8 text-slate-700">
              Large-type, education-only answers grounded in your saved profile and deterministic calculation tools.
            </p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white/90 p-4 text-base shadow-sm lg:min-w-72">
            <p className="font-extrabold text-slate-900">{tierLabel(usage.tier)}</p>
            <p className="mt-1 text-sm font-semibold text-slate-600">{allowanceText}</p>
          </div>
        </div>
        <div className="mt-5 grid gap-3 md:grid-cols-2">
          <p className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-base font-bold leading-7 text-emerald-950">
            We don&apos;t do the math with AI — numbers come from proven calculations; Claude explains them.
          </p>
          <p className="rounded-2xl border border-blue-200 bg-blue-50 p-4 text-base font-semibold leading-7 text-slate-700">
            Education only — not financial, tax, legal, insurance, or investment advice. Do not share account numbers, SSNs, passwords, or payment details.
          </p>
        </div>
      </div>

      <div className="p-4 sm:p-6">
        <div className="mb-5">
          <p className="mb-2 text-sm font-extrabold uppercase tracking-[0.16em] text-slate-500">Suggested questions</p>
          <div className="flex flex-wrap gap-2">
            {SUGGESTED_QUESTIONS.map((q) => (
              <button key={q} type="button" onClick={() => send(q)} className="min-h-12 rounded-full border-2 border-slate-300 bg-white px-4 py-2 text-left text-base font-bold text-slate-800 shadow-sm transition hover:border-brand hover:bg-blue-50 disabled:opacity-50" disabled={loading}>
                {q}
              </button>
            ))}
          </div>
        </div>

        <div className="mb-4 max-h-[34rem] min-h-[22rem] space-y-4 overflow-y-auto rounded-3xl border border-slate-200 bg-slate-50 p-3 sm:p-5" aria-live="polite">
          {messages.map((m, i) => (
            <div key={i} className={m.role === "user" ? "text-right" : "text-left"}>
              <div className={`inline-block max-w-[92%] whitespace-pre-wrap rounded-2xl px-4 py-3 text-left text-lg leading-8 sm:max-w-[82%] ${m.role === "user" ? "bg-brand text-white" : "bg-white text-slate-800 shadow-sm ring-1 ring-slate-200"}`}>
                {m.content || "…"}
                {m.role === "assistant" && m.calculations && m.calculations.length > 0 ? (
                  <details className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-3 text-left text-sm leading-6 text-slate-700">
                    <summary className="cursor-pointer text-base font-extrabold text-slate-900">How this was calculated</summary>
                    <p className="mt-2 font-semibold text-slate-700">These are the deterministic tool calls used before Claude explained the answer.</p>
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
          {loading ? <p className="text-base font-semibold text-slate-600">RetireShield is checking the calculation tools…</p> : null}
        </div>

        <form onSubmit={(e) => { e.preventDefault(); send(); }} className="flex flex-col gap-3 sm:flex-row">
          <label className="sr-only" htmlFor="coach-question">Ask an education-only retirement question</label>
          <input id="coach-question" value={input} onChange={(e) => setInput(e.target.value)} className="rg-input min-w-0 flex-1" placeholder="Ask: Will an extra withdrawal raise my Medicare?" />
          <button type="submit" disabled={loading || !input.trim()} className="min-h-14 rounded-xl bg-brand px-6 py-3 text-lg font-extrabold text-white shadow-sm transition hover:bg-brand-dark disabled:cursor-not-allowed disabled:opacity-50">
            {loading ? "Thinking…" : "Send"}
          </button>
        </form>
      </div>
    </section>
  );
}
