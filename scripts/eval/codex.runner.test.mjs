import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtemp, mkdir, readFile, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import {
  buildCodexArgs,
  classifyRunInfrastructure,
  copyRequiredSkills,
  discoverCases,
  evaluateGrader,
  evaluateRegexGrader,
  evaluateToolOrderGrader,
  extractCodexToolCalls,
  findSkills,
  formatSummaryTable,
  generateHtmlReport,
  isGraderIndicator,
  parseJsonl,
  parseMarkdownWithFrontmatter,
  primarySkillForCase,
  requiredSkillsForCase,
  summarizeGraderResults,
  summarizeResults,
} from "./codex.lib.mjs";

test("parses the existing prompt and grader frontmatter shapes", () => {
  const document = parseMarkdownWithFrontmatter(`---
description: 示例
tags: [tdd, trigger, behavior]
max_turns: 8
target:
  source: file
  path: CONTEXT.md
---

用户请求
`);

  assert.deepEqual(document.attributes, {
    description: "示例",
    tags: ["tdd", "trigger", "behavior"],
    max_turns: 8,
    target: { source: "file", path: "CONTEXT.md" },
  });
  assert.equal(document.body, "用户请求");
});

test("requiredSkillsForCase prefers an explicit multi-skill list", () => {
  const skills = new Map([
    ["writing-chinese", "skills/writing-chinese"],
    ["writing-for-agents", "skills/writing-for-agents"],
  ]);
  const evalCase = {
    name: "combined-writing",
    metadata: {
      tags: ["writing-chinese", "behavior"],
      required_skills: ["writing-chinese", "writing-for-agents"],
    },
  };

  assert.deepEqual(requiredSkillsForCase(evalCase, skills), [
    "writing-chinese",
    "writing-for-agents",
  ]);
  assert.equal(primarySkillForCase(evalCase, skills), "writing-chinese");
});

test("copyRequiredSkills installs multiple skills and keeps tag fallback", async () => {
  const workspace = await mkdtemp(path.join(os.tmpdir(), "codex-skills-workspace-"));
  const skillsRoot = await mkdtemp(path.join(os.tmpdir(), "codex-skills-source-"));
  const skills = new Map();

  for (const name of ["writing-chinese", "writing-for-agents"]) {
    const directory = path.join(skillsRoot, name);
    await mkdir(directory, { recursive: true });
    await writeFile(path.join(directory, "SKILL.md"), `# ${name}\n`, "utf8");
    skills.set(name, directory);
  }

  const multiCase = {
    name: "combined-writing",
    metadata: {
      tags: ["writing-chinese"],
      required_skills: ["writing-for-agents", "writing-chinese"],
    },
  };
  await copyRequiredSkills(workspace, multiCase, skills);
  assert.equal(primarySkillForCase(multiCase, skills), "writing-chinese");
  for (const name of ["writing-chinese", "writing-for-agents"]) {
    assert.match(
      await readFile(path.join(workspace, ".agents", "skills", name, "SKILL.md"), "utf8"),
      new RegExp(name),
    );
  }

  const singleCase = { name: "single-writing", metadata: { tags: ["writing-chinese"] } };
  assert.deepEqual(requiredSkillsForCase(singleCase, skills), ["writing-chinese"]);
});

test("regex grader checks the final response", async () => {
  const result = await evaluateRegexGrader(
    { pattern: "越界|undefined", flags: "i" },
    { finalResponse: "这里存在 off-by-one，可能读到 undefined。" },
  );

  assert.equal(result.status, "passed");
});

test("regex grader can check a workspace file", async () => {
  const workspace = await mkdtemp(path.join(os.tmpdir(), "dev-skills-regex-"));
  await mkdir(workspace, { recursive: true });
  await writeFile(path.join(workspace, "CONTEXT.md"), "**客户**\n\n_避免_：账户\n");

  const result = await evaluateRegexGrader(
    {
      pattern: "\\*\\*客户\\*\\*[\\s\\S]{0,300}_避免_",
      target: { source: "file", path: "CONTEXT.md" },
    },
    { workspace },
  );

  assert.equal(result.status, "passed");
});

test("tool order grader maps Claude Write matchers to Codex file_change events", () => {
  const events = [
    {
      type: "item.completed",
      item: {
        type: "file_change",
        status: "completed",
        changes: [{ path: "src/parseDuration.test.ts", kind: "add" }],
      },
    },
    {
      type: "item.completed",
      item: {
        type: "file_change",
        status: "completed",
        changes: [{ path: "src/parseDuration.ts", kind: "add" }],
      },
    },
  ];

  const result = evaluateToolOrderGrader(
    {
      before: { tool: "Write", input_match: "parseDuration\\.test\\.ts" },
      after: { tool: "Write", input_match: 'parseDuration\\.ts"' },
    },
    { events },
  );

  assert.equal(result.status, "passed");
});

test("tool order grader is inconclusive when both paths share one patch", () => {
  const events = [
    {
      type: "item.completed",
      item: {
        type: "file_change",
        status: "completed",
        changes: [
          { path: "src/parseDuration.test.ts", kind: "add" },
          { path: "src/parseDuration.ts", kind: "add" },
        ],
      },
    },
  ];

  const result = evaluateToolOrderGrader(
    {
      before: { input_match: "parseDuration\\.test\\.ts" },
      after: { input_match: 'parseDuration\\.ts"' },
    },
    { events },
  );

  assert.equal(result.status, "inconclusive");
});

test("discovers cases and filters them by tag and case glob", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "dev-skills-cases-"));
  await mkdir(path.join(root, "case-one"), { recursive: true });
  await mkdir(path.join(root, "case-two"), { recursive: true });
  await mkdir(path.join(root, "results"), { recursive: true });
  await writeFile(
    path.join(root, "case-one", "prompt.md"),
    "---\ntags: [tdd, behavior]\n---\n\nfirst",
  );
  await writeFile(
    path.join(root, "case-two", "prompt.md"),
    "---\ntags: [grilling, negative]\n---\n\nsecond",
  );

  const cases = await discoverCases(root, { casePattern: "case-*", tag: "tdd" });

  assert.deepEqual(
    cases.map((entry) => entry.name),
    ["case-one"],
  );
  assert.equal(cases[0].prompt, "first");
});

test("builds an isolated codex exec invocation", () => {
  const args = buildCodexArgs({
    workspace: "C:/tmp/eval-case",
    sandbox: "workspace-write",
    model: "gpt-5.6-sol",
    reasoning: "high",
    json: true,
  });

  assert.deepEqual(args, [
    "--ask-for-approval",
    "never",
    "exec",
    "--ephemeral",
    "--ignore-user-config",
    "--ignore-rules",
    "--sandbox",
    "workspace-write",
    "--cd",
    "C:/tmp/eval-case",
    "--model",
    "gpt-5.6-sol",
    "--config",
    'model_reasoning_effort="high"',
    "--json",
    "-",
  ]);
});

test("parses JSONL while retaining malformed-line diagnostics", () => {
  const parsed = parseJsonl(
    `{"type":"turn.started"}\nnot-json\n{"type":"item.completed","item":{"type":"agent_message","text":"done"}}\n`,
  );

  assert.equal(parsed.events.length, 2);
  assert.equal(parsed.errors.length, 1);
  assert.equal(parsed.finalResponse, "done");
});

// 只断言发现/解析逻辑的行为不变量，不快照 evals/ 目录里现有多少个 case 或 grader——
// 那是内容维护，不是这份代码要保证的事，snapshot 式断言只会让每次加减 case 都要改测试。
const KNOWN_GRADER_TYPES = new Set(["regex", "llm", "tool_used", "tool_order", "file_exists"]);

test("loads every existing case and grader", async () => {
  const evalsDirectory = path.resolve("evals");
  const cases = await discoverCases(evalsDirectory);

  assert.ok(cases.length > 0, "评测套件里应该至少有一个 case");

  const names = cases.map((entry) => entry.name);
  assert.equal(new Set(names).size, names.length, "case 名称不应该重复");

  for (const evalCase of cases) {
    assert.ok(evalCase.graders.length > 0, `${evalCase.name} 应该至少有一个 grader`);
    for (const grader of evalCase.graders) {
      assert.ok(
        KNOWN_GRADER_TYPES.has(grader.type),
        `${evalCase.name}/${grader.name} 的 grader type "${grader.type}" 不是已知类型`,
      );
    }
  }
});

test("indexes all repository skills by frontmatter name", async () => {
  const skills = await findSkills(path.resolve("skills"));

  assert.match(skills.get("tdd"), /skills[\\/]tdd$/);
  assert.match(skills.get("grilling"), /skills[\\/]grilling$/);
});

test("marks skill invocation graders unsupported", async () => {
  const result = await evaluateGrader(
    { type: "tool_used", tool: "Skill" },
    { finalResponse: "", events: [] },
  );

  assert.equal(result.status, "unsupported");
  assert.match(result.reason, /skill invocation/i);
});

test("CLI dry-run reports selected cases without invoking Codex", async () => {
  const expectedCases = await discoverCases(path.resolve("evals"), { tag: "grilling" });
  assert.ok(expectedCases.length > 0, "至少应该有一个带 grilling 标签的 case 用来验证过滤");

  const result = spawnSync(
    process.execPath,
    [path.resolve("scripts/eval/codex.run.mjs"), "--dry-run", "--tag", "grilling"],
    { cwd: path.resolve("."), encoding: "utf8" },
  );

  assert.equal(result.status, 0, result.stderr);
  const output = JSON.parse(result.stdout);
  assert.deepEqual(
    output.cases.map((entry) => entry.name).sort(),
    expectedCases.map((entry) => entry.name).sort(),
  );
  assert.equal(output.summary.cases, expectedCases.length);
  // 这批 case 全部依赖 tool_used: Skill 判定是否触发，目前对 Codex 不可观测。
  const skillGraderCount = expectedCases
    .flatMap((entry) => entry.graders)
    .filter((grader) => grader.type === "tool_used" && grader.tool === "Skill").length;
  assert.equal(output.summary.graders.unsupported, skillGraderCount);
});

test("does not call an all-unsupported run perfect", () => {
  const summary = summarizeGraderResults([{ status: "unsupported" }, { status: "unsupported" }]);

  assert.equal(summary.score, null);
  assert.equal(summary.perfect, false);
});

test("summarizes WITH/WITHOUT scores and their delta", () => {
  const summary = summarizeResults([
    { case: "example", arm: "with", score: 1, perfect: true, durationSeconds: 2.0 },
    { case: "example", arm: "with", score: 0.5, perfect: false, durationSeconds: 4.0 },
    { case: "example", arm: "without", score: 0.25, perfect: false, durationSeconds: 1.0 },
    { case: "example", arm: "without", score: 0.5, perfect: false, durationSeconds: 3.0 },
  ]);

  assert.deepEqual(summary.cases.example, {
    with: { runs: 2, meanScore: 0.75, meanDuration: 3.0, perfectRuns: 1 },
    without: { runs: 2, meanScore: 0.375, meanDuration: 2.0, perfectRuns: 0 },
    delta: 0.375,
    notes: "PASS",
  });
});

test("extractCodexToolCalls converts file_change and command_execution items", () => {
  const events = [
    {
      type: "item.completed",
      item: {
        type: "file_change",
        changes: [{ path: "src/foo.ts", kind: "add" }],
      },
    },
    {
      type: "item.completed",
      item: {
        type: "command_execution",
        command: "npm test",
        exit_code: 0,
      },
    },
  ];

  const tools = extractCodexToolCalls(events);
  assert.equal(tools.length, 2);
  assert.equal(tools[0].name, "file_change");
  assert.equal(tools[1].name, "command_execution");
  assert.equal(tools[1].parameters.command, "npm test");
});

test("formatSummaryTable outputs standard table with delta and metrics for codex", () => {
  const summary = {
    cases: {
      "codex-demo": {
        with: { runs: 1, meanScore: 1.0, meanDuration: 5.2 },
        without: { runs: 1, meanScore: 0.5, meanDuration: 4.0 },
        delta: 0.5,
        notes: "PASS",
      },
    },
  };

  const table = formatSummaryTable(summary);
  assert.ok(table.includes("codex-demo"));
  assert.ok(table.includes("1.00"));
  assert.ok(table.includes("+0.50"));
});

test("generateHtmlReport generates standalone HTML document for codex", () => {
  const data = {
    title: "Codex 插件评测报告",
    summary: {
      cases: {
        "codex-demo": {
          with: { runs: 1, meanScore: 1.0, meanDuration: 5.2 },
          without: { runs: 1, meanScore: 0.5, meanDuration: 4.0 },
          delta: 0.5,
          notes: "PASS",
        },
      },
    },
    runs: [
      {
        case: "codex-demo",
        arm: "with",
        run: 1,
        score: 1.0,
        perfect: true,
        durationSeconds: 5.2,
        prompt: "demo prompt",
        finalResponse: "demo response",
        toolCalls: [{ name: "file_change", duration: 0, parameters: { changes: [] } }],
        graders: [{ name: "check", type: "regex", status: "passed", weight: 1 }],
      },
    ],
    options: {
      model: "gpt-4o-mini",
      threshold: 1.0,
    },
  };

  const html = generateHtmlReport(data);
  assert.ok(html.includes("<!DOCTYPE html>"));
  assert.ok(html.includes("Codex 插件评测报告"));
  assert.ok(html.includes("codex-demo"));
  assert.ok(html.includes("file_change"));
});

test("generateHtmlReport renders unsupported/errored graders as neutral, not a failure", () => {
  const data = {
    summary: {
      cases: {
        "codex-demo": {
          with: { runs: 1, meanScore: 0, meanDuration: 1 },
          delta: null,
          notes: "skill-fired: Codex JSONL does not expose a first-class skill invocation event",
        },
      },
    },
    runs: [
      {
        case: "codex-demo",
        arm: "with",
        run: 1,
        score: 0,
        perfect: false,
        durationSeconds: 1,
        graders: [
          { name: "skill-fired", type: "tool_used", status: "unsupported", reason: "no event" },
        ],
      },
    ],
    options: { threshold: 1.0 },
  };

  const html = generateHtmlReport(data);
  assert.ok(html.includes("chip-neutral"));
  assert.ok(html.includes("⊘ 不支持"));
  assert.ok(!html.includes("✗ 未通过"), "an unsupported grader must not render as a failure chip");
});

test("allows transient error events when the turn ultimately completes", () => {
  const infrastructure = classifyRunInfrastructure(
    { code: 0, timedOut: false },
    {
      errors: [],
      events: [
        { type: "error", message: "Reconnecting" },
        { type: "turn.completed", usage: {} },
      ],
    },
  );

  assert.equal(infrastructure.passed, true);
});

test("fails infrastructure when no turn completes", () => {
  const infrastructure = classifyRunInfrastructure(
    { code: 0, timedOut: false },
    { errors: [], events: [{ type: "turn.started" }] },
  );

  assert.equal(infrastructure.passed, false);
  assert.match(infrastructure.reason, /completion event/i);
});
