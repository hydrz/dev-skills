import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtemp, mkdir, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import {
  buildCodexArgs,
  classifyRunInfrastructure,
  discoverCases,
  evaluateGrader,
  evaluateRegexGrader,
  evaluateToolOrderGrader,
  findSkills,
  parseJsonl,
  parseMarkdownWithFrontmatter,
  summarizeGraderResults,
  summarizeResults,
} from "./lib.mjs";

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

  assert.deepEqual(cases.map((entry) => entry.name), ["case-one"]);
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
  const parsed = parseJsonl(`{"type":"turn.started"}\nnot-json\n{"type":"item.completed","item":{"type":"agent_message","text":"done"}}\n`);

  assert.equal(parsed.events.length, 2);
  assert.equal(parsed.errors.length, 1);
  assert.equal(parsed.finalResponse, "done");
});

test("loads every existing case and grader", async () => {
  const evalsDirectory = path.resolve("evals");
  const cases = await discoverCases(evalsDirectory);

  assert.equal(cases.length, 10);
  assert.equal(cases.flatMap((entry) => entry.graders).length, 23);
  assert.deepEqual(
    Object.fromEntries(
      Object.entries(
        cases
          .flatMap((entry) => entry.graders)
          .reduce((counts, grader) => {
            counts[grader.type] = (counts[grader.type] ?? 0) + 1;
            return counts;
          }, {}),
      ).sort(),
    ),
    { llm: 5, regex: 7, tool_order: 1, tool_used: 10 },
  );
});

test("indexes all repository skills by frontmatter name", async () => {
  const skills = await findSkills(path.resolve("skills"));

  assert.equal(skills.size, 29);
  assert.match(skills.get("tdd"), /skills[\\/]engineering[\\/]tdd$/);
  assert.match(skills.get("grilling"), /skills[\\/]productivity[\\/]grilling$/);
});

test("marks skill invocation graders unsupported", async () => {
  const result = await evaluateGrader(
    { type: "tool_used", tool: "Skill" },
    { finalResponse: "", events: [] },
  );

  assert.equal(result.status, "unsupported");
  assert.match(result.reason, /skill invocation/i);
});

test("CLI dry-run reports selected cases without invoking Codex", () => {
  const result = spawnSync(
    process.execPath,
    [path.resolve("evals/codex/run.mjs"), "--dry-run", "--case", "tdd-*"],
    { cwd: path.resolve("."), encoding: "utf8" },
  );

  assert.equal(result.status, 0, result.stderr);
  const output = JSON.parse(result.stdout);
  assert.deepEqual(output.cases.map((entry) => entry.name), [
    "tdd-concept-question",
    "tdd-new-function",
  ]);
  assert.equal(output.summary.cases, 2);
  assert.equal(output.summary.graders.unsupported, 2);
});

test("does not call an all-unsupported run perfect", () => {
  const summary = summarizeGraderResults([
    { status: "unsupported" },
    { status: "unsupported" },
  ]);

  assert.equal(summary.score, null);
  assert.equal(summary.perfect, false);
});

test("summarizes WITH/WITHOUT scores and their delta", () => {
  const summary = summarizeResults([
    { case: "example", arm: "with", score: 1, perfect: true },
    { case: "example", arm: "with", score: 0.5, perfect: false },
    { case: "example", arm: "without", score: 0.25, perfect: false },
    { case: "example", arm: "without", score: 0.5, perfect: false },
  ]);

  assert.deepEqual(summary.cases.example, {
    with: { runs: 2, meanScore: 0.75, perfectRuns: 1 },
    without: { runs: 2, meanScore: 0.375, perfectRuns: 0 },
    delta: 0.375,
  });
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
