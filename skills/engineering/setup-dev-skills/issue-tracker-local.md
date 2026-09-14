# Issue 追踪器：本地 Markdown

本仓库的 issue 和规格以 Markdown 文件形式存放在 `.scratch/` 下。每个文件对应一个 issue，用文件顶部的字段行表达 GitHub issue 中的标签、状态、指派和依赖。

## 目录

- 功能相关的规格和开发任务：`.scratch/<功能-slug>/`
  - 规格：`.scratch/<功能-slug>/spec.md`
  - 开发任务：`.scratch/<功能-slug>/issues/<NN>-<slug>.md`，从 `01` 开始编号，每项任务一个文件，不合并
- `/wayfinder` 的地图和决策项：`.scratch/wayfinder/<工作-slug>/`（见下文“寻路操作”）

## 字段行

每个 issue 文件（包括 `spec.md` 和 `map.md`）在标题下方写以下字段行。每个字段一行，字段名保持英文，便于搜索：

```markdown
# <NN>：<标题>

Labels: none
State: open
Assignee: none
Blocked by: none
```

| 字段 | 取值 | 对应 GitHub 概念 |
|---|---|---|
| `Labels` | 分诊角色（见 `triage-labels.md`）、类别（`bug`、`enhancement`）或 `wayfinder:*` 标签，逗号分隔；没有时写 `none` | 标签 |
| `State` | `open` 或 `closed` | 打开、关闭 |
| `Assignee` | 认领者名称；未认领时写 `none` | 指派人 |
| `Blocked by` | 同一目录下前置 issue 的编号，逗号分隔；没有时写 `none` | 依赖关系 |

字段行之后是正文。评论和讨论记录追加到文件末尾的 `## 评论` 标题下，每条评论以日期开头。

## 通用操作

- **创建 issue**：新建文件并写好字段行。目录不存在时先创建。
- **读取 issue**：读取整个文件，包括 `## 评论`。
- **列出 issue**：扫描对应目录下的 `*.md`，读取每个文件的标题和字段行，按字段过滤。
- **评论**：在 `## 评论` 下追加一条。
- **添加、移除标签**：修改 `Labels` 行。
- **关闭**：先在 `## 评论` 下追加说明，再把 `State` 改为 `closed`。
- **指派**：修改 `Assignee` 行。
- **判断是否解除阻塞**：`Blocked by` 中列出的每个文件都是 `State: closed` 时，该 issue 解除阻塞。

读取旧格式文件时：`Status:` 行中的分诊角色视为 `Labels` 的一项；wayfinder 旧文件中的 `Type:` 视为 `wayfinder:<类型>` 标签，`Status: claimed` 视为已指派，`Status: resolved` 视为 `State: closed`。下次修改该文件时，改写为上述字段。

## 当 skill 说“发布到 issue 追踪器”时

在 `.scratch/<功能-slug>/` 下新建文件并写好字段行（目录不存在时先创建）。

## 当 skill 说“拉取相关任务”时

读取引用路径处的文件。用户通常会直接给出路径或编号。

## 寻路操作

供 `/wayfinder` 使用。每张地图一个目录：`.scratch/wayfinder/<工作-slug>/`。它与功能目录分开，避免决策项和开发任务混在同一个 `issues/` 目录中。

- **地图**：`.scratch/wayfinder/<工作-slug>/map.md`，`Labels: wayfinder:map`，正文包含目标、备注、已做决策、尚未明确、不在范围内。
- **决策项**：`.scratch/wayfinder/<工作-slug>/issues/NN-<slug>.md`，从 `01` 编号，正文是问题。`Labels` 写 `wayfinder:<类型>`（`research`、`prototype`、`grilling`、`task` 之一）。
- **依赖**：`Blocked by` 行，编号指同一地图下的决策项。
- **查询可领取决策项**：扫描 `issues/`，找出 `State: open`、已解除阻塞且 `Assignee: none` 的文件；选编号最小的。
- **认领**：把 `Assignee` 改为推进地图的开发者并保存，这是会话中的第一个写操作。
- **解决**：在 `## 评论` 下追加答案，把 `State` 改为 `closed`，再在 `map.md` 的“已做决策”中追加一个上下文指针（要点和链接）。
- **判定不在范围内**：在 `## 评论` 下说明原因，把 `State` 改为 `closed`，并在 `map.md` 的“不在范围内”一节加一行。
