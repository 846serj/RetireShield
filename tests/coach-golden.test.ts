import { test } from "node:test";
import assert from "node:assert";
import { answerHasOnlyToolSourcedNumbers } from "../app/api/coach/route";

test("coach golden: accepts numeric answers that come from tool results", () => {
  const calculations = [
    { tool: "project_depletion" as const, inputs: {}, outputs: { depletionAge: 84, lastYear: { endBalances: { total: 125000 } } } },
    { tool: "rmd_for_age" as const, inputs: { age: 75 }, outputs: { rmd: 10000 } },
  ];
  const answer = "The projection shows depletion at age 84, an ending balance of $125,000, and an RMD of $10,000.";
  assert.equal(answerHasOnlyToolSourcedNumbers(answer, calculations), true);
});

test("coach golden: rejects invented figures that are not in mocked tool results", () => {
  const calculations = [{ tool: "rmd_for_age" as const, inputs: { age: 75 }, outputs: { rmd: 10000 } }];
  const answer = "Your RMD is $10,000, and your tax bill should be $2,200.";
  assert.equal(answerHasOnlyToolSourcedNumbers(answer, calculations), false);
});
