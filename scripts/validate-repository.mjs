#!/usr/bin/env node

import { readdirSync, readFileSync } from "node:fs";
import { dirname, extname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import {
  loadRepositoryMetadata,
  parseSkillMetadata,
  validateMetadataModel,
} from "./repository-metadata.lib.mjs";

const defaultRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const ignoredDirectories = new Set([".git", ".scratch", ".worktrees", "node_modules"]);
const forbiddenNames = new Set([".DS_Store", "Thumbs.db"]);
const textExtensions = new Set([
  ".cjs",
  ".js",
  ".json",
  ".md",
  ".mjs",
  ".py",
  ".sh",
  ".txt",
  ".yaml",
  ".yml",
]);

function walk(root, current = root, result = { files: [], symlinks: [], forbidden: [] }) {
  for (const entry of readdirSync(current, { withFileTypes: true })) {
    const path = join(current, entry.name);
    const relPath = relative(root, path).replace(/\\/g, "/");

    if (entry.isSymbolicLink()) {
      result.symlinks.push(relPath);
      continue;
    }
    if (entry.isDirectory() && ignoredDirectories.has(entry.name)) continue;
    if (forbiddenNames.has(entry.name)) result.forbidden.push(relPath);
    if (entry.isDirectory()) walk(root, path, result);
    else if (entry.isFile()) result.files.push({ path, relPath });
  }
  return result;
}

export function findSecretShapes(text) {
  const patterns = [
    ["private key", /BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY/],
    ["AWS access key", new RegExp("AKIA" + "[0-9A-Z]{16}")],
    ["GitHub token", new RegExp("gh" + "[pousr]_[A-Za-z0-9]{20,}")],
    ["OpenAI key", new RegExp("sk" + "-(?:proj-)?[A-Za-z0-9_-]{20,}")],
    ["Slack token", new RegExp("xox" + "[baprs]-[A-Za-z0-9-]{20,}")],
  ];
  return patterns.filter(([, pattern]) => pattern.test(text)).map(([label]) => label);
}

export function validateSkillText(text, expectedName, relPath = "SKILL.md") {
  const errors = [];
  const { validFrontmatter, name, description, body } = parseSkillMetadata(text);
  if (!validFrontmatter) return [`\`${relPath}\` 缺少完整的 YAML frontmatter`];

  if (!name) errors.push(`\`${relPath}\` 缺少 frontmatter \`name\``);
  else if (name !== expectedName) {
    errors.push(`\`${relPath}\` 的 \`name\`（\`${name}\`）与目录名（\`${expectedName}\`）不一致`);
  }
  if (!description) errors.push(`\`${relPath}\` 缺少单行 \`description\``);
  else if (description.length > 1024)
    errors.push(`\`${relPath}\` 的 \`description\` 超过 1024 个字符`);
  if (!body.trim()) errors.push(`\`${relPath}\` 的正文为空`);
  return errors;
}

export function validateRepository(root = defaultRoot) {
  const errors = [];
  const tree = walk(root);
  for (const path of tree.symlinks) errors.push(`发布内容中不允许符号链接：${path}`);
  for (const path of tree.forbidden) errors.push(`发布内容中包含系统垃圾文件：${path}`);

  const skillFiles = tree.files
    .filter(({ relPath }) => /^skills\/[^/]+\/SKILL\.md$/.test(relPath))
    .sort((a, b) => a.relPath.localeCompare(b.relPath));
  // Codex 的 Agent Plugins 格式只发现 skills/<name>/SKILL.md，更深的 skill 会被静默忽略
  for (const { relPath } of tree.files) {
    if (/^skills\/[^/]+\/.+\/SKILL\.md$/.test(relPath)) {
      errors.push(`${relPath} 嵌套过深；skill 必须直接放在 skills/<name>/ 下`);
    }
  }

  for (const { path, relPath } of skillFiles) {
    const expectedName = relPath.split("/")[1];
    errors.push(...validateSkillText(readFileSync(path, "utf8"), expectedName, relPath));
  }

  for (const { path, relPath } of tree.files) {
    if (!textExtensions.has(extname(path).toLowerCase())) continue;
    const text = readFileSync(path, "utf8");
    for (const label of findSecretShapes(text)) {
      errors.push(`${relPath} 包含疑似 ${label}`);
    }
  }

  try {
    errors.push(...validateMetadataModel(loadRepositoryMetadata(root)));
  } catch (error) {
    errors.push(`仓库元数据无法读取：${error.message}`);
  }
  return errors;
}

const invokedPath = process.argv[1] ? resolve(process.argv[1]) : "";
if (invokedPath === fileURLToPath(import.meta.url)) {
  const errors = validateRepository();
  if (errors.length) {
    for (const error of errors) console.error(`[FAIL] ${error}`);
    console.error(`\n仓库静态校验失败，共 ${errors.length} 项。`);
    process.exit(1);
  }
  console.log("[OK] 仓库结构、skill、插件清单与敏感信息静态校验通过");
}
