"use client";

import Link from "next/link";
import posthog from "posthog-js";
import { useEffect, useMemo, useRef, useState } from "react";
import { QUESTIONS, QUESTION_SECTIONS } from "@/lib/questions";
import { US_STATES } from "@/lib/usStates";
import { ACTION_LIB, computeScores, type Answers, type Result, type SubScores } from "@/lib/scoring";
import { scoreBandToSlug } from "@/lib/shareBands";
import { ScoreGauge } from "@/components/ScoreGauge";
import { Button, Eyebrow } from "@/components/ui";

type State = Record<string, string | number | undefined>;
type EmailMode = "inline" | "modal";
type WeakArea = { key: keyof SubScores; name: string; score: number; action: string };

const BASELINE_KEYS = ["age", "maritalStatus", "guaranteedIncome", "essentialExpenses"] as const;
const AREA_NAMES: Record<keyof SubScores, string> = {
  income: "Guaranteed income vs. your monthly bills",
  withdrawal: "Making your savings last",
  inflation: "Keeping up with rising costs",
  market: "Your investment risk and cash cushion",
};

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

function answeredValue(value: string | number | undefined) {
  return value !== undefined && value !== "";
}

function withSafeNeutralDefaults(answers: State): Answers {
  const age = Number(answers.age ?? 67);
  const answered = Object.fromEntries(Object.entries(answers).filter(([, value]) => answeredValue(value)));

  return {
    status: "retired",
    savings: 100000,
    stockPct: clamp(110 - age, 20, 90) as Answers["stockPct"],
    emergencyFund: "1-3",
    debt: "some",
    worry: "skip",
    planning_horizon_age: 95,
    ...answered,
  } as Answers;
}

function captureQuizEvent(event: string, properties?: Record<string, string | number | boolean>) {
  if (!posthog.__loaded) return;
  posthog.capture(event, properties);
}

function weakestAreas(result: Result | null): WeakArea[] {
  if (!result) return [];
  return (Object.entries(result.sub) as [keyof SubScores, number][]) 
    .sort((a, b) => a[1] - b[1])
    .slice(0, 2)
    .map(([key, score]) => ({ key, score, name: AREA_NAMES[key], action: ACTION_LIB[key] }));
}

function PersonalizedGapSummary({ result }: { result: Result | null }) {
  const areas = weakestAreas(result);
  if (!areas.length) return null;
  const [weakest, second] = areas;
  return (
    <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-4 text-left shadow-sm">
      <p className="text-base font-bold leading-7 text-ink">
        Your biggest gap: {weakest.name} — {weakest.score}/100.
      </p>
      <p className="mt-2 text-sm leading-6 text-slate-700">{weakest.action}</p>
      {second && (
        <p className="mt-3 text-sm font-semibold leading-6 text-slate-600">
          Also worth a look: {second.name} ({second.score}/100).
        </p>
      )}
    </div>
  );
}

export default function Quiz() {
  const [step, setStep] = useState(0);
  const [introComplete, setIntroComplete] = useState(false);
  const [answers, setAnswers] = useState<State>({});
  const [selectedChoice, setSelectedChoice] = useState<string | number | null>(null);
  const [email, setEmail] = useState("");
  const [firstName, setFirstName] = useState("");
  const [subscribeNewsletter, setSubscribeNewsletter] = useState(true);
  const [revealed, setRevealed] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [serverResult, setServerResult] = useState<Result | null>(null);
  const [emailError, setEmailError] = useState("");
  const [copiedShareLink, setCopiedShareLink] = useState(false);
  const [emailMode, setEmailMode] = useState<EmailMode>("inline");
  const lastViewedQuestionRef = useRef<string | null>(null);
  const completedCapturedRef = useRef(false);

  const visible = useMemo(() => QUESTIONS.filter((q) => !q.when || q.when(answers)), [answers]);
  const totalApplicable = visible.length;
  const answeredCount = useMemo(() => visible.filter((q) => answeredValue(answers[q.key])).length, [answers, visible]);
  const baselineMet = introComplete && BASELINE_KEYS.every((key) => answeredValue(answers[key]));
  const scoringAnswers = useMemo(() => withSafeNeutralDefaults(answers), [answers]);
  const result = useMemo(() => (baselineMet ? computeScores(scoringAnswers) : null), [baselineMet, scoringAnswers]);
  const displayResult = result ?? serverResult;
  const weakAreas = weakestAreas(displayResult);
  const weakestAreaName = weakAreas[0]?.name ?? "your retirement plan";
  const emailIsValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
  const finished = introComplete && step >= totalApplicable;
  const currentQuestion = visible[Math.min(step, Math.max(totalApplicable - 1, 0))];
  const currentSectionIndex = currentQuestion ? QUESTION_SECTIONS.findIndex((section) => (section.keys as readonly string[]).includes(currentQuestion.key)) : 0;
  const currentSection = QUESTION_SECTIONS[Math.max(0, currentSectionIndex)] ?? QUESTION_SECTIONS[0];
  const progressPct = totalApplicable ? Math.round((Math.min(step, totalApplicable) / totalApplicable) * 100) : 0;

  useEffect(() => {
    if (!introComplete || finished || !currentQuestion) return;
    const viewedKey = `${step}:${currentQuestion.key}`;
    if (lastViewedQuestionRef.current === viewedKey) return;
    lastViewedQuestionRef.current = viewedKey;
    captureQuizEvent("quiz_step_viewed", { index: step, key: currentQuestion.key });
  }, [currentQuestion, finished, introComplete, step]);

  useEffect(() => {
    if (!finished || !displayResult || completedCapturedRef.current) return;
    completedCapturedRef.current = true;
    captureQuizEvent("quiz_completed", { overall: displayResult.overall, band: displayResult.band });
  }, [displayResult, finished]);

  function trackStepAnswered(index: number, key: string) {
    captureQuizEvent("quiz_step_answered", { index, key });
  }

  function setAnswer(key: string, value: string | number | undefined) {
    setAnswers((p) => ({ ...p, [key]: value }));
  }

  function goToStep(nextStep: number) {
    setSelectedChoice(null);
    setStep(Math.max(0, Math.min(nextStep, totalApplicable)));
  }

  function selectChoice(key: string, value: string | number) {
    setSelectedChoice(value);
    setAnswer(key, value);
    trackStepAnswered(step, key);
    window.setTimeout(() => goToStep(step + 1), 180);
  }

  function openEmailCapture(mode: EmailMode = "modal") {
    if (!displayResult) return;
    setEmailMode(mode);
    setRevealed(false);
  }

  async function submitEmail() {
    if (!displayResult) return;
    const normalizedEmail = email.trim();
    const isEarlyExit = !finished;
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
          result: displayResult,
          source: params.get("utm_source") || "direct",
          campaign: params.get("utm_campaign") || "",
          subscribeNewsletter,
          answeredCount,
          totalApplicable,
          isComplete: finished,
        }),
      });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok || !payload.ok) {
        setEmailError("We could not save your email. Please check it and try again.");
        return;
      }
      const returnedResult = payload.result ? (payload.result as Result) : displayResult;
      if (returnedResult) setServerResult(returnedResult);
      try {
        localStorage.setItem("rg_score", JSON.stringify({ answers: scoringAnswers, result: returnedResult }));
      } catch {}
      captureQuizEvent("quiz_email_submitted", { subscribeNewsletter });
      if (isEarlyExit) captureQuizEvent("quiz_email_exit", { answeredCount });
      captureQuizEvent("report_generated");
      setRevealed(true);
    } catch {
      setEmailError("We could not reach the server. Please try again.");
    } finally {
      setSubmitting(false);
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
        await navigator.share({ title: "My Retirement Safety Score", text: "I checked how solid my retirement really is.", url: shareUrl });
      } catch {}
      return;
    }
    captureQuizEvent("score_share_clicked", { band, method: "facebook" });
    window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`, "fb-share", "width=600,height=500,noopener,noreferrer");
  }

  async function copyShareLink() {
    if (!displayResult) return;
    const shareUrl = getShareUrl();
    captureQuizEvent("score_share_clicked", { band: displayResult.band, method: "copy" });
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopiedShareLink(true);
      window.setTimeout(() => setCopiedShareLink(false), 2000);
    } catch {
      setCopiedShareLink(false);
    }
  }

  const EmailCapture = (
    <div className="rg-card-highlight mt-6 text-center">
      <h2 className="text-2xl font-bold">Email me my score + full details</h2>
      <p className="mx-auto mt-3 max-w-2xl text-slate-700">
        Your score found gaps in {weakestAreaName}. The free Retirement Shield newsletter is how you close them — every Tuesday and Friday, Ellen Marsh walks you through practical steps to strengthen exactly these areas. Enter your email to get your full action plan and start raising your score.
      </p>
      <PersonalizedGapSummary result={displayResult} />
      {submitting ? (
        <div className="mt-5 flex w-full items-center justify-center gap-3 rounded-2xl border border-brand/20 bg-white p-5 text-left shadow-sm">
          <span className="size-5 animate-spin rounded-full border-2 border-brand/30 border-t-brand" aria-hidden="true" />
          <p className="text-lg font-bold text-ink">Building your personalized report. This usually takes just a few seconds.</p>
        </div>
      ) : (
        <div className="mt-5 grid gap-3 sm:grid-cols-[1fr_1fr_auto]">
          <input type="text" value={firstName} onChange={(e) => setFirstName(e.target.value)} placeholder="First name" autoComplete="given-name" className="rg-input" />
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@email.com" autoComplete="email" className="rg-input" aria-describedby={emailError ? "results-email-error" : undefined} />
          <Button disabled={!firstName.trim() || !emailIsValid || submitting} onClick={submitEmail} className="disabled:opacity-50">Send my plan</Button>
        </div>
      )}
      <div className="mt-6 rounded-2xl border border-slate-200 bg-band p-4 text-left">
        <label className="flex cursor-pointer items-start gap-3">
          <input type="checkbox" checked={subscribeNewsletter} onChange={(e) => setSubscribeNewsletter(e.target.checked)} className="mt-1 size-5 shrink-0 accent-brand" />
          <span>
            <span className="block text-base font-bold text-ink">Yes — send me the free Retirement Shield newsletter</span>
            <span className="mt-1 block text-sm leading-6 text-slate-600">Every Tuesday and Friday, Ellen Marsh sends practical, plain-English steps to strengthen the weak areas your score found.</span>
          </span>
        </label>
      </div>
      {emailError && <p id="results-email-error" className="mt-3 rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-semibold text-bad">{emailError}</p>}
      <p className="mt-3 text-xs text-slate-500">We email your report either way. We never sell your email — unsubscribe anytime.</p>
    </div>
  );

  if (!introComplete) {
    return (
      <div className="rg-page-shell">
        <div className="mx-auto flex min-h-[calc(100vh-5rem)] max-w-3xl items-center px-4 py-6 sm:py-10">
          <section className="w-full overflow-hidden rounded-[2rem] bg-brand-dark px-5 py-8 text-center text-white shadow-2xl shadow-brand-dark/20 sm:px-10 sm:py-12">
            <Eyebrow className="text-[#8FB3D9]">FOR ANYONE THINKING ABOUT RETIREMENT</Eyebrow>
            <h1 className="mx-auto mt-6 max-w-2xl font-serif text-[2.75rem] font-semibold leading-[0.98] tracking-[-0.04em] text-white sm:text-6xl">Take the <span className="text-[#7BD3A8]">Retirement Quiz</span> and See <span className="text-[#7BD3A8]">How Solid</span> Your Plan Really Is.</h1>
            <p className="mx-auto mt-6 max-w-xl text-center text-lg font-semibold leading-8 text-white/90 sm:text-xl">Education-only, no brokerage linking, no sales pitch — just a clear picture that sharpens as you answer.</p>
            <Button type="button" onClick={() => { captureQuizEvent("quiz_started"); setIntroComplete(true); }} style={{ backgroundColor: "#2E9E6A", borderColor: "#2E9E6A" }} className="mx-auto mt-8 min-h-16 w-full px-6 py-4 text-white shadow-[0_18px_45px_rgba(46,158,106,0.4)] hover:!bg-[#278a5c] hover:!border-[#278a5c] sm:max-w-md">Start my score</Button>
          </section>
        </div>
      </div>
    );
  }

  if (revealed) {
    return (
      <div className="rg-page-shell"><div className="mx-auto max-w-3xl px-4 py-12 sm:py-16">
        <div className="rg-card mt-8 text-center">
          <h2 className="text-2xl font-bold text-ink">Your action plan is on its way.</h2>
          <p className="mx-auto mt-3 max-w-2xl text-lg leading-8 text-slate-700">Watch for Retirement Shield from Ellen Marsh every Tuesday and Friday — it&apos;s your step-by-step plan to raise this score.</p>
          {!finished && <p className="mx-auto mt-3 max-w-2xl text-base font-semibold leading-7 text-slate-600">You can keep answering to sharpen your score anytime.</p>}
          <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
            {!finished && <Button type="button" onClick={() => setRevealed(false)}>Keep answering</Button>}
            <Button type="button" variant="secondary" onClick={shareResult}>Share on Facebook</Button>
            <Button type="button" variant="secondary" onClick={copyShareLink}>{copiedShareLink ? "Copied!" : "Copy link"}</Button>
          </div>
        </div>
      </div></div>
    );
  }

  return (
    <div className="rg-page-shell">
      <div className="mx-auto grid max-w-6xl gap-6 px-4 py-8 lg:grid-cols-[minmax(0,1fr)_360px]">
        <main>
          {finished ? (
            <div className="rg-card">
              <Eyebrow>Quiz complete</Eyebrow>
              <h1 className="mt-3 font-serif text-3xl font-semibold leading-tight text-ink">Your score is ready, and your answers made it sharper.</h1>
              <p className="mt-3 text-lg leading-8 text-slate-700">Email yourself the full action plan now, or share the score privately without exposing your personal answers.</p>
              <PersonalizedGapSummary result={displayResult} />
              {emailMode === "inline" && EmailCapture}
            </div>
          ) : currentQuestion ? (
            <div className="rg-card">
              <Eyebrow>Retirement Safety Score</Eyebrow>
              <div className="mb-3 mt-5 flex items-center justify-between gap-4 text-sm font-bold text-slate-500"><span>Section {currentSectionIndex + 1} of {QUESTION_SECTIONS.length}: {currentSection.label}</span><span>{progressPct}%</span></div>
              <div className="mb-4 h-4 w-full overflow-hidden rounded-full bg-slate-200" role="progressbar" aria-label="Quiz progress" aria-valuemin={0} aria-valuemax={100} aria-valuenow={progressPct}><div className="h-full rounded-full bg-brand transition-all duration-500 ease-out motion-reduce:transition-none" style={{ width: `${progressPct}%` }} /></div>
              <p className="mb-6 text-sm font-semibold text-slate-600">{currentSection.lead}</p>
              <h1 className="font-serif text-[1.625rem] font-semibold leading-tight text-ink sm:text-3xl">{currentQuestion.prompt}</h1>
              {currentQuestion.help && <p className="mb-8 mt-3 text-lg leading-7 text-slate-600">{currentQuestion.help}</p>}
              {currentQuestion.kind === "state" ? (
                <div>
                  <label htmlFor={`quiz-${currentQuestion.key}`} className="mb-2 block text-base font-bold text-ink">Select your state</label>
                  <select id={`quiz-${currentQuestion.key}`} value={(answers[currentQuestion.key] as string) ?? ""} onChange={(e) => { if (e.target.value) { setAnswer(currentQuestion.key, e.target.value); trackStepAnswered(step, currentQuestion.key); window.setTimeout(() => goToStep(step + 1), 120); } }} className="rg-input min-h-16 text-xl">
                    <option value="" disabled>Select your state…</option>
                    {US_STATES.map((s) => <option key={s.code} value={s.code}>{s.name}</option>)}
                  </select>
                  <button type="button" onClick={() => { setAnswer(currentQuestion.key, undefined); trackStepAnswered(step, currentQuestion.key); goToStep(step + 1); }} className="mt-4 min-h-14 w-full rounded-xl border-2 border-slate-200 bg-white px-6 py-3 text-lg font-bold text-slate-600 transition hover:border-brand hover:bg-band sm:w-auto motion-reduce:transition-none">Skip for now</button>
                </div>
              ) : (
                <div className="grid gap-3">
                  {currentQuestion.choices.map((choice) => {
                    const currentValue = answers[currentQuestion.key] ?? currentQuestion.defaultValue;
                    const isSelected = selectedChoice === choice.value || currentValue === choice.value;
                    return <button key={String(choice.value)} type="button" onClick={() => selectChoice(currentQuestion.key, choice.value)} aria-pressed={isSelected} className={`min-h-16 rounded-2xl border-2 px-5 py-4 text-left text-xl font-bold text-ink shadow-sm transition hover:border-brand hover:bg-band focus-visible:ring-brand/20 motion-reduce:transition-none ${isSelected ? "border-brand bg-band shadow-brand/10" : "border-slate-200 bg-white"}`}>{choice.label}</button>;
                  })}
                </div>
              )}
              <div className="mt-8 flex items-center justify-between gap-3">
                <button type="button" onClick={() => (step > 0 ? goToStep(step - 1) : setIntroComplete(false))} className="font-bold text-slate-500 underline transition hover:text-brand motion-reduce:transition-none">Back</button>
                <button type="button" onClick={() => goToStep(step + 1)} className="font-bold text-slate-500 underline transition hover:text-brand motion-reduce:transition-none">Skip</button>
              </div>
            </div>
          ) : null}
        </main>
        <aside className="lg:sticky lg:top-6 lg:self-start">
          <div className="rg-card">
            {displayResult ? (
              <>
                <ScoreGauge value={displayResult.overall} band={displayResult.band} subScores={[]} subtitle="Live estimate" badge="Updates as you answer" />
                <p className="mt-4 text-center text-sm font-semibold leading-6 text-slate-600">Estimate — based on {answeredCount} of {totalApplicable} answers. Keep going to sharpen it.</p>
                <PersonalizedGapSummary result={displayResult} />
                <Button type="button" onClick={() => openEmailCapture("modal")} className="mt-5 w-full">Email me my score + full details</Button>
              </>
            ) : (
              <div className="rounded-2xl border border-slate-200 bg-band p-5 text-center"><h2 className="text-xl font-bold text-ink">Answer a few basics to see your score.</h2><p className="mt-2 text-sm leading-6 text-slate-600">Once age, marital status, guaranteed income, and essential bills are answered, your live score appears here.</p></div>
            )}
          </div>
          {displayResult && emailMode === "modal" && EmailCapture}
        </aside>
      </div>
      <div className="mx-auto max-w-6xl px-4 pb-8 text-center text-sm text-slate-500"><Link href="/privacy" className="underline">Privacy</Link> · Educational information only, not financial, tax, or legal advice.</div>
    </div>
  );
}
