export type ResourceArticle = {
  slug: string;
  title: string;
  description: string;
  category: "Planning" | "Safety" | "Social Security" | "Medicare" | "Family";
  readTime: string;
  publishedAt: string;
};

export const resourceArticles: ResourceArticle[] = [
  {
    slug: "retirement-safety-score-checklist",
    title: "The retirement safety checklist families can review in 20 minutes",
    description: "A plain-English walkthrough of income, spending, inflation, market, healthcare, and scam risks to check before worry turns into crisis.",
    category: "Planning",
    readTime: "6 min read",
    publishedAt: "2026-06-18",
  },
  {
    slug: "protect-parents-from-retirement-scams",
    title: "How to help a parent spot retirement scams without taking over",
    description: "Conversation starters, red flags, and a no-shame plan for protecting older loved ones from pressure tactics and fraud.",
    category: "Safety",
    readTime: "7 min read",
    publishedAt: "2026-06-14",
  },
  {
    slug: "social-security-claiming-questions",
    title: "Five Social Security claiming questions to ask before filing",
    description: "Use these questions to understand trade-offs around timing, survivor benefits, work income, and the monthly income floor.",
    category: "Social Security",
    readTime: "5 min read",
    publishedAt: "2026-06-10",
  },
  {
    slug: "medicare-irmaa-watchlist",
    title: "The simple Medicare IRMAA watchlist for retirees",
    description: "What to monitor when extra income may increase Medicare premiums, and why small planning moves can matter.",
    category: "Medicare",
    readTime: "5 min read",
    publishedAt: "2026-06-06",
  },
  {
    slug: "talking-to-family-about-money-safety",
    title: "A calmer way to talk with family about retirement money safety",
    description: "A family-friendly script for discussing bills, passwords, emergency contacts, and financial confidence without judgment.",
    category: "Family",
    readTime: "8 min read",
    publishedAt: "2026-05-30",
  },
  {
    slug: "safe-withdrawal-warning-signs",
    title: "Four warning signs your withdrawal pace deserves a second look",
    description: "How to notice lifestyle creep, one-time purchases, sequence risk, and inflation pressure before they derail the plan.",
    category: "Planning",
    readTime: "6 min read",
    publishedAt: "2026-05-24",
  },
];

export const resourceCategories = ["All", ...Array.from(new Set(resourceArticles.map((article) => article.category)))] as const;
