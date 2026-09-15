import assert from "node:assert/strict";
import { mkdtemp, readFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import { buildAgyArgs, initializeAgyWorkspace, parseAgyOutput, sandboxFor } from "./lib.mjs";

test("buildAgyArgs constructs default flags with cheapest flash model", () => {
  const args = buildAgyArgs({
    prompt: "Hello Antigravity",
    timeoutMs: 60000,
  });

  assert.deepEqual(args, [
    "--print",
    "Hello Antigravity",
    "--output-format",
    "json",
    "--dangerously-skip-permissions",
    "--sandbox",
    "--model",
    "gemini-3.8-flash-low",
    "--print-timeout",
    "60s",
  ]);
});

test("buildAgyArgs uses a readonly sandbox without skipping permissions", () => {
  // --sandbox 在真实 agy CLI 上是不取值的布尔开关（用探针 case 验证过），
  // 只读模式只加 --sandbox，不加 --dangerously-skip-permissions。
  const args = buildAgyArgs({
    prompt: "Read-only test",
    sandbox: "readonly",
  });

  assert.ok(!args.includes("--dangerously-skip-permissions"));
  assert.ok(args.includes("--sandbox"));
});

test("buildAgyArgs supports custom model override", () => {
  const args = buildAgyArgs({
    prompt: "Custom model test",
    model: "gemini-3.8-flash-high",
  });

  assert.equal(args[args.indexOf("--model") + 1], "gemini-3.8-flash-high");
});

test("buildAgyArgs supports workspace flag", () => {
  const args = buildAgyArgs({
    workspace: "/path/to/workspace",
    prompt: "Workspace test",
  });

  assert.equal(args[0], "--add-dir");
  assert.equal(args[1], "/path/to/workspace");
});

test("sandboxFor picks workspace-write only when the case needs Write or Edit", () => {
  assert.equal(sandboxFor({ metadata: { allowed_tools: ["Read", "Skill"] } }), "readonly");
  assert.equal(sandboxFor({ metadata: { allowed_tools: ["Write"] } }), "workspace-write");
  assert.equal(sandboxFor({ metadata: { allowed_tools: ["Edit", "Read"] } }), "workspace-write");
  assert.equal(sandboxFor({ metadata: {} }), "readonly");
});

test("parseAgyOutput parses valid JSON output from agy --print", () => {
  const sampleJson = JSON.stringify({
    conversation_id: "test-conv-123",
    status: "SUCCESS",
    response: "This is the answer\n",
    duration_seconds: 2.5,
    num_turns: 1,
    usage: {
      input_tokens: 100,
      output_tokens: 20,
      total_tokens: 120,
    },
  });

  const parsed = parseAgyOutput(sampleJson);
  assert.equal(parsed.status, "SUCCESS");
  assert.equal(parsed.finalResponse, "This is the answer\n");
  assert.equal(parsed.duration, 2.5);
  assert.equal(parsed.conversationId, "test-conv-123");
  assert.equal(parsed.usage?.total_tokens, 120);
});

test("parseAgyOutput handles malformed non-JSON output gracefully", () => {
  const raw = "Fatal error: connection failed";
  const parsed = parseAgyOutput(raw);

  assert.equal(parsed.status, "ERROR");
  assert.equal(parsed.finalResponse, raw);
  assert.ok(parsed.error.includes("Failed to parse"));
});

test("initializeAgyWorkspace sets up .agents/skills.json for with arm", async () => {
  const tempDir = await mkdtemp(path.join(os.tmpdir(), "agy-test-workspace-"));
  const fakeSkillsDir = await mkdtemp(path.join(os.tmpdir(), "agy-fake-skills-"));
  const fakeCaseDir = await mkdtemp(path.join(os.tmpdir(), "agy-fake-case-"));
  const fakeSkillDir = path.join(fakeSkillsDir, "tdd");
  const helperSkillDir = path.join(fakeSkillsDir, "writing-for-agents");
  await import("node:fs/promises").then((fs) => fs.mkdir(fakeSkillDir, { recursive: true }));
  await import("node:fs/promises").then((fs) => fs.mkdir(helperSkillDir, { recursive: true }));
  await import("node:fs/promises").then((fs) =>
    fs.writeFile(path.join(fakeSkillDir, "SKILL.md"), "# TDD\n", "utf8"),
  );
  await import("node:fs/promises").then((fs) =>
    fs.writeFile(path.join(helperSkillDir, "SKILL.md"), "# Writing\n", "utf8"),
  );
  await import("node:fs/promises").then((fs) =>
    fs.mkdir(path.join(fakeCaseDir, "fixture"), { recursive: true }),
  );
  await import("node:fs/promises").then((fs) =>
    fs.writeFile(path.join(fakeCaseDir, "fixture", "input.txt"), "fixture\n", "utf8"),
  );

  const skillsMap = new Map([
    ["tdd", fakeSkillDir],
    ["writing-for-agents", helperSkillDir],
  ]);
  const evalCase = {
    name: "tdd-test",
    directory: fakeCaseDir,
    metadata: {
      tags: ["tdd"],
      required_skills: ["writing-for-agents", "tdd"],
    },
  };

  const skillName = await initializeAgyWorkspace(tempDir, evalCase, "with", skillsMap);
  assert.equal(skillName, "tdd");
  assert.equal(await readFile(path.join(tempDir, "input.txt"), "utf8"), "fixture\n");

  const skillsJson = JSON.parse(
    await readFile(path.join(tempDir, ".agents", "skills.json"), "utf8"),
  );
  assert.ok(skillsJson.skills.tdd);
  assert.equal(skillsJson.skills.tdd.name, "tdd");
  assert.equal(skillsJson.skills["writing-for-agents"].name, "writing-for-agents");
  assert.match(
    await readFile(path.join(tempDir, ".agents", "skills", "tdd", "SKILL.md"), "utf8"),
    /TDD/,
  );
  assert.match(
    await readFile(
      path.join(tempDir, ".agents", "skills", "writing-for-agents", "SKILL.md"),
      "utf8",
    ),
    /Writing/,
  );
});

test("parseAgyStreamEvents extracts tool calls, text deltas and final result", async () => {
  const { parseAgyStreamEvents } = await import("./lib.mjs");
  const ndjson = [
    JSON.stringify({ event: "init", conversation_id: "conv-1" }),
    JSON.stringify({
      event: "step_update",
      step_update: {
        step_index: 1,
        state: "DONE",
        step_type: "tool",
        tool_name: "view_file",
        tool_info: { parameters: { AbsolutePath: "/path/to/.agents/skills/grilling/SKILL.md" } },
      },
    }),
    JSON.stringify({
      event: "step_update",
      step_update: {
        step_index: 2,
        state: "DONE",
        step_type: "agent_response",
        text_delta: "Hello ",
      },
    }),
    JSON.stringify({
      event: "result",
      result: {
        conversation_id: "conv-1",
        status: "SUCCESS",
        response: "Hello world",
        duration_seconds: 4.2,
        usage: { total_tokens: 1500 },
      },
    }),
  ].join("\n");

  const parsed = parseAgyStreamEvents(ndjson);
  assert.equal(parsed.status, "SUCCESS");
  assert.equal(parsed.finalResponse, "Hello world");
  assert.equal(parsed.duration, 4.2);
  assert.equal(parsed.toolCalls.length, 1);
  assert.equal(parsed.toolCalls[0].name, "view_file");
});

test("evaluateAgyToolUsedGrader handles Skill invocation via view_file", async () => {
  const { evaluateAgyToolUsedGrader } = await import("./lib.mjs");
  const grader = {
    name: "skill-fired",
    type: "tool_used",
    tool: "Skill",
    input_match: '"skill"\\s*:\\s*"(?:[\\w-]+:)?grilling"',
  };

  const runWithSkill = {
    toolCalls: [
      {
        name: "view_file",
        parameters: { AbsolutePath: "C:\\workspace\\.agents\\skills\\grilling\\SKILL.md" },
      },
    ],
  };
  const res1 = evaluateAgyToolUsedGrader(grader, runWithSkill);
  assert.equal(res1.status, "passed");

  const runWithoutSkill = {
    toolCalls: [
      {
        name: "view_file",
        parameters: { AbsolutePath: "C:\\workspace\\README.md" },
      },
    ],
  };
  const res2 = evaluateAgyToolUsedGrader(grader, runWithoutSkill);
  assert.equal(res2.status, "failed");
});

test("evaluateAgyToolUsedGrader handles negative assertion min: 0 max: 0", async () => {
  const { evaluateAgyToolUsedGrader } = await import("./lib.mjs");
  const grader = {
    name: "no-grilling-skill",
    type: "tool_used",
    tool: "Skill",
    input_match: '"skill"\\s*:\\s*"(?:[\\w-]+:)?grilling"',
    min: 0,
    max: 0,
  };

  const runWithoutSkill = {
    toolCalls: [
      {
        name: "view_file",
        parameters: { AbsolutePath: "C:\\workspace\\src\\index.ts" },
      },
    ],
  };
  const res = evaluateAgyToolUsedGrader(grader, runWithoutSkill);
  assert.equal(res.status, "passed");
});

test("summarizeGraderResults marks indicators as scored false in two-arm mode", async () => {
  const { isGraderIndicator, summarizeGraderResults } = await import("./lib.mjs");
  const skillGrader = {
    name: "skill-fired",
    type: "tool_used",
    tool: "Skill",
    status: "passed",
  };
  const regexGrader = {
    name: "pattern-check",
    type: "regex",
    status: "passed",
  };

  assert.equal(isGraderIndicator(skillGrader, false), false);
  assert.equal(isGraderIndicator(skillGrader, true), true);
  assert.equal(isGraderIndicator(regexGrader, true), false);

  const graders = [
    { ...skillGrader, scored: false },
    { ...regexGrader, scored: true },
  ];
  const summary = summarizeGraderResults(graders, true);
  assert.equal(summary.score, 1);
  assert.equal(summary.perfect, true);
});

test("formatSummaryTable outputs standard table with delta and metrics", async () => {
  const { formatSummaryTable } = await import("./lib.mjs");
  const summary = {
    cases: {
      "demo-case": {
        with: { runs: 1, meanScore: 1.0, meanDuration: 10.5 },
        without: { runs: 1, meanScore: 0.2, meanDuration: 8.0 },
        delta: 0.8,
        notes: "PASS",
      },
    },
  };

  const output = formatSummaryTable(summary);
  assert.ok(output.includes("demo-case"));
  assert.ok(output.includes("+0.80"));
  assert.ok(output.includes("1.00"));
});

test("generateHtmlReport generates standalone HTML document with KPI and cases", async () => {
  const { generateHtmlReport } = await import("./lib.mjs");
  const data = {
    timestamp: "2026-09-14T07:20:00.000Z",
    summary: {
      cases: {
        "html-case": {
          with: { runs: 1, meanScore: 1.0, meanDuration: 12.0 },
          without: { runs: 1, meanScore: 0.0, meanDuration: 10.0 },
          delta: 1.0,
          notes: "PASS",
        },
      },
    },
    runs: [
      {
        case: "html-case",
        arm: "with",
        run: 1,
        score: 1.0,
        perfect: true,
        durationSeconds: 12.0,
        usage: { total_tokens: 2500 },
        prompt: "Write a commit",
        finalResponse: "Commit message written",
        toolCalls: [{ name: "view_file", parameters: { path: "foo.ts" }, duration: 0.1 }],
        graders: [
          { name: "check-output", type: "regex", status: "passed", weight: 1, reason: "OK" },
        ],
      },
    ],
    options: {
      model: "gemini-3.8-flash-low",
      threshold: 1.0,
    },
  };

  const html = generateHtmlReport(data);
  assert.ok(html.includes("<!DOCTYPE html>"));
  assert.ok(html.includes("html-case"));
  assert.ok(html.includes("Antigravity 插件评测报告"));
  assert.ok(html.includes("view_file"));
  assert.ok(html.includes("Commit message written"));
});
