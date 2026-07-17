// Single source of truth for the quiz UI. Keys map to lib/scoring.ts Answers.

type AnswerMap = Record<string, string | number | undefined>;
type Conditional = { when?: (answers: AnswerMap) => boolean };

export type Choice = { value: string | number; label: string };
export type Question = Conditional &
  { core?: boolean } &
  (
    | {
        key: string;
        kind: "choice";
        prompt: string;
        choices: Choice[];
        help?: string;
        defaultValue?: string | number;
      }
    | { key: string; kind: "state"; prompt: string; help?: string }
  );

const isMarried = (answers: AnswerMap) => answers.maritalStatus === "married";
const isPreRetirement = (answers: AnswerMap) =>
  answers.status === "working" || answers.status === "near";
const hasPension = (answers: AnswerMap) => answers.hasPension === "yes";
const ownsHome = (answers: AnswerMap) => answers.ownsHome === "yes";

const AGE_CHOICES: Choice[] = [
  { value: 45, label: "40–49" },
  { value: 55, label: "50–59" },
  { value: 62, label: "60–64" },
  { value: 67, label: "65–69" },
  { value: 72, label: "70–74" },
  { value: 80, label: "75+" },
];

const RETIREMENT_AGE_CHOICES: Choice[] = [
  { value: 62, label: "Before 65" },
  { value: 67, label: "65–69" },
  { value: 72, label: "70–74" },
  { value: 75, label: "75+" },
  { value: 67.001, label: "Not sure" },
];

const MONTHLY_INCOME_CHOICES: Choice[] = [
  { value: 500, label: "Under $1,000/mo" },
  { value: 1500, label: "$1,000–$1,999/mo" },
  { value: 2500, label: "$2,000–$2,999/mo" },
  { value: 3500, label: "$3,000–$3,999/mo" },
  { value: 5000, label: "$4,000–$5,999/mo" },
  { value: 7000, label: "$6,000–$7,999/mo" },
  { value: 9000, label: "$8,000–$9,999/mo" },
  { value: 12000, label: "$10,000+/mo" },
];

const MONTHLY_EXPENSE_CHOICES: Choice[] = [
  { value: 1500, label: "Under $2,000/mo" },
  { value: 2500, label: "$2,000–$2,999/mo" },
  { value: 3500, label: "$3,000–$3,999/mo" },
  { value: 5000, label: "$4,000–$5,999/mo" },
  { value: 7000, label: "$6,000–$7,999/mo" },
  { value: 9000, label: "$8,000+/mo" },
];

const DESIRED_LIFESTYLE_SPENDING_CHOICES: Choice[] = [
  { value: 2500, label: "Under $3,000/mo" },
  { value: 4000, label: "$3,000–$4,999/mo" },
  { value: 6000, label: "$5,000–$6,999/mo" },
  { value: 8500, label: "$7,000–$9,999/mo" },
  { value: 11000, label: "$10,000+/mo" },
  { value: 5000, label: "Not sure" },
];

const SAVINGS_CHOICES: Choice[] = [
  { value: 25000, label: "Under $50k" },
  { value: 100000, label: "$50k–$150k" },
  { value: 325000, label: "$150k–$500k" },
  { value: 750000, label: "$500k–$1M" },
  { value: 1500000, label: "Over $1M" },
];

const SOCIAL_SECURITY_CHOICES: Choice[] = [
  { value: 750, label: "Under $1,000/mo" },
  { value: 1250, label: "$1,000–$1,499/mo" },
  { value: 1750, label: "$1,500–$1,999/mo" },
  { value: 2250, label: "$2,000–$2,499/mo" },
  { value: 2750, label: "$2,500–$2,999/mo" },
  { value: 3500, label: "$3,000+/mo" },
  { value: 1800, label: "Not sure" },
];

const PENSION_CHOICES: Choice[] = [
  { value: 250, label: "Under $500/mo" },
  { value: 750, label: "$500–$999/mo" },
  { value: 1500, label: "$1,000–$1,999/mo" },
  { value: 2500, label: "$2,000–$2,999/mo" },
  { value: 3500, label: "$3,000+/mo" },
  { value: 1000, label: "Not sure" },
];

const SURVIVOR_PCT_CHOICES: Choice[] = [
  { value: 0, label: "0% / none" },
  { value: 50, label: "50%" },
  { value: 75, label: "75%" },
  { value: 100, label: "100%" },
  { value: 50.001, label: "Not sure" },
];

const HOME_EQUITY_CHOICES: Choice[] = [
  { value: 50000, label: "Under $100k" },
  { value: 175000, label: "$100k–$249k" },
  { value: 375000, label: "$250k–$499k" },
  { value: 750000, label: "$500k–$999k" },
  { value: 1250000, label: "$1M+" },
  { value: 0, label: "Not sure" },
];

const ACCOUNT_BALANCE_CHOICES: Choice[] = [
  { value: 0, label: "$0 / none" },
  { value: 25000, label: "Under $50k" },
  { value: 100000, label: "$50k–$150k" },
  { value: 325000, label: "$150k–$500k" },
  { value: 750000, label: "$500k–$1M" },
  { value: 1500000, label: "Over $1M" },
  { value: 0, label: "Not sure" },
];

export const CORE_KEYS = [
  "age",
  "maritalStatus",
  "status",
  "guaranteedIncome",
  "essentialExpenses",
  "desiredLifestyleSpending",
  "savings",
  "stockPct",
] as const;

export const QUESTIONS: Question[] = [
  {
    key: "age",
    core: true,
    kind: "choice",
    prompt: "What's your age?",
    help: "Choose the range that includes your current age; we use the midpoint for scoring.",
    choices: AGE_CHOICES,
  },
  {
    key: "maritalStatus",
    core: true,
    kind: "choice",
    prompt: "What's your marital status?",
    help: "This helps us ask only the household questions that apply to you.",
    choices: [
      { value: "single", label: "Single" },
      { value: "married", label: "Married" },
      { value: "widowed", label: "Widowed" },
      { value: "divorced", label: "Divorced" },
    ],
  },
  {
    key: "status",
    core: true,
    kind: "choice",
    prompt: "Where are you with retirement?",
    help: "Pick the answer that feels closest — this just sets context for your score.",
    choices: [
      { value: "working", label: "Still working" },
      { value: "near", label: "Near retirement" },
      { value: "retired", label: "Retired" },
    ],
  },
  {
    key: "savings",
    core: true,
    kind: "choice",
    prompt: "Roughly how much do you have in retirement savings?",
    help: "Choose the range that best matches your total retirement savings; we use a representative dollar estimate.",
    choices: SAVINGS_CHOICES,
  },
  {
    key: "guaranteedIncome",
    core: true,
    kind: "choice",
    prompt:
      "In retirement, what guaranteed monthly income do you get — or expect to get — from Social Security, pension, or annuity?",
    help: "If you're retired, use what you receive now. Still working? Use your best guess for what these will pay once you retire — your Social Security statement is a good source.",
    choices: MONTHLY_INCOME_CHOICES,
  },
  {
    key: "essentialExpenses",
    core: true,
    kind: "choice",
    prompt:
      "Your essential monthly expenses (housing, food, utilities, insurance, meds)?",
    help: "Choose the range that best matches monthly basics: housing, food, utilities, insurance, prescriptions, and regular bills.",
    choices: MONTHLY_EXPENSE_CHOICES,
  },
  {
    key: "desiredLifestyleSpending",
    core: true,
    kind: "choice",
    prompt:
      "In total, about how much would you like to spend each month to truly enjoy retirement — the basics plus travel, hobbies, time with family, dining out?",
    help: "Your best guess for your total monthly spending — essentials included — that would make retirement feel comfortable, not just covered.",
    choices: DESIRED_LIFESTYLE_SPENDING_CHOICES,
  },
  {
    key: "ssaBenefitEstimate",
    kind: "choice",
    prompt: "Your estimated Social Security benefit ($/mo)?",
    help: "Choose your latest SSA estimate or current check range, or Not sure for a conservative default.",
    choices: SOCIAL_SECURITY_CHOICES,
  },
  {
    key: "claimedSocialSecurity",
    kind: "choice",
    prompt: "Have you claimed Social Security yet?",
    help: "Choose whether you have already started your own Social Security retirement benefit.",
    choices: [
      { value: "no", label: "Not yet" },
      { value: "yes", label: "Yes" },
    ],
  },
  {
    key: "spouseAge",
    kind: "choice",
    prompt: "How old is your spouse?",
    help: "Choose the range that includes your spouse's current age, or Not sure if you do not know.",
    choices: [...AGE_CHOICES, { value: 67.001, label: "Not sure" }],
    when: isMarried,
  },
  {
    key: "spouseSsaBenefitEstimate",
    kind: "choice",
    prompt: "Your spouse's estimated Social Security benefit ($/mo)?",
    help: "Choose their latest SSA estimate or current check range, or Not sure for a conservative default.",
    choices: SOCIAL_SECURITY_CHOICES,
    when: isMarried,
  },
  {
    key: "targetRetirementAge",
    kind: "choice",
    prompt: "At what age do you hope to retire?",
    help: "Choose the range closest to your planned retirement age, or Not sure for a standard age-67 assumption.",
    choices: RETIREMENT_AGE_CHOICES,
    when: isPreRetirement,
  },
  {
    key: "hasPension",
    kind: "choice",
    prompt: "Do you have a pension?",
    help: "Answer yes if you expect a monthly pension separate from Social Security.",
    choices: [
      { value: "yes", label: "Yes" },
      { value: "no", label: "No" },
    ],
  },
  {
    key: "pensionAmount",
    kind: "choice",
    prompt: "How much is the pension per month?",
    help: "Choose the expected or current monthly amount before tax, or Not sure if you do not know.",
    choices: PENSION_CHOICES,
    when: hasPension,
  },
  {
    key: "pensionHasCola",
    kind: "choice",
    prompt: "Does that pension have cost-of-living increases?",
    help: "Choose whether the pension adjusts for inflation; Not sure uses a safe no-COLA assumption.",
    choices: [
      { value: "yes", label: "Yes" },
      { value: "no", label: "No" },
      { value: "no", label: "Not sure" },
    ],
    when: hasPension,
  },
  {
    key: "pensionSurvivorPct",
    kind: "choice",
    prompt: "What survivor percent would continue for a spouse?",
    help: "Choose the percentage that would continue to a spouse; Not sure uses 50%.",
    choices: SURVIVOR_PCT_CHOICES,
    when: hasPension,
  },
  {
    key: "ownsHome",
    kind: "choice",
    prompt: "Do you own your home?",
    help: "This lets us ask home-equity follow-ups only when relevant.",
    choices: [
      { value: "yes", label: "Yes" },
      { value: "no", label: "No" },
    ],
  },
  {
    key: "homeEquity",
    kind: "choice",
    prompt: "About how much home equity do you have?",
    help: "Choose your estimated home value minus mortgage debt, or Not sure if you do not know.",
    choices: HOME_EQUITY_CHOICES,
    when: ownsHome,
  },
  {
    key: "planToDownsize",
    kind: "choice",
    prompt: "Do you plan to downsize or sell later?",
    help: "Choose your current expectation; Not sure keeps a conservative no-downsize assumption.",
    choices: [
      { value: "yes", label: "Yes" },
      { value: "no", label: "No" },
      { value: "no", label: "Not sure" },
    ],
    when: ownsHome,
  },
  {
    key: "balance_taxable",
    kind: "choice",
    prompt: "How much is in taxable brokerage/savings?",
    help: "Choose the closest taxable brokerage or savings range, or Not sure if you do not know the split.",
    choices: ACCOUNT_BALANCE_CHOICES,
  },
  {
    key: "balance_tax_deferred",
    kind: "choice",
    prompt: "How much is in IRA/401(k)/tax-deferred accounts?",
    help: "Choose the closest IRA, 401(k), or tax-deferred range, or Not sure if you do not know the split.",
    choices: ACCOUNT_BALANCE_CHOICES,
  },
  {
    key: "balance_roth",
    kind: "choice",
    prompt: "How much is in Roth accounts?",
    help: "Choose the closest Roth account range, or Not sure if you do not know the split.",
    choices: ACCOUNT_BALANCE_CHOICES,
  },
  {
    key: "stockPct",
    core: true,
    kind: "choice",
    prompt: "About what share of your savings is in stocks?",
    help: "A best guess is enough. Include stock funds inside retirement accounts if you know them.",
    choices: [
      { value: 0, label: "None" },
      { value: 25, label: "About a quarter" },
      { value: 50, label: "About half" },
      { value: 75, label: "Most of it" },
      { value: 100, label: "Almost all" },
    ],
  },
  {
    key: "emergencyFund",
    kind: "choice",
    prompt: "How many months of expenses do you keep in cash?",
    help: "Cash means money you can reach without selling investments, like checking, savings, or money market funds.",
    choices: [
      { value: "0", label: "None" },
      { value: "1-3", label: "1–3 months" },
      { value: "3-6", label: "3–6 months" },
      { value: "6+", label: "6+ months" },
    ],
  },
  {
    key: "debt",
    kind: "choice",
    prompt: "How would you describe your debt?",
    help: "Consider monthly payments and stress level, not just the balance.",
    choices: [
      { value: "none", label: "None to speak of" },
      { value: "some", label: "Some" },
      { value: "heavy", label: "A heavy load" },
    ],
  },
  {
    key: "filingStatus",
    kind: "choice",
    prompt: "What tax filing status should we keep on file?",
    help: "Pick your best guess for future tax and Medicare estimates; this does not affect today's score.",
    choices: [
      { value: "single", label: "Single" },
      { value: "married_joint", label: "Married filing jointly" },
      { value: "married_separate", label: "Married filing separately" },
      { value: "head_of_household", label: "Head of household" },
    ],
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
  {
    key: "state",
    kind: "state",
    prompt: "Which state do you live in?",
    help: "Your state helps us account for broad cost-of-living differences.",
  },
  {
    key: "worry",
    kind: "choice",
    prompt: "What worries you most?",
    help: "This lightly adjusts the lens of your score toward what matters most to you.",
    choices: [
      { value: "running_out", label: "Running out of money" },
      { value: "inflation", label: "Inflation / rising costs" },
      { value: "market", label: "A market crash" },
      { value: "scams", label: "Scams & fraud" },
      { value: "healthcare", label: "Healthcare costs" },
    ],
  },
];
