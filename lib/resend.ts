import { Resend } from "resend";

type TransactionalEmailInput = {
  to: string;
  subject: string;
  html: string;
  text?: string;
  idempotencyKey?: string;
};

export async function sendTransactionalEmail({ to, subject, html, text, idempotencyKey }: TransactionalEmailInput) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;

  if (!apiKey) {
    console.log(`[Resend stub] ${subject} -> ${to}`);
    return false;
  }

  if (!from) {
    console.error("[Resend] EMAIL_FROM is missing; skipping transactional email");
    return false;
  }

  try {
    const resend = new Resend(apiKey);
    const replyTo = process.env.EMAIL_REPLY_TO || "ellen@retireshield.com";
    const { error } = await resend.emails.send({ from, to, subject, html, text, replyTo }, idempotencyKey ? { idempotencyKey } : undefined);
    if (error) {
      console.error("[Resend] transactional email failed", error);
      return false;
    }
    return true;
  } catch (error) {
    console.error("[Resend] transactional email error", error);
    return false;
  }
}
