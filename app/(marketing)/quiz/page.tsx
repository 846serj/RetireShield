"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { QUESTIONS } from "@/lib/questions";
import { US_STATES } from "@/lib/usStates";
import { computeScores, type Answers, type Result, type SubScores } from "@/lib/scoring";
import type { AIReport } from "@/lib/ai/report";
import { ScoreGauge } from "@/components/ScoreGauge";
import { SubScoreBar } from "@/components/SubScoreBar";
import { Button, Eyebrow } from "@/components/ui";
import { LEADGEN_ONLY } from "@/lib/flags";

type State = Record<string, string | number | undefined>;

const SUB_LABEL: Record<keyof SubScores, string> = {
  income: "Income Stability", withdrawal: "Withdrawal Sustainability",
  inflation: "Inflation Impact", market: "Market-Risk Buffer",
};

function getAuthCallbackUrl() {
  const configuredBaseUrl = process.env.NEXT_PUBLIC_BASE_URL;
  const baseUrl = configuredBaseUrl?.startsWith("http")
    ? configuredBaseUrl.replace(/\/$/, "")
    : window.location.origin;

  return `${baseUrl}/auth/callback`;
}

export default function Quiz() {
  const [step, setStep] = useState(0);
  const [introComplete, setIntroComplete] = useState(false);
  const [answers, setAnswers] = useState<State>({});
  const [selectedChoice, setSelectedChoice] = useState<string | number | null>(null);
  const [email, setEmail] = useState("");
  const [subscribeNewsletter, setSubscribeNewsletter] = useState(true);
  const [revealed, setRevealed] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [emailNotice, setEmailNotice] = useState("");
  const [report, setReport] = useState<AIReport | null>(null);
  const [serverResult, setServerResult] = useState<Result | null>(null);
  const [emailError, setEmailError] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [creatingAccount, setCreatingAccount] = useState(false);
  const [accountDismissed, setAccountDismissed] = useState(false);
  const [accountError, setAccountError] = useState("");
  const [accountNotice, setAccountNotice] = useState("");
  const router = useRouter();

  const visible = useMemo(() => QUESTIONS.filter((q) => !q.when || q.when(answers)), [answers]);
  const done = introComplete && step >= visible.length;
  const result = useMemo(() => (done ? computeScores(answers as unknown as Answers) : null), [done, answers]);
  const displayResult = serverResult ?? result;

  function setAnswer(key: string, value: string | number | undefined) {
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
          subscribeNewsletter,
        }),
      });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok || !payload.ok) {
        setEmailError("We could not save your email. Please check it and try again.");
        return;
      }
      const returnedResult = payload.result ? (payload.result as Result) : result;
      if (returnedResult) setServerResult(returnedResult);
      if (payload.report) setReport(payload.report as AIReport);
      // Cache so a new account can "claim" this score after sign-up (see ScoreHydrator).
      try {
        localStorage.setItem("rg_score", JSON.stringify({ answers, result: returnedResult }));
      } catch {
        /* ignore */
      }
      setEmailNotice("Your results are unlocked. You can review them here, or create a free account below to save your score and ask your first question.");
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
      const { data, error } = await supabase.auth.signUp({
        email: normalizedEmail,
        password,
        options: {
          emailRedirectTo: getAuthCallbackUrl(),
        },
      });
      if (error) {
        const message = error.message.toLowerCase();
        if (message.includes("already") || message.includes("registered") || message.includes("exists")) {
          setAccountNotice("You already have an account —");
        } else {
          setAccountError(error.message || "We could not create your account. Please try again.");
        }
        return;
      }

      void fetch("/api/newsletter/account", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: normalizedEmail, utmSource: "quiz_signup" }),
      }).catch((error) => console.error("newsletter signup sync failed", error));

      const existingUser = data.user?.identities?.length === 0;
      if (existingUser) {
        setAccountNotice("You already have an account —");
        return;
      }

      if (!data.session) {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email: normalizedEmail,
          password,
        });

        if (signInError) {
          setAccountError("We created your account, but could not sign you in automatically. Please log in to continue.");
          return;
        }
      }

      try {
        await fetch("/api/score-save", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ answers, result }),
        });
      } catch {
        /* ScoreHydrator can retry from localStorage after navigation. */
      }
      router.push("/coach?firstQuestion=1");
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
              <p className="text-2xl font-extrabold leading-tight text-ink sm:text-4xl">
                Are you on track to run out of money in retirement? Find out in 5 minutes.
              </p>
              <h1 className="mt-4 font-serif text-[2rem] font-semibold leading-tight text-ink sm:text-5xl">Let&apos;s see where your retirement stands.</h1>
              <p className="mt-5 text-xl font-semibold leading-8 text-slate-700">
                About 5 minutes. The more you share, the more accurate and personal your Safety Score and action steps. Every answer stays private.
              </p>
            </div>
            <Button type="button" onClick={() => setIntroComplete(true)} className="mt-8 w-full sm:w-auto">
              Start — question 1
            </Button>
            <p className="mt-6 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-600">
              ⏱ ~5 minutes · 🆓 Always free to see your score
            </p>
          </div>
        </div>
      </div>
    );
  }

  // ---- Quiz steps ----
  if (!done) {
    const q = visible[step];
    const progressPct = Math.round(((step + 1) / visible.length) * 100);
    return (
      <div className="rg-page-shell">
      <div className="mx-auto max-w-3xl px-4 py-12 sm:py-16">
        <div className="rg-card">
        <Eyebrow>Retirement Safety Score</Eyebrow>
        <div className="mb-3 mt-5 flex items-center justify-between gap-4 text-sm font-bold text-slate-500">
          <span>Question {step + 1} of {visible.length}</span>
          <span>{progressPct}%</span>
        </div>
        <div className="mb-8 h-5 w-full overflow-hidden rounded-full bg-slate-200" role="progressbar" aria-label="Quiz progress" aria-valuemin={0} aria-valuemax={100} aria-valuenow={progressPct}>
          <div
            className="h-full rounded-full bg-brand transition-all duration-500 ease-out motion-reduce:transition-none"
            style={{ width: `${progressPct}%` }}
          />
        </div>
        <h1 className="font-serif text-[1.625rem] font-semibold leading-tight text-ink sm:text-3xl">{q.prompt}</h1>
        {q.help && <p className="mb-8 mt-3 text-lg leading-7 text-slate-600">{q.help}</p>}

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
            <button type="button" onClick={() => { setAnswer(q.key, undefined); goToStep(step + 1); }} className="mt-4 min-h-14 w-full rounded-xl border-2 border-slate-200 bg-white px-6 py-3 text-lg font-bold text-slate-600 transition hover:border-brand hover:bg-band sm:w-auto motion-reduce:transition-none">
              Skip for now
            </button>
          </div>
        )}

        {q.kind === "choice" && (
          <div className="grid gap-3">
            {q.choices.map((c) => {
              const currentValue = answers[q.key] ?? q.defaultValue;
              const isSelected = selectedChoice === c.value || currentValue === c.value;
              return (
              <button
                key={String(c.value)}
                onClick={() => selectChoice(q.key, c.value)}
                aria-pressed={isSelected}
                className={`min-h-16 rounded-2xl border-2 px-5 py-4 text-left text-xl font-bold text-ink shadow-sm transition hover:border-brand hover:bg-band focus-visible:ring-brand/20 motion-reduce:transition-none ${
                  isSelected
                    ? "border-brand bg-band shadow-brand/10"
                    : "border-slate-200 bg-white"
                }`}
              >
                {c.label}
              </button>
            );})}
          </div>
        )}

        <button
          onClick={() => (step > 0 ? goToStep(step - 1) : setIntroComplete(false))}
          className="mt-8 font-bold text-slate-500 underline transition hover:text-brand motion-reduce:transition-none"
        >
          ← Back
        </button>
      </div>
      </div>
      </div>
    );
  }

  // ---- Result ----
  return (
    <div className="rg-page-shell">
    <div className="mx-auto max-w-3xl px-4 py-12 sm:py-16">
      <ScoreGauge value={displayResult!.overall} band={displayResult!.band} subScores={[]} subtitle="Your result" badge="Visible now" />

      {!revealed ? (
        <div className="rg-card-highlight mt-8 text-center">
          <h2 className="text-2xl font-bold">See exactly what&apos;s behind your score — and your 3 next steps.</h2>
          <p className="mx-auto mt-3 max-w-2xl text-slate-600">
            Enter your email and we&apos;ll unlock your four sub-scores + 3 steps and email you your full personalized report.
          </p>
          {submitting ? (
            <div className="mt-5 flex w-full items-center justify-center gap-3 rounded-2xl border border-brand/20 bg-white p-5 text-left shadow-sm">
              <span className="size-5 animate-spin rounded-full border-2 border-brand/30 border-t-brand" aria-hidden="true" />
              <p className="text-lg font-bold text-ink">Building your personalized report… This usually takes just a few seconds.</p>
            </div>
          ) : (
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
                Show my full results
              </Button>
            </div>
          )}
          <label className="mt-5 flex cursor-pointer items-start gap-4 rounded-2xl border-2 border-brand bg-white p-5 text-left shadow-sm transition hover:bg-band motion-reduce:transition-none">
            <input
              type="checkbox"
              checked={subscribeNewsletter}
              onChange={(e) => setSubscribeNewsletter(e.target.checked)}
              className="mt-1 size-6 shrink-0 accent-brand"
            />
            <span className="text-lg font-extrabold leading-7 text-ink">
              Yes, send me the free weekly Retirement Watch — plain-English tips to make my money last.
            </span>
          </label>
          {emailError && <p id="results-email-error" className="mt-3 rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-semibold text-bad">{emailError}</p>}
          <p className="mt-3 text-xs text-slate-500">We email your report either way. We never sell your email — unsubscribe anytime.</p>
        </div>
      ) : (
        <div className="mt-10 space-y-6">
          {!LEADGEN_ONLY && emailNotice && <p className="rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm text-slate-700">{emailNotice}</p>}
          {report && (
            <div className="rg-card-highlight">
              <h3 className="text-2xl font-bold text-ink">What this means for you</h3>
              <p className="mt-3 text-lg leading-8 text-slate-700">{report.narrative}</p>
            </div>
          )}
          <div className="rg-card space-y-5">
            <div>
              <h3 className="text-2xl font-bold text-ink">What&apos;s behind your score</h3>
              <p className="mt-2 text-slate-600">These four sub-scores point to areas worth reviewing first.</p>
            </div>
            {(Object.keys(SUB_LABEL) as (keyof SubScores)[]).map((k) => (
              <div key={k} className="space-y-2">
                <SubScoreBar label={SUB_LABEL[k]} value={displayResult!.sub[k]} scoreKey={k} />
                {report?.subScoreNotes?.[k] && <p className="text-sm font-semibold leading-6 text-slate-600">{report.subScoreNotes[k]}</p>}
              </div>
            ))}
          </div>

          {report ? (
            <>
              <div className="rg-card">
                <h3 className="mb-3 text-2xl font-bold text-ink">Your personalized plan</h3>
                <div className="grid gap-4">
                  {report.plan.map((item, i) => (
                    <article key={`${item.title}-${i}`} className="rounded-2xl border border-slate-200 bg-surface p-5">
                      <p className="inline-flex rounded-full bg-brand/10 px-3 py-1 text-xs font-extrabold uppercase tracking-[0.14em] text-brand">{item.priority} priority</p>
                      <h4 className="mt-3 text-xl font-bold leading-7 text-ink">{item.title}</h4>
                      <p className="mt-2 text-sm font-semibold leading-6 text-slate-600">{item.why}</p>
                      <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-6 text-slate-700">
                        {item.steps.map((stepItem, stepIndex) => <li key={stepIndex}>{stepItem}</li>)}
                      </ul>
                    </article>
                  ))}
                </div>
              </div>

              <div className="rg-card">
                <h3 className="text-2xl font-bold text-ink">Questions to ask a fiduciary</h3>
                <ul className="mt-4 list-disc space-y-3 pl-5 text-base leading-7 text-slate-700">
                  {report.fiduciaryQuestions.map((question, i) => <li key={i}>{question}</li>)}
                </ul>
              </div>

              <div className="rounded-3xl border border-amber-200 bg-amber-50 p-6">
                <h3 className="text-2xl font-bold text-ink">Stay scam-safe</h3>
                <p className="mt-3 text-base font-semibold leading-7 text-slate-700">{report.scamNote}</p>
              </div>
            </>
          ) : (
            <div className="rg-card">
              <h3 className="text-2xl font-bold text-ink">Your sub-scores</h3>
              <p className="mt-2 text-slate-600">Your personalized report is not available yet, but these deterministic sub-scores show where to review first.</p>
            </div>
          )}

          {LEADGEN_ONLY ? (
            <div className="rg-card text-center">
              <h3 className="text-2xl font-bold text-ink">Your full report is on its way ✓</h3>
              <p className="mx-auto mt-3 max-w-2xl text-lg leading-7 text-slate-700">
                Check your inbox in the next few minutes (peek in Promotions/Spam just in case). You&apos;re on the list for the weekly Retirement Watch. Know someone who should check their score? Send them retireshield.com.
              </p>
            </div>
          ) : (
            <>
              {!accountDismissed && (
                <div className="rg-card-highlight">
                  <h3 className="text-2xl font-bold">Create your free account</h3>
                  <p className="mt-2 text-lg text-slate-700">Save your score and go ask your first question — pick a password.</p>
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
                      disabled={creatingAccount || password.length < 8}
                      className="disabled:opacity-50"
                    >
                      {creatingAccount ? "Creating account…" : "Create my account"}
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
                <Button href="/coach?firstQuestion=1" className="mt-5">
                  Ask your first question
                </Button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
    </div>
  );
}
