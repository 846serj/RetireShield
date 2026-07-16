// Generates a personalized, prioritized retirement action plan from quiz answers + scores.
// Education only — never a specific buy/sell/allocation instruction (CLAUDE.md §5).

import type { Answers, Result } from "./scoring";

export type PlanItem = {
  area: string;
  priority: "High" | "Medium" | "Low";
  title: string;
  why: string;
  steps: string[];
};

const EFUND_MONTHS: Record<Answers["emergencyFund"], number> = { "0": 0, "1-3": 2, "3-6": 4.5, "6+": 7, skip: 0 };
const PRIORITY_RANK = { High: 0, Medium: 1, Low: 2 };

export function buildActionPlan(a: Answers, r: Result): PlanItem[] {
  const items: PlanItem[] = [];
  const coverage = a.essentialExpenses > 0 ? a.guaranteedIncome / a.essentialExpenses : 1;
  const gap = Math.max(0, a.essentialExpenses - a.guaranteedIncome);
  const targetEquity = Math.max(0, Math.min(100, 110 - a.age));

  // 1. Guaranteed income / Social Security timing
  if (r.sub.income < 85) {
    items.push({
      area: "Income",
      priority: r.sub.income < 50 ? "High" : "Medium",
      title: "Strengthen your guaranteed monthly income",
      why: `Your guaranteed income covers about ${Math.round(coverage * 100)}% of your essential expenses${
        gap > 0 ? ` — a roughly $${gap.toLocaleString()}/month gap you currently fund from savings.` : "."
      } The smaller that gap, the less a bad market year can hurt you.`,
      steps: [
        "Pull your Social Security statement at ssa.gov and note your estimated benefit at 62, full retirement age, and 70.",
        "Ask a fiduciary whether delaying Social Security raises your lifetime guaranteed income, given your health and other income.",
        a.status !== "retired"
          ? "Model what one or two more years of work would do to both your benefit and your savings."
          : "Ask a fiduciary whether covering part of the gap with guaranteed income fits your situation — as a question, not a product pitch.",
      ],
    });
  }

  // 2. Withdrawal sustainability
  if (r.sub.sustainability < 80 && gap > 0) {
    items.push({
      area: "Withdrawals",
      priority: r.sub.sustainability < 50 ? "High" : "Medium",
      title: "Make your savings last the gap",
      why: "Your savings may be stretched to cover the gap between income and expenses at a safe withdrawal pace.",
      steps: [
        "Write down a withdrawal order — which accounts you'll draw from first (taxable, then tax-deferred, then Roth is a common starting point to discuss).",
        "Pick a sustainable withdrawal rate to review with a fiduciary (the classic ~4% starting point is a conversation, not a rule).",
        "List every essential expense you could trim if markets drop, so you have a plan before you need it.",
      ],
    });
  }

  // 3. Emergency / cash buffer
  if (EFUND_MONTHS[a.emergencyFund] < 3) {
    items.push({
      area: "Cash buffer",
      priority: a.emergencyFund === "0" ? "High" : "Medium",
      title: "Build a cash cushion so you don't sell in a downturn",
      why: "A thin cash buffer forces you to sell investments at bad times. A cushion lets you ride out market dips.",
      steps: [
        "Aim to hold roughly 6–12 months of essential expenses in cash or a high-yield savings account.",
        "Compare HYSA rates — many pay far more than a standard bank savings account for the same safety.",
        "Automate a monthly transfer until the cushion is built.",
      ],
    });
  }

  // 4. Market-risk fit (education only)
  if (r.sub.market < 70) {
    items.push({
      area: "Risk fit",
      priority: r.sub.market < 45 ? "High" : "Low",
      title: "Check that your risk level fits your age and cushion",
      why: `You're about ${a.stockPct}% in stocks; a common age-based starting point would be near ${targetEquity}%. This is a 'what's appropriate for me' question, not a specific trade.`,
      steps: [
        "Note your current stock vs. safer-asset split.",
        "Have a 'what mix is appropriate for someone my age with my cushion?' conversation with a fiduciary — no allocation call here.",
        a.debt === "heavy" ? "Factor your debt load into that conversation — it raises your effective risk." : "Revisit the mix yearly, not on market headlines.",
      ],
    });
  }

  // 5. Inflation
  if (r.sub.inflation < 70) {
    items.push({
      area: "Inflation",
      priority: "Medium",
      title: "Protect against rising costs",
      why: "A large share of your income may not rise with inflation, so fixed costs eat into it over time.",
      steps: [
        "List which income sources have a cost-of-living adjustment (Social Security does) and which are fixed.",
        "Track your own biggest cost categories — groceries, utilities, insurance, medical — month to month.",
        "Build expected cost increases into your spending plan so they aren't a surprise.",
      ],
    });
  }

  // 6. Debt
  if (a.debt === "heavy") {
    items.push({
      area: "Debt",
      priority: "High",
      title: "Bring down high-cost debt",
      why: "Heavy debt in retirement is a guaranteed drain that competes with essentials.",
      steps: [
        "List every debt with its balance and interest rate.",
        "Target the highest-rate balances first while staying current on all minimums.",
        "Be cautious with debt-relief offers aimed at retirees — verify any company before sharing information.",
      ],
    });
  }

  // 7. Worry-specific
  if (a.worry === "healthcare") {
    items.push({
      area: "Healthcare",
      priority: "Medium",
      title: "Get ahead of healthcare costs",
      why: "Healthcare is one of the largest and least predictable retirement costs.",
      steps: [
        "Mark Medicare Open Enrollment (Oct 15 – Dec 7) and review your plan every year — the right plan changes.",
        "Estimate annual out-of-pocket costs and build them into your budget.",
        "Look into whether your state has programs that help with premiums or drug costs.",
      ],
    });
  }

  // 8. Always: scam safety (the universal one)
  items.push({
    area: "Fraud safety",
    priority: "Medium",
    title: "Lock down your scam defenses",
    why: "Older Americans are the top target for financial scams, and one mistake can undo years of saving.",
    steps: [
      "Confirm how your bank and the SSA actually contact you — and treat any unsolicited call, text, or email about your money as suspect.",
      "Freeze your credit at all three bureaus (it's free) if you're not actively applying for credit.",
      "Set up a trusted contact on your financial accounts.",
    ],
  });

  return items.sort((x, y) => PRIORITY_RANK[x.priority] - PRIORITY_RANK[y.priority]).slice(0, 6);
}
