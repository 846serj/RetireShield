import { benefitsDownloadsForOrder, money } from "@/lib/benefitsChecklist";
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
  state: string;
  hasStatePack: boolean;
}) {
  const base = getPublicBaseUrl();
  const downloads = benefitsDownloadsForOrder(input.state, input.hasStatePack).map((file) => ({
    label: file.label,
    url: `${base}/api/benefits-checklist/download/${file.key}?payment_intent=${encodeURIComponent(input.paymentIntentId)}&token=${encodeURIComponent(input.downloadToken)}`,
  }));
  const reportUrl = `${base}/personal-benefits-report/?from=${encodeURIComponent(input.paymentIntentId)}&source_token=${encodeURIComponent(input.downloadToken)}`;
  const greeting = input.firstName ? `Hi ${escapeHtml(input.firstName)},` : "Hello,";

  return sendTransactionalEmail({
    to: input.email,
    subject: "Your Benefits Checklist downloads are ready",
    html: `<div style="font-family:Arial,Helvetica,sans-serif;font-size:18px;line-height:1.6;color:#111827;max-width:640px;margin:0 auto"><p>${greeting}</p><h1 style="font-size:30px;line-height:1.2;color:#163A66">Your Benefits Checklist is ready</h1><p>Your payment of ${money(input.amount)} went through. Your files are below.</p>${downloads.map((item) => `<p><a href="${item.url}" style="display:block;background:#163A66;color:#fff;text-decoration:none;text-align:center;font-weight:700;padding:14px 18px;border-radius:7px">Download ${escapeHtml(item.label)}</a></p>`).join("")}<p style="font-size:15px;color:#4B5563">Save this email. You can use these links again.</p><hr style="border:0;border-top:1px solid #d7dee8;margin:28px 0"><h2 style="font-size:23px;color:#163A66">Want a report made for you?</h2><p>What you paid today comes off the $297 price. We use your answers to show which programs may fit and which calls to make first.</p><p><a href="${reportUrl}" style="display:block;background:#167A4A;color:#fff;text-decoration:none;text-align:center;font-weight:700;padding:14px 18px;border-radius:7px">See my price for the Personal Benefits Report</a></p><p style="font-size:15px;color:#4B5563">If the guide does not help, reply in 30 days for a refund.</p></div>`,
    text: `${greeting.replace(/&#039;/g, "'")}\n\nYour Benefits Checklist is ready. Your payment of ${money(input.amount)} went through.\n\n${downloads.map((item) => `${item.label}: ${item.url}`).join("\n")}\n\nPersonal Benefits Report: ${reportUrl}\nWhat you paid today comes off the $297 price.\n\nIf the guide does not help, reply in 30 days for a refund.`,
  });
}
