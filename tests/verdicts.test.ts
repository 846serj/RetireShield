import { test } from "node:test";
import assert from "node:assert";
import { bandVerdict, subScoreBlurb } from "../lib/verdicts.ts";

test("bandVerdict returns one reassuring sentence for each band", () => {
  for (const band of ["secure", "mostlySecure", "atRisk", "vulnerable", "Mostly Secure", "At Risk"]) {
    const verdict = bandVerdict(band);
    assert.match(verdict, /[.]$/);
    assert.equal(verdict.split(".").filter(Boolean).length, 1);
    assert.doesNotMatch(verdict, /should|must|buy|sell/i);
  }
});

test("subScoreBlurb explains known sub-score keys in plain English", () => {
  assert.match(subScoreBlurb("income", 92), /Guaranteed income looks strong/);
  assert.match(subScoreBlurb("withdrawal", 66), /Spending sustainability has a useful base/);
  assert.match(subScoreBlurb("inflation", 45), /Inflation exposure may need a closer look/);
  assert.match(subScoreBlurb("market", 12), /Market-drop cushion is a good place to start learning/);
});

test("subScoreBlurb clamps values and handles unknown keys", () => {
  assert.match(subScoreBlurb("other", 150), /This score looks strong/);
  assert.match(subScoreBlurb("other", -10), /educational prompt/);
});
