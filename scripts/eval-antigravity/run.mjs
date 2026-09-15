#!/usr/bin/env node

import { spawn } from "node:child_process";
import { writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  applyQuickShortcut,
  buildDryRunReport,
  commonAggregateOptions,
  parseOptionsFromSpec,
  validateCommonOptions,
} from "../eval-cli-shared.lib.mjs";
import { runEvalCase, runEvalSuite } from "../eval-suite-runner.lib.mjs";
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

function createAgyCaseAdapter(skills, options) {
  return {
    displayName: "agy",
    isGraderIndicator,
    summarizeGraderResults,
    initializeWorkspace: ({ workspace, evalCase, arm }) =>
      initializeAgyWorkspace(workspace, evalCase, arm, skills),
    execute: async ({ evalCase, runDirectory, workspace, timeoutMs }) => {
      const args = buildAgyArgs({
        workspace,
        prompt: evalCase.prompt,
        outputFormat: "stream-json",
        model: options.model,
        sandbox: sandboxFor(evalCase),
        timeoutMs,
      });
      await writeFile(path.join(runDirectory, "prompt.txt"), evalCase.prompt, "utf8");
      await writeFile(
        path.join(runDirectory, "command.json"),
        JSON.stringify([options.agyBin, ...args], null, 2),
      );
      const processResult = await runProcess(options.agyBin, args, { cwd: workspace, timeoutMs });
      await writeFile(path.join(runDirectory, "stdout.txt"), processResult.stdout, "utf8");
      await writeFile(path.join(runDirectory, "stderr.txt"), processResult.stderr, "utf8");
      const parsed = parseAgyOutput(processResult.stdout);
      const passed = !processResult.timedOut && processResult.code === 0;
      const reason = processResult.timedOut
        ? "agy process timed out"
        : processResult.code !== 0
          ? `agy process exited with code ${processResult.code}`
          : null;
      return {
        passed,
        reason,
        finalResponse: parsed.finalResponse,
        toolCalls: parsed.toolCalls,
        events: parsed.events,
        durationSeconds: parsed.duration,
        usage: parsed.usage,
        resultFields: { status: passed ? "completed" : "failed" },
      };
    },
    evaluateGrader: (grader, run, { timeoutMs, runDirectory }) =>
      evaluateGrader(grader, run, {
        agyBin: options.agyBin,
        judgeModel: options.judgeModel,
        model: options.model,
        skipLlmGraders: options.skipLlmGraders,
        timeoutMs: Math.max(timeoutMs, 180000),
        runDirectory,
        runProcess,
      }),
    formatGrader: (grader, evaluation, indicator) => ({
      name: grader.name,
      type: grader.type,
      status: evaluation.status,
      reason: evaluation.reason,
      weight: grader.weight ?? 1,
      arm: grader.arm,
      scored: !indicator,
    }),
  };
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
    process.stdout.write(
      `${JSON.stringify(
        buildDryRunReport(cases, skills, {
          primarySkillForCase,
          requiredSkillsForCase,
          graderCompatibility: (grader) => graderCompatibility(grader, options),
        }),
        null,
        2,
      )}\n`,
    );
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
  const isTwoArm = options.ablation === "with-without";
  const caseAdapter = createAgyCaseAdapter(skills, options);
  const versionResult = await runProcess(options.agyBin, ["--version"]);
  const outcome = await runEvalSuite({
    cases,
    options,
    resultsDirectory,
    generatedAt,
    engine: {
      name: "antigravity",
      version: versionResult.code === 0 ? versionResult.stdout.trim() : "unknown",
      runCase: ({ evalCase, arm, runNumber }) =>
        runEvalCase({
          evalCase,
          arm,
          runNumber,
          resultsDirectory,
          isTwoArm,
          adapter: caseAdapter,
        }),
      formatRun: (result) => {
        const icon = result.perfect ? "✔" : result.score === 0 ? "✖" : "▲";
        const graders = result.graders.map((g) => `${g.name}: ${g.status}`).join(", ");
        const score = result.score != null ? result.score.toFixed(2) : "N/A";
        return `  ${icon} ${score} (${graders}) · ${(result.durationSeconds ?? 0).toFixed(1)}s`;
      },
      formatSummary: (summary) => formatSummaryTable(summary),
      renderReport: ({ summary, results }) =>
        generateHtmlReport({
          summary,
          runs: results,
          options,
          timestamp: generatedAt,
          resultsDirectory,
        }),
      aggregateOptions: () => commonAggregateOptions(options),
      reportThresholdFailure: ({ aggregateResult, threshold, io }) => {
        const failing = aggregateResult.cases.filter(
          (entry) => entry.aggregates.score != null && entry.aggregates.score < threshold,
        );
        if (!failing.length) return;
        io.stderr.write(`\n[FAIL] 共有 ${failing.length} 个用例得分低于门禁阈值 ${threshold}：\n`);
        for (const item of failing) {
          io.stderr.write(
            `  - ${item.name}: 得分 ${item.aggregates.score.toFixed(2)}（要求 >= ${threshold}）\n`,
          );
        }
      },
    },
  });
  return outcome.exitCode;
}

main()
  .then((code) => {
    process.exitCode = code;
  })
  .catch((error) => {
    process.stderr.write(`${error.stack ?? error.message}\n`);
    process.exitCode = 1;
  });
