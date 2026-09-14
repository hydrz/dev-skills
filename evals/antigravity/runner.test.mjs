import assert from "node:assert/strict";
import { mkdtemp, readFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import { buildAgyArgs, initializeAgyWorkspace, parseAgyOutput } from "./lib.mjs";

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
    "--model",
    "gemini-3.8-flash-low",
    "--print-timeout",
    "60s",
  ]);
});

test("buildAgyArgs supports custom model override", () => {
  const args = buildAgyArgs({
    prompt: "Custom model test",
    model: "gemini-3.8-flash-high",
  });

  assert.equal(args[args.indexOf("--model") + 1], "gemini-3.8-flash-high");
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
  const fakeSkillDir = path.join(fakeSkillsDir, "tdd");
  await import("node:fs/promises").then((fs) => fs.mkdir(fakeSkillDir, { recursive: true }));
  await import("node:fs/promises").then((fs) =>
    fs.writeFile(path.join(fakeSkillDir, "SKILL.md"), "# TDD\n", "utf8"),
  );

  const skillsMap = new Map([["tdd", fakeSkillDir]]);
  const evalCase = {
    name: "tdd-test",
    metadata: { tags: ["tdd"] },
  };

  const skillName = await initializeAgyWorkspace(tempDir, evalCase, "with", skillsMap);
  assert.equal(skillName, "tdd");

  const skillsJson = JSON.parse(
    await readFile(path.join(tempDir, ".agents", "skills.json"), "utf8"),
  );
  assert.ok(skillsJson.skills.tdd);
  assert.equal(skillsJson.skills.tdd.name, "tdd");
});
