#!/usr/bin/env node

import { spawn } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

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
  summarizeGraderResults,
  summarizeResults,
} from "./lib.mjs";

const agyDirectory = path.dirname(fileURLToPath(import.meta.url));
const repositoryRoot = path.resolve(agyDirectory, "../..");
const evalsDirectory = path.join(repositoryRoot, "evals");
const skillsDirectory = path.join(repositoryRoot, "skills");

function usage() {
  return `Usage: node scripts/eval-antigravity/run.mjs [options]

Options:
  --case <glob>          Run matching case names (default: *)
  --tag <tag>            Run cases containing this tag
  --runs <n>             Repetitions per case and arm (default: 1)
  --arm <with|without|both>
                         Skill ablation arm (default: with)
  --model <model>        Antigravity model override (default: gemini-3.8-flash-low)
  --judge-model <model>  Model for LLM rubrics (default: gemini-3.8-flash-low)
  --skip-llm-graders     Skip calling LLM judge for rubrics
  --threshold <0..1>     Pass threshold for WITH arm score (default: 1.0)
  --dry-run              Print selected cases and grader compatibility
  --agy-bin <path>       Antigravity executable (default: agy)
  --help                 Show this help
`;
}

function parseArguments(argv) {
  const options = {
    casePattern: "*",
    runs: 1,
    arm: "with",
    model: "gemini-3.8-flash-low",
    judgeModel: "gemini-3.8-flash-low",
    skipLlmGraders: false,
    threshold: 1.0,
    agyBin: "agy",
    dryRun: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    const next = () => {
      index += 1;
      if (index >= argv.length) throw new Error(`${argument} requires a value`);
      return argv[index];
    };

    if (argument === "--case") options.casePattern = next();
    else if (argument === "--tag") options.tag = next();
    else if (argument === "--runs") options.runs = Number(next());
    else if (argument === "--arm") options.arm = next();
    else if (argument === "--model") options.model = next();
    else if (argument === "--judge-model") options.judgeModel = next();
    else if (argument === "--skip-llm-graders") options.skipLlmGraders = true;
    else if (argument === "--threshold") options.threshold = Number(next());
    else if (argument === "--agy-bin") options.agyBin = next();
    else if (argument === "--dry-run") options.dryRun = true;
    else if (argument === "--help" || argument === "-h") options.help = true;
    else {
      throw new Error(
        `Unknown option: ${argument}. In Windows PowerShell, npm drops a bare --; use: npm run eval:agy '--' --case <name>`,
      );
    }
  }

  if (!Number.isInteger(options.runs) || options.runs < 1) {
    throw new Error("--runs must be a positive integer");
  }
  if (!["with", "without", "both"].includes(options.arm)) {
    throw new Error("--arm must be with, without, or both");
  }
  if (Number.isNaN(options.threshold) || options.threshold < 0 || options.threshold > 1) {
    throw new Error("--threshold must be a number between 0 and 1");
  }
  return options;
}

function graderCompatibility(grader, options) {
  if (grader.type === "regex") return "supported";
  if (grader.type === "tool_used") return "supported";
  if (grader.type === "tool_order") return "supported";
  if (grader.type === "llm") return options.skipLlmGraders ? "disabled" : "supported";
  return "unsupported";
}

function dryRunReport(cases, skills, options) {
  return {
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
  };
}

function runProcess(bin, args, options = {}) {
  return new Promise((resolve) => {
    const child = spawn(bin, args, {
      cwd: options.cwd,
      shell: false,
      stdio: ["ignore", "pipe", "pipe"],
    });

    let stdout = "";
    let stderr = "";

    child.stdout.on("data", (chunk) => {
      stdout += chunk.toString("utf8");
    });
    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString("utf8");
    });

    child.on("close", (code) => {
      resolve({ code, stdout, stderr });
    });
  });
}

async function runCase(evalCase, arm, runNumber, skills, options, resultsDirectory, isTwoArm) {
  const runDirectory = path.join(resultsDirectory, evalCase.name, arm, `run-${runNumber}`);
  const workspace = path.join(runDirectory, "workspace");
  await mkdir(runDirectory, { recursive: true });
  const skill = await initializeAgyWorkspace(workspace, evalCase, arm, skills);
  const timeoutMs = (evalCase.metadata.timeout_seconds ?? 300) * 1000;

  const args = buildAgyArgs({
    workspace,
    prompt: evalCase.prompt,
    outputFormat: "stream-json",
    model: options.model,
    timeoutMs,
  });

  await writeFile(path.join(runDirectory, "prompt.txt"), evalCase.prompt, "utf8");
  await writeFile(
    path.join(runDirectory, "command.json"),
    JSON.stringify([options.agyBin, ...args], null, 2),
  );

  const processResult = await runProcess(options.agyBin, args, { cwd: workspace });
  await writeFile(path.join(runDirectory, "stdout.txt"), processResult.stdout, "utf8");
  await writeFile(path.join(runDirectory, "stderr.txt"), processResult.stderr, "utf8");

  const agyResult = parseAgyOutput(processResult.stdout);
  const graderResults = [];

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

  const summary = summarizeGraderResults(graderResults, isTwoArm);
  const result = {
    case: evalCase.name,
    skill,
    arm,
    run: runNumber,
    prompt: evalCase.prompt,
    finalResponse: agyResult.finalResponse,
    toolCalls: agyResult.toolCalls,
    status: processResult.code === 0 ? "completed" : "failed",
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
  console.log(`  ${icon} ${scoreStr} (${graderSummary}) · ${durStr}`);

  return result;
}

async function main() {
  let options;
  try {
    options = parseArguments(process.argv.slice(2));
  } catch (error) {
    console.error(error.message);
    console.error(usage());
    process.exit(1);
  }

  if (options.help) {
    console.log(usage());
    process.exit(0);
  }

  const skills = await findSkills(skillsDirectory);
  const cases = await discoverCases(evalsDirectory, {
    casePattern: options.casePattern,
    tag: options.tag,
  });

  if (options.dryRun) {
    console.log(JSON.stringify(dryRunReport(cases, skills, options), null, 2));
    process.exit(0);
  }

  if (cases.length === 0) {
    console.error("No eval cases matched the requested filter.");
    process.exit(1);
  }

  const timestamp = new Date().toISOString().replaceAll(":", "-").replaceAll(".", "-");
  const resultsDirectory = path.join(evalsDirectory, "results", `antigravity-${timestamp}`);
  await mkdir(resultsDirectory, { recursive: true });

  const isTwoArm = options.arm === "both";
  const arms = isTwoArm ? ["with", "without"] : [options.arm];
  const runs = [];

  for (const evalCase of cases) {
    for (const arm of arms) {
      for (let runNumber = 1; runNumber <= options.runs; runNumber += 1) {
        console.log(`[Running] case=${evalCase.name} arm=${arm} run=${runNumber}/${options.runs}`);
        const result = await runCase(
          evalCase,
          arm,
          runNumber,
          skills,
          options,
          resultsDirectory,
          isTwoArm,
        );
        runs.push(result);
      }
    }
  }

  const summary = summarizeResults(runs, isTwoArm);
  await writeFile(path.join(resultsDirectory, "summary.json"), JSON.stringify(summary, null, 2));

  const htmlReport = generateHtmlReport({
    summary,
    runs,
    options,
    timestamp,
    resultsDirectory,
  });
  const htmlReportPath = path.join(resultsDirectory, "report.html");
  await writeFile(htmlReportPath, htmlReport, "utf8");

  console.log(`\n${formatSummaryTable(summary)}\n`);
  console.log(`Report: ${htmlReportPath}`);

  // 门禁判定：检查 WITH 臂得分是否达标
  const belowThreshold = [];
  for (const [caseName, caseSummary] of Object.entries(summary.cases)) {
    if (caseSummary.with?.meanScore != null && caseSummary.with.meanScore < options.threshold) {
      belowThreshold.push({
        name: caseName,
        score: caseSummary.with.meanScore,
      });
    }
  }

  if (belowThreshold.length > 0) {
    console.error(
      `\n[FAIL] 共有 ${belowThreshold.length} 个用例得分低于门禁阈值 ${options.threshold}：`,
    );
    for (const item of belowThreshold) {
      console.error(
        `  - ${item.name}: 得分 ${item.score.toFixed(2)} (要求 >= ${options.threshold})`,
      );
    }
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
