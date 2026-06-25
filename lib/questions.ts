// Single source of truth for the quiz UI. Keys map to lib/scoring.ts Answers.

export type Choice = { value: string | number; label: string };
export type Question =
  | { key: string; kind: "number"; prompt: string; placeholder?: string; min?: number; max?: number; prefix?: string; help?: string }
  | { key: string; kind: "choice"; prompt: string; choices: Choice[]; help?: string; defaultValue?: string | number }
  | { key: string; kind: "savingsAmount"; prompt: string; help?: string }
  | { key: string; kind: "socialSecurityDetails"; prompt: string; help?: string }
  | { key: string; kind: "state"; prompt: string; help?: string };

export const QUESTIONS: Question[] = [
  { key: "age", kind: "number", prompt: "What's your age?", min: 40, max: 100, placeholder: "67", help: "Your age helps us compare your savings mix and safety cushion to your stage of retirement." },
  {
    key: "filingStatus", kind: "choice", prompt: "What tax filing status should we keep on file?", help: "Optional, but helpful for future tax and Medicare estimates. Pick your best guess; this does not affect today's score.",
    choices: [
      { value: "single", label: "Single" },
      { value: "married_joint", label: "Married filing jointly" },
      { value: "married_separate", label: "Married filing separately" },
      { value: "head_of_household", label: "Head of household" },
      { value: "skip", label: "Skip for now" },
    ],
  },
  {
    key: "status", kind: "choice", prompt: "Where are you with retirement?", help: "Pick the answer that feels closest — this just sets context for your score.",
    choices: [
      { value: "working", label: "Still working" },
      { value: "near", label: "Near retirement" },
      { value: "retired", label: "Retired" },
    ],
  },
  {
    key: "guaranteedIncome", kind: "number", prefix: "$",
    prompt: "Your guaranteed monthly income (Social Security + pension + annuity)?", placeholder: "2,400", help: "Social Security + any pension or annuity. A rough number is fine.",
  },
  {
    key: "essentialExpenses", kind: "number", prefix: "$",
    prompt: "Your essential monthly expenses (housing, food, utilities, insurance, meds)?", placeholder: "3,200", help: "Think basics first: housing, food, utilities, insurance, prescriptions, and regular bills.",
  },
  {
    key: "savings", kind: "savingsAmount", prompt: "Roughly how much do you have in retirement savings?", help: "Use the quick ranges or type a closer dollar amount. We store the dollar estimate, not the range label.",
  },
  {
    key: "stockPct", kind: "choice", prompt: "About what share of your savings is in stocks?", help: "A best guess is enough. Include stock funds inside retirement accounts if you know them.",
    choices: [
      { value: 0, label: "None" }, { value: 25, label: "About a quarter" },
      { value: 50, label: "About half" }, { value: 75, label: "Most of it" }, { value: 100, label: "Almost all" },
    ],
  },
  {
    key: "emergencyFund", kind: "choice", prompt: "How many months of expenses do you keep in cash?", help: "Cash means money you can reach without selling investments, like checking, savings, or money market funds.",
    choices: [
      { value: "0", label: "None" }, { value: "1-3", label: "1–3 months" },
      { value: "3-6", label: "3–6 months" }, { value: "6+", label: "6+ months" },
    ],
  },
  {
    key: "debt", kind: "choice", prompt: "How would you describe your debt?", help: "Consider monthly payments and stress level, not just the balance.",
    choices: [
      { value: "none", label: "None to speak of" }, { value: "some", label: "Some" }, { value: "heavy", label: "A heavy load" },
    ],
  },
  {
    key: "socialSecurityDetails", kind: "socialSecurityDetails", prompt: "Optional: add Social Security details?", help: "These help future Social Security and spouse scenarios. Skip anything you do not know; today's score will not change.",
  },
  {
    key: "planning_horizon_age",
    kind: "choice",
    prompt: "To about what age should we make sure your money lasts?",
    help: "A rough number is fine — most plans use 95.",
    defaultValue: 95,
    choices: [
      { value: 85, label: "About 85" },
      { value: 90, label: "About 90" },
      { value: 95, label: "About 95" },
      { value: 100, label: "About 100" },
    ],
  },
  { key: "state", kind: "state", prompt: "Which state do you live in?", help: "Your state helps us account for broad cost-of-living differences." },
  {
    key: "worry", kind: "choice", prompt: "What worries you most?", help: "This lightly adjusts the lens of your score toward what matters most to you.",
    choices: [
      { value: "running_out", label: "Running out of money" },
      { value: "inflation", label: "Inflation / rising costs" },
      { value: "market", label: "A market crash" },
      { value: "scams", label: "Scams & fraud" },
      { value: "healthcare", label: "Healthcare costs" },
    ],
  },
];
