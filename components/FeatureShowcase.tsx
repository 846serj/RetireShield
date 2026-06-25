"use client";

import { useId, useRef, useState, type KeyboardEvent } from "react";
import Link from "next/link";
import { BellRing, Bot, Check, Landmark, ShieldAlert } from "lucide-react";
import { ScoreGauge } from "@/components/ScoreGauge";
import { SubScoreBar } from "@/components/SubScoreBar";
import { features, type FeatureSlug } from "@/components/features/featureContent";

const showcaseTabs: Array<{ key: FeatureSlug; label: string }> = [
  { key: "safety-score", label: "Safety Score" },
  { key: "ai-coach", label: "AI Coach" },
  { key: "monitoring", label: "Retirement Watch" },
  { key: "medicare-social-security", label: "Medicare & Social Security" },
  { key: "scam-shield", label: "Scam Shield" },
];

const routes: Record<FeatureSlug, string> = {
  "safety-score": "/features/safety-score",
  "ai-coach": "/features/ai-coach",
  monitoring: "/features/monitoring",
  "medicare-social-security": "/features/medicare-social-security",
  "scam-shield": "/features/scam-shield",
};

function FeatureBullets({ featureKey }: { featureKey: FeatureSlug }) {
  return (
    <ul className="mt-7 space-y-4 text-lg leading-8 text-slate-700">
      {features[featureKey].benefits.slice(0, 3).map(([, title, body]) => (
        <li key={title} className="flex gap-3">
          <Check className="mt-1 h-5 w-5 shrink-0 text-brand" aria-hidden="true" strokeWidth={2.4} />
          <span>
            <strong className="font-extrabold text-ink">{title}:</strong> {body}
          </span>
        </li>
      ))}
    </ul>
  );
}

function SafetyScoreMock() {
  return (
    <div aria-hidden="true" className="pointer-events-none">
      <ScoreGauge value={82} subScores={[]} badge="Preview" />
      <div className="mt-4 rounded-[2rem] border border-slate-200 bg-white p-5 shadow-xl shadow-brand/10">
        <div className="space-y-4">
          <SubScoreBar label="Income" value={86} />
          <SubScoreBar label="Spending" value={74} />
          <SubScoreBar label="Inflation" value={68} />
          <SubScoreBar label="Market" value={71} />
        </div>
      </div>
    </div>
  );
}

function AICoachMock() {
  return (
    <div aria-hidden="true" className="pointer-events-none relative rounded-[2rem] border border-slate-200 bg-white p-5 shadow-xl shadow-brand/10 sm:p-6">
      <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-brand text-white">
          <Bot className="h-6 w-6" strokeWidth={1.9} />
        </div>
        <div>
          <p className="text-sm font-extrabold text-ink">RetireShield Coach</p>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Based on your plan</p>
        </div>
      </div>
      <div className="mt-5 space-y-4 text-sm font-semibold leading-6">
        <div className="ml-auto max-w-[85%] rounded-2xl rounded-tr-sm bg-brand px-5 py-4 text-white shadow-sm shadow-brand/20">
          Can I help my grandkids this year?
        </div>
        <div className="max-w-[90%] rounded-2xl rounded-tl-sm border border-slate-200 bg-surface px-5 py-4 text-slate-700 shadow-sm">
          Yes — a $5,000 gift keeps your score at 82. Keep your monthly spending near the current plan and revisit before December.
          <div className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-extrabold text-score-secure ring-1 ring-emerald-100">
            <Check className="h-3.5 w-3.5" />
            how this was calculated
          </div>
        </div>
      </div>
    </div>
  );
}

function RetirementWatchMock() {
  const alerts = [
    { tag: "Medicare", date: "Oct 15", title: "Review IRMAA risk before open enrollment" },
    { tag: "Social Security", date: "Nov 02", title: "Claiming window could change lifetime income" },
    { tag: "Scam", date: "Dec 08", title: "New-payee wire request needs verification" },
  ];

  return (
    <div aria-hidden="true" className="pointer-events-none rounded-[2rem] border border-slate-200 bg-white p-5 shadow-xl shadow-brand/10 sm:p-6">
      <div className="flex items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand text-white">
          <BellRing className="h-6 w-6" />
        </div>
        <div>
          <p className="text-sm font-extrabold uppercase tracking-[0.16em] text-brand">Monthly watchlist</p>
          <p className="text-xl font-extrabold text-ink">3 items to review</p>
        </div>
      </div>
      <div className="mt-6 space-y-4">
        {alerts.map((alert) => (
          <article key={alert.title} className="rounded-3xl border border-slate-200 bg-surface p-4 shadow-sm">
            <div className="flex items-center justify-between gap-4">
              <span className="rounded-full bg-brand/10 px-3 py-1 text-xs font-extrabold uppercase tracking-[0.14em] text-brand">{alert.tag}</span>
              <span className="text-sm font-bold text-slate-500">{alert.date}</span>
            </div>
            <p className="mt-3 text-lg font-extrabold leading-7 text-ink">{alert.title}</p>
          </article>
        ))}
      </div>
    </div>
  );
}

function MedicareSocialSecurityMock() {
  const bars = [
    { age: "62", amount: "$1,860", height: "h-16" },
    { age: "Full", amount: "$2,620", height: "h-24" },
    { age: "70", amount: "$3,270", height: "h-32" },
  ];

  return (
    <div aria-hidden="true" className="pointer-events-none rounded-[2rem] border border-slate-200 bg-white p-5 shadow-xl shadow-brand/10 sm:p-6">
      <div className="rounded-3xl border border-amber-200 bg-amber-50 p-5">
        <div className="flex items-start gap-3">
          <Landmark className="mt-1 h-6 w-6 shrink-0 text-amber-700" />
          <div>
            <p className="text-sm font-extrabold uppercase tracking-[0.16em] text-amber-700">IRMAA watch</p>
            <p className="mt-2 text-2xl font-extrabold tracking-tight text-ink">About $1,500 under the next line</p>
            <p className="mt-2 text-sm font-semibold leading-6 text-slate-700">Consider timing withdrawals before you cross a Medicare surcharge threshold.</p>
          </div>
        </div>
      </div>
      <div className="mt-6 rounded-3xl border border-slate-200 bg-surface p-5">
        <p className="text-sm font-extrabold uppercase tracking-[0.16em] text-brand">Claiming-age compare</p>
        <div className="mt-5 grid grid-cols-3 items-end gap-4">
          {bars.map((bar) => (
            <div key={bar.age} className="text-center">
              <div className={`mx-auto w-full max-w-16 rounded-t-2xl bg-brand/80 ${bar.height}`} />
              <p className="mt-3 text-sm font-extrabold text-ink">{bar.age}</p>
              <p className="text-sm font-bold text-slate-600">{bar.amount}/mo</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function ScamShieldMock() {
  return (
    <div aria-hidden="true" className="pointer-events-none rounded-[2rem] border border-slate-200 bg-white p-5 shadow-xl shadow-brand/10 sm:p-6">
      <div className="rounded-3xl border border-red-200 bg-red-50 p-5">
        <div className="flex items-start gap-3">
          <ShieldAlert className="mt-1 h-7 w-7 shrink-0 text-red-700" />
          <div>
            <p className="text-sm font-extrabold uppercase tracking-[0.16em] text-red-700">Flagged transaction</p>
            <p className="mt-2 text-2xl font-extrabold tracking-tight text-ink">$9,000 wire to a new payee</p>
            <p className="mt-2 text-lg font-bold leading-7 text-red-800">Pause and verify before money moves.</p>
          </div>
        </div>
      </div>
      <div className="mt-6 rounded-3xl border border-slate-200 bg-surface p-5">
        <p className="text-sm font-extrabold uppercase tracking-[0.16em] text-brand">Verify before you act</p>
        <ol className="mt-4 space-y-4 text-base font-semibold leading-7 text-slate-700">
          <li className="flex gap-3"><span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand text-sm font-extrabold text-white">1</span>Call the company using a number you already trust.</li>
          <li className="flex gap-3"><span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand text-sm font-extrabold text-white">2</span>Ask a trusted contact to review the request with you.</li>
        </ol>
      </div>
    </div>
  );
}

function ProductMock({ featureKey }: { featureKey: FeatureSlug }) {
  if (featureKey === "safety-score") return <SafetyScoreMock />;
  if (featureKey === "ai-coach") return <AICoachMock />;
  if (featureKey === "monitoring") return <RetirementWatchMock />;
  if (featureKey === "medicare-social-security") return <MedicareSocialSecurityMock />;
  return <ScamShieldMock />;
}

export function FeatureShowcase() {
  const baseId = useId();
  const [activeKey, setActiveKey] = useState<FeatureSlug>(showcaseTabs[0].key);
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const activeIndex = showcaseTabs.findIndex((tab) => tab.key === activeKey);

  function focusTab(index: number) {
    const nextIndex = (index + showcaseTabs.length) % showcaseTabs.length;
    setActiveKey(showcaseTabs[nextIndex].key);
    tabRefs.current[nextIndex]?.focus();
  }

  function onTabKeyDown(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    if (event.key === "ArrowRight" || event.key === "ArrowDown") {
      event.preventDefault();
      focusTab(index + 1);
    } else if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
      event.preventDefault();
      focusTab(index - 1);
    } else if (event.key === "Home") {
      event.preventDefault();
      focusTab(0);
    } else if (event.key === "End") {
      event.preventDefault();
      focusTab(showcaseTabs.length - 1);
    }
  }

  return (
    <section className="overflow-hidden bg-white py-14 sm:py-18 lg:py-24" aria-labelledby={`${baseId}-heading`}>
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl">
          <p className="text-sm font-extrabold uppercase tracking-[0.18em] text-brand">Unlock powerful features</p>
          <h2 id={`${baseId}-heading`} className="mt-4 font-serif text-4xl font-bold tracking-tight text-ink sm:text-5xl lg:text-6xl">
            The tools that help you feel safer about retirement.
          </h2>
        </div>

        <div className="-mx-4 mt-8 overflow-x-auto px-4 [scrollbar-width:none] sm:mx-0 sm:px-0" role="tablist" aria-label="RetireShield feature showcase">
          <div className="flex min-w-max snap-x gap-3 border-b border-slate-200">
            {showcaseTabs.map((tab, index) => {
              const selected = tab.key === activeKey;
              return (
                <button
                  key={tab.key}
                  ref={(node) => { tabRefs.current[index] = node; }}
                  id={`${baseId}-${tab.key}-tab`}
                  type="button"
                  role="tab"
                  aria-selected={selected}
                  aria-controls={`${baseId}-${tab.key}-panel`}
                  tabIndex={selected ? 0 : -1}
                  onClick={() => setActiveKey(tab.key)}
                  onKeyDown={(event) => onTabKeyDown(event, index)}
                  className={`snap-start whitespace-nowrap border-b-4 px-1 pb-4 pt-2 text-left text-base font-extrabold transition-colors motion-reduce:transition-none sm:px-3 sm:text-lg ${selected ? "border-brand text-ink" : "border-transparent text-slate-600 hover:border-brand/30 hover:text-ink"}`}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="mt-10 min-h-[720px] sm:min-h-[660px] lg:min-h-[560px]">
          {showcaseTabs.map((tab, index) => {
            const feature = features[tab.key];
            const selected = index === activeIndex;
            return (
              <div
                key={tab.key}
                id={`${baseId}-${tab.key}-panel`}
                role="tabpanel"
                aria-labelledby={`${baseId}-${tab.key}-tab`}
                tabIndex={0}
                hidden={!selected}
                className="grid gap-10 lg:grid-cols-2 lg:items-center"
              >
                <div>
                  <h3 className="font-serif text-3xl font-bold tracking-tight text-ink sm:text-4xl lg:text-5xl">{feature.title}</h3>
                  <FeatureBullets featureKey={tab.key} />
                  <Link href={routes[tab.key]} className="mt-8 inline-flex text-lg font-extrabold text-brand no-underline transition hover:text-brand-dark motion-reduce:transition-none">
                    Learn more<span aria-hidden="true">&nbsp;→</span>
                  </Link>
                </div>
                <div className="mx-auto w-full max-w-lg">
                  <ProductMock featureKey={tab.key} />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

export default FeatureShowcase;
