---
name: git-guardrails
description: 配置跨平台、宿主中立的本地 Git 防破坏拦截（阻断强推、硬重置、强制清理与强删分支等不可逆操作）。
disable-model-invocation: true
---

# Git 安全守卫向导

AI 编程助手（Claude Code、Antigravity、Codex、Cursor、Windsurf 等）在自主推进任务时，可能因幻觉、过度激进的代码回退或错误的清理逻辑，误执行具有不可逆破坏性的 Git 命令。

本向导用于在开发者本地或团队仓库中建立**宿主中立的 Git 安全守卫**。通过组合“Git 原生 Hook 防线”与“多宿主/Shell 预执行防线”，在命令执行前实施刚性拦截，保护未提交改动、本地分支与远程主干历史。

## 防护目标清单

守卫默认拦截以下不可逆操作：

- `git push --force` / `git push -f` / `--force-with-lease`：阻断强行覆盖远程分支历史。
- `git reset --hard`：阻断丢弃所有未提交工作区与暂存区改动。
- `git clean -f` / `git clean -fd` / `git clean -fx`：阻断永久删除未追踪文件与目录。
- `git branch -D`：阻断强行删除未合并的本地分支。
- `git checkout .` / `git restore .`：阻断无提示丢弃工作区当前修改。
- 直推受保护分支：阻断未经 PR 审查直接向 `main`、`master` 等受保护分支推送代码（通过原生 `pre-push` 可选开启）。

## 双层防御体系

1. **第一道防线：Git 原生 Hook（拦截远程破坏）**
   - 依赖 Git 原生 `pre-push` 机制，任何终端、IDE 或 AI 宿主只要发起推送，均会触发检查。
   - 拦截非快进强推（force push）与受保护分支误删除，技术栈与宿主完全中立。
2. **第二道防线：宿主预执行与 Shell 守卫（拦截本地破坏）**
   - Git 原生未提供针对本地重置、清理的预执行钩子。本向导提供轻量拦截脚本 [block-dangerous-git.sh](block-dangerous-git.sh) 与 Shell 函数 [git-guard-shell.sh](git-guard-shell.sh)。
   - 既支持作为 Claude Code 的 `PreToolUse` 钩子，也支持作为通用 Shell 环境的封装守卫，或在 CI/本地脚本中作为命令校验器。

## 向导执行步骤

### 1. 确定防护范围与环境

询问用户防护范围与当前使用的开发环境：

- **防护范围**：
  - **当前项目（推荐）**：仅在当前仓库生效（写入项目级 Git hooks 与宿主配置）。
  - **全局环境**：针对开发者机器上的所有仓库生效（配置全局 hooksPath 与全局宿主配置）。
- **执行环境**：
  - 询问用户主要使用哪个 AI 工具（Claude Code、Antigravity、Cursor、Windsurf 等）或纯终端 Shell。
  - 确认是否需要紧急逃生通道（默认支持在必要时通过环境变量 `GIT_GUARD_ALLOW=1` 临时放行命令）。

**完成条件：** 明确了安装范围（项目级或全局级）以及需要启用的防御防线。

### 2. 确认拦截规则与例外

向用户展示待启用的高危命令拦截规则：

- 强推保护：`git push --force`、`-f`、`--force-with-lease`
- 硬重置保护：`git reset --hard`
- 强制清理保护：`git clean -f`、`-fd`、`-fx`
- 强删分支保护：`git branch -D`
- 丢弃修改保护：`git checkout .`、`git restore .`
- 受保护分支名单：默认包含 `main` 与 `master`

询问用户是否需要调整白名单或补充特定分支。确认后开始安装配置。

**完成条件：** 用户确认了规则清单，没有未商定的拦截遗漏。

### 3. 安装 Git 原生 Hook（pre-push）

将模板脚本 [pre-push-guard.sh](pre-push-guard.sh) 部署至目标位置：

- **项目级安装**：
  ```bash
  mkdir -p .git/hooks
  cp <skill目录>/pre-push-guard.sh .git/hooks/pre-push
  chmod +x .git/hooks/pre-push
  ```
  如果仓库希望将 hooks 纳入版本控制与团队共享：
  ```bash
  mkdir -p .githooks
  cp <skill目录>/pre-push-guard.sh .githooks/pre-push
  chmod +x .githooks/pre-push
  git config core.hooksPath .githooks
  ```
- **全局安装**：
  ```bash
  mkdir -p ~/.config/git/hooks
  cp <skill目录>/pre-push-guard.sh ~/.config/git/hooks/pre-push
  chmod +x ~/.config/git/hooks/pre-push
  git config --global core.hooksPath ~/.config/git/hooks
  ```

**完成条件：** `pre-push` 钩子已就位且具备可执行权限。

### 4. 安装宿主与 Shell 拦截脚本

将 [block-dangerous-git.sh](block-dangerous-git.sh) 复制到配置目录，并按宿主挂载：

#### 方案 A：Claude Code 宿主（PreToolUse Hook）

复制脚本：

- 项目级：`.claude/hooks/block-dangerous-git.sh`
- 全局级：`~/.claude/hooks/block-dangerous-git.sh`
- 赋予权限：`chmod +x <目标路径>`

在对应的设置文件（`.claude/settings.json` 或 `~/.claude/settings.json`）中合并 `PreToolUse` 配置：

```json
{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "Bash",
        "hooks": [
          {
            "type": "command",
            "command": "\"$CLAUDE_PROJECT_DIR\"/.claude/hooks/block-dangerous-git.sh"
          }
        ]
      }
    ]
  }
}
```

全局配置时将 command 替换为 `"~/.claude/hooks/block-dangerous-git.sh"`。已有配置时注意保留原有设置，合并到 `PreToolUse` 数组中。

#### 方案 B：通用 Shell 守卫（Bash / Zsh 终端）

对于 Antigravity、Cursor、Windsurf 等通过集成终端运行命令的宿主，或开发者本地终端，可引用 [git-guard-shell.sh](git-guard-shell.sh)：

将函数加入用户 Shell 配置（如 `~/.bashrc` 或 `~/.zshrc`）：

```bash
source <绝对路径>/git-guard-shell.sh
```

或者将 [block-dangerous-git.sh](block-dangerous-git.sh) 链接到本地构建流程或 pre-tool 检查脚本中。

**完成条件：** 目标宿主或终端已挂载命令预执行守卫。

### 5. 验证防护效果

带领用户执行轻量、无破坏的静态与模拟验证：

1. **验证宿主/本地拦截**：
   在终端中模拟触发高危命令，检查是否输出阻断信息且退出码非 0：
   ```bash
   echo '{"tool_input":{"command":"git reset --hard"}}' | <脚本路径>
   ```
   或直接传参测试：
   ```bash
   <脚本路径> git clean -fd
   ```
   预期结果：终端打印 `BLOCKED` 拦截信息，退出码为 2。
2. **验证合法操作不受影响**：
   ```bash
   <脚本路径> git status
   ```
   预期结果：正常退出（退出码 0），无任何阻断信息。
3. **验证逃生通道**：
   ```bash
   GIT_GUARD_ALLOW=1 <脚本路径> git push --force
   ```
   预期结果：打印放行警告，退出码为 0。

**完成条件：** 观察到至少一次成功的拦截反馈和一次正常命令放行反馈。

### 6. 维护与逃生指引

向用户交代日常使用中的注意事项：

- **正常开发**：常规 `git add`、`git commit`、`git checkout -b <新分支>`、`git pull` 等操作完全透明不受影响。
- **紧急绕过**：如果开发者本人确实需要执行变基后推送或清理工作区，使用临时环境变量：
  ```bash
  GIT_GUARD_ALLOW=1 git push --force-with-lease
  ```
- **团队协作**：项目级防护建议将 `.githooks/` 与团队指引提交至代码库，在新成员克隆或环境初始化时执行 `git config core.hooksPath .githooks`。
