import { NextResponse } from "next/server";
import {
  BENEFITS_CHECKLIST_PRICE,
  BENEFITS_CHECKLIST_PRODUCT,
  BENEFITS_CHECKLIST_TAX_CODE,
  BENEFITS_STATE_PACK_PRICE,
  normalizeState,
  normalizeZip,
} from "@/lib/benefitsChecklist";
import { getPublicBaseUrl } from "@/lib/siteUrl";
import { stripe } from "@/lib/stripe";

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
    return NextResponse.json({ error: "Please check the ZIP code and state." }, { status: 400 });
  }

  const zip = normalizeZip(body.zip);
  const state = normalizeState(body.state);
  const wantsStatePack = body.statePack === true;
  if (!zip || !state) {
    return NextResponse.json({ error: "Enter a valid ZIP code and state." }, { status: 400 });
  }
  if (wantsStatePack && process.env.BENEFITS_CHECKLIST_STATE_PACKS_READY !== "true") {
    return NextResponse.json({ error: "The State Pack is not ready yet. Please uncheck it or contact support." }, { status: 503 });
  }

  const subtotal = BENEFITS_CHECKLIST_PRICE + (wantsStatePack ? BENEFITS_STATE_PACK_PRICE : 0);
  if (process.env.BENEFITS_CHECKLIST_STRIPE_TAX_ENABLED === "false") {
    return NextResponse.json({ subtotal, tax: 0, total: subtotal });
  }
  if (!process.env.STRIPE_SECRET_KEY) {
    return NextResponse.json({ error: "Checkout is temporarily unavailable. Please contact support." }, { status: 503 });
  }

  try {
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
    return NextResponse.json({
      subtotal,
      tax: calculation.tax_amount_exclusive,
      total: calculation.amount_total,
    });
  } catch (error) {
    console.error("benefits checklist quote failed", error);
    return NextResponse.json({ error: "We could not check sales tax. Please try again." }, { status: 502 });
  }
}
