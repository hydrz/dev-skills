import assert from "node:assert/strict";
import { existsSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import {
  buildCommand,
  readListFile,
  run,
} from "../../skills/diagnosing-bugs/scripts/find-polluter.mjs";

// 假的测试运行器：在同一进程中按顺序导入每个测试文件，任一文件抛错时以退出码 1 结束。
const RUNNER = `
import { pathToFileURL } from "node:url";
import path from "node:path";
try {
  for (const file of process.argv.slice(2)) await import(pathToFileURL(path.resolve(file)).href);
} catch {
  process.exit(1);
}
`;

function makeProject(files) {
  const cwd = mkdtempSync(path.join(os.tmpdir(), "find-polluter-"));
  writeFileSync(path.join(cwd, "runner.mjs"), RUNNER);
  for (const [name, body] of Object.entries(files)) writeFileSync(path.join(cwd, name), body);
  return { cwd, cmd: "node runner.mjs {files}" };
}

const clean = (n) =>
  Object.fromEntries(Array.from({ length: n }, (_, i) => [`t${i}.test.mjs`, "export {};\n"]));
const names = (n) => Array.from({ length: n }, (_, i) => `t${i}.test.mjs`);

test("creates mode reports the first test that leaves the path behind", () => {
  const { cwd, cmd } = makeProject({
    ...clean(5),
    "t3.test.mjs": 'import { mkdirSync } from "node:fs"; mkdirSync(".git", { recursive: true });\n',
  });
  const result = run(["--cmd", cmd, "--creates", ".git", ...names(5)], { cwd });
  assert.equal(result.code, 0, result.output);
  assert.equal(result.polluter, "t3.test.mjs");
});

test("creates mode refuses a path that already exists and reports when nothing creates it", () => {
  const { cwd, cmd } = makeProject(clean(3));
  assert.equal(run(["--cmd", cmd, "--creates", "out.txt", ...names(3)], { cwd }).code, 1);
  writeFileSync(path.join(cwd, "out.txt"), "");
  assert.equal(run(["--cmd", cmd, "--creates", "out.txt", ...names(3)], { cwd }).code, 2);
  rmSync(path.join(cwd, "out.txt"));
});

for (const index of [0, 5, 6]) {
  test(`victim mode bisects to the polluter at position ${index} of 7`, () => {
    const { cwd, cmd } = makeProject({
      ...clean(7),
      [`t${index}.test.mjs`]: "globalThis.polluted = true;\n",
      "victim.test.mjs": 'if (globalThis.polluted) throw new Error("polluted");\n',
    });
    const result = run(["--cmd", cmd, "--victim", "victim.test.mjs", ...names(7)], { cwd });
    assert.equal(result.code, 0, result.output);
    assert.equal(result.polluter, `t${index}.test.mjs`);
  });
}

test("victim mode reads candidates from --list and skips the victim itself", () => {
  const { cwd, cmd } = makeProject({
    ...clean(4),
    "t2.test.mjs": "globalThis.polluted = true;\n",
    "victim.test.mjs": 'if (globalThis.polluted) throw new Error("polluted");\n',
  });
  writeFileSync(path.join(cwd, "list.txt"), [...names(4), "victim.test.mjs", ""].join("\r\n"));
  const result = run(["--cmd", cmd, "--victim", "victim.test.mjs", "--list", "list.txt"], { cwd });
  assert.equal(result.polluter, "t2.test.mjs");
});

test("reads list files written as UTF-16 by Windows PowerShell or with a UTF-8 BOM", () => {
  const { cwd } = makeProject({});
  const utf16 = path.join(cwd, "utf16.txt");
  writeFileSync(
    utf16,
    Buffer.concat([
      Buffer.from([0xff, 0xfe]),
      Buffer.from("a.test.ts\r\nb.test.ts\r\n", "utf16le"),
    ]),
  );
  assert.deepEqual(readListFile(utf16).split(/\r?\n/).filter(Boolean), ["a.test.ts", "b.test.ts"]);

  const bom = path.join(cwd, "bom.txt");
  writeFileSync(bom, "﻿a.test.ts\n");
  assert.equal(readListFile(bom), "a.test.ts\n");
});

test("victim mode stops when the premise does not hold", () => {
  const alone = makeProject({ ...clean(2), "victim.test.mjs": 'throw new Error("always");\n' });
  assert.match(
    run(["--cmd", alone.cmd, "--victim", "victim.test.mjs", ...names(2)], { cwd: alone.cwd })
      .output,
    /单独运行就失败/,
  );

  const passing = makeProject({ ...clean(2), "victim.test.mjs": "export {};\n" });
  assert.match(
    run(["--cmd", passing.cmd, "--victim", "victim.test.mjs", ...names(2)], { cwd: passing.cwd })
      .output,
    /无法复现/,
  );
});

test("victim mode reports the remaining suspects when two tests pollute together", () => {
  const { cwd, cmd } = makeProject({
    ...clean(4),
    "t0.test.mjs": "globalThis.a = true;\n",
    "t2.test.mjs": "globalThis.b = true;\n",
    "victim.test.mjs": 'if (globalThis.a && globalThis.b) throw new Error("polluted");\n',
  });
  const result = run(["--cmd", cmd, "--victim", "victim.test.mjs", ...names(4)], { cwd });
  assert.equal(result.code, 1);
  assert.deepEqual(result.suspects, names(4));
});

test("builds commands with placeholder substitution, appending and quoting", () => {
  assert.equal(
    buildCommand("npx vitest run {files}", ["a.test.ts", "b c.test.ts"]),
    'npx vitest run a.test.ts "b c.test.ts"',
  );
  assert.equal(
    buildCommand("pytest -p no:randomly", ["tests/test_a.py"]),
    "pytest -p no:randomly tests/test_a.py",
  );
});

test("rejects missing command, both modes at once and no candidates", () => {
  assert.equal(run(["--creates", "x", "a.test.mjs"]).code, 2);
  assert.equal(run(["--cmd", "node", "--creates", "x", "--victim", "v", "a"]).code, 2);
  assert.equal(run(["--cmd", "node", "--creates", "x"]).code, 2);
  assert.equal(run(["--cmd", "node", "--bogus"]).code, 2);
  assert.equal(existsSync("x"), false);
});
