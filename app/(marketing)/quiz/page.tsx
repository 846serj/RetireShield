"use client";

import Link from "next/link";
import posthog from "posthog-js";
import { useEffect, useMemo, useRef, useState } from "react";
import { CORE_KEYS, QUESTIONS } from "@/lib/questions";
import { US_STATES } from "@/lib/usStates";
import { computeScores, type Answers, type Result } from "@/lib/scoring";
import { scoreBandToSlug } from "@/lib/shareBands";
import { ScoreGauge } from "@/components/ScoreGauge";
import { Button, Eyebrow } from "@/components/ui";

type State = Record<string, string | number | undefined>;

const SAFE_NEUTRAL_DEFAULTS: Partial<Answers> = {
  emergencyFund: "1-3",
  debt: "some",
  worry: "skip",
  planning_horizon_age: 95,
};

function withSafeNeutralDefaults(answers: State): Answers {
  const answered = Object.fromEntries(
    Object.entries(answers).filter(([, value]) => value !== undefined),
  );

  return {
    ...SAFE_NEUTRAL_DEFAULTS,
    ...answered,
  } as Answers;
}

const CORE_ORDER: ReadonlyMap<string, number> = new Map(
  CORE_KEYS.map((key, index) => [key, index]),
);

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
  const [firstName, setFirstName] = useState("");
  const [subscribeNewsletter, setSubscribeNewsletter] = useState(true);
  const [revealed, setRevealed] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [optionalStep, setOptionalStep] = useState(0);
  const [updatingOptional, setUpdatingOptional] = useState(false);
  const [serverResult, setServerResult] = useState<Result | null>(null);
  const [emailError, setEmailError] = useState("");
  const [copiedShareLink, setCopiedShareLink] = useState(false);
  const lastViewedQuestionRef = useRef<string | null>(null);
  const completedCapturedRef = useRef(false);

  const visible = useMemo(() => {
    const active = QUESTIONS.filter((q) => !q.when || q.when(answers));
    const core = active
      .filter((q) => q.core)
      .sort(
        (a, b) =>
          (CORE_ORDER.get(a.key) ?? 0) - (CORE_ORDER.get(b.key) ?? 0),
      );
    return [...core, ...active.filter((q) => !q.core)];
  }, [answers]);
  const coreQuestions = useMemo(() => visible.filter((q) => q.core), [visible]);
  const optionalQuestions = useMemo(
    () => visible.filter((q) => !q.core),
    [visible],
  );
  const done =
    introComplete && CORE_KEYS.every((key) => answers[key] !== undefined);
  const scoringAnswers = useMemo(
    () => withSafeNeutralDefaults(answers),
    [answers],
  );
  const result = useMemo(
    () => (done ? computeScores(scoringAnswers) : null),
    [done, scoringAnswers],
  );
  const displayResult = result ?? serverResult;
  const emailIsValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());

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
          firstName: firstName.trim(),
          answers: scoringAnswers,
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
          JSON.stringify({ answers: scoringAnswers, result: returnedResult }),
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

  async function submitOptionalAnswers(nextAnswers: State) {
    if (!emailIsValid || !firstName.trim()) return;

    const fullerAnswers = withSafeNeutralDefaults(nextAnswers);
    const fullerResult = computeScores(fullerAnswers);
    setUpdatingOptional(true);
    setServerResult(fullerResult);

    try {
      const params = new URLSearchParams(window.location.search);
      const res = await fetch("/api/lead", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim(),
          firstName: firstName.trim(),
          answers: fullerAnswers,
          result: fullerResult,
          source: params.get("utm_source") || "direct",
          campaign: params.get("utm_campaign") || "",
          subscribeNewsletter,
        }),
      });
      const payload = await res.json().catch(() => ({}));
      if (payload?.result) setServerResult(payload.result as Result);
    } finally {
      setUpdatingOptional(false);
    }
  }


  function getShareUrl() {
    if (!displayResult) return "";
    const bandSlug = scoreBandToSlug(displayResult.band);
    const url = new URL(`/s/${bandSlug}`, window.location.origin);
    url.searchParams.set("utm_source", "fb_share");
    url.searchParams.set("utm_medium", "score_share");
    url.searchParams.set("utm_campaign", "quiz");
    return url.toString();
  }

  async function shareResult() {
    if (!displayResult) return;
    const shareUrl = getShareUrl();
    const band = displayResult.band;
    if (navigator.share) {
      captureQuizEvent("score_share_clicked", { band, method: "web_share" });
      try {
        await navigator.share({
          title: "My Retirement Safety Score",
          text: "I checked how solid my retirement really is.",
          url: shareUrl,
        });
      } catch {
        /* User canceled or sharing was unavailable. */
      }
      return;
    }

    captureQuizEvent("score_share_clicked", { band, method: "facebook" });
    window.open(
      `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`,
      "fb-share",
      "width=600,height=500,noopener,noreferrer",
    );
  }

  async function copyShareLink() {
    if (!displayResult) return;
    const shareUrl = getShareUrl();
    captureQuizEvent("score_share_clicked", {
      band: displayResult.band,
      method: "copy",
    });
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopiedShareLink(true);
      window.setTimeout(() => setCopiedShareLink(false), 2000);
    } catch {
      setCopiedShareLink(false);
    }
  }

  function answerOptional(key: string, value: string | number | undefined) {
    const nextAnswers = { ...answers, [key]: value };
    setAnswers(nextAnswers);
    setOptionalStep((current) => current + 1);
    void submitOptionalAnswers(nextAnswers);
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
                Answer 6 quick questions to see your Safety Score, then add
                optional details only if you want a sharper result. Every answer
                stays private.
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
            <p className="mt-5 text-base font-bold leading-7 text-slate-700">
              Plus you&apos;ll get the free Retirement Shield newsletter —
              practical money help every Tuesday & Friday from Ellen Marsh.
            </p>
            <div className="mt-6 space-y-3">
              <p className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-600">
                ⏱ ~2 minutes · 🆓 Always free to see your score
              </p>
              <Link
                href="/newsletter"
                className="inline-flex text-sm font-bold text-brand underline transition hover:text-brandDark motion-reduce:transition-none"
              >
                Just want the free newsletter? Sign up here →
              </Link>
            </div>
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

    const progressPct = Math.round(((step + 1) / coreQuestions.length) * 100);
    return (
      <div key={`quiz-step-${step}`} className="rg-page-shell">
        <div className="mx-auto max-w-3xl px-4 py-12 sm:py-16">
          <div className="rg-card">
            <Eyebrow>Retirement Safety Score</Eyebrow>
            <div className="mb-3 mt-5 flex items-center justify-between gap-4 text-sm font-bold text-slate-500">
              <span>
                Question {step + 1} of {coreQuestions.length}
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
                Enter your name and email to unlock your four sub-scores and 3
                next steps, get your full report by email, and join the free
                Retirement Shield newsletter.
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
                    <label htmlFor="results-first-name" className="sr-only">
                      First name for unlocking full results
                    </label>
                    <input
                      id="results-first-name"
                      type="text"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      placeholder="First name"
                      autoComplete="given-name"
                      className="rg-input"
                    />
                  </div>
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
                    disabled={!firstName.trim() || !emailIsValid || submitting}
                    onClick={submitEmail}
                    className="disabled:opacity-50"
                  >
                    Show my full results
                  </Button>
                </div>
              )}
              <div className="mt-6 rounded-2xl border border-slate-200 bg-band p-4 text-left">
                <label className="flex cursor-pointer items-start gap-3">
                  <input
                    type="checkbox"
                    checked={subscribeNewsletter}
                    onChange={(e) => setSubscribeNewsletter(e.target.checked)}
                    className="mt-1 size-5 shrink-0 accent-brand"
                  />
                  <span>
                    <span className="block text-base font-bold text-ink">
                      Yes — send me the free Retirement Shield newsletter
                    </span>
                    <span className="mt-1 block text-sm leading-6 text-slate-600">
                      Twice a week (Tuesday & Friday), Ellen Marsh sends the
                      money you may be owed, the scams to dodge, and the Social
                      Security and Medicare changes that hit your check. Plain
                      English, always something you can use.
                    </span>
                  </span>
                </label>
              </div>
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
                minutes — peek in Promotions or Spam just in case, and drag it
                to your main inbox so future emails land there too.
              </p>
            </div>

            <div className="rg-card-highlight mt-6 text-center">
              <Eyebrow>Share your result</Eyebrow>
              <h2 className="mt-3 font-serif text-3xl font-semibold leading-tight text-ink">
                Know someone who should check theirs?
              </h2>
              <p className="mx-auto mt-3 max-w-2xl text-lg leading-8 text-slate-700">
                Share your result — they&apos;ll get their own free score. Your
                private numbers, name, email, and exact score are not included.
              </p>
              <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
                <Button type="button" onClick={shareResult}>
                  Share on Facebook
                </Button>
                <Button type="button" variant="secondary" onClick={copyShareLink}>
                  {copiedShareLink ? "Copied!" : "Copy link"}
                </Button>
              </div>
            </div>

            <ScoreGauge
              value={displayResult!.overall}
              band={displayResult!.band}
              subScores={[]}
              subtitle="Updated score"
              badge="Optional details"
            />
            <div className="rg-card mt-6">
              <Eyebrow>Want a sharper score?</Eyebrow>
              <h2 className="mt-3 font-serif text-3xl font-semibold leading-tight text-ink">
                Want a sharper score? Answer a few more (optional)
              </h2>
              <p className="mt-3 text-lg leading-8 text-slate-700">
                These details are optional. Answer what you know, or skip any
                question and keep your core score.
              </p>
              {optionalStep < optionalQuestions.length ? (
                <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-5">
                  {(() => {
                    const q = optionalQuestions[optionalStep];
                    if (!q) return null;
                    return (
                      <>
                        <p className="text-sm font-bold uppercase tracking-[0.2em] text-slate-500">
                          Optional question {optionalStep + 1} of{" "}
                          {optionalQuestions.length}
                        </p>
                        <h3 className="mt-3 text-2xl font-bold text-ink">
                          {q.prompt}
                        </h3>
                        {q.help && (
                          <p className="mt-2 text-base leading-7 text-slate-600">
                            {q.help}
                          </p>
                        )}
                        {q.kind === "state" ? (
                          <div className="mt-5">
                            <select
                              defaultValue={(answers[q.key] as string) ?? ""}
                              onChange={(e) => {
                                if (e.target.value) {
                                  answerOptional(q.key, e.target.value);
                                }
                              }}
                              className="rg-input min-h-16 text-xl"
                            >
                              <option value="" disabled>
                                Select your state…
                              </option>
                              {US_STATES.map((state) => (
                                <option key={state.code} value={state.code}>
                                  {state.name}
                                </option>
                              ))}
                            </select>
                          </div>
                        ) : (
                          <div className="mt-5 grid gap-3">
                            {q.choices.map((choice) => (
                              <button
                                key={String(choice.value)}
                                type="button"
                                onClick={() =>
                                  answerOptional(q.key, choice.value)
                                }
                                className="min-h-14 rounded-2xl border-2 border-slate-200 bg-white px-5 py-3 text-left text-lg font-bold text-ink shadow-sm transition hover:border-brand hover:bg-band focus-visible:ring-brand/20 motion-reduce:transition-none"
                              >
                                {choice.label}
                              </button>
                            ))}
                          </div>
                        )}
                        <button
                          type="button"
                          onClick={() => answerOptional(q.key, undefined)}
                          className="mt-5 font-bold text-slate-500 underline transition hover:text-brand motion-reduce:transition-none"
                        >
                          Skip this one
                        </button>
                      </>
                    );
                  })()}
                </div>
              ) : (
                <p className="mt-6 rounded-2xl border border-brand/20 bg-band p-5 text-lg font-bold text-ink">
                  You&apos;re all set — we&apos;ll keep your latest score on screen.
                </p>
              )}
              {updatingOptional && (
                <p className="mt-4 text-sm font-bold text-slate-500">
                  Updating your report with the latest answers…
                </p>
              )}
            </div>
            {subscribeNewsletter && (
              <div className="rg-card-highlight mt-6 text-center">
                <h2 className="font-serif text-3xl font-semibold leading-tight text-ink sm:text-4xl">
                  You&apos;re in — welcome to Retirement Shield
                </h2>
                <p className="mx-auto mt-4 max-w-2xl text-lg leading-8 text-slate-700">
                  Twice a week — every Tuesday & Friday — you&apos;ll get our
                  free email from Ellen Marsh — Retirement Shield: the money you
                  may be owed, the
                  scams to dodge, and the Social Security and Medicare changes
                  that hit your check. Plain English, always something you can
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
