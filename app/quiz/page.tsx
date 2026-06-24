"use client";

import Link from "next/link";
import { useId, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { QUESTIONS } from "@/lib/questions";
import { US_STATES } from "@/lib/usStates";
import { computeScores, actions, type Answers, type SubScores } from "@/lib/scoring";
import { ScoreGauge } from "@/components/ScoreGauge";
import { SubScoreBar } from "@/components/SubScoreBar";
import { Button, Disclaimer, Eyebrow } from "@/components/ui";

type State = Record<string, string | number>;

const SUB_LABEL: Record<keyof SubScores, string> = {
  income: "Income Stability", withdrawal: "Withdrawal Sustainability",
  inflation: "Inflation Impact", market: "Market-Risk Buffer",
};

export default function Quiz() {
  const [step, setStep] = useState(0);
  const [introComplete, setIntroComplete] = useState(false);
  const [answers, setAnswers] = useState<State>({});
  const [selectedChoice, setSelectedChoice] = useState<string | number | null>(null);
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
  const [awaitingEmailConfirmation, setAwaitingEmailConfirmation] = useState(false);
  const router = useRouter();

  const done = introComplete && step >= QUESTIONS.length;
  const result = useMemo(() => (done ? computeScores(answers as unknown as Answers) : null), [done, answers]);
  const acts = useMemo(
    () => (result ? actions(answers as unknown as Answers, result) : []),
    [result, answers]
  );

  function setAnswer(key: string, value: string | number) {
    setAnswers((p) => ({ ...p, [key]: value }));
  }

  function goToStep(nextStep: number) {
    setSelectedChoice(null);
    setStep(nextStep);
  }

  function selectChoice(key: string, value: string | number) {
    setSelectedChoice(value);
    setAnswer(key, value);
    window.setTimeout(() => goToStep(step + 1), 180);
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
    setAwaitingEmailConfirmation(false);

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
      const { data, error } = await supabase.auth.signUp({
        email: normalizedEmail,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      });
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
        setAccountNotice("Check your email to confirm your account. After confirming, we’ll send you to your dashboard and save this score there.");
        setAwaitingEmailConfirmation(true);
        return;
      }

      router.push("/dashboard");
      router.refresh();
    } catch {
      setAccountError("We could not reach the sign-up service. Please try again.");
    } finally {
      setCreatingAccount(false);
    }
  }

  // ---- Quiz intro ----
  if (!introComplete) {
    return (
      <div className="rg-page-shell">
        <div className="mx-auto max-w-3xl px-4 py-10 sm:py-16">
          <div className="rg-card overflow-hidden">
            <Eyebrow>Retirement Safety Score</Eyebrow>
            <div className="mt-8 rounded-[2rem] bg-band p-5 sm:p-8">
              <h1 className="font-serif text-[2rem] font-semibold leading-tight text-ink sm:text-5xl">Let&apos;s see where your retirement stands.</h1>
              <p className="mt-5 text-xl font-semibold leading-8 text-slate-700">
                9 simple questions. About 2 minutes. No account, and we never ask you to connect a bank or brokerage. There are no wrong answers — just answer as best you know.
              </p>
            </div>
            <Button type="button" onClick={() => setIntroComplete(true)} className="mt-8 w-full sm:w-auto">
              Start — question 1 of 9
            </Button>
            <p className="mt-6 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-600">
              🔒 No bank linking · ⏱ ~2 minutes · 🆓 Always free to see your score
            </p>
          </div>
          <Disclaimer className="mt-6" />
        </div>
      </div>
    );
  }

  // ---- Quiz steps ----
  if (!done) {
    const q = QUESTIONS[step];
    return (
      <div className="rg-page-shell">
      <div className="mx-auto max-w-3xl px-4 py-12 sm:py-16">
        <div className="rg-card">
        <Eyebrow>Retirement Safety Score</Eyebrow>
        <div className="mb-3 mt-5 flex items-center justify-between gap-4 text-sm font-bold text-slate-500">
          <span>Question {step + 1} of {QUESTIONS.length}</span>
          <span>{Math.round(((step + 1) / QUESTIONS.length) * 100)}%</span>
        </div>
        <div className="mb-8 h-5 w-full overflow-hidden rounded-full bg-slate-200" role="progressbar" aria-label="Quiz progress" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(((step + 1) / QUESTIONS.length) * 100)}>
          <div
            className="h-full rounded-full bg-brand transition-all duration-500 ease-out motion-reduce:transition-none"
            style={{ width: `${((step + 1) / QUESTIONS.length) * 100}%` }}
          />
        </div>
        <h1 className="font-serif text-[1.625rem] font-semibold leading-tight text-ink sm:text-3xl">{q.prompt}</h1>
        {q.help && <p className="mb-8 mt-3 text-lg leading-7 text-slate-600">{q.help}</p>}

        {q.kind === "number" && (
          <NumberStep
            prefix={q.prefix}
            placeholder={q.placeholder}
            initial={answers[q.key] as number | undefined}
            onNext={(v) => { setAnswer(q.key, v); goToStep(step + 1); }}
          />
        )}

        {q.kind === "state" && (
          <div>
            <label htmlFor={`quiz-${q.key}`} className="mb-2 block text-base font-bold text-ink">Select your state</label>
            <select
              id={`quiz-${q.key}`}
              defaultValue={(answers[q.key] as string) ?? ""}
              onChange={(e) => { if (e.target.value) { setAnswer(q.key, e.target.value); window.setTimeout(() => goToStep(step + 1), 120); } }}
              className="rg-input min-h-16 text-xl"
            >
            <option value="" disabled>Select your state…</option>
              {US_STATES.map((s) => (
                <option key={s.code} value={s.code}>{s.name}</option>
              ))}
            </select>
          </div>
        )}

        {q.kind === "choice" && (
          <div className="grid gap-3">
            {q.choices.map((c) => (
              <button
                key={String(c.value)}
                onClick={() => selectChoice(q.key, c.value)}
                aria-pressed={answers[q.key] === c.value}
                className={`min-h-16 rounded-2xl border-2 px-5 py-4 text-left text-xl font-bold text-ink shadow-sm transition hover:border-brand hover:bg-band focus-visible:ring-brand/20 motion-reduce:transition-none ${
                  selectedChoice === c.value || answers[q.key] === c.value
                    ? "border-brand bg-band shadow-brand/10"
                    : "border-slate-200 bg-white"
                }`}
              >
                {c.label}
              </button>
            ))}
          </div>
        )}

        <button
          onClick={() => (step > 0 ? goToStep(step - 1) : setIntroComplete(false))}
          className="mt-8 font-bold text-slate-500 underline transition hover:text-brand motion-reduce:transition-none"
        >
          ← Back
        </button>
      </div>
      <Disclaimer className="mt-6" />
      </div>
      </div>
    );
  }

  // ---- Result ----
  return (
    <div className="rg-page-shell">
    <div className="mx-auto max-w-3xl px-4 py-12 sm:py-16">
      <ScoreGauge value={result!.overall} band={result!.band} subScores={[]} subtitle="Your result" badge="Visible now" />

      {!revealed ? (
        <div className="rg-card-highlight mt-8 text-center">
          <h2 className="text-2xl font-bold">See exactly what&apos;s behind your score — and your 3 next steps.</h2>
          <p className="mx-auto mt-3 max-w-2xl text-slate-600">
            Enter your email and we&apos;ll show your four sub-scores and a personalized action plan. We&apos;ll also send you a short monthly check-in. No spam, unsubscribe anytime.
          </p>
          <div className="mt-5 flex flex-col gap-3 sm:flex-row">
            <div className="flex-1 text-left">
              <label htmlFor="results-email" className="sr-only">Email address for unlocking full results</label>
              <input
                id="results-email"
                type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                placeholder="you@email.com"
                autoComplete="email"
                className="rg-input"
                aria-describedby={emailError ? "results-email-error" : undefined}
              />
            </div>
            <Button
              disabled={!email.trim().includes("@") || submitting}
              onClick={submitEmail}
              className="disabled:opacity-50"
            >
              {submitting ? "…" : "Show my full results"}
            </Button>
          </div>
          {emailError && <p id="results-email-error" className="mt-3 rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-semibold text-bad">{emailError}</p>}
          <p className="mt-3 text-xs text-slate-500">Your score stays visible either way. Creating an account is optional after you see your results.</p>
        </div>
      ) : (
        <div className="mt-10 space-y-6">
          {emailNotice && <p className="rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm text-slate-700">{emailNotice}</p>}
          <div className="rg-card space-y-5">
            <div>
              <h3 className="text-2xl font-bold text-ink">What&apos;s behind your score</h3>
              <p className="mt-2 text-slate-600">These four educational sub-scores point to areas worth reviewing first.</p>
            </div>
            {(Object.keys(SUB_LABEL) as (keyof SubScores)[]).map((k) => (
              <SubScoreBar key={k} label={SUB_LABEL[k]} value={result!.sub[k]} scoreKey={k} />
            ))}
          </div>

          <div className="rg-card">
            <h3 className="mb-3 text-2xl font-bold text-ink">Your 3 next steps</h3>
            <div className="grid gap-3">
              {acts.map((a, i) => (
                <article key={i} className="rounded-2xl border border-slate-200 bg-surface p-5">
                  <p className="text-sm font-extrabold uppercase tracking-[0.14em] text-brand">Step {i + 1}</p>
                  <p className="mt-2 text-lg font-semibold leading-7 text-ink">{a}</p>
                  <p className="mt-2 text-sm leading-6 text-slate-600">Use this as a conversation starter — what to look at, what to ask, and what to understand before making decisions.</p>
                </article>
              ))}
            </div>
          </div>

          {!accountDismissed && (
            <div className="rg-card-highlight">
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
                    className="rg-input text-slate-700"
                  />
                </div>
                <div>
                  <label htmlFor="account-password" className="block text-base font-bold text-ink">Password</label>
                  <div className="mt-2 flex rounded-xl border-2 border-slate-300 bg-white focus-within:border-brand focus-within:ring-4 focus-within:ring-brand/10">
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
                <Button
                  type="button"
                  onClick={createAccount}
                  disabled={creatingAccount || awaitingEmailConfirmation || password.length < 8}
                  className="disabled:opacity-50"
                >
                  {creatingAccount ? "Creating account…" : awaitingEmailConfirmation ? "Check your email" : "Create my account"}
                </Button>
                <Button
                  type="button"
                  onClick={() => setAccountDismissed(true)}
                  variant="secondary"
                >
                  No thanks, maybe later
                </Button>
              </div>
            </div>
          )}

          <div className="rounded-3xl bg-ink p-6 text-center text-white shadow-xl sm:p-8">
            <h3 className="font-sans text-2xl font-bold text-white">Want RetireShield to keep watch for you?</h3>
            <p className="mx-auto mt-3 max-w-2xl text-slate-200">
              Markets move, prices rise, rules change. We&apos;ll re-check your plan every month and tell you the moment something matters — Medicare thresholds, Social Security timing, scams in your state.
            </p>
            <Button href="/signup" className="mt-5">
              Start my free trial
            </Button>
          </div>
        </div>
      )}
      <Disclaimer className="mt-8" />
    </div>
    </div>
  );
}

function NumberStep({
  prefix, placeholder, initial, onNext,
}: { prefix?: string; placeholder?: string; initial?: number; onNext: (v: number) => void }) {
  const [val, setVal] = useState(initial != null ? String(initial) : "");
  const inputId = useId();
  const num = Number(val.replace(/[^0-9.]/g, ""));
  return (
    <div>
      <label htmlFor={inputId} className="mb-2 block text-base font-bold text-ink">Enter your answer</label>
      <div className="flex min-h-20 items-center rounded-2xl border-2 border-slate-300 bg-white px-5 py-4 text-[1.75rem] focus-within:border-brand focus-within:ring-4 focus-within:ring-brand/10">
        {prefix && <span className="mr-2 font-bold text-slate-500" aria-hidden="true">{prefix}</span>}
        <input
          id={inputId}
          type="text"
          inputMode="numeric"
          pattern="[0-9,]*"
          value={val}
          onChange={(e) => setVal(e.target.value)}
          placeholder={placeholder}
          className="w-full bg-transparent font-bold outline-none placeholder:font-semibold placeholder:text-slate-300"
          onKeyDown={(e) => { if (e.key === "Enter" && num > 0) onNext(num); }}
        />
      </div>
      <button
        disabled={!(num > 0)} onClick={() => onNext(num)}
        className="mt-6 min-h-16 w-full rounded-xl bg-brand px-8 py-3 text-lg font-bold text-white transition hover:bg-brand-dark disabled:opacity-50 sm:w-auto motion-reduce:transition-none"
      >
        Continue
      </button>
    </div>
  );
}
