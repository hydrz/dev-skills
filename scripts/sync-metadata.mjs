#!/usr/bin/env node

import { readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const isCheckMode = process.argv.includes("--check");

// 1. 扫描 skills 目录收集权威 skill 列表（Codex 只发现 skills/<name>/SKILL.md 这一层）
function discoverSkills() {
  const skillsDir = join(repoRoot, "skills");
  const skills = [];

  for (const entry of readdirSync(skillsDir)) {
    const fullPath = join(skillsDir, entry);
    if (!statSync(fullPath).isDirectory()) continue;
    const skillFile = join(fullPath, "SKILL.md");
    try {
      if (statSync(skillFile).isFile()) {
        skills.push({
          name: entry,
          relPath: `./skills/${entry}`,
        });
      }
    } catch {
      // 忽略没有 SKILL.md 的目录
    }
  }

  return skills.sort((a, b) => a.name.localeCompare(b.name));
}

const allSkills = discoverSkills();
const expectedSkillPaths = allSkills.map((s) => s.relPath);

// 2. 读取 package.json 版本号
const packageJsonPath = join(repoRoot, "package.json");
const packageJson = JSON.parse(readFileSync(packageJsonPath, "utf8"));
const targetVersion = packageJson.version;

let hasDiscrepancy = false;

// 3. 校验 / 同步 .claude-plugin/plugin.json
const claudePluginPath = join(repoRoot, ".claude-plugin", "plugin.json");
const claudePluginContent = readFileSync(claudePluginPath, "utf8");
const claudePlugin = JSON.parse(claudePluginContent);

const claudeSkillsMatch =
  Array.isArray(claudePlugin.skills) &&
  claudePlugin.skills.length === expectedSkillPaths.length &&
  claudePlugin.skills.every((val, idx) => val === expectedSkillPaths[idx]);

const claudeVersionMatch = claudePlugin.version === targetVersion;

if (!claudeSkillsMatch || !claudeVersionMatch) {
  hasDiscrepancy = true;
  if (isCheckMode) {
    console.error(`[FAIL] .claude-plugin/plugin.json 需要同步：`);
    if (!claudeVersionMatch) {
      console.error(`  - 版本不一致：期望 ${targetVersion}，实际 ${claudePlugin.version}`);
    }
    if (!claudeSkillsMatch) {
      console.error(`  - skills 清单不一致。`);
    }
  } else {
    claudePlugin.version = targetVersion;
    claudePlugin.skills = expectedSkillPaths;
    writeFileSync(claudePluginPath, `${JSON.stringify(claudePlugin, null, 2)}\n`, "utf8");
    console.log(
      `[OK] 已更新 .claude-plugin/plugin.json (version: ${targetVersion}, skills: ${expectedSkillPaths.length})`,
    );
  }
} else {
  console.log(`[OK] .claude-plugin/plugin.json 已对齐`);
}

// 4. 校验 / 同步 根目录 plugin.json
const rootPluginPath = join(repoRoot, "plugin.json");
const rootPluginContent = readFileSync(rootPluginPath, "utf8");
const rootPlugin = JSON.parse(rootPluginContent);

if (rootPlugin.version !== targetVersion) {
  hasDiscrepancy = true;
  if (isCheckMode) {
    console.error(
      `[FAIL] plugin.json 版本不一致：期望 ${targetVersion}，实际 ${rootPlugin.version}`,
    );
  } else {
    rootPlugin.version = targetVersion;
    writeFileSync(rootPluginPath, `${JSON.stringify(rootPlugin, null, 2)}\n`, "utf8");
    console.log(`[OK] 已更新 plugin.json (version: ${targetVersion})`);
  }
} else {
  console.log(`[OK] plugin.json 版本已对齐`);
}

// 5. 校验 / 同步 .codex-plugin/plugin.json
const codexPluginPath = join(repoRoot, ".codex-plugin", "plugin.json");
try {
  const codexPluginContent = readFileSync(codexPluginPath, "utf8");
  const codexPlugin = JSON.parse(codexPluginContent);

  if (codexPlugin.version !== targetVersion) {
    hasDiscrepancy = true;
    if (isCheckMode) {
      console.error(
        `[FAIL] .codex-plugin/plugin.json 版本不一致：期望 ${targetVersion}，实际 ${codexPlugin.version}`,
      );
    } else {
      codexPlugin.version = targetVersion;
      writeFileSync(codexPluginPath, `${JSON.stringify(codexPlugin, null, 2)}\n`, "utf8");
      console.log(`[OK] 已更新 .codex-plugin/plugin.json (version: ${targetVersion})`);
    }
  } else {
    console.log(`[OK] .codex-plugin/plugin.json 版本已对齐`);
  }
} catch {
  // .codex-plugin/plugin.json 不存在时跳过
}

// 6. 校验 skills/README.md 清单覆盖率
function checkReadmeCoverage(skills) {
  const readmePath = join(repoRoot, "skills", "README.md");
  const content = readFileSync(readmePath, "utf8");
  const missing = [];

  for (const skill of skills) {
    // 检查是否包含 ./<name>/SKILL.md
    if (!content.includes(`./${skill.name}/SKILL.md`)) {
      missing.push(skill.name);
    }
  }

  if (missing.length > 0) {
    hasDiscrepancy = true;
    console.error(`[FAIL] skills/README.md 缺少以下技能的条目：${missing.join(", ")}`);
  } else {
    console.log(`[OK] skills/README.md 覆盖完整 (${skills.length} skills)`);
  }
}

checkReadmeCoverage(allSkills);

// 7. 校验 ask-dev-skills 路由覆盖
const routerSkillPath = join(repoRoot, "skills", "ask-dev-skills", "SKILL.md");
const routerContent = readFileSync(routerSkillPath, "utf8");
const missingInRouter = [];

for (const skill of allSkills) {
  if (skill.name === "ask-dev-skills") continue;
  // 检查 ask-dev-skills 中是否提及该技能名称
  if (!routerContent.includes(skill.name)) {
    missingInRouter.push(skill.name);
  }
}

if (missingInRouter.length > 0) {
  hasDiscrepancy = true;
  console.error(
    `[FAIL] skills/ask-dev-skills/SKILL.md 路由未覆盖以下技能：${missingInRouter.join(", ")}`,
  );
} else {
  console.log(`[OK] skills/ask-dev-skills/SKILL.md 路由覆盖完整`);
}

if (isCheckMode && hasDiscrepancy) {
  console.error("\n元数据检查失败！运行 `npm run sync` 自动修复配置文件，或补齐相应文档。");
  process.exit(1);
}
