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
  orderId?: string;
  orderToken?: string;
  paymentIntentId?: string;
  downloadToken?: string;
  amount: number;
  subtotal?: number;
  tax?: number;
  provider?: "stripe" | "paypal";
  state: string;
  hasStatePack: boolean;
}) {
  const base = getPublicBaseUrl();
  const downloads = benefitsDownloadsForOrder(input.state, input.hasStatePack).map((file) => ({
    label: file.label,
    url: input.orderId && input.orderToken
      ? `${base}/api/benefits-checklist/download/${file.key}?order=${encodeURIComponent(input.orderId)}&token=${encodeURIComponent(input.orderToken)}`
      : `${base}/api/benefits-checklist/download/${file.key}?payment_intent=${encodeURIComponent(input.paymentIntentId || "")}&token=${encodeURIComponent(input.downloadToken || "")}`,
  }));
  const reportUrl = input.paymentIntentId && input.downloadToken
    ? `${base}/personal-benefits-report/?from=${encodeURIComponent(input.paymentIntentId)}&source_token=${encodeURIComponent(input.downloadToken)}`
    : `${base}/personal-benefits-report/`;
  const greeting = input.firstName ? `Hi ${escapeHtml(input.firstName)},` : "Hello,";
  const downloadAllUrl = input.orderId && input.orderToken
    ? `${base}/api/benefits-checklist/download/all?order=${encodeURIComponent(input.orderId)}&token=${encodeURIComponent(input.orderToken)}`
    : "";
  const downloadAllButton = downloadAllUrl ? `<p><a href="${downloadAllUrl}" style="display:block;background:#167A4A;color:#fff;text-decoration:none;text-align:center;font-weight:700;padding:16px 18px;border-radius:7px">Download everything</a></p><p style="font-size:14px;color:#4B5563">Or download one file at a time:</p>` : "";
  const paymentMethod = input.provider === "paypal" ? "PayPal" : "card";
  const statePackRow = input.hasStatePack ? `<tr><td style="padding:8px 0">${escapeHtml(input.state)} State Pack</td><td style="padding:8px 0;text-align:right">$27.00</td></tr>` : "";
  const summary = typeof input.subtotal === "number" && typeof input.tax === "number"
    ? `<table role="presentation" style="width:100%;border-top:1px solid #d7dee8;border-bottom:1px solid #d7dee8;margin:22px 0"><tr><td style="padding:8px 0">Benefits Checklist</td><td style="padding:8px 0;text-align:right">$47.00</td></tr>${statePackRow}<tr><td style="padding:8px 0">Sales tax</td><td style="padding:8px 0;text-align:right">${money(input.tax)}</td></tr><tr><td style="padding:10px 0;font-weight:700">Total paid (${paymentMethod})</td><td style="padding:10px 0;text-align:right;font-weight:700">${money(input.amount)}</td></tr></table>`
    : "";

  return sendTransactionalEmail({
    to: input.email,
    subject: "Your Benefits Checklist downloads are ready",
    idempotencyKey: input.orderId ? `benefits-checklist-purchase-${input.orderId}` : input.paymentIntentId ? `benefits-checklist-purchase-${input.paymentIntentId}` : undefined,
    html: `<div style="font-family:Arial,Helvetica,sans-serif;font-size:18px;line-height:1.6;color:#111827;max-width:640px;margin:0 auto"><p>${greeting}</p><h1 style="font-size:30px;line-height:1.2;color:#163A66">Your Benefits Checklist is ready</h1><p>Your payment of ${money(input.amount)} went through. Your files are below.</p>${downloadAllButton}${downloads.map((item) => `<p><a href="${item.url}" style="display:block;background:#163A66;color:#fff;text-decoration:none;text-align:center;font-weight:700;padding:14px 18px;border-radius:7px">Download ${escapeHtml(item.label)}</a></p>`).join("")}<p style="font-size:15px;color:#4B5563">Save this email. You can use these links again.</p>${summary}<hr style="border:0;border-top:1px solid #d7dee8;margin:28px 0"><h2 style="font-size:23px;color:#163A66">Want a report made for you?</h2><p>What you paid today comes off the $297 price. We use your answers to show which programs may fit and which calls to make first.</p><p><a href="${reportUrl}" style="display:block;background:#167A4A;color:#fff;text-decoration:none;text-align:center;font-weight:700;padding:14px 18px;border-radius:7px">See my price for the Personal Benefits Report</a></p><p style="font-size:15px;color:#4B5563">If the guide does not help, reply in 30 days for a refund. Questions? Reply to this email.</p></div>`,
    text: `${greeting.replace(/&#039;/g, "'")}\n\nYour Benefits Checklist is ready. Your payment of ${money(input.amount)} went through.\n\n${downloads.map((item) => `${item.label}: ${item.url}`).join("\n")}\n\nPersonal Benefits Report: ${reportUrl}\nWhat you paid today comes off the $297 price.\n\nIf the guide does not help, reply in 30 days for a refund.`,
  });
}
