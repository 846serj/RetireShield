import Link from "next/link";
import { redirect } from "next/navigation";
import { runMonteCarlo } from "@/lib/engine/montecarlo";
import { runProjection } from "@/lib/engine/projection";
import type { FinancialProfile } from "@/lib/engine/types";
import { createClient } from "@/lib/supabase/server";

function dollars(value: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(value);
}

function BalanceChart({ points, bands }: { points: { age: number; total: number }[]; bands: { age: number; p10: number; p50: number; p90: number }[] }) {
  const width = 720;
  const height = 260;
  const allValues = [...points.map((p) => p.total), ...bands.flatMap((p) => [p.p10, p.p50, p.p90])];
  const max = Math.max(1, ...allValues);
  const step = points.length > 1 ? width / (points.length - 1) : width;
  const y = (value: number) => height - (Math.max(0, value) / max) * (height - 20) - 10;
  const linePath = (values: number[]) => values.map((value, i) => `${i === 0 ? "M" : "L"} ${i * step} ${y(value)}`).join(" ");
  const bandPath = bands.length > 0
    ? `${bands.map((p, i) => `${i === 0 ? "M" : "L"} ${i * step} ${y(p.p90)}`).join(" ")} ${[...bands].reverse().map((p, i) => `L ${(bands.length - 1 - i) * step} ${y(p.p10)}`).join(" ")} Z`
    : "";
  const deterministic = linePath(points.map((p) => p.total));
  const median = linePath(bands.map((p) => p.p50));
  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="h-72 w-full rounded-3xl bg-white p-4 shadow-sm" role="img" aria-label="Projected balance over time with Monte Carlo percentile bands">
      <line x1="0" y1={height - 10} x2={width} y2={height - 10} stroke="#cbd5e1" strokeWidth="2" />
      {bandPath ? <path d={bandPath} fill="#bfdbfe" opacity="0.65" /> : null}
      {median ? <path d={median} fill="none" stroke="#0f766e" strokeWidth="4" strokeLinecap="round" strokeDasharray="8 8" /> : null}
      <path d={deterministic} fill="none" stroke="#2563eb" strokeWidth="5" strokeLinecap="round" />
      {points.filter((_, i) => i % Math.ceil(points.length / 6) === 0).map((p) => (
        <text key={p.age} x={Math.min(width - 36, points.findIndex((point) => point.age === p.age) * step)} y={height - 2} className="fill-slate-500 text-xs">{p.age}</text>
      ))}
    </svg>
  );
}

export default async function PlanPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase.from("profiles").select("*").eq("user_id", user.id).maybeSingle();
  if (!profile) redirect("/plan/setup");

  const typedProfile = profile as FinancialProfile;
  const projection = runProjection(typedProfile);
  const monteCarlo = runMonteCarlo(typedProfile, 1000, { seed: user.id });
  const last = projection.years.at(-1);
  const successPct = Math.round(monteCarlo.probabilityOfSuccess * 100);
  const statusText = projection.depletionAge === null
    ? `Your money lasts to age ${profile.planning_horizon_age}`
    : `Your money may run short around age ${projection.depletionAge}`;

  return (
    <main className="mx-auto max-w-5xl px-4 py-8 sm:py-12">
      <div className="mb-6 rounded-3xl bg-ink p-6 text-white sm:p-8">
        <p className="text-sm font-bold uppercase tracking-wide text-blue-200">Deterministic projection</p>
        <h1 className="mt-2 text-4xl font-extrabold leading-tight sm:text-5xl">{statusText}</h1>
        <p className="mt-3 text-lg text-slate-200">This baseline uses fixed 2026 tax parameters, your saved Phase A profile, and a single expected-return path.</p>
        <div className="mt-6 max-w-md rounded-2xl bg-white/10 p-4">
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="text-sm font-bold uppercase tracking-wide text-blue-200">Probability of success</p>
              <p className="text-5xl font-extrabold">{successPct}%</p>
            </div>
            <p className="text-sm text-slate-200">Based on {monteCarlo.runs.toLocaleString()} seeded Monte Carlo return paths.</p>
          </div>
          <div className="mt-4 h-4 overflow-hidden rounded-full bg-white/20" aria-label={`Probability of success ${successPct}%`}>
            <div className="h-full rounded-full bg-emerald-400" style={{ width: `${successPct}%` }} />
          </div>
        </div>
      </div>

      <section className="mb-6 rounded-3xl border-2 border-slate-200 bg-slate-50 p-5 sm:p-7">
        <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-2xl font-extrabold">Balance over time</h2>
            <p className="text-slate-600">Ending projected balance: {dollars(last?.endBalances.total ?? 0)}. Shaded band shows 10th–90th percentile Monte Carlo outcomes; dashed line is median.</p>
          </div>
          <Link href="/plan/setup" className="font-bold text-brand underline">Edit profile</Link>
        </div>
        <BalanceChart points={projection.years.map((row) => ({ age: row.age, total: row.endBalances.total }))} bands={monteCarlo.paths} />
      </section>

      <section className="overflow-hidden rounded-3xl border-2 border-slate-200 bg-white">
        <div className="grid grid-cols-5 gap-2 bg-slate-100 p-4 text-sm font-bold text-slate-600">
          <div>Age</div><div>Income</div><div>Spending</div><div>Taxes</div><div>End balance</div>
        </div>
        <div className="divide-y divide-slate-100">
          {projection.years.filter((_, i) => i % 5 === 0 || i === projection.years.length - 1).map((row) => (
            <div key={row.age} className="grid grid-cols-5 gap-2 p-4 text-sm sm:text-base">
              <div className="font-bold">{row.age}</div><div>{dollars(row.income)}</div><div>{dollars(row.spending)}</div><div>{dollars(row.taxes)}</div><div>{dollars(row.endBalances.total)}</div>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
