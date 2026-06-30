import type { PlanItem } from "@/lib/actionPlan";
import type { Answers, Result } from "@/lib/scoring";
import { getAnthropicClient, anthropicModel, timeoutSignal } from "./client";
import { SAFETY_SYSTEM } from "./guardrails";

export type AIReport = {
  narrative: string;
  subScoreNotes: {
    income: string;
    withdrawal: string;
    inflation: string;
    market: string;
  };
  plan: PlanItem[];
  fiduciaryQuestions: string[];
  scamNote: string;
};

const PRIORITIES = ["High", "Medium", "Low"] as const;
const WORRY_LABELS: Record<Answers["worry"], string> = {
  running_out: "running out of money",
  inflation: "inflation",
  market: "market volatility",
  scams: "scams and fraud",
  healthcare: "healthcare costs",
  skip: "retirement uncertainty",
};
const EMERGENCY_FUND_LABELS: Record<Answers["emergencyFund"], string> = {
  "0": "no dedicated emergency fund",
  "1-3": "about 1–3 months of emergency savings",
  "3-6": "about 3–6 months of emergency savings",
  "6+": "6+ months of emergency savings",
  skip: "no emergency-fund answer provided",
};
const DEBT_LABELS: Record<Answers["debt"], string> = {
  none: "no reported debt pressure",
  some: "some debt",
  heavy: "heavy debt",
  skip: "no debt answer provided",
};

function isPlanItem(value: unknown): value is PlanItem {
  const item = value as PlanItem;
  return !!item && typeof item.area === "string" && PRIORITIES.includes(item.priority) &&
    typeof item.title === "string" && typeof item.why === "string" &&
    Array.isArray(item.steps) && item.steps.length > 0 && item.steps.every((s) => typeof s === "string" && s.trim().length > 0);
}

function extractJson(text: string): unknown {
  const trimmed = text.trim();
  try { return JSON.parse(trimmed); } catch {}
  const match = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (match) return JSON.parse(match[1]);
  return JSON.parse(trimmed.slice(trimmed.indexOf("{"), trimmed.lastIndexOf("}") + 1));
}

function responseText(message: any): string {
  return (message?.content ?? [])
    .filter((part: any) => part?.type === "text" && typeof part.text === "string")
    .map((part: any) => part.text)
    .join("\n");
}

function dollars(value: number): string {
  return `$${Math.round(Math.max(0, value)).toLocaleString()}`;
}

function pct(value: number): string {
  return `${Math.round(value)}%`;
}

function coveragePercent(answers: Answers): number {
  return answers.essentialExpenses > 0 ? (answers.guaranteedIncome / answers.essentialExpenses) * 100 : 100;
}

function monthlyGap(answers: Answers): number {
  return Math.max(0, answers.essentialExpenses - answers.guaranteedIncome);
}

function ageAppropriateEquity(answers: Answers): number {
  return Math.max(20, Math.min(90, 110 - answers.age));
}

function retirementStage(answers: Answers): string {
  if (answers.status === "retired") return "retired";
  if (answers.status === "near") return "near retirement";
  return "still working";
}

function contextualFacts(answers: Answers): string[] {
  const facts = [
    `Age: ${answers.age}`,
    `Marital status: ${answers.maritalStatus ?? "not provided"}`,
    `Retirement stage: ${retirementStage(answers)}`,
    `Guaranteed income: ${dollars(answers.guaranteedIncome)}/month`,
    `Essential expenses: ${dollars(answers.essentialExpenses)}/month`,
    `Guaranteed-income coverage: ${pct(coveragePercent(answers))}`,
    `Exact monthly gap: ${dollars(monthlyGap(answers))}`,
    `Savings: ${dollars(answers.savings)}`,
    `Stock exposure: ${answers.stockPct}% vs age-appropriate reference level about ${ageAppropriateEquity(answers)}%`,
    `Emergency fund: ${EMERGENCY_FUND_LABELS[answers.emergencyFund]}`,
    `Debt: ${DEBT_LABELS[answers.debt]}`,
    `State: ${answers.state ?? "not provided"}`,
    `#1 worry: ${WORRY_LABELS[answers.worry]}`,
  ];
  if (answers.ssaBenefitEstimate) facts.push(`Social Security estimate: ${dollars(answers.ssaBenefitEstimate)}/month`);
  if (answers.claimedSocialSecurity && answers.claimedSocialSecurity !== "skip") facts.push(`Claimed Social Security: ${answers.claimedSocialSecurity}`);
  if (answers.hasPension && answers.hasPension !== "skip") facts.push(`Has pension: ${answers.hasPension}`);
  if (answers.pensionAmount) facts.push(`Pension amount: ${dollars(answers.pensionAmount)}/month`);
  if (answers.pensionHasCola && answers.pensionHasCola !== "skip") facts.push(`Pension COLA: ${answers.pensionHasCola}`);
  if (answers.pensionSurvivorPct) facts.push(`Pension survivor benefit: ${answers.pensionSurvivorPct}%`);
  if (answers.ownsHome && answers.ownsHome !== "skip") facts.push(`Owns home: ${answers.ownsHome}`);
  if (answers.homeEquity) facts.push(`Home equity: ${dollars(answers.homeEquity)}`);
  if (answers.planToDownsize && answers.planToDownsize !== "skip") facts.push(`Plans to downsize: ${answers.planToDownsize}`);
  return facts;
}

function isAIReport(value: unknown): value is AIReport {
  const report = value as AIReport;
  return !!report && typeof report.narrative === "string" && report.narrative.trim().length > 0 &&
    !!report.subScoreNotes && ["income", "withdrawal", "inflation", "market"].every((key) => typeof report.subScoreNotes[key as keyof AIReport["subScoreNotes"]] === "string" && report.subScoreNotes[key as keyof AIReport["subScoreNotes"]].trim().length > 0) &&
    Array.isArray(report.plan) && report.plan.length > 0 && report.plan.every(isPlanItem) &&
    Array.isArray(report.fiduciaryQuestions) && report.fiduciaryQuestions.length > 0 && report.fiduciaryQuestions.every((q) => typeof q === "string" && q.trim().length > 0) &&
    typeof report.scamNote === "string" && report.scamNote.trim().length > 0;
}

export function buildFallbackReport(answers: Answers, result: Result, rulePlan: PlanItem[]): AIReport {
  const coverage = coveragePercent(answers);
  const gap = monthlyGap(answers);
  const targetEquity = ageAppropriateEquity(answers);
  const worry = WORRY_LABELS[answers.worry];
  const stateText = answers.state ? ` in ${answers.state.toUpperCase()}` : "";

  return {
    narrative: `At age ${answers.age}, ${retirementStage(answers)}${answers.maritalStatus ? ` and ${answers.maritalStatus}` : ""}, your guaranteed income covers about ${pct(coverage)} of your ${dollars(answers.essentialExpenses)}/month essentials, leaving an exact monthly gap of ${dollars(gap)}. You reported ${dollars(answers.savings)} in savings, ${answers.stockPct}% in stocks versus an age-based reference level near ${targetEquity}%, ${EMERGENCY_FUND_LABELS[answers.emergencyFund]}, and ${DEBT_LABELS[answers.debt]}${stateText}; your #1 worry is ${worry}. This report is education only and is meant to help you prepare better questions for a fiduciary.`,
    subScoreNotes: {
      income: `Income scored ${result.sub.income} because guaranteed income covers about ${pct(coverage)} of essentials, leaving ${gap > 0 ? `${dollars(gap)} per month to cover from savings or other sources` : "no monthly essentials gap"}.`,
      withdrawal: `Withdrawal scored ${result.sub.withdrawal} because your ${dollars(answers.savings)} in savings must be viewed against the ${dollars(gap)} monthly gap and your planning horizon.`,
      inflation: `Inflation scored ${result.sub.inflation} because fixed income and essentials${answers.state ? ` in ${answers.state.toUpperCase()}` : ""} can lose buying power over time, especially when your main worry is ${worry}.`,
      market: `Market scored ${result.sub.market} because you reported ${answers.stockPct}% in stocks versus an age-based reference near ${targetEquity}%, plus ${EMERGENCY_FUND_LABELS[answers.emergencyFund]} and ${DEBT_LABELS[answers.debt]}.`,
    },
    plan: rulePlan,
    fiduciaryQuestions: [
      `Given my ${dollars(gap)} monthly essentials gap, what education-based options should I compare for making savings last without relying on a product pitch?`,
      `How should I think about Social Security timing, pension details, and other guaranteed income in relation to my essentials?`,
      `Is my current risk level reasonable to discuss for someone age ${answers.age} with ${answers.stockPct}% in stocks, ${EMERGENCY_FUND_LABELS[answers.emergencyFund]}, and ${DEBT_LABELS[answers.debt]}?`,
      `What tax, healthcare, inflation, or state-specific issues${stateText} should I understand before changing my retirement spending plan?`,
    ],
    scamNote: "Be cautious with unsolicited calls, texts, emails, or seminars about retirement money, especially anything requiring quick action or personal information. RetireShield will never ask for account numbers, Social Security numbers, passwords, or payments.",
  };
}

export async function generateAIReport(answers: Answers, result: Result, rulePlan: PlanItem[]): Promise<AIReport> {
  try {
    const client = await getAnthropicClient();
    if (!client) return buildFallbackReport(answers, result, rulePlan);

    const message = await client.messages.create({
      model: anthropicModel,
      max_tokens: 2600,
      temperature: 0.3,
      system: SAFETY_SYSTEM,
      messages: [{
        role: "user",
        content: `Create a personalized RetireShield AIReport for this user. Return ONLY strict JSON matching this exact TypeScript shape and no markdown: {"narrative": string, "subScoreNotes": {"income": string, "withdrawal": string, "inflation": string, "market": string}, "plan": {"area": string, "priority": "High"|"Medium"|"Low", "title": string, "why": string, "steps": string[]}[], "fiduciaryQuestions": string[], "scamNote": string}.

Ground EVERYTHING in the user's actual numbers and facts below. The narrative and every subScoreNotes sentence must read as written FOR THEM, not generic. Explicitly reference their age, marital status, retirement stage, guaranteed-income-vs-essentials coverage percentage, exact monthly gap, savings, stock percentage versus the age-appropriate reference level, emergency fund, debt, state cost-of-living context, pension/home/Social Security details when present, and their stated #1 worry.

Rules:
- subScoreNotes: one plain-English sentence per sub-score explaining what drove THEIR number.
- plan: provide 5–6 PlanItem objects, built on and improving the supplied rulePlan, prioritized, education only.
- fiduciaryQuestions: provide 3–5 concrete questions THIS person should ask a fiduciary, tied to their gaps.
- scamNote: 1–2 protective sentences tuned to their worry and state.
- Obey the system guardrails: no specific buy/sell/allocation/product advice; only concepts, factors, and questions.

User facts:
${contextualFacts(answers).map((fact) => `- ${fact}`).join("\n")}

Scores: ${JSON.stringify(result)}
Answers: ${JSON.stringify(answers)}
Supplied rulePlan: ${JSON.stringify(rulePlan)}`,
      }],
    }, { signal: timeoutSignal() });

    const parsed = extractJson(responseText(message));
    if (!isAIReport(parsed)) return buildFallbackReport(answers, result, rulePlan);
    return { ...parsed, plan: parsed.plan.slice(0, 6) };
  } catch (error) {
    console.error("AI report failed", error);
    return buildFallbackReport(answers, result, rulePlan);
  }
}
