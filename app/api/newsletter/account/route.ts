import { NextResponse } from "next/server";
import { addBeehiivSubscriber } from "@/lib/beehiiv";

// Publication sites allowed to submit their on-site capture forms directly to
// this endpoint (sidebar box, sticky bar, popup). Explicit allowlist, not "*".
const ALLOWED_ORIGINS = new Set([
  "https://thefinancialwire.com",
  "https://www.thefinancialwire.com",
  "https://themoneyoverview.com",
  "https://www.themoneyoverview.com",
  "https://mainstreetdollars.com",
  "https://www.mainstreetdollars.com",
  "https://thedailyoverview.com",
  "https://www.thedailyoverview.com",
]);

function corsHeaders(origin: string | null): Record<string, string> {
  if (!origin || !ALLOWED_ORIGINS.has(origin)) return { Vary: "Origin" };
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Max-Age": "86400",
    Vary: "Origin",
  };
}

function isValidEmail(email: unknown): email is string {
  return typeof email === "string" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

export async function OPTIONS(req: Request) {
  return new NextResponse(null, {
    status: 204,
    headers: corsHeaders(req.headers.get("origin")),
  });
}

export async function POST(req: Request) {
  const cors = corsHeaders(req.headers.get("origin"));

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "bad json" }, { status: 400, headers: cors });
  }

  if (!isValidEmail(body?.email)) {
    return NextResponse.json({ ok: false, error: "invalid email" }, { status: 400, headers: cors });
  }

  const firstName =
    typeof body?.firstName === "string" ? body.firstName.trim() : "";

  const str = (v: unknown) =>
    typeof v === "string" && v.trim() ? v.trim().slice(0, 120) : undefined;

  await addBeehiivSubscriber(body.email.trim().toLowerCase(), {
    utmSource: body?.utmSource ?? "direct_signup",
    utmMedium: str(body?.utmMedium),
    utmCampaign: str(body?.utmCampaign),
    tier: "free",
    firstName,
  });

  return NextResponse.json({ ok: true }, { headers: cors });
}
