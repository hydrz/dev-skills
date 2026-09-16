#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import { pathToFileURL } from "node:url";

import { spawnTarget } from "../spawn.lib.mjs";

// 不带取值的 claude plugin eval 选项；其余以 - 开头的选项视为可以带取值
const BOOLEAN_FLAGS = new Set([
  "--quick",
  "--allow-real-servers",
  "--keep-temp",
  "--no-publish",
  "--no-scaffold",
  "--publish-report",
  "--scaffold",
  "--trust-plugin",
  "--verbose",
  "-h",
  "--help",
]);

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

// 校验用户参数并补齐默认值，返回传给 `claude plugin eval .` 的参数数组
export function buildEvalArgs(rawArgs) {
  const finalArgs = [];
  let previousOption = null;
  let hasAllowTools = false;
  let isQuick = false;
  let hasModel = false;
  let hasJudgeModel = false;

  for (const arg of rawArgs) {
    if (arg.startsWith("-")) {
      previousOption = arg.split("=")[0];
    } else if (previousOption === null || BOOLEAN_FLAGS.has(previousOption)) {
      // 孤立的位置参数会被 claude plugin eval 忽略，并悄悄运行全部 case
      throw new Error(
        [
          `无法识别的参数 "${arg}"：它前面没有需要取值的选项。`,
          "        过滤 case 请写 --case <名称>，过滤标签请写 --tag <标签>。",
          "        在 Windows PowerShell 中，npm run 后面的 -- 会被吞掉，请写成 '--'：",
          `        npm run eval:claude '--' --case ${arg}`,
        ].join("\n"),
      );
    }

    if (arg === "--quick") {
      isQuick = true;
      continue;
    }
    if (previousOption === "--allow-tools") hasAllowTools = true;
    if (previousOption === "--model") hasModel = true;
    if (previousOption === "--judge-model") hasJudgeModel = true;
    finalArgs.push(arg);
  }

  if (isQuick) {
    finalArgs.push("--runs", "1", "--ablation", "none", "--no-publish");
  }

  // 默认使用最便宜的性价比模型 (haiku)
  if (!hasModel) finalArgs.push("--model", "haiku");
  if (!hasJudgeModel) finalArgs.push("--judge-model", "haiku");

  // 默认注入必要的工具授权（部分 case 需要写文件）
  if (!hasAllowTools) finalArgs.push("--allow-tools", "Write", "Edit");

  return finalArgs;
}

function main() {
  if (!commandExists("claude")) {
    console.error("[ERROR] 未在当前环境中找到 Claude Code (claude) CLI。");
    console.error("        请先安装 Claude Code 并完成登录后再运行评测。");
    console.error("        参考文档：https://code.claude.com/docs/en/overview");
    return 1;
  }

  let finalArgs;
  try {
    finalArgs = buildEvalArgs(process.argv.slice(2));
  } catch (error) {
    console.error(`[ERROR] ${error.message}`);
    return 1;
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
    return 1;
  }

  const commandArgs = ["plugin", "eval", ".", ...finalArgs];
  console.log(`=== 启动 Claude Code 插件评测 (v${currentVersion || "unknown"}) ===`);
  console.log(`执行命令: claude ${commandArgs.join(" ")}\n`);

  // Windows 上 claude 可能是 .cmd 脚本，需要经过 shell 启动；其他平台直接传参数数组，避免通配符被展开
  const isWindows = process.platform === "win32";
  const target = spawnTarget("claude", commandArgs, isWindows);
  const result = spawnSync(target.command, target.args, { stdio: "inherit", shell: isWindows });
  return result.status ?? 1;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  process.exit(main());
}
