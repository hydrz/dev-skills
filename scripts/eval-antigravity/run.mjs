#!/usr/bin/env node

import { spawn } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  applyQuickShortcut,
  buildAggregateResult,
  createInterruptController,
  exitCodeFor,
  parseOptionsFromSpec,
  runWithConcurrency,
  summarizeResults as summarizeCaseResults,
  validateCommonOptions,
} from "../eval-cli-shared.lib.mjs";
import { spawnTarget } from "../spawn.lib.mjs";

import {
  buildAgyArgs,
  discoverCases,
  evaluateGrader,
  findSkills,
  formatSummaryTable,
  generateHtmlReport,
  initializeAgyWorkspace,
  isGraderIndicator,
  parseAgyOutput,
  primarySkillForCase,
  requiredSkillsForCase,
  sandboxFor,
  summarizeGraderResults,
} from "./lib.mjs";

const agyDirectory = path.dirname(fileURLToPath(import.meta.url));
const repositoryRoot = path.resolve(agyDirectory, "../..");
const evalsDirectory = path.join(repositoryRoot, "evals");
const skillsDirectory = path.join(repositoryRoot, "skills");

function usage() {
  return `Usage: node scripts/eval-antigravity/run.mjs [options]

Options:
  --case <glob>           Run matching case names (default: *)
  --tag <tag>             Run cases containing this tag
  --runs <n>              Repetitions per case and arm (default: 1)
  --ablation <mode>       none | with-without (default: with-without)
  --concurrency, -j <n>   Concurrent runs, 1-8 (default: 1)
  --model <model>         Antigravity model override (default: gemini-3.8-flash-low)
  --judge-model <model>   Model for LLM rubrics (default: gemini-3.8-flash-low)
  --skip-llm-graders      Skip calling LLM judge for rubrics
  --threshold <0..1>      Pass threshold for WITH arm score (default: 1.0)
  --quick                 Shorthand for --runs 1 --ablation none
  --dry-run               Print selected cases and grader compatibility
  --agy-bin <path>        Antigravity executable (default: agy)
  --help                  Show this help
`;
}

const OPTION_SPEC = {
  "--case": { key: "casePattern", type: "string", default: "*" },
  "--tag": { key: "tag", type: "string" },
  "--runs": { key: "runs", type: "number", default: 1 },
  "--ablation": { key: "ablation", type: "string", default: "with-without" },
  "--concurrency": { key: "concurrency", type: "number", default: 1 },
  "-j": { key: "concurrency", type: "number" },
  "--model": { key: "model", type: "string", default: "gemini-3.8-flash-low" },
  "--judge-model": { key: "judgeModel", type: "string", default: "gemini-3.8-flash-low" },
  "--skip-llm-graders": { key: "skipLlmGraders", type: "boolean", default: false },
  "--threshold": { key: "threshold", type: "number", default: 1.0 },
  "--quick": { key: "quick", type: "boolean", default: false },
  "--dry-run": { key: "dryRun", type: "boolean", default: false },
  "--agy-bin": { key: "agyBin", type: "string", default: "agy" },
  "--help": { key: "help", type: "boolean", default: false },
  "-h": { key: "help", type: "boolean" },
};

function parseArguments(argv) {
  const options = applyQuickShortcut(parseOptionsFromSpec(argv, OPTION_SPEC));
  if (options.help) return options;
  return validateCommonOptions(options);
}

function graderCompatibility(grader, options) {
  if (grader.type === "regex") return "supported";
  if (grader.type === "tool_used") return "supported";
  if (grader.type === "tool_order") return "supported";
  if (grader.type === "llm") return options.skipLlmGraders ? "disabled" : "supported";
  return "unsupported";
}

function dryRunReport(cases, skills, options) {
  const report = {
    cases: cases.map((evalCase) => ({
      name: evalCase.name,
      skill: primarySkillForCase(evalCase, skills),
      skills: requiredSkillsForCase(evalCase, skills),
      graders: evalCase.graders.map((g) => ({
        name: g.name,
        type: g.type,
        compatibility: graderCompatibility(g, options),
      })),
    })),
    summary: { cases: cases.length, graders: {} },
  };

  for (const grader of report.cases.flatMap((entry) => entry.graders)) {
    report.summary.graders[grader.compatibility] =
      (report.summary.graders[grader.compatibility] ?? 0) + 1;
  }
  return report;
}

function runProcess(bin, args, options = {}) {
  return new Promise((resolve) => {
    // agy 是原生 .exe（不像 claude/codex 那样常以 .cmd 装机脚本安装），探针 case 实测过：
    // 经 cmd.exe（shell: true）转发时，多行/带引号的长 prompt 会被 cmd 的行式解析打散成
    // 错误的参数，agy 收到的内容跟发出去的完全不一样。默认不走 shell，直接传参数数组，
    // 让 Windows CreateProcess 原样处理每个参数。
    const useShell = Boolean(options.shell);
    const target = spawnTarget(bin, args, useShell);
    const child = spawn(target.command, target.args, {
      cwd: options.cwd,
      shell: useShell,
      stdio: ["ignore", "pipe", "pipe"],
      windowsHide: true,
    });

    let stdout = "";
    let stderr = "";
    let timedOut = false;

    child.stdout.on("data", (chunk) => {
      stdout += chunk.toString("utf8");
    });
    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString("utf8");
    });

    const timer = options.timeoutMs
      ? setTimeout(() => {
          timedOut = true;
          child.kill();
        }, options.timeoutMs)
      : null;

    child.on("close", (code) => {
      if (timer) clearTimeout(timer);
      resolve({ code, stdout, stderr, timedOut });
    });
  });
}

async function runCase(evalCase, arm, runNumber, skills, options, resultsDirectory, isTwoArm) {
  const runDirectory = path.join(resultsDirectory, evalCase.name, arm, `run-${runNumber}`);
  const workspace = path.join(runDirectory, "workspace");
  await mkdir(runDirectory, { recursive: true });
  const skill = await initializeAgyWorkspace(workspace, evalCase, arm, skills);
  const timeoutMs = (evalCase.metadata.timeout_seconds ?? 300) * 1000;
  // prompt 原样发送，不做技能正文注入，也不翻译 Claude 风格的显式调用前缀——见 grill-me
  // 决策 Q2/Q3；只读/可写沙箱分级见决策 Q7。
  const effectivePrompt = evalCase.prompt;

  const args = buildAgyArgs({
    workspace,
    prompt: effectivePrompt,
    outputFormat: "stream-json",
    model: options.model,
    sandbox: sandboxFor(evalCase),
    timeoutMs,
  });

  await writeFile(path.join(runDirectory, "prompt.txt"), effectivePrompt, "utf8");
  await writeFile(
    path.join(runDirectory, "command.json"),
    JSON.stringify([options.agyBin, ...args], null, 2),
  );

  const processResult = await runProcess(options.agyBin, args, { cwd: workspace, timeoutMs });
  await writeFile(path.join(runDirectory, "stdout.txt"), processResult.stdout, "utf8");
  await writeFile(path.join(runDirectory, "stderr.txt"), processResult.stderr, "utf8");

  const agyResult = parseAgyOutput(processResult.stdout);
  const infrastructurePassed = !processResult.timedOut && processResult.code === 0;
  const infrastructureReason = processResult.timedOut
    ? "agy process timed out"
    : processResult.code !== 0
      ? `agy process exited with code ${processResult.code}`
      : null;

  const graderResults = [];
  if (infrastructurePassed) {
    for (const grader of evalCase.graders) {
      const indicator = isGraderIndicator(grader, isTwoArm);
      const evaluation = await evaluateGrader(
        grader,
        {
          prompt: evalCase.prompt,
          finalResponse: agyResult.finalResponse,
          workspace,
          toolCalls: agyResult.toolCalls,
          events: agyResult.events,
        },
        {
          agyBin: options.agyBin,
          judgeModel: options.judgeModel,
          model: options.model,
          skipLlmGraders: options.skipLlmGraders,
          // agy 判定一次简单 JSON 也常常要 40-100s+（探针 case 实测），judge 调用需要
          // 一个独立于主运行剩余预算的、够用的超时，而不是共享同一个 case 超时。
          timeoutMs: Math.max(timeoutMs, 180000),
          runDirectory,
          runProcess,
        },
      );

      graderResults.push({
        name: grader.name,
        type: grader.type,
        status: evaluation.status,
        reason: evaluation.reason,
        weight: grader.weight ?? 1,
        arm: grader.arm,
        scored: !indicator,
      });
    }
  } else {
    for (const grader of evalCase.graders) {
      const indicator = isGraderIndicator(grader, isTwoArm);
      graderResults.push({
        name: grader.name,
        type: grader.type,
        status: "not_run",
        reason: `Main agy run failed: ${infrastructureReason}`,
        weight: grader.weight ?? 1,
        arm: grader.arm,
        scored: !indicator,
      });
    }
  }

  const summary = summarizeGraderResults(graderResults, isTwoArm);
  const result = {
    case: evalCase.name,
    skill,
    arm,
    run: runNumber,
    prompt: evalCase.prompt,
    finalResponse: agyResult.finalResponse,
    toolCalls: agyResult.toolCalls,
    error: infrastructurePassed ? null : infrastructureReason,
    status: infrastructurePassed ? "completed" : "failed",
    durationSeconds: agyResult.duration,
    usage: agyResult.usage,
    ...summary,
    graders: graderResults,
  };

  await writeFile(path.join(runDirectory, "result.json"), JSON.stringify(result, null, 2));

  const icon = result.perfect ? "✔" : result.score === 0 ? "✖" : "▲";
  const graderSummary = graderResults.map((g) => `${g.name}: ${g.status}`).join(", ");
  const scoreStr = result.score != null ? result.score.toFixed(2) : "N/A";
  const durStr = `${(result.durationSeconds ?? 0).toFixed(1)}s`;
  process.stderr.write(`  ${icon} ${scoreStr} (${graderSummary}) · ${durStr}\n`);

  return result;
}

async function main() {
  let options;
  try {
    options = parseArguments(process.argv.slice(2));
  } catch (error) {
    process.stderr.write(`${error.message}\n${usage()}\n`);
    return 1;
  }

  if (options.help) {
    process.stdout.write(`${usage()}\n`);
    return 0;
  }

  const skills = await findSkills(skillsDirectory);
  const cases = await discoverCases(evalsDirectory, {
    casePattern: options.casePattern,
    tag: options.tag,
  });

  if (options.dryRun) {
    process.stdout.write(`${JSON.stringify(dryRunReport(cases, skills, options), null, 2)}\n`);
    return 0;
  }

  if (cases.length === 0) {
    process.stderr.write("No eval cases matched the requested filter.\n");
    return 1;
  }

  // 目录名要用文件系统安全的版本（冒号/点换成短横线），但那串就不再是能被 Date 解析回去
  // 的合法 ISO 字符串了——generateHtmlReport 需要的是原始 ISO 字符串，不是目录名。
  const generatedAt = new Date().toISOString();
  const timestamp = generatedAt.replaceAll(":", "-").replaceAll(".", "-");
  const resultsDirectory = path.join(evalsDirectory, "results", `antigravity-${timestamp}`);
  await mkdir(resultsDirectory, { recursive: true });

  const isTwoArm = options.ablation === "with-without";
  const arms = isTwoArm ? ["with", "without"] : ["with"];
  const tasks = [];
  for (const evalCase of cases) {
    for (const arm of arms) {
      for (let runNumber = 1; runNumber <= options.runs; runNumber += 1) {
        tasks.push({ evalCase, arm, runNumber });
      }
    }
  }

  const interruptController = createInterruptController();
  let crashed = false;

  const scheduled = await runWithConcurrency(tasks, options.concurrency, async (task) => {
    if (interruptController.signal) return null;
    process.stderr.write(
      `[Running] case=${task.evalCase.name} arm=${task.arm} run=${task.runNumber}/${options.runs}\n`,
    );
    try {
      return await runCase(
        task.evalCase,
        task.arm,
        task.runNumber,
        skills,
        options,
        resultsDirectory,
        isTwoArm,
      );
    } catch (error) {
      crashed = true;
      process.stderr.write(
        `[ERROR] case=${task.evalCase.name} arm=${task.arm}: ${error.message}\n`,
      );
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

  const caseSummary = summarizeCaseResults(results);
  await writeFile(
    path.join(resultsDirectory, "summary.json"),
    JSON.stringify(caseSummary, null, 2),
  );

  const htmlReport = generateHtmlReport({
    summary: caseSummary,
    runs: results,
    options,
    timestamp: generatedAt,
    resultsDirectory,
  });
  const htmlReportPath = path.join(resultsDirectory, "report.html");
  await writeFile(htmlReportPath, htmlReport, "utf8");

  process.stdout.write(`\n${formatSummaryTable(caseSummary)}\n`);
  process.stdout.write(`Report: ${htmlReportPath}\n`);

  const versionResult = await runProcess(options.agyBin, ["--version"]);
  const aggregateResult = buildAggregateResult({
    engine: "antigravity",
    engineVersion: versionResult.code === 0 ? versionResult.stdout.trim() : "unknown",
    generatedAt,
    options: {
      casePattern: options.casePattern,
      tag: options.tag ?? null,
      runs: options.runs,
      ablation: options.ablation,
      concurrency: options.concurrency,
      model: options.model ?? null,
      judgeModel: options.judgeModel ?? null,
      threshold: options.threshold,
      skipLlmGraders: options.skipLlmGraders,
    },
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
    (c) => c.aggregates.score != null && c.aggregates.score < options.threshold,
  );

  if (belowThreshold) {
    const failing = aggregateResult.cases.filter(
      (c) => c.aggregates.score != null && c.aggregates.score < options.threshold,
    );
    process.stderr.write(
      `\n[FAIL] 共有 ${failing.length} 个用例得分低于门禁阈值 ${options.threshold}：\n`,
    );
    for (const item of failing) {
      process.stderr.write(
        `  - ${item.name}: 得分 ${item.aggregates.score.toFixed(2)} (要求 >= ${options.threshold})\n`,
      );
    }
  }

  return exitCodeFor({
    interruptSignal: interruptController.signal,
    crashed,
    belowThreshold,
  });
}

main()
  .then((code) => {
    process.exitCode = code;
  })
  .catch((error) => {
    process.stderr.write(`${error.stack ?? error.message}\n`);
    process.exitCode = 1;
  });
