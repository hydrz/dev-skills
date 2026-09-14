import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import { run } from "../../skills/implement-spec/review-package.mjs";

function git(cwd, ...args) {
  return execFileSync("git", args, { cwd, encoding: "utf8" }).trim();
}

function commit(cwd, file, content, message) {
  writeFileSync(path.join(cwd, file), content);
  git(cwd, "add", file);
  git(cwd, "commit", "-q", "-m", message);
  return git(cwd, "rev-parse", "HEAD");
}

function makeRepo() {
  const cwd = mkdtempSync(path.join(os.tmpdir(), "review-package-"));
  git(cwd, "init", "-q", "-b", "main");
  git(cwd, "config", "user.email", "test@example.com");
  git(cwd, "config", "user.name", "test");
  git(cwd, "config", "commit.gpgsign", "false");
  const base = commit(cwd, "order.js", "export const total = 0;\n", "init");
  return { cwd, base };
}

test("packages every commit of a multi-commit range, not only the last", () => {
  const { cwd, base } = makeRepo();
  commit(cwd, "order.js", "export const total = 1;\n", "task: first step");
  commit(cwd, "refund.js", "export const refund = true;\n", "task: second step");

  const result = run([base, "HEAD", ".reviews"], { cwd });
  assert.equal(result.code, 0, result.output);
  assert.match(result.output, /2 个提交/);

  const text = readFileSync(result.file, "utf8");
  assert.match(text, /task: first step/);
  assert.match(text, /task: second step/);
  assert.match(text, /order\.js\s+\| 2/);
  assert.match(text, /\+export const total = 1;/);
  assert.match(text, /\+export const refund = true;/);
  assert.equal(
    path.basename(result.file),
    `review-${base.slice(0, 7)}..${git(cwd, "rev-parse", "--short=7", "HEAD")}.diff`,
  );
});

test("rejects a BASE that is not an ancestor of HEAD", () => {
  const { cwd, base } = makeRepo();
  git(cwd, "switch", "-q", "-c", "other");
  const other = commit(cwd, "other.js", "x\n", "unrelated");
  git(cwd, "switch", "-q", "main");
  const head = commit(cwd, "order.js", "export const total = 2;\n", "task");

  const result = run([other, head, ".reviews"], { cwd });
  assert.equal(result.code, 2);
  assert.match(result.output, /不是 HEAD .* 的祖先/);
  assert.equal(run([base, head, ".reviews"], { cwd }).code, 0);
});

test("rejects empty ranges, unknown revisions and wrong argument counts", () => {
  const { cwd, base } = makeRepo();
  assert.match(run([base, base, ".reviews"], { cwd }).output, /没有提交/);
  assert.match(run(["no-such-rev", "HEAD", ".reviews"], { cwd }).output, /BASE 不是有效的提交/);
  assert.equal(run([base, "HEAD"], { cwd }).code, 2);
});
