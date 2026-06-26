import { NextResponse } from "next/server";
import { getPublicBaseUrl } from "@/lib/siteUrl";
import { stripe } from "@/lib/stripe";
import { createClient } from "@/lib/supabase/server";
import { checkoutPriceEnvName, isSelfServeTier, type BillingCycle, type SelfServeTierKey } from "@/lib/pricing";

// Creates a Stripe Checkout Session (subscription) with a card-required 7-day trial
// for self-serve paid tiers. One Stripe Price is configured per tier + cadence.
export async function POST(req: Request) {
  let tier: unknown;
  let cadence: unknown;
  let plan: unknown;
  try {
    ({ tier, cadence, plan } = await req.json());
  } catch {
    return NextResponse.json({ error: "Invalid checkout request." }, { status: 400 });
  }

  const normalizedTier = isSelfServeTier(tier) ? tier : plan === "plus" ? "plus" : "premium";
  const normalizedCadence: BillingCycle = cadence === "monthly" || plan === "monthly" ? "monthly" : "annual";
  const planKey = `${normalizedTier}_${normalizedCadence}`;
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
    const next = `/upgrade?tier=${normalizedTier}&cadence=${normalizedCadence}`;
    return NextResponse.json({ redirectTo: `${base}/login?next=${encodeURIComponent(next)}` }, { status: 401 });
  }

  if (!process.env.STRIPE_SECRET_KEY) {
    console.error("checkout failed: STRIPE_SECRET_KEY is not configured");
    return NextResponse.json({ error: "Stripe is not configured yet. Please contact support." }, { status: 500 });
  }

  const envName = checkoutPriceEnvName(normalizedTier as SelfServeTierKey, normalizedCadence);
  const price = process.env[envName];
  if (!price) {
    console.error(`checkout failed: ${envName} is not configured`);
    return NextResponse.json({ error: "This plan is not configured yet. Please contact support." }, { status: 500 });
  }

  try {
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      line_items: [{ price, quantity: 1 }],
      customer_email: user.email ?? undefined,
      client_reference_id: user.id,
      subscription_data: {
        trial_period_days: 7,
        metadata: { user_id: user.id, tier: normalizedTier, cadence: normalizedCadence, plan: planKey },
      },
      allow_promotion_codes: true,
      success_url: `${base}/coach?welcome=1&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${base}/upgrade?tier=${normalizedTier}&cadence=${normalizedCadence}`,
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
