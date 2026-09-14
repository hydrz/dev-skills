# 插件评测

用 [`claude plugin eval`](https://code.claude.com/docs/en/plugin-evals) 检验 dev-skills 在真实请求下是否被正确触发，以及触发后是否改变了 agent 的做法。

## 设计原则

- **用户真实会输入的请求。** prompt 不点名 skill，不规定答案格式，按用户平时的说法写。
- **每个 case 两类 grader。** 一个检查结果（最终回复或写出的文件），计入得分；一个检查过程（`tool_used: Skill`），在对比基线时只作为“skill 是否触发”的指示，不计分。
- **包含反例。** 近似但不该触发的请求，用 `min: 0`、`max: 0` 和 `arm: both` 断言 skill 没有被调用。
- **优先使用确定性 grader。** 能用 `regex`、`tool_order` 判断的不用 `llm`；`llm` grader 只用于短回复，并写成具体的 PASS 和 FAIL 条件。
- **不授予 Bash。** 原生 Windows 没有沙箱后端，授予 Bash 的运行会被拒绝。需要执行命令才能检验的约束（例如真的运行测试）暂不覆盖。

## 覆盖范围

| case | skill | 类型 | 计分 grader | 检验内容 |
|---|---|---|---|---|
| `tdd-new-function` | `tdd` | 触发、行为 | `tool_order` | 测试文件先于实现文件写入 |
| `tdd-concept-question` | `tdd` | 反例 | `tool_used`（不得触发）、`llm` | 概念问题直接回答，不进入 TDD 流程 |
| `verify-before-claiming-pass` | `verifying-completion` | 触发、行为 | `llm` | 改动后未重跑测试时，不声称测试全部通过 |
| `verify-subagent-report` | `verifying-completion` | 触发、行为 | `llm` | 不把子代理报告当作已核实结论转述给客户 |
| `finish-branch-offers-options` | `finishing-a-branch` | 触发、行为 | `llm` | 集成方式交给用户选择，或先要求重跑测试，不擅自合并、推送或删除 |
| `discard-branch-needs-confirmation` | `finishing-a-branch` | 触发、行为 | `regex` | 删除分支前要求输入 `discard` 确认 |
| `diagnose-intermittent-error` | `diagnosing-bugs` | 触发、行为 | `llm` | 偶发 bug 先提出复现手段，不凭读代码宣布修好 |
| `nitpick-code-is-not-grilling` | `grilling` | 反例 | `tool_used`（不得触发）、`regex` | “挑刺”代码是评审请求，不触发方案追问 |
| `grill-me-question-format` | `grilling` | 触发、行为、格式 | `regex` | 用编号问题（`❓ **Qn ·`）加推荐答案（`➡️`）逐轮追问，而不是直接给方案 |
| `domain-modeling-context-format` | `domain-modeling` | 触发、行为、格式 | `regex` | 按 `CONTEXT.md` 的 `**词**`/`_避免_` 格式写入术语条目 |

不在范围内：`implement-spec` 等仅用户触发、依赖子代理、git 和命令执行的编排流程。这类 skill 无法在不加载插件的基线中调用，也需要 Bash 才能真实运行。

`grill-me-question-format` 和 `domain-modeling-context-format` 检验的是本仓库特有的格式约定，基线模型不太可能自发采用，是最能体现 `Δ` 的两个 case；其余大多数 case 检验的行为（先测试、不轻信未核实的结论、把决定权交给用户）本身也是 Sonnet 5 的默认倾向，`Δ` 经常接近 0——这说明触发有效，但不代表插件改变了结果，参考下方“读结果”表。

## 运行

前提：Claude Code v2.1.269 或更高版本，已登录。在仓库根目录运行：

```bash
claude plugin eval . --allow-tools Write Edit
```

`tdd-new-function` 需要写文件，所以要授予 `Write` 和 `Edit`；写入限制在每次运行的临时工作区内。首次运行会询问是否信任该目录，非终端环境中加 `--trust-plugin`。

每个 case 默认运行 3 次，并额外运行 3 次不加载插件的基线。常用参数：

| 参数 | 作用 |
|---|---|
| `--case <glob>` | 只运行名称匹配的 case |
| `--tag <tag>` | 按标签过滤：skill 名称、`trigger`、`behavior`、`negative` |
| `--runs <n>` | 覆盖运行次数，迭代时可用 `--runs 1` |
| `--ablation none` | 只运行加载插件的一组，费用减半 |
| `-j <n>` | 并发运行数，1 到 8 |
| `--judge-model sonnet` | 用更强的模型判定 `llm` grader |
| `--max-cost-usd <金额>` | 费用上限 |
| `--no-publish` | 报告只保存在本地 |

## 读结果

汇总表的 `WITH`、`W/OUT` 和 `Δ` 分别是加载插件的得分、不加载插件的得分和两者之差。

| 现象 | 含义 | 下一步 |
|---|---|---|
| `skill-fired` 失败，`Δ` 接近 0 | skill 没有被触发，插件没有参与 | 调整该 skill 的 description，让它覆盖这种说法 |
| `skill-fired` 通过，`WITH` 仍低于 1 | skill 触发了，但正文没有挡住这种做法 | 查看报告中的回复，按 [TESTING.md](../skills/productivity/writing-for-agents/TESTING.md) 补上漏洞 |
| `WITH` 和 `W/OUT` 都是 1 | 不加载插件也能做对 | 这个 case 证明不了插件的作用，考虑换成更容易出错的请求 |
| 反例 case 失败 | skill 在不该触发的请求上被触发 | 收窄 description 的触发范围 |
| `llm` grader 结论可疑 | 小模型判定不稳定 | 用 `--judge-model sonnet` 重跑，并把评分标准写得更具体 |

完整结果写入 `evals/results/<时间戳>/`，其中 `report.html` 包含每次运行每个 grader 的判定。该目录不提交。

## 添加 case

在 `evals/<case 名称>/` 下新建 `prompt.md` 和 `graders/`。case 名称在整个套件内唯一，用短横线连接的英文描述。

```markdown
---
description: <这个 case 检验什么>
expected_outcome: <期望结果>
tags: [<skill>, trigger, behavior]
max_turns: 8
allowed_tools: [Skill]
---

<用户会输入的请求，不点名 skill>
```

触发指示 grader，把 `<skill>` 换成 skill 名称：

```markdown
---
type: tool_used
tool: Skill
input_match: '"skill"\s*:\s*"(?:[\w-]+:)?<skill>"'
---
```

反例在同样的 grader 上加 `min: 0`、`max: 0` 和 `arm: both`。结果 grader 的写法见[官方文档的 grader 类型](https://code.claude.com/docs/en/plugin-evals#grader-types)。

## 修改 skill 之后

改写 skill 的 description 或正文后，运行对应标签：

```bash
claude plugin eval . --tag <skill> --allow-tools Write Edit
```
