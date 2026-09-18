#!/usr/bin/env bash
# Git 终端防破坏包装函数模板
# 可直接加入 ~/.bashrc 或 ~/.zshrc，为本地交互终端与各 AI 宿主提供命令守卫

git() {
  case "$*" in
    *"reset --hard"* | *"clean -f"* | *"clean -df"* | *"clean -fd"* | *"clean -fx"* | *"branch -D"* | *"push --force"* | *"push -f"* | *"push "*"--force-with-lease"*)
      if [ "$GIT_GUARD_ALLOW" = "1" ] || [ "$GIT_GUARD_BYPASS" = "1" ]; then
        command git "$@"
      else
        echo "[Git 安全守卫拦截] 检测到破坏性高危命令: git $*" >&2
        echo "为避免工作区改动丢失或历史被覆盖，该命令已被本地守卫拦截。" >&2
        echo "如需强制执行，请在命令前添加环境变量：GIT_GUARD_ALLOW=1 git $*" >&2
        return 2
      fi
      ;;
    *)
      command git "$@"
      ;;
  esac
}
