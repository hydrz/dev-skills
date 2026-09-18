#!/usr/bin/env bash
# Git 原生 pre-push 钩子模板：拦截非快进强推与受保护分支误删除
# 适用于所有 Git 客户端与 AI 宿主，零外部依赖

if [ "$GIT_GUARD_ALLOW" = "1" ] || [ "$GIT_GUARD_BYPASS" = "1" ]; then
  echo "[Git 安全守卫] 检测到 GIT_GUARD_ALLOW=1，已放行本次推送。" >&2
  exit 0
fi

ZERO_SHA="0000000000000000000000000000000000000000"
PROTECTED_BRANCHES="^(refs/heads/main|refs/heads/master)$"

while read -r local_ref local_sha remote_ref remote_sha; do
  # 1. 拦截删除受保护分支
  if [ "$local_sha" = "$ZERO_SHA" ]; then
    if echo "$remote_ref" | grep -qE "$PROTECTED_BRANCHES"; then
      echo "[Git 安全守卫拦截] 禁止删除受保护分支 '$remote_ref'！" >&2
      exit 1
    fi
    continue
  fi

  # 2. 可选拦截对受保护分支的直接推送（设置 GIT_GUARD_PROTECT_MAIN=1 时开启）
  if [ "$GIT_GUARD_PROTECT_MAIN" = "1" ]; then
    if echo "$remote_ref" | grep -qE "$PROTECTED_BRANCHES"; then
      echo "[Git 安全守卫拦截] 禁止直接向受保护分支 '$remote_ref' 推送代码，请通过 PR 流程合并！" >&2
      echo "若确需直推，请使用：GIT_GUARD_ALLOW=1 git push" >&2
      exit 1
    fi
  fi

  # 3. 拦截非快进推送（强制推送 force push）
  if [ "$remote_sha" != "$ZERO_SHA" ]; then
    if ! git merge-base --is-ancestor "$remote_sha" "$local_sha" 2>/dev/null; then
      echo "[Git 安全守卫拦截] 检测到非快进强制推送（force push）至 '$remote_ref'！" >&2
      echo "强推会覆盖远程提交历史并损毁协作者工作。请先执行 git pull 变基整合。" >&2
      echo "若确需强推，请使用：GIT_GUARD_ALLOW=1 git push --force-with-lease" >&2
      exit 1
    fi
  fi
done

exit 0
