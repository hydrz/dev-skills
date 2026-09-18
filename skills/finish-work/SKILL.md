---
name: finish-work
description: 实现、代码评审与完成验证都通过后，把功能分支收尾：合并、提交评审或保持现状，安全清理工作树与分支。
disable-model-invocation: true
---

# 交付收尾

功能分支的实现、评审与完成验证都通过后运行。检测到的 Git 环境只用来给推荐；合并、推送这类难以撤销或对外可见的操作，必须先呈现选项，等用户明确回复才能继续。

## 流程

### 1. 门禁复核

1. **未提交变更**：运行 `git status --porcelain`；有未暂存或未提交的修改，先提示用户处理。
2. **测试**：遵循 `verifying-completion` skill，重新完整运行全量测试套件。**失败则立即停止**。
3. **评审遗留**：经历过 `code-review` 的，核实所有“严重”“重要”级别意见是否均已解决。

### 2. 识别环境与呈现选项

```bash
GIT_DIR=$(git rev-parse --path-format=absolute --git-dir)
GIT_COMMON=$(git rev-parse --path-format=absolute --git-common-dir)
WORKTREE_PATH=$(git rev-parse --show-toplevel)
CURRENT_BRANCH=$(git branch --show-current)
```

**基线分支**：通常来自任务描述或 `<功能分支>` 的上游追踪信息。都推不出来时，明确问用户："这个分支是从 `<你的最佳猜测>` fork 出来的，对吗？" 合并到错误的基线代价很高，进入"选项 1"或"分支已在远程合入"前必须先确认。

**正常仓库 / 具名分支工作树**：问用户接下来怎么处理——本地合并回 `<基线分支>`、推送并创建 Pull Request、还是保持现状。可以附上推荐（例如"单人小步迭代通常选本地合并，需要同行评审选推送 PR"），但只是参考，必须等用户回复选哪个才能继续。

**detached HEAD（外部托管的工作区）**：没有本地分支可合并，只问"推送为新分支并创建 PR"还是"保持现状"。

#### 选项 1：本地合并

1. 按 [CLEANUP.md](CLEANUP.md) 第 1 节切到主仓库根目录，合并：
   ```bash
   git checkout <基线分支>
   git pull
   git merge <功能分支>
   ```
2. 有冲突自动调用 `resolving-merge-conflicts` skill；无法确认时保留现场，交给用户决策。
3. 在基线分支重新跑全量测试。**失败立即停止**，保留现场调查。
4. 通过后，按 [CLEANUP.md](CLEANUP.md) 清理工作树并删除已合并分支：
   ```bash
   git branch -d <功能分支>
   ```
5. 向用户汇报结果。

#### 选项 2：推送并创建 PR

1. 推送功能分支：
   ```bash
   git push -u origin <功能分支>
   # detached HEAD 需要显式命名新分支：
   # git push origin HEAD:refs/heads/<新分支名>
   ```
2. 调用 `/pr` skill 撰写结构化 PR 描述。
3. **保留当前工作树与本地分支**，后续评审反馈还要在这里改。把 PR 链接报告给用户。

#### 选项 3：保持现状

告知用户："保留分支 `<名称>`，工作树保留在 `<路径>`。" 不做任何合并、推送或清理动作。

#### 分支已在远程合入：收口

远程 PR 已合入主干，或本地分支已通过远程审核，只是最后收尾——不需要走上面的菜单：

1. 按 [CLEANUP.md](CLEANUP.md) 第 1 节切到主仓库根目录，拉取最新主干：
   ```bash
   git checkout <基线分支>
   git pull origin <基线分支>
   ```
2. 按 [CLEANUP.md](CLEANUP.md) 清理已合入的本地旧分支与关联工作树。
3. 向用户汇报结果。

### 3. 丢弃工作

只有用户明确要求丢弃时才进入。先展示影响并等待确认：

```text
这将永久删除：
- 分支 <名称>
- 全部提交：<提交列表>
- 工作树 <路径>

输入 discard 确认。
```

收到确切的 `discard` 后，按 [CLEANUP.md](CLEANUP.md) 强制清理。
