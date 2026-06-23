import type { Metadata } from "next";
import { CheckCircle2, HeartHandshake, LockKeyhole, ShieldCheck, UserCheck } from "lucide-react";
import { NewsletterSignup } from "@/components/NewsletterSignup";
import { Button, Container, Eyebrow } from "@/components/ui";

export const metadata: Metadata = {
  title: "About RetireShield — Built to Watch Over Retirement Safety",
  description: "The RetireShield origin story, mission, who it is for, and the trust commitments behind our retirement education tools.",
};

const missionCards = [
  {
    title: "Make retirement risk understandable",
    description: "We translate the worries families whisper about—running out, healthcare surprises, scams, inflation, and market drops—into a simple Safety Score and next steps.",
  },
  {
    title: "Protect dignity and independence",
    description: "RetireShield is built to help older adults stay in control while giving adult children a calmer way to support conversations before a crisis.",
  },
  {
    title: "Keep the first step private",
    description: "No bank linking is required. Start with estimates, learn what deserves attention, and decide what to do next on your own timeline.",
  },
];

const audience = [
  "Retirees who want a plain-English checkup instead of another spreadsheet.",
  "People within 5–10 years of retirement who want to spot weak points early.",
  "Adult children helping a parent stay safer without taking over their life.",
  "Couples who need one shared picture of income, spending, and risks.",
];

const trustItems = [
  {
    icon: LockKeyhole,
    title: "No account linking required",
    description: "RetireShield works from information you type in. You can use rough estimates to start and update them as your picture gets clearer.",
  },
  {
    icon: UserCheck,
    title: "Education, not advice",
    description: "Our tools are educational and informational. We do not provide individualized financial, investment, tax, or legal advice.",
  },
  {
    icon: ShieldCheck,
    title: "Trust before growth",
    description: "We do not sell personal data. We explain assumptions in plain language and label areas where a qualified professional may be appropriate.",
  },
];

export default function AboutPage() {
  return (
    <main>
      <section className="bg-gradient-to-b from-band via-white to-white py-16 sm:py-20 lg:py-24">
        <Container className="grid gap-12 lg:grid-cols-[0.95fr_1.05fr] lg:items-center">
          <div>
            <Eyebrow>About RetireShield</Eyebrow>
            <h1 className="mt-5 text-5xl font-extrabold tracking-tight text-ink sm:text-6xl lg:text-7xl">We built a tool to watch over the people we love.</h1>
            <p className="mt-6 text-2xl font-semibold leading-10 text-slate-700">Retirement should not feel like a guessing game. RetireShield exists because families need an easier way to notice money risks, scam risks, and healthcare surprises before they become emergencies.</p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Button href="/quiz">Get your free Safety Score</Button>
              <Button href="/resources" variant="secondary">Read the guides</Button>
            </div>
          </div>
          <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-xl sm:p-8">
            <HeartHandshake className="h-14 w-14 text-brand" aria-hidden="true" />
            <h2 className="mt-6 text-3xl font-extrabold tracking-tight text-ink">The origin</h2>
            <div className="mt-5 space-y-5 text-lg leading-8 text-slate-700">
              <p>Most retirement tools assume someone wants to optimize every account. But many families are asking something more human: “Is Mom okay?” “Can Dad afford the next surprise?” “Are we missing a warning sign?”</p>
              <p>RetireShield is our answer: a calm, privacy-friendly checkup that turns complex retirement risks into a clear score, practical education, and watchful next steps.</p>
            </div>
          </div>
        </Container>
      </section>

      <section className="py-14 sm:py-20" aria-labelledby="mission-heading">
        <Container>
          <div className="mx-auto max-w-3xl text-center">
            <Eyebrow>Mission</Eyebrow>
            <h2 id="mission-heading" className="mt-4 text-4xl font-extrabold tracking-tight text-ink sm:text-5xl">Help every family see what needs attention next.</h2>
          </div>
          <div className="mt-12 grid gap-6 lg:grid-cols-3">
            {missionCards.map((card) => (
              <article key={card.title} className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
                <h3 className="text-2xl font-extrabold tracking-tight text-ink">{card.title}</h3>
                <p className="mt-4 text-lg leading-8 text-slate-700">{card.description}</p>
              </article>
            ))}
          </div>
        </Container>
      </section>

      <section className="bg-white py-14 sm:py-20" aria-labelledby="who-heading">
        <Container className="grid gap-10 lg:grid-cols-[0.8fr_1.2fr] lg:items-start">
          <div>
            <Eyebrow>Who it is for</Eyebrow>
            <h2 id="who-heading" className="mt-4 text-4xl font-extrabold tracking-tight text-ink sm:text-5xl">Built for real households, not finance hobbyists.</h2>
            <p className="mt-5 text-xl leading-9 text-slate-700">You do not need perfect data to start. You need a safe first conversation and a way to decide what deserves attention.</p>
          </div>
          <ul className="grid gap-4">
            {audience.map((item) => (
              <li key={item} className="flex gap-4 rounded-2xl border border-slate-200 bg-band p-5 text-lg font-semibold leading-8 text-slate-700">
                <CheckCircle2 className="mt-1 h-6 w-6 shrink-0 text-accent" aria-hidden="true" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </Container>
      </section>

      <section className="py-14 sm:py-20" aria-labelledby="trust-heading">
        <Container>
          <div className="mx-auto max-w-3xl text-center">
            <Eyebrow>Trust commitments</Eyebrow>
            <h2 id="trust-heading" className="mt-4 text-4xl font-extrabold tracking-tight text-ink sm:text-5xl">Private by default. Clear about limits.</h2>
            <p className="mt-5 text-xl leading-9 text-slate-700">We folded the core trust and disclosure promises into this page so visitors can understand how RetireShield works before sharing anything.</p>
          </div>
          <div className="mt-12 grid gap-6 lg:grid-cols-3">
            {trustItems.map(({ icon: Icon, title, description }) => (
              <article key={title} className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand/10 text-brand"><Icon className="h-7 w-7" aria-hidden="true" /></div>
                <h3 className="mt-6 text-2xl font-extrabold tracking-tight text-ink">{title}</h3>
                <p className="mt-4 text-lg leading-8 text-slate-700">{description}</p>
              </article>
            ))}
          </div>
          <div className="mt-10 rounded-3xl border border-alert/30 bg-alert/10 p-6 text-base font-semibold leading-7 text-slate-700 sm:p-8">
            RetireShield provides educational information only. It is not a financial advisor, broker, tax preparer, law firm, insurance producer, or fiduciary. Use our tools as a starting point and consult qualified professionals for decisions about your specific situation.
          </div>
        </Container>
      </section>

      <Container className="pb-16 sm:pb-20">
        <NewsletterSignup />
      </Container>
    </main>
  );
}
