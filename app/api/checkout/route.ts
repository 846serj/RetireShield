import { NextResponse } from "next/server";
import { getPublicBaseUrl } from "@/lib/siteUrl";
import { stripe } from "@/lib/stripe";
import { createClient } from "@/lib/supabase/server";

// Creates a Stripe Checkout Session (subscription). Annual carries the 3-day trial (set on the Price in Stripe).
export async function POST(req: Request) {
  let plan: unknown;
  try {
    ({ plan } = await req.json());
  } catch {
    return NextResponse.json({ error: "Invalid checkout request." }, { status: 400 });
  }

  const normalizedPlan = plan === "monthly" ? "monthly" : "annual";
  const base = getPublicBaseUrl(req.url);

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseAnonKey) {
    console.error("checkout failed: Supabase auth env vars are not configured");
    return NextResponse.json({ error: "Sign-in is not configured yet. Please contact support." }, { status: 500 });
  }

  const supabase = createClient();
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError) console.error("checkout auth lookup failed:", userError.message);
  if (!user) {
    const next = `/upgrade?plan=${normalizedPlan}`;
    return NextResponse.json({ redirectTo: `${base}/login?next=${encodeURIComponent(next)}` }, { status: 401 });
  }

  const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
  if (!stripeSecretKey) {
    console.error("checkout failed: STRIPE_SECRET_KEY is not configured");
    return NextResponse.json({ error: "Stripe is not configured yet. Please contact support." }, { status: 500 });
  }

  const price = normalizedPlan === "monthly" ? process.env.STRIPE_PRICE_MONTHLY : process.env.STRIPE_PRICE_ANNUAL;
  if (!price) {
    console.error(`checkout failed: ${normalizedPlan} Stripe price is not configured`);
    return NextResponse.json({ error: "This plan is not configured yet. Please contact support." }, { status: 500 });
  }

  try {
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

    if (!session.url) {
      console.error("checkout failed: Stripe returned a session without a URL", session.id);
      return NextResponse.json({ error: "Stripe did not return a checkout URL. Please try again." }, { status: 502 });
    }

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error("checkout session creation failed:", error);
    return NextResponse.json({ error: "Stripe could not start checkout. Please try again." }, { status: 502 });
  }
}
