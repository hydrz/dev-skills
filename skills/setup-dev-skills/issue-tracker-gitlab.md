# Issue 追踪器：GitLab

本仓库的 issue 和规格以 GitLab issue 的形式存放。所有操作使用 [`glab`](https://gitlab.com/gitlab-org/cli) CLI。

## 约定

- **创建 issue**：`glab issue create --title "..." --description "..."`。多行描述使用 heredoc。
- **读取 issue**：`glab issue view <编号> --comments`。需要机器可读输出时加 `-F json`。
- **列出 issue**：`glab issue list -F json`，按需加 `--label` 过滤。
- **评论**：`glab issue note <编号> --message "..."`。GitLab 把评论称为 note。
- **添加、移除标签**：`glab issue update <编号> --label "..."`，或 `--unlabel "..."`。多个标签用逗号分隔，或重复该参数。
- **关闭**：`glab issue close <编号>`。该命令不接受关闭评论，所以先用 `glab issue note <编号> --message "..."` 发布说明，再关闭。
- **Merge request**：GitLab 把 PR 称为 merge request。使用 `glab mr create`、`glab mr view`、`glab mr note` 等命令，用法与 `gh pr ...` 相同：`pr` 换成 `mr`，`comment` 换成 `note`，`--body` 换成 `--message`。

仓库从 `git remote -v` 推断；在克隆目录中运行时，`glab` 会自动推断。

## 依赖关系

- **添加前置依赖**：使用 GitLab 原生的阻塞链接，通过 `/blocked_by #<n>` 快捷操作以 note 形式发送：`glab issue note <被阻塞的编号> --message "/blocked_by #<前置 issue 编号>"`。原生阻塞链接是 Premium 和 Ultimate 版本的功能。
- **查询**：`glab api projects/:id/issues/:iid/links`。
- **回退方案**：免费版或功能不可用时，在描述顶部写一行 `Blocked by: #<n>, #<n>`。所有前置 issue 都关闭后，该 issue 解除阻塞。

## Merge request 作为分诊入口

**MR 作为需求入口：否。** _（本仓库把外部 MR 当作功能请求时设为 `是`；`/triage` 会读取这个开关。）_

设为 `是` 时，MR 使用与 issue 相同的标签和状态，并使用对应的 `glab mr` 命令：

- **读取 MR**：`glab mr view <编号> --comments`，diff 用 `glab mr diff <编号>` 获取。
- **列出待分诊的外部 MR**：`glab mr list -F json`，只保留作者不是项目成员或所有者的 MR（即贡献者的 MR，而不是维护者正在进行的工作）。
- **评论、标签、关闭**：`glab mr note`、`glab mr update --label` 或 `--unlabel`、`glab mr close`。

与 GitHub 不同，GitLab 的 issue 和 MR 分开编号。知道维护者指的是哪一种之后，`#42` 就没有歧义。

## 当 skill 说“发布到 issue 追踪器”时

创建一个 GitLab issue。

## 当 skill 说“拉取相关任务”时

运行 `glab issue view <编号> --comments`。

## 寻路操作

供 `/wayfinder` 使用。**地图**是一个汇总 issue，它的子 issue 是决策项。

- **地图**：带 `wayfinder:map` 标签的 issue，正文包含目标、备注、已做决策、尚未明确、不在范围内。创建命令：`glab issue create --label wayfinder:map`。（支持原生 epic 的 GitLab 版本也可以用 epic 承载地图；带标签的 issue 在所有版本中都可用。）
- **决策项**：描述顶部写有 `Part of #<地图>` 的 issue，标签为 `wayfinder:<类型>`（`research`、`prototype`、`design`、`grilling`、`task`）。认领后指派给推进地图的开发者。
- **依赖**：见上文“依赖关系”。
- **查询可领取决策项**：用 `glab issue list -F json` 列出地图的子 issue，排除仍有未关闭前置 issue 的，以及已有指派人的；按地图顺序选第一个。
- **认领**：`glab issue update <n> --assignee @me`，这是会话中的第一个写操作。
- **解决**：`glab issue note <n> --message "<答案>"`，然后 `glab issue close <n>`，再在地图的“已做决策”中追加一个上下文指针（要点和链接）。
