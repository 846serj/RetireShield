import { NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { createClient } from "@/lib/supabase/server";

// Opens the Stripe Customer Portal — this is the one-click cancel required for compliance.
export async function GET(req: Request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.redirect(new URL("/login", req.url));

  const { data: sub } = await supabase
    .from("subscriptions").select("stripe_customer_id").eq("user_id", user.id).single();
  if (!sub?.stripe_customer_id) return NextResponse.redirect(new URL("/dashboard", req.url));

  const base = process.env.NEXT_PUBLIC_BASE_URL ?? new URL(req.url).origin;
  const portalConfig = process.env.STRIPE_PORTAL_CONFIGURATION;
  const portal = await stripe.billingPortal.sessions.create({
    customer: sub.stripe_customer_id,
    return_url: `${base}/dashboard`,
    ...(portalConfig ? { configuration: portalConfig } : {}),
  });
  return NextResponse.redirect(portal.url);
}
