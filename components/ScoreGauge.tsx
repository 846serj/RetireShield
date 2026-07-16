"use client";

import { useEffect, useState } from "react";
import { bandVerdict, type ScoreBand, type ScoreBandLabel } from "@/lib/verdicts";
import { SubScoreBar, clampScore, scoreBandKey, type ScoreBandKey, type SubScoreBarProps } from "@/components/SubScoreBar";

type SubScore = Pick<SubScoreBarProps, "label" | "value" | "caption" | "scoreKey">;

type ScoreGaugeProps = {
  value?: number;
  band?: ScoreBand;
  subScores?: SubScore[];
  delta?: string;
  subtitle?: string;
  badge?: string;
};

type ScoreBandMeta = {
  label: ScoreBandLabel;
  color: string;
  textClass: string;
};

const DEFAULT_SUB_SCORES: SubScore[] = [
  { label: "Guaranteed income", value: 86, scoreKey: "income" },
  { label: "Spending sustainability", value: 74, scoreKey: "sustainability" },
  { label: "Inflation exposure", value: 68, scoreKey: "inflation" },
  { label: "Market-drop cushion", value: 79, scoreKey: "market" },
  { label: "Social Security timing", value: 72, scoreKey: "timing" },
  { label: "Emergency reserves", value: 70, scoreKey: "reserves" },
  { label: "Tax diversification", value: 64, scoreKey: "taxes" },
];

const SCORE_BANDS: Record<ScoreBandKey, ScoreBandMeta> = {
  secure: { label: "Secure", color: "#2E7D5B", textClass: "text-score-secure" },
  mostlySecure: { label: "Mostly Secure", color: "#4F9E6A", textClass: "text-score-mostlySecure" },
  atRisk: { label: "At Risk", color: "#C77700", textClass: "text-score-atRisk" },
  vulnerable: { label: "Vulnerable", color: "#B23A3A", textClass: "text-score-vulnerable" },
};

function normalizeBand(band?: ScoreBand): ScoreBandKey | undefined {
  if (!band) return undefined;
  const compact = band.trim().replace(/[\s_-]+(.)?/g, (_, char: string | undefined) => (char ? char.toUpperCase() : ""));
  const key = compact.charAt(0).toLowerCase() + compact.slice(1);
  if (key === "secure" || key === "mostlySecure" || key === "atRisk" || key === "vulnerable") return key;
  return undefined;
}

function polarToCartesian(cx: number, cy: number, r: number, angle: number) {
  const radians = (angle * Math.PI) / 180;
  return {
    x: cx + r * Math.cos(radians),
    y: cy + r * Math.sin(radians),
  };
}

function arcPath(startAngle: number, endAngle: number) {
  const start = polarToCartesian(100, 104, 78, startAngle);
  const end = polarToCartesian(100, 104, 78, endAngle);
  const largeArcFlag = Math.abs(endAngle - startAngle) > 180 ? 1 : 0;

  return `M ${start.x} ${start.y} A 78 78 0 ${largeArcFlag} 1 ${end.x} ${end.y}`;
}

function useCountUp(target: number) {
  const [displayValue, setDisplayValue] = useState(target);

  useEffect(() => {
    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (prefersReducedMotion) {
      setDisplayValue(target);
      return;
    }

    let animationFrame = 0;
    const duration = 900;
    const startedAt = performance.now();
    setDisplayValue(0);

    const tick = (now: number) => {
      const progress = Math.min(1, (now - startedAt) / duration);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplayValue(Math.round(target * eased));

      if (progress < 1) animationFrame = requestAnimationFrame(tick);
    };

    animationFrame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animationFrame);
  }, [target]);

  return displayValue;
}

export function ScoreGauge({ value = 82, band, subScores = DEFAULT_SUB_SCORES, delta, subtitle = "Preview result", badge = "Free" }: ScoreGaugeProps) {
  const score = clampScore(value);
  const displayScore = useCountUp(score);
  const bandKey = normalizeBand(band) ?? scoreBandKey(score);
  const activeBand = SCORE_BANDS[bandKey];
  const progressEndAngle = 180 + (displayScore / 100) * 180;

  return (
    <div className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-xl shadow-brand/10 sm:p-6" aria-label={`Retirement Safety Score: ${score} out of 100, ${activeBand.label}`}>
      <div className="rounded-3xl bg-gradient-to-b from-slate-50 to-white p-5">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-extrabold uppercase tracking-[0.16em] text-slate-500">Safety Score</p>
            <p className="mt-1 text-base font-semibold text-slate-600">{subtitle}</p>
          </div>
          {delta ? (
            <span className="rounded-full bg-emerald-50 px-3 py-1 text-sm font-extrabold text-score-secure ring-1 ring-emerald-100">{delta}</span>
          ) : (
            <span className="rounded-full bg-emerald-50 px-3 py-1 text-sm font-bold text-score-secure">{badge}</span>
          )}
        </div>

        <div className="mx-auto mt-6 max-w-[320px] text-center">
          <svg
            viewBox="0 0 200 132"
            className="h-auto w-full overflow-visible"
            role="img"
            aria-label={`Safety score ${score} of 100, ${activeBand.label}`}
          >
            <path d={arcPath(180, 360)} fill="none" stroke="#E7EDF4" strokeLinecap="round" strokeWidth="16" />
            <path d={arcPath(180, progressEndAngle)} fill="none" stroke={activeBand.color} strokeLinecap="round" strokeWidth="16" />
          </svg>
          <div className="-mt-14 px-4 pb-2 sm:-mt-16">
            <div className="text-4xl font-extrabold leading-none tracking-tight text-ink">{displayScore}</div>
            <div className={`mt-2 text-lg font-extrabold ${activeBand.textClass}`}>{activeBand.label}</div>
          </div>
        </div>

        <p className="mx-auto mt-5 max-w-sm text-center text-base text-slate-700">{bandVerdict(activeBand.label)}</p>

        {subScores.length > 0 ? (
          <div className="mt-7 space-y-4">
            {subScores.map((subScore) => (
              <SubScoreBar key={subScore.label} label={subScore.label} value={subScore.value} caption={subScore.caption} scoreKey={subScore.scoreKey} />
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}

export default ScoreGauge;
