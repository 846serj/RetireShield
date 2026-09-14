import { NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { createServiceClient } from "@/lib/supabase/server";
import { enrollInWinback, sendConfirmationEmail, sendToList, type EmailSegment } from "@/lib/email";
import { BENEFITS_CHECKLIST_PRODUCT } from "@/lib/benefitsChecklist";
import { sendBenefitsChecklistPurchaseEmail } from "@/lib/benefitsChecklistEmail";
import { BENEFITS_REPORT_PRODUCT } from "@/lib/benefitsReport";
import { sendBenefitsReportPurchaseEmail } from "@/lib/benefitsReportEmail";

// Stripe webhook: keeps the `subscriptions` table in sync. Add this URL + signing secret in Stripe.
// Note: this route is excluded from middleware (it needs the raw body, no session).
export async function POST(req: Request) {
  const sig = req.headers.get("stripe-signature");
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  const raw = await req.text();

  let event;
  try {
    event = stripe.webhooks.constructEvent(raw, sig!, secret!);
  } catch (e: any) {
    return NextResponse.json({ error: `signature: ${e.message}` }, { status: 400 });
  }

  const db = createServiceClient();

  async function upsert(sub: any) {
    const userId = sub.metadata?.user_id;
    if (!userId) return;
    await db.from("subscriptions").upsert({
      user_id: userId,
      stripe_customer_id: sub.customer,
      stripe_subscription_id: sub.id,
      status: sub.status,
      plan: sub.metadata?.plan ?? (sub.metadata?.tier && sub.metadata?.cadence ? `${sub.metadata.tier}_${sub.metadata.cadence}` : sub.metadata?.tier ?? null),
      trial_end: sub.trial_end ? new Date(sub.trial_end * 1000).toISOString() : null,
      current_period_end: sub.current_period_end ? new Date(sub.current_period_end * 1000).toISOString() : null,
      updated_at: new Date().toISOString(),
    });
  }

  function segmentForStripeStatus(status?: string): EmailSegment | null {
    switch (status) {
      case "trialing":
        return "trialing";
      case "active":
        return "paid";
      case "canceled":
      case "deleted":
      case "unpaid":
        return "free-only";
      default:
        return null;
    }
  }

  async function customerEmailForSubscription(sub: any): Promise<string | null> {
    if (sub.customer && typeof sub.customer === "object" && sub.customer.email) {
      return sub.customer.email;
    }

    if (!sub.customer || typeof sub.customer !== "string") {
      return null;
    }

    try {
      const customer = await stripe.customers.retrieve(sub.customer);
      if (!customer.deleted && customer.email) {
        return customer.email;
      }
    } catch (error) {
      console.error("stripe customer lookup failed:", error);
    }

    return null;
  }

  async function syncSubscriptionSegment(sub: any) {
    const segment = segmentForStripeStatus(sub.status);
    if (!segment) return;

    const customerEmail = await customerEmailForSubscription(sub);
    if (customerEmail) {
      await sendToList(customerEmail, segment);
      if (segment === "free-only" && (sub.status === "canceled" || sub.status === "deleted")) {
        await enrollInWinback(customerEmail);
      }
    }
  }

  switch (event.type) {
    case "payment_intent.succeeded": {
      const intent = event.data.object;
      if (![BENEFITS_CHECKLIST_PRODUCT, BENEFITS_REPORT_PRODUCT].includes(intent.metadata?.product)) break;

      const taxCalculation = intent.metadata.tax_calculation;
      if (taxCalculation && !intent.metadata.tax_transaction) {
        try {
          const transaction = await stripe.tax.transactions.createFromCalculation({
            calculation: taxCalculation,
            reference: `retireshield-${intent.id}`,
            metadata: { product: intent.metadata.product, payment_intent: intent.id },
          }, { idempotencyKey: `retireshield-tax-${intent.id}` });
          await stripe.paymentIntents.update(intent.id, { metadata: { tax_transaction: transaction.id } });
        } catch (error) {
          console.error("benefits product tax transaction failed", error);
        }
      }

      if (intent.metadata.product === BENEFITS_CHECKLIST_PRODUCT && intent.receipt_email && intent.metadata.download_token && intent.metadata.delivery_emailed !== "1") {
        const delivered = await sendBenefitsChecklistPurchaseEmail({
          email: intent.receipt_email,
          firstName: intent.metadata.buyer_name || "",
          paymentIntentId: intent.id,
          downloadToken: intent.metadata.download_token,
          amount: intent.amount_received,
          state: intent.metadata.buyer_state || "",
          hasStatePack: intent.metadata.state_pack === "1",
        });
        if (delivered) await stripe.paymentIntents.update(intent.id, { metadata: { delivery_emailed: "1" } });
      }
      if (intent.metadata.product === BENEFITS_REPORT_PRODUCT && intent.receipt_email && intent.metadata.intake_token && intent.metadata.delivery_emailed !== "1") {
        const delivered = await sendBenefitsReportPurchaseEmail({
          email: intent.receipt_email,
          firstName: intent.metadata.buyer_name || "",
          paymentIntentId: intent.id,
          intakeToken: intent.metadata.intake_token,
          amount: intent.amount_received,
        });
        if (delivered) await stripe.paymentIntents.update(intent.id, { metadata: { delivery_emailed: "1" } });
      }
      break;
    }
    case "checkout.session.completed": {
      const s = event.data.object as any;
      if (s.subscription) {
        const sub = await stripe.subscriptions.retrieve(s.subscription);
        await upsert(sub);
        await syncSubscriptionSegment(sub);
        if (s.customer_details?.email) await sendConfirmationEmail(s.customer_details.email);
      }
      break;
    }
    case "customer.subscription.updated":
    case "customer.subscription.created":
    case "customer.subscription.deleted": {
      const sub = event.data.object;
      await upsert(sub);
      await syncSubscriptionSegment(sub);
      break;
    }
  }

  return NextResponse.json({ received: true });
}
