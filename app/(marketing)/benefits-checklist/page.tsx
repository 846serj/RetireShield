import type { Metadata } from "next";
import { Check, ShieldCheck } from "lucide-react";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "The Benefits Checklist — 11 Programs Worth Checking | RetireShield",
  description:
    "A 69-page guide to 11 retirement benefit programs, current limits, application steps, and the right office to call in every state.",
  path: "/benefits-checklist/",
});

type SearchParams = Record<string, string | string[] | undefined>;

const trackedKeys = [
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_content",
  "utm_term",
  "aid",
  "plat",
  "cid",
] as const;

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function purchaseUrl(searchParams: SearchParams) {
  const url = new URL("https://themoneyoverview.com/benefits-checklist/");

  for (const key of trackedKeys) {
    const value = first(searchParams[key]);
    if (value) url.searchParams.set(key, value.slice(0, 160));
  }

  if (!url.searchParams.has("utm_source")) url.searchParams.set("utm_source", "rs");
  if (!url.searchParams.has("utm_medium")) url.searchParams.set("utm_medium", "email-button");
  if (!url.searchParams.has("utm_campaign")) url.searchParams.set("utm_campaign", "checklist");
  if (!url.searchParams.has("utm_content")) url.searchParams.set("utm_content", "rs1_launch");
  if (!url.searchParams.has("utm_term")) url.searchParams.set("utm_term", "slot-1");
  if (!url.searchParams.has("aid")) url.searchParams.set("aid", "retirement-shield-benefits-checklist");
  if (!url.searchParams.has("plat")) url.searchParams.set("plat", "web");

  url.hash = "rgc-checkout";
  return url.toString();
}

const programs = [
  "Medicare Savings Programs",
  "Extra Help for prescriptions",
  "State drug-cost assistance",
  "SNAP food benefits at 60+",
  "Heating and cooling help",
  "Free weatherization",
  "Senior property-tax breaks",
  "Circuit-breaker credits",
  "VA Pension with Aid & Attendance",
  "State unclaimed property",
  "SSI after age 65",
];

export default function BenefitsChecklistPage({ searchParams }: { searchParams: SearchParams }) {
  const buyHref = purchaseUrl(searchParams);

  return (
    <div className="bg-white">
      <section className="overflow-hidden bg-brand-dark text-white">
        <div className="mx-auto grid max-w-container items-center gap-10 px-4 py-12 sm:px-6 sm:py-16 lg:grid-cols-[1.35fr_.65fr] lg:px-8 lg:py-20">
          <div>
            <p className="text-sm font-extrabold uppercase tracking-[0.18em] text-[#8FD4B2]">Just launched · 2026–2027 edition</p>
            <h1 className="mt-4 max-w-4xl text-4xl font-bold leading-[1.02] tracking-tight text-white sm:text-6xl">
              One program inside can be worth up to $29,093 a year.
            </h1>
            <p className="mt-6 max-w-3xl text-xl leading-8 text-[#D9E6F3] sm:text-2xl">
              The Benefits Checklist shows you 11 programs that can change the math on a fixed income—plus the current limits, the forms, and where to apply.
            </p>

            <div className="mt-8 flex flex-col items-start gap-4 sm:flex-row sm:items-center">
              <a
                href={buyHref}
                className="inline-flex min-h-16 w-full items-center justify-center rounded-xl bg-[#2E9E6A] px-7 py-4 text-center text-xl font-extrabold text-white no-underline shadow-[0_18px_45px_rgba(46,158,106,0.28)] hover:bg-[#278A5C] hover:text-white sm:w-auto"
              >
                Get The Benefits Checklist for $47
              </a>
              <div className="text-left">
                <div className="text-sm font-bold text-[#D9E6F3]"><s className="mr-2 text-white/65">$97 regular price</s> $47 launch price</div>
                <div className="mt-1 text-sm text-[#B9CCE4]">One payment · instant PDF download · 30-day refund</div>
              </div>
            </div>
          </div>

          <div className="relative mx-auto w-full max-w-sm py-5" aria-label="The Benefits Checklist digital guide and worksheets">
            <div className="absolute inset-x-10 inset-y-4 rotate-6 rounded-xl border border-white/20 bg-white/10" aria-hidden="true" />
            <div className="absolute inset-x-10 inset-y-4 -rotate-6 rounded-xl border border-white/20 bg-white/10" aria-hidden="true" />
            <div className="relative mx-auto flex aspect-[.76] w-64 flex-col justify-between rounded-lg border-[7px] border-white bg-gradient-to-br from-[#142F52] to-[#0B1D35] p-7 text-center shadow-2xl shadow-black/35">
              <span className="text-xs font-bold uppercase tracking-[0.2em] text-[#8FD4B2]">RetireShield</span>
              <strong className="font-serif text-4xl leading-none text-white">The Benefits Checklist</strong>
              <span className="border-t border-white/30 pt-5 text-sm font-semibold leading-5 text-[#D9E6F3]">2026–2027 · 11 programs · 50 states</span>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-container px-4 py-14 sm:px-6 sm:py-20 lg:px-8">
        <p className="rg-kicker">The numbers worth checking</p>
        <h2 className="mt-3 max-w-4xl text-3xl font-bold sm:text-5xl">This can be a five-figure decision—not a coupon hunt.</h2>
        <p className="mt-5 max-w-3xl text-lg leading-8 text-slate-600">
          A single missed program can cost far more than the guide. These are separate examples—not a combined total—and every program applies its own income, asset, service, and household rules.
        </p>

        <div className="mt-9 grid gap-5 lg:grid-cols-3">
          <article className="rounded-2xl border border-slate-200 bg-surface p-6">
            <div className="font-serif text-4xl font-bold text-brand-dark">Up to $29,093/year</div>
            <h3 className="mt-4 text-xl font-bold">VA Aid & Attendance</h3>
            <p className="mt-2 text-base leading-7 text-slate-600">The 2026 maximum annual pension rate for a single veteran who qualifies for Aid & Attendance. The actual pension is reduced by countable income.</p>
          </article>
          <article className="rounded-2xl border border-slate-200 bg-surface p-6">
            <div className="font-serif text-4xl font-bold text-brand-dark">Up to $11,928/year</div>
            <h3 className="mt-4 text-xl font-bold">SSI after age 65</h3>
            <p className="mt-2 text-base leading-7 text-slate-600">The 2026 maximum federal payment is $994 a month for one person. Income, resources, and living arrangements can reduce it.</p>
          </article>
          <article className="rounded-2xl border border-slate-200 bg-surface p-6">
            <div className="font-serif text-4xl font-bold text-brand-dark">$2,434.80/year</div>
            <h3 className="mt-4 text-xl font-bold">The Part B premium</h3>
            <p className="mt-2 text-base leading-7 text-slate-600">At $202.90 a month in 2026, that is what a Medicare Savings Program can cover when a person qualifies.</p>
          </article>
        </div>
      </section>

      <section className="border-y border-slate-200 bg-band">
        <div className="mx-auto grid max-w-container gap-10 px-4 py-14 sm:px-6 sm:py-20 lg:grid-cols-[.9fr_1.1fr] lg:px-8">
          <div>
            <p className="rg-kicker">What you get</p>
            <h2 className="mt-3 text-3xl font-bold sm:text-5xl">Eleven programs. One place to start.</h2>
            <p className="mt-5 text-lg leading-8 text-slate-600">
              The 69-page guide begins with a 10-Minute Scan, then puts the current limit, benefit, form, and next step together for each program.
            </p>
            <div className="mt-7 space-y-4">
              {[
                "A 50-state phone directory for the offices that handle the major programs",
                "A two-page printable tracker for applications, documents, and calls",
                "An open-settlements insert refreshed weekly",
                "The 2027 edition included when the annual numbers change",
              ].map((item) => (
                <div key={item} className="flex gap-3 text-base font-semibold leading-7 text-ink">
                  <Check className="mt-1 h-5 w-5 shrink-0 text-accent" aria-hidden="true" />
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="grid gap-x-8 gap-y-3 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:grid-cols-2 sm:p-8">
            {programs.map((program, index) => (
              <div key={program} className="flex items-start gap-3 border-b border-slate-100 py-3 text-base font-bold text-ink">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-band text-sm font-extrabold text-brand">{index + 1}</span>
                <span>{program}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-4xl px-4 py-14 text-center sm:px-6 sm:py-20">
        <ShieldCheck className="mx-auto h-12 w-12 text-accent" aria-hidden="true" />
        <p className="mt-5 text-sm font-extrabold uppercase tracking-[0.18em] text-accent">30-day money-back guarantee</p>
        <h2 className="mt-3 text-3xl font-bold sm:text-5xl">Check the programs before another year gets away.</h2>
        <p className="mx-auto mt-5 max-w-2xl text-lg leading-8 text-slate-600">
          The regular price is $97. The new-launch price is $47 right now. If the guide is not useful, reply to the receipt within 30 days for a refund.
        </p>
        <a
          href={buyHref}
          className="mt-8 inline-flex min-h-16 w-full items-center justify-center rounded-xl bg-[#2E9E6A] px-7 py-4 text-center text-xl font-extrabold text-white no-underline shadow-lg hover:bg-[#278A5C] hover:text-white sm:w-auto"
        >
          Get instant access for $47
        </a>
        <p className="mt-4 text-sm text-slate-500">Secure checkout and digital delivery are handled by our sister publication, The Money Overview.</p>
      </section>

      <section className="border-t border-slate-200 bg-surface">
        <div className="mx-auto max-w-4xl px-4 py-10 text-sm leading-6 text-slate-600 sm:px-6">
          RetireShield is not part of the government and is not endorsed by Social Security, Medicare, the Department of Veterans Affairs, or the IRS. Every program in the guide is free to apply for. This guide is educational information, not financial, tax, or legal advice. No eligibility decision or benefit amount is guaranteed.
        </div>
      </section>
    </div>
  );
}
