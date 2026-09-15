import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const checkout = readFileSync("components/BenefitsChecklistCheckout.tsx", "utf8");
const landingPage = readFileSync("app/(marketing)/benefits-checklist/page.tsx", "utf8");
const redirect = readFileSync("app/c/[campaign]/[surface]/[position]/[variant]/[aid]/route.ts", "utf8");

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
