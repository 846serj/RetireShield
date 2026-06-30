import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { addBeehiivSubscriber } from "@/lib/beehiiv";
import { sendTransactionalEmail } from "@/lib/resend";
import { actions, computeScores, type Answers, type Result, type SubScores } from "@/lib/scoring";

function isValidEmail(email: unknown): email is string {
  return typeof email === "string" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function subScoreLabel(key: keyof SubScores) {
  const labels: Record<keyof SubScores, string> = {
    income: "Income Stability",
    withdrawal: "Withdrawal Sustainability",
    inflation: "Inflation Impact",
    market: "Market-Risk Buffer",
  };
  return labels[key];
}

function buildReportEmailHtml(result: Result, nextSteps: string[]) {
  const subScores = (Object.entries(result.sub) as [keyof SubScores, number][])
    .map(
      ([key, value]) =>
        `<tr><td style="padding:10px 12px;border-bottom:1px solid #e2e8f0;color:#334155">${subScoreLabel(key)}</td><td style="padding:10px 12px;border-bottom:1px solid #e2e8f0;text-align:right;font-weight:700;color:#0f172a">${value}</td></tr>`,
    )
    .join("");
  const steps = nextSteps.map((step) => `<li style="margin:0 0 10px 0;padding-left:4px">${escapeHtml(step)}</li>`).join("");

  return `
    <div style="margin:0;padding:0;background:#f8fafc;font-family:Arial,Helvetica,sans-serif;color:#0f172a;line-height:1.6">
      <div style="max-width:640px;margin:0 auto;padding:28px 18px">
        <div style="background:#ffffff;border:1px solid #e2e8f0;border-radius:18px;overflow:hidden">
          <div style="padding:28px 30px;background:#0f172a;color:#ffffff">
            <p style="margin:0 0 8px 0;font-size:13px;letter-spacing:0.08em;text-transform:uppercase;color:#bae6fd">RetireShield</p>
            <h1 style="margin:0;font-size:30px;line-height:1.2">Your Retirement Safety Score</h1>
          </div>
          <div style="padding:30px">
            <p style="margin:0 0 18px 0;font-size:17px;color:#334155">Your overall score is:</p>
            <div style="margin:0 0 24px 0;padding:22px;border-radius:16px;background:#ecfeff;border:1px solid #a5f3fc;text-align:center">
              <div style="font-size:56px;line-height:1;font-weight:800;color:#0e7490">${result.overall}</div>
              <div style="margin-top:8px;font-size:18px;font-weight:700;color:#155e75">${escapeHtml(result.band)}</div>
            </div>
            <h2 style="margin:0 0 12px 0;font-size:22px;color:#0f172a">Sub-scores</h2>
            <table role="presentation" cellspacing="0" cellpadding="0" style="width:100%;border-collapse:collapse;margin:0 0 26px 0;border:1px solid #e2e8f0;border-radius:12px;overflow:hidden">
              <tbody>${subScores}</tbody>
            </table>
            <h2 style="margin:0 0 12px 0;font-size:22px;color:#0f172a">Your 3 next steps</h2>
            <ol style="margin:0 0 26px 22px;padding:0;color:#334155;font-size:16px">${steps}</ol>
            <p style="margin:0;padding-top:18px;border-top:1px solid #e2e8f0;font-size:13px;color:#64748b">This is educational, not financial advice.</p>
          </div>
        </div>
      </div>
    </div>`;
}

// Saves a captured lead. Account creation is an explicit optional password step after results.
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
  const scoreResult = computeScores(answers as Answers);
  const nextSteps = actions(answers as Answers, scoreResult);
  const row = {
    email: normalizedEmail,
    answers,
    overall_score: scoreResult.overall,
    sub_scores: scoreResult.sub,
    band: scoreResult.band,
    source: source ?? "direct",
    campaign: campaign ?? "",
    created_at: new Date().toISOString(),
  };

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (url && key) {
    const supabase = createClient(url, key);
    const { error } = await supabase.from("leads").insert(row);
    if (error) {
      console.error("lead insert failed:", error.message);
      return NextResponse.json({ ok: false, error: "db" }, { status: 500 });
    }
  } else {
    console.log("[lead captured — no DB configured]", JSON.stringify(row));
  }

  if (subscribeNewsletter === true) {
    try {
      await addBeehiivSubscriber(normalizedEmail, { utmSource: source ?? "direct", tier: "free" });
    } catch (error) {
      console.error("lead newsletter subscription failed:", error);
    }
  }

  try {
    await sendTransactionalEmail({
      to: normalizedEmail,
      subject: "Your Retirement Safety Score",
      html: buildReportEmailHtml(scoreResult, nextSteps),
    });
  } catch (error) {
    console.error("lead report email failed:", error);
  }

  return NextResponse.json({
    ok: true,
    verificationEmailSent: false,
    verificationEmailRateLimited: false,
  });
}
