"use client";

import Link from "next/link";
import posthog from "posthog-js";
import { useEffect, useMemo, useRef, useState } from "react";
import { CORE_KEYS, QUESTIONS, type Question } from "@/lib/questions";
import { US_STATES } from "@/lib/usStates";
import { ACTION_LIB, computeScores, type Answers, type Result, type SubScores } from "@/lib/scoring";
import { scoreBandToSlug } from "@/lib/shareBands";
import { ScoreGauge } from "@/components/ScoreGauge";
import { Button, Eyebrow } from "@/components/ui";

type State = Record<string, string | number | undefined>;
type Phase = "core" | "email" | "confirm" | "deepen";
type WeakArea = { key: keyof SubScores; name: string; score: number; action: string };

const AREA_NAMES: Record<keyof SubScores, string> = {
  income: "Guaranteed income vs. your monthly bills",
  withdrawal: "Making your savings last",
  inflation: "Keeping up with rising costs",
  market: "Your investment risk and cash cushion",
};

const coreKeySet = new Set<string>(CORE_KEYS);
const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));
const money = new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 });

function answeredValue(value: string | number | undefined) {
  return value !== undefined && value !== "";
}

function withSafeNeutralDefaults(answers: State): Answers {
  const age = Number(answers.age ?? 67);
  const answered = Object.fromEntries(Object.entries(answers).filter(([, value]) => answeredValue(value) && value !== "skip"));

  return {
    age,
    status: "retired",
    guaranteedIncome: 3500,
    essentialExpenses: 3500,
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
  return (
    <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-4 text-left shadow-sm">
      {areas.map((area, index) => (
        <div key={area.key} className={index ? "mt-4 border-t border-slate-100 pt-4" : undefined}>
          <p className="text-base font-bold leading-7 text-ink">
            {index === 0 ? "Biggest gap" : "Second gap"}: {area.name} — {area.score}/100.
          </p>
          <p className="mt-2 text-sm leading-6 text-slate-700">{area.action}</p>
        </div>
      ))}
    </div>
  );
}

function lifestyleGapLine(answers: State) {
  const desired = Number(answers.desiredLifestyleSpending ?? 0);
  if (!desired) return "Your lifestyle target helps show whether retirement is merely covered or genuinely comfortable.";
  const guaranteedIncome = Number(answers.guaranteedIncome ?? 0);
  const sustainableDraw = Math.max(0, Number(answers.savings ?? 0)) * 0.04 / 12;
  const available = guaranteedIncome + sustainableDraw;
  const gap = Math.max(0, desired - available);
  if (gap > 0) {
    return `You can cover your essentials, but there is roughly a $${money.format(Math.round(gap / 100) * 100)}/mo gap to the retirement lifestyle you want — the newsletter tackles closing gaps like this.`;
  }
  return "Your desired retirement lifestyle appears covered by guaranteed income plus a conservative draw from savings, based on these estimates.";
}

export default function Quiz() {
  const [step, setStep] = useState(0);
  const [phase, setPhase] = useState<Phase>("core");
  const [introComplete, setIntroComplete] = useState(false);
  const [answers, setAnswers] = useState<State>({});
  const [selectedChoice, setSelectedChoice] = useState<string | number | null>(null);
  const [email, setEmail] = useState("");
  const [firstName, setFirstName] = useState("");
  const [subscribeNewsletter, setSubscribeNewsletter] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [serverResult, setServerResult] = useState<Result | null>(null);
  const [emailError, setEmailError] = useState("");
  const [copiedShareLink, setCopiedShareLink] = useState(false);
  const lastViewedQuestionRef = useRef<string | null>(null);
  const completedCapturedRef = useRef(false);
  const advanceTimerRef = useRef<number | null>(null);
  const advancePendingRef = useRef(false);

  const questionByKey = useMemo(() => new Map(QUESTIONS.map((q) => [q.key, q])), []);
  const coreQuestions = useMemo(() => CORE_KEYS.map((key) => questionByKey.get(key)).filter(Boolean) as Question[], [questionByKey]);
  const deepenQuestions = useMemo(() => QUESTIONS.filter((q) => !coreKeySet.has(q.key) && (!q.when || q.when(answers))), [answers]);
  const applicableQuestions = phase === "deepen" ? deepenQuestions : coreQuestions;
  const totalApplicable = applicableQuestions.length;
  const currentQuestion = applicableQuestions[Math.min(step, Math.max(totalApplicable - 1, 0))];
  const progressPct = totalApplicable ? Math.round((Math.min(step + 1, totalApplicable) / totalApplicable) * 100) : 100;
  const scoringAnswers = useMemo(() => withSafeNeutralDefaults(answers), [answers]);
  const result = useMemo(() => computeScores(scoringAnswers), [scoringAnswers]);
  const displayResult = serverResult ?? result;
  const weakAreas = weakestAreas(displayResult);
  const weakestAreaName = weakAreas[0]?.name ?? "your retirement plan";
  const emailIsValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
  const coreComplete = CORE_KEYS.every((key) => answeredValue(answers[key]));
  const finished = phase !== "core";
  const answeredCount = Object.values(answers).filter(answeredValue).length;

  useEffect(() => {
    const lastIndex = Math.max(applicableQuestions.length - 1, 0);
    if (step > lastIndex) setStep(lastIndex);
  }, [applicableQuestions.length, step]);

  useEffect(() => {
    if (!introComplete || !currentQuestion || (phase !== "core" && phase !== "deepen")) return;
    const viewedKey = `${phase}:${step}:${currentQuestion.key}`;
    if (lastViewedQuestionRef.current === viewedKey) return;
    lastViewedQuestionRef.current = viewedKey;
    captureQuizEvent("quiz_step_viewed", { index: step, key: currentQuestion.key });
  }, [currentQuestion, introComplete, phase, step]);

  useEffect(() => {
    if (phase === "core" && coreComplete) setPhase("email");
  }, [coreComplete, phase]);

  useEffect(() => {
    if (phase === "core" || completedCapturedRef.current) return;
    completedCapturedRef.current = true;
    captureQuizEvent("quiz_completed", { overall: displayResult.overall, band: displayResult.band });
  }, [displayResult, phase]);

  useEffect(() => () => {
    if (advanceTimerRef.current !== null) window.clearTimeout(advanceTimerRef.current);
  }, []);

  function clearAdvanceTimer() {
    if (advanceTimerRef.current !== null) window.clearTimeout(advanceTimerRef.current);
    advanceTimerRef.current = null;
    advancePendingRef.current = false;
  }

  function trackStepAnswered(index: number, key: string) {
    captureQuizEvent("quiz_step_answered", { index, key });
  }

  function setAnswer(key: string, value: string | number | undefined) {
    setAnswers((p) => ({ ...p, [key]: value }));
  }

  useEffect(() => {
    setSelectedChoice(null);
  }, [currentQuestion?.key]);

  function goToStep(nextStep: number) {
    clearAdvanceTimer();
    setSelectedChoice(null);
    setStep(Math.max(0, Math.min(nextStep, totalApplicable - 1)));
  }

  function queueAdvance(nextStep: number, delayMs: number) {
    clearAdvanceTimer();
    advancePendingRef.current = true;
    advanceTimerRef.current = window.setTimeout(() => {
      advanceTimerRef.current = null;
      advancePendingRef.current = false;
      if (phase === "core" && nextStep >= coreQuestions.length) setPhase("email");
      else setStep(Math.max(0, Math.min(nextStep, totalApplicable - 1)));
    }, delayMs);
  }

  function selectChoice(key: string, value: string | number) {
    if (advancePendingRef.current) return;
    setSelectedChoice(value);
    setAnswer(key, value);
    trackStepAnswered(step, key);
    queueAdvance(step + 1, 180);
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
          result: displayResult,
          source: params.get("utm_source") || "direct",
          campaign: params.get("utm_campaign") || "",
          subscribeNewsletter,
          answeredCount,
          totalApplicable,
          isComplete: false,
        }),
      });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok || !payload.ok) {
        setEmailError("We could not save your email. Please check it and try again.");
        return;
      }
      const returnedResult = payload.result ? (payload.result as Result) : displayResult;
      setServerResult(returnedResult);
      try {
        localStorage.setItem("rg_score", JSON.stringify({ answers: scoringAnswers, result: returnedResult }));
      } catch {}
      captureQuizEvent("quiz_email_submitted", { subscribeNewsletter });
      captureQuizEvent("quiz_email_exit", { answeredCount });
      captureQuizEvent("report_generated");
      setPhase("confirm");
    } catch {
      setEmailError("We could not reach the server. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  function getShareUrl() {
    const bandSlug = scoreBandToSlug(displayResult.band);
    const url = new URL(`/s/${bandSlug}`, window.location.origin);
    url.searchParams.set("utm_source", "fb_share");
    url.searchParams.set("utm_medium", "score_share");
    url.searchParams.set("utm_campaign", "quiz");
    return url.toString();
  }

  async function shareResult() {
    const shareUrl = getShareUrl();
    const band = displayResult.band;
    if (navigator.share) {
      captureQuizEvent("score_share_clicked", { band, method: "web_share" });
      try { await navigator.share({ title: "My Retirement Safety Score", text: "I checked how solid my retirement really is.", url: shareUrl }); } catch {}
      return;
    }
    captureQuizEvent("score_share_clicked", { band, method: "facebook" });
    window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`, "fb-share", "width=600,height=500,noopener,noreferrer");
  }

  async function copyShareLink() {
    captureQuizEvent("score_share_clicked", { band: displayResult.band, method: "copy" });
    try { await navigator.clipboard.writeText(getShareUrl()); setCopiedShareLink(true); window.setTimeout(() => setCopiedShareLink(false), 2000); } catch { setCopiedShareLink(false); }
  }

  function renderQuestion(question: Question) {
    return (
      <div key={question.key}>
        <Eyebrow>Retirement Safety Score</Eyebrow>
        <div className="mb-3 mt-5 flex items-center justify-between gap-4 text-sm font-bold text-slate-500">
          <span>Question {step + 1} of {totalApplicable}</span><span>{progressPct}%</span>
        </div>
        <div className="mb-6 h-2 w-full overflow-hidden rounded-full bg-slate-200" role="progressbar" aria-label="Quiz progress" aria-valuemin={0} aria-valuemax={100} aria-valuenow={progressPct}>
          <div className="h-full rounded-full bg-brand transition-all duration-500 ease-out motion-reduce:transition-none" style={{ width: `${progressPct}%` }} />
        </div>
        <h1 className="font-serif text-[1.625rem] font-semibold leading-tight text-ink sm:text-3xl">{question.prompt}</h1>
        {question.help && <p className="mb-8 mt-3 text-lg leading-7 text-slate-600">{question.help}</p>}
        {question.kind === "state" ? (
          <div>
            <label htmlFor={`quiz-${question.key}`} className="mb-2 block text-base font-bold text-ink">Select your state</label>
            <select id={`quiz-${question.key}`} value={(answers[question.key] as string) ?? ""} onChange={(e) => { if (e.target.value && !advancePendingRef.current) { setAnswer(question.key, e.target.value); trackStepAnswered(step, question.key); queueAdvance(step + 1, 120); } }} className="rg-input min-h-16 text-xl">
              <option value="" disabled>Select your state…</option>
              {US_STATES.map((s) => <option key={s.code} value={s.code}>{s.name}</option>)}
            </select>
            <button type="button" onClick={() => { setAnswer(question.key, undefined); trackStepAnswered(step, question.key); queueAdvance(step + 1, 1); }} className="mt-4 min-h-14 w-full rounded-xl border-2 border-slate-200 bg-white px-6 py-3 text-lg font-bold text-slate-600 transition hover:border-brand hover:bg-band sm:w-auto motion-reduce:transition-none">Skip for now</button>
          </div>
        ) : (
          <div className="grid gap-3">
            {question.choices.map((choice, choiceIndex) => {
              const currentValue = answers[question.key] ?? question.defaultValue;
              const isSelected = selectedChoice === choice.value || currentValue === choice.value;
              return <button key={`${question.key}-${choiceIndex}-${String(choice.value)}`} type="button" onClick={() => selectChoice(question.key, choice.value)} aria-pressed={isSelected} className={`min-h-16 rounded-2xl border-2 px-5 py-4 text-left text-xl font-bold text-ink shadow-sm transition hover:border-brand hover:bg-band focus-visible:ring-brand/20 motion-reduce:transition-none ${isSelected ? "border-brand bg-band shadow-brand/10" : "border-slate-200 bg-white"}`}>{choice.label}</button>;
            })}
          </div>
        )}
        <div className="mt-8 flex items-center justify-between gap-3">
          <button type="button" onClick={() => (step > 0 ? goToStep(step - 1) : phase === "deepen" ? setPhase("confirm") : setIntroComplete(false))} className="font-bold text-slate-500 underline transition hover:text-brand motion-reduce:transition-none">Back</button>
          <button type="button" onClick={() => { trackStepAnswered(step, question.key); if (phase === "deepen") setAnswer(question.key, "skip"); queueAdvance(step + 1, 1); }} className="font-bold text-slate-500 underline transition hover:text-brand motion-reduce:transition-none">Skip</button>
        </div>
      </div>
    );
  }

  const EmailCapture = (
    <div className="rg-card-highlight mt-6 text-center">
      <h2 className="text-2xl font-bold">Your score found gaps in {weakestAreaName}.</h2>
      <p className="mx-auto mt-3 max-w-2xl text-lg leading-8 text-slate-700">
        The free Retirement Shield newsletter is how you close them — every Tuesday and Friday, Ellen Marsh sends practical steps to strengthen exactly these areas. Enter your email to get your full action plan and start raising your score.
      </p>
      {submitting ? <div className="mt-5 flex w-full items-center justify-center gap-3 rounded-2xl border border-brand/20 bg-white p-5 text-left shadow-sm"><span className="size-5 animate-spin rounded-full border-2 border-brand/30 border-t-brand" aria-hidden="true" /><p className="text-lg font-bold text-ink">Building your personalized report. This usually takes just a few seconds.</p></div> : (
        <div className="mt-6 grid gap-3 sm:grid-cols-[1fr_1fr_auto]">
          <input type="text" value={firstName} onChange={(e) => setFirstName(e.target.value)} placeholder="First name" autoComplete="given-name" className="rg-input" />
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@email.com" autoComplete="email" className="rg-input" aria-describedby={emailError ? "results-email-error" : undefined} />
          <Button disabled={!firstName.trim() || !emailIsValid || submitting} onClick={submitEmail} className="disabled:opacity-50">Send my plan</Button>
        </div>
      )}
      <div className="mt-6 rounded-2xl border-2 border-brand/30 bg-white p-4 text-left shadow-sm">
        <label className="flex cursor-pointer items-start gap-3">
          <input type="checkbox" checked={subscribeNewsletter} onChange={(e) => setSubscribeNewsletter(e.target.checked)} className="mt-1 size-5 shrink-0 accent-brand" />
          <span><span className="block text-base font-bold text-ink">Yes — send me the free Retirement Shield newsletter</span><span className="mt-1 block text-sm leading-6 text-slate-600">Every Tuesday and Friday, Ellen Marsh sends practical, plain-English steps to strengthen the weak areas your score found.</span></span>
        </label>
      </div>
      {emailError && <p id="results-email-error" className="mt-3 rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-semibold text-bad">{emailError}</p>}
      <p className="mt-3 text-xs text-slate-500">Educational information only. We never sell your email — unsubscribe anytime.</p>
    </div>
  );

  // ---- Quiz intro ----
  if (!introComplete) {
    return (
      <div className="rg-page-shell">
        <div className="mx-auto flex min-h-[calc(100vh-5rem)] max-w-3xl items-center px-4 py-6 sm:py-10">
          <section className="w-full overflow-hidden rounded-[2rem] bg-brand-dark px-5 py-8 text-center text-white shadow-2xl shadow-brand-dark/20 sm:px-10 sm:py-12">
            <Eyebrow className="text-[#8FB3D9]">FOR ANYONE THINKING ABOUT RETIREMENT</Eyebrow>
            <h1 className="mx-auto mt-6 max-w-2xl text-4xl font-bold leading-tight tracking-tight text-white sm:text-5xl">Take the <span className="text-[#7BD3A8]">free quiz</span> and see <span className="text-[#7BD3A8]">how solid</span> your retirement really is.</h1>
            <p className="mx-auto mt-6 flex max-w-xl items-center justify-center gap-2 text-center text-lg font-semibold leading-8 text-white/90 sm:text-xl"><svg viewBox="0 0 24 24" fill="none" className="size-5 shrink-0" aria-hidden="true"><circle cx="12" cy="12" r="9" stroke="#7BD3A8" strokeWidth="2" /><path d="M8.5 12.5l2.5 2.5 4.5-5.5" stroke="#7BD3A8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg><span>Real numbers, no sales pitch — just a clear picture of where you stand.</span></p>
            <Button type="button" onClick={() => { captureQuizEvent("quiz_started"); setIntroComplete(true); }} style={{ backgroundColor: "#2E9E6A", borderColor: "#2E9E6A" }} className="mx-auto mt-8 min-h-16 w-full px-6 py-4 text-white shadow-[0_18px_45px_rgba(46,158,106,0.4)] hover:!bg-[#278a5c] hover:!border-[#278a5c] sm:max-w-md"><span className="flex flex-col items-center gap-1"><span className="text-xl font-extrabold tracking-[0.02em] sm:text-2xl">GET MY FREE SCORE →</span><span className="text-sm font-bold text-white/85 sm:text-base">..and discover your path to a secure retirement.</span></span></Button>
            <div className="mx-auto mt-5 max-w-2xl space-y-2 text-sm font-semibold leading-6 text-[#9FBBDA] sm:text-base"><p>Your answers stay private. Based on Social Security, Medicare, and IRS figures. Free — no payment, ever.</p>{process.env.NEXT_PUBLIC_SOCIAL_PROOF ? <p>{process.env.NEXT_PUBLIC_SOCIAL_PROOF}</p> : null}</div>
          </section>
        </div>
      </div>
    );
  }

  return (
    <div className="rg-page-shell">
      <div className="mx-auto max-w-3xl px-4 py-8 sm:py-12">
        {phase === "core" && currentQuestion ? <div className="rg-card">{renderQuestion(currentQuestion)}</div> : null}
        {phase === "email" ? <div className="rg-card text-center"><Eyebrow>Your score is ready</Eyebrow><ScoreGauge value={displayResult.overall} band={displayResult.band} subScores={[]} subtitle="Education-only estimate" badge="Based on core answers" /><PersonalizedGapSummary result={displayResult} /><p className="mt-4 rounded-2xl border border-slate-200 bg-band p-4 text-left text-base font-semibold leading-7 text-slate-700">{lifestyleGapLine(answers)}</p>{EmailCapture}</div> : null}
        {phase === "confirm" ? <div className="rg-card mt-8 text-center"><h2 className="text-2xl font-bold text-ink">Your action plan is on its way.</h2><p className="mx-auto mt-3 max-w-2xl text-lg leading-8 text-slate-700">Watch for Retirement Shield from Ellen Marsh every Tuesday and Friday — your step-by-step plan to raise this score.</p><p className="mx-auto mt-3 max-w-2xl text-base font-semibold leading-7 text-slate-600">You can keep answering to sharpen your score anytime.</p><div className="mt-6 flex flex-col justify-center gap-3"><Button type="button" onClick={() => { setStep(0); setPhase("deepen"); }}>Want a more accurate, in-depth score? Answer a few more →</Button><Button type="button" variant="secondary" onClick={shareResult}>Share on Facebook</Button><Button type="button" variant="secondary" onClick={copyShareLink}>{copiedShareLink ? "Copied!" : "Copy link"}</Button></div></div> : null}
        {phase === "deepen" ? <div className="space-y-6"><div className="rg-card text-center"><ScoreGauge value={displayResult.overall} band={displayResult.band} subScores={[]} subtitle="Updated estimate" badge="Optional detail" /><p className="mt-4 text-sm font-semibold leading-6 text-slate-600">Answer any optional question to sharpen the estimate, or stop with your current score.</p><Button type="button" variant="secondary" onClick={() => setPhase("confirm")} className="mt-4">I&apos;m done</Button></div>{currentQuestion ? <div className="rg-card">{renderQuestion(currentQuestion)}</div> : <div className="rg-card text-center"><h2 className="text-2xl font-bold text-ink">You have answered the optional questions that apply.</h2><Button type="button" onClick={() => setPhase("confirm")} className="mt-5">I&apos;m done</Button></div>}</div> : null}
      </div>
      <div className="mx-auto max-w-6xl px-4 pb-8 text-center text-sm text-slate-500"><Link href="/privacy" className="underline">Privacy</Link> · Educational information only, not financial, tax, or legal advice.</div>
    </div>
  );
}
