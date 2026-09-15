# 本地合并、丢弃与清理

`finishing-a-branch` 的按需参考：用户选择本地合并，或已明确要求丢弃工作时读取。变量 `GIT_DIR`、`GIT_COMMON`、`WORKTREE_PATH` 来自主文件第 2 步。

## 本地合并

```bash
MAIN_ROOT=$(git -C "$(git rev-parse --git-common-dir)/.." rev-parse --show-toplevel)
cd "$MAIN_ROOT"

git checkout <基线分支>
git pull
git merge <功能分支>

<测试命令>
```

合并后测试失败时：停止，保留工作树和分支原样，开始调查。此时还没有推送，合并只发生在本地，可以恢复。

合并后测试通过时：清理工作树（见下文“清理工作区”），然后删除分支：

```bash
git branch -d <功能分支>
```

## 丢弃工作

只在用户已输入 `discard` 确认后执行（确认提示见主文件）：

```bash
MAIN_ROOT=$(git -C "$(git rev-parse --git-common-dir)/.." rev-parse --show-toplevel)
cd "$MAIN_ROOT"
```

清理工作树（见下文“清理工作区”），再强制删除分支：

```bash
git branch -D <功能分支>
```

## 清理工作区

**只在选项 1 和已确认的丢弃流程中执行。** 选项 2 和 3 始终保留工作树。执行到这一步时，已经切换到主仓库根目录（移除工作树必须在工作树之外执行），并使用主文件第 2 步切换目录之前记录的值。

**`GIT_DIR == GIT_COMMON`：** 普通仓库，无工作树需要清理。完成。

**`WORKTREE_PATH` 位于 `.worktrees/` 或 `worktrees/` 下：** 这是本流程创建的工作树，由本流程负责清理：

```bash
git worktree remove "$WORKTREE_PATH"
git worktree prune
```

**移除被拒绝**（`contains modified or untracked files`）：说明工作树中有其他地方都没有的文件（未提交的计划、笔记、草稿）。先查看有哪些文件，展示给用户，然后询问：

```bash
git -C "$WORKTREE_PATH" status --porcelain -uall
```

```
工作树移除被拒绝，以下文件从未提交：

<文件列表>

1. 先提交到 <分支> 再清理
2. 移到 <主仓库根目录>
3. 删除（不可恢复）

选哪个？
```

执行用户的选择，然后再移除工作树。只有用户选择 3 之后，才使用 `--force`。

**其他情况：** 工作区由宿主环境管理，保持原样。平台提供退出工作区的工具时，使用该工具。
