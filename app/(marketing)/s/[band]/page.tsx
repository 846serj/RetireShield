import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Button, Eyebrow } from "@/components/ui";
import { getPublicBaseUrl } from "@/lib/siteUrl";
import { scoreBandFromSlug, scoreBandHumanLabel } from "@/lib/shareBands";

const sharedDescription =
  "A free Retirement Safety Score that shows how solid your retirement really is — income, withdrawals, inflation, and market risk. See where you stand.";
const sharedTitle = "I checked how solid my retirement really is — here's where I landed";

type SharePageProps = { params: { band: string } };

export function generateMetadata({ params }: SharePageProps): Metadata {
  const bandLabel = scoreBandFromSlug(params.band);
  if (!bandLabel) notFound();

  const base = getPublicBaseUrl();
  const url = `${base}/s/${params.band}`;
  const imageUrl = `${url}/opengraph-image`;

  return {
    title: { absolute: sharedTitle },
    description: sharedDescription,
    alternates: { canonical: url },
    openGraph: {
      title: sharedTitle,
      description: sharedDescription,
      url,
      siteName: "RetireShield",
      type: "website",
      images: [{ url: imageUrl, width: 1200, height: 630, alt: scoreBandHumanLabel(bandLabel) }],
    },
    twitter: {
      card: "summary_large_image",
      title: sharedTitle,
      description: sharedDescription,
      images: [imageUrl],
    },
  };
}

export default function ShareLandingPage({ params }: SharePageProps) {
  const bandLabel = scoreBandFromSlug(params.band);
  if (!bandLabel) notFound();

  return (
    <div className="rg-page-shell">
      <main className="mx-auto max-w-4xl px-4 py-12 sm:py-20">
        <section className="rg-card overflow-hidden text-center">
          <Eyebrow>Retirement Safety Score</Eyebrow>
          <div className="mx-auto mt-8 max-w-3xl rounded-[2rem] bg-band p-6 sm:p-10">
            <p className="text-base font-extrabold uppercase tracking-[0.16em] text-brandDark">
              {scoreBandHumanLabel(bandLabel)}
            </p>
            <h1 className="mt-4 font-serif text-4xl font-semibold leading-tight text-ink sm:text-6xl">
              See how solid YOUR retirement really is
            </h1>
            <p className="mx-auto mt-5 max-w-2xl text-lg leading-8 text-slate-700 sm:text-xl">
              Someone checked their Retirement Safety Score and shared this quiz. You can take the same free, education-only checkup and get your own score.
            </p>
          </div>
          <div className="mt-8 flex justify-center">
            <Button href="/quiz">Take the free quiz →</Button>
          </div>
          <p className="mx-auto mt-6 max-w-2xl text-base leading-7 text-slate-600">
            You can also read the free <Link href="/newsletter" className="font-bold text-brand underline transition hover:text-brandDark motion-reduce:transition-none">Retirement Shield newsletter</Link> from Ellen Marsh, sent every Tuesday & Friday.
          </p>
        </section>
      </main>
    </div>
  );
}
