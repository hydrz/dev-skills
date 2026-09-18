#!/usr/bin/env bash
# Git 终端防破坏包装函数模板
# 可直接加入 ~/.bashrc 或 ~/.zshrc，为本地交互终端与各 AI 宿主提供命令守卫

git() {
  # 1. 检查紧急逃生通道
  if [ "$GIT_GUARD_ALLOW" = "1" ] || [ "$GIT_GUARD_BYPASS" = "1" ]; then
    command git "$@"
    return $?
  fi

  # 2. 如果显式配置了守卫脚本路径（如 GIT_GUARD_HOOK），优先直接委托给脚本校验
  if [ -n "$GIT_GUARD_HOOK" ] && [ -x "$GIT_GUARD_HOOK" ]; then
    if ! "$GIT_GUARD_HOOK" git "$@"; then
      return 2
    fi
    command git "$@"
    return $?
  fi

  # 3. 内置轻量安全检查：先按子命令分流，仅当属于潜在高危动词时才检查对应危险选项，避免误拦 commit -m 信息
  local subcmd="$1"
  local is_dangerous=0

  case "$subcmd" in
    push)
      if echo " $* " | grep -qE '[[:space:]]+(--force|-f|--force-with-lease)([[:space:]]|$)'; then
        is_dangerous=1
      fi
      ;;
    reset)
      if echo " $* " | grep -qE '[[:space:]]+--hard([[:space:]]|$)'; then
        is_dangerous=1
      fi
      ;;
    clean)
      if echo " $* " | grep -qE '[[:space:]]+(-[a-zA-Z]*f[a-zA-Z]*|--force)([[:space:]]|$)'; then
        is_dangerous=1
      fi
      ;;
    branch)
      if echo " $* " | grep -qE '[[:space:]]+-D([[:space:]]|$)'; then
        is_dangerous=1
      fi
      ;;
    checkout | restore)
      if echo " $* " | grep -qE '[[:space:]]+(\.([[:space:]]|$)|:\/|--[[:space:]]+\.)'; then
        is_dangerous=1
      fi
      ;;
  esac

  if [ "$is_dangerous" -eq 1 ]; then
    echo "[Git 安全守卫拦截] 检测到破坏性高危命令: git $*" >&2
    echo "为避免工作区改动丢失或历史被覆盖，该命令已被本地守卫拦截。" >&2
    echo "如需强制执行，请在命令前添加环境变量：GIT_GUARD_ALLOW=1 git $*" >&2
    return 2
  fi

  command git "$@"
}
