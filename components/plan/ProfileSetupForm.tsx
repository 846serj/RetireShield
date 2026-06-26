"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { US_STATES } from "@/lib/usStates";
import { FINANCIAL_PROFILE_DEFAULTS, type FinancialProfile } from "@/lib/engine/types";
import type { Answers } from "@/lib/scoring";

type ProfileDraft = Partial<FinancialProfile> & { age?: number | null };

type Field = keyof ProfileDraft;

type Step = {
  title: string;
  eyebrow: string;
  helper: string;
  fields: Field[];
  optional?: boolean;
};

const STEPS: Step[] = [
  {
    eyebrow: "Essentials",
    title: "First, your age and home state",
    helper: "This keeps the plan anchored to the right timeline and state rules.",
    fields: ["age", "target_retirement_age", "state"],
  },
  {
    eyebrow: "Essentials",
    title: "What have you saved so far?",
    helper: "Round numbers are fine. You can split the total across account types.",
    fields: ["balance_taxable", "balance_tax_deferred", "balance_roth"],
  },
  {
    eyebrow: "Essentials",
    title: "How is it invested?",
    helper: "Use your best estimate. The three boxes should add to about 100%.",
    fields: ["stock_pct", "bond_pct", "cash_pct"],
  },
  {
    eyebrow: "Essentials",
    title: "Social Security and spending",
    helper: "Add your monthly Social Security estimate and what you spend each month.",
    fields: ["ss_benefit_fra", "ss_claim_age", "spending_essential_monthly", "spending_discretionary_monthly"],
  },
  {
    eyebrow: "Improve your plan",
    title: "Optional household details",
    helper: "These improve survivor, tax, and income timing assumptions later.",
    fields: ["marital_status", "spouse_birthdate", "spouse_ss_benefit_fra", "spouse_ss_claim_age"],
    optional: true,
  },
  {
    eyebrow: "Improve your plan",
    title: "Optional pension and assumptions",
    helper: "Skip anything that does not apply. Defaults are already filled in.",
    fields: ["pension_amount", "pension_start_age", "pension_has_cola", "pension_survivor_pct", "inflation_assumption", "planning_horizon_age"],
    optional: true,
  },
];


const SUBMITTED_PROFILE_FIELDS = [
  "birthdate",
  "marital_status",
  "spouse_birthdate",
  "state",
  "balance_taxable",
  "taxable_cost_basis",
  "balance_tax_deferred",
  "balance_roth",
  "stock_pct",
  "bond_pct",
  "cash_pct",
  "ss_benefit_fra",
  "ss_claim_age",
  "spouse_ss_benefit_fra",
  "spouse_ss_claim_age",
  "pension_amount",
  "pension_start_age",
  "pension_has_cola",
  "pension_survivor_pct",
  "spending_essential_monthly",
  "spending_discretionary_monthly",
  "inflation_assumption",
  "target_retirement_age",
  "planning_horizon_age",
] as const satisfies readonly (keyof FinancialProfile)[];

function profilePayload(draft: ProfileDraft) {
  const payload: Record<string, unknown> = {};
  for (const field of SUBMITTED_PROFILE_FIELDS) payload[field] = draft[field] ?? null;
  payload.inflation_assumption = draft.inflation_assumption ?? FINANCIAL_PROFILE_DEFAULTS.inflation_assumption;
  payload.planning_horizon_age = draft.planning_horizon_age ?? FINANCIAL_PROFILE_DEFAULTS.planning_horizon_age;
  return payload;
}

const ESSENTIAL_FIELDS: Field[] = [
  "age",
  "state",
  "balance_taxable",
  "balance_tax_deferred",
  "balance_roth",
  "stock_pct",
  "bond_pct",
  "cash_pct",
  "ss_benefit_fra",
  "spending_essential_monthly",
  "spending_discretionary_monthly",
];

function savingsBucketToBalance(bucket?: string | number) {
  switch (bucket) {
    case "<50k": return 25000;
    case "50-150k": return 100000;
    case "150-500k": return 325000;
    case "500k-1M": return 750000;
    case "1M+": return 1250000;
    default: return undefined;
  }
}

function birthdateFromAge(age?: number | null) {
  if (!age) return null;
  const currentYear = new Date().getFullYear();
  return `${currentYear - age}-07-01`;
}

function ageFromBirthdate(birthdate?: string | null) {
  if (!birthdate) return null;
  const year = Number(birthdate.slice(0, 4));
  return Number.isFinite(year) ? new Date().getFullYear() - year : null;
}

function initialDraft(profile: Partial<FinancialProfile> | null, quizAnswers: Answers | null): ProfileDraft {
  const quizBalance = Number(quizAnswers?.savings ?? 0) || savingsBucketToBalance(quizAnswers?.savingsBucket);
  const stockPct = quizAnswers?.stockPct !== undefined || profile?.stock_pct !== undefined ? Number(quizAnswers?.stockPct ?? profile?.stock_pct) : null;
  return {
    ...profile,
    age: ageFromBirthdate(profile?.birthdate) ?? (Number(quizAnswers?.age ?? "") || null),
    birthdate: profile?.birthdate ?? birthdateFromAge(Number(quizAnswers?.age ?? "")),
    state: profile?.state ?? quizAnswers?.state ?? null,
    balance_taxable: profile?.balance_taxable ?? null,
    balance_tax_deferred: profile?.balance_tax_deferred ?? quizBalance ?? null,
    balance_roth: profile?.balance_roth ?? null,
    stock_pct: stockPct,
    bond_pct: profile?.bond_pct ?? (stockPct !== null ? Math.max(0, 100 - stockPct - 10) : null),
    cash_pct: profile?.cash_pct ?? (stockPct !== null ? 10 : null),
    ss_benefit_fra: profile?.ss_benefit_fra ?? (quizAnswers?.guaranteedIncome !== undefined ? Number(quizAnswers.guaranteedIncome) : null),
    ss_claim_age: profile?.ss_claim_age ?? 67,
    spending_essential_monthly: profile?.spending_essential_monthly ?? (quizAnswers?.essentialExpenses !== undefined ? Number(quizAnswers.essentialExpenses) : null),
    spending_discretionary_monthly: profile?.spending_discretionary_monthly ?? null,
    inflation_assumption: profile?.inflation_assumption ?? FINANCIAL_PROFILE_DEFAULTS.inflation_assumption,
    planning_horizon_age: profile?.planning_horizon_age ?? FINANCIAL_PROFILE_DEFAULTS.planning_horizon_age,
    pension_has_cola: profile?.pension_has_cola ?? false,
  };
}

export default function ProfileSetupForm({
  initialProfile,
  quizAnswers,
}: {
  initialProfile: Partial<FinancialProfile> | null;
  quizAnswers: Answers | null;
}) {
  const [stepIndex, setStepIndex] = useState(0);
  const [draft, setDraft] = useState<ProfileDraft>(() => initialDraft(initialProfile, quizAnswers));
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const step = STEPS[stepIndex];
  const completeness = useMemo(() => {
    const filled = ESSENTIAL_FIELDS.filter((field) => {
      const value = draft[field];
      return value !== null && value !== undefined && value !== "";
    }).length;
    return Math.round((filled / ESSENTIAL_FIELDS.length) * 100);
  }, [draft]);

  function setField(field: Field, value: string | number | boolean | null) {
    setDraft((current) => {
      const next = { ...current, [field]: value };
      if (field === "age") next.birthdate = birthdateFromAge(Number(value));
      return next;
    });
    setStatus("idle");
  }

  async function saveProfile() {
    setStatus("saving");
    const profile = profilePayload(draft);
    const res = await fetch("/api/profile", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(profile),
    });
    setStatus(res.ok ? "saved" : "error");
  }

  return (
    <main className="mx-auto max-w-3xl px-4 py-6 sm:py-8">
      <div className="mb-4 rounded-2xl bg-ink p-5 text-white sm:p-7">
        <p className="text-sm font-bold uppercase tracking-wide text-blue-200">Plan setup</p>
        <h1 className="mt-2 text-2xl font-extrabold leading-tight sm:text-3xl">Build your RetireShield profile</h1>
        <p className="mt-3 text-lg text-slate-200">Start with the essentials; add details anytime.</p>
      </div>

      <div className="mb-4 rounded-2xl border-2 border-slate-200 p-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="text-sm font-bold text-slate-500">Profile completeness</div>
            <div className="text-2xl font-extrabold">{completeness}%</div>
          </div>
          <button
            onClick={saveProfile}
            disabled={status === "saving"}
            className="rounded-2xl bg-brand px-5 py-3 text-lg font-bold text-white disabled:opacity-50"
          >
            {status === "saving" ? "Saving…" : "Build my plan"}
          </button>
        </div>
        <div className="mt-3 h-4 rounded-full bg-slate-200">
          <div className="h-4 rounded-full bg-brand" style={{ width: `${completeness}%` }} />
        </div>
        {status === "saved" && <p className="mt-3 text-sm font-semibold text-good">Saved. Projection math comes next.</p>}
        {status === "error" && <p className="mt-3 text-sm font-semibold text-bad">We could not save your profile. Please try again.</p>}
      </div>

      <section className="rounded-2xl border-2 border-slate-200 p-4 sm:p-5">
        <div className="mb-5">
          <div className="text-sm font-bold uppercase tracking-wide text-brand">{step.eyebrow}</div>
          <h2 className="mt-1 text-2xl font-extrabold leading-tight">{step.title}</h2>
          <p className="mt-2 text-lg text-slate-600">{step.helper}</p>
          {step.optional && <p className="mt-2 inline-block rounded-full bg-blue-50 px-3 py-1 text-sm font-bold text-brand">Optional — improve your plan</p>}
        </div>

        <div className="grid gap-4">
          {step.fields.map((field) => (
            <ProfileField key={field} field={field} value={draft[field]} onChange={setField} />
          ))}
        </div>

        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <button
            onClick={() => setStepIndex((i) => Math.max(0, i - 1))}
            disabled={stepIndex === 0}
            className="rounded-xl border-2 border-slate-300 px-6 py-3 text-lg font-bold disabled:opacity-40"
          >
            Back
          </button>
          <div className="text-center text-sm text-slate-500">Step {stepIndex + 1} of {STEPS.length}</div>
          {stepIndex < STEPS.length - 1 ? (
            <button onClick={() => setStepIndex((i) => i + 1)} className="rounded-xl bg-brand px-6 py-3 text-lg font-bold text-white">
              Continue
            </button>
          ) : (
            <button onClick={saveProfile} className="rounded-xl bg-brand px-6 py-3 text-lg font-bold text-white">Save profile</button>
          )}
        </div>
      </section>

      <div className="mt-6 text-center">
        <Link href="/score" className="text-brand underline">Return to dashboard</Link>
      </div>
    </main>
  );
}

function ProfileField({ field, value, onChange }: { field: Field; value: unknown; onChange: (field: Field, value: string | number | boolean | null) => void }) {
  const label = LABELS[field] ?? String(field);
  if (field === "state") {
    return <label className="grid gap-2 text-lg font-bold">{label}<select value={(value as string) ?? ""} onChange={(e) => onChange(field, e.target.value || null)} className="rounded-2xl border-2 border-slate-300 px-4 py-4 text-xl font-normal"><option value="">Select state…</option>{US_STATES.map((s) => <option key={s.code} value={s.code}>{s.name}</option>)}</select></label>;
  }
  if (field === "marital_status") {
    return <label className="grid gap-2 text-lg font-bold">{label}<select value={(value as string) ?? ""} onChange={(e) => onChange(field, e.target.value || null)} className="rounded-2xl border-2 border-slate-300 px-4 py-4 text-xl font-normal"><option value="">Prefer not to say</option><option value="single">Single</option><option value="married">Married</option><option value="partnered">Partnered</option><option value="widowed">Widowed</option><option value="divorced">Divorced</option></select></label>;
  }
  if (field === "pension_has_cola") {
    return <label className="flex items-center gap-3 rounded-2xl border-2 border-slate-200 p-4 text-lg font-bold"><input type="checkbox" checked={Boolean(value)} onChange={(e) => onChange(field, e.target.checked)} className="h-6 w-6" />{label}</label>;
  }
  const isDate = field === "spouse_birthdate";
  return <label className="grid gap-2 text-lg font-bold">{label}<input type={isDate ? "date" : "number"} inputMode={isDate ? undefined : "decimal"} value={(value as string | number | null) ?? ""} onChange={(e) => onChange(field, e.target.value === "" ? null : isDate ? e.target.value : Number(e.target.value))} className="rounded-2xl border-2 border-slate-300 px-4 py-4 text-xl font-normal" /></label>;
}

const LABELS: Partial<Record<Field, string>> = {
  age: "Your age",
  target_retirement_age: "Target retirement age",
  state: "State",
  balance_taxable: "Taxable savings ($)",
  balance_tax_deferred: "IRA / 401(k) / tax-deferred ($)",
  balance_roth: "Roth savings ($)",
  stock_pct: "Stocks (%)",
  bond_pct: "Bonds (%)",
  cash_pct: "Cash (%)",
  ss_benefit_fra: "Your Social Security estimate at full retirement age ($/mo)",
  ss_claim_age: "Planned Social Security claim age",
  spending_essential_monthly: "Essential monthly spending ($)",
  spending_discretionary_monthly: "Discretionary monthly spending ($)",
  marital_status: "Marital status",
  spouse_birthdate: "Spouse birthdate",
  spouse_ss_benefit_fra: "Spouse Social Security at full retirement age ($/mo)",
  spouse_ss_claim_age: "Spouse claim age",
  pension_amount: "Pension amount ($/mo)",
  pension_start_age: "Pension start age",
  pension_has_cola: "Pension has cost-of-living increases",
  pension_survivor_pct: "Pension survivor percent (%)",
  inflation_assumption: "Inflation assumption (0.03 = 3%)",
  planning_horizon_age: "Planning horizon age",
};
