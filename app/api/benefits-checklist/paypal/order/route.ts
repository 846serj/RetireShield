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
import { paypalConfigured, paypalMoney, paypalRequest } from "@/lib/paypal";
import { getPublicBaseUrl } from "@/lib/siteUrl";

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
  if (!paypalConfigured() || process.env.BENEFITS_CHECKLIST_DOWNLOADS_READY !== "true") return NextResponse.json({ error: "PayPal is temporarily unavailable." }, { status: 503 });
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
    const items = [
      { name: BENEFITS_CHECKLIST_NAME, quantity: "1", unit_amount: { currency_code: "USD", value: paypalMoney(BENEFITS_CHECKLIST_PRICE) } },
      ...(wantsStatePack ? [{ name: `${state} State Pack`, quantity: "1", unit_amount: { currency_code: "USD", value: paypalMoney(BENEFITS_STATE_PACK_PRICE) } }] : []),
    ];
    const paypalOrder = await paypalRequest("/v2/checkout/orders", {
      method: "POST",
      headers: { "PayPal-Request-Id": `rs-benefits-${requestId}` },
      body: JSON.stringify({
        intent: "CAPTURE",
        purchase_units: [{
          custom_id: orderToken,
          description: BENEFITS_CHECKLIST_NAME,
          amount: {
            currency_code: "USD",
            value: paypalMoney(quote.total),
            breakdown: {
              item_total: { currency_code: "USD", value: paypalMoney(quote.subtotal) },
              tax_total: { currency_code: "USD", value: paypalMoney(quote.tax) },
            },
          },
          items,
        }],
        payer: { email_address: email, name: { given_name: firstName } },
        application_context: {
          brand_name: "RetireShield",
          shipping_preference: "NO_SHIPPING",
          user_action: "PAY_NOW",
          return_url: `${publicBase}/benefits-checklist/thanks`,
          cancel_url: `${publicBase}/benefits-checklist/?checkout=cancelled#secure-checkout`,
        },
      }),
    });
    if (!paypalOrder.id) throw new Error("PayPal did not return an order ID.");
    await createBenefitsOrder({
      order_token: orderToken,
      product: BENEFITS_CHECKLIST_PRODUCT,
      provider: "paypal",
      provider_order_id: String(paypalOrder.id),
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
    return NextResponse.json({ id: paypalOrder.id });
  } catch (error) {
    console.error("PayPal Benefits Checklist order failed", error);
    return NextResponse.json({ error: "PayPal could not start. Please try again." }, { status: 502 });
  }
}
