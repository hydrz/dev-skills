# 插件评测

用 Claude Code 或 Codex 检验 dev-skills 在真实请求下是否被正确触发，以及触发后是否改变了 agent 的做法。两种宿主共用 `evals/<case>/prompt.md` 和 grader 语义；Claude 使用原生 plugin eval，Codex 通过本仓库的 adapter 运行。

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

### Claude Code

前提：Claude Code v2.1.269 或更高版本，已登录。在仓库根目录运行：

```bash
# 完整评测（自动注入 Write/Edit 权限并检查环境）
npm run eval:claude

# 快速单次迭代（单次运行、关闭基线、不发布报告，节省时间和成本）
npm run eval:claude:quick

# 过滤指定用例或标签
npm run eval:claude -- --case tdd-*
npm run eval:claude -- --tag trigger
```

也可直接使用 Claude Code 原生命令：

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
| `--model <model>` | 指定受测模型（脚本默认使用性价比最高的 `haiku`） |
| `--judge-model <model>` | 判定模型（默认 `haiku`；可用 `sonnet` 增强判定准确度） |
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

## 在 Codex 中运行

Codex 当前没有直接读取这套 Markdown case/grader 的 `codex eval` 命令。本仓库的 runner 会：

1. 为每次运行创建独立临时 Git 仓库。
2. 在 WITH 组中把受测 skill 复制到 `.agents/skills/<skill>/`；WITHOUT 组不复制。
3. 通过 `codex exec --ephemeral --json` 捕获 JSONL trace、最终回复和工作区 diff。
4. 在本地执行 regex/file/tool-order 检查；LLM grader 用第二次只读 `codex exec --output-schema` 判定。

先查看会运行哪些 case，不调用模型：

```bash
node evals/codex/run.mjs --dry-run
```

运行单个 case：

```bash
node evals/codex/run.mjs --case grill-me-question-format
```

运行某个 skill 的全部 case，并做 WITH/WITHOUT 对照：

```bash
node evals/codex/run.mjs --tag tdd --arm both --runs 3
```

迭代确定性 grader 时，可以跳过额外的 LLM 评分调用：

```bash
node evals/codex/run.mjs --case domain-modeling-context-format --skip-llm-graders
```

常用参数：

| 参数 | 作用 |
|---|---|
| `--case <glob>` | 只运行名称匹配的 case |
| `--tag <tag>` | 按 tag 过滤 |
| `--runs <n>` | 每个 case/arm 的重复次数，默认 1 |
| `--arm with\|without\|both` | 选择加载 skill、基线或两者，默认 `with` |
| `--model <model>` | 固定受测与评分使用的 Codex 模型（默认使用最便宜的 `gpt-4o-mini`） |
| `--reasoning <effort>` | 固定 reasoning effort |
| `--skip-llm-graders` | 跳过 rubric 模型调用 |
| `--dry-run` | 只检查用例发现和 grader 兼容性 |

结果写入 `evals/results/codex-<时间戳>/`。每次运行保存 prompt、实际命令、JSONL trace、stderr、工作区 diff/status 和 grader 结果；汇总文件还会在同时运行两组时计算 WITH、WITHOUT 与 Δ。

### Codex 兼容边界

- `regex` grader 会检查最终消息，或按 `target.source: file` 检查工作区文件。
- `llm` grader 的 rubric 正文直接复用，但通过结构化 JSON 输出判分。
- `tool_order` 会把 Claude `Write` matcher 映射到 Codex `file_change` 事件。同一个 patch 同时修改前后两个目标时，结果是 `inconclusive`，不会误报通过。
- `tool_used: Skill` 没有公开的 Codex JSONL 等价事件，因此标为 `unsupported`、不计分。它不会被当作通过。
- `max_turns` 和逐工具 `allowed_tools` 没有一对一等价项；runner 分别使用进程超时和 `read-only`/`workspace-write` sandbox。

详细依据和后续阶段见 [`docs/codex-eval-compatibility.md`](../docs/codex-eval-compatibility.md)。
