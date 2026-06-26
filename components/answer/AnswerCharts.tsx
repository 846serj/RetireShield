"use client";

import type { ReactNode } from "react";
import { ScoreGauge } from "@/components/ScoreGauge";
import DecisionCard from "@/components/DecisionCard";
import type { CalculationTrace } from "@/lib/ai/coachNumbers";

function asRecord(value: unknown): Record<string, unknown> { return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {}; }
function num(value: unknown): number | null { const n = Number(value); return Number.isFinite(n) ? n : null; }
function money(value: unknown) { const n = num(value); return n === null ? "—" : new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n); }
function compactMoney(value: number) { return new Intl.NumberFormat("en-US", { notation: "compact", style: "currency", currency: "USD", maximumFractionDigits: 1 }).format(value); }

function ChartShell({ title, subtitle, children }: { title: string; subtitle: string; children: ReactNode }) {
  return <section className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-xl shadow-brand/10 sm:p-6"><p className="rg-kicker">Engine visual</p><h2 className="mt-2 text-3xl sm:text-4xl">{title}</h2><p className="mt-2 text-lg font-semibold text-slate-700">{subtitle}</p><div className="mt-5">{children}</div></section>;
}

export function BalanceChart({ calculation }: { calculation: CalculationTrace }) {
  const out = asRecord(calculation.outputs);
  const points = (Array.isArray(out.chartYears) ? out.chartYears : Array.isArray(out.sampleYears) ? out.sampleYears : []).map((row) => {
    const record = asRecord(row);
    const balances = asRecord(record.endBalances);
    return { year: num(record.year), age: num(record.age), balance: num(record.balance) ?? num(record.totalBalance) ?? num(balances.total) };
  }).filter((p) => p.year !== null && p.age !== null && p.balance !== null) as { year: number; age: number; balance: number }[];
  if (points.length < 2) return null;
  const width = 760, height = 300, pad = 42;
  const maxBalance = Math.max(...points.map((p) => p.balance), 1);
  const minYear = points[0].year, maxYear = points.at(-1)!.year;
  const x = (year: number) => pad + ((year - minYear) / Math.max(1, maxYear - minYear)) * (width - pad * 2);
  const y = (balance: number) => pad + (1 - balance / maxBalance) * (height - pad * 2);
  const path = points.map((p, i) => `${i ? "L" : "M"} ${x(p.year).toFixed(1)} ${y(p.balance).toFixed(1)}`).join(" ");
  const depletionAge = num(out.depletionAge);
  return <ChartShell title="Money over time" subtitle={`Projection from age ${points[0].age} to ${points.at(-1)!.age}. Depletion age: ${depletionAge ?? "not within horizon"}.`}><svg viewBox={`0 0 ${width} ${height}`} className="h-auto w-full overflow-visible" role="img" aria-label="Projected portfolio balance over time"><rect x={pad} y={pad} width={width - pad * 2} height={height - pad * 2} rx="18" fill="#ECFDF5"/><path d={path} fill="none" stroke="#1D6F78" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round"/><line x1={pad} x2={width-pad} y1={height-pad} y2={height-pad} stroke="#CBD5E1" strokeWidth="2"/><text x={pad} y="24" className="fill-slate-600 text-sm font-bold">{compactMoney(maxBalance)}</text><text x={pad} y={height-10} className="fill-slate-600 text-sm font-bold">{minYear}</text><text x={width-pad-36} y={height-10} className="fill-slate-600 text-sm font-bold">{maxYear}</text>{points.map((p, i) => i % Math.ceil(points.length / 5) === 0 ? <circle key={p.year} cx={x(p.year)} cy={y(p.balance)} r="5" fill="#0F766E"><title>{p.year}: {money(p.balance)}</title></circle> : null)}</svg><div className="mt-4 grid gap-3 sm:grid-cols-3"><Metric label="Starting balance" value={money(points[0].balance)} /><Metric label="Ending balance" value={money(points.at(-1)!.balance)} /><Metric label="Okay zone" value="Above $0" /></div></ChartShell>;
}

function Metric({ label, value }: { label: string; value: string }) { return <div className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200"><p className="text-sm font-bold text-slate-500">{label}</p><p className="mt-1 text-2xl font-extrabold text-ink">{value}</p></div>; }

export function ClaimCompare({ calculation }: { calculation: CalculationTrace }) {
  const out = asRecord(calculation.outputs);
  const strategies = (Array.isArray(out.chartStrategies) ? out.chartStrategies : Array.isArray(out.strategies) ? out.strategies : []).map(asRecord).filter((s) => [62, 67, 70].includes(num(s.claimAge) ?? -1));
  if (!strategies.length) return null;
  const max = Math.max(...strategies.map((s) => num(s.householdMonthlyBenefit) ?? 0), 1);
  const be = (Array.isArray(out.breakEvenAges) ? out.breakEvenAges : []).map(asRecord).find((b) => num(b.earlierClaimAge) === 67 && num(b.laterClaimAge) === 70) ?? (Array.isArray(out.breakEvenAges) ? out.breakEvenAges.map(asRecord).find((b) => num(b.laterClaimAge) === 70) : undefined);
  return <ChartShell title="Social Security claiming comparison" subtitle="Monthly household benefit by claim age, using the engine comparison."><div className="space-y-4">{strategies.map((s) => { const benefit = num(s.householdMonthlyBenefit) ?? 0; return <div key={String(s.claimAge)}><div className="mb-2 flex items-end justify-between gap-3"><span className="text-xl font-extrabold">Claim at {String(s.claimAge)}</span><span className="text-2xl font-extrabold text-brand">{money(benefit)}/mo</span></div><div className="h-12 rounded-full bg-slate-100"><div className="flex h-12 items-center rounded-full bg-brand px-4 text-lg font-extrabold text-white motion-safe:transition-all" style={{ width: `${Math.max(8, benefit / max * 100)}%` }}>{num(s.successRate) !== null ? `${Math.round((num(s.successRate) ?? 0) * 100)}% success` : ""}</div></div></div>; })}</div>{be ? <p className="mt-5 rounded-2xl bg-band p-4 text-xl font-extrabold text-ink">Break-even: claim age {String(be.laterClaimAge)} catches age {String(be.earlierClaimAge)} at age {num(be.breakEvenAge) ?? "—"}.</p> : null}</ChartShell>;
}

export function IrmaaStairs({ calculation }: { calculation: CalculationTrace }) {
  const out = asRecord(calculation.outputs);
  const brackets = (Array.isArray(out.brackets) ? out.brackets : []).map(asRecord);
  const magi = num(out.magi ?? asRecord(calculation.inputs).magi);
  if (!brackets.length || magi === null) return null;
  const finiteMax = Math.max(...brackets.map((b) => num(b.upTo)).filter((v): v is number => v !== null && Number.isFinite(v)), magi);
  return <ChartShell title="Medicare IRMAA staircase" subtitle={`Your marker is placed at MAGI ${money(magi)} using the engine's IRMAA output.`}><div className="space-y-2">{brackets.map((b, i) => { const upTo = num(b.upTo); const surcharge = num(b.annualSurcharge) ?? 0; const active = magi <= (upTo ?? Infinity) && (i === 0 || magi > (num(brackets[i-1].upTo) ?? 0)); return <div key={i} className={`relative rounded-2xl border p-4 ${active ? "border-brand bg-band" : "border-slate-200 bg-white"}`}><div className="flex items-center justify-between gap-3"><span className="text-lg font-extrabold">{i === 0 ? "$0" : money((num(brackets[i-1].upTo) ?? 0) + 1)}–{upTo === null || !Number.isFinite(upTo) ? "above" : money(upTo)}</span><span className="text-xl font-extrabold text-ink">{money(surcharge)}/yr</span></div><div className="mt-3 h-3 rounded-full bg-slate-100"><div className="h-3 rounded-full bg-brand" style={{ width: `${Math.min(100, ((upTo ?? finiteMax) / finiteMax) * 100)}%` }} /></div>{active ? <p className="mt-3 text-lg font-extrabold text-brand">You are here: {money(magi)}</p> : null}</div>; })}</div></ChartShell>;
}

export function AnswerRenderer({ result }: { result: { answer: string; calculations?: CalculationTrace[] } }) {
  const last = result.calculations?.at(-1);
  let visual: ReactNode = null;
  if (last?.tool === "project_depletion") visual = <BalanceChart calculation={last} />;
  else if (last?.tool === "compare_ss_claiming") visual = <ClaimCompare calculation={last} />;
  else if (last?.tool === "irmaa_for_income") visual = <IrmaaStairs calculation={last} />;
  else if (last?.tool === "compute_safety_score") { const score = asRecord(asRecord(last.outputs).score); visual = <ScoreGauge value={num(score.overall) ?? undefined} band={String(score.band ?? "") as never} subScores={[]} subtitle="From coach calculation" badge="Tool-backed" />; }
  else if (last?.tool === "analyze_affordability") visual = <DecisionCard result={asRecord(last.outputs) as never} />;
  return <div className="grid gap-6 xl:grid-cols-[minmax(0,1.1fr)_minmax(360px,0.9fr)] xl:items-start">{visual ? <div>{visual}</div> : null}<div><p className="rg-kicker">Coach answer</p><div className="mt-3 whitespace-pre-wrap text-xl leading-8 text-ink sm:text-2xl sm:leading-10">{result.answer}</div></div></div>;
}
