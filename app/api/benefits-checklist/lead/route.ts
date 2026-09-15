import { NextResponse } from "next/server";
import { normalizeEmail, normalizeState, normalizeZip, sanitizeShortText } from "@/lib/benefitsChecklist";
import { getPublicBaseUrl } from "@/lib/siteUrl";
import { createServiceClient } from "@/lib/supabase/server";

const ATTRIBUTION_KEYS = ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term", "aid", "plat", "cid", "first_aid", "first_cid", "first_plat", "click_count", "page_variant", "source_site"] as const;

export async function POST(req: Request) {
  const requestOrigin = req.headers.get("origin");
  const publicOrigin = new URL(getPublicBaseUrl(req.url)).origin;
  if (requestOrigin && requestOrigin !== publicOrigin) return NextResponse.json({ ok: false }, { status: 403 });

  const body = await req.json().catch(() => ({}));
  const email = normalizeEmail(body.email);
  if (!email) return NextResponse.json({ ok: false }, { status: 400 });

  const attribution: Record<string, string> = {};
  const rawAttribution = typeof body.attribution === "object" && body.attribution ? body.attribution as Record<string, unknown> : {};
  for (const key of ATTRIBUTION_KEYS) {
    const value = sanitizeShortText(rawAttribution[key], 160);
    if (value) attribution[key] = value;
  }

  const record = {
    email,
    first_name: sanitizeShortText(body.firstName, 80),
    zip: normalizeZip(body.zip),
    state: normalizeState(body.state),
    state_pack: body.statePack === true,
    newsletter_optin: body.newsletterOptIn === true,
    attribution,
    last_seen_at: new Date().toISOString(),
  };
  const db = createServiceClient();
  const { error } = await db.from("benefits_checkout_leads").upsert(record, { onConflict: "email", ignoreDuplicates: false });
  if (error) {
    console.error("benefits checkout lead capture failed", error);
    return NextResponse.json({ ok: false }, { status: 503 });
  }
  return NextResponse.json({ ok: true });
}
