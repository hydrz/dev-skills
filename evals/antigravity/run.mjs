#!/usr/bin/env node

import { spawn } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  buildAgyArgs,
  discoverCases,
  evaluateRegexGrader,
  findSkills,
  initializeAgyWorkspace,
  parseAgyOutput,
  summarizeGraderResults,
  summarizeResults,
} from "./lib.mjs";

const agyDirectory = path.dirname(fileURLToPath(import.meta.url));
const repositoryRoot = path.resolve(agyDirectory, "../..");
const evalsDirectory = path.join(repositoryRoot, "evals");
const skillsDirectory = path.join(repositoryRoot, "skills");

function usage() {
  return `Usage: node evals/antigravity/run.mjs [options]

Options:
  --case <glob>          Run matching case names (default: *)
  --tag <tag>            Run cases containing this tag
  --runs <n>             Repetitions per case and arm (default: 1)
  --arm <with|without|both>
                         Skill ablation arm (default: with)
  --model <model>        Antigravity model override (default: gemini-3.8-flash-low)
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
    else if (argument === "--agy-bin") options.agyBin = next();
    else if (argument === "--dry-run") options.dryRun = true;
    else if (argument === "--help" || argument === "-h") options.help = true;
    else throw new Error(`Unknown option: ${argument}`);
  }

  if (!Number.isInteger(options.runs) || options.runs < 1) {
    throw new Error("--runs must be a positive integer");
  }
  if (!["with", "without", "both"].includes(options.arm)) {
    throw new Error("--arm must be with, without, or both");
  }
  return options;
}

function graderCompatibility(grader) {
  if (grader.type === "regex") return "supported";
  if (grader.type === "tool_used" && grader.tool === "Skill") return "indicator";
  return "unsupported";
}

function dryRunReport(cases, skills) {
  return {
    cases: cases.map((evalCase) => ({
      name: evalCase.name,
      skill: (evalCase.metadata.tags ?? []).find((t) => skills.has(t)) ?? null,
      graders: evalCase.graders.map((g) => ({
        name: g.name,
        type: g.type,
        compatibility: graderCompatibility(g),
      })),
    })),
  };
}

function runProcess(bin, args, options = {}) {
  return new Promise((resolve) => {
    const child = spawn(bin, args, {
      cwd: options.cwd,
      shell: true,
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

async function runCase(evalCase, arm, runNumber, skills, options, resultsDirectory) {
  const runDirectory = path.join(resultsDirectory, evalCase.name, arm, `run-${runNumber}`);
  const workspace = path.join(runDirectory, "workspace");
  await mkdir(runDirectory, { recursive: true });
  const skill = await initializeAgyWorkspace(workspace, evalCase, arm, skills);
  const timeoutMs = (evalCase.metadata.timeout_seconds ?? 300) * 1000;

  const args = buildAgyArgs({
    prompt: evalCase.prompt,
    model: options.model,
    timeoutMs,
  });

  await writeFile(path.join(runDirectory, "prompt.txt"), evalCase.prompt, "utf8");
  await writeFile(path.join(runDirectory, "command.json"), JSON.stringify([options.agyBin, ...args], null, 2));

  const processResult = await runProcess(options.agyBin, args, { cwd: workspace });
  await writeFile(path.join(runDirectory, "stdout.txt"), processResult.stdout, "utf8");
  await writeFile(path.join(runDirectory, "stderr.txt"), processResult.stderr, "utf8");

  const agyResult = parseAgyOutput(processResult.stdout);
  const graderResults = [];

  for (const grader of evalCase.graders) {
    if (grader.type === "regex") {
      const evaluation = await evaluateRegexGrader(grader, {
        finalResponse: agyResult.finalResponse,
        workspace,
      });
      graderResults.push({
        name: grader.name,
        type: grader.type,
        status: evaluation.status,
        reason: evaluation.reason,
        weight: grader.weight ?? 1,
      });
    } else {
      graderResults.push({
        name: grader.name,
        type: grader.type,
        status: "unsupported",
        reason: `Grader type '${grader.type}' is unsupported in agy runner`,
        weight: grader.weight ?? 1,
      });
    }
  }

  const summary = summarizeGraderResults(graderResults);
  const result = {
    case: evalCase.name,
    skill,
    arm,
    run: runNumber,
    status: processResult.code === 0 ? "completed" : "failed",
    durationSeconds: agyResult.duration,
    usage: agyResult.usage,
    ...summary,
    graders: graderResults,
  };

  await writeFile(path.join(runDirectory, "result.json"), JSON.stringify(result, null, 2));
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
    console.log(JSON.stringify(dryRunReport(cases, skills), null, 2));
    process.exit(0);
  }

  if (cases.length === 0) {
    console.error("No eval cases matched the requested filter.");
    process.exit(1);
  }

  const timestamp = new Date().toISOString().replaceAll(":", "-").replaceAll(".", "-");
  const resultsDirectory = path.join(evalsDirectory, "results", `antigravity-${timestamp}`);
  await mkdir(resultsDirectory, { recursive: true });

  const arms = options.arm === "both" ? ["with", "without"] : [options.arm];
  const runs = [];

  for (const evalCase of cases) {
    for (const arm of arms) {
      for (let runNumber = 1; runNumber <= options.runs; runNumber += 1) {
        console.log(`[Running] case=${evalCase.name} arm=${arm} run=${runNumber}/${options.runs}`);
        const result = await runCase(evalCase, arm, runNumber, skills, options, resultsDirectory);
        runs.push(result);
      }
    }
  }

  const summary = summarizeResults(runs);
  await writeFile(path.join(resultsDirectory, "summary.json"), JSON.stringify(summary, null, 2));

  console.log("\n=== 评测结果汇总 ===");
  for (const caseSummary of summary.cases) {
    console.log(`- ${caseSummary.name}: with=${caseSummary.withScore ?? "N/A"} without=${caseSummary.withoutScore ?? "N/A"} delta=${caseSummary.delta ?? "N/A"}`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
