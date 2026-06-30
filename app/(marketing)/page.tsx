import { BadgeDollarSign, Banknote, HeartPulse, Landmark, LineChart, ShieldAlert, ShieldCheck, Sparkles, Star, TrendingUp, UserCheck, WalletCards } from "lucide-react";
import DashboardPreview from "@/components/DashboardPreview";
import FeatureShowcase from "@/components/FeatureShowcase";
import { PricingPreview } from "@/components/PricingPreview";
import { Button, Container } from "@/components/ui";
import { LEADGEN_ONLY } from "@/lib/flags";
import { pageMetadata } from "@/lib/seo";
import { createClient } from "@/lib/supabase/server";

export const metadata = pageMetadata({
  title: "RetireShield — Your Free Retirement Safety Score",
  description: "See how secure your retirement is in two minutes with a free Retirement Safety Score and plain-English next steps.",
  path: "/",
});

async function getSessionEmail() {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) return false;

  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  return user?.email ?? null;
}

const retirementAreas = [
  { icon: Banknote, title: "Income", description: "See whether guaranteed income covers the bills that matter most." },
  { icon: WalletCards, title: "Safe withdrawals", description: "Know what you can spend without quietly draining your plan." },
  { icon: TrendingUp, title: "Inflation", description: "Spot where rising prices could shrink future purchasing power." },
  { icon: LineChart, title: "Market drops", description: "Understand how a downturn changes your cushion and next move." },
  { icon: Landmark, title: "Social Security", description: "Compare claiming choices in plain language, not spreadsheets." },
  { icon: BadgeDollarSign, title: "Medicare & IRMAA", description: "Watch income thresholds that can trigger Medicare surcharges." },
  { icon: ShieldAlert, title: "Scams", description: "Get prompts to pause, verify, and protect money before it moves." },
  { icon: HeartPulse, title: "Healthcare", description: "Plan for medical costs, care needs, and surprise expenses." },
];

const credibilityTiles = [
  { icon: UserCheck, title: "Built for Americans 55–80", description: "Focused on the decisions people face near and in retirement." },
  { icon: ShieldCheck, title: "No bank linking required", description: "Start with simple answers; connect accounts only if you choose later." },
  { icon: Sparkles, title: "Education + an AI co-pilot", description: "Retirement math explained in words you can use with confidence." },
];

const proofStats = [
  {
    value: "67% / 78%",
    label: "workers / retirees confident",
    body: "EBRI and Greenwald's 2025 Retirement Confidence Survey reported 67% of workers and 78% of retirees felt confident they would have enough money to live comfortably throughout retirement.",
    source: "Source: EBRI/Greenwald Research, 2025 Retirement Confidence Survey",
  },
  {
    value: "$1.9B+",
    label: "reported older-adult fraud losses",
    body: "The FTC said older adults reported more than $1.9 billion in fraud losses in 2023, with estimated true losses potentially far higher because many scams go unreported.",
    source: "Source: Federal Trade Commission, Protecting Older Consumers 2023–2024",
  },
  {
    value: "Age 65+",
    label: "planning can last decades",
    body: "Social Security's actuarial tables show remaining life expectancy at age 65 extends many years, so retirement choices need a long-range watchlist, not a one-time snapshot.",
    source: "Source: Social Security Administration, 2023 period life table used in the 2026 Trustees Report",
  },
];

const testimonials = [
  { quote: "[Placeholder] RetireShield helped me see the next right step instead of worrying about everything at once.", name: "Retiree testimonial", detail: "Placeholder until a real customer story is approved" },
  { quote: "[Placeholder] The Safety Score made our retirement plan feel understandable for the first time.", name: "Couple testimonial", detail: "Placeholder until a real customer story is approved" },
  { quote: "[Placeholder] I liked getting a clear first look without talking to a salesperson.", name: "Privacy-first testimonial", detail: "Placeholder until a real customer story is approved" },
];

const helpLadder = [
  { name: "Free", description: "Start with your Safety Score and the first plain-English next steps." },
  { name: "Plus", description: "Keep watch with ongoing check-ins, alerts, and deeper planning answers." },
  { name: "Premium", description: "Unlock fuller projections, Medicare and Social Security help, and priority tools." },
  { name: "Concierge", description: "Get extra human-guided support when you want a second set of eyes." },
];

function primaryCta(userEmail: string | false | null) {
  return {
    href: userEmail ? "/coach" : "/quiz",
    label: userEmail ? "Go to my dashboard" : "Get my free Safety Score",
  };
}

export default async function Home() {
  const userEmail = await getSessionEmail();
  const cta = primaryCta(userEmail);

  return (
    <main>
      <section className="overflow-hidden bg-gradient-to-br from-white via-surface to-band py-12 sm:py-16 lg:py-24">
        <Container wide>
          <div className="mx-auto max-w-3xl text-center">
            <h1 className="font-serif text-4xl font-bold tracking-tight text-ink sm:text-5xl lg:text-6xl">
              Know your retirement is going to be okay.
            </h1>
            <p className="mt-6 text-xl leading-9 text-slate-700">
              The AI tool that watches your retirement, answers any money question in plain language, and shows you what to do next — powered by your real numbers. Start free with your Safety Score in 2 minutes.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
              <Button href={cta.href} className="px-7 py-4 text-xl">{cta.label}</Button>
              <Button href="#feature-showcase" variant="ghost" className="px-7 py-4 text-xl">See how it works</Button>
            </div>
            <p className="mt-4 text-sm font-bold text-slate-600">No credit card. No account. No bank linking.</p>
          </div>

          <div className="mt-12 sm:mt-16">
            <DashboardPreview />
          </div>
        </Container>
      </section>

      <section className="bg-band py-10 sm:py-12" aria-labelledby="credibility-heading">
        <Container>
          <h2 id="credibility-heading" className="sr-only">RetireShield credibility</h2>
          <div className="grid gap-4 md:grid-cols-3">
            {credibilityTiles.map(({ icon: Icon, title, description }) => (
              <article key={title} className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                <Icon className="h-8 w-8 text-brand" aria-hidden="true" />
                <h3 className="mt-4 text-xl font-extrabold text-ink">{title}</h3>
                <p className="mt-2 leading-7 text-slate-700">{description}</p>
              </article>
            ))}
          </div>
          <div className="mt-8 rounded-3xl border border-dashed border-slate-300 bg-white/70 p-5">
            <p className="text-center text-sm font-extrabold uppercase tracking-[0.18em] text-slate-500">Clearly labeled placeholders — to populate once earned</p>
            <div className="mt-4 grid gap-3 text-center font-extrabold text-slate-400 sm:grid-cols-4">
              <div className="rounded-2xl border border-slate-200 bg-white p-4">AARP logo placeholder</div>
              <div className="rounded-2xl border border-slate-200 bg-white p-4">Press logo placeholder</div>
              <div className="rounded-2xl border border-slate-200 bg-white p-4">Review site placeholder</div>
              <div className="rounded-2xl border border-slate-200 bg-white p-4 text-amber-600"><span className="inline-flex gap-1"><Star className="h-4 w-4 fill-current" /> 5-star rating placeholder</span></div>
            </div>
          </div>
        </Container>
      </section>

      <section className="bg-white py-12 sm:py-16 lg:py-20" aria-labelledby="picture-heading">
        <Container>
          <div className="mx-auto max-w-3xl text-center">
            <h2 id="picture-heading" className="font-serif text-4xl font-bold tracking-tight text-ink sm:text-5xl lg:text-6xl">More than a score — your whole retirement picture.</h2>
            <p className="mt-5 text-lg leading-8 text-slate-700 sm:text-xl">RetireShield looks across the issues that can change how safe retirement feels.</p>
          </div>
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {retirementAreas.map(({ icon: Icon, title, description }) => (
              <article key={title} className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:border-brand/30 hover:shadow-lg">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand/10 text-brand"><Icon className="h-6 w-6" aria-hidden="true" /></div>
                <h3 className="mt-5 text-xl font-extrabold text-ink">{title}</h3>
                <p className="mt-2 leading-7 text-slate-600">{description}</p>
              </article>
            ))}
          </div>
        </Container>
      </section>

      <section id="feature-showcase" className="bg-white">
        <Container wide className="px-0 sm:px-0 lg:px-0">
          <FeatureShowcase />
        </Container>
      </section>

      <section className="bg-gradient-to-b from-white via-band to-white py-12 sm:py-16 lg:py-20" aria-labelledby="proof-heading">
        <Container>
          <div className="mx-auto max-w-3xl text-center">
            <h2 id="proof-heading" className="font-serif text-4xl font-bold tracking-tight text-ink sm:text-5xl lg:text-6xl">Real retirement risks deserve clear next steps.</h2>
          </div>
          <div className="mt-10 grid gap-5 lg:grid-cols-3">
            {proofStats.map((stat) => (
              <article key={stat.value} className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                <p className="font-serif text-4xl font-bold text-brand">{stat.value}</p>
                <h3 className="mt-2 text-xl font-extrabold text-ink">{stat.label}</h3>
                <p className="mt-3 leading-7 text-slate-700">{stat.body}</p>
                <p className="mt-4 text-xs font-bold uppercase tracking-wide text-slate-500">{stat.source}</p>
              </article>
            ))}
          </div>
          <div className="mt-8 grid gap-5 lg:grid-cols-3">
            {testimonials.map((testimonial) => (
              <article key={testimonial.name} className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                <p className="text-lg font-semibold leading-8 text-slate-700">“{testimonial.quote}”</p>
                <p className="mt-6 font-extrabold text-ink">{testimonial.name}</p>
                <p className="mt-1 text-sm font-semibold text-slate-500">{testimonial.detail}</p>
              </article>
            ))}
          </div>
        </Container>
      </section>

      <section className="bg-white py-12 sm:py-16 lg:py-20" aria-labelledby="help-heading">
        <Container>
          <div className="mx-auto max-w-4xl text-center">
            <h2 id="help-heading" className="font-serif text-4xl font-bold tracking-tight text-ink sm:text-5xl lg:text-6xl">Get as much or as little help as you need — you&apos;re never on your own.</h2>
          </div>
          <div className="mt-10 grid gap-4 md:grid-cols-4">
            {helpLadder.map((step, index) => (
              <article key={step.name} className="rounded-3xl border border-slate-200 bg-band/50 p-5">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand text-lg font-extrabold text-white">{index + 1}</div>
                <h3 className="mt-4 text-2xl font-extrabold text-ink">{step.name}</h3>
                <p className="mt-2 leading-7 text-slate-700">{step.description}</p>
              </article>
            ))}
          </div>
          {!LEADGEN_ONLY && (
            <>
              <PricingPreview />
              <div className="mt-8 text-center"><Button href="/upgrade" className="px-7 py-4 text-xl">Compare help levels</Button></div>
            </>
          )}
        </Container>
      </section>

      <section className="bg-band py-12 sm:py-16 lg:py-20" aria-labelledby="final-cta-heading">
        <Container>
          <div className="mx-auto max-w-4xl text-center">
            <h2 id="final-cta-heading" className="font-serif text-4xl font-bold tracking-tight text-ink sm:text-5xl lg:text-6xl">See where your retirement stands — free, in 2 minutes.</h2>
            <p className="mt-5 text-lg font-semibold text-slate-700">No credit card. No account. No bank linking. Just your clearest next step.</p>
            <div className="mt-8"><Button href={cta.href} className="px-7 py-4 text-xl">{cta.label}</Button></div>
          </div>
        </Container>
      </section>
    </main>
  );
}
