import { NextResponse } from "next/server";
import { normalizeState, normalizeZip } from "@/lib/benefitsChecklist";
import { calculateBenefitsQuote } from "@/lib/benefitsCheckoutPricing";
import { getPublicBaseUrl } from "@/lib/siteUrl";

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

  if (process.env.BENEFITS_CHECKLIST_STRIPE_TAX_ENABLED !== "false" && !process.env.STRIPE_SECRET_KEY) {
    return NextResponse.json({ error: "Checkout is temporarily unavailable. Please contact support." }, { status: 503 });
  }

  try {
    const quote = await calculateBenefitsQuote(zip, state, wantsStatePack);
    return NextResponse.json({
      subtotal: quote.subtotal,
      tax: quote.tax,
      total: quote.total,
    });
  } catch (error) {
    console.error("benefits checklist quote failed", error);
    return NextResponse.json({ error: "We could not check sales tax. Please try again." }, { status: 502 });
  }
}
