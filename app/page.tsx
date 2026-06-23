import { redirect } from "next/navigation";
import { BadgeDollarSign, Banknote, Bot, Calculator, HeartPulse, Landmark, LineChart, MessageCircleQuestion, ShieldCheck, ShieldAlert, TrendingUp, WalletCards } from "lucide-react";
import HomeRedirector from "@/components/HomeRedirector";
import { ComparisonRow } from "@/components/ComparisonRow";
import { ScoreGauge } from "@/components/ScoreGauge";
import { StatTile } from "@/components/StatTile";
import { Button, Container, Eyebrow } from "@/components/ui";
import { createClient } from "@/lib/supabase/server";

async function hasActiveSession() {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) return false;

  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  return !!user;
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

const trustStats = [
  { value: "2 minutes" },
  { value: "9 questions" },
  { value: "No bank linking, ever" },
  { value: "Built for ages 55–80" },
  { value: "Informational, not advice" },
];

export default async function Home() {
  if (await hasActiveSession()) redirect("/dashboard");

  return (
    <main>
      <HomeRedirector />
      <section className="overflow-hidden bg-gradient-to-br from-white via-surface to-band py-12 sm:py-16 lg:py-20">
        <Container className="grid items-center gap-10 lg:grid-cols-[1.02fr_0.98fr] lg:gap-14">
          <div className="text-center lg:text-left">
            <Eyebrow>BUILT FOR AMERICANS 55–80</Eyebrow>
            <h1 className="mt-4 text-4xl font-extrabold tracking-tight text-ink sm:text-5xl lg:text-6xl">
              Know your retirement is going to be okay.
            </h1>
            <p className="mt-6 text-xl leading-8 text-slate-700">
              Get your free Retirement Safety Score in about 2 minutes. Answer 9 simple questions — no account, no linking your bank — and see exactly where you stand, in plain English.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center lg:justify-start">
              <Button href="/quiz" className="px-7 py-4 text-xl">
                Get my free Safety Score
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
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
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
            <Eyebrow>OLD WAY VS RETIRESHIELD WAY</Eyebrow>
            <h2 className="mt-4 text-3xl font-extrabold tracking-tight text-ink sm:text-4xl lg:text-5xl">
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
            <Eyebrow>SECTION 7 — THE SAFETY SCORE, EXPLAINED</Eyebrow>
            <h2 id="safety-score-heading" className="mt-4 text-3xl font-extrabold tracking-tight text-ink sm:text-4xl lg:text-5xl">
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
            <Eyebrow>YOUR RETIREMENT, ON CALL</Eyebrow>
            <h2 id="ai-coach-heading" className="mt-4 text-3xl font-extrabold tracking-tight text-ink sm:text-4xl lg:text-5xl">
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

      <section id="how-it-works" className="bg-white py-12 sm:py-16 lg:py-20" aria-labelledby="how-it-works-heading">
        <Container>
          <div className="mx-auto max-w-3xl text-center">
            <Eyebrow>HOW IT WORKS</Eyebrow>
            <h2 id="how-it-works-heading" className="mt-4 text-3xl font-extrabold tracking-tight text-ink sm:text-4xl lg:text-5xl">
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
            <Eyebrow>WHOLE-PICTURE RETIREMENT CHECK</Eyebrow>
            <h2 id="feature-grid-heading" className="mt-4 text-3xl font-extrabold tracking-tight text-ink sm:text-4xl lg:text-5xl">
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
