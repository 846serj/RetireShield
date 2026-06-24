import Link from "next/link";
import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata({
  title: "RetireShield — Your Free Retirement Safety Score",
  description: "See how secure your retirement is in two minutes with a free Retirement Safety Score and plain-English next steps.",
  path: "/",
});

import { BadgeDollarSign, Banknote, BellRing, Bot, Calculator, HeartPulse, Landmark, LineChart, LockKeyhole, MessageCircleQuestion, ShieldCheck, ShieldAlert, Sparkles, TrendingUp, UserCheck, WalletCards } from "lucide-react";
import { ComparisonRow } from "@/components/ComparisonRow";
import { ScoreGauge } from "@/components/ScoreGauge";
import { StatTile } from "@/components/StatTile";
import { Button, Container } from "@/components/ui";
import { createClient } from "@/lib/supabase/server";

async function getSessionEmail() {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) return false;

  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  return user?.email ?? null;
}

const featureCards = [
  {
    icon: Banknote,
    title: "Income that lasts",
    description: "Will your guaranteed income cover the essentials for life?",
  },
  {
    icon: WalletCards,
    title: "Safe withdrawals",
    description: "How much can you spend without running out?",
  },
  {
    icon: TrendingUp,
    title: "Inflation",
    description: "Will rising prices quietly shrink your paycheck?",
  },
  {
    icon: LineChart,
    title: "Market drops",
    description: "Is your money positioned for your age and comfort?",
  },
  {
    icon: Landmark,
    title: "Social Security",
    description: "Are you claiming at the right time for you?",
  },
  {
    icon: BadgeDollarSign,
    title: "Medicare & IRMAA",
    description: "Could one extra dollar trigger a Medicare surcharge?",
  },
  {
    icon: ShieldAlert,
    title: "Scams & fraud",
    description: "A watchful eye on the schemes that target retirees.",
  },
  {
    icon: HeartPulse,
    title: "Healthcare costs",
    description: "Are you ready for the bills that come with age?",
  },
];

const qaCards = [
  {
    tag: "Longevity",
    question: "Will I run out of money at 90?",
    answer: "Your savings cover your spending gap to age 94 at today's pace. Here's the one change that pushes it past 100.",
  },
  {
    tag: "Social Security",
    question: "Should I wait to claim Social Security?",
    answer: "Waiting two years adds about $410/month for life. Here's the trade-off while you wait.",
  },
  {
    tag: "Markets",
    question: "Did that market drop hurt my plan?",
    answer: "Your Score dipped 3 points and recovered. Your essentials were never at risk.",
  },
  {
    tag: "Big purchase",
    question: "Can I afford a $25k kitchen remodel?",
    answer: "Yes — it lowers your cushion slightly but keeps you in 'Mostly Secure.'",
  },
  {
    tag: "Inflation",
    question: "Is inflation a problem for me?",
    answer: "About 60% of your income keeps up with prices. Here's how to protect the rest.",
  },
  {
    tag: "Medicare",
    question: "Will Medicare cost more next year?",
    answer: "One extra $1,500 of income would cross an IRMAA line. Here's how to avoid it.",
  },
  {
    tag: "Scam watch",
    question: "Am I being targeted by a scam?",
    answer: "Three things to never do over the phone — and what a real Medicare call sounds like.",
  },
  {
    tag: "Spending",
    question: "How much can I safely spend this year?",
    answer: "About $4,150/month keeps you on track. Spend more and we'll flag it early.",
  },
];

function QACard({ tag, question, answer }: { tag: string; question: string; answer: string }) {
  return (
    <article tabIndex={0} className="flex min-h-[260px] w-[82vw] max-w-sm shrink-0 flex-col justify-between rounded-3xl border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:border-brand/30 hover:shadow-lg sm:w-[22rem] lg:min-h-[280px] lg:w-auto lg:max-w-none">
      <div>
        <span className="inline-flex rounded-full bg-brand/10 px-3 py-1 text-xs font-extrabold uppercase tracking-[0.16em] text-brand">
          {tag}
        </span>
        <h3 className="mt-5 text-xl font-extrabold leading-7 tracking-tight text-ink">{question}</h3>
      </div>
      <p className="mt-6 text-lg font-semibold leading-8 text-slate-700">{answer}</p>
    </article>
  );
}

const pricingPlans = [
  {
    name: "Free",
    price: "$0",
    description: "Safety Score + 3 actions",
  },
  {
    name: "Plus",
    price: "$19/mo",
    description: "Monthly monitoring + AI coach",
  },
  {
    name: "Premium",
    price: "$39/mo",
    description: "Unlimited coach, Medicare/SS deep tools, score history",
    highlight: "Most popular",
  },
  {
    name: "Concierge",
    price: "$99–199/mo",
    description: "A human retirement coach, done-for-you checkups",
  },
];

function PricingCard({ name, price, description, highlight }: { name: string; price: string; description: string; highlight?: string }) {
  return (
    <Link
      href="/pricing"
      className={`relative flex h-full flex-col rounded-3xl border p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-xl focus:outline-none focus:ring-4 focus:ring-brand/20 ${
        highlight ? "border-brand bg-brand text-white shadow-lg" : "border-slate-200 bg-white text-ink hover:border-brand/30"
      }`}
    >
      {highlight ? (
        <span className="absolute right-5 top-5 rounded-full bg-white px-3 py-1 text-xs font-extrabold uppercase tracking-[0.14em] text-brand">
          {highlight}
        </span>
      ) : null}
      <h3 className={`text-xl font-extrabold ${highlight ? "pr-28 text-white" : "text-ink"}`}>{name}</h3>
      <p className={`mt-5 text-4xl font-extrabold tracking-tight ${highlight ? "text-white" : "text-brand"}`}>{price}</p>
      <p className={`mt-4 flex-1 text-lg font-semibold leading-8 ${highlight ? "text-white/90" : "text-slate-700"}`}>{description}</p>
      <span className={`mt-6 text-sm font-extrabold uppercase tracking-[0.16em] ${highlight ? "text-white" : "text-brand"}`}>
        Compare plans →
      </span>
    </Link>
  );
}

const trustSafetyCards = [
  {
    icon: LockKeyhole,
    title: "We never link your bank.",
    description: "You type what you want, nothing connected.",
  },
  {
    icon: UserCheck,
    title: "Education, not sales.",
    description: "No products pushed, no commissions, no pressure.",
  },
  {
    icon: ShieldCheck,
    title: "Your data is yours.",
    description: "Private and secure; we never sell it.",
  },
];

function FeatureCard({ icon: Icon, title, description }: { icon: typeof ShieldCheck; title: string; description: string }) {
  return (
    <article className="group h-full rounded-3xl border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:border-brand/30 hover:shadow-lg sm:p-8">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand/10 text-brand transition group-hover:bg-brand group-hover:text-white">
        <Icon className="h-7 w-7" aria-hidden="true" strokeWidth={1.8} />
      </div>
      <h3 className="mt-6 text-2xl font-extrabold tracking-tight text-ink">{title}</h3>
      <p className="mt-3 text-lg leading-8 text-slate-700">{description}</p>
    </article>
  );
}

const testimonials = [
  {
    quote: "[placeholder] RetireShield helped me see the next right step instead of worrying about everything at once.",
    name: "Retiree testimonial",
    detail: "Placeholder quote until real customer story is approved",
  },
  {
    quote: "[placeholder] The Safety Score made our retirement plan feel understandable for the first time.",
    name: "Couple testimonial",
    detail: "Placeholder quote until real customer story is approved",
  },
  {
    quote: "[placeholder] I liked that I did not have to connect accounts or talk to a salesperson.",
    name: "Privacy-first testimonial",
    detail: "Placeholder quote until real customer story is approved",
  },
];

function Testimonial({ quote, name, detail }: { quote: string; name: string; detail: string }) {
  return (
    <article className="flex h-full flex-col rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
      <p className="text-lg font-semibold leading-8 text-slate-700">“{quote}”</p>
      <div className="mt-6 border-t border-slate-100 pt-5">
        <p className="font-extrabold text-ink">{name}</p>
        <p className="mt-1 text-sm font-semibold text-slate-500">{detail}</p>
      </div>
    </article>
  );
}

const howItWorksSteps = [
  {
    title: "Answer 9 simple questions.",
    description: "No documents, no logins, no jargon. About two minutes.",
  },
  {
    title: "Get your Safety Score.",
    description: "A clear 0–100 score, four sub-scores, and three things you can actually do.",
  },
  {
    title: "Let us keep watch.",
    description: "We re-check your plan every month and tell you the moment something needs attention.",
  },
];

function StepCard({ step, title, description }: { step: number; title: string; description: string }) {
  return (
    <article className="relative flex h-full flex-col rounded-3xl border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:border-brand/30 hover:shadow-lg sm:p-8">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand text-2xl font-extrabold text-white shadow-sm" aria-hidden="true">
        {step}
      </div>
      <h3 className="mt-6 text-2xl font-extrabold tracking-tight text-ink">{title}</h3>
      <p className="mt-3 text-lg leading-8 text-slate-700">{description}</p>
    </article>
  );
}

function AlertCard() {
  return (
    <article className="relative overflow-hidden rounded-[2rem] border border-brand/20 bg-white p-6 shadow-xl sm:p-8">
      <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-brand/10" aria-hidden="true" />
      <div className="relative flex items-start gap-4">
        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-brand text-white shadow-sm" aria-hidden="true">
          <BellRing className="h-7 w-7" strokeWidth={1.9} />
        </div>
        <div>
          <p className="text-sm font-extrabold uppercase tracking-[0.18em] text-brand">Monthly plan alert</p>
          <h3 className="mt-3 text-2xl font-extrabold tracking-tight text-ink">Heads up</h3>
          <p className="mt-3 text-lg font-semibold leading-8 text-slate-700">
            A Roth conversion before December could keep you under the next Medicare surcharge. Here&apos;s what to ask about.
          </p>
        </div>
      </div>
      <div className="relative mt-6 rounded-2xl bg-band p-4 text-sm font-semibold leading-6 text-slate-600">
        RetireShield only sends alerts when a change could affect your retirement plan.
      </div>
    </article>
  );
}

const trustStats = [
  { value: "2 minutes" },
  { value: "9 questions" },
  { value: "No bank linking, ever" },
  { value: "Built for ages 55–80" },
  { value: "Informational, not advice" },
];

export default async function Home() {
  const userEmail = await getSessionEmail();

  return (
    <main>
      <section className="overflow-hidden bg-gradient-to-br from-white via-surface to-band py-12 sm:py-16 lg:py-20">
        <Container className="grid items-center gap-10 lg:grid-cols-[1.02fr_0.98fr] lg:gap-14">
          <div className="text-center lg:text-left">
            <h1 className="text-4xl font-extrabold tracking-tight text-ink sm:text-5xl lg:text-6xl">
              Know your retirement is going to be okay.
            </h1>
            <p className="mt-6 text-xl leading-8 text-slate-700">
              Get your free Retirement Safety Score in about 2 minutes. Answer 9 simple questions — no account, no linking your bank — and see exactly where you stand, in plain English.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center lg:justify-start">
              <Button href={userEmail ? "/dashboard" : "/quiz"} className="px-7 py-4 text-xl">
                {userEmail ? "Go to my dashboard" : "Get my free Safety Score"}
              </Button>
              <Button href="#how-it-works" variant="ghost" className="px-7 py-4 text-xl">
                See how it works
              </Button>
            </div>
            <p className="mt-4 text-sm font-medium text-slate-600">
              No credit card. No account. We never ask you to connect a bank or brokerage.
            </p>
          </div>

          <div className="mx-auto w-full max-w-md lg:max-w-none">
            <ScoreGauge value={82} />
          </div>
        </Container>
      </section>

      <section className="bg-band py-8 sm:py-10" aria-label="Retirement Safety Score proof points">
        <Container>
          <div className="flex flex-wrap items-stretch justify-center gap-3">
            {trustStats.map((stat) => (
              <StatTile key={stat.value} value={stat.value} />
            ))}
          </div>
          {/*
          <div className="mt-8 border-t border-slate-300 pt-6">
            <p className="text-center text-sm font-bold uppercase tracking-[0.18em] text-slate-500">As seen in</p>
            <div className="mt-4 grid gap-4 sm:grid-cols-3">
              <div className="rounded-xl border border-slate-200 bg-white/70 p-4 text-center text-slate-400">AARP</div>
              <div className="rounded-xl border border-slate-200 bg-white/70 p-4 text-center text-slate-400">Press logo</div>
              <div className="rounded-xl border border-slate-200 bg-white/70 p-4 text-center text-slate-400">Press logo</div>
            </div>
          </div>
          */}
        </Container>
      </section>

      <section className="bg-white py-12 sm:py-16 lg:py-20">
        <Container>
          <div className="mx-auto max-w-3xl text-center">
            <h2 className="text-3xl font-extrabold tracking-tight text-ink sm:text-4xl lg:text-5xl">
              Most retirement tools hand you a scary percentage. We hand you an answer.
            </h2>
          </div>
          <div className="mt-10">
            <ComparisonRow
              cards={[
                {
                  title: "The old way",
                  quote: "You have a 78% chance of success.",
                  tone: "muted",
                  children: (
                    <>
                      A number and a worry. What do you actually do with that?
                    </>
                  ),
                },
                {
                  title: "The RetireShield way",
                  quote: "Your Safety Score is 82. Your income covers your essentials, and here are the two things to shore up.",
                  tone: "brand",
                  children: (
                    <>
                      Clear. Specific. In plain dollars.
                    </>
                  ),
                },
              ]}
            />
          </div>
        </Container>
      </section>

      <section className="bg-gradient-to-b from-white via-band to-white py-12 sm:py-16 lg:py-20" aria-labelledby="safety-score-heading">
        <Container className="grid items-center gap-10 lg:grid-cols-[0.95fr_1.05fr] lg:gap-14">
          <div>
            <h2 id="safety-score-heading" className="text-3xl font-extrabold tracking-tight text-ink sm:text-4xl lg:text-5xl">
              A single number you can actually understand.
            </h2>
            <p className="mt-5 text-lg leading-8 text-slate-700 sm:text-xl">
              Your Retirement Safety Score combines four things that decide whether your money lasts: your guaranteed income, how sustainable your spending is, your exposure to inflation, and your cushion against market drops. Improve any one of them and watch your score climb.
            </p>
            <div className="mt-8 rounded-3xl border border-slate-200 bg-white/80 p-5 shadow-sm">
              <p className="text-sm font-extrabold uppercase tracking-[0.16em] text-slate-500">Band legend</p>
              <div className="mt-4 grid gap-3 text-sm font-bold text-slate-700 sm:grid-cols-2">
                <div className="flex items-center gap-2"><span className="h-3 w-3 rounded-full bg-score-secure" />Secure 80–100</div>
                <div className="flex items-center gap-2"><span className="h-3 w-3 rounded-full bg-score-mostlySecure" />Mostly Secure 60–79</div>
                <div className="flex items-center gap-2"><span className="h-3 w-3 rounded-full bg-score-atRisk" />At Risk 40–59</div>
                <div className="flex items-center gap-2"><span className="h-3 w-3 rounded-full bg-score-vulnerable" />Vulnerable below 40</div>
              </div>
            </div>
          </div>

          <div className="mx-auto w-full max-w-lg">
            <ScoreGauge value={76} delta="▲ +6 this month" />
          </div>
        </Container>
      </section>

      <section className="bg-white py-12 sm:py-16 lg:py-20" aria-labelledby="ai-coach-heading">
        <Container className="grid items-center gap-10 lg:grid-cols-[0.95fr_1.05fr] lg:gap-14">
          <div>
            <h2 id="ai-coach-heading" className="text-3xl font-extrabold tracking-tight text-ink sm:text-4xl lg:text-5xl">
              Ask anything. Get a straight answer, grounded in real numbers.
            </h2>
            <p className="mt-5 text-lg leading-8 text-slate-700 sm:text-xl">
              Wondering &quot;Can I afford to help my grandkids?&quot; or &quot;Did that market dip hurt me?&quot; Ask in plain English and get a clear answer based on your own situation.
            </p>
            <div className="mt-8 rounded-3xl border-2 border-brand/40 bg-brand/5 p-6 shadow-sm sm:p-8">
              <div className="flex items-start gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-brand text-white shadow-sm" aria-hidden="true">
                  <ShieldCheck className="h-6 w-6" strokeWidth={2} />
                </div>
                <div>
                  <p className="text-sm font-extrabold uppercase tracking-[0.18em] text-brand">Real math, not guesswork</p>
                  <p className="mt-3 text-lg font-semibold leading-8 text-ink">
                    We don&apos;t do the math with AI. Every number comes from proven retirement and tax calculations — the AI just explains it in plain English. So you can trust the answer.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="relative mx-auto w-full max-w-lg">
            <div className="absolute -right-4 -top-4 h-28 w-28 rounded-full bg-brand/10 blur-2xl" aria-hidden="true" />
            <div className="absolute -bottom-6 -left-6 h-32 w-32 rounded-full bg-accent/20 blur-2xl" aria-hidden="true" />
            <div className="relative rounded-[2rem] border border-slate-200 bg-white p-5 shadow-xl sm:p-6">
              <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-brand text-white" aria-hidden="true">
                  <Bot className="h-6 w-6" strokeWidth={1.9} />
                </div>
                <div>
                  <p className="text-sm font-extrabold text-ink">RetireShield Coach</p>
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Based on your plan</p>
                </div>
              </div>
              <div className="mt-5 space-y-4">
                <div className="ml-auto max-w-[85%] rounded-2xl rounded-tr-sm bg-brand px-5 py-4 text-white shadow-sm">
                  <div className="flex items-start gap-3">
                    <MessageCircleQuestion className="mt-1 h-5 w-5 shrink-0" aria-hidden="true" />
                    <p className="text-sm font-semibold leading-6">Did that market dip hurt my retirement?</p>
                  </div>
                </div>
                <div className="max-w-[90%] rounded-2xl rounded-tl-sm border border-slate-200 bg-surface px-5 py-4 shadow-sm">
                  <div className="flex items-start gap-3">
                    <Calculator className="mt-1 h-5 w-5 shrink-0 text-brand" aria-hidden="true" />
                    <p className="text-sm leading-6 text-slate-700">
                      Your Safety Score is still in the secure range. The dip lowered your market-cushion sub-score, but your guaranteed income still covers your essentials.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </Container>
      </section>

      <section className="bg-gradient-to-b from-white via-band to-white py-12 sm:py-16 lg:py-20" aria-labelledby="monitoring-heading">
        <Container className="grid items-center gap-10 lg:grid-cols-[1.02fr_0.98fr] lg:gap-14">
          <div>
            <h2 id="monitoring-heading" className="text-3xl font-extrabold tracking-tight text-ink sm:text-4xl lg:text-5xl">
              The AI that watches your retirement so you don&apos;t have to.
            </h2>
            <p className="mt-5 text-lg leading-8 text-slate-700 sm:text-xl">
              Markets move. Tax rules change. Prices rise. RetireShield re-checks your plan every month and sends a short, plain-English heads-up only when something actually matters — a Medicare threshold ahead, a Social Security timing window, a drop worth knowing about. No noise. Just a watchful eye.
            </p>
          </div>

          <div className="mx-auto w-full max-w-lg">
            <AlertCard />
          </div>
        </Container>
      </section>

      <section className="overflow-hidden bg-white py-12 sm:py-16 lg:py-20" aria-labelledby="qa-carousel-heading">
        <Container>
          <div className="mx-auto max-w-3xl text-center">
            <h2 id="qa-carousel-heading" className="text-3xl font-extrabold tracking-tight text-ink sm:text-4xl lg:text-5xl">
              Real questions. Clear answers.
            </h2>
            <p className="mt-5 text-lg leading-8 text-slate-700 sm:text-xl">
              Swipe through the kinds of plain-English answers RetireShield can give when your plan is already in motion.
            </p>
          </div>

          <div className="qa-carousel -mx-4 mt-10 overflow-x-auto px-4 pb-4 sm:-mx-6 sm:px-6 lg:mx-0 lg:overflow-visible lg:px-0 lg:pb-0" aria-label="Example retirement questions and answers">
            <div className="flex w-max gap-4 motion-safe:animate-[qa-scroll_55s_linear_infinite] motion-reduce:animate-none hover:[animation-play-state:paused] focus-within:[animation-play-state:paused] active:[animation-play-state:paused] lg:grid lg:w-auto lg:grid-cols-4 lg:animate-none">
              {qaCards.map((card) => (
                <QACard key={card.question} {...card} />
              ))}
            </div>
          </div>
          <p className="mt-3 text-center text-sm font-semibold text-slate-500 lg:hidden">
            Swipe to see more. Animation pauses when you touch or focus a card.
          </p>
        </Container>
      </section>

      <section className="bg-gradient-to-b from-white via-band to-white py-12 sm:py-16 lg:py-20" aria-labelledby="pricing-preview-heading">
        <Container>
          <div className="mx-auto max-w-3xl text-center">
            <h2 id="pricing-preview-heading" className="text-3xl font-extrabold tracking-tight text-ink sm:text-4xl lg:text-5xl">
              Start free. Upgrade only if it helps.
            </h2>
          </div>

          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {pricingPlans.map((plan) => (
              <PricingCard key={plan.name} {...plan} />
            ))}
          </div>

          <div className="mt-8 rounded-3xl border border-brand/20 bg-white p-6 text-center shadow-sm sm:p-8">
            <p className="text-lg font-bold leading-8 text-ink">
              An advisor charges around 1% of your savings every year — about $5,000 a year on $500,000. RetireShield Premium is $39 a month.
            </p>
            <div className="mt-5">
              <Button href="/pricing" variant="secondary" className="px-7 py-4 text-xl">
                Compare plans →
              </Button>
            </div>
          </div>
        </Container>
      </section>

      <section className="bg-white py-12 sm:py-16 lg:py-20" aria-labelledby="trust-safety-heading">
        <Container>
          <div className="mx-auto max-w-3xl text-center">
            <h2 id="trust-safety-heading" className="text-3xl font-extrabold tracking-tight text-ink sm:text-4xl lg:text-5xl">
              Built to be trusted by people who&apos;ve earned the right to be careful.
            </h2>
          </div>

          <div className="mt-10 grid gap-5 lg:grid-cols-3">
            {trustSafetyCards.map((card) => (
              <FeatureCard key={card.title} {...card} />
            ))}
          </div>
        </Container>
      </section>

      <section className="bg-band py-12 sm:py-16 lg:py-20" aria-labelledby="testimonials-heading">
        <Container>
          <div className="mx-auto max-w-3xl text-center">
            <h2 id="testimonials-heading" className="text-3xl font-extrabold tracking-tight text-ink sm:text-4xl lg:text-5xl">
              Retirees sleeping better.
            </h2>
            <p className="mt-5 text-lg leading-8 text-slate-700 sm:text-xl">
              Real customer stories will live here once approved; placeholder quotes keep the structure ready.
            </p>
          </div>

          <div className="mt-10 grid gap-5 lg:grid-cols-3">
            {testimonials.map((testimonial) => (
              <Testimonial key={testimonial.name} {...testimonial} />
            ))}
          </div>
        </Container>
      </section>

      <section className="bg-brand py-12 text-white sm:py-16 lg:py-20" aria-labelledby="final-cta-heading">
        <Container>
          <div className="mx-auto max-w-4xl text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-white/15 text-white" aria-hidden="true">
              <Sparkles className="h-8 w-8" strokeWidth={1.8} />
            </div>
            <h2 id="final-cta-heading" className="mt-6 text-3xl font-extrabold tracking-tight text-white sm:text-4xl lg:text-5xl">
              See where your retirement stands — free, in 2 minutes.
            </h2>
            <div className="mt-8">
              <Button href="/quiz" variant="secondary" className="border-white bg-white px-7 py-4 text-xl text-brand hover:bg-band">
                Get my free Safety Score
              </Button>
            </div>
            <p className="mt-5 text-lg font-semibold text-white/85">No account. No bank linking. No catch.</p>
          </div>
        </Container>
      </section>

      <section id="how-it-works" className="bg-white py-12 sm:py-16 lg:py-20" aria-labelledby="how-it-works-heading">
        <Container>
          <div className="mx-auto max-w-3xl text-center">
            <h2 id="how-it-works-heading" className="text-3xl font-extrabold tracking-tight text-ink sm:text-4xl lg:text-5xl">
              Peace of mind in three steps.
            </h2>
          </div>

          <div className="mt-10 grid gap-5 lg:grid-cols-3">
            {howItWorksSteps.map((step, index) => (
              <StepCard key={step.title} step={index + 1} title={step.title} description={step.description} />
            ))}
          </div>

          <div className="mt-10 flex justify-center">
            <Button href="/quiz" className="px-7 py-4 text-xl">
              Get my free Safety Score
            </Button>
          </div>
        </Container>
      </section>

      <section className="bg-gradient-to-b from-band via-white to-white py-12 sm:py-16 lg:py-20" aria-labelledby="feature-grid-heading">
        <Container>
          <div className="mx-auto max-w-3xl text-center">
            <h2 id="feature-grid-heading" className="text-3xl font-extrabold tracking-tight text-ink sm:text-4xl lg:text-5xl">
              One score. Every retirement worry, in one place.
            </h2>
            <p className="mt-5 text-lg leading-8 text-slate-700 sm:text-xl">
              RetireShield looks at the whole picture — not just your savings balance.
            </p>
          </div>

          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {featureCards.map(({ icon: Icon, title, description }) => (
              <article
                key={title}
                className="group rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:border-brand/30 hover:shadow-lg"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand/10 text-brand transition group-hover:bg-brand group-hover:text-white">
                  <Icon className="h-6 w-6" aria-hidden="true" strokeWidth={1.8} />
                </div>
                <h3 className="mt-5 text-lg font-extrabold text-ink">{title}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-600">{description}</p>
              </article>
            ))}
          </div>
        </Container>
      </section>
    </main>
  );
}
