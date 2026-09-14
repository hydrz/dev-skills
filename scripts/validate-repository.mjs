#!/usr/bin/env node

import { readdirSync, readFileSync } from "node:fs";
import { dirname, extname, isAbsolute, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

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

function loadJson(path, errors, label) {
  try {
    return JSON.parse(readFileSync(path, "utf8"));
  } catch (error) {
    errors.push(`${label} 无法读取：${error.message}`);
    return null;
  }
}

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
  const match = text.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/);
  if (!match) return [`${relPath} 缺少完整的 YAML frontmatter`];

  const [, frontmatter, body] = match;
  const name = frontmatter.match(/^name:\s*["']?([^\s"']+)["']?\s*$/m)?.[1];
  const description = frontmatter
    .match(/^description:\s*(.+)$/m)?.[1]
    ?.trim()
    .replace(/^(["'])(.*)\1$/, "$2");

  if (!name) errors.push(`${relPath} 缺少 frontmatter name`);
  else if (name !== expectedName) {
    errors.push(`${relPath} 的 name (${name}) 与目录名 (${expectedName}) 不一致`);
  }
  if (!description) errors.push(`${relPath} 缺少单行 description`);
  else if (description.length > 1024) errors.push(`${relPath} 的 description 超过 1024 个字符`);
  if (!body.trim()) errors.push(`${relPath} 的正文为空`);
  return errors;
}

function validateManifestIdentity(root, discoveredSkillPaths, errors) {
  const packageJson = loadJson(join(root, "package.json"), errors, "package.json");
  const rootPlugin = loadJson(join(root, "plugin.json"), errors, "plugin.json");
  const codexPlugin = loadJson(
    join(root, ".codex-plugin", "plugin.json"),
    errors,
    ".codex-plugin/plugin.json",
  );
  const claudePlugin = loadJson(
    join(root, ".claude-plugin", "plugin.json"),
    errors,
    ".claude-plugin/plugin.json",
  );
  if (!packageJson || !rootPlugin || !codexPlugin || !claudePlugin) return;

  for (const [label, manifest] of [
    ["plugin.json", rootPlugin],
    [".codex-plugin/plugin.json", codexPlugin],
    [".claude-plugin/plugin.json", claudePlugin],
  ]) {
    if (manifest.name !== packageJson.name) {
      errors.push(`${label} 的 name 与 package.json 不一致`);
    }
    if (manifest.version !== packageJson.version) {
      errors.push(`${label} 的 version 与 package.json 不一致`);
    }
  }

  const rootInterface = rootPlugin.extensions?.["com.openai"]?.interface;
  for (const [label, value] of [
    ["plugin.json extensions.com.openai.interface", rootInterface],
    [".codex-plugin/plugin.json interface", codexPlugin.interface],
  ]) {
    if (!value?.displayName || !value?.shortDescription || !value?.longDescription) {
      errors.push(`${label} 缺少 displayName、shortDescription 或 longDescription`);
    }
  }

  if (typeof codexPlugin.skills !== "string") {
    errors.push(".codex-plugin/plugin.json 的 skills 必须是字符串路径");
  } else {
    const skillsPath = isAbsolute(codexPlugin.skills)
      ? codexPlugin.skills
      : resolve(root, codexPlugin.skills);
    if (skillsPath !== resolve(root, "skills")) {
      errors.push(".codex-plugin/plugin.json 的 skills 必须指向仓库 skills 目录");
    }
  }

  const actualClaudeSkills = Array.isArray(claudePlugin.skills) ? claudePlugin.skills : [];
  const actualSkillSet = new Set(actualClaudeSkills);
  if (
    actualSkillSet.size !== discoveredSkillPaths.length ||
    discoveredSkillPaths.some((path) => !actualSkillSet.has(path))
  ) {
    errors.push(".claude-plugin/plugin.json 的 skills 清单未与实际目录同步；运行 npm run sync");
  }

  const agentsIndex = loadJson(join(root, ".agents", "skills.json"), errors, ".agents/skills.json");
  for (const entry of agentsIndex?.entries ?? []) {
    if (typeof entry.path !== "string" || !entry.path.startsWith("skills/")) {
      errors.push(".agents/skills.json 包含无效的 skill 根路径");
      continue;
    }
    const resolvedEntry = resolve(root, entry.path);
    if (!discoveredSkillPaths.some((path) => resolve(root, path).startsWith(resolvedEntry))) {
      errors.push(`.agents/skills.json 的路径没有包含任何 skill：${entry.path}`);
    }
  }
}

export function validateRepository(root = defaultRoot) {
  const errors = [];
  const tree = walk(root);
  for (const path of tree.symlinks) errors.push(`发布内容中不允许符号链接：${path}`);
  for (const path of tree.forbidden) errors.push(`发布内容中包含系统垃圾文件：${path}`);

  const skillFiles = tree.files
    .filter(({ relPath }) => /^skills\/[^/]+\/[^/]+\/SKILL\.md$/.test(relPath))
    .sort((a, b) => a.relPath.localeCompare(b.relPath));
  const skillPaths = skillFiles.map(({ relPath }) => `./${relPath.slice(0, -"/SKILL.md".length)}`);

  for (const { path, relPath } of skillFiles) {
    const expectedName = relPath.split("/")[2];
    errors.push(...validateSkillText(readFileSync(path, "utf8"), expectedName, relPath));
  }

  for (const { path, relPath } of tree.files) {
    if (!textExtensions.has(extname(path).toLowerCase())) continue;
    const text = readFileSync(path, "utf8");
    for (const label of findSecretShapes(text)) {
      errors.push(`${relPath} 包含疑似 ${label}`);
    }
  }

  validateManifestIdentity(root, skillPaths, errors);
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
