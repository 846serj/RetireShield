"use client";

import posthog from "posthog-js";
import { useEffect, useMemo, useRef, useState } from "react";
import { QUESTIONS } from "@/lib/questions";
import { US_STATES } from "@/lib/usStates";
import { computeScores, type Answers, type Result } from "@/lib/scoring";
import { ScoreGauge } from "@/components/ScoreGauge";
import { Button, Eyebrow } from "@/components/ui";

type State = Record<string, string | number | undefined>;

function captureQuizEvent(
  event: string,
  properties?: Record<string, string | number | boolean>,
) {
  if (!posthog.__loaded) return;
  posthog.capture(event, properties);
}

export default function Quiz() {
  const [step, setStep] = useState(0);
  const [introComplete, setIntroComplete] = useState(false);
  const [answers, setAnswers] = useState<State>({});
  const [selectedChoice, setSelectedChoice] = useState<string | number | null>(
    null,
  );
  const [email, setEmail] = useState("");
  const [subscribeNewsletter, setSubscribeNewsletter] = useState(true);
  const [revealed, setRevealed] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [serverResult, setServerResult] = useState<Result | null>(null);
  const [emailError, setEmailError] = useState("");
  const lastViewedQuestionRef = useRef<string | null>(null);
  const completedCapturedRef = useRef(false);

  const visible = useMemo(
    () => QUESTIONS.filter((q) => !q.when || q.when(answers)),
    [answers],
  );
  const done = introComplete && step >= visible.length;
  const result = useMemo(
    () => (done ? computeScores(answers as unknown as Answers) : null),
    [done, answers],
  );
  const displayResult = serverResult ?? result;

  useEffect(() => {
    if (!introComplete || done) return;
    const question = visible[step];
    if (!question) return;

    const questionKind = (question as { kind: string }).kind;
    if (questionKind !== "choice" && questionKind !== "state") {
      trackStepAnswered(step, question.key);
      goToStep(step + 1);
    }
  }, [done, introComplete, step, visible]);

  useEffect(() => {
    if (!introComplete || done) return;
    const question = visible[step];
    if (!question) return;

    const viewedKey = `${step}:${question.key}`;
    if (lastViewedQuestionRef.current === viewedKey) return;

    lastViewedQuestionRef.current = viewedKey;
    captureQuizEvent("quiz_step_viewed", { index: step, key: question.key });
  }, [done, introComplete, step, visible]);

  useEffect(() => {
    if (!done || !displayResult || completedCapturedRef.current) return;
    completedCapturedRef.current = true;
    captureQuizEvent("quiz_completed", {
      overall: displayResult.overall,
      band: displayResult.band,
    });
  }, [displayResult, done]);

  function trackStepAnswered(index: number, key: string) {
    captureQuizEvent("quiz_step_answered", { index, key });
  }

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
    trackStepAnswered(step, key);
    window.setTimeout(() => goToStep(step + 1), 180);
  }

  async function submitEmail() {
    const normalizedEmail = email.trim();
    setSubmitting(true);
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
        setEmailError(
          "We could not save your email. Please check it and try again.",
        );
        return;
      }
      const returnedResult = payload.result
        ? (payload.result as Result)
        : result;
      if (returnedResult) setServerResult(returnedResult);
      // Cache so ScoreHydrator can restore this score after sign-up elsewhere.
      try {
        localStorage.setItem(
          "rg_score",
          JSON.stringify({ answers, result: returnedResult }),
        );
      } catch {
        /* ignore */
      }
      captureQuizEvent("quiz_email_submitted", { subscribeNewsletter });
      captureQuizEvent("report_generated");
      setRevealed(true);
    } catch {
      setEmailError("We could not reach the server. Please try again.");
    } finally {
      setSubmitting(false);
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
                Are you on track to run out of money in retirement? Find out in
                5 minutes.
              </p>
              <h1 className="mt-4 font-serif text-[2rem] font-semibold leading-tight text-ink sm:text-5xl">
                Let&apos;s see where your retirement stands.
              </h1>
              <p className="mt-5 text-xl font-semibold leading-8 text-slate-700">
                About 5 minutes. The more you share, the more accurate and
                personal your Safety Score and action steps. Every answer stays
                private.
              </p>
            </div>
            <Button
              type="button"
              onClick={() => {
                captureQuizEvent("quiz_started");
                setIntroComplete(true);
              }}
              className="mt-8 w-full sm:w-auto"
            >
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
    if (!q) return null;

    const qKind = (q as { kind: string }).kind;
    if (qKind !== "choice" && qKind !== "state") {
      return <div key={`quiz-step-${step}`} className="rg-page-shell" />;
    }

    const progressPct = Math.round(((step + 1) / visible.length) * 100);
    return (
      <div key={`quiz-step-${step}`} className="rg-page-shell">
        <div className="mx-auto max-w-3xl px-4 py-12 sm:py-16">
          <div className="rg-card">
            <Eyebrow>Retirement Safety Score</Eyebrow>
            <div className="mb-3 mt-5 flex items-center justify-between gap-4 text-sm font-bold text-slate-500">
              <span>
                Question {step + 1} of {visible.length}
              </span>
              <span>{progressPct}%</span>
            </div>
            <div
              className="mb-8 h-5 w-full overflow-hidden rounded-full bg-slate-200"
              role="progressbar"
              aria-label="Quiz progress"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={progressPct}
            >
              <div
                className="h-full rounded-full bg-brand transition-all duration-500 ease-out motion-reduce:transition-none"
                style={{ width: `${progressPct}%` }}
              />
            </div>
            <h1 className="font-serif text-[1.625rem] font-semibold leading-tight text-ink sm:text-3xl">
              {q.prompt}
            </h1>
            {q.help && (
              <p className="mb-8 mt-3 text-lg leading-7 text-slate-600">
                {q.help}
              </p>
            )}

            {q.kind === "state" && (
              <div>
                <label
                  htmlFor={`quiz-${q.key}`}
                  className="mb-2 block text-base font-bold text-ink"
                >
                  Select your state
                </label>
                <select
                  id={`quiz-${q.key}`}
                  defaultValue={(answers[q.key] as string) ?? ""}
                  onChange={(e) => {
                    if (e.target.value) {
                      setAnswer(q.key, e.target.value);
                      trackStepAnswered(step, q.key);
                      window.setTimeout(() => goToStep(step + 1), 120);
                    }
                  }}
                  className="rg-input min-h-16 text-xl"
                >
                  <option value="" disabled>
                    Select your state…
                  </option>
                  {US_STATES.map((s) => (
                    <option key={s.code} value={s.code}>
                      {s.name}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => {
                    setAnswer(q.key, undefined);
                    trackStepAnswered(step, q.key);
                    goToStep(step + 1);
                  }}
                  className="mt-4 min-h-14 w-full rounded-xl border-2 border-slate-200 bg-white px-6 py-3 text-lg font-bold text-slate-600 transition hover:border-brand hover:bg-band sm:w-auto motion-reduce:transition-none"
                >
                  Skip for now
                </button>
              </div>
            )}

            {q.kind === "choice" && (
              <div className="grid gap-3">
                {q.choices.map((c) => {
                  const currentValue = answers[q.key] ?? q.defaultValue;
                  const isSelected =
                    selectedChoice === c.value || currentValue === c.value;
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
                  );
                })}
              </div>
            )}

            <button
              onClick={() =>
                step > 0 ? goToStep(step - 1) : setIntroComplete(false)
              }
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
        {!revealed ? (
          <>
            <ScoreGauge
              value={displayResult!.overall}
              band={displayResult!.band}
              subScores={[]}
              subtitle="Your result"
              badge="Visible now"
            />
            <div className="rg-card-highlight mt-8 text-center">
              <h2 className="text-2xl font-bold">
                See exactly what&apos;s behind your score — and your 3 next
                steps.
              </h2>
              <p className="mx-auto mt-3 max-w-2xl text-slate-600">
                Enter your email and we&apos;ll unlock your four sub-scores + 3
                steps and email you your full personalized report.
              </p>
              {submitting ? (
                <div className="mt-5 flex w-full items-center justify-center gap-3 rounded-2xl border border-brand/20 bg-white p-5 text-left shadow-sm">
                  <span
                    className="size-5 animate-spin rounded-full border-2 border-brand/30 border-t-brand"
                    aria-hidden="true"
                  />
                  <p className="text-lg font-bold text-ink">
                    Building your personalized report… This usually takes just a
                    few seconds.
                  </p>
                </div>
              ) : (
                <div className="mt-5 flex flex-col gap-3 sm:flex-row">
                  <div className="flex-1 text-left">
                    <label htmlFor="results-email" className="sr-only">
                      Email address for unlocking full results
                    </label>
                    <input
                      id="results-email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@email.com"
                      autoComplete="email"
                      className="rg-input"
                      aria-describedby={
                        emailError ? "results-email-error" : undefined
                      }
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
              <label className="mt-5 flex cursor-pointer items-start gap-3 p-1 text-left">
                <input
                  type="checkbox"
                  checked={subscribeNewsletter}
                  onChange={(e) => setSubscribeNewsletter(e.target.checked)}
                  className="mt-1 size-4 shrink-0 accent-brand"
                />
                <span className="text-sm font-medium leading-6 text-slate-600">
                  Yes, send me the free weekly Retirement Shield — plain-English
                  tips to make my money last.
                </span>
              </label>
              {emailError && (
                <p
                  id="results-email-error"
                  className="mt-3 rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-semibold text-bad"
                >
                  {emailError}
                </p>
              )}
              <p className="mt-3 text-xs text-slate-500">
                We email your report either way. We never sell your email —
                unsubscribe anytime.
              </p>
            </div>
          </>
        ) : (
          <>
            <div className="rg-card mt-8 text-center">
              <h2 className="text-2xl font-bold text-ink">
                Your report is on its way
              </h2>
              <p className="mx-auto mt-3 max-w-2xl text-lg leading-8 text-slate-700">
                We just emailed your personalized Retirement Safety Score and
                action plan to {email.trim()}. Check your inbox in the next few
                minutes — peek in Promotions or Spam just in case, and drag it to
                your main inbox so future emails land there too.
              </p>
              <p className="mx-auto mt-4 max-w-2xl text-lg font-bold leading-7 text-ink">
                Know someone who should check theirs? Send them retireshield.com.
              </p>
            </div>
            {subscribeNewsletter && (
              <div className="rg-card-highlight mt-6 text-center">
                <h2 className="font-serif text-3xl font-semibold leading-tight text-ink sm:text-4xl">
                  You&apos;re in — welcome to Retirement Shield
                </h2>
                <p className="mx-auto mt-4 max-w-2xl text-lg leading-8 text-slate-700">
                  Twice a week — every Tuesday and Friday — you&apos;ll get our free
                  email from Ellen Marsh: the money you may be owed, the scams
                  to dodge, and the Social Security and Medicare changes that
                  hit your check. Plain English, always something you can
                  actually use.
                </p>
                <p className="mx-auto mt-5 max-w-2xl rounded-2xl border border-brand/20 bg-white px-5 py-4 text-lg font-bold leading-7 text-ink shadow-sm">
                  Watch for an email from Ellen Marsh — Retirement Shield. Add
                  us to your contacts and drag our emails to your main inbox so
                  you never miss one.
                </p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
