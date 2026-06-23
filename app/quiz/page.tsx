"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { QUESTIONS } from "@/lib/questions";
import { US_STATES } from "@/lib/usStates";
import { computeScores, actions, type Answers, type SubScores } from "@/lib/scoring";

type State = Record<string, string | number>;

const BAND_COLOR: Record<string, string> = {
  Secure: "text-good", "Mostly Secure": "text-good", "At Risk": "text-warn", Vulnerable: "text-bad",
};
const SUB_LABEL: Record<keyof SubScores, string> = {
  income: "Income Stability", withdrawal: "Withdrawal Sustainability",
  inflation: "Inflation Impact", market: "Market-Risk Buffer",
};

export default function Quiz() {
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<State>({});
  const [email, setEmail] = useState("");
  const [revealed, setRevealed] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [emailNotice, setEmailNotice] = useState("");
  const [emailError, setEmailError] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [creatingAccount, setCreatingAccount] = useState(false);
  const [accountDismissed, setAccountDismissed] = useState(false);
  const [accountError, setAccountError] = useState("");
  const [accountNotice, setAccountNotice] = useState("");
  const router = useRouter();

  const done = step >= QUESTIONS.length;
  const result = useMemo(() => (done ? computeScores(answers as unknown as Answers) : null), [done, answers]);
  const acts = useMemo(
    () => (result ? actions(answers as unknown as Answers, result) : []),
    [result, answers]
  );

  function setAnswer(key: string, value: string | number) {
    setAnswers((p) => ({ ...p, [key]: value }));
  }

  async function submitEmail() {
    const normalizedEmail = email.trim();
    setSubmitting(true);
    setEmailNotice("");
    setEmailError("");
    try {
      const params = new URLSearchParams(window.location.search);
      const res = await fetch("/api/lead", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: normalizedEmail,
          answers,
          result,
          source: params.get("utm_source") || "direct",
          campaign: params.get("utm_campaign") || "",
        }),
      });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok || !payload.ok) {
        setEmailError("We could not save your email. Please check it and try again.");
        return;
      }
      // Cache so a new account can "claim" this score after sign-up (see ScoreHydrator).
      try {
        localStorage.setItem("rg_score", JSON.stringify({ answers, result }));
      } catch {
        /* ignore */
      }
      setEmailNotice("Your results are unlocked. You can review them here, or optionally create a free account below to save your score and turn on monitoring.");
      setRevealed(true);
    } catch {
      setEmailError("We could not reach the server. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }


  async function createAccount() {
    const normalizedEmail = email.trim().toLowerCase();
    setAccountError("");
    setAccountNotice("");

    if (!normalizedEmail.includes("@")) {
      setAccountError("Please enter a valid email address above before creating an account.");
      return;
    }

    if (password.length < 8) {
      setAccountError("Please choose a password with at least 8 characters.");
      return;
    }

    setCreatingAccount(true);
    try {
      const supabase = createClient();
      // Required Supabase setting: Auth → “Confirm email” OFF, so password signUp
      // returns an active session immediately after the visitor chooses a password.
      const { data, error } = await supabase.auth.signUp({ email: normalizedEmail, password });
      if (error) {
        const message = error.message.toLowerCase();
        if (message.includes("already") || message.includes("registered") || message.includes("exists")) {
          setAccountNotice("You already have an account — log in instead.");
        } else {
          setAccountError(error.message || "We could not create your account. Please try again.");
        }
        return;
      }

      if (!data.session) {
        setAccountError("Your account was created, but email confirmation is still on. Please contact support so we can finish sign-in.");
        return;
      }

      router.push("/dashboard");
    } catch {
      setAccountError("We could not reach the sign-up service. Please try again.");
    } finally {
      setCreatingAccount(false);
    }
  }

  // ---- Quiz steps ----
  if (!done) {
    const q = QUESTIONS[step];
    return (
      <div className="mx-auto max-w-2xl px-4 py-12">
        <div className="text-sm text-slate-500 mb-2">Question {step + 1} of {QUESTIONS.length}</div>
        <div className="h-2 w-full rounded bg-slate-200 mb-8">
          <div className="h-2 rounded bg-brand" style={{ width: `${(step / QUESTIONS.length) * 100}%` }} />
        </div>
        <h2 className="text-2xl font-bold mb-8">{q.prompt}</h2>

        {q.kind === "number" && (
          <NumberStep
            prefix={q.prefix}
            placeholder={q.placeholder}
            initial={answers[q.key] as number | undefined}
            onNext={(v) => { setAnswer(q.key, v); setStep(step + 1); }}
          />
        )}

        {q.kind === "state" && (
          <select
            defaultValue={(answers[q.key] as string) ?? ""}
            onChange={(e) => { if (e.target.value) { setAnswer(q.key, e.target.value); setStep(step + 1); } }}
            className="w-full rounded-xl border-2 border-slate-300 px-4 py-3 text-lg"
          >
            <option value="" disabled>Select your state…</option>
            {US_STATES.map((s) => (
              <option key={s.code} value={s.code}>{s.name}</option>
            ))}
          </select>
        )}

        {q.kind === "choice" && (
          <div className="grid gap-3">
            {q.choices.map((c) => (
              <button
                key={String(c.value)}
                onClick={() => { setAnswer(q.key, c.value); setStep(step + 1); }}
                className="text-left rounded-xl border-2 border-slate-200 px-5 py-4 text-lg hover:border-brand hover:bg-blue-50"
              >
                {c.label}
              </button>
            ))}
          </div>
        )}

        {step > 0 && (
          <button onClick={() => setStep(step - 1)} className="mt-8 text-slate-500 underline">
            ← Back
          </button>
        )}
      </div>
    );
  }

  // ---- Result ----
  return (
    <div className="mx-auto max-w-2xl px-4 py-12">
      <div className="text-center">
        <div className="text-lg text-slate-500">Your Retirement Safety Score</div>
        <div className="text-7xl font-extrabold my-2">{result!.overall}</div>
        <div className={`text-2xl font-bold ${BAND_COLOR[result!.band]}`}>{result!.band}</div>
      </div>

      {!revealed ? (
        <div className="mt-10 rounded-2xl border-2 border-brand bg-blue-50 p-6 text-center">
          <h3 className="text-xl font-bold">See your full breakdown + 3 personalized steps</h3>
          <p className="mt-2 text-slate-600">Enter your email to unlock your sub-scores and action plan.</p>
          <div className="mt-4 flex flex-col sm:flex-row gap-3">
            <input
              type="email" value={email} onChange={(e) => setEmail(e.target.value)}
              placeholder="you@email.com"
              className="flex-1 rounded-xl border-2 border-slate-300 px-4 py-3 text-lg"
            />
            <button
              disabled={!email.trim().includes("@") || submitting}
              onClick={submitEmail}
              className="rounded-xl bg-brand px-6 py-3 text-lg font-bold text-white disabled:opacity-50"
            >
              {submitting ? "…" : "Show my results"}
            </button>
          </div>
          {emailError && <p className="mt-3 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-bad">{emailError}</p>}
          <p className="mt-3 text-xs text-slate-500">No spam. Creating an account is optional after you see your results.</p>
        </div>
      ) : (
        <div className="mt-10 space-y-6">
          {emailNotice && <p className="rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm text-slate-700">{emailNotice}</p>}
          <div className="space-y-4">
            {(Object.keys(SUB_LABEL) as (keyof SubScores)[]).map((k) => (
              <div key={k}>
                <div className="flex justify-between text-sm mb-1">
                  <span className="font-semibold">{SUB_LABEL[k]}</span>
                  <span>{result!.sub[k]}</span>
                </div>
                <div className="h-3 w-full rounded bg-slate-200">
                  <div className="h-3 rounded bg-brand" style={{ width: `${result!.sub[k]}%` }} />
                </div>
              </div>
            ))}
          </div>

          <div>
            <h3 className="text-xl font-bold mb-3">Your 3 next steps</h3>
            <div className="space-y-3">
              {acts.map((a, i) => (
                <div key={i} className="rounded-xl border-2 border-slate-200 p-4">
                  <span className="font-bold text-brand mr-2">{i + 1}.</span>{a}
                </div>
              ))}
            </div>
          </div>

          {!accountDismissed && (
            <div className="rounded-2xl border-2 border-brand bg-blue-50 p-6">
              <h3 className="text-2xl font-bold">Create your free account</h3>
              <p className="mt-2 text-lg text-slate-700">Save your score and turn on monthly monitoring — pick a password.</p>
              <div className="mt-5 grid gap-4">
                <div>
                  <label htmlFor="account-email" className="block text-base font-bold text-ink">Email address</label>
                  <input
                    id="account-email"
                    type="email"
                    value={email.trim().toLowerCase()}
                    readOnly
                    className="mt-2 w-full rounded-xl border-2 border-slate-300 bg-white px-4 py-3 text-lg text-slate-700"
                  />
                </div>
                <div>
                  <label htmlFor="account-password" className="block text-base font-bold text-ink">Password</label>
                  <div className="mt-2 flex rounded-xl border-2 border-slate-300 bg-white focus-within:border-brand">
                    <input
                      id="account-password"
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      minLength={8}
                      autoComplete="new-password"
                      className="min-h-14 flex-1 rounded-l-xl px-4 text-lg outline-none"
                      aria-describedby="password-help"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((show) => !show)}
                      className="rounded-r-xl px-4 text-base font-bold text-brand underline"
                      aria-label={showPassword ? "Hide password" : "Show password"}
                    >
                      {showPassword ? "Hide" : "Show"}
                    </button>
                  </div>
                  <p id="password-help" className="mt-2 text-sm text-slate-600">At least 8 characters.</p>
                </div>
              </div>
              {accountError && <p className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-bad">{accountError}</p>}
              {accountNotice && <p className="mt-4 rounded-xl border border-blue-200 bg-white p-3 text-sm text-slate-700">{accountNotice} <Link href="/login" className="font-bold text-brand underline">Log in instead</Link>.</p>}
              <div className="mt-5 flex flex-col gap-3 sm:flex-row">
                <button
                  type="button"
                  onClick={createAccount}
                  disabled={creatingAccount || password.length < 8}
                  className="rounded-xl bg-brand px-6 py-3 text-lg font-bold text-white disabled:opacity-50"
                >
                  {creatingAccount ? "Creating account…" : "Create my account"}
                </button>
                <button
                  type="button"
                  onClick={() => setAccountDismissed(true)}
                  className="rounded-xl border-2 border-slate-300 px-6 py-3 text-lg font-bold text-ink"
                >
                  No thanks, maybe later
                </button>
              </div>
            </div>
          )}

          {/* Phase 4-5: this CTA becomes the 3-day trial -> annual upgrade (see runbook). */}
          <div className="rounded-2xl bg-ink text-white p-6 text-center">
            <h3 className="text-xl font-bold">Want RetireShield to watch this for you?</h3>
            <p className="mt-2 text-slate-200">
              Get ongoing alerts when something affects your score — scams in your state, benefit changes, rising costs.
            </p>
            <Link
              href="/upgrade?plan=annual"
              className="mt-4 inline-block rounded-xl bg-brand px-6 py-3 text-lg font-bold"
            >
              Start 3-day free trial
            </Link>
            <p className="mt-2 text-xs text-slate-400">Review the plan terms before starting your trial.</p>
          </div>
        </div>
      )}
    </div>
  );
}

function NumberStep({
  prefix, placeholder, initial, onNext,
}: { prefix?: string; placeholder?: string; initial?: number; onNext: (v: number) => void }) {
  const [val, setVal] = useState(initial != null ? String(initial) : "");
  const num = Number(val.replace(/[^0-9.]/g, ""));
  return (
    <div>
      <div className="flex items-center rounded-xl border-2 border-slate-300 px-4 py-3 text-2xl">
        {prefix && <span className="text-slate-400 mr-1">{prefix}</span>}
        <input
          inputMode="numeric" value={val} onChange={(e) => setVal(e.target.value)}
          placeholder={placeholder} className="w-full outline-none"
          onKeyDown={(e) => { if (e.key === "Enter" && num > 0) onNext(num); }}
        />
      </div>
      <button
        disabled={!(num > 0)} onClick={() => onNext(num)}
        className="mt-6 rounded-xl bg-brand px-8 py-3 text-lg font-bold text-white disabled:opacity-50"
      >
        Continue
      </button>
    </div>
  );
}
