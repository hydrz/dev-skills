# 用户调用 vs 模型调用

每个 `SKILL.md` 都是 skill，唯一的分界轴是**调用方式**：谁能触发它。

| | 用户调用 | 模型调用 |
|---|---|---|
| 谁能触发 | 只有人类键入名字 | 模型自主触发，人类也可键入 |
| frontmatter | `disable-model-invocation: true` | 省略该字段 |
| description | 给人看的一句话摘要，不写触发词 | 面向模型，写清触发分支，中英文触发词都给 |
| 职责 | 编排 | 可复用的纪律 |
| 代价 | 认知负载：人要记得它存在 | 上下文负载：description 常驻上下文 |

判断是否该做成模型调用：**模型能否有用地自主伸手去用它？** 复用是抽出 skill 的理由，不是这个判断的依据。

## 依赖

- 用户调用 skill 可以调用模型调用 skill，写成"调用 Skill 工具，参数为 `tdd`"。一次调用一个 skill，要两个就写"调用 Skill 工具两次，分别为 `grilling` 和 `domain-modeling`"。
- 用户调用 skill 不能被任何 skill 触发。前置条件是用户调用 skill 时，写成给人的指示："告诉用户运行 `/setup-dev-skills`"。
- 共享参考资料放在拥有它的 skill 里，其他 skill 通过调用那个 skill 获得，不跨目录链接文件。
- 路由（`guide`）和 README 里的 `/名字` 只是给人看的标签，不是调用。

## 被动与主动的领域工作

只是*读* `CONTEXT.md` 获取词汇，写一行指针即可，不必调用 `domain-modeling`。只有主动构建和打磨领域模型（质疑术语、造边界场景、写 ADR、就地更新 `CONTEXT.md`）才是 `domain-modeling`。

## 硬依赖与软依赖

- **硬依赖**（`to-spec`、`to-tickets`、`triage`、`wayfinder`、`implement-spec`）：没有 issue 追踪器配置，产出就是错的。写一句"issue 追踪器配置应已提供给你；若没有，告诉用户运行 `/setup-dev-skills`"。
- **软依赖**（`tdd`、`diagnosing-bugs`、`improve-codebase-architecture` 等）：只用配置让产出更准。用模糊措辞提及"项目的术语表"和"相关区域的 ADR"，文件不存在就照常工作。
