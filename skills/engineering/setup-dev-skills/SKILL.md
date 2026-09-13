---
name: setup-dev-skills
description: 为本仓库配置工程类 skill：issue 追踪器、分诊标签词汇、领域文档布局。每个仓库在首次使用其他工程 skill 前运行一次。
disable-model-invocation: true
---

# 配置 dev-skills

搭建工程类 skill 所假设的每仓库配置：

- **Issue 追踪器**：issue 放在哪（默认 GitHub；GitLab 与本地 Markdown 开箱即用）
- **分诊标签**：五个规范分诊角色对应的标签字符串
- **领域文档**：`CONTEXT.md` 与 ADR 放在哪，以及读取它们的规则

这是由提示驱动的 skill，不是确定性脚本。探索，展示发现，与用户确认，然后写入。

## 过程

### 1. 探索

查看当前仓库，了解起始状态。读已有的东西，不要假设：

- `git remote -v` 和 `.git/config`：托管在 GitHub、GitLab、Gitee，还是别处？哪个仓库？
- 根目录的 `AGENTS.md` 和 `CLAUDE.md`：存在吗？其中是否已有 `## Agent skills` 一节？
- 根目录的 `CONTEXT.md` 和 `CONTEXT-MAP.md`
- `docs/adr/` 以及任何 `src/*/docs/adr/` 目录
- `docs/agents/`：本 skill 之前的产出是否已存在？
- `.scratch/`：说明已在使用本地 Markdown issue 约定
- `triage` skill 装了吗？（本目录旁有 `triage` 目录，或可用 skill 列表里有 `triage`。）这决定第 B 节是否运行。
- monorepo 信号：`pnpm-workspace.yaml`、`package.json` 里的 `workspaces` 字段、或有自己 `src/` 的 `packages/*`。这些只出现在真正的大型多包仓库里；没有它们就是单上下文，几乎所有仓库都是。

### 2. 展示发现并提问

总结有什么、缺什么。然后按顺序处理各节：一节一个回答，再下一节。

每节先给出推荐答案，让用户一个词就能接受。只在选择确实分叉时加一句说明；探索已经给出答案的节整个跳过（没装 `triage` 跳过第 B 节，不是 monorepo 跳过第 C 节）。

**第 A 节：Issue 追踪器。**

> 说明："Issue 追踪器"是本仓库 issue 存放的地方。`to-tickets`、`triage`、`to-spec`、`implement-spec` 等 skill 会读写它。它们需要知道是调用 `gh issue create`、在 `.scratch/` 下写 Markdown 文件，还是走你描述的其他流程。选你实际跟踪这个仓库工作的地方。

默认姿态：`git remote` 指向 GitHub 就推荐 GitHub；指向 GitLab（`gitlab.com` 或自托管）就推荐 GitLab。否则（或用户另有偏好）提供：

- **GitHub**：issue 在仓库的 GitHub Issues（用 `gh` CLI）
- **GitLab**：issue 在仓库的 GitLab Issues（用 [`glab`](https://gitlab.com/gitlab-org/cli) CLI）
- **本地 Markdown**：issue 以文件形式放在仓库的 `.scratch/<功能>/` 下（适合个人项目或没有远端的仓库）
- **其他**（Gitee、Jira、Linear、飞书项目、禅道等）：请用户用一段话描述流程，本 skill 把它记录成自由文本

把选择记到 `docs/agents/issue-tracker.md`。GitHub 和 GitLab 模板带一个"PR 作为需求入口"开关，默认**关**。保持关闭，也不必提起：想让外部 PR 进入分诊队列的用户以后可以在文件里自己打开。

**第 B 节：分诊标签词汇。** 没装 `triage` skill（探索已知）就整节跳过：没装的 skill 不需要标签。

装了的话，只问一个问题：

> 保留默认分诊标签吗？（推荐：**是**）

默认是五个规范角色，标签字符串就等于角色名：`needs-triage`、`needs-info`、`ready-for-agent`、`ready-for-human`、`wontfix`。答**是**就原样写入。只有用户答否（通常是追踪器里已经在用别的名字，比如用 `bug:triage` 表示 `needs-triage`），才收集覆盖项，让 `triage` 使用已有标签而不是新建重复的。

**第 C 节：领域文档。** 默认**单上下文**（根目录一个 `CONTEXT.md` + `docs/adr/`）。几乎所有仓库都适用，直接写，不必问。

只有探索发现了 monorepo 信号时，才提供**多上下文**（根目录 `CONTEXT-MAP.md` 指向各上下文的 `CONTEXT.md`），并确认用户想要哪种布局。

### 3. 确认并编辑

给用户看以下内容的草稿：

- 要加到 `CLAUDE.md` / `AGENTS.md`（二选一，规则见第 4 步）的 `## Agent skills` 块
- `docs/agents/issue-tracker.md`、`docs/agents/domain.md`、`docs/agents/triage-labels.md`（最后一个仅在装了 `triage` 时）的内容

让用户在写入前修改。

### 4. 写入

**选择要编辑的文件：**

- `CLAUDE.md` 存在就编辑它。
- 否则 `AGENTS.md` 存在就编辑它。
- 都不存在就问用户创建哪个，由用户选。

已有其中一个时，编辑已有的那个，另一个不新建。

选中的文件里已有 `## Agent skills` 块时，就地更新它的内容，不追加重复块。周围其他小节里用户的编辑保持原样。

块的内容：

```markdown
## Agent skills

### Issue 追踪器

[一句话说明 issue 在哪跟踪]。见 `docs/agents/issue-tracker.md`。

### 分诊标签

[一句话说明标签词汇]。见 `docs/agents/triage-labels.md`。

### 领域文档

[一句话说明布局："单上下文"或"多上下文"]。见 `docs/agents/domain.md`。
```

只有装了 `triage` 且第 B 节运行过时，才包含 `### 分诊标签` 子块并写入 `docs/agents/triage-labels.md`。没装时两者都省略。

然后以本 skill 目录里的种子模板为起点写入文档文件：

- [issue-tracker-github.md](./issue-tracker-github.md)：GitHub issue 追踪器
- [issue-tracker-gitlab.md](./issue-tracker-gitlab.md)：GitLab issue 追踪器
- [issue-tracker-local.md](./issue-tracker-local.md)：本地 Markdown issue 追踪器
- [triage-labels.md](./triage-labels.md)：标签映射（仅在装了 `triage` 时）
- [domain.md](./domain.md)：领域文档读取规则 + 布局

"其他"类追踪器，根据用户的描述从头写 `docs/agents/issue-tracker.md`，至少覆盖：创建 issue、读取 issue、列出 issue、评论、打标签、关闭、表达阻塞关系；也写上"当 skill 说'发布到 issue 追踪器'时"和"当 skill 说'拉取相关工单'时"两节。

### 5. 完成

告诉用户配置已完成，以及哪些工程 skill 现在会读取这些文件。说明以后可以直接编辑 `docs/agents/*.md`；只有想切换 issue 追踪器或从头再来时，才需要重新运行本 skill。
