# skill 的触发方式

每个 `SKILL.md` 都定义一个 skill。两类 skill 的区别是**谁可以触发**，不是谁负责执行。

| | 仅用户触发 | 可自动触发 |
|---|---|---|
| 谁能触发 | 只有用户显式输入名称 | agent 可按场景主动触发，用户也可以显式触发 |
| frontmatter | 包含 `disable-model-invocation: true` | 省略该字段 |
| description | 面向用户说明用途和结果 | 面向 agent 写清中英文触发条件 |
| 主要职责 | 编排完整流程 | 提供可复用的方法或约束 |
| 主要成本 | 用户需要知道入口存在 | description 会占用模型上下文 |

判断一个 skill 是否应该允许自动触发时，问：**agent 能否仅根据当前场景，可靠判断何时调用它？** 能否复用不是触发方式的判断标准。

## 依赖关系

- 仅用户触发的 skill 可以调用可自动触发的 skill。例如：“调用 `Skill` 工具，参数为 `tdd`。”
- 需要两个 skill 时分别调用，例如：“分别调用 `grilling` 和 `domain-modeling`。”
- 可自动触发的 skill 不应触发仅用户触发的 skill。如果后续流程需要用户运行某个入口，应直接告诉用户，例如：“请运行 `/setup-dev-skills`。”
- 共享参考资料放在负责该知识的 skill 中，其他 skill 通过调用它获得，不跨目录链接内部文件。
- 路由 `guide` 和 README 中的 `/名称` 是面向用户的入口标签，不代表 skill 之间存在自动调用。

## 读取术语与维护领域模型

读取 `CONTEXT.md` 获取项目词汇时，写一条上下文指针即可，不需要调用 `domain-modeling`。

只有在主动构建或修改领域模型时才使用 `domain-modeling`，例如质疑术语、构造边界场景、更新 `CONTEXT.md` 或记录 ADR。

## 必需配置与可选配置

- **必需配置**：`to-spec`、`to-tickets`、`triage`、`wayfinder` 和 `implement-spec` 需要 issue 追踪器配置。缺少配置时，告诉用户运行 `/setup-dev-skills`。
- **可选配置**：`tdd`、`diagnosing-bugs`、`improve-codebase-architecture` 等 skill 可以利用项目术语表和相关 ADR 提高准确性；这些文件不存在时仍可继续工作。
