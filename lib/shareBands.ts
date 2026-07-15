import type { ScoreBandLabel } from "@/lib/verdicts";

export type ScoreBandSlug = "secure" | "mostly-secure" | "at-risk" | "vulnerable";

export const SHARE_BANDS: Record<ScoreBandLabel, { slug: ScoreBandSlug; humanLabel: string }> = {
  Secure: { slug: "secure", humanLabel: "Retirement Safety Score: Secure" },
  "Mostly Secure": { slug: "mostly-secure", humanLabel: "Retirement Safety Score: Mostly Secure" },
  "At Risk": { slug: "at-risk", humanLabel: "Retirement Safety Score: At Risk" },
  Vulnerable: { slug: "vulnerable", humanLabel: "Retirement Safety Score: Vulnerable" },
};

const SLUG_TO_LABEL = Object.fromEntries(
  Object.entries(SHARE_BANDS).map(([label, band]) => [band.slug, label]),
) as Record<ScoreBandSlug, ScoreBandLabel>;

export const SHARE_BAND_SLUGS = Object.values(SHARE_BANDS).map((band) => band.slug);

export function scoreBandToSlug(label: ScoreBandLabel): ScoreBandSlug {
  return SHARE_BANDS[label].slug;
}

export function scoreBandFromSlug(slug: string): ScoreBandLabel | null {
  return isScoreBandSlug(slug) ? SLUG_TO_LABEL[slug] : null;
}

export function scoreBandHumanLabel(label: ScoreBandLabel): string {
  return SHARE_BANDS[label].humanLabel;
}

export function isScoreBandSlug(slug: string): slug is ScoreBandSlug {
  return SHARE_BAND_SLUGS.includes(slug as ScoreBandSlug);
}
