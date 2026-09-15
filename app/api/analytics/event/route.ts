import { NextRequest, NextResponse } from "next/server";
import { captureServerEvent, isLikelyBot } from "@/lib/posthogServer";

const allowedEvents = new Set([
  "rgc_sales_view",
  "rgc_cta_clicked",
  "rgc_checkout_started",
  "rgc_state_selected",
  "rgc_bump_changed",
  "rgc_payment_submit_clicked",
  "rgc_payment_attempted",
  "rgc_payment_failed",
  "rgc_thankyou_view",
  "rgc_download_clicked",
]);
const allowedProducts = new Set(["benefits-checklist", "benefits-report"]);
const allowedProperties = new Set([
  "site", "mc_site", "product", "analytics_id", "utm_source", "utm_medium", "utm_campaign",
  "utm_content", "utm_term", "aid", "cid", "plat", "first_aid", "first_cid", "first_plat",
  "click_count", "page_variant", "source_site", "position", "accepted", "payment_method", "bump",
  "credit_cents", "status", "package",
  "failure_stage", "attempt_id", "payment_intent_id", "error_code", "error_type",
  "decline_code", "error_message", "http_status",
]);

function clean(value: unknown, max = 200) {
  return typeof value === "string" ? value.replace(/[\u0000-\u001f\u007f]/g, "").trim().slice(0, max) : "";
}

export async function POST(request: NextRequest) {
  const headers = {
    "Cache-Control": "private, no-store, no-cache, must-revalidate, max-age=0",
    "Cloudflare-CDN-Cache-Control": "no-store",
    "CDN-Cache-Control": "no-store",
  };
  const userAgent = request.headers.get("user-agent") || "";
  if (isLikelyBot(userAgent, request.method)) return NextResponse.json({ ok: true }, { headers });

  try {
    const body = (await request.json()) as { event?: unknown; distinctId?: unknown; properties?: unknown };
    const event = clean(body.event, 120);
    const distinctId = clean(body.distinctId);
    const input = body.properties && typeof body.properties === "object" ? body.properties as Record<string, unknown> : {};
    const product = clean(input.product, 80);
    if (!allowedEvents.has(event) || !allowedProducts.has(product) || !distinctId) {
      return NextResponse.json({ ok: false }, { status: 400, headers });
    }

    const properties: Record<string, string | number | boolean> = {};
    for (const [key, value] of Object.entries(input)) {
      if (!allowedProperties.has(key)) continue;
      if (typeof value === "string") properties[key] = clean(value);
      else if (typeof value === "number" && Number.isFinite(value)) properties[key] = value;
      else if (typeof value === "boolean") properties[key] = value;
    }
    properties.product = product;
    properties.site = "retireshield.com";
    properties.mc_site = "retireshield.com";
    properties.$geoip_disable = true;
    const ok = await captureServerEvent(event, distinctId, properties);
    return NextResponse.json({ ok }, { status: ok ? 202 : 503, headers });
  } catch {
    return NextResponse.json({ ok: false }, { status: 400, headers });
  }
}
