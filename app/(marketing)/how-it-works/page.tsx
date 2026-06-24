import { pageMetadata } from "@/lib/seo";
import { ArrowRight, BarChart3, Check, ChevronDown, ClipboardList, ShieldCheck, Sparkles } from "lucide-react";
import { Button, Container, Eyebrow } from "@/components/ui";

export const metadata = pageMetadata({
  title: "How RetireShield Works — Retirement Safety Score",
  description: "See how RetireShield turns a short quiz into a plain-English Safety Score, action plan, and retirement risk checkup.",
  path: "/how-it-works",
});

const walkthroughSteps = [
  {
    step: "01",
    icon: ClipboardList,
    title: "Answer the essentials",
    description: "Share the basics: age, savings, income, spending, Social Security timing, and a few retirement goals.",
    detail: "Most people finish in about two minutes.",
  },
  {
    step: "02",
    icon: BarChart3,
    title: "We score your retirement risks",
    description: "RetireShield checks the big threats retirees worry about most: income gaps, withdrawals, inflation, market drops, Medicare costs, and longevity.",
    detail: "You get a clear 0–100 Safety Score instead of a spreadsheet.",
  },
  {
    step: "03",
    icon: Sparkles,
    title: "Get your next best actions",
    description: "Your report translates the score into plain-English priorities so you know what to fix first and what can wait.",
    detail: "Start free, then upgrade if you want monitoring and deeper tools.",
  },
];

const scoreFactors = [
  { label: "Income floor", value: "Strong", width: "88%", tone: "bg-good" },
  { label: "Withdrawal pace", value: "Watch", width: "64%", tone: "bg-alert" },
  { label: "Inflation cushion", value: "Good", width: "78%", tone: "bg-brand" },
];

const actionItems = [
  "Keep essentials covered by guaranteed income",
  "Review a safer withdrawal target before large purchases",
  "Check Social Security timing before claiming",
];

const planRows = [
  { feature: "Retirement Safety Score", free: "Included", paid: "Included + saved history" },
  { feature: "Personalized action plan", free: "Top 3 actions", paid: "Refreshed and expanded" },
  { feature: "Risk monitoring", free: "One-time snapshot", paid: "Monthly checkups and alerts" },
  { feature: "AI retirement coach", free: "Limited preview", paid: "More questions and scenarios" },
];

const faqs = [
  {
    question: "What information do I need to start?",
    answer: "Approximate savings, income, spending, and goals are enough for the first pass. You can update your numbers later as your plan changes.",
  },
  {
    question: "How should I use the Safety Score?",
    answer: "Use it as a plain-English checkup that highlights potential retirement risks, practical next steps, and questions worth discussing.",
  },
  {
    question: "How long does the quiz take?",
    answer: "Most people can complete the initial quiz in about two minutes if they know their approximate savings, income, and monthly spending.",
  },
  {
    question: "What happens after I get my free score?",
    answer: "You will see your score, the main reasons behind it, and three suggested next actions. You can stop there or choose a paid plan for monitoring and deeper tools.",
  },
  {
    question: "Can I change my answers later?",
    answer: "Yes. Retirement plans change. Paid plans are built for ongoing checkups, and you can update your information when your income, spending, or goals shift.",
  },
];

function SafetyScoreMock() {
  return (
    <div className="rounded-[2rem] border border-slate-200 bg-white p-4 shadow-2xl sm:p-6" aria-label="Sample Safety Score report mockup">
      <div className="rounded-[1.5rem] bg-slate-950 p-3 shadow-inner">
        <div className="rounded-[1.25rem] bg-white p-5 sm:p-6">
          <div className="flex items-center justify-between gap-4 border-b border-slate-100 pb-4">
            <div>
              <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-slate-500">Sample report</p>
              <h2 className="mt-1 text-2xl font-extrabold text-ink">Safety Score</h2>
            </div>
            <span className="rounded-full bg-good/10 px-3 py-1 text-sm font-extrabold text-good">Mostly secure</span>
          </div>

          <div className="grid gap-6 py-6 md:grid-cols-[0.8fr_1fr] md:items-center">
            <div className="mx-auto flex h-44 w-44 items-center justify-center rounded-full bg-gradient-to-br from-good via-brand to-alert p-2">
              <div className="flex h-full w-full flex-col items-center justify-center rounded-full bg-white text-center shadow-inner">
                <span className="text-6xl font-extrabold tracking-tight text-ink">82</span>
                <span className="text-sm font-bold text-slate-500">out of 100</span>
              </div>
            </div>
            <div className="space-y-4">
              {scoreFactors.map((factor) => (
                <div key={factor.label}>
                  <div className="mb-2 flex items-center justify-between text-sm font-bold">
                    <span className="text-slate-700">{factor.label}</span>
                    <span className="text-ink">{factor.value}</span>
                  </div>
                  <div className="h-3 overflow-hidden rounded-full bg-slate-100">
                    <div className={`h-full rounded-full ${factor.tone}`} style={{ width: factor.width }} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-2xl bg-band p-4">
            <div className="flex items-center gap-2 text-sm font-extrabold uppercase tracking-[0.14em] text-brand">
              <ShieldCheck className="h-4 w-4" aria-hidden="true" />
              Your first 3 actions
            </div>
            <ul className="mt-4 space-y-3">
              {actionItems.map((item) => (
                <li key={item} className="flex gap-3 text-base font-semibold leading-7 text-slate-700">
                  <Check className="mt-1 h-5 w-5 shrink-0 text-good" aria-hidden="true" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function HowItWorksPage() {
  return (
    <main>
      <section className="bg-gradient-to-b from-band via-white to-white py-16 sm:py-20 lg:py-24">
        <Container className="grid gap-12 lg:grid-cols-[0.95fr_1.05fr] lg:items-center">
          <div>
            <Eyebrow>How it works</Eyebrow>
            <h1 className="mt-5 text-5xl font-extrabold tracking-tight text-ink sm:text-6xl lg:text-7xl">A clearer retirement checkup in minutes.</h1>
            <p className="mt-6 text-2xl font-semibold leading-10 text-slate-700">RetireShield turns a short quiz into a simple Safety Score report, then shows the next actions that can help make your retirement feel safer.</p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Button href="/quiz">Start the free quiz</Button>
              <Button href="#walkthrough" variant="secondary">See the 3 steps</Button>
            </div>
          </div>
          <SafetyScoreMock />
        </Container>
      </section>

      <section id="walkthrough" className="py-14 sm:py-20" aria-labelledby="walkthrough-heading">
        <Container>
          <div className="mx-auto max-w-3xl text-center">
            <Eyebrow>3-step walkthrough</Eyebrow>
            <h2 id="walkthrough-heading" className="mt-4 text-4xl font-extrabold tracking-tight text-ink sm:text-5xl">From quick answers to confident next steps.</h2>
          </div>
          <div className="mt-12 grid gap-6 lg:grid-cols-3">
            {walkthroughSteps.map(({ step, icon: Icon, title, description, detail }) => (
              <article key={step} className="relative overflow-hidden rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
                <span className="absolute right-6 top-5 text-6xl font-extrabold text-band">{step}</span>
                <div className="relative flex h-14 w-14 items-center justify-center rounded-2xl bg-brand/10 text-brand">
                  <Icon className="h-7 w-7" aria-hidden="true" />
                </div>
                <h3 className="relative mt-6 text-2xl font-extrabold tracking-tight text-ink">{title}</h3>
                <p className="relative mt-4 text-lg leading-8 text-slate-700">{description}</p>
                <p className="relative mt-5 rounded-2xl bg-band p-4 text-base font-bold leading-7 text-ink">{detail}</p>
              </article>
            ))}
          </div>
        </Container>
      </section>

      <section className="bg-ink py-14 text-white sm:py-20" aria-labelledby="free-paid-heading">
        <Container className="grid gap-8 lg:grid-cols-[0.8fr_1.2fr] lg:items-start">
          <div>
            <Eyebrow className="text-white">Free vs paid</Eyebrow>
            <h2 id="free-paid-heading" className="mt-4 text-4xl font-extrabold tracking-tight text-white sm:text-5xl">Start with the free score. Upgrade only if you want ongoing help.</h2>
            <p className="mt-5 text-xl font-semibold leading-9 text-white/80">The free experience is built to give you useful insight immediately. Paid plans add monitoring, history, and deeper guidance.</p>
          </div>
          <div className="overflow-hidden rounded-3xl border border-white/15 bg-white text-ink shadow-xl">
            <table className="w-full text-left">
              <caption className="sr-only">What you get free compared with paid RetireShield plans</caption>
              <thead className="bg-band text-sm uppercase tracking-[0.14em] text-slate-600">
                <tr><th scope="col" className="px-5 py-4">Feature</th><th scope="col" className="px-5 py-4">Free</th><th scope="col" className="px-5 py-4">Paid</th></tr>
              </thead>
              <tbody>
                {planRows.map((row) => (
                  <tr key={row.feature} className="border-t border-slate-100">
                    <th scope="row" className="px-5 py-4 font-extrabold text-ink">{row.feature}</th>
                    <td className="px-5 py-4 font-semibold text-slate-700">{row.free}</td>
                    <td className="px-5 py-4 font-semibold text-slate-700">{row.paid}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Container>
      </section>

      <section className="py-14 sm:py-20" aria-labelledby="faq-heading">
        <Container>
          <div className="mx-auto max-w-3xl text-center">
            <Eyebrow>FAQ</Eyebrow>
            <h2 id="faq-heading" className="mt-4 text-4xl font-extrabold tracking-tight text-ink sm:text-5xl">Questions before you start?</h2>
          </div>
          <div className="mx-auto mt-10 max-w-3xl space-y-4">
            {faqs.map((faq) => (
              <details key={faq.question} className="group rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-xl font-extrabold text-ink">
                  {faq.question}
                  <ChevronDown className="h-6 w-6 shrink-0 text-brand transition group-open:rotate-180" aria-hidden="true" />
                </summary>
                <p className="mt-4 text-lg leading-8 text-slate-700">{faq.answer}</p>
              </details>
            ))}
          </div>
        </Container>
      </section>

      <section className="pb-16 sm:pb-24">
        <Container>
          <div className="overflow-hidden rounded-[2rem] bg-gradient-to-r from-brand to-brand-dark p-8 text-white shadow-xl sm:p-10 lg:p-12">
            <div className="grid gap-8 lg:grid-cols-[1fr_auto] lg:items-center">
              <div>
                <div className="flex items-center gap-3 text-sm font-extrabold uppercase tracking-[0.16em] text-white/80"><ShieldCheck className="h-5 w-5" aria-hidden="true" /> Clear first steps</div>
                <h2 className="mt-4 text-4xl font-extrabold tracking-tight text-white sm:text-5xl">Ready to see your Safety Score?</h2>
                <p className="mt-4 text-xl font-semibold leading-9 text-white/85">Take the quiz now and get your first retirement actions for free.</p>
              </div>
              <Button href="/quiz" variant="secondary" className="w-full sm:w-auto">Start free <ArrowRight className="ml-2 h-5 w-5" aria-hidden="true" /></Button>
            </div>
          </div>
        </Container>
      </section>
    </main>
  );
}
