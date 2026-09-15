import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import {
  buildAggregateResult,
  createInterruptController,
  exitCodeFor,
  runWithConcurrency,
  summarizeResults,
} from "./eval-cli-shared.lib.mjs";

export async function runEvalCase({
  evalCase,
  arm,
  runNumber,
  resultsDirectory,
  isTwoArm,
  adapter,
}) {
  const runDirectory = path.join(resultsDirectory, evalCase.name, arm, `run-${runNumber}`);
  const workspace = path.join(runDirectory, "workspace");
  await mkdir(runDirectory, { recursive: true });
  const skill = await adapter.initializeWorkspace({ workspace, evalCase, arm });
  const timeoutMs = (evalCase.metadata.timeout_seconds ?? 300) * 1000;
  const execution = await adapter.execute({
    evalCase,
    arm,
    runNumber,
    runDirectory,
    workspace,
    timeoutMs,
  });
  const run = {
    prompt: evalCase.prompt,
    finalResponse: execution.finalResponse,
    workspace,
    toolCalls: execution.toolCalls,
    events: execution.events,
  };
  const graders = [];
  for (const grader of evalCase.graders) {
    const indicator = adapter.isGraderIndicator(grader, isTwoArm);
    const evaluation = execution.passed
      ? await adapter.evaluateGrader(grader, run, { timeoutMs, runDirectory })
      : {
          status: "not_run",
          reason: `Main ${adapter.displayName} run failed: ${execution.reason}`,
        };
    graders.push(
      adapter.formatGrader?.(grader, evaluation, indicator) ?? {
        name: grader.name,
        type: grader.type,
        scored: !indicator,
        ...evaluation,
      },
    );
  }
  await adapter.finalize?.({ workspace, runDirectory, execution });
  const summary = adapter.summarizeGraderResults(graders, isTwoArm);
  const result = {
    case: evalCase.name,
    skill,
    arm,
    run: runNumber,
    prompt: evalCase.prompt,
    finalResponse: execution.finalResponse,
    toolCalls: execution.toolCalls,
    error: execution.passed ? null : execution.reason,
    durationSeconds: execution.durationSeconds,
    usage: execution.usage ?? null,
    ...execution.resultFields,
    ...summary,
    perfect: execution.passed && summary.perfect,
    graders,
  };
  await writeFile(path.join(runDirectory, "result.json"), JSON.stringify(result, null, 2), "utf8");
  return result;
}

export async function runEvalSuite({
  cases,
  options,
  resultsDirectory,
  engine,
  generatedAt = new Date().toISOString(),
  interruptController = createInterruptController(),
  io = { stdout: process.stdout, stderr: process.stderr },
}) {
  await mkdir(resultsDirectory, { recursive: true });
  const arms = options.ablation === "with-without" ? ["with", "without"] : ["with"];
  const tasks = cases.flatMap((evalCase) =>
    arms.flatMap((arm) =>
      Array.from({ length: options.runs }, (_, index) => ({
        evalCase,
        arm,
        runNumber: index + 1,
      })),
    ),
  );
  let crashed = false;

  const scheduled = await runWithConcurrency(tasks, options.concurrency, async (task) => {
    if (interruptController.signal) return null;
    io.stderr.write(
      `[Running] case=${task.evalCase.name} arm=${task.arm} run=${task.runNumber}/${options.runs}\n`,
    );
    try {
      const result = await engine.runCase(task);
      const progress = engine.formatRun?.(result);
      if (progress) io.stderr.write(`${progress}\n`);
      return result;
    } catch (error) {
      crashed = true;
      io.stderr.write(`[ERROR] case=${task.evalCase.name} arm=${task.arm}: ${error.message}\n`);
      return null;
    }
  });
  const results = scheduled.filter(Boolean);
  const partial = crashed || Boolean(interruptController.signal);
  const partialReason = interruptController.signal
    ? interruptController.signal === "SIGINT"
      ? "interrupted"
      : "terminated"
    : crashed
      ? "crashed"
      : null;

  const summary = summarizeResults(results);
  await writeFile(path.join(resultsDirectory, "summary.json"), JSON.stringify(summary, null, 2));
  const report = engine.renderReport({
    summary,
    results,
    options,
    generatedAt,
    resultsDirectory,
  });
  await writeFile(path.join(resultsDirectory, "report.html"), report, "utf8");
  const formattedSummary = engine.formatSummary(summary);
  io.stdout.write(`\n${formattedSummary}\n`);
  io.stdout.write(`Report: ${path.join(resultsDirectory, "report.html")}\n`);

  const aggregateResult = buildAggregateResult({
    engine: engine.name,
    engineVersion: engine.version,
    generatedAt,
    options: engine.aggregateOptions(options),
    results,
    ablation: options.ablation,
    partial,
    partialReason,
  });
  await writeFile(
    path.join(resultsDirectory, "aggregate-result.json"),
    JSON.stringify(aggregateResult, null, 2),
  );
  const belowThreshold = aggregateResult.cases.some(
    (entry) => entry.aggregates.score != null && entry.aggregates.score < options.threshold,
  );
  engine.reportThresholdFailure?.({ aggregateResult, threshold: options.threshold, io });
  const exitCode = exitCodeFor({
    interruptSignal: interruptController.signal,
    crashed,
    belowThreshold,
  });
  return { exitCode, results, summary, aggregateResult };
}
