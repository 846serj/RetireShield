import type { PlanItem } from "@/lib/actionPlan";
import { Button } from "@/components/ui";

const PRIORITY_STYLE: Record<PlanItem["priority"], string> = {
  High: "border-red-200 bg-red-50 text-bad",
  Medium: "border-amber-200 bg-amber-50 text-warn",
  Low: "border-slate-200 bg-slate-100 text-slate-600",
};

type PlanListProps = {
  items: PlanItem[];
};

export default function PlanList({ items }: PlanListProps) {
  if (items.length === 0) {
    return (
      <section className="rg-card mb-8">
        <p className="rg-kicker">Action plan</p>
        <h2 className="mt-2 text-3xl font-extrabold">Create your personalized action plan</h2>
        <p className="mt-3 text-slate-700">
          Take the quick Safety Score quiz so RetireShield can turn your answers into education-first next steps.
        </p>
        <Button href="/quiz" className="mt-5">Take the quiz</Button>
      </section>
    );
  }

  return (
    <section className="mb-8" aria-labelledby="action-plan-heading">
      <div className="mb-5 max-w-3xl">
        <p className="rg-kicker">Action plan</p>
        <h2 id="action-plan-heading" className="mt-2 text-3xl font-extrabold">Your prioritized next steps</h2>
        <p className="mt-3 text-slate-700">
          Use these as conversation starters and checklist prompts — not instructions to buy, sell, or change investments.
        </p>
      </div>
      <div className="space-y-4">
        {items.map((item, index) => (
          <article key={`${item.title}-${index}`} className="rg-card">
            <div className="flex flex-wrap items-center gap-3">
              <span className={`rounded-full border px-3 py-1 text-xs font-extrabold uppercase tracking-[0.14em] ${PRIORITY_STYLE[item.priority]}`}>
                {item.priority} priority
              </span>
              <span className="rounded-full bg-brand/10 px-3 py-1 text-xs font-extrabold uppercase tracking-[0.14em] text-brand">
                {item.area}
              </span>
            </div>
            <h3 className="mt-4 font-serif text-2xl font-semibold text-ink">{item.title}</h3>
            <p className="mt-2 text-slate-700">{item.why}</p>
            <div className="mt-5 rounded-2xl bg-slate-50 p-4">
              <p className="text-sm font-extrabold uppercase tracking-[0.14em] text-slate-500">Checklist</p>
              <ul className="mt-3 space-y-3">
                {item.steps.map((step, stepIndex) => (
                  <li key={step} className="flex gap-3 text-slate-700">
                    <span className="mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded border border-brand/30 bg-white text-xs font-bold text-brand" aria-hidden="true">
                      ✓
                    </span>
                    <span className="sr-only">Step {stepIndex + 1}: </span>
                    <span>{step}</span>
                  </li>
                ))}
              </ul>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
