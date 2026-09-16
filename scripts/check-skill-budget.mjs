#!/usr/bin/env node

// skill 成本检查：常驻 description 预算、宿主绑定措辞，以及主文件和完整包的字符数。
// 用法：node scripts/check-skill-budget.mjs [--report] [--base <git 引用>]

import { execFileSync } from "node:child_process";
import { readdirSync, readFileSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { discoverRepositorySkills, parseSkillMetadata } from "./repository-metadata.lib.mjs";

const defaultRoot = join(dirname(fileURLToPath(import.meta.url)), "..");

// 可自动触发的 skill 的 description 常驻在模型上下文中，总量超过预算即失败
export const DESCRIPTION_BUDGET = 1100;
// 单个 description 超过建议上限只提示，不失败
export const DESCRIPTION_SOFT_LIMIT = 100;

// 某个宿主特有的工具协议。skill 之间的依赖写成“使用 `<name>` skill”
export const HOST_BINDING_PATTERNS = [
  [/Skill\s*工具/, "“Skill 工具”是 Claude 特有的调用方式，改写为“使用 `<name>` skill”"],
];

const countChars = (text) => [...text].length;

export function parseSkill(text) {
  const { description, modelInvoked } = parseSkillMetadata(text);
  return { description, modelInvoked };
}

function listFiles(dir) {
  const files = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) files.push(...listFiles(path));
    else if (entry.isFile()) files.push(path);
  }
  return files;
}

function readSkills(root) {
  return discoverRepositorySkills(root).map(({ name, directory, main, metadata }) => {
    const packageChars = listFiles(directory)
      .filter((path) => path.endsWith(".md"))
      .reduce((sum, path) => sum + countChars(readFileSync(path, "utf8")), 0);
    return {
      name,
      description: metadata.description,
      modelInvoked: metadata.modelInvoked,
      mainChars: countChars(main),
      packageChars,
    };
  });
}

export function checkDescriptions(skills) {
  const errors = [];
  const warnings = [];
  const modelInvoked = skills.filter((skill) => skill.modelInvoked);
  const total = modelInvoked.reduce((sum, skill) => sum + countChars(skill.description), 0);
  if (total > DESCRIPTION_BUDGET) {
    errors.push(`可自动触发的 description 合计 ${total} 字符，超过预算 ${DESCRIPTION_BUDGET}`);
  }
  for (const skill of modelInvoked) {
    const length = countChars(skill.description);
    if (length > DESCRIPTION_SOFT_LIMIT) {
      warnings.push(
        `skills/${skill.name}/SKILL.md 的 description 有 ${length} 字符，建议不超过 ${DESCRIPTION_SOFT_LIMIT}`,
      );
    }
  }
  return { errors, warnings, total, count: modelInvoked.length };
}

export function findHostBindings(text) {
  const findings = [];
  text.split(/\r?\n/).forEach((line, index) => {
    for (const [pattern, hint] of HOST_BINDING_PATTERNS) {
      if (pattern.test(line)) findings.push({ line: index + 1, hint });
    }
  });
  return findings;
}

function hostBindingErrors(root) {
  const targets = [
    ...listFiles(join(root, "skills")).filter((path) => path.endsWith(".md")),
    join(root, "docs", "invocation.md"),
  ];
  const errors = [];
  for (const path of targets) {
    for (const { line, hint } of findHostBindings(readFileSync(path, "utf8"))) {
      errors.push(`${relative(root, path).replace(/\\/g, "/")}:${line} ${hint}`);
    }
  }
  return errors;
}

function sizesAtRef(root, ref) {
  const sizes = new Map();
  let listing;
  try {
    listing = execFileSync("git", ["ls-tree", "-r", "--name-only", ref, "skills"], {
      cwd: root,
      encoding: "utf8",
    });
  } catch {
    return null;
  }
  for (const path of listing.split("\n").filter((line) => line.endsWith(".md"))) {
    const [, name, ...rest] = path.split("/");
    const text = execFileSync("git", ["show", `${ref}:${path}`], { cwd: root, encoding: "utf8" });
    const entry = sizes.get(name) ?? { mainChars: 0, packageChars: 0 };
    if (rest.join("/") === "SKILL.md") entry.mainChars = countChars(text);
    entry.packageChars += countChars(text);
    sizes.set(name, entry);
  }
  return sizes;
}

function formatDelta(now, before) {
  if (before == null) return "新增";
  const diff = now - before;
  return diff === 0 ? "0" : `${diff > 0 ? "+" : ""}${diff}`;
}

function printReport(skills, base) {
  const previous = base ? sizesAtRef(defaultRoot, base) : null;
  if (base && !previous) console.error(`[WARN] 无法读取 ${base} 的 skills 目录，跳过对比`);
  console.log(
    "\nskill                          触发  主文件  完整包" +
      (previous ? "  主文件Δ  完整包Δ" : ""),
  );
  for (const skill of skills) {
    const before = previous?.get(skill.name);
    const columns = [
      skill.name.padEnd(30),
      (skill.modelInvoked ? "自动" : "用户").padEnd(4),
      String(skill.mainChars).padStart(6),
      String(skill.packageChars).padStart(6),
    ];
    if (previous) {
      columns.push(formatDelta(skill.mainChars, before?.mainChars).padStart(7));
      columns.push(formatDelta(skill.packageChars, before?.packageChars).padStart(7));
    }
    console.log(columns.join("  "));
  }
}

export function checkSkillBudget(root = defaultRoot) {
  const skills = readSkills(root);
  const descriptions = checkDescriptions(skills);
  return {
    skills,
    descriptions,
    errors: [...descriptions.errors, ...hostBindingErrors(root)],
    warnings: descriptions.warnings,
  };
}

const invokedPath = process.argv[1] ? resolve(process.argv[1]) : "";
if (invokedPath === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  const baseIndex = args.indexOf("--base");
  const base = baseIndex >= 0 ? args[baseIndex + 1] : null;
  const { skills, descriptions, errors, warnings } = checkSkillBudget();

  for (const warning of warnings) console.warn(`[WARN] ${warning}`);
  if (args.includes("--report") || base) printReport(skills, base);

  if (errors.length) {
    for (const error of errors) console.error(`[FAIL] ${error}`);
    process.exit(1);
  }
  console.log(
    `[OK] ${descriptions.count} 个可自动触发 skill 的 description 合计 ${descriptions.total}/${DESCRIPTION_BUDGET} 字符，无宿主绑定措辞`,
  );
}
