# Issue 追踪器：GitLab

本仓库的 issue 和规格以 GitLab issue 的形式存放。所有操作使用 [`glab`](https://gitlab.com/gitlab-org/cli) CLI。

## 约定

- **创建 issue**：`glab issue create --title "..." --description "..."`。多行描述用 heredoc。
- **读取 issue**：`glab issue view <编号> --comments`。机器可读输出用 `-F json`。
- **列出 issue**：`glab issue list -F json`，按需加 `--label` 过滤。
- **评论**：`glab issue note <编号> --message "..."`。GitLab 把评论叫 note。
- **添加 / 移除标签**：`glab issue update <编号> --label "..."` / `--unlabel "..."`。多个标签用逗号分隔或重复该参数。
- **关闭**：`glab issue close <编号>`。它不接受关闭评论，所以先用 `glab issue note <编号> --message "..."` 发说明，再关闭。
- **Merge request**：GitLab 把 PR 叫 merge request。用 `glab mr create`、`glab mr view`、`glab mr note` 等，形状和 `gh pr ...` 一样，`pr` 换成 `mr`，`comment` / `--body` 换成 `note` / `--message`。

仓库从 `git remote -v` 推断；在克隆目录里运行时 `glab` 会自动推断。

## 阻塞关系

- **添加阻塞边**：GitLab 原生阻塞链接，用 `/blocked_by #<n>` 快捷操作，以 note 形式发送：`glab issue note <被阻塞> --message "/blocked_by #<阻塞者>"`。原生阻塞链接是 Premium / Ultimate 功能。
- **查询**：`glab api projects/:id/issues/:iid/links`。
- **回退**：免费版或不可用时，在描述顶部写一行 `Blocked by: #<n>, #<n>`。所有阻塞者都关闭后，issue 解除阻塞。

## Merge request 作为分诊入口

**MR 作为需求入口：否。** _（本仓库把外部 MR 当作功能请求时设为 `是`；`/triage` 读取这个开关。）_

设为 `是` 时，MR 走和 issue 相同的标签与状态，使用 `glab mr` 对应命令：

- **读取 MR**：`glab mr view <编号> --comments`，diff 用 `glab mr diff <编号>`。
- **列出待分诊的外部 MR**：`glab mr list -F json`，只保留作者不是项目成员 / 所有者的 MR（贡献者的 MR，而不是维护者进行中的工作）。
- **评论 / 标签 / 关闭**：`glab mr note`、`glab mr update --label` / `--unlabel`、`glab mr close`。

与 GitHub 不同，GitLab 的 issue 和 MR 分开编号，知道维护者指的是哪一种之后，`#42` 就没有歧义。

## 当 skill 说"发布到 issue 追踪器"时

创建一个 GitLab issue。

## 当 skill 说"拉取相关工单"时

运行 `glab issue view <编号> --comments`。

## 寻路操作

供 `/wayfinder` 使用。**地图**是一个 issue，**子** issue 是工单。

- **地图**：一个带 `wayfinder:map` 标签的 issue，正文包含目的地 / 备注 / 已做决策 / 迷雾。`glab issue create --label wayfinder:map`。（有原生 epic 的 GitLab 版本也可以用 epic 承载地图；带标签的 issue 在所有版本都能用。）
- **子工单**：描述顶部写 `Part of #<地图>` 的 issue，标签 `wayfinder:<类型>`（`research` / `prototype` / `grilling` / `task`）。认领后指派给推进地图的开发者。
- **阻塞**：见上文"阻塞关系"。
- **前沿查询**：`glab issue list -F json` 限定到地图的子 issue，去掉仍有打开阻塞者的、以及已有指派人的；按地图顺序第一个胜出。
- **认领**：`glab issue update <n> --assignee @me`，这是会话里的第一次写操作。
- **解决**：`glab issue note <n> --message "<答案>"`，然后 `glab issue close <n>`，再往地图的"已做决策"里追加一个上下文指针（要点 + 链接）。
