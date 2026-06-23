import { redirect } from "next/navigation";
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

      <section id="how-it-works" className="bg-band py-8 sm:py-10" aria-label="Retirement Safety Score proof points">
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
    </main>
  );
}
