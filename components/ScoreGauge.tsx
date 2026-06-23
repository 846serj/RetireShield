type SubScore = {
  label: string;
  value: number;
};

type ScoreGaugeProps = {
  value?: number;
  band?: string;
  subScores?: SubScore[];
  delta?: string;
};

type ScoreBand = {
  label: string;
  color: string;
  textClass: string;
  bgClass: string;
};

const DEFAULT_SUB_SCORES: SubScore[] = [
  { label: "Guaranteed income", value: 86 },
  { label: "Spending sustainability", value: 74 },
  { label: "Inflation exposure", value: 68 },
  { label: "Market-drop cushion", value: 79 },
];

const SCORE_BANDS = {
  secure: { label: "Secure", color: "#2E7D5B", textClass: "text-score-secure", bgClass: "bg-score-secure" },
  mostlySecure: { label: "Mostly Secure", color: "#4F9E6A", textClass: "text-score-mostlySecure", bgClass: "bg-score-mostlySecure" },
  atRisk: { label: "At Risk", color: "#C77700", textClass: "text-score-atRisk", bgClass: "bg-score-atRisk" },
  vulnerable: { label: "Vulnerable", color: "#B23A3A", textClass: "text-score-vulnerable", bgClass: "bg-score-vulnerable" },
} satisfies Record<string, ScoreBand>;

function clampScore(value: number) {
  return Math.max(0, Math.min(100, value));
}

function scoreBand(value: number): ScoreBand {
  if (value >= 80) return SCORE_BANDS.secure;
  if (value >= 60) return SCORE_BANDS.mostlySecure;
  if (value >= 40) return SCORE_BANDS.atRisk;
  return SCORE_BANDS.vulnerable;
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

export function SubScoreBar({ label, value }: SubScore) {
  const subValue = clampScore(value);
  const band = scoreBand(subValue);

  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between gap-3 text-sm font-bold text-slate-600">
        <span>{label}</span>
        <span className={band.textClass}>{subValue}</span>
      </div>
      <div className="h-3 overflow-hidden rounded-full bg-slate-200" aria-label={`${label}: ${subValue} out of 100, ${band.label}`}>
        <div className={`h-full rounded-full ${band.bgClass}`} style={{ width: `${subValue}%` }} />
      </div>
    </div>
  );
}

export function ScoreGauge({ value = 82, band, subScores = DEFAULT_SUB_SCORES, delta }: ScoreGaugeProps) {
  const score = clampScore(value);
  const computedBand = scoreBand(score);
  const activeBand = band ?? computedBand.label;
  const progressEndAngle = 180 + (score / 100) * 180;

  return (
    <div className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-xl shadow-brand/10 sm:p-6" aria-label={`Retirement Safety Score mockup: ${score} out of 100, ${activeBand}`}>
      <div className="rounded-3xl bg-gradient-to-b from-slate-50 to-white p-5">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-extrabold uppercase tracking-[0.16em] text-slate-500">Safety Score</p>
            <p className="mt-1 text-base font-semibold text-slate-600">Preview result</p>
          </div>
          {delta ? (
            <span className="rounded-full bg-emerald-50 px-3 py-1 text-sm font-extrabold text-score-secure ring-1 ring-emerald-100">{delta}</span>
          ) : (
            <span className="rounded-full bg-emerald-50 px-3 py-1 text-sm font-bold text-score-secure">Free</span>
          )}
        </div>

        <div className="relative mx-auto mt-5 max-w-[320px]">
          <svg viewBox="0 0 200 128" className="h-auto w-full" role="img" aria-label={`Gauge showing ${score} out of 100`}>
            <path d={arcPath(180, 252)} fill="none" stroke="#B23A3A" strokeLinecap="round" strokeWidth="18" />
            <path d={arcPath(252, 288)} fill="none" stroke="#C77700" strokeLinecap="butt" strokeWidth="18" />
            <path d={arcPath(288, 324)} fill="none" stroke="#4F9E6A" strokeLinecap="butt" strokeWidth="18" />
            <path d={arcPath(324, 360)} fill="none" stroke="#2E7D5B" strokeLinecap="round" strokeWidth="18" />
            <path d={arcPath(180, progressEndAngle)} fill="none" stroke={computedBand.color} strokeLinecap="round" strokeWidth="10" />
            <line
              x1="100"
              y1="104"
              x2={polarToCartesian(100, 104, 62, progressEndAngle).x}
              y2={polarToCartesian(100, 104, 62, progressEndAngle).y}
              stroke="#1A2230"
              strokeLinecap="round"
              strokeWidth="4"
            />
            <circle cx="100" cy="104" r="6" fill="#1A2230" />
          </svg>
          <div className="absolute inset-x-0 bottom-0 text-center">
            <div className="text-5xl font-extrabold tracking-tight text-ink">{score}</div>
            <div className={`text-base font-bold ${computedBand.textClass}`}>/ 100 · {activeBand}</div>
          </div>
        </div>

        <div className="mt-7 space-y-3">
          {subScores.map((subScore) => (
            <SubScoreBar key={subScore.label} label={subScore.label} value={subScore.value} />
          ))}
        </div>
      </div>
    </div>
  );
}
