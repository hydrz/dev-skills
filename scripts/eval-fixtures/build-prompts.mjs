#!/usr/bin/env node
// 为“按正文执行”的评测生成 prompt.md。
//
// 仅用户触发的 skill 无法在 claude plugin eval 中通过斜杠命令调用，所以这类用例把 skill 正文嵌进 prompt。
// 模板 evals/<case>/prompt.template.md 中的 {{skill:<名称>}} 会被替换成对应 SKILL.md 去掉
// frontmatter 后的正文。修改 skill 正文后运行 `node scripts/eval-fixtures/build-prompts.mjs`，
// `npm test` 会检查生成结果是否最新。

import { readdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");

export function skillBody(name, root = repoRoot) {
  const source = readFileSync(path.join(root, "skills", name, "SKILL.md"), "utf8");
  return source
    .replace(/\r\n/g, "\n")
    .replace(/^---\n[\s\S]*?\n---\n+/, "")
    .trimEnd();
}

export function renderTemplate(template, root = repoRoot) {
  return template
    .replace(/\r\n/g, "\n")
    .replace(/\{\{skill:([\w-]+)\}\}/g, (_, name) => skillBody(name, root));
}

export function buildPrompts(root = repoRoot) {
  const evalsDirectory = path.join(root, "evals");
  const results = [];
  for (const entry of readdirSync(evalsDirectory, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const templatePath = path.join(evalsDirectory, entry.name, "prompt.template.md");
    if (!existsSync(templatePath)) continue;
    const promptPath = path.join(evalsDirectory, entry.name, "prompt.md");
    const expected = renderTemplate(readFileSync(templatePath, "utf8"), root);
    const actual = existsSync(promptPath)
      ? readFileSync(promptPath, "utf8").replace(/\r\n/g, "\n")
      : null;
    results.push({ name: entry.name, promptPath, expected, upToDate: actual === expected });
  }
  return results;
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  for (const result of buildPrompts()) {
    if (!result.upToDate) {
      writeFileSync(result.promptPath, result.expected);
      console.log(`已生成 ${path.relative(repoRoot, result.promptPath)}`);
    }
  }
}
