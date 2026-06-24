import { subScoreBlurb, type SubScoreKey } from "@/lib/verdicts";

export type ScoreBandKey = "secure" | "mostlySecure" | "atRisk" | "vulnerable";

export type SubScoreBarProps = {
  label: string;
  value: number;
  band?: ScoreBandKey;
  caption?: string;
  scoreKey?: SubScoreKey;
};

const SCORE_BANDS: Record<ScoreBandKey, { label: string; colorClass: string; textClass: string }> = {
  secure: { label: "Secure", colorClass: "bg-score-secure", textClass: "text-score-secure" },
  mostlySecure: { label: "Mostly Secure", colorClass: "bg-score-mostlySecure", textClass: "text-score-mostlySecure" },
  atRisk: { label: "At Risk", colorClass: "bg-score-atRisk", textClass: "text-score-atRisk" },
  vulnerable: { label: "Vulnerable", colorClass: "bg-score-vulnerable", textClass: "text-score-vulnerable" },
};

export function clampScore(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

export function scoreBandKey(value: number): ScoreBandKey {
  if (value >= 80) return "secure";
  if (value >= 60) return "mostlySecure";
  if (value >= 40) return "atRisk";
  return "vulnerable";
}

export function SubScoreBar({ label, value, band, caption, scoreKey }: SubScoreBarProps) {
  const score = clampScore(value);
  const activeBandKey = band ?? scoreBandKey(score);
  const activeBand = SCORE_BANDS[activeBandKey];
  const description = caption ?? (scoreKey ? subScoreBlurb(scoreKey, score) : undefined);

  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between gap-3 text-sm font-bold text-slate-600">
        <span>{label}</span>
        <span className={activeBand.textClass}>{score}</span>
      </div>
      <div
        className="h-3 overflow-hidden rounded-full bg-slate-200"
        role="meter"
        aria-label={`${label}: ${score} out of 100, ${activeBand.label}`}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={score}
      >
        <div className={`h-full rounded-full ${activeBand.colorClass}`} style={{ width: `${score}%` }} />
      </div>
      {description ? <p className="mt-2 text-sm leading-5 text-slate-600">{description}</p> : null}
    </div>
  );
}
