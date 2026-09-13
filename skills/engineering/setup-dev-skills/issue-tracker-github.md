# Issue 追踪器：GitHub

本仓库的 issue 和规格以 GitHub issue 的形式存放。所有操作使用 `gh` CLI。

## 约定

- **创建 issue**：`gh issue create --title "..." --body "..."`。多行正文使用 heredoc。
- **读取 issue**：`gh issue view <编号> --comments`，需要时用 `--json` 配合 `jq` 过滤评论并获取标签。
- **列出 issue**：`gh issue list --state open --json number,title,body,labels,comments --jq '[.[] | {number, title, body, labels: [.labels[].name], comments: [.comments[].body]}]'`，按需加 `--label` 和 `--state` 过滤。
- **评论**：`gh issue comment <编号> --body "..."`
- **添加、移除标签**：`gh issue edit <编号> --add-label "..."`，或 `--remove-label "..."`
- **关闭**：`gh issue close <编号> --comment "..."`

仓库从 `git remote -v` 推断；在克隆目录中运行时，`gh` 会自动推断。

## 依赖关系

- **添加前置依赖**：使用 GitHub 原生的 issue 依赖功能：`gh api --method POST repos/<owner>/<repo>/issues/<被阻塞的编号>/dependencies/blocked_by -F issue_id=<前置 issue 的数据库 id>`。数据库 id 用 `gh api repos/<owner>/<repo>/issues/<编号> --jq .id` 获取（不是 `#编号`，也不是 `node_id`）。
- **查询**：`gh api repos/<owner>/<repo>/issues/<编号> --jq .issue_dependencies_summary.blocked_by` 返回仍未关闭的前置 issue 数量。
- **回退方案**：依赖功能不可用时，在正文顶部写一行 `Blocked by: #<n>, #<n>`。所有前置 issue 都关闭后，该 issue 解除阻塞。

## Pull request 作为分诊入口

**PR 作为需求入口：否。** _（本仓库把外部 PR 当作功能请求时设为 `是`；`/triage` 会读取这个开关。）_

设为 `是` 时，PR 使用与 issue 相同的标签和状态，并使用对应的 `gh pr` 命令：

- **读取 PR**：`gh pr view <编号> --comments`，diff 用 `gh pr diff <编号>` 获取。
- **列出待分诊的外部 PR**：`gh pr list --state open --json number,title,body,labels,author,authorAssociation,comments`，只保留 `authorAssociation` 为 `CONTRIBUTOR`、`FIRST_TIME_CONTRIBUTOR` 或 `NONE` 的 PR（排除 `OWNER`、`MEMBER`、`COLLABORATOR`）。
- **评论、标签、关闭**：`gh pr comment`、`gh pr edit --add-label` 或 `--remove-label`、`gh pr close`。

GitHub 的 issue 和 PR 共用一套编号，裸编号 `#42` 可能是其中任意一种：先运行 `gh pr view 42`，失败再运行 `gh issue view 42`。

## 当 skill 说“发布到 issue 追踪器”时

创建一个 GitHub issue。

## 当 skill 说“拉取相关任务”时

运行 `gh issue view <编号> --comments`。

## 寻路操作

供 `/wayfinder` 使用。**地图**是一个汇总 issue，它的子 issue 是决策项。

- **地图**：带 `wayfinder:map` 标签的 issue，正文包含目标、备注、已做决策、尚未明确、不在范围内。创建命令：`gh issue create --label wayfinder:map`。
- **决策项**：以 GitHub sub-issue 关联到地图的 issue（通过 sub-issues 接口 `gh api` 关联）。未启用 sub-issues 时，把决策项加到地图正文的任务列表中，并在决策项正文顶部写 `Part of #<地图>`。标签：`wayfinder:<类型>`（`research`、`prototype`、`grilling`、`task`）。认领后指派给推进地图的开发者。
- **依赖**：见上文“依赖关系”。
- **查询可领取决策项**：列出地图下未关闭的子 issue，排除仍有未关闭前置 issue 的，以及已有指派人的；按地图顺序选第一个。
- **认领**：`gh issue edit <n> --add-assignee @me`，这是会话中的第一个写操作。
- **解决**：`gh issue comment <n> --body "<答案>"`，然后 `gh issue close <n>`，再在地图的“已做决策”中追加一个上下文指针（要点和链接）。
