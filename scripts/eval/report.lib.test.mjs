import assert from "node:assert/strict";
import test from "node:test";

import { caseTokenStats, runTokens } from "./report.lib.mjs";

test("reads total tokens or sums input and output tokens", () => {
  assert.equal(runTokens({ usage: { total_tokens: 900 } }), 900);
  assert.equal(runTokens({ usage: { input_tokens: 700, output_tokens: 50 } }), 750);
  assert.equal(runTokens({ usage: {} }), null);
  assert.equal(runTokens({}), null);
});

test("computes per-case mean tokens for each arm and their difference", () => {
  const stats = caseTokenStats([
    { arm: "with", usage: { total_tokens: 1000 } },
    { arm: "with", usage: { total_tokens: 1200 } },
    { arm: "without", usage: { total_tokens: 800 } },
  ]);
  assert.deepEqual(stats, { with: 1100, without: 800, delta: 300 });
  assert.deepEqual(caseTokenStats([{ arm: "with", usage: { total_tokens: 10 } }]), {
    with: 10,
    without: null,
    delta: null,
  });
});
