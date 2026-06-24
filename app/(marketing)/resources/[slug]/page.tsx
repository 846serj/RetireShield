import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { NewsletterSignup } from "@/components/NewsletterSignup";
import { Container, Eyebrow } from "@/components/ui";
import { resourceArticles } from "@/content/resources";

type ResourceArticlePageProps = {
  params: { slug: string };
};

export function generateStaticParams() {
  return resourceArticles.map((article) => ({ slug: article.slug }));
}

export function generateMetadata({ params }: ResourceArticlePageProps): Metadata {
  const article = resourceArticles.find((item) => item.slug === params.slug);
  if (!article) return { title: "Resource not found — RetireShield" };

  return {
    title: `${article.title} — RetireShield`,
    description: article.description,
  };
}

export default function ResourceArticlePage({ params }: ResourceArticlePageProps) {
  const article = resourceArticles.find((item) => item.slug === params.slug);
  if (!article) notFound();

  return (
    <main>
      <article className="bg-white py-16 sm:py-20 lg:py-24">
        <Container className="max-w-3xl">
          <Link href="/resources" className="inline-flex items-center gap-2 text-base font-extrabold text-brand no-underline hover:text-brand-dark">
            <ArrowLeft className="h-5 w-5" aria-hidden="true" /> Back to resources
          </Link>
          <Eyebrow className="mt-10">{article.category}</Eyebrow>
          <h1 className="mt-5 text-5xl font-extrabold tracking-tight text-ink sm:text-6xl">{article.title}</h1>
          <p className="mt-6 text-2xl font-semibold leading-10 text-slate-700">{article.description}</p>
          <div className="mt-6 text-base font-bold text-slate-500">{article.readTime}</div>

          <div className="prose prose-lg mt-12 max-w-none text-slate-700">
            <p>This guide is part of the RetireShield education library. For now, articles are powered by a simple local content source so the team can publish and refine topics quickly.</p>
            <h2>What to do next</h2>
            <p>Use the guide summary above as a conversation starter. If the topic matches a real concern in your household, run a Retirement Safety Score and make a short list of the assumptions you want to verify.</p>
                      </div>
        </Container>
      </article>
      <Container className="pb-16 sm:pb-20">
        <NewsletterSignup />
      </Container>
    </main>
  );
}
