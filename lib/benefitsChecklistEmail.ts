import { BENEFITS_CHECKLIST_DOWNLOADS, BENEFITS_CHECKLIST_NAME, money } from "@/lib/benefitsChecklist";
import { sendTransactionalEmail } from "@/lib/resend";
import { getPublicBaseUrl } from "@/lib/siteUrl";

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

export async function sendBenefitsChecklistPurchaseEmail(input: {
  email: string;
  firstName: string;
  paymentIntentId: string;
  downloadToken: string;
  amount: number;
}) {
  const base = getPublicBaseUrl();
  const downloads = Object.entries(BENEFITS_CHECKLIST_DOWNLOADS).map(([key, file]) => ({
    label: file.label,
    url: `${base}/api/benefits-checklist/download/${key}?payment_intent=${encodeURIComponent(input.paymentIntentId)}&token=${encodeURIComponent(input.downloadToken)}`,
  }));
  const greeting = input.firstName ? `Hi ${escapeHtml(input.firstName)},` : "Hello,";

  return sendTransactionalEmail({
    to: input.email,
    subject: "Your Benefits Checklist downloads are ready",
    html: `<div style="font-family:Arial,Helvetica,sans-serif;font-size:18px;line-height:1.6;color:#111827;max-width:640px;margin:0 auto"><p>${greeting}</p><h1 style="font-size:30px;line-height:1.2;color:#163A66">Your Benefits Checklist is ready</h1><p>Thank you for buying <strong>${BENEFITS_CHECKLIST_NAME}</strong> from RetireShield. Your payment of ${money(input.amount)} was successful.</p>${downloads.map((item) => `<p><a href="${item.url}" style="display:block;background:#163A66;color:#fff;text-decoration:none;text-align:center;font-weight:700;padding:14px 18px;border-radius:7px">Download ${escapeHtml(item.label)}</a></p>`).join("")}<p style="font-size:15px;color:#4B5563">Keep this email so you can use these private links again. The open-settlements link always points to the version included with this RetireShield purchase.</p><p style="font-size:15px;color:#4B5563">If the guide is not useful, reply within 30 days for a refund.</p></div>`,
    text: `${greeting.replace(/&#039;/g, "'")}\n\nYour Benefits Checklist is ready. Your payment of ${money(input.amount)} was successful.\n\n${downloads.map((item) => `${item.label}: ${item.url}`).join("\n")}\n\nIf the guide is not useful, reply within 30 days for a refund.`,
  });
}

