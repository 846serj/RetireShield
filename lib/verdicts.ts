export type ScoreBandKey = "secure" | "mostlySecure" | "atRisk" | "vulnerable";
export type ScoreBandLabel = "Secure" | "Mostly Secure" | "At Risk" | "Vulnerable";
export type ScoreBand = ScoreBandKey | ScoreBandLabel;
export type SubScoreKey = "income" | "sustainability" | "inflation" | "market" | "timing" | "reserves" | "taxes" | string;

const BAND_VERDICTS: Record<ScoreBandKey, string> = {
  secure: "Your retirement picture looks steady, with several strengths already working in your favor.",
  mostlySecure: "You have a solid foundation, and a few focused checkups can help make the plan feel steadier.",
  atRisk: "There are some pressure points to review, but small planning steps can make the next move clearer.",
  vulnerable: "Your weakest sub-scores point to the first planning topics to review, starting with the lowest gap area shown in your results.",
};

const normalizeBand = (band: ScoreBand): ScoreBandKey => {
  const normalized = band.trim().replace(/[\s_-]+(.)?/g, (_, char: string | undefined) => (char ? char.toUpperCase() : ""));
  const key = normalized.charAt(0).toLowerCase() + normalized.slice(1);

  if (key === "secure" || key === "mostlySecure" || key === "atRisk" || key === "vulnerable") return key;
  return "atRisk";
};

const scoreTone = (value: number) => {
  if (value >= 80) return "looks strong";
  if (value >= 60) return "has a useful base";
  if (value >= 40) return "may need a closer look";
  return "is a good place to start learning what support may help";
};

const clampScore = (value: number) => Math.max(0, Math.min(100, Math.round(value)));

export function bandVerdict(band: ScoreBand): string {
  return BAND_VERDICTS[normalizeBand(band)];
}

export function subScoreBlurb(key: SubScoreKey, value: number): string {
  const score = clampScore(value);
  const tone = scoreTone(score);

  switch (key) {
    case "income":
      return `Guaranteed income ${tone}; it compares steady monthly income with essential expenses for education only.`;
    case "sustainability":
      return `Spending sustainability ${tone}; it frames how savings might cover gaps between income and expenses.`;
    case "inflation":
      return `Inflation exposure ${tone}; it shows how rising costs could affect fixed and adjustable income sources.`;
    case "market":
      return `Market-drop cushion ${tone}; it reflects age, stock exposure, emergency savings, and debt pressure.`;
    case "timing":
      return `Timing ${tone}; it reviews Social Security claiming and retirement timing tradeoffs.`;
    case "reserves":
      return `Emergency reserves ${tone}; it reflects cash cushions, home flexibility, work status, and debt pressure.`;
    case "taxes":
      return `Tax diversification ${tone}; it looks at whether savings are spread across taxable, tax-deferred, and Roth buckets.`;
    default:
      return `This score ${tone}; use it as an educational prompt for what to review next.`;
  }
}
