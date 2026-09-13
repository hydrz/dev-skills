# Issue 追踪器：本地 Markdown

本仓库的 issue 和规格以 Markdown 文件形式存放在 `.scratch/` 下。

## 约定

- 每个功能一个目录：`.scratch/<功能-slug>/`
- 规格文件为 `.scratch/<功能-slug>/spec.md`
- 每项开发任务一个文件：`.scratch/<功能-slug>/issues/<NN>-<slug>.md`，从 `01` 开始编号，不合并成一个文件
- 分诊状态记录在每个 issue 文件顶部附近的 `Status:` 行（角色字符串见 `triage-labels.md`）
- 前置依赖记录在顶部附近的 `Blocked by: NN, NN` 行；所列文件都完成后解除阻塞
- 评论和讨论记录追加到文件底部的 `## 评论` 标题下

## 当 skill 说“发布到 issue 追踪器”时

在 `.scratch/<功能-slug>/` 下新建文件（目录不存在时先创建）。

## 当 skill 说“拉取相关任务”时

读取引用路径处的文件。用户通常会直接给出路径或编号。

## 寻路操作

供 `/wayfinder` 使用。**地图**是一个文件，每个决策项一个文件。

- **地图**：`.scratch/<工作-slug>/map.md`（包含目标、备注、已做决策、尚未明确、不在范围内）。
- **决策项**：`.scratch/<工作-slug>/issues/NN-<slug>.md`，从 `01` 编号，正文是问题。`Type:` 行记录决策项类型（`research`、`prototype`、`grilling`、`task`）；`Status:` 行记录 `claimed` 或 `resolved`。
- **依赖**：顶部附近一行 `Blocked by: NN, NN`。所列文件都是 `resolved` 时解除阻塞。
- **查询可领取决策项**：扫描 `.scratch/<工作-slug>/issues/`，找出未解决、未阻塞、未认领的文件；选编号最小的。
- **认领**：设置 `Status: claimed` 并保存，然后再开始工作。
- **解决**：把答案追加到 `## 答案` 标题下，设置 `Status: resolved`，再在 `map.md` 的“已做决策”中追加一个上下文指针（要点和链接）。
