#!/usr/bin/env bash
# 人在回路的复现脚本。
# 复制本文件，编辑下面的步骤，然后运行。
# agent 运行脚本；用户在终端里按提示操作。
#
# 用法：
#   bash hitl-loop.template.sh
#
# 两个辅助函数：
#   step "<指示>"          → 显示指示，等待回车
#   capture VAR "<问题>"   → 显示问题，把回答读入 VAR
#
# 结束时，抓到的值以 KEY=VALUE 形式打印，供 agent 解析。
#
# capture 会把值回显到终端，agent 能读到，
# 所以只用它抓观察结果；登录这类操作用 step 交给用户自己完成。

set -euo pipefail

step() {
  printf '\n>>> %s\n' "$1"
  read -r -p "    [完成后按回车] " _
}

capture() {
  local var="$1" question="$2" answer
  printf '\n>>> %s\n' "$question"
  read -r -p "    > " answer
  printf -v "$var" '%s' "$answer"
}

# --- 在下面编辑 ---------------------------------------------------------

step "在 http://localhost:3000 打开应用并登录。"

capture ERRORED "点击「导出」按钮。报错了吗？(y/n)"

capture ERROR_MSG "粘贴错误信息（没有就填 none）："

# --- 在上面编辑 ---------------------------------------------------------

printf '\n--- 抓取结果 ---\n'
printf 'ERRORED=%s\n' "$ERRORED"
printf 'ERROR_MSG=%s\n' "$ERROR_MSG"
