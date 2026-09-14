#!/usr/bin/env node

import { readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..");

// 收集所有需要检查的 markdown 文件
function collectMarkdownFiles(dir, fileList = []) {
  const entries = readdirSync(dir);
  for (const entry of entries) {
    if (
      entry === "node_modules" ||
      entry === ".git" ||
      entry === "evals" ||
      entry === ".scratch" ||
      entry === ".worktrees" ||
      entry === ".claude" ||
      entry === ".agents"
    ) {
      continue;
    }
    const fullPath = join(dir, entry);
    const stat = statSync(fullPath);
    if (stat.isDirectory()) {
      collectMarkdownFiles(fullPath, fileList);
    } else if (stat.isFile() && entry.endsWith(".md")) {
      fileList.push(fullPath);
    }
  }
  return fileList;
}

const mdFiles = collectMarkdownFiles(repoRoot);
let totalErrors = 0;

for (const filePath of mdFiles) {
  const relPath = relative(repoRoot, filePath).replace(/\\/g, "/");
  const content = readFileSync(filePath, "utf8");
  const lines = content.split("\n");

  let inCodeBlock = false;
  let inFrontmatter = false;
  let frontmatterLines = [];

  for (let i = 0; i < lines.length; i++) {
    const lineNum = i + 1;
    const line = lines[i];
    const trimmed = line.trim();

    // 处理 YAML frontmatter
    if (i === 0 && trimmed === "---") {
      inFrontmatter = true;
      continue;
    }
    if (inFrontmatter) {
      if (trimmed === "---") {
        inFrontmatter = false;
        continue;
      }
      frontmatterLines.push(line);
      continue;
    }

    // 处理代码块 ```
    if (trimmed.startsWith("```")) {
      inCodeBlock = !inCodeBlock;
      continue;
    }
    if (inCodeBlock) {
      continue;
    }

    // 过滤 Markdown 水平分割线与表格行
    if (/^---+$/.test(trimmed) || /^\|?(\s*:?-+:?\s*\|)+\s*$/.test(trimmed)) {
      continue;
    }

    // 去除行内代码 `...` 以避免命令行参数如 `--check` 误报
    const textWithoutInlineCode = line.replace(/`[^`]*`/g, "");

    // 1. 检查全角破折号 “—”
    if (textWithoutInlineCode.includes("—")) {
      console.error(
        `[FAIL] ${relPath}:${lineNum} 存在全角破折号“—”，请根据规则改用逗号、冒号、句号或括号：`,
      );
      console.error(`       ${trimmed}`);
      totalErrors++;
    }

    // 2. 检查普通文本中的独立 “--”
    if (/(^|\s)--(\s|$)/.test(textWithoutInlineCode)) {
      console.error(`[FAIL] ${relPath}:${lineNum} 存在连字符破折号“--”，请根据规则移除：`);
      console.error(`       ${trimmed}`);
      totalErrors++;
    }
  }

  // 3. 如果是 SKILL.md，校验 frontmatter
  if (relPath.startsWith("skills/") && relPath.endsWith("/SKILL.md")) {
    const parts = relPath.split("/");
    const expectedSkillName = parts[2]; // skills/<category>/<name>/SKILL.md

    const fContent = frontmatterLines.join("\n");
    const nameMatch = fContent.match(/^name:\s*([^\s\r\n]+)/m);
    const descMatch = fContent.match(/^description:\s*(.+)/m);

    if (!nameMatch) {
      console.error(`[FAIL] ${relPath} 缺少 frontmatter 'name' 字段。`);
      totalErrors++;
    } else if (nameMatch[1] !== expectedSkillName) {
      console.error(
        `[FAIL] ${relPath} frontmatter 'name' (${nameMatch[1]}) 与目录名 (${expectedSkillName}) 不匹配。`,
      );
      totalErrors++;
    }

    if (!descMatch) {
      console.error(`[FAIL] ${relPath} 缺少 frontmatter 'description' 字段。`);
      totalErrors++;
    }
  }
}

if (totalErrors > 0) {
  console.error(`\n写作规范检查完成，共发现 ${totalErrors} 处违规。请修改后重新检查。`);
  process.exit(1);
} else {
  console.log(`[OK] 所有文档写作规范与 SKILL frontmatter 检查通过 (${mdFiles.length} 个文件)`);
}
