import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import { quoteForCmd, spawnTarget } from "../spawn.lib.mjs";

test("leaves plain arguments unquoted", () => {
  assert.equal(quoteForCmd("tdd-*"), "tdd-*");
  assert.equal(quoteForCmd("--case"), "--case");
});

test("quotes spaces, quotes and cmd metacharacters", () => {
  assert.equal(quoteForCmd("a b"), '"a b"');
  assert.equal(quoteForCmd("Tool(pattern:*)"), '"Tool(pattern:*)"');
  assert.equal(quoteForCmd('model_reasoning_effort="high"'), '"model_reasoning_effort=\\"high\\""');
  assert.equal(quoteForCmd("C:\\dir with space\\"), '"C:\\dir with space\\\\"');
  assert.equal(quoteForCmd(""), '""');
});

test("spawnTarget builds a command line only when a shell is used", () => {
  assert.deepEqual(spawnTarget("codex", ["a b"], false), { command: "codex", args: ["a b"] });
  assert.deepEqual(spawnTarget("codex", ["exec", "a b"], true), {
    command: 'codex exec "a b"',
    args: [],
  });
});

test(
  "round-trips arguments through a .cmd shim",
  { skip: process.platform !== "win32" && "only relevant on Windows" },
  async () => {
    const directory = await mkdtemp(path.join(os.tmpdir(), "spawn lib "));
    try {
      const shim = path.join(directory, "echo-args.cmd");
      await writeFile(
        shim,
        `@"${process.execPath}" -e "console.log(JSON.stringify(process.argv.slice(1)))" -- %*\r\n`,
      );
      const args = [
        "--cd",
        "C:\\Users\\some user\\Temp\\eval case",
        "--config",
        'model_reasoning_effort="high"',
        "Tool(pattern:*)",
        "tdd-*",
        "-",
      ];
      const target = spawnTarget(shim, args, true);
      const result = spawnSync(target.command, target.args, { shell: true, encoding: "utf8" });
      assert.equal(result.status, 0, result.stderr);
      assert.deepEqual(JSON.parse(result.stdout), args);
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  },
);
