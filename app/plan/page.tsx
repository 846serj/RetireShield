import Link from "next/link";
import { redirect } from "next/navigation";
import { runProjection } from "@/lib/engine/projection";
import type { FinancialProfile } from "@/lib/engine/types";
import { createClient } from "@/lib/supabase/server";

function dollars(value: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(value);
}

function BalanceChart({ points }: { points: { age: number; total: number }[] }) {
  const width = 720;
  const height = 260;
  const max = Math.max(1, ...points.map((p) => p.total));
  const step = points.length > 1 ? width / (points.length - 1) : width;
  const d = points.map((p, i) => `${i === 0 ? "M" : "L"} ${i * step} ${height - (p.total / max) * (height - 20) - 10}`).join(" ");
  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="h-72 w-full rounded-3xl bg-white p-4 shadow-sm" role="img" aria-label="Projected balance over time">
      <line x1="0" y1={height - 10} x2={width} y2={height - 10} stroke="#cbd5e1" strokeWidth="2" />
      <path d={d} fill="none" stroke="#2563eb" strokeWidth="5" strokeLinecap="round" />
      {points.filter((_, i) => i % Math.ceil(points.length / 6) === 0).map((p, i) => (
        <text key={i} x={Math.min(width - 36, points.indexOf(p) * step)} y={height - 2} className="fill-slate-500 text-xs">{p.age}</text>
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

  const projection = runProjection(profile as FinancialProfile);
  const last = projection.years.at(-1);
  const statusText = projection.depletionAge === null
    ? `Your money lasts to age ${profile.planning_horizon_age}`
    : `Your money may run short around age ${projection.depletionAge}`;

  return (
    <main className="mx-auto max-w-5xl px-4 py-8 sm:py-12">
      <div className="mb-6 rounded-3xl bg-ink p-6 text-white sm:p-8">
        <p className="text-sm font-bold uppercase tracking-wide text-blue-200">Deterministic projection</p>
        <h1 className="mt-2 text-4xl font-extrabold leading-tight sm:text-5xl">{statusText}</h1>
        <p className="mt-3 text-lg text-slate-200">This baseline uses fixed 2026 tax parameters, your saved Phase A profile, and a single expected-return path.</p>
      </div>

      <section className="mb-6 rounded-3xl border-2 border-slate-200 bg-slate-50 p-5 sm:p-7">
        <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-2xl font-extrabold">Balance over time</h2>
            <p className="text-slate-600">Ending projected balance: {dollars(last?.endBalances.total ?? 0)}</p>
          </div>
          <Link href="/plan/setup" className="font-bold text-brand underline">Edit profile</Link>
        </div>
        <BalanceChart points={projection.years.map((row) => ({ age: row.age, total: row.endBalances.total }))} />
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
