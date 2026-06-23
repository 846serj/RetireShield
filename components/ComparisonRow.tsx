import type { ReactNode } from "react";

type ComparisonCardTone = "muted" | "brand";

type ComparisonCard = {
  title: string;
  quote: string;
  children: ReactNode;
  tone: ComparisonCardTone;
};

type ComparisonRowProps = {
  cards: [ComparisonCard, ComparisonCard];
};

const toneClasses: Record<ComparisonCardTone, string> = {
  muted: "border-slate-200 bg-white text-ink shadow-sm",
  brand: "border-brand/25 bg-brand text-white shadow-xl shadow-brand/10",
};

const labelClasses: Record<ComparisonCardTone, string> = {
  muted: "text-slate-500",
  brand: "text-white/75",
};

const quoteClasses: Record<ComparisonCardTone, string> = {
  muted: "text-slate-900",
  brand: "text-white",
};

const bodyClasses: Record<ComparisonCardTone, string> = {
  muted: "text-slate-600",
  brand: "text-white/85",
};

export function ComparisonRow({ cards }: ComparisonRowProps) {
  return (
    <div className="grid gap-5 md:grid-cols-2 lg:gap-6">
      {cards.map((card) => (
        <article
          key={card.title}
          className={`rounded-3xl border p-6 sm:p-8 ${toneClasses[card.tone]}`}
        >
          <h3 className={`text-sm font-bold uppercase tracking-[0.18em] ${labelClasses[card.tone]}`}>
            {card.title}
          </h3>
          <p className={`mt-5 text-2xl font-extrabold leading-tight sm:text-3xl ${quoteClasses[card.tone]}`}>
            “{card.quote}”
          </p>
          <p className={`mt-5 text-lg leading-8 ${bodyClasses[card.tone]}`}>{card.children}</p>
        </article>
      ))}
    </div>
  );
}
