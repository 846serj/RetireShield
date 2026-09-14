import { NextResponse } from "next/server";
import { BENEFITS_CHECKLIST_PRODUCT, normalizeEmail, normalizeState, normalizeZip, sanitizeShortText } from "@/lib/benefitsChecklist";
import { BENEFITS_REPORT_NAME, BENEFITS_REPORT_PRICE, BENEFITS_REPORT_PRODUCT, BENEFITS_REPORT_TAX_CODE, createReportToken, reportCredit, reportPrice } from "@/lib/benefitsReport";
import { getPublicBaseUrl } from "@/lib/siteUrl";
import { stripe } from "@/lib/stripe";

async function creditFromSource(sourcePaymentIntentId: string, sourceToken: string) {
  if (!sourcePaymentIntentId) return 0;
  if (!/^pi_[A-Za-z0-9]+$/.test(sourcePaymentIntentId) || !/^[a-f0-9]{48}$/.test(sourceToken)) return -1;
  const source = await stripe.paymentIntents.retrieve(sourcePaymentIntentId, { expand: ["latest_charge"] });
  const charge = typeof source.latest_charge === "object" ? source.latest_charge : null;
  const valid = source.status === "succeeded" && source.amount_received >= source.amount && source.metadata.product === BENEFITS_CHECKLIST_PRODUCT && source.metadata.download_token === sourceToken && !charge?.refunded && (charge?.amount_refunded ?? 0) < source.amount_received;
  return valid ? reportCredit(source.metadata.state_pack === "1") : -1;
}

export async function POST(req: Request) {
  const requestOrigin = req.headers.get("origin");
  const publicOrigin = new URL(getPublicBaseUrl(req.url)).origin;
  if (requestOrigin && requestOrigin !== publicOrigin) return NextResponse.json({ error: "Invalid checkout origin." }, { status: 403 });

  let body: Record<string, unknown>;
  try { body = await req.json(); } catch { return NextResponse.json({ error: "Please check the form." }, { status: 400 }); }
  const email = normalizeEmail(body.email);
  const firstName = sanitizeShortText(body.firstName, 80);
  const zip = normalizeZip(body.zip);
  const state = normalizeState(body.state);
  const requestId = sanitizeShortText(body.requestId, 80);
  const sourcePaymentIntentId = sanitizeShortText(body.sourcePaymentIntentId, 120);
  const sourceToken = sanitizeShortText(body.sourceToken, 80);
  const analyticsId = sanitizeShortText(body.analyticsId, 200);
  if (!email || !firstName || !zip || !state || !/^[a-zA-Z0-9-]{16,80}$/.test(requestId)) return NextResponse.json({ error: "Enter a valid email, name, ZIP code, and state." }, { status: 400 });
  if (!process.env.STRIPE_SECRET_KEY || !(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || process.env.STRIPE_PUBLISHABLE_KEY)) return NextResponse.json({ error: "Checkout is not ready. Please contact support." }, { status: 503 });
  if (process.env.BENEFITS_REPORT_INTAKE_READY !== "true") return NextResponse.json({ error: "The report order form is not open yet. Please contact support." }, { status: 503 });

  try {
    const credit = await creditFromSource(sourcePaymentIntentId, sourceToken);
    if (credit < 0) return NextResponse.json({ error: "We could not match that credit to a paid order." }, { status: 403 });
    const subtotal = reportPrice(credit);
    let total = subtotal;
    let tax = 0;
    let taxCalculation = "";
    if (process.env.BENEFITS_CHECKLIST_STRIPE_TAX_ENABLED !== "false") {
      const calculation = await stripe.tax.calculations.create({ currency: "usd", customer_details: { address: { country: "US", postal_code: zip, state }, address_source: "billing" }, line_items: [{ amount: subtotal, reference: BENEFITS_REPORT_PRODUCT, tax_behavior: "exclusive", tax_code: BENEFITS_REPORT_TAX_CODE }] });
      total = calculation.amount_total;
      tax = calculation.tax_amount_exclusive;
      taxCalculation = calculation.id || "";
    }
    const intakeToken = createReportToken();
    const attribution = typeof body.attribution === "object" && body.attribution ? body.attribution as Record<string, unknown> : {};
    const metadata: Record<string, string> = {
      product: BENEFITS_REPORT_PRODUCT,
      buyer_name: firstName,
      buyer_state: state,
      buyer_zip: zip,
      intake_token: intakeToken,
      source_payment_intent: sourcePaymentIntentId,
      credit: String(credit),
      list_price: String(BENEFITS_REPORT_PRICE),
      tax_calculation: taxCalculation,
      analytics_id: analyticsId || sanitizeShortText(attribution.cid, 160) || `rs-${requestId}`,
      site: "retireshield.com",
      mc_site: "retireshield.com",
    };
    for (const key of ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term", "aid", "cid", "plat", "first_aid", "first_cid", "first_plat", "click_count", "page_variant", "source_site"]) {
      const value = sanitizeShortText(attribution[key], 160);
      if (value) metadata[key] = value;
    }
    const intent = await stripe.paymentIntents.create({
      amount: total,
      currency: "usd",
      description: BENEFITS_REPORT_NAME,
      receipt_email: email,
      payment_method_types: ["card"],
      metadata,
    }, { idempotencyKey: `retireshield-report-${requestId}` });
    if (!intent.client_secret) return NextResponse.json({ error: "Stripe did not return a payment form." }, { status: 502 });
    const returnUrl = new URL("/personal-benefits-report/thanks", getPublicBaseUrl(req.url));
    returnUrl.searchParams.set("token", intakeToken);
    return NextResponse.json({ clientSecret: intent.client_secret, publishableKey: process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || process.env.STRIPE_PUBLISHABLE_KEY, subtotal, tax, total, returnUrl: returnUrl.toString() });
  } catch (error) {
    console.error("benefits report payment intent failed", error);
    return NextResponse.json({ error: "Stripe could not start checkout. Please try again." }, { status: 502 });
  }
}
