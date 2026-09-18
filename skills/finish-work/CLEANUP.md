# 工作区清理与分支安全管理

`finish-work` 的按需参考：切换到主仓库根目录、本地合并完成后清理、分支已在远程合入后收口、或用户已明确要求丢弃工作时读取。

## 1. 切换到主仓库根目录

移除工作树必须在工作树目录之外执行。使用以下命令定位并切换到主仓库根目录：

```bash
MAIN_ROOT=$(git -C "$(git rev-parse --git-common-dir)/.." rev-parse --show-toplevel)
cd "$MAIN_ROOT"
```

## 2. 工作树安全移除

**普通仓库（`GIT_DIR == GIT_COMMON`）**：无独立工作树需要清理。

**位于 `.worktrees/` 或 `worktrees/` 下的工作树**：这是本流程或开发任务创建的隔离工作区，由本流程负责清理：

```bash
git worktree remove "$WORKTREE_PATH"
git worktree prune
```

### 移除被拒绝时的处理

如果命令提示 `contains modified or untracked files`，说明工作树中存在从未提交过的草稿、笔记或临时代码：

1. 先检查未提交的具体文件列表：
   ```bash
   git -C "$WORKTREE_PATH" status --porcelain -uall
   ```
2. 向用户展示文件列表并询问处理方式：
   ```text
   工作树移除被拒绝，以下文件从未提交：

   <文件列表>

   1. 先提交到当前分支再清理
   2. 移动到主仓库根目录保存
   3. 彻底删除（不可恢复）

   选哪个？
   ```
3. 严格按用户的选择执行；只有当用户明确选择“彻底删除”后，才追加 `--force` 参数移除工作树。

## 3. 分支安全删除

### 正常合入后的删除（Safe Delete）

代码已安全合入基线分支且主干测试通过后，使用小写 `-d` 删除本地功能分支：

```bash
git branch -d <功能分支>
```

> [!NOTE]
> 如果 git 报告该分支尚未完全合并（例如在远程 squash 合并后本地 git 无法通过普通提交链识别），先运行 `git pull` 同步主干；确认主干已包含全部改动后，再使用 `-D` 删除。

### 丢弃工作时的强制删除（Discard）

只在用户已明确输入 `discard` 确认后执行：

1. 强制清理工作树：
   ```bash
   git worktree remove --force "$WORKTREE_PATH"
   git worktree prune
   ```
2. 强制删除本地分支：
   ```bash
   git branch -D <功能分支>
   ```

## 4. 远程分支清理

在 PR 合并后，通常由托管平台（如 GitHub 的“Automatically delete head branches”）自动删除远程分支。若需手动清理已合并的远程分支：

```bash
git push origin --delete <功能分支>
```
