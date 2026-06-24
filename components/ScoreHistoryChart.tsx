import type { ScoreHistoryPoint } from "@/lib/scoreHistory";

type ScoreHistoryChartProps = {
  points: ScoreHistoryPoint[];
};

const EMPTY_MESSAGE = "We'll chart your progress here as the months roll in.";

function buildPath(points: { x: number; y: number }[]) {
  return points.map((point, index) => `${index === 0 ? "M" : "L"} ${point.x.toFixed(2)} ${point.y.toFixed(2)}`).join(" ");
}

export default function ScoreHistoryChart({ points }: ScoreHistoryChartProps) {
  const hasChart = points.length >= 2;
  const chartWidth = 640;
  const chartHeight = 220;
  const padding = { top: 18, right: 18, bottom: 34, left: 44 };
  const plotWidth = chartWidth - padding.left - padding.right;
  const plotHeight = chartHeight - padding.top - padding.bottom;
  const coordinates = hasChart
    ? points.map((point, index) => ({
        ...point,
        x: padding.left + (index / (points.length - 1)) * plotWidth,
        y: padding.top + (1 - point.score / 100) * plotHeight,
      }))
    : [];
  const linePath = buildPath(coordinates);
  const areaPath = coordinates.length
    ? `${linePath} L ${coordinates[coordinates.length - 1].x.toFixed(2)} ${padding.top + plotHeight} L ${padding.left} ${padding.top + plotHeight} Z`
    : "";
  const first = points[0];
  const last = points[points.length - 1];
  const previous = points[points.length - 2];
  const delta = previous && last ? last.score - previous.score : 0;

  return (
    <section className="rg-card mb-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="rg-kicker">Premium</p>
          <h2 className="mt-2 text-2xl font-extrabold">Score over time</h2>
          <p className="mt-2 text-slate-700">Track how your Retirement Safety Score changes as your answers and plan evolve.</p>
        </div>
        {hasChart ? (
          <div className="rounded-2xl bg-emerald-50 px-4 py-3 text-right ring-1 ring-emerald-100">
            <p className="text-xs font-extrabold uppercase tracking-[0.14em] text-emerald-700">This month</p>
            <p className="mt-1 text-2xl font-extrabold text-ink">{delta >= 0 ? "+" : ""}{delta}</p>
          </div>
        ) : null}
      </div>

      {hasChart ? (
        <div className="mt-6 overflow-hidden rounded-3xl border border-slate-200 bg-gradient-to-b from-white to-slate-50 p-3">
          <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} className="h-auto w-full" role="img" aria-label={`Score history from ${first.label} to ${last.label}`}>
            {[0, 25, 50, 75, 100].map((tick) => {
              const y = padding.top + (1 - tick / 100) * plotHeight;
              return (
                <g key={tick}>
                  <line x1={padding.left} x2={chartWidth - padding.right} y1={y} y2={y} stroke="#E2E8F0" strokeDasharray="4 6" />
                  <text x={padding.left - 12} y={y + 4} textAnchor="end" className="fill-slate-500 text-[11px] font-bold">{tick}</text>
                </g>
              );
            })}
            <path d={areaPath} fill="url(#scoreArea)" />
            <path d={linePath} fill="none" stroke="#2E7D5B" strokeLinecap="round" strokeLinejoin="round" strokeWidth="4" />
            {coordinates.map((point) => (
              <g key={point.month}>
                <circle cx={point.x} cy={point.y} r="5" fill="#2E7D5B" stroke="white" strokeWidth="3" />
                <text x={point.x} y={chartHeight - 10} textAnchor="middle" className="fill-slate-600 text-[11px] font-bold">{point.label}</text>
                <title>{`${point.label}: ${point.score}`}</title>
              </g>
            ))}
            <defs>
              <linearGradient id="scoreArea" x1="0" x2="0" y1="0" y2="1">
                <stop offset="0%" stopColor="#2E7D5B" stopOpacity="0.24" />
                <stop offset="100%" stopColor="#2E7D5B" stopOpacity="0.04" />
              </linearGradient>
            </defs>
          </svg>
        </div>
      ) : (
        <div className="mt-6 rounded-3xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center">
          <p className="text-lg font-semibold text-slate-700">{EMPTY_MESSAGE}</p>
          <p className="mt-2 text-sm text-slate-500">Retake the quiz after meaningful changes to start building a trend.</p>
        </div>
      )}
    </section>
  );
}
