import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { LEADGEN_ONLY } from "@/lib/flags";
import { withPersistentAuthCookie } from "@/lib/supabase/cookies";

const LEADGEN_ALLOWLIST_EXACT_PATHS = new Set(["/quiz", "/privacy", "/terms", "/refund-policy"]);
const LEADGEN_ALLOWLIST_PREFIXES = ["/api/lead", "/api/newsletter", "/auth", "/_next", "/favicon", "/robots", "/sitemap", "/manifest"];
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

// Refreshes the Supabase session cookie on each request.
export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (LEADGEN_ONLY && request.method === "GET" && isHtmlPageRequest(request) && !isLeadgenAllowedPath(pathname)) {
    return NextResponse.redirect(new URL("/quiz", request.url));
  }

  let response = NextResponse.next({ request });
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
  matcher: ["/((?!_next/static|_next/image|favicon.ico|api/stripe/webhook).*)"],
};
