import assert from "node:assert/strict";
import test from "node:test";
import { benefitsDownloadsForOrder } from "./benefitsChecklist";
import { BENEFITS_REPORT_PRICE, reportCredit, reportPrice } from "./benefitsReport";

test("State Pack orders receive the correct private state file", () => {
  const guideOnly = benefitsDownloadsForOrder("TX", false);
  const withPack = benefitsDownloadsForOrder("TX", true);
  assert.equal(guideOnly.length, 3);
  assert.equal(withPack.length, 4);
  assert.equal(withPack[3]?.source, "benefits-checklist/state-packs/Benefits-Checklist-State-Pack-TX.pdf");
});

test("the report credit matches the Money Overview funnel", () => {
  assert.equal(BENEFITS_REPORT_PRICE, 29_700);
  assert.equal(reportPrice(reportCredit(false)), 25_000);
  assert.equal(reportPrice(reportCredit(true)), 22_300);
});
