import type { AIReport } from "@/lib/ai/report";
import { ACTION_LIB, type Result, type SubScores } from "@/lib/scoring";

export type ReportCompleteness = { answeredCount: number; totalApplicable: number; isComplete: boolean };

const weakAreaLabels: Record<keyof SubScores, string> = {
  income: "Guaranteed income vs. your monthly bills",
  withdrawal: "Making your savings last",
  inflation: "Keeping up with rising costs",
  market: "Your investment risk and cash cushion",
};

const subScoreLabels: Record<keyof SubScores, string> = {
  income: "Income Stability",
  withdrawal: "Withdrawal Sustainability",
  inflation: "Inflation Impact",
  market: "Market-Risk Buffer",
};

function escapeHtml(value: string | number): string {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function renderParagraph(text: string): string {
  return `<p style="margin:0;color:#1f2937;font-size:16px;line-height:1.65;">${escapeHtml(text).replace(/\n\n+/g, '</p><p style="margin:16px 0 0;color:#1f2937;font-size:16px;line-height:1.65;">').replace(/\n/g, "<br>")}</p>`;
}


function personalizedWeakAreaHtml(result: Result): string {
  const ranked = (Object.entries(result.sub) as [keyof SubScores, number][])
    .sort((a, b) => a[1] - b[1])
    .slice(0, 2);
  const [weakest, second] = ranked;
  return `
    <p style="margin:0;color:#1f2937;font-size:16px;line-height:1.65;"><strong>Your biggest gap: ${escapeHtml(weakAreaLabels[weakest[0]])} — ${escapeHtml(weakest[1])}/100.</strong> ${escapeHtml(ACTION_LIB[weakest[0]])}</p>
    ${second ? `<p style="margin:12px 0 0;color:#4b5563;font-size:15px;line-height:1.6;"><strong>Also worth a look:</strong> ${escapeHtml(weakAreaLabels[second[0]])} (${escapeHtml(second[1])}/100). ${escapeHtml(ACTION_LIB[second[0]])}</p>` : ""}`;
}

function completenessHtml(completeness?: ReportCompleteness): string {
  if (!completeness) return "";
  const text = completeness.isComplete
    ? `Based on ${completeness.answeredCount} of your answers.`
    : `Based on ${completeness.answeredCount} of your answers — come back anytime for a sharper score and a fuller plan.`;
  return `<p style="margin:18px 0 0;color:#4b5563;font-size:15px;line-height:1.6;font-weight:700;">${escapeHtml(text)}</p>`;
}

function priorityColor(priority: string): string {
  if (priority === "High") return "#b91c1c";
  if (priority === "Medium") return "#92400e";
  return "#166534";
}

export function renderReportHtml(
  result: Result,
  report: AIReport,
  firstName = "",
  completeness?: ReportCompleteness,
): string {
  const greeting = firstName.trim()
    ? `<p style="margin:0 0 20px;color:#1f2937;font-size:16px;line-height:1.65;">Hi ${escapeHtml(firstName.trim())},</p>`
    : "";
  const subScores = (Object.keys(subScoreLabels) as Array<keyof SubScores>)
    .map(
      (key) => `
      <tr>
        <td style="padding:16px 0;border-top:1px solid #e5e7eb;vertical-align:top;">
          <div style="font-size:16px;line-height:1.35;font-weight:700;color:#111827;">${escapeHtml(subScoreLabels[key])}</div>
          <div style="margin-top:6px;font-size:15px;line-height:1.55;color:#4b5563;">${escapeHtml(report.subScoreNotes[key])}</div>
        </td>
        <td style="padding:16px 0 16px 16px;border-top:1px solid #e5e7eb;vertical-align:top;text-align:right;white-space:nowrap;">
          <span style="display:inline-block;min-width:54px;border-radius:999px;background:#eef2ff;color:#3730a3;font-size:18px;line-height:1;font-weight:800;padding:10px 12px;text-align:center;">${escapeHtml(result.sub[key])}</span>
        </td>
      </tr>`,
    )
    .join("");

  const actionPlan = report.plan
    .map(
      (item) => `
      <li style="margin:0 0 20px;padding-left:2px;">
        <div style="font-size:16px;line-height:1.45;font-weight:800;color:#111827;">
          ${escapeHtml(item.title)}
          <span style="display:inline-block;margin-left:8px;border-radius:999px;background:#f9fafb;border:1px solid #e5e7eb;color:${priorityColor(item.priority)};font-size:12px;line-height:1;font-weight:800;padding:5px 8px;text-transform:uppercase;letter-spacing:.04em;vertical-align:middle;">${escapeHtml(item.priority)}</span>
        </div>
        <div style="margin-top:8px;font-size:15px;line-height:1.6;color:#374151;">${escapeHtml(item.why)}</div>
        <ul style="margin:10px 0 0 20px;padding:0;color:#374151;font-size:15px;line-height:1.6;">
          ${item.steps.map((step) => `<li style="margin:0 0 6px;">${escapeHtml(step)}</li>`).join("")}
        </ul>
      </li>`,
    )
    .join("");

  const fiduciaryQuestions = report.fiduciaryQuestions
    .map(
      (question) =>
        `<li style="margin:0 0 8px;color:#374151;font-size:16px;line-height:1.55;">${escapeHtml(question)}</li>`,
    )
    .join("");

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Your Retirement Safety Score</title>
  </head>
  <body style="margin:0;padding:0;background:#f3f4f6;color:#111827;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
    <div style="display:none;max-height:0;overflow:hidden;color:transparent;opacity:0;">Your Retirement Safety Score is ${escapeHtml(result.overall)} (${escapeHtml(result.band)}).</div>
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="width:100%;background:#f3f4f6;border-collapse:collapse;">
      <tr>
        <td align="center" style="padding:24px 12px;">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="width:100%;max-width:640px;background:#ffffff;border-collapse:collapse;border-radius:18px;overflow:hidden;">
            <tr>
              <td style="padding:32px 24px 26px;background:#ffffff;">
                <h1 style="margin:0 0 20px;color:#111827;font-size:28px;line-height:1.2;font-weight:800;">Your Retirement Safety Score</h1>
                ${greeting}
                <div style="padding:24px;border-radius:18px;background:#f8fafc;border:1px solid #e5e7eb;text-align:center;">
                  <div style="font-size:64px;line-height:1;font-weight:900;color:#111827;letter-spacing:-.04em;">${escapeHtml(result.overall)}</div>
                  <div style="margin-top:10px;font-size:18px;line-height:1.35;font-weight:800;color:#374151;">${escapeHtml(result.band)}</div>
                  ${completenessHtml(completeness)}
                </div>
              </td>
            </tr>
            <tr><td style="padding:0 24px 28px;"><h2 style="margin:0 0 12px;color:#111827;font-size:20px;line-height:1.3;font-weight:800;">What this means for you</h2>${renderParagraph(report.narrative)}</td></tr>
            <tr><td style="padding:0 24px 28px;"><h2 style="margin:0 0 12px;color:#111827;font-size:20px;line-height:1.3;font-weight:800;">Your biggest gaps</h2>${personalizedWeakAreaHtml(result)}</td></tr>
            <tr><td style="padding:0 24px 28px;"><h2 style="margin:0 0 8px;color:#111827;font-size:20px;line-height:1.3;font-weight:800;">Your sub-scores</h2><table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="width:100%;border-collapse:collapse;">${subScores}</table></td></tr>
            <tr><td style="padding:0 24px 28px;"><h2 style="margin:0 0 12px;color:#111827;font-size:20px;line-height:1.3;font-weight:800;">Your action plan</h2><ol style="margin:0;padding-left:22px;color:#111827;">${actionPlan}</ol></td></tr>
            <tr><td style="padding:0 24px 28px;"><h2 style="margin:0 0 12px;color:#111827;font-size:20px;line-height:1.3;font-weight:800;">Questions to ask a fiduciary</h2><ul style="margin:0;padding-left:22px;">${fiduciaryQuestions}</ul></td></tr>
            <tr><td style="padding:0 24px 28px;"><h2 style="margin:0 0 12px;color:#111827;font-size:20px;line-height:1.3;font-weight:800;">Stay scam-safe</h2>${renderParagraph(report.scamNote)}</td></tr>
            <tr><td style="padding:22px 24px;background:#f9fafb;border-top:1px solid #e5e7eb;color:#6b7280;font-size:13px;line-height:1.55;">Educational information only - not financial, tax, or legal advice. We will never ask you for an account number, Social Security number, password, or payment. American Signal Media, LLC, 598 West Interstate 30, Royse City, TX 75189.</td></tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}
