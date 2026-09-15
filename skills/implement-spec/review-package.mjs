#!/usr/bin/env node
// 生成评审材料：提交列表、stat 摘要和带 10 行上下文的完整 diff，写入一个文件。只依赖 Node.js 标准库。
//
// 用法：
//   node review-package.mjs <BASE> <HEAD> <输出目录>
//
// BASE 用派发实现者之前记下的提交，不用 HEAD~1：多提交的任务会只剩最后一个提交。
// 成功时输出文件路径并以退出码 0 结束；参数或提交范围有误时以退出码 2 结束。

import { closeSync, mkdirSync, openSync, statSync, writeSync } from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { pathToFileURL } from "node:url";

const USAGE = "用法：node review-package.mjs <BASE> <HEAD> <输出目录>";

function git(args, cwd) {
  const result = spawnSync("git", args, { cwd, encoding: "utf8" });
  if (result.error) throw result.error;
  return { ok: result.status === 0, stdout: result.stdout.trim(), stderr: result.stderr.trim() };
}

function resolveCommit(rev, cwd) {
  const result = git(["rev-parse", "--verify", "--quiet", `${rev}^{commit}`], cwd);
  return result.ok ? result.stdout : null;
}

export function run(argv, { cwd = process.cwd() } = {}) {
  if (argv.length !== 3) return { code: 2, output: USAGE };
  const [baseRev, headRev, outDir] = argv;

  const base = resolveCommit(baseRev, cwd);
  if (!base) return { code: 2, output: `BASE 不是有效的提交：${baseRev}` };
  const head = resolveCommit(headRev, cwd);
  if (!head) return { code: 2, output: `HEAD 不是有效的提交：${headRev}` };

  if (!git(["merge-base", "--is-ancestor", base, head], cwd).ok) {
    return {
      code: 2,
      output: `BASE ${baseRev} 不是 HEAD ${headRev} 的祖先，diff 会混入无关改动。检查记下的 BASE 是否属于这个分支。`,
    };
  }
  const commits = Number(git(["rev-list", "--count", `${base}..${head}`], cwd).stdout);
  if (commits === 0) {
    return {
      code: 2,
      output: `${baseRev}..${headRev} 范围内没有提交，检查 BASE 和 HEAD 是否写反或相同。`,
    };
  }

  const short = (sha) => sha.slice(0, 7);
  const dir = path.resolve(cwd, outDir);
  mkdirSync(dir, { recursive: true });
  const file = path.join(dir, `review-${short(base)}..${short(head)}.diff`);

  const range = `${base}..${head}`;
  const sections = [
    ["提交", ["log", "--oneline", "--no-decorate", range]],
    ["改动文件", ["diff", "--stat", range]],
    ["diff", ["diff", "--no-color", "--no-ext-diff", "-U10", range]],
  ];

  const fd = openSync(file, "w");
  try {
    writeSync(fd, `# 评审材料：${short(base)}..${short(head)}\n`);
    for (const [title, args] of sections) {
      writeSync(fd, `\n## ${title}\n\n`);
      // diff 直接写入文件，不经过内存缓冲，大 diff 也不会超出上限
      const result = spawnSync("git", ["-c", "core.quotepath=false", ...args], {
        cwd,
        stdio: ["ignore", fd, "pipe"],
      });
      if (result.error) throw result.error;
      if (result.status !== 0) {
        return { code: 2, output: `git ${args[0]} 失败：${result.stderr.toString().trim()}` };
      }
    }
  } finally {
    closeSync(fd);
  }

  return {
    code: 0,
    output: `已写入 ${file}：${commits} 个提交，${statSync(file).size} 字节`,
    file,
  };
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  const result = run(process.argv.slice(2));
  console.log(result.output);
  process.exitCode = result.code;
}
