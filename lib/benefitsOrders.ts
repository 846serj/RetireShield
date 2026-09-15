import "server-only";
import { addBeehiivSubscriber } from "@/lib/beehiiv";
import { sendBenefitsChecklistPurchaseEmail } from "@/lib/benefitsChecklistEmail";
import { captureServerEvent } from "@/lib/posthogServer";
import { createServiceClient } from "@/lib/supabase/server";
import { stripe } from "@/lib/stripe";

export type BenefitsOrder = {
  id: string;
  order_token: string;
  product: "benefits-checklist";
  provider: "stripe" | "paypal";
  provider_order_id: string;
  provider_payment_id: string | null;
  status: "pending" | "paid" | "refunded" | "failed";
  email: string;
  first_name: string;
  zip: string;
  state: string;
  state_pack: boolean;
  newsletter_optin: boolean;
  subtotal_cents: number;
  tax_cents: number;
  tax_calculation_id: string | null;
  tax_transaction_id: string | null;
  total_cents: number;
  currency: "usd";
  attribution: Record<string, string>;
  purchase_email_status: "pending" | "sending" | "sent" | "failed";
  newsletter_status: "not_requested" | "pending" | "subscribing" | "subscribed" | "failed";
};

type NewOrder = Omit<BenefitsOrder,
  "id" | "provider_payment_id" | "status" | "purchase_email_status" | "newsletter_status"
>;

function db() {
  return createServiceClient();
}

export async function createBenefitsOrder(input: NewOrder) {
  const { data, error } = await db().from("benefits_orders").insert({
    ...input,
    provider_payment_id: null,
    status: "pending",
    purchase_email_status: "pending",
    newsletter_status: input.newsletter_optin ? "pending" : "not_requested",
  }).select("*").single();
  if (error) {
    if (error.code === "23505") {
      const existing = await findBenefitsOrder(input.provider, input.provider_order_id);
      if (existing && existing.email === input.email && existing.total_cents === input.total_cents && existing.state === input.state && existing.state_pack === input.state_pack) return existing;
    }
    throw new Error(`Could not save the order: ${error.message}`);
  }
  return data as BenefitsOrder;
}

export async function findBenefitsOrder(provider: "stripe" | "paypal", providerOrderId: string) {
  const { data, error } = await db().from("benefits_orders").select("*")
    .eq("provider", provider).eq("provider_order_id", providerOrderId).maybeSingle();
  if (error) throw new Error(`Could not read the order: ${error.message}`);
  return data as BenefitsOrder | null;
}

export async function findBenefitsOrderByPayment(provider: "stripe" | "paypal", providerPaymentId: string) {
  const { data, error } = await db().from("benefits_orders").select("*")
    .eq("provider", provider).eq("provider_payment_id", providerPaymentId).maybeSingle();
  if (error) throw new Error(`Could not read the order: ${error.message}`);
  return data as BenefitsOrder | null;
}

export async function markBenefitsOrderRefunded(order: BenefitsOrder) {
  const { data, error } = await db().from("benefits_orders").update({
    status: "refunded",
    refunded_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }).eq("id", order.id).select("*").single();
  if (error) throw new Error(`Could not mark the order refunded: ${error.message}`);
  await captureServerEvent("rgc_refund", order.attribution?.cid || `rs-order-${order.id}`, {
    site: "retireshield.com", mc_site: "retireshield.com", product: "benefits-checklist", gateway: order.provider,
    refunded_cents: order.total_cents, total_cents: order.total_cents,
  }, `${order.provider}-refund-${order.provider_payment_id || order.provider_order_id}`);
  return data as BenefitsOrder;
}

export async function getBenefitsOrder(id: string, token: string) {
  const { data, error } = await db().from("benefits_orders").select("*")
    .eq("id", id).eq("order_token", token).maybeSingle();
  if (error) throw new Error(`Could not read the order: ${error.message}`);
  return data as BenefitsOrder | null;
}

async function claim(id: string, column: "purchase_email_status" | "newsletter_status", next: string, allowed: string[]) {
  const { data, error } = await db().from("benefits_orders")
    .update({ [column]: next, updated_at: new Date().toISOString() })
    .eq("id", id).in(column, allowed).select("id").maybeSingle();
  if (error) throw new Error(`Could not claim fulfillment: ${error.message}`);
  return Boolean(data);
}

export async function fulfillBenefitsOrder(order: BenefitsOrder) {
  if (order.status !== "paid") return order;

  if (await claim(order.id, "purchase_email_status", "sending", ["pending", "failed"])) {
    const sent = await sendBenefitsChecklistPurchaseEmail({
      email: order.email,
      firstName: order.first_name,
      orderId: order.id,
      orderToken: order.order_token,
      amount: order.total_cents,
      subtotal: order.subtotal_cents,
      tax: order.tax_cents,
      provider: order.provider,
      state: order.state,
      hasStatePack: order.state_pack,
    });
    await db().from("benefits_orders").update({
      purchase_email_status: sent ? "sent" : "failed",
      purchase_email_attempts: (Number((order as any).purchase_email_attempts) || 0) + 1,
      purchase_email_sent_at: sent ? new Date().toISOString() : null,
      purchase_email_last_error: sent ? null : "Transactional email provider returned a failure.",
      updated_at: new Date().toISOString(),
    }).eq("id", order.id);
  }

  if (order.newsletter_optin && await claim(order.id, "newsletter_status", "subscribing", ["pending", "failed"])) {
    const subscribed = await addBeehiivSubscriber(order.email, {
      firstName: order.first_name,
      tier: "buyer-benefits-checklist",
      utmSource: order.attribution?.utm_source || "retireshield",
      utmMedium: "purchase",
      utmCampaign: "benefits-checklist",
      sendWelcomeEmail: false,
    });
    await db().from("benefits_orders").update({
      newsletter_status: subscribed ? "subscribed" : "failed",
      newsletter_attempts: (Number((order as any).newsletter_attempts) || 0) + 1,
      newsletter_completed_at: subscribed ? new Date().toISOString() : null,
      newsletter_last_error: subscribed ? null : "Beehiiv returned a failure.",
      updated_at: new Date().toISOString(),
    }).eq("id", order.id);
  }

  await db().from("benefits_checkout_leads").update({ recovery_status: "purchased", last_seen_at: new Date().toISOString() }).eq("email", order.email);
  return order;
}

export async function markBenefitsOrderPaid(
  provider: "stripe" | "paypal",
  providerOrderId: string,
  providerPaymentId: string,
  actualTotal?: number,
) {
  const existing = await findBenefitsOrder(provider, providerOrderId);
  if (!existing) throw new Error("Paid Benefits Checklist order was not found.");
  if (existing.status === "refunded") return existing;

  const now = new Date().toISOString();
  const updates: Record<string, unknown> = {
    status: "paid",
    provider_payment_id: providerPaymentId,
    paid_at: existing.status === "paid" ? undefined : now,
    updated_at: now,
  };
  if (typeof actualTotal === "number" && actualTotal > 0) updates.total_cents = actualTotal;
  Object.keys(updates).forEach((key) => updates[key] === undefined && delete updates[key]);

  const { data, error } = await db().from("benefits_orders").update(updates).eq("id", existing.id).select("*").single();
  if (error) throw new Error(`Could not mark the order paid: ${error.message}`);
  const paid = data as BenefitsOrder;
  if (paid.provider === "paypal" && paid.tax_calculation_id && !paid.tax_transaction_id) {
    try {
      const transaction = await stripe.tax.transactions.createFromCalculation({
        calculation: paid.tax_calculation_id,
        reference: `retireshield-paypal-${providerPaymentId}`,
        metadata: { product: "benefits-checklist", paypal_capture: providerPaymentId },
      }, { idempotencyKey: `retireshield-paypal-tax-${providerPaymentId}` });
      paid.tax_transaction_id = transaction.id;
      await db().from("benefits_orders").update({ tax_transaction_id: transaction.id, updated_at: new Date().toISOString() }).eq("id", paid.id);
    } catch (taxError) {
      console.error("PayPal Benefits Checklist tax transaction failed", taxError);
    }
  }
  await captureServerEvent("rgc_purchase", paid.attribution?.cid || `rs-order-${paid.id}`, {
    site: "retireshield.com",
    mc_site: "retireshield.com",
    product: "benefits-checklist",
    gateway: provider,
    total_cents: paid.total_cents,
    base_cents: 4_700,
    bump: paid.state_pack,
    bump_cents: paid.state_pack ? 2_700 : 0,
    tax_cents: paid.tax_cents,
    newsletter_optin: paid.newsletter_optin,
    ...paid.attribution,
  }, `${provider}-purchase-${providerPaymentId}`);
  await fulfillBenefitsOrder(paid);
  return paid;
}

export function benefitsThanksUrl(order: Pick<BenefitsOrder, "id" | "order_token">) {
  return `/benefits-checklist/thanks?order=${encodeURIComponent(order.id)}&token=${encodeURIComponent(order.order_token)}`;
}
