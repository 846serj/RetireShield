import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const checkout = readFileSync("components/BenefitsChecklistCheckout.tsx", "utf8");
const landingPage = readFileSync("app/(marketing)/benefits-checklist/page.tsx", "utf8");
const redirect = readFileSync("app/c/[campaign]/[surface]/[position]/[variant]/[aid]/route.ts", "utf8");
const stripeIntent = readFileSync("app/api/benefits-checklist/payment-intent/route.ts", "utf8");
const hostedStripe = readFileSync("app/api/benefits-checklist/stripe-checkout/route.ts", "utf8");
const paypalOrder = readFileSync("app/api/benefits-checklist/paypal/order/route.ts", "utf8");
const paypalCapture = readFileSync("app/api/benefits-checklist/paypal/capture/route.ts", "utf8");
const fulfillment = readFileSync("lib/benefitsOrders.ts", "utf8");
const migration = readFileSync("supabase/migrations/20260915000000_create_benefits_orders.sql", "utf8");

test("newsletter tracking lands at the top of the Benefits Checklist page", () => {
  assert.match(redirect, /new URL\("\/benefits-checklist\/", publicOrigin\)/);
  assert.doesNotMatch(redirect, /destination\.hash/);
});

test("sales-page buttons still jump to the secure checkout", () => {
  assert.match(landingPage, /href="#secure-checkout"/);
  assert.match(checkout, /id="secure-checkout"/);
});

test("buyer details and Stripe payment fields render in one form", () => {
  assert.equal((checkout.match(/<form\b/g) || []).length, 1);
  assert.match(checkout, /mode: "payment"/);
  assert.match(checkout, /elements\.create\("payment"/);
  assert.match(checkout, /elements\.create\("expressCheckout"/);
  assert.match(checkout, /Get the Benefits Checklist/);
  assert.match(checkout, /rgc_payment_submit_clicked/);
  assert.match(checkout, /failure_stage/);
  assert.match(checkout, /payment_intent_id/);
  assert.match(checkout, /loaderstart/);
  assert.match(checkout, /update-end/);
  assert.match(checkout, /Loading secure card fields/);
  assert.doesNotMatch(checkout, /Continue to card payment|stage === "payment"|setStage/);
});

test("RetireShield offers two payment rails and a hosted Stripe fallback", () => {
  assert.match(checkout, /paypal\.com\/sdk\/js/);
  assert.match(checkout, /\/api\/benefits-checklist\/paypal\/order/);
  assert.match(checkout, /\/api\/benefits-checklist\/paypal\/capture/);
  assert.match(checkout, /\/api\/benefits-checklist\/stripe-checkout/);
  assert.match(paypalOrder, /paypalRequest\("\/v2\/checkout\/orders"/);
  assert.match(paypalCapture, /markBenefitsOrderPaid\("paypal"/);
  assert.match(hostedStripe, /stripe\.checkout\.sessions\.create/);
});

test("checkout captures recoverable email and explicit newsletter consent", () => {
  assert.match(checkout, /\/api\/benefits-checklist\/lead/);
  assert.match(checkout, /newsletterOptIn/);
  assert.match(checkout, /This box starts off/);
  assert.match(stripeIntent, /newsletter_optin: newsletterOptIn \? "1" : "0"/);
});

test("payment providers share durable, retryable fulfillment", () => {
  assert.match(migration, /create table if not exists benefits_orders/);
  assert.match(migration, /purchase_email_status/);
  assert.match(migration, /newsletter_status/);
  assert.match(fulfillment, /fulfillBenefitsOrder/);
  assert.match(fulfillment, /purchase_email_status", "sending"/);
  assert.match(fulfillment, /newsletter_status", "subscribing"/);
  assert.match(fulfillment, /sendWelcomeEmail: false/);
});
