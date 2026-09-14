#!/usr/bin/env node

import { spawnSync } from "node:child_process";

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

// 提取并对比版本号
function compareVersions(v1, v2) {
  const parts1 = v1.split(".").map(Number);
  const parts2 = v2.split(".").map(Number);
  for (let i = 0; i < Math.max(parts1.length, parts2.length); i++) {
    const p1 = parts1[i] || 0;
    const p2 = parts2[i] || 0;
    if (p1 > p2) return 1;
    if (p1 < p2) return -1;
  }
  return 0;
}

if (!commandExists("claude")) {
  console.error("[ERROR] 未在当前环境中找到 Claude Code (claude) CLI。");
  console.error("        请先安装 Claude Code 并完成登录后再运行评测。");
  console.error("        参考文档：https://code.claude.com/docs/en/overview");
  process.exit(1);
}

// 检查 Claude Code 版本（要求 >= 2.1.269）
const versionRes = spawnSync("claude --version", { shell: true, encoding: "utf8" });
const versionOutput = (versionRes.stdout || "").trim();
const match = versionOutput.match(/(\d+\.\d+\.\d+)/);
const currentVersion = match ? match[1] : null;
const requiredVersion = "2.1.269";

if (currentVersion && compareVersions(currentVersion, requiredVersion) < 0) {
  console.error(
    `[ERROR] Claude Code 当前版本为 ${currentVersion}，plugin eval 功能要求 >= ${requiredVersion}。`,
  );
  console.error("        请运行 `claude update` 升级后再试。");
  process.exit(1);
}

const rawArgs = process.argv.slice(2);
const finalArgs = [];
let hasAllowTools = false;
let isQuick = false;
let hasModel = false;
let hasJudgeModel = false;

for (let i = 0; i < rawArgs.length; i++) {
  const arg = rawArgs[i];
  if (arg === "--quick") {
    isQuick = true;
    continue;
  }
  if (arg.startsWith("--allow-tools")) {
    hasAllowTools = true;
  }
  if (arg === "--model" || arg.startsWith("--model=")) {
    hasModel = true;
  }
  if (arg === "--judge-model" || arg.startsWith("--judge-model=")) {
    hasJudgeModel = true;
  }
  finalArgs.push(arg);
}

if (isQuick) {
  finalArgs.push("--runs", "1", "--ablation", "none", "--no-publish");
}

// 默认使用最便宜的性价比模型 (haiku)
if (!hasModel) {
  finalArgs.push("--model", "haiku");
}
if (!hasJudgeModel) {
  finalArgs.push("--judge-model", "haiku");
}

// 默认注入必要的工具授权（tdd-new-function 需要写文件）
if (!hasAllowTools) {
  finalArgs.push("--allow-tools", "Write", "Edit");
}

console.log(`=== 启动 Claude Code 插件评测 (v${currentVersion || "unknown"}) ===`);
const fullCmd = `claude plugin eval . ${finalArgs.join(" ")}`;
console.log(`执行命令: ${fullCmd}\n`);

const result = spawnSync(fullCmd, { stdio: "inherit", shell: true });
process.exit(result.status ?? 0);
