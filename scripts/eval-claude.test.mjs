import assert from "node:assert/strict";
import test from "node:test";

import { buildEvalArgs, quoteForCmd } from "./eval-claude.mjs";

test("passes filters through and appends defaults", () => {
  assert.deepEqual(buildEvalArgs(["--case", "tdd-*"]), [
    "--case",
    "tdd-*",
    "--model",
    "haiku",
    "--judge-model",
    "haiku",
    "--allow-tools",
    "Write",
    "Edit",
  ]);
});

test("expands --quick and keeps user overrides", () => {
  assert.deepEqual(
    buildEvalArgs([
      "--quick",
      "--model",
      "sonnet",
      "--judge-model=sonnet",
      "--allow-tools",
      "Write",
    ]),
    [
      "--model",
      "sonnet",
      "--judge-model=sonnet",
      "--allow-tools",
      "Write",
      "--runs",
      "1",
      "--ablation",
      "none",
      "--no-publish",
    ],
  );
});

test("accepts variadic option values", () => {
  const args = buildEvalArgs(["--tag", "tdd", "trigger", "--allow-tools", "Write", "Edit"]);
  assert.deepEqual(args.slice(0, 6), ["--tag", "tdd", "trigger", "--allow-tools", "Write", "Edit"]);
});

test("rejects a bare case name, as left behind when PowerShell drops --", () => {
  assert.throws(
    () => buildEvalArgs(["codebase-design-selective-ddd"]),
    /'--' --case codebase-design-selective-ddd/,
  );
});

test("rejects a positional argument after a boolean flag", () => {
  assert.throws(() => buildEvalArgs(["--quick", "tdd-new-function"]), /无法识别的参数/);
  assert.throws(() => buildEvalArgs(["--no-publish", "tdd-new-function"]), /无法识别的参数/);
});

test("quotes only arguments that cmd.exe would split or interpret", () => {
  assert.equal(quoteForCmd("tdd-*"), "tdd-*");
  assert.equal(quoteForCmd("Tool(pattern:*)"), '"Tool(pattern:*)"');
  assert.equal(quoteForCmd("a b"), '"a b"');
});
