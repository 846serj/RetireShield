#!/usr/bin/env node
/*
 * Idempotently creates the RetireShield Premium Stripe catalog in TEST or LIVE mode,
 * depending on STRIPE_SECRET_KEY. It prints the env vars this app needs.
 *
 * Note: Stripe trial-ending reminder emails are an account Billing setting. Keep
 * them enabled in Dashboard -> Billing -> Subscriptions and emails before going live.
 */
const Stripe = require("stripe");

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "", {
  apiVersion: "2024-06-20",
});

const PRODUCT_NAME = "RetireShield Premium";
const ANNUAL_LOOKUP_KEY = "retireshield_premium_annual_199";
const MONTHLY_LOOKUP_KEY = "retireshield_premium_monthly_29";

async function requireSecretKey() {
  if (!process.env.STRIPE_SECRET_KEY) {
    throw new Error("Missing STRIPE_SECRET_KEY. Use a Stripe test-mode secret key first.");
  }
}

async function getOrCreateProduct() {
  const products = await stripe.products.search({
    query: `name:'${PRODUCT_NAME}' AND active:'true'`,
    limit: 1,
  });

  if (products.data[0]) return products.data[0];

  return stripe.products.create({
    name: PRODUCT_NAME,
    metadata: { app: "retireshield" },
  });
}

async function getOrCreatePrice({ product, lookupKey, amount, interval, trialDays }) {
  const existing = await stripe.prices.list({ lookup_keys: [lookupKey], active: true, limit: 1 });
  if (existing.data[0]) return existing.data[0];

  const recurring = { interval };
  if (trialDays) recurring.trial_period_days = trialDays;

  return stripe.prices.create({
    product: product.id,
    currency: "usd",
    unit_amount: amount,
    lookup_key: lookupKey,
    recurring,
    metadata: { app: "retireshield" },
  });
}

async function getOrCreatePortalConfiguration(product, annualPrice, monthlyPrice) {
  const configs = await stripe.billingPortal.configurations.list({ active: true, limit: 100 });
  const existing = configs.data.find((config) => config.metadata?.app === "retireshield");
  if (existing) return existing;

  return stripe.billingPortal.configurations.create({
    business_profile: {
      headline: "Manage your RetireShield Premium subscription",
    },
    features: {
      customer_update: {
        enabled: true,
        allowed_updates: ["email", "tax_id", "address"],
      },
      invoice_history: { enabled: true },
      payment_method_update: { enabled: true },
      subscription_cancel: {
        enabled: true,
        mode: "at_period_end",
      },
      subscription_update: {
        enabled: true,
        default_allowed_updates: ["price"],
        products: [
          {
            product: product.id,
            prices: [annualPrice.id, monthlyPrice.id],
          },
        ],
      },
    },
    metadata: { app: "retireshield" },
  });
}

async function main() {
  await requireSecretKey();

  const product = await getOrCreateProduct();
  const annualPrice = await getOrCreatePrice({
    product,
    lookupKey: ANNUAL_LOOKUP_KEY,
    amount: 19900,
    interval: "year",
    trialDays: 3,
  });
  const monthlyPrice = await getOrCreatePrice({
    product,
    lookupKey: MONTHLY_LOOKUP_KEY,
    amount: 2900,
    interval: "month",
  });
  const portalConfiguration = await getOrCreatePortalConfiguration(product, annualPrice, monthlyPrice);

  console.log("Stripe setup complete:\n");
  console.log(`Product: ${product.id} (${product.name})`);
  console.log(`Annual price: ${annualPrice.id} ($199/year, 3-day trial)`);
  console.log(`Monthly price: ${monthlyPrice.id} ($29/month)`);
  console.log(`Customer Portal configuration: ${portalConfiguration.id}\n`);
  console.log("Add these to your app environment:");
  console.log(`STRIPE_PRICE_ANNUAL=${annualPrice.id}`);
  console.log(`STRIPE_PRICE_MONTHLY=${monthlyPrice.id}`);
  console.log(`STRIPE_PORTAL_CONFIGURATION=${portalConfiguration.id}`);
  console.log("\nDashboard compliance check: keep Stripe's trial-ending reminder email enabled before live launch.");
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
