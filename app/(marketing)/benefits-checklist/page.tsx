import type { Metadata } from "next";
import { Check, ShieldCheck } from "lucide-react";
import { BenefitsChecklistCheckout } from "@/components/BenefitsChecklistCheckout";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "The Benefits Checklist — 11 Programs Worth Checking | RetireShield",
  description: "A 69-page guide to 11 benefit programs, their current rules, and where to apply in every state.",
  path: "/benefits-checklist/",
});

type SearchParams = Record<string, string | string[] | undefined>;
const trackedKeys = ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term", "aid", "plat", "cid"] as const;

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
  return attribution;
}

const programs = [
  ["Medicare Savings Programs", "May pay the full Part B premium."],
  ["Extra Help", "May cut Part D drug costs."],
  ["State drug help", "Some states give more help with medicine."],
  ["SNAP after 60", "Older adults may use different rules."],
  ["Heat and cooling help", "Help with bills and shut-off notices."],
  ["Free weather work", "Work on the home may cut power bills."],
  ["Property tax breaks", "Many states and towns give help after 65."],
  ["Circuit-breaker credits", "Some renters and owners can get a tax credit."],
  ["VA Aid and Attendance", "A single veteran may get up to $29,093 a year."],
  ["Unclaimed property", "A free state search may find old money."],
  ["SSI after 65", "Age can replace the disability test at 65."],
] as const;

function BuyButton({ label = "Get The Benefits Checklist" }: { label?: string }) {
  return (
    <a href="#secure-checkout" className="block w-full rounded-lg border-b-4 border-[#0E4D31] bg-[#167A4A] px-5 py-4 text-center text-xl font-extrabold leading-7 text-white no-underline shadow-lg hover:bg-[#0E633A] hover:text-white">
      {label} — <s className="mr-2 opacity-70">$97</s> $47
      <span className="mt-1 block text-sm font-semibold">Get the files now · 30-day refund</span>
    </a>
  );
}

export default function BenefitsChecklistPage({ searchParams }: { searchParams: SearchParams }) {
  const attribution = attributionFrom(searchParams);
  const statePacksReady = process.env.BENEFITS_CHECKLIST_STATE_PACKS_READY === "true";

  return (
    <div className="bg-white pb-24 text-ink sm:pb-0">
      <div className="bg-brand-dark px-4 py-3 text-center text-sm font-extrabold uppercase tracking-[0.08em] text-white">2026–2027 guide · Get it now · 30-day refund</div>

      <main className="mx-auto max-w-[820px] px-4 pb-12 sm:px-6">
        <section className="grid items-center gap-6 py-9 sm:py-14 lg:grid-cols-[1fr_250px] lg:gap-10">
          <div>
            <p className="text-sm font-extrabold uppercase tracking-[0.08em] text-brand">For adults 65+ and the family who helps them</p>
            <h1 className="mt-3 text-4xl font-bold leading-[1.08] sm:text-6xl">One missed benefit can cost far more than $47.</h1>
            <p className="mt-5 text-lg leading-8 text-slate-700">This guide puts 11 programs in one place. See the limits, forms, phone numbers, and next steps for your state.</p>
          </div>
          <div className="relative mx-auto grid min-h-[300px] w-full max-w-[250px] place-items-center" aria-label="The Benefits Checklist guide and worksheets">
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
          <h2 className="text-2xl font-bold">Three things to know</h2>
          <div className="mt-4 space-y-4">
            {[
              ["The programs are free.", "You do not pay to apply. The guide shows public facts and links to each source."],
              ["We are not the government.", "We do not work for Social Security, Medicare, the VA, or the IRS."],
              ["You still send the forms.", "The guide shows where to start. It does not apply for you."],
            ].map(([title, copy]) => (
              <div key={title} className="flex gap-3"><Check className="mt-1 h-5 w-5 shrink-0 text-[#167A4A]" /><p className="text-base leading-7"><strong>{title}</strong> {copy}</p></div>
            ))}
          </div>
        </section>

        <section className="py-10 sm:py-14">
          <h2 className="text-3xl font-bold sm:text-4xl">What does the $47 pay for?</h2>
          <p className="mt-4 text-lg leading-8 text-slate-700">It pays for the work of putting the rules in one place. The programs sit on many sites. They use different forms, limits, and offices. This guide sorts them for you.</p>
          <div className="mt-7"><BuyButton /></div>
        </section>

        <section className="rounded-r-xl border-l-[6px] border-[#167A4A] bg-[#F1F6FA] p-6 sm:p-8">
          <strong className="font-serif text-5xl text-brand-dark">Up to $29,093</strong>
          <p className="mt-3 text-lg leading-8 text-slate-700">That is the 2026 top yearly VA pension rate for one veteran who gets Aid and Attendance. Your pay can be less. Income and other rules apply.</p>
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
          <h2 className="text-3xl font-bold">What you get</h2>
          <div className="mt-5 divide-y divide-slate-200">
            {[
              ["The Benefits Checklist", "69 pages with 11 programs and a 50-state phone list", "PDF 1"],
              ["Print tracker", "Track forms, calls, papers, and dates", "PDF 2"],
              ["Open settlements", "A short list of claims that are still open", "PDF 3"],
              ["The 2027 guide", "We send it when the yearly numbers change", "Free"],
            ].map(([name, copy, tag]) => (
              <div key={name} className="grid gap-1 py-4 sm:grid-cols-[1fr_auto] sm:gap-5"><p className="leading-7"><strong>{name}</strong> — {copy}</p><span className="font-extrabold text-brand">{tag}</span></div>
            ))}
          </div>
        </section>

        <section className="py-12">
          <h2 className="text-3xl font-bold">The full path</h2>
          <p className="mt-3 text-lg leading-8 text-slate-700">Start small. Add more help only if you want it.</p>
          <div className="mt-6 grid gap-4 sm:grid-cols-3">
            {[
              ["1", "The guide", "$47", "The rules and first steps."],
              ["2", "Your State Pack", "+$27", "State limits, dates, calls, and scripts. This is an option at checkout."],
              ["3", "Your Personal Report", "$297 total", "Your answers, your likely matches, and your call order. What you paid for steps 1 and 2 comes off this price."],
            ].map(([step, name, price, copy]) => (
              <article key={step} className="rounded-xl border border-slate-200 p-5"><span className="text-sm font-extrabold text-brand">STEP {step}</span><h3 className="mt-2 text-xl font-bold">{name}</h3><strong className="mt-2 block text-2xl text-brand-dark">{price}</strong><p className="mt-3 text-sm leading-6 text-slate-600">{copy}</p></article>
            ))}
          </div>
        </section>

        <section className="rounded-xl border-2 border-[#167A4A] p-6 text-center sm:p-8">
          <ShieldCheck className="mx-auto h-11 w-11 text-[#167A4A]" />
          <h2 className="mt-4 text-3xl font-bold">Try it for 30 days.</h2>
          <p className="mx-auto mt-3 max-w-xl text-lg leading-8 text-slate-700">If it does not help, reply to your receipt in 30 days. We will send your money back.</p>
        </section>

        <section className="py-12 text-center">
          <div className="font-serif text-5xl font-bold text-brand-dark"><s className="mr-4 text-2xl font-normal text-slate-400">$97</s>$47</div>
          <p className="mt-2 text-slate-600">One payment · three files · no monthly bill</p>
          <div className="mx-auto mt-6 max-w-xl"><BuyButton label="Get the guide" /></div>
        </section>

        <section className="pb-12">
          <h2 className="text-3xl font-bold">Questions</h2>
          <div className="mt-4 divide-y divide-slate-200 border-y border-slate-200">
            {[
              ["Does this apply for me?", "No. This is a guide. You send each form to the office that runs the program."],
              ["Can I find this for free?", "Yes. The facts are on public sites. This guide saves you the work of finding and sorting them."],
              ["Will I get a benefit?", "We cannot promise that. Each office checks your case and makes the choice."],
              ["What happens when the numbers change?", "We send buyers the 2027 guide when the yearly numbers change."],
              ["What if I do not like it?", "Reply to your receipt within 30 days. We will refund you."],
            ].map(([question, answer]) => <details key={question} className="py-4"><summary className="cursor-pointer text-lg font-extrabold">{question}</summary><p className="mt-3 text-base leading-7 text-slate-700">{answer}</p></details>)}
          </div>
        </section>
      </main>

      <BenefitsChecklistCheckout attribution={attribution} statePacksReady={statePacksReady} />

      <footer className="border-t border-slate-200 bg-white px-4 py-10">
        <p className="mx-auto max-w-[820px] text-sm leading-6 text-slate-600">RetireShield is not part of the government. Social Security, Medicare, the VA, and the IRS do not endorse us. Each program is free to apply for. This is a guide, not financial, legal, or tax advice. Each office decides who gets help. Facts were checked in September 2026.</p>
      </footer>

      <div className="fixed inset-x-0 bottom-0 z-50 border-t border-slate-200 bg-white/95 p-3 shadow-[0_-4px_18px_rgba(0,0,0,.14)] sm:hidden">
        <a href="#secure-checkout" className="block rounded-lg bg-[#167A4A] px-4 py-3 text-center text-lg font-extrabold text-white no-underline">Get the guide — $47</a>
      </div>
    </div>
  );
}
