#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { loadCodexMetadata, validateCodexMetadataModel } from "./repository-metadata.lib.mjs";
import { spawnTarget } from "./spawn.lib.mjs";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const targetTool = process.argv
  .slice(2)
  .find((arg) => arg.startsWith("--tool="))
  ?.split("=")[1];

function commandExists(command) {
  const locator = process.platform === "win32" ? "where" : "which";
  return spawnSync(locator, [command], { stdio: "ignore" }).status === 0;
}

function runValidation(toolName, command, args, explicit) {
  console.log(`\n=== 正在执行 ${toolName} 插件验证 ===`);
  if (!commandExists(command)) {
    if (explicit) {
      console.error(`[ERROR] 未在当前环境中找到 \`${command}\` 命令，请先安装对应 CLI。`);
      return false;
    }
    console.warn(`[SKIP] 当前环境未安装 \`${command}\`，已跳过 ${toolName} 验证。`);
    return true;
  }
  const useShell = process.platform === "win32";
  const target = spawnTarget(command, args, useShell);
  const result = spawnSync(target.command, target.args, {
    stdio: "inherit",
    shell: useShell,
    windowsHide: true,
  });
  if (result.status !== 0) {
    console.error(`[FAIL] ${toolName} 插件验证失败（退出码：${result.status}）`);
    return false;
  }
  console.log(`[OK] ${toolName} 插件验证通过`);
  return true;
}

function validateCodexPlugin() {
  console.log("\n=== 正在执行 Codex 插件规范验证 ===");
  try {
    const errors = validateCodexMetadataModel(loadCodexMetadata(repoRoot));
    for (const error of errors) console.error(`[FAIL] ${error}`);
    if (errors.length) return false;
    console.log("[OK] Codex 插件规范与仓库元数据验证通过");
    return true;
  } catch (error) {
    console.error(`[FAIL] Codex 规范校验异常：${error.message}`);
    return false;
  }
}

let passed;
if (targetTool === "claude") {
  passed = runValidation("Claude Code", "claude", ["plugin", "validate", ".", "--strict"], true);
} else if (targetTool === "agy") {
  passed = runValidation("Antigravity", "agy", ["plugin", "validate", "."], true);
} else if (targetTool === "codex") {
  passed = validateCodexPlugin();
} else {
  passed = [
    runValidation("Claude Code", "claude", ["plugin", "validate", ".", "--strict"], false),
    runValidation("Antigravity", "agy", ["plugin", "validate", "."], false),
    validateCodexPlugin(),
  ].every(Boolean);
}

if (!passed) process.exitCode = 1;
