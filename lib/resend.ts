import { Resend } from "resend";

type TransactionalEmailInput = {
  to: string;
  subject: string;
  html: string;
  text?: string;
};

export async function sendTransactionalEmail({ to, subject, html, text }: TransactionalEmailInput) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;

  if (!apiKey) {
    console.log(`[Resend stub] ${subject} -> ${to}`);
    return;
  }

  if (!from) {
    console.error("[Resend] EMAIL_FROM is missing; skipping transactional email");
    return;
  }

  try {
    const resend = new Resend(apiKey);
    const { error } = await resend.emails.send({ from, to, subject, html, text });
    if (error) console.error("[Resend] transactional email failed", error);
  } catch (error) {
    console.error("[Resend] transactional email error", error);
  }
}
