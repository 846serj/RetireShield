import { test } from "node:test";
import assert from "node:assert";
import { readFileSync } from "node:fs";
import { answerHasOnlyToolSourcedNumbers } from "../lib/ai/coachNumbers";

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

test("coach golden: supports conversational safe-to-spend anchor and non-forced incomplete profile prompt", () => {
  const askClient = readFileSync(new URL("../app/(app)/ask/AskClient.tsx", import.meta.url), "utf8");
  assert.match(askClient, /Safe to spend this year/i);
  assert.match(askClient, /You can still ask a question now/i);
  assert.match(askClient, /not force it/i);
  assert.match(askClient, /How this was calculated/i);
});

test("coach golden: API keeps analytical framing and numeric tool-sourcing rule", () => {
  const route = readFileSync(new URL("../app/api/coach/route.ts", import.meta.url), "utf8");
  assert.match(route, /getCoachMode\(\)/);
  assert.match(route, /NEVER state a number[^.]+unless it is returned by one of the tools/i);
  assert.match(route, /answerHasOnlyToolSourcedNumbers/);
  assert.match(route, /calculations/);
});
