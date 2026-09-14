# 准备工作树

`implement` 和 `implement-spec` 需要隔离的工作区时，按本文准备工作树（worktree）。

- 是否新建由调用方决定：`implement` 先征得用户同意；`implement-spec` 为每个实现者创建，不逐次询问。
- 清理由 `finishing-a-branch` 第 6 步和 `implement-spec` 的收尾负责。本文的目录约定与它们一致。

## 1. 检测当前是否已经隔离

创建之前先检测。凭目录名或路径判断不可靠：运行环境创建的工作树和子模块都容易误判。

```bash
GIT_DIR=$(git rev-parse --path-format=absolute --git-dir)
GIT_COMMON=$(git rev-parse --path-format=absolute --git-common-dir)
# 有输出说明位于子模块中
SUPERPROJECT=$(git rev-parse --show-superproject-working-tree 2>/dev/null)
```

两个路径都让 git 直接输出绝对路径（需要 git 2.31 及以上）。不要用 `cd` 加 `pwd -P` 自行转换：Windows 的 Git Bash 可能把同一个目录显示成不同的挂载路径（例如 `/tmp/...` 和 `/c/.../Temp/...`），这时在子目录中运行会把普通仓库误判为工作树。子模块检查用来兜底，避免把子模块误判为工作树。

| 结果                                            | 含义             | 处理                                                                                                           |
| ----------------------------------------------- | ---------------- | -------------------------------------------------------------------------------------------------------------- |
| `GIT_DIR == GIT_COMMON`，或 `SUPERPROJECT` 非空 | 普通检出         | 需要隔离时按第 2 步创建                                                                                        |
| `GIT_DIR != GIT_COMMON`，且 `SUPERPROJECT` 为空 | 已经位于工作树中 | `implement`：在当前工作树工作，不再新建。`implement-spec`：当前工作树留给协调者，实现者的工作树仍按第 2 步创建 |

已经位于工作树中时，告诉用户路径和分支。当前是 detached HEAD 时，说明这个工作区由外部管理，收尾时需要新建分支。

## 2. 创建工作树

按顺序选择创建方式。

### 优先：运行环境自带的工具

运行环境提供创建工作树的工具时（例如 Claude Code 的 `EnterWorktree`，或名为 `/worktree` 的命令、`--worktree` 参数），使用它。这类工具自己管理目录位置、分支和清理；手动运行 `git worktree add` 会留下运行环境看不到、也无法清理的状态。

工具无法满足调用方要求的分支起点或分支名时（`implement-spec` 要求基于指定的 BASE），改用 git 创建，并在回复或进度记录中写明原因。

### 其次：用 git 创建

**1. 找到主仓库根目录。** 位于工作树中时，要取主仓库的根目录，否则新工作树会嵌套在当前工作树里：

```bash
if [ "$GIT_DIR" != "$GIT_COMMON" ] && [ -z "$SUPERPROJECT" ]; then
  MAIN_ROOT=$(git -C "$GIT_COMMON/.." rev-parse --show-toplevel)
else
  MAIN_ROOT=$(git rev-parse --show-toplevel)
fi
```

**2. 选择目录**，按优先级：

1. 用户指令（`CLAUDE.md`、`AGENTS.md` 或对话）指定了工作树目录时，使用该目录。
2. `MAIN_ROOT` 下已有 `.worktrees/` 或 `worktrees/` 时，使用它；两者都有时用 `.worktrees/`。
3. 都没有时，使用 `MAIN_ROOT/.worktrees/`。

`finishing-a-branch` 只清理 `.worktrees/` 和 `worktrees/` 下的工作树。使用用户指定的其他目录时，告诉用户这些工作树需要手动清理。

**3. 确认目录已被 git 忽略。** 位于仓库内的目录必须先确认，否则整个工作树会作为未跟踪文件出现在主仓库中，容易被一起提交。检查要创建的完整路径：

```bash
git -C "$MAIN_ROOT" check-ignore -q ".worktrees/<分支名>"
```

只检查 `.worktrees` 本身不可靠：目录还不存在时，即使 `.gitignore` 写了 `.worktrees/`，这条命令也报告为未忽略。

没有被忽略时，把目录加入 `.gitignore` 并单独提交这一处改动，告诉用户，然后再创建。

**4. 创建。**

```bash
git -C "$MAIN_ROOT" worktree add ".worktrees/<分支名>" -b <分支名> <起点>
```

`implement` 的起点是当前 `HEAD`；`implement-spec` 的起点是这项任务的 BASE。

**创建被沙箱拒绝时**（权限错误），告诉用户沙箱不允许创建工作树，然后：

- `implement`：在当前检出中新建分支并继续。
- `implement-spec`：无法隔离并行的实现者，改为在当前检出中逐项串行执行，每项任务切换到自己的分支。把这一变化作为代行决策写入进度记录。

## 3. 安装依赖并确认基线

新工作树中没有依赖目录和构建产物。进入工作树，按项目的锁文件和已有脚本安装依赖，例如 `package-lock.json` 对应 `npm ci`，`pnpm-lock.yaml` 对应 `pnpm install`，`uv.lock` 对应 `uv sync`，`go.mod` 对应 `go mod download`。项目 README 或 `CONTRIBUTING.md` 写了准备步骤时，照做。

然后确认基线：

- `implement`：在工作树中运行完整测试套件，记录通过数量。基线失败时，报告失败并询问用户是否继续。
- `implement-spec`：基线在准备阶段对集成分支（或主干）运行一次，每个实现者工作树只安装依赖。基线失败时，把失败的测试写入进度记录，并在派发提示中告诉实现者哪些测试原本就失败；整个测试套件都无法运行、无法判断任务是否完成时，按“任何推进方式都只能靠猜测”停下询问用户。

完成后报告：

```
工作树已就绪：<完整路径>（分支 <分支名>，基于 <起点>）
基线：<N> 个测试通过，<M> 个失败
```
