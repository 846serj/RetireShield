import type { Metadata } from "next";
import { Check, ShieldCheck } from "lucide-react";
import { BenefitsChecklistCheckout } from "@/components/BenefitsChecklistCheckout";
import { CommercePageAnalytics } from "@/components/CommerceAnalytics";
import { BENEFITS_CHECKLIST_PRODUCT } from "@/lib/benefitsChecklist";
import { pageMetadata } from "@/lib/seo";

export const dynamic = "force-dynamic";
export const metadata: Metadata = pageMetadata({
  title: "The Benefits Checklist — 11 Programs Worth Checking | RetireShield",
  description: "A 69-page guide to 11 benefit programs, their current rules, and where to apply in every state.",
  path: "/benefits-checklist/",
});

type SearchParams = Record<string, string | string[] | undefined>;
const trackedKeys = ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term", "aid", "plat", "cid", "first_aid", "first_cid", "first_plat", "click_count", "page_variant", "source_site"] as const;

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function attributionFrom(searchParams: SearchParams) {
  const attribution: Record<string, string> = {};
  for (const key of trackedKeys) {
    const value = first(searchParams[key]);
    if (value) attribution[key] = value.slice(0, 160);
  }
  attribution.utm_source ||= "rs";
  attribution.utm_medium ||= "web";
  attribution.utm_campaign ||= "checklist";
  attribution.utm_content ||= "benefits-page";
  attribution.utm_term ||= "native-checkout";
  attribution.aid ||= "retirement-shield-benefits-checklist";
  attribution.plat ||= "web";
  attribution.first_aid ||= attribution.aid;
  attribution.first_cid ||= attribution.cid;
  attribution.first_plat ||= attribution.plat;
  attribution.page_variant ||= "a";
  attribution.source_site ||= attribution.utm_source;
  return attribution;
}

const programs = [
  ["Medicare Savings Programs", "May pay the full Part B premium."],
  ["Extra Help", "May cut Part D drug costs."],
  ["State drug help", "Some states give more help with medicine."],
  ["SNAP after 60", "Medical and home costs may help you qualify."],
  ["Heat and cooling help", "May help with bills and shut-off notices."],
  ["Free weather work", "May cut home power bills for years."],
  ["Property tax help", "Many states and towns give help after age 65."],
  ["Circuit-breaker credits", "Some renters and owners can get a tax credit."],
  ["VA Aid and Attendance", "A single veteran may get up to $29,093 a year."],
  ["Unclaimed property", "A free state search may find old money."],
  ["SSI after age 65", "Age can replace the disability test at 65."],
] as const;

function BuyButton({ label = "Get The Benefits Checklist" }: { label?: string }) {
  return (
    <a
      href="#secure-checkout"
      data-rgc-cta-position={label === "Get The Benefits Checklist" ? "mid-page" : "bottom"}
      className="block w-full rounded-lg border-b-4 border-[#0E4D31] bg-[#167A4A] px-5 py-4 text-center text-xl font-extrabold leading-7 text-white no-underline shadow-lg transition hover:bg-[#0E633A] hover:text-white"
    >
      {label} — <s className="mr-2 text-white/70">$97</s> $47
      <span className="mt-1 block text-sm font-semibold">Get all three files now · 30-day refund</span>
    </a>
  );
}

export default function BenefitsChecklistPage({ searchParams }: { searchParams: SearchParams }) {
  const attribution = attributionFrom(searchParams);
  const statePacksReady = process.env.BENEFITS_CHECKLIST_STATE_PACKS_READY === "true";
  const stripePublishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || process.env.STRIPE_PUBLISHABLE_KEY || "";

  return (
    <div className="bg-white pb-24 text-ink sm:pb-0">
      <CommercePageAnalytics product={BENEFITS_CHECKLIST_PRODUCT} attribution={attribution} />
      <div className="bg-brand-dark px-4 py-3 text-center text-sm font-extrabold uppercase tracking-[0.08em] text-white">
        30-day refund · files sent at once · 2026–2027 guide
      </div>

      <main className="mx-auto max-w-[820px] px-4 pb-12 sm:px-6">
        <section className="grid items-center gap-7 py-10 sm:py-14 lg:grid-cols-[1fr_240px] lg:gap-10">
          <div>
            <p className="text-sm font-extrabold uppercase tracking-[0.08em] text-brand">For homes with someone age 65 or older</p>
            <h1 className="mt-3 text-4xl font-bold leading-[1.07] sm:text-6xl">The programs are free. Here is what your $47 gets.</h1>
            <p className="mt-5 text-lg leading-8 text-slate-700">You get the 2026 rules, what each program may pay, the form you need, and the right office in your state. The guide has 69 pages. Each key fact has a link to a public source.</p>
          </div>
          <div className="relative mx-auto grid min-h-[300px] w-full max-w-[240px] place-items-center" aria-label="The Benefits Checklist guide and worksheets">
            <div className="absolute h-[245px] w-[175px] -rotate-6 rounded border border-slate-300 bg-white shadow-lg" />
            <div className="absolute h-[245px] w-[175px] rotate-6 rounded border border-slate-300 bg-white shadow-lg" />
            <div className="relative flex min-h-[260px] w-[190px] flex-col justify-center rounded border-[7px] border-white bg-gradient-to-br from-[#163A66] to-[#0B1D35] p-5 text-center text-white shadow-2xl">
              <small className="text-xs font-bold uppercase tracking-[0.16em] text-[#A8D5BE]">RetireShield</small>
              <strong className="my-5 font-serif text-3xl leading-none">The Benefits Checklist</strong>
              <span className="border-t border-white/40 pt-4 text-xs font-semibold">2026–2027 · 11 programs · 50 states</span>
            </div>
          </div>
        </section>

        <section className="rounded-xl border-2 border-brand-dark bg-[#F7F9FC] p-5 sm:p-7">
          <h2 className="text-2xl font-bold">Three facts to know first</h2>
          <div className="mt-4 space-y-4">
            {[
              ["The programs are free.", "You do not pay any office to apply."],
              ["We are not the government.", "We do not work for Medicare, Social Security, the VA, or the IRS."],
              ["We do not file for you.", "You send the form. The guide shows where to start."],
            ].map(([title, copy]) => (
              <div key={title} className="flex gap-3"><Check className="mt-1 h-5 w-5 shrink-0 text-[#167A4A]" /><p className="text-base leading-7"><strong>{title}</strong> {copy}</p></div>
            ))}
          </div>
        </section>

        <section className="py-10 sm:py-14">
          <h2 className="text-3xl font-bold sm:text-4xl">So what do you get?</h2>
          <p className="mt-4 text-lg leading-8 text-slate-700">The rules sit on many public sites. Each site has its own forms, limits, and phone numbers. We found the facts, checked them, and put them in one guide. That work is what your $47 pays for.</p>
          <div className="mt-7 rounded-xl border border-slate-200 bg-slate-50 p-5 text-center">
            <div className="font-serif text-5xl font-bold text-brand-dark"><s className="mr-3 text-2xl font-normal text-slate-400">$97</s>$47</div>
            <p className="mt-2 text-sm text-slate-600">One payment · three PDFs · free 2027 update</p>
            <div className="mx-auto mt-5 max-w-xl"><BuyButton /></div>
          </div>
        </section>

        <section className="rounded-r-xl border-l-[6px] border-[#167A4A] bg-[#F1F6FA] p-6 sm:p-8">
          <strong className="font-serif text-5xl text-brand-dark">Up to $29,093 a year</strong>
          <p className="mt-3 text-lg leading-8 text-slate-700">That is the top 2026 VA pension rate for one veteran with Aid and Attendance. Your amount may be less. Income and other rules apply. It is one of the 11 programs in the guide.</p>
        </section>

        <section className="py-12">
          <h2 className="text-3xl font-bold sm:text-4xl">The 11 programs</h2>
          <div className="mt-6 divide-y divide-slate-200 border-y border-slate-200">
            {programs.map(([name, copy]) => (
              <div key={name} className="flex gap-3 py-4"><Check className="mt-1 h-5 w-5 shrink-0 text-[#167A4A]" /><p className="text-base leading-7"><strong className="block text-lg">{name}</strong>{copy}</p></div>
            ))}
          </div>
        </section>

        <section className="rounded-xl border border-slate-200 bg-[#F8FAFC] p-5 sm:p-7">
          <h2 className="text-3xl font-bold">What comes with it</h2>
          <div className="mt-5 divide-y divide-slate-200">
            {[
              ["The Benefits Checklist", "69 pages with 11 programs and a 50-state phone list", "PDF 1"],
              ["Print tracker", "Track forms, calls, papers, and dates", "PDF 2"],
              ["Open settlements", "See claims that are still open", "PDF 3"],
              ["The 2027 guide", "We send it when the yearly numbers change", "Free"],
            ].map(([name, copy, tag]) => (
              <div key={name} className="grid gap-1 py-4 sm:grid-cols-[1fr_auto] sm:gap-5"><p className="leading-7"><strong>{name}</strong> — {copy}</p><span className="font-extrabold text-brand">{tag}</span></div>
            ))}
          </div>
          <p className="mt-5 text-base leading-7 text-slate-700">At checkout, you may add your 13–15 page State Pack for $27. The box starts off. After you buy, you may also use every dollar you paid as credit toward a $297 Personal Benefits Report. You choose how far to go.</p>
        </section>

        <section className="py-12">
          <h2 className="text-3xl font-bold">How we checked it</h2>
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            {[
              ["Public sources", "We used the offices that run each program."],
              ["Dates on each fact", "The key limits were checked in September 2026."],
              ["State links", "We checked the office sites and phone lists."],
              ["A free update", "We send the 2027 guide when the yearly limits change."],
            ].map(([title, copy]) => <div key={title} className="rounded-xl border border-slate-200 p-5"><strong className="text-lg">{title}</strong><p className="mt-2 leading-7 text-slate-700">{copy}</p></div>)}
          </div>
        </section>

        <section className="rounded-xl border-2 border-[#167A4A] p-6 text-center sm:p-8">
          <ShieldCheck className="mx-auto h-11 w-11 text-[#167A4A]" />
          <h2 className="mt-4 text-3xl font-bold">If it does not help, get your money back.</h2>
          <p className="mx-auto mt-3 max-w-xl text-lg leading-8 text-slate-700">Reply to your receipt within 30 days. We will send your $47 back. No long form. No hard sell.</p>
        </section>

        <section className="py-12 text-center">
          <div className="font-serif text-5xl font-bold text-brand-dark"><s className="mr-4 text-2xl font-normal text-slate-400">$97</s>$47</div>
          <p className="mt-2 text-slate-600">One payment · files sent at once · 30-day refund</p>
          <div className="mx-auto mt-6 max-w-xl"><BuyButton label="Get the guide" /></div>
        </section>

        <section className="pb-12">
          <h2 className="text-3xl font-bold">Questions</h2>
          <div className="mt-4 divide-y divide-slate-200 border-y border-slate-200">
            {[
              ["Does buying this apply for me?", "No. This is a guide. You send each form to the office that runs the program."],
              ["Can I find this for free?", "Yes. The facts are public. The guide saves you the work of finding and sorting them."],
              ["Will I get a benefit?", "We cannot promise that. Each office checks your case and makes the choice."],
              ["What happens when the numbers change?", "We send buyers the 2027 guide when the yearly numbers change."],
              ["What if I do not like it?", "Reply to your receipt within 30 days. We will refund the $47."],
            ].map(([question, answer]) => <details key={question} className="py-4"><summary className="cursor-pointer text-lg font-extrabold">{question}</summary><p className="mt-3 text-base leading-7 text-slate-700">{answer}</p></details>)}
          </div>
        </section>

        <p className="pb-10 text-sm leading-6 text-slate-600">RetireShield is not part of the government. Social Security, Medicare, the VA, and the IRS do not endorse us. Each program is free to apply for. This is a guide, not financial, legal, or tax advice. Each office decides who gets help.</p>
      </main>

      <BenefitsChecklistCheckout attribution={attribution} statePacksReady={statePacksReady} stripePublishableKey={stripePublishableKey} />

      <div className="fixed inset-x-0 bottom-0 z-50 border-t border-slate-200 bg-white/95 p-3 shadow-[0_-4px_18px_rgba(0,0,0,.14)] sm:hidden">
        <a href="#secure-checkout" data-rgc-cta-position="mobile-sticky" className="block rounded-lg bg-[#167A4A] px-4 py-3 text-center text-lg font-extrabold text-white no-underline">Get the guide — <s className="text-white/70">$97</s> $47</a>
      </div>
    </div>
  );
}
