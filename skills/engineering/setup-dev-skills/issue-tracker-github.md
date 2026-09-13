# Issue 追踪器：GitHub

本仓库的 issue 和规格以 GitHub issue 的形式存放。所有操作使用 `gh` CLI。

## 约定

- **创建 issue**：`gh issue create --title "..." --body "..."`。多行正文用 heredoc。
- **读取 issue**：`gh issue view <编号> --comments`，需要时用 `--json` 配合 `jq` 过滤评论并取标签。
- **列出 issue**：`gh issue list --state open --json number,title,body,labels,comments --jq '[.[] | {number, title, body, labels: [.labels[].name], comments: [.comments[].body]}]'`，按需加 `--label` 和 `--state` 过滤。
- **评论**：`gh issue comment <编号> --body "..."`
- **添加 / 移除标签**：`gh issue edit <编号> --add-label "..."` / `--remove-label "..."`
- **关闭**：`gh issue close <编号> --comment "..."`

仓库从 `git remote -v` 推断；在克隆目录里运行时 `gh` 会自动推断。

## 阻塞关系

- **添加阻塞边**：使用 GitHub 原生的 issue 依赖：`gh api --method POST repos/<owner>/<repo>/issues/<被阻塞>/dependencies/blocked_by -F issue_id=<阻塞者的数据库 id>`。数据库 id 用 `gh api repos/<owner>/<repo>/issues/<编号> --jq .id` 获取（不是 `#编号`，也不是 `node_id`）。
- **查询**：`gh api repos/<owner>/<repo>/issues/<编号> --jq .issue_dependencies_summary.blocked_by` 给出仍打开的阻塞者数量。
- **回退**：依赖功能不可用时，在正文顶部写一行 `Blocked by: #<n>, #<n>`。所有阻塞者都关闭后，issue 解除阻塞。

## Pull request 作为分诊入口

**PR 作为需求入口：否。** _（本仓库把外部 PR 当作功能请求时设为 `是`；`/triage` 读取这个开关。）_

设为 `是` 时，PR 走和 issue 相同的标签与状态，使用 `gh pr` 对应命令：

- **读取 PR**：`gh pr view <编号> --comments`，diff 用 `gh pr diff <编号>`。
- **列出待分诊的外部 PR**：`gh pr list --state open --json number,title,body,labels,author,authorAssociation,comments`，只保留 `authorAssociation` 为 `CONTRIBUTOR`、`FIRST_TIME_CONTRIBUTOR` 或 `NONE` 的（去掉 `OWNER` / `MEMBER` / `COLLABORATOR`）。
- **评论 / 标签 / 关闭**：`gh pr comment`、`gh pr edit --add-label` / `--remove-label`、`gh pr close`。

GitHub 的 issue 和 PR 共用一个编号空间，裸的 `#42` 可能是任意一种：先 `gh pr view 42`，失败再 `gh issue view 42`。

## 当 skill 说"发布到 issue 追踪器"时

创建一个 GitHub issue。

## 当 skill 说"拉取相关工单"时

运行 `gh issue view <编号> --comments`。

## 寻路操作

供 `/wayfinder` 使用。**地图**是一个 issue，**子** issue 是工单。

- **地图**：一个带 `wayfinder:map` 标签的 issue，正文包含目的地 / 备注 / 已做决策 / 迷雾。`gh issue create --label wayfinder:map`。
- **子工单**：以 GitHub sub-issue 关联到地图的 issue（通过 sub-issues 接口 `gh api`）。未启用 sub-issues 时，把子工单加到地图正文的任务列表里，并在子工单正文顶部写 `Part of #<地图>`。标签：`wayfinder:<类型>`（`research` / `prototype` / `grilling` / `task`）。认领后指派给推进地图的开发者。
- **阻塞**：见上文"阻塞关系"。
- **前沿查询**：列出地图下打开的子 issue，去掉仍有打开阻塞者的、以及已有指派人的；按地图顺序第一个胜出。
- **认领**：`gh issue edit <n> --add-assignee @me`，这是会话里的第一次写操作。
- **解决**：`gh issue comment <n> --body "<答案>"`，然后 `gh issue close <n>`，再往地图的"已做决策"里追加一个上下文指针（要点 + 链接）。
