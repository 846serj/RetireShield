import { NextResponse } from "next/server";
import {
  BENEFITS_CHECKLIST_NAME,
  BENEFITS_CHECKLIST_PRICE,
  BENEFITS_CHECKLIST_PRODUCT,
  BENEFITS_CHECKLIST_TAX_CODE,
  BENEFITS_STATE_PACK_PRICE,
  createDownloadToken,
  normalizeEmail,
  normalizeState,
  normalizeZip,
  sanitizeShortText,
} from "@/lib/benefitsChecklist";
import { getPublicBaseUrl } from "@/lib/siteUrl";
import { stripe } from "@/lib/stripe";

const ATTRIBUTION_KEYS = ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term", "aid", "plat", "cid", "first_aid", "first_cid", "first_plat", "click_count", "page_variant", "source_site"] as const;

export async function POST(req: Request) {
  const requestOrigin = req.headers.get("origin");
  const publicOrigin = new URL(getPublicBaseUrl(req.url)).origin;
  if (requestOrigin && requestOrigin !== publicOrigin) {
    return NextResponse.json({ error: "Invalid checkout origin." }, { status: 403 });
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Please check the form and try again." }, { status: 400 });
  }

  const email = normalizeEmail(body.email);
  const firstName = sanitizeShortText(body.firstName, 80);
  const zip = normalizeZip(body.zip);
  const state = normalizeState(body.state);
  const requestId = sanitizeShortText(body.requestId, 80);
  const wantsStatePack = body.statePack === true;
  const analyticsId = sanitizeShortText(body.analyticsId, 200);

  if (!email || !firstName || !zip || !state || !/^[a-zA-Z0-9-]{16,80}$/.test(requestId)) {
    return NextResponse.json({ error: "Enter a valid email, first name, ZIP code, and state." }, { status: 400 });
  }
  if (!process.env.STRIPE_SECRET_KEY) {
    console.error("benefits checkout failed: STRIPE_SECRET_KEY is not configured");
    return NextResponse.json({ error: "Checkout is temporarily unavailable. Please contact support." }, { status: 503 });
  }
  if (process.env.BENEFITS_CHECKLIST_DOWNLOADS_READY !== "true") {
    console.error("benefits checkout blocked: private product downloads are not marked ready");
    return NextResponse.json({ error: "Checkout is temporarily unavailable. Please contact support." }, { status: 503 });
  }
  if (wantsStatePack && process.env.BENEFITS_CHECKLIST_STATE_PACKS_READY !== "true") {
    console.error("benefits checkout blocked: State Packs are not marked ready");
    return NextResponse.json({ error: "The State Pack is not ready yet. Please uncheck it or contact support." }, { status: 503 });
  }

  const publishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || process.env.STRIPE_PUBLISHABLE_KEY;
  if (!publishableKey) {
    console.error("benefits checkout failed: Stripe publishable key is not configured");
    return NextResponse.json({ error: "Checkout is temporarily unavailable. Please contact support." }, { status: 503 });
  }

  try {
    const subtotal = BENEFITS_CHECKLIST_PRICE + (wantsStatePack ? BENEFITS_STATE_PACK_PRICE : 0);
    let total = subtotal;
    let taxAmount = 0;
    let taxCalculationId = "";

    if (process.env.BENEFITS_CHECKLIST_STRIPE_TAX_ENABLED !== "false") {
      const calculation = await stripe.tax.calculations.create({
        currency: "usd",
        customer_details: {
          address: { country: "US", postal_code: zip, state },
          address_source: "billing",
        },
        line_items: [
          {
            amount: BENEFITS_CHECKLIST_PRICE,
            reference: BENEFITS_CHECKLIST_PRODUCT,
            tax_behavior: "exclusive",
            tax_code: BENEFITS_CHECKLIST_TAX_CODE,
          },
          ...(wantsStatePack ? [{
            amount: BENEFITS_STATE_PACK_PRICE,
            reference: `benefits-state-pack-${state.toLowerCase()}`,
            tax_behavior: "exclusive" as const,
            tax_code: BENEFITS_CHECKLIST_TAX_CODE,
          }] : []),
        ],
      });
      total = calculation.amount_total;
      taxAmount = calculation.tax_amount_exclusive;
      taxCalculationId = calculation.id || "";
    }

    const downloadToken = createDownloadToken();
    const metadata: Record<string, string> = {
      product: BENEFITS_CHECKLIST_PRODUCT,
      buyer_name: firstName,
      buyer_state: state,
      buyer_zip: zip,
      download_token: downloadToken,
      state_pack: wantsStatePack ? "1" : "0",
      state_pack_price: wantsStatePack ? String(BENEFITS_STATE_PACK_PRICE) : "0",
      tax_calculation: taxCalculationId,
      analytics_id: analyticsId || sanitizeShortText((body.attribution as Record<string, unknown> | undefined)?.cid, 160) || `rs-${requestId}`,
      site: "retireshield.com",
      mc_site: "retireshield.com",
    };
    const attribution = typeof body.attribution === "object" && body.attribution ? body.attribution as Record<string, unknown> : {};
    for (const key of ATTRIBUTION_KEYS) {
      const value = sanitizeShortText(attribution[key], 160);
      if (value) metadata[key] = value;
    }

    const intent = await stripe.paymentIntents.create({
      amount: total,
      currency: "usd",
      description: BENEFITS_CHECKLIST_NAME,
      receipt_email: email,
      payment_method_types: ["card"],
      metadata,
    }, { idempotencyKey: `retireshield-benefits-${requestId}` });

    if (!intent.client_secret) {
      return NextResponse.json({ error: "Stripe did not return a payment form. Please try again." }, { status: 502 });
    }

    const returnUrl = new URL("/benefits-checklist/thanks", getPublicBaseUrl(req.url));
    returnUrl.searchParams.set("token", downloadToken);

    return NextResponse.json({
      clientSecret: intent.client_secret,
      paymentIntentId: intent.id,
      publishableKey,
      subtotal,
      tax: taxAmount,
      total,
      returnUrl: returnUrl.toString(),
    });
  } catch (error) {
    console.error("benefits checklist payment intent failed", error);
    return NextResponse.json({ error: "Stripe could not start checkout. Please try again." }, { status: 502 });
  }
}
