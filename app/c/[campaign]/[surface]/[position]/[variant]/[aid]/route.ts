import { NextRequest, NextResponse } from "next/server";
import { randomBytes } from "node:crypto";

const allowedCampaigns = new Set(["checklist"]);
const allowedSurfaces = new Set(["email-body", "email-button"]);
const allowedPositions = new Set(["top", "inline", "footer", "end", "slot-1", "slot-2"]);
const variantPattern = /^[a-z0-9]{1,12}[-_][a-z0-9][a-z0-9_-]{0,30}$/;
const aidPattern = /^[a-z0-9][a-z0-9-]{0,120}$/;
const base32 = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

function clickId() {
  const bytes = randomBytes(10);
  let value = "";
  let bits = 0;
  let buffer = 0;

  for (const byte of bytes) {
    buffer = (buffer << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      value += base32[(buffer >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }

  return value.toLowerCase().slice(0, 16);
}

function platform(req: NextRequest) {
  const explicit = req.nextUrl.searchParams.get("plat");
  if (explicit === "email") return "email";

  const referer = req.headers.get("referer");
  if (!referer) return "other";

  try {
    const host = new URL(referer).hostname.toLowerCase();
    if (host === "retireshield.com" || host.endsWith(".retireshield.com")) return "web";
    if (host.includes("facebook.com") || host.startsWith("l.facebook")) return "fb";
    if (host.includes("google.") || host.includes("bing.com")) return "search";
  } catch {
    return "other";
  }

  return "other";
}

export async function GET(
  req: NextRequest,
  { params }: { params: { campaign: string; surface: string; position: string; variant: string; aid: string } },
) {
  const { campaign, surface, position, variant, aid } = params;

  if (
    !allowedCampaigns.has(campaign) ||
    !allowedSurfaces.has(surface) ||
    !allowedPositions.has(position) ||
    !variantPattern.test(variant) ||
    !aidPattern.test(aid)
  ) {
    return NextResponse.redirect(new URL("/", req.url), 302);
  }

  const cid = clickId();
  const plat = platform(req);
  const destination = new URL("/benefits-checklist/", req.url);
  destination.searchParams.set("utm_source", "rs");
  destination.searchParams.set("utm_medium", surface);
  destination.searchParams.set("utm_campaign", campaign);
  destination.searchParams.set("utm_content", variant);
  destination.searchParams.set("utm_term", position);
  destination.searchParams.set("aid", aid);
  destination.searchParams.set("plat", plat);
  destination.searchParams.set("cid", cid);

  const response = NextResponse.redirect(destination, 302);
  response.headers.set("Cache-Control", "no-store, private, max-age=0");
  response.cookies.set("rg_cid", cid, { maxAge: 60 * 60 * 24 * 90, httpOnly: false, sameSite: "lax", secure: true, path: "/" });
  response.cookies.set(
    "rg_attr",
    JSON.stringify({ source: "rs", medium: surface, campaign, content: variant, term: position, aid, plat, cid }),
    { maxAge: 60 * 60 * 24 * 90, httpOnly: false, sameSite: "lax", secure: true, path: "/" },
  );
  return response;
}
