// Windows 上 claude、codex 等 CLI 常以 .cmd 脚本安装，spawn 必须经过 cmd.exe 启动。
// 此时 Node 只用空格拼接参数，不做转义，需要先按 Windows 命令行规则给每个参数加引号。
export function quoteForCmd(arg) {
  const value = String(arg);
  if (value !== "" && !/[\s"&|<>^()%!]/.test(value)) return value;

  let quoted = '"';
  let backslashes = 0;
  for (const char of value) {
    if (char === "\\") {
      backslashes += 1;
    } else if (char === '"') {
      quoted += "\\".repeat(backslashes * 2 + 1) + '"';
      backslashes = 0;
    } else {
      quoted += "\\".repeat(backslashes) + char;
      backslashes = 0;
    }
  }
  return `${quoted}${"\\".repeat(backslashes * 2)}"`;
}

// 返回传给 spawn 或 spawnSync 的命令和参数。
// 经过 shell 启动时，自行拼成加好引号的完整命令行，参数数组留空。
export function spawnTarget(command, args, useShell) {
  if (!useShell) return { command, args };
  return { command: [command, ...args].map(quoteForCmd).join(" "), args: [] };
}
