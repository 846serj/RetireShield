import { money } from "@/lib/benefitsChecklist";
import { sendTransactionalEmail } from "@/lib/resend";
import { getPublicBaseUrl } from "@/lib/siteUrl";

function escapeHtml(value: string) {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/\"/g, "&quot;").replace(/'/g, "&#039;");
}

export async function sendBenefitsReportPurchaseEmail(input: { email: string; firstName: string; paymentIntentId: string; intakeToken: string; amount: number }) {
  const url = `${getPublicBaseUrl()}/benefits-report-intake/?payment_intent=${encodeURIComponent(input.paymentIntentId)}&token=${encodeURIComponent(input.intakeToken)}`;
  const greeting = input.firstName ? `Hi ${escapeHtml(input.firstName)},` : "Hello,";
  return sendTransactionalEmail({
    to: input.email,
    subject: "Start your Personal Benefits Report",
    html: `<div style="font-family:Arial,Helvetica,sans-serif;font-size:18px;line-height:1.6;color:#111827;max-width:640px;margin:0 auto"><p>${greeting}</p><h1 style="font-size:30px;line-height:1.2;color:#163A66">Your report is ready to start</h1><p>Your payment of ${money(input.amount)} went through.</p><p>Use the button below to answer the questions for your report. A best guess is fine. We never ask for your Social Security number, Medicare number, or bank account number.</p><p><a href="${url}" style="display:block;background:#167A4A;color:#fff;text-decoration:none;text-align:center;font-weight:700;padding:14px 18px;border-radius:7px">Start my report</a></p><p style="font-size:15px;color:#4B5563">Save this email. You can use the link to come back.</p></div>`,
    text: `${greeting.replace(/&#039;/g, "'")}\n\nYour report is ready to start. Your payment of ${money(input.amount)} went through.\n\nStart here: ${url}\n\nA best guess is fine. We never ask for your Social Security number, Medicare number, or bank account number.`,
  });
}
