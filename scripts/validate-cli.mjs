#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import { existsSync, readFileSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const args = process.argv.slice(2);
const targetToolArg = args.find((a) => a.startsWith("--tool="));
const specifiedTool = targetToolArg ? targetToolArg.split("=")[1] : null;

// 探测命令是否存在
function commandExists(cmd) {
  try {
    const isWindows = process.platform === "win32";
    const checkCmd = isWindows ? "where" : "which";
    const res = spawnSync(checkCmd, [cmd], { stdio: "ignore" });
    return res.status === 0;
  } catch {
    return false;
  }
}

// 执行指定 CLI 验证命令
function runValidation(toolName, cmd, cmdArgs, isExplicit) {
  console.log(`\n=== 正在执行 ${toolName} 插件验证 ===`);
  const exists = commandExists(cmd);

  if (!exists) {
    if (isExplicit) {
      console.error(`[ERROR] 未在当前环境中找到 ${cmd} 命令，请先安装对应 CLI。`);
      process.exit(1);
    } else {
      console.warn(`[SKIP] 当前环境未安装 ${cmd}，已跳过 ${toolName} 验证。`);
      return true;
    }
  }

  const fullCommandLine = `${cmd} ${cmdArgs.join(" ")}`;
  const result = spawnSync(fullCommandLine, { stdio: "inherit", shell: true });
  if (result.status !== 0) {
    console.error(`[FAIL] ${toolName} 插件验证失败 (退出码: ${result.status})`);
    return false;
  }

  console.log(`[OK] ${toolName} 插件验证通过`);
  return true;
}

// 静态校验 Codex 插件规范（因 Codex CLI 官方无独立 plugin validate 命令）
function validateCodexPlugin() {
  console.log(`\n=== 正在执行 Codex 插件规范验证 ===`);
  let passed = true;

  try {
    const packageJson = JSON.parse(readFileSync(join(repoRoot, "package.json"), "utf8"));
    const expectedVersion = packageJson.version;

    // 1. 检验根目录 plugin.json
    const rootPluginPath = join(repoRoot, "plugin.json");
    if (!existsSync(rootPluginPath)) {
      console.error(`[FAIL] 缺失根目录 plugin.json`);
      passed = false;
    } else {
      const rootPlugin = JSON.parse(readFileSync(rootPluginPath, "utf8"));
      if (rootPlugin.version !== expectedVersion) {
        console.error(
          `[FAIL] plugin.json version (${rootPlugin.version}) 与 package.json (${expectedVersion}) 不一致`,
        );
        passed = false;
      }
      const openaiExt = rootPlugin.extensions?.["com.openai"];
      if (!openaiExt?.interface?.displayName || !openaiExt?.interface?.shortDescription) {
        console.error(`[FAIL] plugin.json 缺少合法的 extensions["com.openai"].interface 元数据`);
        passed = false;
      }
    }

    // 2. 检验 .codex-plugin/plugin.json
    const codexPluginPath = join(repoRoot, ".codex-plugin", "plugin.json");
    if (!existsSync(codexPluginPath)) {
      console.error(`[FAIL] 缺失 .codex-plugin/plugin.json`);
      passed = false;
    } else {
      const codexPlugin = JSON.parse(readFileSync(codexPluginPath, "utf8"));
      if (codexPlugin.version !== expectedVersion) {
        console.error(
          `[FAIL] .codex-plugin/plugin.json version (${codexPlugin.version}) 与 package.json (${expectedVersion}) 不一致`,
        );
        passed = false;
      }
      if (!codexPlugin.name || !codexPlugin.description) {
        console.error(`[FAIL] .codex-plugin/plugin.json 缺少必填字段 name 或 description`);
        passed = false;
      }
      if (typeof codexPlugin.skills !== "string") {
        console.error(
          `[FAIL] .codex-plugin/plugin.json 的 skills 字段必须为单路径字符串 (当前为 ${typeof codexPlugin.skills})`,
        );
        passed = false;
      } else {
        const skillsDir = join(repoRoot, codexPlugin.skills);
        if (!existsSync(skillsDir) || !statSync(skillsDir).isDirectory()) {
          console.error(`[FAIL] .codex-plugin/plugin.json 指定的 skills 路径不存在: ${skillsDir}`);
          passed = false;
        }
      }
      if (!codexPlugin.interface?.displayName || !codexPlugin.interface?.shortDescription) {
        console.error(`[FAIL] .codex-plugin/plugin.json 缺少合法的 interface 元数据`);
        passed = false;
      }
    }
  } catch (error) {
    console.error(`[FAIL] Codex 规范校验异常: ${error.message}`);
    passed = false;
  }

  if (passed) {
    console.log(`[OK] Codex 插件规范验证通过`);
  }
  return passed;
}

let allPassed = true;

if (specifiedTool === "claude") {
  allPassed = runValidation("Claude Code", "claude", ["plugin", "validate", ".", "--strict"], true);
} else if (specifiedTool === "agy") {
  allPassed = runValidation("Antigravity", "agy", ["plugin", "validate", "."], true);
} else if (specifiedTool === "codex") {
  allPassed = validateCodexPlugin();
} else {
  // 综合验证：依次运行 Claude Code、Antigravity 与 Codex
  const claudeOk = runValidation(
    "Claude Code",
    "claude",
    ["plugin", "validate", ".", "--strict"],
    false,
  );
  const agyOk = runValidation("Antigravity", "agy", ["plugin", "validate", "."], false);
  const codexOk = validateCodexPlugin();
  allPassed = claudeOk && agyOk && codexOk;
}

if (!allPassed) {
  process.exit(1);
}
