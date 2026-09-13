#!/usr/bin/env node
// 约束型 skill 的压力场景评测。
// 每个场景分别在“基线”（不加载 skill）和“加载 skill”两种条件下运行，
// 对比 agent 的选择。用法见 evals/README.md。

import { execFileSync, spawn } from "node:child_process";
import { mkdirSync, mkdtempSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const SCENARIO_DIR = join(ROOT, "evals", "scenarios");
const RESULT_DIR = join(ROOT, "evals", "results");

const SCHEMA = JSON.stringify({
  type: "object",
  properties: {
    choice: { type: "string", enum: ["A", "B", "C", "D"] },
    reason: { type: "string" },
  },
  required: ["choice", "reason"],
  additionalProperties: false,
});

// 场景只要求作出选择，不需要读写环境。
const DISALLOWED_TOOLS = [
  "Bash", "PowerShell", "Read", "Write", "Edit", "Glob", "Grep",
  "WebFetch", "WebSearch", "Agent", "Skill", "NotebookEdit",
];

// 旧版本 CLI 没有 --append-system-prompt-file，回退为把内容直接作为参数传入。
const SUPPORTS_PROMPT_FILE = (() => {
  try {
    return execFileSync("claude", ["--help"], { encoding: "utf8" }).includes("--append-system-prompt-file");
  } catch {
    return false;
  }
})();

function parseArgs(argv) {
  const opts = { runs: 2, concurrency: 4, skill: null, id: null, model: null, only: null, dryRun: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    const next = () => argv[++i];
    if (a === "--runs") opts.runs = Number(next());
    else if (a === "--concurrency") opts.concurrency = Number(next());
    else if (a === "--skill") opts.skill = next();
    else if (a === "--id") opts.id = next();
    else if (a === "--model") opts.model = next();
    else if (a === "--baseline-only") opts.only = "baseline";
    else if (a === "--skill-only") opts.only = "skill";
    else if (a === "--dry-run") opts.dryRun = true;
    else if (a === "-h" || a === "--help") {
      console.log("node evals/run.mjs [--skill 名称] [--id 场景id] [--runs 2] [--concurrency 4] [--model 模型] [--baseline-only|--skill-only] [--dry-run]");
      process.exit(0);
    } else {
      console.error(`未知参数：${a}`);
      process.exit(2);
    }
  }
  return opts;
}

function walk(dir) {
  return readdirSync(dir).flatMap((name) => {
    const p = join(dir, name);
    return statSync(p).isDirectory() ? walk(p) : p.endsWith(".md") ? [p] : [];
  });
}

function parseScenario(file) {
  const text = readFileSync(file, "utf8").replace(/\r\n/g, "\n");
  const m = text.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!m) throw new Error(`${file} 缺少 frontmatter`);
  const meta = Object.fromEntries(
    m[1].split("\n").filter(Boolean).map((line) => {
      const idx = line.indexOf(":");
      return [line.slice(0, idx).trim(), line.slice(idx + 1).trim()];
    }),
  );
  for (const key of ["skill", "expected"]) {
    if (!meta[key]) throw new Error(`${file} 缺少 ${key}`);
  }
  const id = relative(SCENARIO_DIR, file).replace(/\\/g, "/").replace(/\.md$/, "");
  return {
    id,
    file,
    skill: meta.skill,
    expected: meta.expected.split(/[,，\s]+/).filter(Boolean),
    pressures: meta.pressures ?? "",
    prompt: m[2].trim(),
  };
}

function findSkillFile(skill) {
  for (const bucket of readdirSync(join(ROOT, "skills"))) {
    const p = join(ROOT, "skills", bucket, skill, "SKILL.md");
    try {
      statSync(p);
      return p;
    } catch {}
  }
  throw new Error(`找不到 skill：${skill}`);
}

function runClaude({ prompt, skillFile, model }) {
  const cwd = mkdtempSync(join(tmpdir(), "dev-skills-eval-"));
  const args = [
    // 关闭所有已安装的 skill（包括其他插件中的同名 skill），只通过系统提示注入被测 skill。
    // 不使用 --bare：它会跳过登录凭据。
    "-p", "--disable-slash-commands", "--no-session-persistence",
    "--output-format", "json",
    "--json-schema", SCHEMA,
    "--disallowedTools", ...DISALLOWED_TOOLS,
  ];
  if (model) args.push("--model", model);
  if (skillFile) {
    const context = `当前会话已加载以下 skill：\n\n${readFileSync(skillFile, "utf8")}`;
    if (SUPPORTS_PROMPT_FILE) {
      const promptFile = join(cwd, "skill-context.md");
      writeFileSync(promptFile, context);
      args.push("--append-system-prompt-file", promptFile);
    } else {
      args.push("--append-system-prompt", context);
    }
  }
  return new Promise((resolve) => {
    const child = spawn("claude", args, { cwd, stdio: ["pipe", "pipe", "pipe"] });
    let out = "";
    let err = "";
    child.stdout.on("data", (d) => (out += d));
    child.stderr.on("data", (d) => (err += d));
    child.on("close", (code) => resolve(parseOutput(out, err, code)));
    child.stdin.end(prompt);
  });
}

function parseOutput(out, err, code) {
  try {
    const json = JSON.parse(out);
    if (json.is_error) return { choice: "!", reason: `claude 返回错误：${String(json.result).slice(0, 300)}` };
    let answer = json.structured_output;
    if (!answer && typeof json.result === "string") {
      try {
        answer = JSON.parse(json.result);
      } catch {
        const m = json.result.match(/\b([A-D])\b/);
        answer = m ? { choice: m[1], reason: json.result } : null;
      }
    }
    if (answer?.choice) return { choice: answer.choice, reason: answer.reason ?? "" };
    return { choice: "?", reason: `无法解析输出：${out.slice(0, 300)}` };
  } catch {
    return { choice: "!", reason: `claude 退出码 ${code}：${(err || out).slice(0, 300)}` };
  }
}

async function pool(tasks, limit) {
  const results = new Array(tasks.length);
  let next = 0;
  async function worker() {
    while (next < tasks.length) {
      const i = next++;
      results[i] = await tasks[i]();
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, tasks.length) }, worker));
  return results;
}

async function main() {
  const opts = parseArgs(process.argv.slice(2));
  const scenarios = walk(SCENARIO_DIR)
    .map(parseScenario)
    .filter((s) => (!opts.skill || s.skill === opts.skill) && (!opts.id || s.id === opts.id))
    .sort((a, b) => a.id.localeCompare(b.id));
  if (scenarios.length === 0) {
    console.error("没有匹配的场景");
    process.exit(2);
  }

  const modes = opts.only ? [opts.only] : ["baseline", "skill"];
  const jobs = [];
  for (const s of scenarios) {
    const skillFile = findSkillFile(s.skill);
    for (const mode of modes) {
      for (let run = 1; run <= opts.runs; run++) {
        jobs.push({ scenario: s, mode, run, skillFile: mode === "skill" ? skillFile : null });
      }
    }
  }

  if (opts.dryRun) {
    for (const j of jobs) console.log(`${j.scenario.id}\t${j.mode}\t#${j.run}\texpected=${j.scenario.expected.join("/")}`);
    console.log(`共 ${jobs.length} 次调用`);
    return;
  }

  console.log(`运行 ${scenarios.length} 个场景，${jobs.length} 次调用，并发 ${opts.concurrency}……`);
  const outcomes = await pool(
    jobs.map((j) => async () => {
      const r = await runClaude({ prompt: j.scenario.prompt, skillFile: j.skillFile, model: opts.model });
      process.stdout.write(r.choice === "!" || r.choice === "?" ? "x" : ".");
      return { ...j, ...r };
    }),
    opts.concurrency,
  );
  process.stdout.write("\n\n");

  const report = scenarios.map((s) => {
    const pick = (mode) => outcomes.filter((o) => o.scenario === s && o.mode === mode);
    const baseline = pick("baseline");
    const withSkill = pick("skill");
    const ok = (o) => s.expected.includes(o.choice);
    return {
      id: s.id,
      skill: s.skill,
      expected: s.expected,
      pressures: s.pressures,
      baseline: baseline.map(({ choice, reason }) => ({ choice, reason })),
      withSkill: withSkill.map(({ choice, reason }) => ({ choice, reason })),
      // 完成条件：加载 skill 的每次运行都作出正确选择。
      pass: withSkill.length > 0 ? withSkill.every(ok) : null,
      // 基线也全部正确时，场景的压力可能不足，无法证明 skill 起了作用。
      baselineAlreadyPasses: baseline.length > 0 && baseline.every(ok),
    };
  });

  const cell = (runs) => (runs.length ? runs.map((r) => r.choice).join(" ") : "-");
  console.log(["场景", "期望", "基线", "加载 skill", "结果"].join("\t"));
  for (const r of report) {
    const verdict = r.pass === null ? "-" : r.pass ? (r.baselineAlreadyPasses ? "通过（基线也通过，压力不足）" : "通过") : "失败";
    console.log([r.id, r.expected.join("/"), cell(r.baseline), cell(r.withSkill), verdict].join("\t"));
  }

  for (const r of report.filter((r) => r.pass === false)) {
    console.log(`\n失败：${r.id}`);
    for (const w of r.withSkill.filter((o) => !r.expected.includes(o.choice))) {
      console.log(`  选择 ${w.choice}：${w.reason}`);
    }
  }

  mkdirSync(RESULT_DIR, { recursive: true });
  const outFile = join(RESULT_DIR, `${new Date().toISOString().replace(/[:.]/g, "-")}.json`);
  writeFileSync(outFile, JSON.stringify({ options: opts, report }, null, 2));
  console.log(`\n完整结果（含每次选择的理由）：${relative(ROOT, outFile)}`);

  const failed = report.filter((r) => r.pass === false).length;
  process.exit(failed > 0 ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(2);
});
