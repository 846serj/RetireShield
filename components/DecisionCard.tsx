import Link from "next/link";
import { ScoreGauge } from "@/components/ScoreGauge";
import type { DecisionResult } from "@/lib/engine/affordability";

type DecisionCardProps = {
  result: Partial<DecisionResult> & { needsProfile?: boolean };
};

const verdictMeta: Record<DecisionResult["verdict"], { label: string; className: string }> = {
  YES: { label: "✅ Yes", className: "border-emerald-200 bg-emerald-50 text-emerald-800" },
  CAUTION: { label: "⚠️ Caution", className: "border-amber-200 bg-amber-50 text-amber-800" },
  NO: { label: "⛔ No", className: "border-red-200 bg-red-50 text-red-800" },
};

function money(value?: number | null) {
  if (!Number.isFinite(Number(value))) return "$0";
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(Number(value));
}

function age(value?: number | null) {
  return Number.isFinite(Number(value)) ? String(Math.round(Number(value))) : "your planning horizon";
}

function scoreLine(score: DecisionResult["score"]) {
  if (!Number.isFinite(Number(score.before)) || !Number.isFinite(Number(score.after))) return "Add your numbers to see the Safety Score impact.";
  return `Safety Score ${Math.round(Number(score.before))} → ${Math.round(Number(score.after))}, stays ${score.band ?? "in range"}`;
}

function RippleSummary({ ripple }: { ripple: DecisionResult["ripple"] }) {
  if (!ripple) return <p className="text-slate-700">No tax-deferred withdrawal ripple was detected for this scenario.</p>;
  const extraTax = Number(ripple.extraOrdinaryTax ?? 0);
  const irmaa = Number(ripple.irmaaIncrease ?? 0);
  const cliff = ripple.distanceToNextIrmaaCliff;
  return (
    <div className="grid gap-3 sm:grid-cols-3">
      <div className="rounded-2xl bg-white p-4 ring-1 ring-slate-200"><p className="text-sm font-bold text-slate-500">Tax ripple</p><p className="mt-1 text-2xl font-extrabold">{money(extraTax)}</p></div>
      <div className="rounded-2xl bg-white p-4 ring-1 ring-slate-200"><p className="text-sm font-bold text-slate-500">Medicare ripple</p><p className="mt-1 text-2xl font-extrabold">{money(irmaa)}</p></div>
      <div className="rounded-2xl bg-white p-4 ring-1 ring-slate-200"><p className="text-sm font-bold text-slate-500">Next IRMAA room</p><p className="mt-1 text-2xl font-extrabold">{cliff === null || cliff === undefined ? "—" : money(Number(cliff))}</p></div>
    </div>
  );
}

export default function DecisionCard({ result }: DecisionCardProps) {
  if (result.needsProfile) {
    return (
      <section className="rg-card border-amber-200 bg-amber-50/70">
        <span className="inline-flex rounded-full border border-amber-200 bg-white px-4 py-2 text-base font-extrabold text-amber-800">⚠️ Needs your numbers</span>
        <h2 className="mt-5 text-4xl sm:text-5xl">Set your numbers first.</h2>
        <p className="mt-4 text-xl text-slate-700">We won&apos;t fabricate an answer without enough profile data to score this decision.</p>
        <div className="mt-6 flex flex-col gap-3 sm:flex-row"><Link className="inline-flex min-h-14 items-center justify-center rounded-xl bg-brand px-6 py-3 text-lg font-bold text-white no-underline" href="/quiz">Take the 2-minute quiz</Link><Link className="inline-flex min-h-14 items-center justify-center rounded-xl border-2 border-brand px-6 py-3 text-lg font-bold no-underline" href="/dashboard/accounts">Connect accounts</Link></div>
      </section>
    );
  }

  const verdict = result.verdict ?? "CAUTION";
  const meta = verdictMeta[verdict];
  const hasPaidDepth = result.ripple !== undefined || result.trace !== undefined || result.alternatives !== undefined;
  const afterScore = Number(result.score?.after ?? result.score?.before ?? 0);

  return (
    <section className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-xl shadow-brand/10">
      <div className="bg-gradient-to-br from-white via-band/40 to-white p-5 sm:p-8">
        <span className={`inline-flex rounded-full border px-4 py-2 text-base font-extrabold ${meta.className}`}>{meta.label}</span>
        <h2 className="mt-5 text-4xl sm:text-6xl">{result.headline ?? "This needs a closer look."}</h2>
        <p className="mt-4 rounded-2xl border border-slate-200 bg-white p-4 text-xl font-bold text-ink">{result.trigger ?? "Add your numbers to check this decision."}</p>
        <div className="mt-6 grid gap-4 lg:grid-cols-[1fr_320px] lg:items-start">
          <div className="space-y-4">
            <p className="text-2xl font-extrabold text-ink">Money lasts to age {age(result.moneyLasts?.afterAge)} <span className="text-slate-500">(was {age(result.moneyLasts?.baselineAge)})</span></p>
            <p className="text-xl font-bold text-slate-700">{result.score ? scoreLine(result.score) : "Add your numbers to see the Safety Score impact."}</p>
            {Number.isFinite(Number(result.safeMax)) ? <p className="rounded-2xl bg-emerald-50 p-4 text-xl font-extrabold text-emerald-800 ring-1 ring-emerald-100">The most you could safely spend here is {money(result.safeMax)}.</p> : null}
          </div>
          {afterScore > 0 ? <ScoreGauge value={afterScore} band={result.score?.band as never} subScores={[]} subtitle="After this decision" badge="Projected" /> : null}
        </div>
      </div>
      <div className="space-y-5 border-t border-slate-200 p-5 sm:p-8">
        {hasPaidDepth ? (
          <div className="rounded-3xl bg-slate-50 p-5 ring-1 ring-slate-200">
            <p className="rg-kicker">Plus depth</p><h3 className="mt-2 text-3xl">Tax-smart way to pay</h3><div className="mt-4"><RippleSummary ripple={result.ripple} /></div>
            {result.alternatives?.length ? <ul className="mt-5 grid gap-2 text-lg font-semibold text-slate-700">{result.alternatives.map((item) => <li key={item}>• {item}</li>)}</ul> : null}
            {result.trace ? <details className="mt-5 rounded-2xl bg-white p-4"><summary className="cursor-pointer text-lg font-extrabold">How this was calculated</summary><pre className="mt-4 max-h-80 overflow-auto whitespace-pre-wrap text-sm text-slate-700">{JSON.stringify(result.trace, null, 2)}</pre></details> : null}
          </div>
        ) : (
          <div className="rounded-3xl border border-brand/20 bg-band p-5"><p className="rg-kicker">Upgrade</p><h3 className="mt-2 text-3xl">See the tax-smart way to pay + save this.</h3><p className="mt-3 text-lg text-slate-700">Plus adds Medicare/tax ripple checks, alternatives, saved recent questions, and the calculation trace.</p><Link href="/upgrade" className="mt-4 inline-flex font-extrabold">Upgrade to see depth →</Link></div>
        )}
        <p className="border-t border-slate-200 pt-5 text-sm font-semibold text-slate-500">Analytical estimate only. Use this as a planning conversation starter before making financial decisions.</p>
      </div>
    </section>
  );
}
