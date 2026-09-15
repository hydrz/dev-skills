import assert from "node:assert/strict";
import test from "node:test";

import {
  applyQuickShortcut,
  buildAggregateResult,
  exitCodeFor,
  parseOptionsFromSpec,
  runWithConcurrency,
  summarizeResults,
  validateCommonOptions,
} from "./eval-cli-shared.lib.mjs";

const SPEC = {
  "--case": { key: "casePattern", type: "string", default: "*" },
  "--runs": { key: "runs", type: "number", default: 1 },
  "--ablation": { key: "ablation", type: "string", default: "with-without" },
  "--concurrency": { key: "concurrency", type: "number", default: 1 },
  "--quick": { key: "quick", type: "boolean", default: false },
};

test("parseOptionsFromSpec applies defaults and reads flag values", () => {
  const options = parseOptionsFromSpec(["--case", "foo-*", "--runs", "2"], SPEC);
  assert.equal(options.casePattern, "foo-*");
  assert.equal(options.runs, 2);
  assert.equal(options.ablation, "with-without");
  assert.equal(options.quick, false);
});

test("parseOptionsFromSpec rejects unknown flags and missing values", () => {
  assert.throws(() => parseOptionsFromSpec(["--nope"], SPEC), /Unknown option/);
  assert.throws(() => parseOptionsFromSpec(["--runs"], SPEC), /requires a value/);
});

test("applyQuickShortcut forces runs=1 and ablation=none", () => {
  const options = applyQuickShortcut({ runs: 5, ablation: "with-without", quick: true });
  assert.equal(options.runs, 1);
  assert.equal(options.ablation, "none");
});

test("validateCommonOptions rejects invalid ablation and concurrency", () => {
  assert.throws(
    () => validateCommonOptions({ runs: 1, ablation: "both", threshold: 1, concurrency: 1 }),
    /--ablation/,
  );
  assert.throws(
    () => validateCommonOptions({ runs: 1, ablation: "none", threshold: 1, concurrency: 9 }),
    /--concurrency/,
  );
});

test("runWithConcurrency preserves result order regardless of completion order", async () => {
  const items = [30, 10, 20];
  const results = await runWithConcurrency(items, 3, async (item) => {
    await new Promise((resolve) => setTimeout(resolve, item));
    return item;
  });
  assert.deepEqual(results, [30, 10, 20]);
});

test("exitCodeFor maps interrupt, crash, and threshold states", () => {
  assert.equal(exitCodeFor({}), 0);
  assert.equal(exitCodeFor({ belowThreshold: true }), 1);
  assert.equal(exitCodeFor({ crashed: true }), 2);
  assert.equal(exitCodeFor({ interruptSignal: "SIGINT" }), 130);
  assert.equal(exitCodeFor({ interruptSignal: "SIGTERM" }), 143);
});

test("buildAggregateResult computes per-case and suite aggregates", () => {
  const results = [
    { case: "demo", arm: "with", run: 1, score: 1, perfect: true, durationSeconds: 2, graders: [] },
    {
      case: "demo",
      arm: "with",
      run: 2,
      score: 0.5,
      perfect: false,
      durationSeconds: 3,
      graders: [],
    },
    {
      case: "demo",
      arm: "without",
      run: 1,
      score: 0.25,
      perfect: false,
      durationSeconds: 1,
      graders: [],
    },
  ];

  const aggregate = buildAggregateResult({
    engine: "codex",
    engineVersion: "1.0.0",
    generatedAt: "2026-01-01T00:00:00.000Z",
    options: { threshold: 0.7 },
    results,
    ablation: "with-without",
  });

  assert.equal(aggregate.schemaVersion, 1);
  assert.equal(aggregate.engine, "codex");
  assert.equal(aggregate.cases.length, 1);
  assert.equal(aggregate.cases[0].aggregates.score, 0.75);
  assert.equal(aggregate.cases[0].aggregates.delta, 0.5);
  assert.equal(aggregate.cases[0].arms.with.length, 2);
  assert.equal(aggregate.cases[0].arms.without.length, 1);
  assert.equal(aggregate.aggregates.overallScore, 0.75);
  assert.equal(aggregate.aggregates.casesPassed, 1);
  assert.equal(aggregate.aggregates.casesTotal, 1);
});

test("buildAggregateResult omits the without arm under single-arm ablation", () => {
  const results = [
    { case: "demo", arm: "with", run: 1, score: 1, perfect: true, durationSeconds: 2, graders: [] },
  ];

  const aggregate = buildAggregateResult({
    engine: "antigravity",
    engineVersion: "1.0.0",
    generatedAt: "2026-01-01T00:00:00.000Z",
    options: { threshold: 1 },
    results,
    ablation: "none",
  });

  assert.equal(aggregate.cases[0].arms.without.length, 0);
  assert.equal(aggregate.cases[0].aggregates.delta, null);
});

test("summarizeResults reports WITH/WITHOUT means and delta", () => {
  const summary = summarizeResults([
    { case: "example", arm: "with", score: 1, perfect: true, durationSeconds: 2.0 },
    { case: "example", arm: "without", score: 0.25, perfect: false, durationSeconds: 1.0 },
  ]);

  assert.equal(summary.cases.example.with.meanScore, 1);
  assert.equal(summary.cases.example.without.meanScore, 0.25);
  assert.equal(summary.cases.example.delta, 0.75);
});
