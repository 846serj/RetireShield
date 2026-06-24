import Link from "next/link";
import { Button, Container, Eyebrow, SectionBand } from "@/components/ui";
import { featureOrder, features, type FeatureSlug } from "./featureContent";

export function FeatureMock({ slug }: { slug: FeatureSlug }) {
  const feature = features[slug];
  const Icon = feature.icon;
  return (
    <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-2xl shadow-brand/10">
      <div className="flex items-center justify-between gap-4 border-b border-slate-100 pb-5">
        <div><p className="text-sm font-extrabold uppercase tracking-[0.16em] text-slate-500">{feature.visualTitle}</p><p className="mt-1 text-lg font-bold text-ink">RetireShield</p></div>
        <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand/10 text-brand"><Icon className="h-6 w-6" /></span>
      </div>
      <div className="py-8 text-center">
        <div className="mx-auto flex h-36 w-36 items-center justify-center rounded-full border-[14px] border-brand/20 bg-band text-5xl font-extrabold text-brand">{feature.visualMetric}</div>
        <p className="mt-4 text-xl font-extrabold text-ink">{feature.visualLabel}</p>
        {"visualNote" in feature ? <p className="mt-2 text-xs font-extrabold uppercase tracking-[0.16em] text-slate-500">{feature.visualNote}</p> : null}
      </div>
      <div className="grid gap-3">
        {feature.benefits.slice(0, 3).map(([_, title], index) => <div key={title} className="flex items-center gap-3 rounded-2xl bg-surface p-4"><span className="h-3 w-3 rounded-full bg-accent" /><span className="font-bold text-slate-700">{index + 1}. {title}</span></div>)}
      </div>
    </div>
  );
}

export function FeatureDashboardVisual({ slug }: { slug: FeatureSlug }) {
  const feature = features[slug];
  const topBenefits = feature.benefits.slice(0, 3);

  return (
    <div className="rounded-[2rem] border border-slate-200 bg-ink p-6 text-white shadow-2xl shadow-brand/10">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-sm font-extrabold uppercase tracking-[0.16em] text-white/55">Dashboard snapshot</p>
          <p className="mt-1 text-2xl font-extrabold">Next-step view</p>
        </div>
        <span className="rounded-full bg-accent/20 px-3 py-1 text-sm font-extrabold text-accent">Live plan</span>
      </div>
      <div className="mt-6 grid gap-4 sm:grid-cols-[0.85fr_1fr]">
        <div className="rounded-3xl bg-white/10 p-5">
          <p className="text-sm font-bold text-white/70">Focus area</p>
          <p className="mt-3 text-3xl font-extrabold text-accent">{feature.visualMetric}</p>
          <p className="mt-2 font-bold text-white/85">{feature.visualLabel}</p>
          <div className="mt-5 h-2 overflow-hidden rounded-full bg-white/15">
            <div className="h-full w-4/5 rounded-full bg-accent" />
          </div>
        </div>
        <div className="space-y-3">
          {topBenefits.map(([_, title], index) => (
            <div key={title} className="rounded-2xl bg-white p-4 text-ink">
              <div className="flex items-center justify-between gap-3">
                <span className="font-extrabold">{title}</span>
                <span className="rounded-full bg-brand/10 px-2.5 py-1 text-xs font-extrabold text-brand">Step {index + 1}</span>
              </div>
              <div className="mt-3 h-2 rounded-full bg-slate-100">
                <div className="h-full rounded-full bg-brand" style={{ width: `${85 - index * 18}%` }} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function FeaturePage({ slug }: { slug: FeatureSlug }) {
  const feature = features[slug];
  const benefitsHeading = "benefitsHeading" in feature ? feature.benefitsHeading : "Placeholder benefits for this pillar";
  const visualHeading = "visualHeading" in feature ? feature.visualHeading : `A clear dashboard for ${feature.eyebrow.toLowerCase()}.`;
  const visualBody = "visualBody" in feature ? feature.visualBody : "Placeholder copy for the relevant visual mock. Final product screenshots and approved copy can replace this scaffold without changing the layout.";
  const ctaHeading = "ctaHeading" in feature ? feature.ctaHeading : "Ready to make retirement feel safer?";
  const ctaBody = "ctaBody" in feature ? feature.ctaBody : `Placeholder CTA band copy for ${feature.eyebrow}. Start with the free Safety Score or choose the pillar you want to explore next.`;
  return (
    <main>
      <section className="bg-surface py-16 sm:py-20 lg:py-24">
        <Container className="grid items-center gap-12 lg:grid-cols-[1fr_0.85fr]">
          <div><Eyebrow>{feature.eyebrow}</Eyebrow><h1 className="mt-4 text-4xl font-extrabold tracking-tight text-ink sm:text-5xl lg:text-6xl">{feature.title}</h1><p className="mt-6 max-w-2xl text-xl leading-9 text-slate-700">{feature.subtitle}</p><div className="mt-8 flex flex-col gap-3 sm:flex-row"><Button href={feature.href}>{feature.cta}</Button><Button href="/features" variant="secondary">View all features</Button></div></div>
          <FeatureMock slug={slug} />
        </Container>
      </section>
      <section className="py-14 sm:py-18 lg:py-20"><Container><div className="max-w-2xl"><h2 className="text-3xl font-extrabold tracking-tight text-ink sm:text-4xl">{benefitsHeading}</h2></div><div className="mt-10 grid gap-5 md:grid-cols-2 lg:grid-cols-4">{feature.benefits.map(([Icon, title, description]) => <article key={title} className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"><div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand/10 text-brand"><Icon className="h-6 w-6" /></div><h3 className="mt-5 text-xl font-extrabold text-ink">{title}</h3><p className="mt-3 leading-7 text-slate-700">{description}</p></article>)}</div></Container></section>
      <SectionBand><Container className="grid items-center gap-8 lg:grid-cols-[0.85fr_1fr]"><FeatureDashboardVisual slug={slug} /><div><h2 className="text-3xl font-extrabold tracking-tight text-ink sm:text-4xl">{visualHeading}</h2><p className="mt-5 text-lg leading-8 text-slate-700">{visualBody}</p></div></Container></SectionBand>
      <section className="py-14 sm:py-18 lg:py-20"><Container><div className="max-w-2xl"><h2 className="text-3xl font-extrabold tracking-tight text-ink sm:text-4xl">Common questions</h2></div><div className="mt-8 grid gap-4 lg:grid-cols-3">{feature.faqs.map(([question, answer]) => <details key={question} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><summary className="cursor-pointer text-lg font-extrabold text-ink">{question}</summary><p className="mt-4 leading-7 text-slate-700">{answer}</p></details>)}</div></Container></section>
      <SectionBand className="bg-brand text-white"><Container className="text-center"><h2 className="text-3xl font-extrabold tracking-tight sm:text-4xl">{ctaHeading}</h2><p className="mx-auto mt-4 max-w-2xl text-lg leading-8 text-white/85">{ctaBody}</p><div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row"><Button href={feature.href} variant="secondary">{feature.cta}</Button><Button href="/features" variant="ghost" className="text-white hover:bg-white/10 hover:text-white">Compare pillars</Button></div></Container></SectionBand>
    </main>
  );
}

export function FeaturesOverview() {
  return <main><section className="bg-surface py-16 sm:py-20 lg:py-24"><Container className="text-center"><Eyebrow>Features</Eyebrow><h1 className="mx-auto mt-4 max-w-4xl text-4xl font-extrabold tracking-tight text-ink sm:text-5xl lg:text-6xl">Five pillars for a safer, clearer retirement.</h1><p className="mx-auto mt-6 max-w-3xl text-xl leading-9 text-slate-700">Placeholder overview copy linking RetireShield’s Safety Score, monitoring, AI Coach, Medicare & Social Security tools, and Scam Shield.</p><div className="mt-8"><Button href="/quiz">Get my free Safety Score</Button></div></Container></section><section className="py-14 sm:py-18 lg:py-20"><Container><div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">{featureOrder.map((slug) => { const f = features[slug]; const Icon = f.icon; return <Link key={slug} href={`/features/${slug}`} className="group rounded-3xl border border-slate-200 bg-white p-6 no-underline shadow-sm transition hover:-translate-y-1 hover:border-brand/30 hover:shadow-lg"><div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand/10 text-brand group-hover:bg-brand group-hover:text-white"><Icon className="h-7 w-7" /></div><h2 className="mt-6 text-2xl font-extrabold text-ink">{f.eyebrow}</h2><p className="mt-3 leading-7 text-slate-700">{f.subtitle}</p><span className="mt-5 inline-flex font-extrabold text-brand">Explore {f.eyebrow} →</span></Link>; })}</div></Container></section><SectionBand><Container className="text-center"><h2 className="text-3xl font-extrabold tracking-tight text-ink sm:text-4xl">Start with the score, then go deeper.</h2><p className="mx-auto mt-4 max-w-2xl text-lg leading-8 text-slate-700">Placeholder CTA band copy for the features overview.</p><div className="mt-8"><Button href="/quiz">Get my free Safety Score</Button></div></Container></SectionBand></main>;
}
