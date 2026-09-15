import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { LEADGEN_ONLY } from "@/lib/flags";
import { withPersistentAuthCookie } from "@/lib/supabase/cookies";

const LEADGEN_ALLOWLIST_EXACT_PATHS = new Set(["/quiz", "/newsletter", "/benefits-checklist", "/benefits-checklist/", "/benefits-checklist/thanks", "/benefits-checklist/thanks/", "/personal-benefits-report", "/personal-benefits-report/", "/personal-benefits-report/thanks", "/personal-benefits-report/thanks/", "/benefits-report-intake", "/benefits-report-intake/", "/privacy", "/terms", "/refund-policy"]);
const LEADGEN_ALLOWLIST_PREFIXES = ["/api/lead", "/api/newsletter", "/auth", "/_next", "/favicon", "/robots", "/sitemap", "/manifest", "/s", "/c"];
const STATIC_ASSET_PATH = /\.[^/]+$/;

function isLeadgenAllowedPath(pathname: string) {
  return (
    LEADGEN_ALLOWLIST_EXACT_PATHS.has(pathname) ||
    LEADGEN_ALLOWLIST_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)) ||
    STATIC_ASSET_PATH.test(pathname)
  );
}

function isHtmlPageRequest(request: NextRequest) {
  const accept = request.headers.get("accept") || "";
  return accept.includes("text/html");
}

function mustNeverCache(pathname: string) {
  return pathname.startsWith("/c/") ||
    pathname.startsWith("/benefits-checklist") ||
    pathname.startsWith("/personal-benefits-report") ||
    pathname.startsWith("/benefits-report-intake") ||
    pathname.startsWith("/api/benefits-checklist") ||
    pathname.startsWith("/api/benefits-report") ||
    pathname === "/api/stripe/webhook" ||
    pathname === "/api/paypal/webhook";
}

// Refreshes the Supabase session cookie on each request.
export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (LEADGEN_ONLY && request.method === "GET" && isHtmlPageRequest(request) && !isLeadgenAllowedPath(pathname)) {
    return NextResponse.redirect(new URL("/quiz", request.url));
  }

  let response = NextResponse.next({ request });
  if (mustNeverCache(pathname)) {
    response.headers.set("Cache-Control", "private, no-store, no-cache, must-revalidate, max-age=0");
    response.headers.set("Cloudflare-CDN-Cache-Control", "no-store");
    response.headers.set("CDN-Cache-Control", "no-store");
    response.headers.set("X-Robots-Tag", "noindex, nofollow");
  }
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return response; // auth not configured yet — no-op

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, withPersistentAuthCookie(options)));
      },
    },
  });
  await supabase.auth.getUser();
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|api/stripe/webhook|api/paypal/webhook).*)"],
};
