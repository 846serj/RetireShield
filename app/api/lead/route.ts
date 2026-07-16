import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { buildActionPlan } from "@/lib/actionPlan";
import {
  generateAIReport,
  buildFallbackReport,
  type AIReport,
} from "@/lib/ai/report";
import { addBeehiivSubscriber } from "@/lib/beehiiv";
import { renderReportHtml, type ReportCompleteness } from "@/lib/reportEmail";
import { sendTransactionalEmail } from "@/lib/resend";
import { ACTION_LIB, computeScores, type Answers, type Result, type SubScores } from "@/lib/scoring";

const REPORT_FOOTER_DISCLAIMER =
  "Educational information only - not financial, tax, or legal advice. We will never ask you for an account number, Social Security number, password, or payment. American Signal Media, LLC, 598 West Interstate 30, Royse City, TX 75189.";


const weakAreaLabels: Record<keyof SubScores, string> = {
  income: "Guaranteed income vs. your monthly bills",
  sustainability: "Making your savings last",
  inflation: "Keeping up with rising costs",
  market: "Investment risk and cash cushion",
  timing: "Social Security and retirement timing",
  reserves: "Emergency backstops and flexibility",
  taxes: "Tax diversification of your savings",
};

function personalizedWeakAreaLines(result: Result): string[] {
  const ranked = (Object.entries(result.sub) as [keyof SubScores, number][])
    .sort((a, b) => a[1] - b[1])
    .slice(0, 2);
  const [weakest, second] = ranked;
  const lines = [
    `Your biggest gap: ${weakAreaLabels[weakest[0]]} — ${weakest[1]}/100. ${ACTION_LIB[weakest[0]]}`,
  ];
  if (second) lines.push(`Also worth a look: ${weakAreaLabels[second[0]]} (${second[1]}/100). ${ACTION_LIB[second[0]]}`);
  return lines;
}

const subScoreLabels = {
  income: "Income Stability",
  sustainability: "Savings Sustainability",
  inflation: "Inflation Impact",
  market: "Market-Risk Buffer",
  timing: "Social Security Timing",
  reserves: "Emergency Reserves",
  taxes: "Tax Diversification",
} as const;

function renderReportText(
  result: Result,
  report: AIReport,
  firstName = "",
  completeness?: ReportCompleteness,
): string {
  const greeting = firstName ? [`Hi ${firstName},`, ""] : [];
  const subScores = (
    Object.keys(subScoreLabels) as Array<keyof typeof subScoreLabels>
  )
    .map(
      (key) =>
        `${subScoreLabels[key]}: ${result.sub[key]}\n${report.subScoreNotes[key]}`,
    )
    .join("\n\n");

  const actionPlan = report.plan
    .map((item, index) => {
      const steps = item.steps.map((step) => `   - ${step}`).join("\n");
      return `${index + 1}. ${item.title} (${item.priority})\n   Why: ${item.why}\n   Steps:\n${steps}`;
    })
    .join("\n\n");

  const fiduciaryQuestions = report.fiduciaryQuestions
    .map((question) => `- ${question}`)
    .join("\n");

  const completenessLines = completeness ? [completeness.isComplete ? `Based on ${completeness.answeredCount} of your answers.` : `Based on ${completeness.answeredCount} of your answers — come back anytime for a sharper score and a fuller plan.`, ""] : [];
  const weakAreaLines = personalizedWeakAreaLines(result);

  return [
    "Your Retirement Safety Score",
    ...greeting,
    `${result.overall} (${result.band})`,
    "",
    ...completenessLines,
    "What this means for you",
    report.narrative,
    "",
    "Your sub-scores",
    subScores,
    "",
    "Your biggest gaps",
    weakAreaLines.join("\n\n"),
    "",
    "Your action plan",
    actionPlan,
    "",
    "Questions to ask a fiduciary",
    fiduciaryQuestions,
    "",
    "Stay scam-safe",
    report.scamNote,
    "",
    REPORT_FOOTER_DISCLAIMER,
  ].join("\n");
}

function isValidEmail(email: unknown): email is string {
  return (
    typeof email === "string" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())
  );
}

// Saves a captured lead, returns the personalized report for the on-screen reveal,
// and best-effort sends newsletter + report emails. Account creation remains separate.
export async function POST(req: NextRequest) {
  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "bad json" }, { status: 400 });
  }

  const { email, answers, source, campaign } = body ?? {};
  const answeredCount = Number.isFinite(Number(body?.answeredCount)) ? Number(body.answeredCount) : undefined;
  const totalApplicable = Number.isFinite(Number(body?.totalApplicable)) ? Number(body.totalApplicable) : undefined;
  const completeness: ReportCompleteness | undefined = answeredCount && totalApplicable
    ? { answeredCount, totalApplicable, isComplete: body?.isComplete === true || answeredCount >= totalApplicable }
    : undefined;
  const firstName =
    typeof body?.firstName === "string" ? body.firstName.trim() : "";
  const subscribeNewsletter = body?.subscribeNewsletter ?? true;

  if (!isValidEmail(email)) {
    return NextResponse.json(
      { ok: false, error: "invalid email" },
      { status: 400 },
    );
  }

  const normalizedEmail = email.trim().toLowerCase();
  const normalizedSource = source ?? "direct";
  const normalizedCampaign = campaign ?? "";
  let result: Result;

  try {
    result = computeScores(answers as Answers);
  } catch (error) {
    console.error("lead scoring failed:", error);
    return NextResponse.json(
      { ok: false, error: "invalid answers" },
      { status: 400 },
    );
  }

  const rulePlan = buildActionPlan(answers as Answers, result);
  let report = buildFallbackReport(answers as Answers, result, rulePlan);

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const row = {
    email: normalizedEmail,
    first_name: firstName,
    answers,
    overall_score: result.overall,
    sub_scores: result.sub,
    band: result.band,
    source: normalizedSource,
    campaign: normalizedCampaign,
    created_at: new Date().toISOString(),
  };

  if (url && key) {
    try {
      const supabase = createClient(url, key);
      const { error } = await supabase.from("leads").insert(row);
      if (error) console.error("lead insert failed:", error.message);
    } catch (error) {
      console.error("lead insert failed:", error);
    }
  } else {
    console.log("[lead captured — no DB configured]", JSON.stringify(row));
  }

  if (subscribeNewsletter) {
    try {
      await addBeehiivSubscriber(normalizedEmail, {
        utmSource: normalizedSource,
        tier: "free",
        firstName,
      });
    } catch (error) {
      console.error("lead newsletter subscription failed:", error);
    }
  }

  try {
    report = await generateAIReport(answers as Answers, result, rulePlan);
    await sendTransactionalEmail({
      to: normalizedEmail,
      subject: "Your Retirement Safety Score",
      html: renderReportHtml(result, report, firstName, completeness),
      text: renderReportText(result, report, firstName, completeness),
    });
  } catch (error) {
    console.error("lead AI report email failed:", error);
  }

  return NextResponse.json({ ok: true, result, report });
}
