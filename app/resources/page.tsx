import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, BookOpen, CalendarDays } from "lucide-react";
import { NewsletterSignup } from "@/components/NewsletterSignup";
import { Button, Container, Eyebrow } from "@/components/ui";
import { resourceArticles, resourceCategories } from "@/content/resources";

export const metadata: Metadata = {
  title: "Retirement Resources — Guides from RetireShield",
  description: "Plain-English retirement guides on safety scores, scams, Social Security, Medicare, family conversations, and withdrawal risk.",
};

type ResourcesPageProps = {
  searchParams?: { category?: string };
};

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" }).format(new Date(value));
}

export default function ResourcesPage({ searchParams }: ResourcesPageProps) {
  const selectedCategory = resourceCategories.includes(searchParams?.category as any) ? searchParams?.category : "All";
  const articles = selectedCategory === "All" ? resourceArticles : resourceArticles.filter((article) => article.category === selectedCategory);

  return (
    <main>
      <section className="bg-gradient-to-b from-band via-white to-white py-16 sm:py-20 lg:py-24">
        <Container className="grid gap-10 lg:grid-cols-[0.95fr_1.05fr] lg:items-center">
          <div>
            <Eyebrow>Resources</Eyebrow>
            <h1 className="mt-5 text-5xl font-extrabold tracking-tight text-ink sm:text-6xl lg:text-7xl">Plain-English guides for a safer retirement.</h1>
            <p className="mt-6 text-2xl font-semibold leading-10 text-slate-700">Use these articles to start calmer conversations about income, scams, Medicare, Social Security, spending, and the people you are trying to protect.</p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Button href="/quiz">Check my Safety Score</Button>
              <Button href="#resource-grid" variant="secondary">Browse guides</Button>
            </div>
          </div>
          <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-xl sm:p-8">
            <BookOpen className="h-14 w-14 text-brand" aria-hidden="true" />
            <h2 className="mt-6 text-3xl font-extrabold tracking-tight text-ink">Built as the SEO library for Retirement Watch.</h2>
            <p className="mt-4 text-lg leading-8 text-slate-700">This index is wired to a local content source today, so new guide cards can be added quickly while the site network and social channels point visitors to useful education.</p>
          </div>
        </Container>
      </section>

      <section id="resource-grid" className="py-14 sm:py-20" aria-labelledby="resources-heading">
        <Container>
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-2xl">
              <Eyebrow>Guide library</Eyebrow>
              <h2 id="resources-heading" className="mt-4 text-4xl font-extrabold tracking-tight text-ink sm:text-5xl">Browse by topic.</h2>
            </div>
            <nav className="flex flex-wrap gap-3" aria-label="Filter resources by category">
              {resourceCategories.map((category) => {
                const active = category === selectedCategory;
                const href = category === "All" ? "/resources#resource-grid" : `/resources?category=${encodeURIComponent(category)}#resource-grid`;
                return (
                  <Link key={category} href={href} className={`rounded-full border px-4 py-2 text-sm font-extrabold no-underline transition ${active ? "border-brand bg-brand text-white" : "border-slate-200 bg-white text-ink hover:border-brand/40 hover:bg-band"}`} aria-current={active ? "page" : undefined}>
                    {category}
                  </Link>
                );
              })}
            </nav>
          </div>

          <div className="mt-10 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {articles.map((article) => (
              <article key={article.slug} className="flex h-full flex-col rounded-3xl border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:border-brand/30 hover:shadow-lg sm:p-7">
                <div className="flex items-center justify-between gap-3 text-sm font-extrabold">
                  <span className="rounded-full bg-brand/10 px-3 py-1 text-brand">{article.category}</span>
                  <span className="text-slate-500">{article.readTime}</span>
                </div>
                <h3 className="mt-6 text-2xl font-extrabold tracking-tight text-ink">{article.title}</h3>
                <p className="mt-4 flex-1 text-lg leading-8 text-slate-700">{article.description}</p>
                <div className="mt-6 flex items-center gap-2 text-sm font-bold text-slate-500">
                  <CalendarDays className="h-4 w-4" aria-hidden="true" />
                  <time dateTime={article.publishedAt}>{formatDate(article.publishedAt)}</time>
                </div>
                <Link href={`/resources/${article.slug}`} className="mt-6 inline-flex items-center gap-2 font-extrabold text-brand no-underline hover:text-brand-dark" aria-label={`Read ${article.title}`}>
                  Read guide <ArrowRight className="h-5 w-5" aria-hidden="true" />
                </Link>
              </article>
            ))}
          </div>
        </Container>
      </section>

      <Container className="pb-16 sm:pb-20">
        <NewsletterSignup />
      </Container>
    </main>
  );
}
