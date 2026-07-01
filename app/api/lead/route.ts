import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { buildActionPlan } from "@/lib/actionPlan";
import { generateAIReport, buildFallbackReport } from "@/lib/ai/report";
import { addBeehiivSubscriber } from "@/lib/beehiiv";
import { renderReportHtml } from "@/lib/reportEmail";
import { sendTransactionalEmail } from "@/lib/resend";
import { computeScores, type Answers, type Result } from "@/lib/scoring";

function isValidEmail(email: unknown): email is string {
  return typeof email === "string" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
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
  const subscribeNewsletter = body?.subscribeNewsletter ?? true;

  if (!isValidEmail(email)) {
    return NextResponse.json({ ok: false, error: "invalid email" }, { status: 400 });
  }

  const normalizedEmail = email.trim().toLowerCase();
  const normalizedSource = source ?? "direct";
  const normalizedCampaign = campaign ?? "";
  let result: Result;

  try {
    result = computeScores(answers as Answers);
  } catch (error) {
    console.error("lead scoring failed:", error);
    return NextResponse.json({ ok: false, error: "invalid answers" }, { status: 400 });
  }

  const rulePlan = buildActionPlan(answers as Answers, result);
  let report = buildFallbackReport(answers as Answers, result, rulePlan);

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const row = {
    email: normalizedEmail,
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
      await addBeehiivSubscriber(normalizedEmail, { utmSource: normalizedSource, tier: "free" });
    } catch (error) {
      console.error("lead newsletter subscription failed:", error);
    }
  }

  try {
    report = await generateAIReport(answers as Answers, result, rulePlan);
    await sendTransactionalEmail({
      to: normalizedEmail,
      subject: "Your Retirement Safety Score",
      html: renderReportHtml(result, report),
    });
  } catch (error) {
    console.error("lead AI report email failed:", error);
  }

  return NextResponse.json({ ok: true, result, report });
}
