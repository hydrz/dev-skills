---
name: setup-dev-skills
description: 首次在仓库中使用工程 skill 前，配置 issue 追踪器、分诊标签、领域文档布局和范围清单约定。每个仓库通常只需运行一次。
disable-model-invocation: true
---

# 初始化项目约定

为当前仓库建立工程类 skill 依赖的配置：

- **Issue 追踪器**：issue 存放在哪里（默认 GitHub；GitLab 和本地 Markdown 可直接使用）
- **分诊标签**：五个标准分诊角色对应的标签文字
- **领域文档**：`CONTEXT.md` 和 ADR 放在哪里，以及读取它们的规则
- **范围清单**：大型工作的范围清单和设计资料放在哪里，以及规格、任务如何引用它

这是由提示驱动的 skill，不是确定性脚本。先探索，再展示发现，与用户确认后写入。

## 过程

### 1. 探索

查看当前仓库，了解初始状态。以实际读取的内容为准，不做假设：

- `git remote -v` 和 `.git/config`：托管在 GitHub、GitLab、Gitee 还是其他平台？是哪个仓库？
- 根目录的 `AGENTS.md` 和 `CLAUDE.md`：是否存在？其中是否已有 `## Agent skills` 一节？
- 根目录的 `CONTEXT.md` 和 `CONTEXT-MAP.md`
- `docs/adr/`，以及所有 `src/*/docs/adr/` 目录
- `docs/agents/`：本 skill 之前的产出是否已经存在？
- `docs/scope/`：是否已有范围清单？
- `.scratch/`：存在时，说明已经在使用本地 Markdown issue 约定
- 是否安装了 `triage` skill？（本目录旁有 `triage` 目录，或可用 skill 列表中有 `triage`。）这决定是否执行第 B 节。
- monorepo 信号：`pnpm-workspace.yaml`、`package.json` 中的 `workspaces` 字段，或带有独立 `src/` 的 `packages/*`。这些信号只出现在真正的大型多包仓库中；没有这些信号就按单上下文处理，绝大多数仓库都是这种情况。

### 2. 展示发现并提问

总结已有什么、缺少什么。然后按顺序逐节处理：一节得到回答后，再进入下一节。

每节先给出推荐答案，让用户一个词就能接受。只在选项确实存在分歧时加一句说明。探索已经确定答案的节整节跳过：未安装 `triage` 时跳过第 B 节，不是 monorepo 时跳过第 C 节。

**第 A 节：Issue 追踪器。**

> 说明：“Issue 追踪器”是本仓库存放 issue 的地方。`to-tickets`、`triage`、`to-spec`、`implement-spec` 等 skill 会读写它。它们需要知道应该调用 `gh issue create`、在 `.scratch/` 下写 Markdown 文件，还是按你描述的其他流程操作。请选择你实际管理这个仓库工作的地方。

默认推荐：`git remote` 指向 GitHub 时推荐 GitHub；指向 GitLab（`gitlab.com` 或自托管实例）时推荐 GitLab。其他情况，或用户另有偏好时，提供以下选项：

- **GitHub**：issue 存放在仓库的 GitHub Issues 中（使用 `gh` CLI）
- **GitLab**：issue 存放在仓库的 GitLab Issues 中（使用 [`glab`](https://gitlab.com/gitlab-org/cli) CLI）
- **本地 Markdown**：issue 以文件形式存放在仓库的 `.scratch/<功能>/` 下（适合个人项目或没有远程仓库的项目）
- **其他**（Gitee、Jira、Linear、飞书项目、禅道等）：请用户用一段话描述流程，本 skill 将其记录为自由文本

把选择写入 `docs/agents/issue-tracker.md`。GitHub 和 GitLab 模板带有“PR 作为需求入口”开关，默认**关闭**。保持关闭，也无需主动提及：希望外部 PR 进入分诊队列的用户，以后可以自己在文件中打开。

**第 B 节：分诊标签。** 探索时发现未安装 `triage` skill，就跳过整节：未安装的 skill 不需要标签。

已安装时，只问一个问题：

> 保留默认分诊标签吗？（推荐：**是**）

默认使用五个标准角色，标签文字与角色名相同：`needs-triage`、`needs-info`、`ready-for-agent`、`ready-for-human`、`wontfix`。用户回答**是**时，原样写入。只有用户回答否时（通常是追踪器中已经在使用其他名称，例如用 `bug:triage` 表示 `needs-triage`），才收集自定义映射，让 `triage` 使用已有标签，而不是新建重复标签。

**第 C 节：领域文档。** 默认使用**单上下文**布局（根目录一个 `CONTEXT.md`，加上 `docs/adr/`）。它适用于绝大多数仓库，直接写入，无需询问。

只有探索发现 monorepo 信号时，才提供**多上下文**布局（根目录的 `CONTEXT-MAP.md` 指向各上下文的 `CONTEXT.md`），并确认用户想要哪种布局。

**第 D 节：范围清单。** 默认把范围清单放在 `docs/scope/<工作-slug>.md`，设计资料放在 `docs/scope/design/<工作-slug>/`，直接写入，无需询问。多上下文布局下，清单放在对应上下文的 `docs/scope/` 中。只有探索发现仓库已有其他存放需求或设计资料的目录（例如 `docs/product/`）时，才确认用户想沿用哪个位置，并在写入的文档中改成对应路径。

### 3. 确认并编辑

向用户展示以下内容的草稿：

- 要加入 `CLAUDE.md` 或 `AGENTS.md`（二选一，规则见第 4 步）的 `## Agent skills` 块
- `docs/agents/issue-tracker.md`、`docs/agents/domain.md`、`docs/agents/scope-inventory.md` 和 `docs/agents/triage-labels.md` 的内容（最后一个仅在安装了 `triage` 时写入）

写入前允许用户修改。

### 4. 写入

**选择要编辑的文件：**

- `CLAUDE.md` 存在时，编辑它。
- 否则，`AGENTS.md` 存在时，编辑它。
- 两者都不存在时，询问用户要创建哪个。

已有其中一个文件时，编辑已有的文件，不新建另一个。

选中的文件中已有 `## Agent skills` 块时，就地更新块内容，不追加重复块。其他小节中用户编辑的内容保持原样。

块的内容：

```markdown
## Agent skills

### Issue 追踪器

[一句话说明 issue 在哪里管理]。见 `docs/agents/issue-tracker.md`。

### 分诊标签

[一句话说明使用的标签]。见 `docs/agents/triage-labels.md`。

### 领域文档

[一句话说明布局：“单上下文”或“多上下文”]。见 `docs/agents/domain.md`。

### 范围清单

[一句话说明范围清单和设计资料的位置]。见 `docs/agents/scope-inventory.md`。
```

只有安装了 `triage` 且执行了第 B 节时，才包含 `### 分诊标签` 子块，并写入 `docs/agents/triage-labels.md`。未安装时两者都省略。

然后以本 skill 目录中的模板为起点写入文档文件：

- [issue-tracker-github.md](./issue-tracker-github.md)：GitHub issue 追踪器
- [issue-tracker-gitlab.md](./issue-tracker-gitlab.md)：GitLab issue 追踪器
- [issue-tracker-local.md](./issue-tracker-local.md)：本地 Markdown issue 追踪器
- [triage-labels.md](./triage-labels.md)：标签映射（仅在安装了 `triage` 时）
- [domain.md](./domain.md)：领域文档的读取规则和布局
- [scope-inventory.md](./scope-inventory.md)：范围清单的位置、格式和修改规则

选择“其他”类追踪器时，根据用户的描述从头编写 `docs/agents/issue-tracker.md`，至少覆盖：创建 issue、读取 issue、列出 issue、评论、添加标签、关闭、表达依赖关系；并包含“当 skill 说‘发布到 issue 追踪器’时”和“当 skill 说‘拉取相关任务’时”两节。

### 5. 完成

告诉用户配置已完成，以及哪些工程 skill 现在会读取这些文件。说明以后可以直接编辑 `docs/agents/*.md`；只有想切换 issue 追踪器或重新配置时，才需要再次运行本 skill。
