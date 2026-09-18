#!/usr/bin/env bash
# 宿主中立的 Git 高危命令拦截脚本
# 支持作为 Claude Code PreToolUse 钩子、Shell 预检查钩子或直接命令行调用

# 1. 检查紧急逃生通道
if [ "$GIT_GUARD_ALLOW" = "1" ] || [ "$GIT_GUARD_BYPASS" = "1" ]; then
  echo "[Git 安全守卫] 检测到 GIT_GUARD_ALLOW=1，已放行本次操作。" >&2
  exit 0
fi

# 2. 获取待检查命令
# 优先从命令行参数读取；若无参数则从 stdin 读取（支持 JSON 格式或纯文本）
if [ "$#" -gt 0 ]; then
  COMMAND="$*"
else
  INPUT=$(cat)
  if [ -z "$INPUT" ]; then
    exit 0
  fi

  # 尝试从 Claude Code 等宿主的 PreToolUse JSON payload 中提取 command
  # JSON 结构示例: {"tool_input": {"command": "git push --force"}}
  if echo "$INPUT" | grep -q '"command"'; then
    if command -v jq >/dev/null 2>&1; then
      COMMAND=$(echo "$INPUT" | jq -r '.tool_input.command // .command // empty' 2>/dev/null)
    fi
    if [ -z "$COMMAND" ]; then
      COMMAND=$(echo "$INPUT" | sed -n 's/.*"command"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/p' | head -n 1)
    fi
  fi

  # 若未解析出 JSON command，则将 stdin 原始内容作为命令
  if [ -z "$COMMAND" ]; then
    COMMAND="$INPUT"
  fi
fi

# 3. 高危破坏性命令匹配规则（带严格的词界与命令起始边界，避免误拦合法分支名与提交说明）
DANGEROUS_PATTERNS=(
  '(^|[;&|][[:space:]]*)git[[:space:]]+push([[:space:]]+.*)?[[:space:]]+(--force|-f|--force-with-lease)([[:space:]]|$)'
  '(^|[;&|][[:space:]]*)git[[:space:]]+reset([[:space:]]+.*)?[[:space:]]+--hard([[:space:]]|$)'
  '(^|[;&|][[:space:]]*)git[[:space:]]+clean([[:space:]]+.*)?[[:space:]]+(-[a-zA-Z]*f[a-zA-Z]*|--force)([[:space:]]|$)'
  '(^|[;&|][[:space:]]*)git[[:space:]]+branch([[:space:]]+.*)?[[:space:]]+-D([[:space:]]|$)'
  '(^|[;&|][[:space:]]*)git[[:space:]]+(checkout|restore)([[:space:]]+.*)?[[:space:]]+(\.([[:space:]]|$)|:\/|--[[:space:]]+\.)'
  '(^|[;&|][[:space:]]*)push([[:space:]]+.*)?[[:space:]]+(--force|-f|--force-with-lease)([[:space:]]|$)'
  '(^|[;&|][[:space:]]*)reset([[:space:]]+.*)?[[:space:]]+--hard([[:space:]]|$)'
  '(^|[;&|][[:space:]]*)clean([[:space:]]+.*)?[[:space:]]+(-[a-zA-Z]*f[a-zA-Z]*|--force)([[:space:]]|$)'
  '(^|[;&|][[:space:]]*)branch([[:space:]]+.*)?[[:space:]]+-D([[:space:]]|$)'
  '(^|[;&|][[:space:]]*)(checkout|restore)([[:space:]]+.*)?[[:space:]]+(\.([[:space:]]|$)|:\/|--[[:space:]]+\.)'
)

# 4. 逐项匹配并拦截
for pattern in "${DANGEROUS_PATTERNS[@]}"; do
  if echo "$COMMAND" | grep -qE "$pattern"; then
    echo "[Git 安全守卫拦截] 检测到破坏性高危命令: '$COMMAND'" >&2
    echo "命中规则: '$pattern'" >&2
    echo "AI 代理已被禁止执行此操作，以防止工作区修改丢失或分支历史被强行破坏。" >&2
    echo "如果确需执行此操作，请由开发者人工在终端中执行，或设置环境变量 GIT_GUARD_ALLOW=1。" >&2
    exit 2
  fi
done

exit 0
