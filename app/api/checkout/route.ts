import { NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { createClient } from "@/lib/supabase/server";

// Creates a Stripe Checkout Session (subscription). Annual carries the 3-day trial (set on the Price in Stripe).
export async function POST(req: Request) {
  const { plan } = await req.json();
  const normalizedPlan = plan === "monthly" ? "monthly" : "annual";

  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    const base = process.env.NEXT_PUBLIC_BASE_URL ?? new URL(req.url).origin;
    const next = `/upgrade?plan=${normalizedPlan}`;
    return NextResponse.json({ redirectTo: `${base}/login?next=${encodeURIComponent(next)}` }, { status: 401 });
  }

  const price = normalizedPlan === "monthly" ? process.env.STRIPE_PRICE_MONTHLY : process.env.STRIPE_PRICE_ANNUAL;
  if (!price) return NextResponse.json({ error: "price not configured" }, { status: 500 });

  const base = process.env.NEXT_PUBLIC_BASE_URL ?? new URL(req.url).origin;

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    line_items: [{ price, quantity: 1 }],
    customer_email: user.email ?? undefined,
    client_reference_id: user.id,
    subscription_data: { metadata: { user_id: user.id, plan: normalizedPlan } },
    // Trial is configured on the annual Price (trial_period_days = 3) in the Stripe dashboard.
    allow_promotion_codes: true,
    success_url: `${base}/dashboard?welcome=1`,
    cancel_url: `${base}/upgrade`,
  });

  return NextResponse.json({ url: session.url });
}
