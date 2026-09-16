import assert from "node:assert/strict";
import { mkdtemp, readFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import { runEvalCase, runEvalSuite } from "./suite-runner.lib.mjs";

const quietIo = { stdout: { write() {} }, stderr: { write() {} } };

test("统一 runner 调度用例并写出稳定的评测产物", async () => {
  const resultsDirectory = await mkdtemp(path.join(os.tmpdir(), "eval-suite-"));
  const outcome = await runEvalSuite({
    cases: [{ name: "case-a" }],
    options: { runs: 1, ablation: "none", concurrency: 1, threshold: 0.5 },
    resultsDirectory,
    generatedAt: "2026-09-16T00:00:00.000Z",
    interruptController: { signal: null },
    io: quietIo,
    engine: {
      name: "fake",
      version: "1.0.0",
      runCase: async ({ evalCase, arm, runNumber }) => ({
        case: evalCase.name,
        arm,
        run: runNumber,
        score: 1,
        perfect: true,
        durationSeconds: 0.1,
        graders: [],
      }),
      formatSummary: () => "summary",
      renderReport: () => "<html>report</html>",
      aggregateOptions: (options) => ({ runs: options.runs }),
    },
  });

  assert.equal(outcome.exitCode, 0);
  assert.equal(outcome.results.length, 1);
  assert.equal(
    JSON.parse(await readFile(path.join(resultsDirectory, "aggregate-result.json"))).engine,
    "fake",
  );
  assert.equal(
    await readFile(path.join(resultsDirectory, "report.html"), "utf8"),
    "<html>report</html>",
  );
});

test("统一 runner 保持双臂并发结果顺序", async () => {
  const resultsDirectory = await mkdtemp(path.join(os.tmpdir(), "eval-suite-order-"));
  const outcome = await runEvalSuite({
    cases: [{ name: "slow" }, { name: "fast" }],
    options: { runs: 1, ablation: "with-without", concurrency: 4, threshold: 0.5 },
    resultsDirectory,
    interruptController: { signal: null },
    io: quietIo,
    engine: {
      name: "fake",
      version: "1",
      runCase: async ({ evalCase, arm, runNumber }) => {
        if (evalCase.name === "slow") await new Promise((resolve) => setTimeout(resolve, 10));
        return { case: evalCase.name, arm, run: runNumber, score: 1, perfect: true, graders: [] };
      },
      formatSummary: () => "summary",
      renderReport: () => "report",
      aggregateOptions: () => ({}),
    },
  });
  assert.deepEqual(
    outcome.results.map((result) => `${result.case}:${result.arm}`),
    ["slow:with", "slow:without", "fast:with", "fast:without"],
  );
});

test("统一 runner 以退出码 1 报告阈值失败", async () => {
  const resultsDirectory = await mkdtemp(path.join(os.tmpdir(), "eval-suite-threshold-"));
  const outcome = await runEvalSuite({
    cases: [{ name: "case-a" }],
    options: { runs: 1, ablation: "none", concurrency: 1, threshold: 1 },
    resultsDirectory,
    interruptController: { signal: null },
    io: quietIo,
    engine: {
      name: "fake",
      version: "1",
      runCase: async () => ({ case: "case-a", arm: "with", run: 1, score: 0, graders: [] }),
      formatSummary: () => "summary",
      renderReport: () => "report",
      aggregateOptions: () => ({}),
    },
  });
  assert.equal(outcome.exitCode, 1);
  assert.equal(outcome.aggregateResult.partial, false);
});

test("统一 runner 把运行崩溃记录为 partial", async () => {
  const resultsDirectory = await mkdtemp(path.join(os.tmpdir(), "eval-suite-crash-"));
  const outcome = await runEvalSuite({
    cases: [{ name: "case-a" }],
    options: { runs: 1, ablation: "none", concurrency: 1, threshold: 1 },
    resultsDirectory,
    interruptController: { signal: null },
    io: quietIo,
    engine: {
      name: "fake",
      version: "1",
      runCase: async () => {
        throw new Error("boom");
      },
      formatSummary: () => "summary",
      renderReport: () => "report",
      aggregateOptions: () => ({}),
    },
  });
  assert.equal(outcome.exitCode, 2);
  assert.equal(outcome.aggregateResult.partialReason, "crashed");
});

test("统一 runner 保留中断退出码", async () => {
  const resultsDirectory = await mkdtemp(path.join(os.tmpdir(), "eval-suite-interrupt-"));
  const outcome = await runEvalSuite({
    cases: [{ name: "case-a" }],
    options: { runs: 1, ablation: "none", concurrency: 1, threshold: 1 },
    resultsDirectory,
    interruptController: { signal: "SIGINT" },
    io: quietIo,
    engine: {
      name: "fake",
      version: "1",
      runCase: async () => assert.fail("中断后不应启动任务"),
      formatSummary: () => "summary",
      renderReport: () => "report",
      aggregateOptions: () => ({}),
    },
  });
  assert.equal(outcome.exitCode, 130);
  assert.equal(outcome.aggregateResult.partialReason, "interrupted");
});

test("单次运行接口统一组装 grader 结果", async () => {
  const resultsDirectory = await mkdtemp(path.join(os.tmpdir(), "eval-case-"));
  const result = await runEvalCase({
    evalCase: {
      name: "case-a",
      prompt: "prompt",
      metadata: {},
      graders: [{ name: "g", type: "regex" }],
    },
    arm: "with",
    runNumber: 1,
    resultsDirectory,
    isTwoArm: false,
    adapter: {
      displayName: "Fake",
      initializeWorkspace: async () => "skill-a",
      execute: async () => ({
        passed: false,
        reason: "unavailable",
        finalResponse: "",
        toolCalls: [],
        events: [],
        durationSeconds: 1,
      }),
      isGraderIndicator: () => false,
      summarizeGraderResults: () => ({ score: 0, perfect: false }),
    },
  });
  assert.equal(result.graders[0].status, "not_run");
  assert.match(result.graders[0].reason, /Main Fake run failed/);
  assert.equal(result.error, "unavailable");
});
