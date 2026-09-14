#!/usr/bin/env node

import { spawnSync } from "node:child_process";

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

// 执行指定验证命令
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

let allPassed = true;

if (specifiedTool === "claude") {
  allPassed = runValidation("Claude Code", "claude", ["plugin", "validate", ".", "--strict"], true);
} else if (specifiedTool === "agy") {
  allPassed = runValidation("Antigravity", "agy", ["plugin", "validate", "."], true);
} else {
  // 综合验证：依次运行 Claude Code 和 Antigravity
  const claudeOk = runValidation(
    "Claude Code",
    "claude",
    ["plugin", "validate", ".", "--strict"],
    false,
  );
  const agyOk = runValidation("Antigravity", "agy", ["plugin", "validate", "."], false);
  allPassed = claudeOk && agyOk;
}

if (!allPassed) {
  process.exit(1);
}
