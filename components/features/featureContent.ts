import { BadgeDollarSign, BellRing, Bot, Calculator, Eye, HeartHandshake, Landmark, LineChart, LockKeyhole, MessageCircleQuestion, Radar, ShieldAlert, ShieldCheck, Sparkles, WalletCards } from "lucide-react";

export type FeatureSlug = "safety-score" | "monitoring" | "ai-coach" | "medicare-social-security" | "scam-shield";

export const features = {
  "safety-score": {
    eyebrow: "Safety Score",
    title: "Know how safe your retirement looks in minutes.",
    subtitle: "Your Retirement Safety Score turns your savings, income, spending, and risks into one clear number you can actually understand — plus the few next steps that matter most. No account, no bank linking, about two minutes.",
    cta: "Get my free Safety Score",
    href: "/quiz",
    icon: ShieldCheck,
    visualTitle: "Safety Score preview",
    visualMetric: "82",
    visualLabel: "Mostly Secure",
    benefitsHeading: "What your Safety Score shows you",
    visualHeading: "A clear picture of where you stand",
    visualBody: "Your score, the four things behind it, and your next steps — all on one simple screen built to be read at a glance, not decoded.",
    ctaHeading: "Ready to see where your retirement stands?",
    ctaBody: "Get your free Retirement Safety Score in about two minutes. No account, no bank linking, no catch.",
    benefits: [
      [
        WalletCards,
        "Income clarity",
        "See at a glance whether your guaranteed income — Social Security, pensions, and annuities — actually covers your essential bills, and how big any gap is.",
      ],
      [
        LineChart,
        "Withdrawal confidence",
        "Understand how your spending choices affect whether your savings last, so you know what's safe to spend and what to keep an eye on.",
      ],
      [
        Sparkles,
        "Prioritized actions",
        "Instead of a vague to-do list, get the two or three moves that would raise your score the most, each explained in plain English.",
      ],
    ],
    faqs: [
      [
        "Do I need to link accounts?",
        "No. You never connect a bank, brokerage, or any account. You answer a few simple questions and we do the rest. Nothing is linked, ever.",
      ],
      [
        "Is this financial advice?",
        "No. RetireShield gives you education and plain-English context to understand your retirement — not individualized financial, tax, or legal advice. For decisions specific to you, we point you to what to ask a fiduciary.",
      ],
      [
        "How long does it take?",
        "About two minutes. Nine simple questions, no documents to dig up, and you see your score right away.",
      ],
    ],
  },
  monitoring: {
    eyebrow: "Monitoring",
    title: "Keep watch as markets, inflation, and life change.",
    subtitle: "Markets move, prices rise, and life changes. RetireShield re-checks your plan every month and gives you a short, plain-English heads-up only when something actually needs your attention — so small changes never become stressful surprises.",
    cta: "Start monitoring my plan",
    href: "/upgrade",
    icon: BellRing,
    visualTitle: "Monthly watchlist",
    visualMetric: "3",
    visualLabel: "Items to review",
    benefitsHeading: "What RetireShield watches for you",
    visualHeading: "Your monthly check-in, at a glance",
    visualBody: "Your latest score, what changed since last month, and the few items worth a look — all on one simple screen, written to be understood in a minute.",
    ctaHeading: "Want RetireShield keeping watch for you?",
    ctaBody: "Start with your free Safety Score, then turn on monthly monitoring whenever you're ready. No bank linking, cancel anytime.",
    benefits: [
      [
        Radar,
        "Early alerts",
        "We flag meaningful changes in your spending, income, or market exposure early — while you still have time to do something about them, not after.",
      ],
      [
        LineChart,
        "Score history",
        "Watch your Safety Score over time, so you can see at a glance whether your retirement is getting stronger or needs attention.",
      ],
      [
        Eye,
        "Plain-English checkups",
        "Each month you get a short summary in everyday language — what changed, what it means for you, and whether you need to do anything.",
      ],
      [
        ShieldCheck,
        "Calmer decisions",
        "Most months the answer is 'you're fine.' We tell you what truly deserves attention and what can safely wait.",
      ],
    ],
    faqs: [
      [
        "What gets monitored?",
        "Your spending assumptions, income, inflation, market sensitivity, and key dates like Medicare and tax thresholds — the signals that quietly affect whether your money lasts.",
      ],
      [
        "How often are alerts sent?",
        "We re-check your plan every month and send a short summary then. If something important changes in between, you'll hear from us — but we keep it to what matters, not noise.",
      ],
      [
        "Can I update my inputs?",
        "Yes. Whenever life changes — a move, a new expense, a change in income — refresh your answers and your score and plan update with you.",
      ],
    ],
  },
  "ai-coach": {
    eyebrow: "AI Coach",
    title: "Ask retirement questions and get understandable next steps.",
    subtitle: "Placeholder copy: the AI Coach turns complicated retirement tradeoffs into practical explanations, examples, and action lists.",
    cta: "Ask the AI Coach",
    href: "/upgrade",
    icon: Bot,
    visualTitle: "Coach conversation",
    visualMetric: "24/7",
    visualLabel: "Retirement Q&A",
    benefits: [
      [MessageCircleQuestion, "Everyday questions", "Placeholder copy for asking about spending, claiming, taxes, healthcare, and risk."],
      [Sparkles, "Action plans", "Placeholder copy for turning answers into a short checklist of next steps."],
      [LockKeyhole, "Privacy-minded", "Placeholder copy for keeping the experience educational and low-pressure."],
    ],
    faqs: [
      ["What can I ask?", "Placeholder answer: ask about retirement scenarios, tradeoffs, and what information to gather next."],
      ["Does the coach replace an advisor?", "Placeholder answer: no, it is educational support and does not replace professional advice."],
      ["Can it explain my Safety Score?", "Placeholder answer: placeholder copy for score-specific explanations and suggested improvements."],
    ],
  },
  "medicare-social-security": {
    eyebrow: "Medicare & Social Security",
    title: "Plan around two decisions that shape retirement income and costs.",
    subtitle: "Placeholder copy: understand claiming timing, Medicare cost traps, and the tradeoffs that can affect monthly cash flow.",
    cta: "Review my claiming and Medicare risks",
    href: "/quiz",
    icon: Landmark,
    visualTitle: "Benefit timing snapshot",
    visualMetric: "$410",
    visualLabel: "Placeholder monthly impact",
    benefits: [
      [Landmark, "Claiming tradeoffs", "Placeholder copy for comparing early, full retirement age, and delayed claiming."],
      [BadgeDollarSign, "IRMAA awareness", "Placeholder copy for spotting income levels that may increase Medicare premiums."],
      [Calculator, "Scenario planning", "Placeholder copy for seeing how timing decisions interact with spending and savings."],
      [HeartHandshake, "Household context", "Placeholder copy for coordinating benefits, healthcare, and survivor considerations."],
    ],
    faqs: [
      ["Will you tell me when to claim?", "Placeholder answer: RetireShield helps compare scenarios for education; it does not provide personalized legal or financial advice."],
      ["What is IRMAA?", "Placeholder answer: placeholder copy for Medicare income-related premium surcharges."],
      ["Can couples use this?", "Placeholder answer: placeholder copy for household-level planning considerations."],
    ],
  },
  "scam-shield": {
    eyebrow: "Scam Shield",
    title: "Recognize retirement scams before money leaves your hands.",
    subtitle: "Placeholder copy: Scam Shield highlights common fraud patterns and gives simple scripts for slowing down suspicious requests.",
    cta: "Turn on Scam Shield",
    href: "/upgrade",
    icon: ShieldAlert,
    visualTitle: "Suspicious request check",
    visualMetric: "High",
    visualLabel: "Pressure warning",
    benefits: [
      [ShieldAlert, "Fraud pattern spotting", "Placeholder copy for identifying impersonation, urgency, secrecy, and payment red flags."],
      [BellRing, "Timely reminders", "Placeholder copy for nudges around common Medicare, tax, and investment scam seasons."],
      [LockKeyhole, "Safer habits", "Placeholder copy for verification steps before sharing information or moving money."],
    ],
    faqs: [
      ["Can this block scams automatically?", "Placeholder answer: placeholder copy that Scam Shield educates and flags patterns but cannot guarantee prevention."],
      ["What if I already shared information?", "Placeholder answer: placeholder copy for immediate steps such as contacting institutions and trusted contacts."],
      ["Does this monitor my bank?", "Placeholder answer: placeholder copy: RetireShield does not require bank linking for these education tools."],
    ],
  },
} as const;

export const featureOrder: FeatureSlug[] = ["safety-score", "monitoring", "ai-coach", "medicare-social-security", "scam-shield"];
