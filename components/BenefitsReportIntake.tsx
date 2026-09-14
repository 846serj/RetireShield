"use client";

import { useState } from "react";
import { CheckCircle2, ChevronLeft, ChevronRight, ShieldCheck } from "lucide-react";
import { US_STATES } from "@/lib/usStates";

type Answer = string | boolean;
type Answers = Record<string, Answer>;
type Field = { key: string; label: string; type?: "text" | "number" | "money" | "textarea" | "select" | "check"; options?: string[]; help?: string };

const steps: { title: string; note: string; fields: Field[] }[] = [
  {
    title: "About you",
    note: "Tell us where you live and who is in your home.",
    fields: [
      { key: "state", label: "State", type: "select", options: US_STATES.map((item) => `${item.code}|${item.name}`) },
      { key: "age", label: "Your age", type: "number" },
      { key: "marital", label: "Marital status", type: "select", options: ["single|Single", "married|Married", "widowed|Widowed", "divorced|Divorced", "partnered|Partnered"] },
      { key: "household_size", label: "How many people live in the home?", type: "number" },
      { key: "housing", label: "Do you own or rent?", type: "select", options: ["own|Own", "rent|Rent", "other|Other"] },
      { key: "medicare_a", label: "I have Medicare Part A", type: "check" },
      { key: "medicare_b", label: "I have Medicare Part B", type: "check" },
      { key: "medicare_d", label: "I have Medicare Part D", type: "check" },
    ],
  },
  {
    title: "Money each month",
    note: "Use the amount before Medicare comes out. A best guess is fine.",
    fields: [
      { key: "ss_gross", label: "Social Security before Medicare", type: "money" },
      { key: "pension", label: "Pension", type: "money" },
      { key: "annuity", label: "Annuity", type: "money" },
      { key: "wages", label: "Pay from work", type: "money" },
      { key: "va_income", label: "VA pay", type: "money" },
      { key: "interest", label: "Interest or dividends", type: "money" },
      { key: "other_income", label: "Other income", type: "money" },
      { key: "unsure_income", label: "Some income numbers are a guess", type: "check" },
    ],
  },
  {
    title: "Money you have",
    note: "Do not count your main home, one car, home goods, or a burial plot.",
    fields: [
      { key: "checking_savings", label: "Checking and savings", type: "money" },
      { key: "cds", label: "CDs", type: "money" },
      { key: "stocks_bonds", label: "Stocks and bonds", type: "money" },
      { key: "second_property", label: "A second home or land", type: "money" },
      { key: "unsure_savings", label: "Some savings numbers are a guess", type: "check" },
    ],
  },
  {
    title: "Home costs",
    note: "Use what you pay. Skip any box you do not know.",
    fields: [
      { key: "rent_or_mortgage", label: "Rent or home loan each month", type: "money" },
      { key: "property_tax_year", label: "Property tax each year", type: "money" },
      { key: "home_insurance_year", label: "Home insurance each year", type: "money" },
      { key: "heat_cool_monthly", label: "Heat and cooling each month", type: "money" },
      { key: "utilities_in_rent", label: "Heat and cooling are part of my rent", type: "check" },
      { key: "shutoff_notice", label: "I have a shut-off notice now", type: "check" },
    ],
  },
  {
    title: "Health costs each month",
    note: "These costs can change the answer for some programs.",
    fields: [
      { key: "med_premiums", label: "Health plan costs besides Medicare", type: "money" },
      { key: "med_prescriptions", label: "Medicine", type: "money" },
      { key: "med_doctor_dental", label: "Doctor, dentist, or hospital", type: "money" },
      { key: "med_otc", label: "Over-the-counter medicine", type: "money" },
      { key: "med_devices", label: "Glasses, hearing aids, or dentures", type: "money" },
      { key: "med_transport", label: "Rides to care", type: "money" },
      { key: "med_home_care", label: "Help at home", type: "money" },
      { key: "med_facility", label: "Care home costs", type: "money" },
      { key: "unsure_medical", label: "Some health costs are a guess", type: "check" },
    ],
  },
  {
    title: "Service and help you get",
    note: "This keeps us from telling you to apply for help you already have.",
    fields: [
      { key: "veteran", label: "Veteran status", type: "select", options: ["no|No", "veteran|I am a veteran", "spouse|I am the spouse or widow of a veteran"] },
      { key: "service_era", label: "War-time service dates, if known", type: "text" },
      { key: "paying_for_care", label: "I pay for help at home or in a care home", type: "check" },
      { key: "needs_help_daily", label: "I need help with daily tasks", type: "check" },
      { key: "has_snap", label: "I get SNAP", type: "check" },
      { key: "has_liheap", label: "I get heat or cooling help", type: "check" },
      { key: "has_ssi", label: "I get SSI", type: "check" },
      { key: "has_va", label: "I get VA benefits", type: "check" },
      { key: "has_medicaid", label: "I get Medicaid", type: "check" },
      { key: "has_extra_help", label: "I get Extra Help", type: "check" },
    ],
  },
  {
    title: "Last notes",
    note: "These boxes are not required.",
    fields: [
      { key: "other_states", label: "Other states where you lived or worked", type: "textarea" },
      { key: "former_names", label: "Old names we should check", type: "textarea" },
      { key: "notes", label: "Anything else we should know", type: "textarea" },
    ],
  },
];

export function BenefitsReportIntake({ paymentIntentId, token, initial }: { paymentIntentId: string; token: string; initial: Answers }) {
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Answers>(initial);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  const current = steps[step];

  async function save(complete: boolean) {
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/benefits-report/intake", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ paymentIntentId, token, answers, complete }) });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || "We could not save your answers.");
      if (complete) setDone(true);
      else setStep((value) => Math.min(steps.length - 1, value + 1));
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "We could not save your answers.");
    } finally {
      setBusy(false);
    }
  }

  if (done) return (
    <div className="rounded-xl border-2 border-[#167A4A] bg-[#F1FAF5] p-6 text-center sm:p-10">
      <CheckCircle2 className="mx-auto h-12 w-12 text-[#167A4A]" />
      <h1 className="mt-4 text-3xl font-bold">We have your answers.</h1>
      <p className="mt-4 text-lg leading-8">We will send your report by email in two work days. You can reply to your receipt if you need help.</p>
    </div>
  );

  return (
    <div className="rounded-xl border-2 border-brand-dark bg-white p-5 shadow-xl sm:p-8">
      <div className="flex items-center justify-between gap-4 text-sm font-extrabold text-brand"><span>STEP {step + 1} OF {steps.length}</span><span>{Math.round(((step + 1) / steps.length) * 100)}%</span></div>
      <div className="mt-3 h-2 overflow-hidden rounded bg-slate-200"><div className="h-full bg-[#167A4A]" style={{ width: `${((step + 1) / steps.length) * 100}%` }} /></div>
      <h1 className="mt-6 text-3xl font-bold">{current.title}</h1>
      <p className="mt-2 text-base leading-7 text-slate-600">{current.note}</p>
      {step === 0 && <div className="mt-5 flex gap-3 rounded-lg bg-[#F1F6FA] p-4 text-sm leading-6"><ShieldCheck className="mt-1 h-5 w-5 shrink-0 text-brand" /><p>We never ask for your Social Security number, Medicare number, or bank account number.</p></div>}

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        {current.fields.map((field) => {
          const value = answers[field.key] ?? (field.type === "check" ? false : "");
          if (field.type === "check") return <label key={field.key} className="flex min-h-14 cursor-pointer items-start gap-3 rounded-lg border border-slate-300 p-4"><input type="checkbox" checked={Boolean(value)} onChange={(e) => setAnswers({ ...answers, [field.key]: e.target.checked })} className="mt-1 h-5 w-5 accent-[#167A4A]" /><span className="font-semibold leading-6">{field.label}</span></label>;
          if (field.type === "select") return <label key={field.key} className="grid gap-2 font-bold">{field.label}<select value={String(value)} onChange={(e) => setAnswers({ ...answers, [field.key]: e.target.value })} className="min-h-14 rounded-lg border border-slate-400 bg-white px-3 text-lg font-normal"><option value="">Choose one</option>{field.options?.map((option) => { const [key, label] = option.split("|"); return <option key={key} value={key}>{label}</option>; })}</select></label>;
          if (field.type === "textarea") return <label key={field.key} className="grid gap-2 font-bold sm:col-span-2">{field.label}<textarea rows={3} value={String(value)} onChange={(e) => setAnswers({ ...answers, [field.key]: e.target.value })} className="rounded-lg border border-slate-400 p-3 text-lg font-normal" /></label>;
          return <label key={field.key} className="grid gap-2 font-bold">{field.label}<div className="relative">{field.type === "money" && <span className="absolute left-4 top-1/2 -translate-y-1/2 text-lg text-slate-500">$</span>}<input type={field.type === "number" || field.type === "money" ? "number" : "text"} min="0" inputMode={field.type === "number" || field.type === "money" ? "decimal" : undefined} value={String(value)} onChange={(e) => setAnswers({ ...answers, [field.key]: e.target.value })} className={`min-h-14 w-full rounded-lg border border-slate-400 text-lg font-normal ${field.type === "money" ? "pl-8 pr-3" : "px-3"}`} /></div></label>;
        })}
      </div>

      {error && <p role="alert" className="mt-5 rounded-lg border border-red-300 bg-red-50 p-3 font-semibold text-red-800">{error}</p>}
      <div className="mt-7 flex flex-col-reverse gap-3 sm:flex-row sm:justify-between">
        <button type="button" disabled={step === 0 || busy} onClick={() => setStep((value) => Math.max(0, value - 1))} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-lg border border-brand-dark px-5 font-bold text-brand-dark disabled:opacity-40"><ChevronLeft className="h-4 w-4" />Back</button>
        <button type="button" disabled={busy} onClick={() => save(step === steps.length - 1)} className="inline-flex min-h-14 items-center justify-center gap-2 rounded-lg bg-[#167A4A] px-6 text-lg font-extrabold text-white disabled:opacity-60">{busy ? "Saving…" : step === steps.length - 1 ? "Send my answers" : "Save and keep going"}{step < steps.length - 1 && <ChevronRight className="h-5 w-5" />}</button>
      </div>
      <p className="mt-4 text-center text-sm text-slate-500">Your answers save when you go to the next step.</p>
    </div>
  );
}
