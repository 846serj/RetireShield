import { NextResponse } from "next/server";
import {
  BENEFITS_CHECKLIST_NAME,
  BENEFITS_CHECKLIST_PRICE,
  BENEFITS_CHECKLIST_PRODUCT,
  BENEFITS_STATE_PACK_PRICE,
  createDownloadToken,
  normalizeEmail,
  normalizeState,
  normalizeZip,
  sanitizeShortText,
} from "@/lib/benefitsChecklist";
import { calculateBenefitsQuote } from "@/lib/benefitsCheckoutPricing";
import { createBenefitsOrder } from "@/lib/benefitsOrders";
import { getPublicBaseUrl } from "@/lib/siteUrl";
import { stripe } from "@/lib/stripe";

const ATTRIBUTION_KEYS = ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term", "aid", "plat", "cid", "first_aid", "first_cid", "first_plat", "click_count", "page_variant", "source_site"] as const;

export async function POST(req: Request) {
  const publicBase = getPublicBaseUrl(req.url);
  const requestOrigin = req.headers.get("origin");
  if (requestOrigin && requestOrigin !== new URL(publicBase).origin) return NextResponse.json({ error: "Invalid checkout origin." }, { status: 403 });
  const body = await req.json().catch(() => ({}));
  const email = normalizeEmail(body.email);
  const firstName = sanitizeShortText(body.firstName, 80);
  const zip = normalizeZip(body.zip);
  const state = normalizeState(body.state);
  const wantsStatePack = body.statePack === true;
  const newsletterOptIn = body.newsletterOptIn === true;
  const requestId = sanitizeShortText(body.requestId, 80);
  if (!email || !firstName || !zip || !state || !/^[a-zA-Z0-9-]{16,80}$/.test(requestId)) return NextResponse.json({ error: "Enter a valid email, first name, ZIP code, and state." }, { status: 400 });
  if (!process.env.STRIPE_SECRET_KEY || process.env.BENEFITS_CHECKLIST_DOWNLOADS_READY !== "true") return NextResponse.json({ error: "Checkout is temporarily unavailable." }, { status: 503 });
  if (wantsStatePack && process.env.BENEFITS_CHECKLIST_STATE_PACKS_READY !== "true") return NextResponse.json({ error: "The State Pack is not available yet." }, { status: 503 });

  try {
    const quote = await calculateBenefitsQuote(zip, state, wantsStatePack);
    const orderToken = createDownloadToken();
    const attribution: Record<string, string> = {};
    const rawAttribution = typeof body.attribution === "object" && body.attribution ? body.attribution as Record<string, unknown> : {};
    for (const key of ATTRIBUTION_KEYS) {
      const value = sanitizeShortText(rawAttribution[key], 160);
      if (value) attribution[key] = value;
    }
    const metadata: Record<string, string> = {
      product: BENEFITS_CHECKLIST_PRODUCT,
      buyer_name: firstName,
      buyer_state: state,
      buyer_zip: zip,
      download_token: orderToken,
      order_token: orderToken,
      state_pack: wantsStatePack ? "1" : "0",
      state_pack_price: wantsStatePack ? String(BENEFITS_STATE_PACK_PRICE) : "0",
      newsletter_optin: newsletterOptIn ? "1" : "0",
      tax_calculation: quote.taxCalculationId,
      analytics_id: sanitizeShortText(body.analyticsId, 200) || attribution.cid || `rs-${requestId}`,
      site: "retireshield.com",
      mc_site: "retireshield.com",
      checkout_route: "hosted",
      ...attribution,
    };
    const lineItems = [
      { price_data: { currency: "usd", product_data: { name: BENEFITS_CHECKLIST_NAME }, unit_amount: BENEFITS_CHECKLIST_PRICE }, quantity: 1 },
      ...(wantsStatePack ? [{ price_data: { currency: "usd", product_data: { name: `${state} State Pack` }, unit_amount: BENEFITS_STATE_PACK_PRICE }, quantity: 1 }] : []),
      ...(quote.tax ? [{ price_data: { currency: "usd", product_data: { name: "Sales tax" }, unit_amount: quote.tax }, quantity: 1 }] : []),
    ];
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      customer_email: email,
      line_items: lineItems,
      payment_intent_data: { receipt_email: email, metadata },
      metadata,
      success_url: `${publicBase}/benefits-checklist/thanks?session_id={CHECKOUT_SESSION_ID}&token=${encodeURIComponent(orderToken)}`,
      cancel_url: `${publicBase}/benefits-checklist/?checkout=cancelled#secure-checkout`,
    }, { idempotencyKey: `retireshield-benefits-hosted-${requestId}` });
    if (!session.url) throw new Error("Stripe did not return a hosted checkout URL.");
    try {
      await createBenefitsOrder({
        order_token: orderToken,
        product: BENEFITS_CHECKLIST_PRODUCT,
        provider: "stripe",
        provider_order_id: session.id,
        email,
        first_name: firstName,
        zip,
        state,
        state_pack: wantsStatePack,
        newsletter_optin: newsletterOptIn,
        subtotal_cents: quote.subtotal,
        tax_cents: quote.tax,
        tax_calculation_id: quote.taxCalculationId || null,
        tax_transaction_id: null,
        total_cents: quote.total,
        currency: "usd",
        attribution,
      });
    } catch (orderError) {
      await stripe.checkout.sessions.expire(session.id).catch(() => undefined);
      throw orderError;
    }
    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error("hosted Benefits Checklist checkout failed", error);
    return NextResponse.json({ error: "The backup card checkout could not start. Please choose PayPal or try again." }, { status: 502 });
  }
}
