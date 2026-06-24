import { addBeehiivSubscriber } from "@/lib/beehiiv";
import { sendTransactionalEmail } from "@/lib/resend";

export type EmailSegment = "free" | "trialing" | "paid" | "free-only";

const BEEHIIV_API_BASE = "https://api.beehiiv.com/v2";

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

export async function upsertContact(email: string, segment: EmailSegment) {
  return addBeehiivSubscriber(email, { tier: segment });
}

export async function sendToList(email: string, segment: EmailSegment) {
  return addBeehiivSubscriber(email, { tier: segment });
}

export async function enrollInWinback(email: string) {
  try {
    const apiKey = process.env.BEEHIIV_API_KEY;
    const publicationId = process.env.BEEHIIV_PUBLICATION_ID;
    const automationId = process.env.BEEHIIV_WINBACK_AUTOMATION_ID;

    if (!apiKey || !publicationId || !automationId) {
      console.log("[Beehiiv stub] skipping win-back enrollment");
      return;
    }

    const response = await fetch(
      `${BEEHIIV_API_BASE}/publications/${publicationId}/automations/${automationId}/journeys`,
      {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      },
    );

    if (!response.ok) {
      const details = await response.text().catch(() => "");
      console.error(`[Beehiiv] win-back enrollment failed (${response.status} ${response.statusText})`, details);
    }
  } catch (error) {
    console.error("[Beehiiv] win-back enrollment error", error);
  }
}

export async function sendConfirmationEmail(email: string) {
  return sendTransactionalEmail({
    to: email,
    subject: "Welcome to RetireShield",
    html: `<div style="font-family:Arial,sans-serif;font-size:18px;line-height:1.6;color:#0f172a"><h1 style="font-size:28px">Welcome to RetireShield</h1><p>Your RetireShield account is ready. Open your dashboard to review your Retirement Safety Score and alerts.</p><p style="font-size:14px;color:#64748b">You are receiving this because you created or upgraded a RetireShield account.</p></div>`,
  });
}

export type RetirementWatchScoreUpdate = {
  previousOverall?: number | null;
  nextOverall: number;
  band: string;
  alertCount?: number;
  topAlertTitle?: string | null;
  alerts?: { title?: string | null; action?: string | null }[];
};

export async function sendRetirementWatchEmail(email: string, update: RetirementWatchScoreUpdate) {
  const delta = typeof update.previousOverall === "number" ? update.nextOverall - update.previousOverall : null;
  const alerts = (update.alerts ?? [])
    .slice(0, 3)
    .map((alert) => `<li><strong>${escapeHtml(alert.title ?? "Retirement alert")}</strong>${alert.action ? `<br>${escapeHtml(alert.action)}` : ""}</li>`)
    .join("");

  return sendTransactionalEmail({
    to: email,
    subject: "Your Retirement Watch digest",
    html: `<div style="font-family:Arial,sans-serif;font-size:20px;line-height:1.6;color:#0f172a"><h1 style="font-size:32px">Retirement Watch</h1><p>Your latest Safety Score is <strong>${update.nextOverall}</strong> (${escapeHtml(update.band)}${delta === null ? "" : `, ${delta >= 0 ? "+" : ""}${delta} since last check`}).</p>${alerts ? `<h2 style="font-size:24px">Top alerts</h2><ol>${alerts}</ol>` : ""}<p style="font-size:14px;color:#64748b">This transactional digest contains your RetireShield account information. To stop these emails, update your monitoring preferences or contact support.</p></div>`,
  });
}

export type TrustedContactFraudNotice = {
  memberEmail?: string | null;
  flagCount: number;
  topReason: string;
  topAdvice: string;
};

export async function sendTrustedContactFraudEmail(email: string, notice: TrustedContactFraudNotice) {
  return sendTransactionalEmail({
    to: email,
    subject: "RetireShield trusted contact alert",
    html: `<div style="font-family:Arial,sans-serif;font-size:18px;line-height:1.6;color:#0f172a"><h1 style="font-size:28px">Trusted contact alert</h1><p>RetireShield detected ${notice.flagCount} high-risk fraud flag(s) for a RetireShield member who listed you as a trusted contact.</p><p><strong>Top reason:</strong> ${escapeHtml(notice.topReason)}</p><p><strong>Suggested action:</strong> ${escapeHtml(notice.topAdvice)}</p><p style="font-size:14px;color:#64748b">You are receiving this because you are listed as a trusted contact.</p></div>`,
  });
}
