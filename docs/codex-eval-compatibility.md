# Codex skill eval 兼容性调研

> 调研时间：2026-09-14。结论基于当日 OpenAI 官方文档，并用本机 `codex-cli 0.154.0-alpha.6.2` 的 `codex exec --help` 核对了关键参数。

## 结论

可以兼容 Codex 的 skill eval，但不能把现有 `claude plugin eval` 格式直接交给 Codex 运行。OpenAI 目前公开的方案是一组可组合的原语：用 `codex exec` 运行用例，用 `--json` 捕获 JSONL trace 和产物，自己写确定性检查，再用第二次只读 `codex exec --output-schema` 做定性 rubric 评分。官方博客本身也是用自定义 Node.js runner 串起这个闭环，没有定义 `codex eval` 子命令或通用 case/grader 目录规范。[Testing Agent Skills Systematically with Evals](https://developers.openai.com/blog/eval-skills)

因此，适合本仓库的方案是保留一份宿主无关的 case 语义，在外层增加 Claude 和 Codex 两个 adapter。第一阶段先让 Codex 覆盖结果、命令、文件和 rubric 评分；`tool_used: Skill` 与 `tool_order: Write` 不应假装已无损兼容，因为 Codex 官方 JSONL 协议没有公开等价的 skill-invocation 事件和 Claude `Write` 工具事件。

## OpenAI 官方评测模型

官方把一次 skill eval 概括为：用户 prompt → 被捕获的运行（trace + artifacts）→ 若干检查 → 可跨版本比较的分数。检查分成 outcome、process、style 和 efficiency 四类，建议先保留少量必须通过的指标。博客建议单个 skill 从 10–20 条 prompt 起步，同时放入显式调用、隐式匹配、带噪声的上下文和不应触发的反例。[Testing Agent Skills Systematically with Evals](https://developers.openai.com/blog/eval-skills)

Codex 中 skill 的基础格式与本仓库一致：一个目录内必须有带 `name` 和 `description` frontmatter 的 `SKILL.md`，可选 `scripts/`、`references/`、`assets/` 和 `agents/openai.yaml`。Codex 先看 name/description，选中后再加载完整指令；显式调用用 `/skills` 或 `$skill-name`，隐式调用主要依赖 `description`。[Build skills](https://learn.chatgpt.com/docs/build-skills)

### 运行与产物

```bash
# 只读用例，同时避免留下 session rollout
codex exec --ephemeral --json "<prompt>" > artifacts/<case>.jsonl

# 需要修改临时工作区的用例
codex exec --ephemeral --json --sandbox workspace-write \
  "<prompt>" > artifacts/<case>.jsonl

# 结果的只读 rubric 评分
codex exec --ephemeral --sandbox read-only \
  "<rubric prompt>" \
  --output-schema scripts/eval-codex/rubric.schema.json \
  -o artifacts/<case>.grade.json
```

`codex exec` 是官方稳定的非交互入口；普通模式把进度写到 `stderr`、只把最终消息写到 `stdout`。`--json` 会改为 JSONL 事件流，文档公开的顶层类型包括 `thread.started`、`turn.started`、`turn.completed`、`turn.failed`、`item.*` 和 `error`；item 可表示 agent message、reasoning、command execution、file change、MCP 调用、web search 和 plan update。`turn.completed.usage` 可用来跟踪 token。`--output-schema` 约束最终结果符合 JSON Schema，`-o` 另存最后消息。[Non-interactive mode](https://learn.chatgpt.com/docs/non-interactive-mode) [Developer commands](https://learn.chatgpt.com/docs/developer-commands?surface=cli)

新 runner 应使用 `--sandbox workspace-write`，不应照抄博客旧示例的 `--full-auto`：当前官方命令参考已把 `--full-auto` 标为废弃兼容参数。对只读 case 使用默认/read-only，对会写文件的 case 只开 workspace-write，不使用 `danger-full-access` 或 `--yolo`。[Non-interactive mode](https://learn.chatgpt.com/docs/non-interactive-mode)

### 评分器

官方 skill eval 文章推荐两层评分：

1. **确定性 grader**：解析 JSONL 事件和最终工作区，检查命令是否运行、顺序是否正确、文件是否存在、build/smoke test 是否通过、是否留下多余文件，以及命令数和 token 数是否异常。
2. **模型辅助 grader**：第二次只读检查结果工作区，通过 `--output-schema` 返回稳定的 `overall_pass`、`score` 和逐项 `checks`。适合风格、结构和约定等难以用简单规则表达的要求。

这里的第二层是用 Codex 做本地 rubric 判定，不等同于 OpenAI 平台 Evals API。后者是另一套托管评测产品，grader 以 JSON 表示，官方文档列出 string check、text similarity、score model 和 Python code execution 等类型。可以将其作为将来的聚合/托管层，但它不会直接读取本仓库的 Claude grader Markdown。[Graders](https://developers.openai.com/api/docs/guides/graders)

## 与现有 `evals/` 的差距

| 现有约定                                    | Codex 可用信号                             | 兼容判定                                                                |
| ------------------------------------------- | ------------------------------------------ | ----------------------------------------------------------------------- |
| `prompt.md` 中的用户请求                    | `codex exec` 的 prompt 参数或 stdin        | 正文可复用；frontmatter 需由 runner 解析                                |
| `description` / `expected_outcome` / `tags` | 自定义 runner 元数据                       | 可保留，Codex CLI 本身不读                                              |
| `timeout_seconds`                           | runner 的子进程超时                        | 可精确转换                                                              |
| `max_turns`                                 | 无公开的等价 CLI 参数                      | 不能直接转换；改用超时、token/命令预算或仅作 Claude 元数据              |
| `allowed_tools`                             | sandbox、工作区隔离、可用依赖配置          | 没有通用的逐工具 allowlist 等价参数；需按能力改写                       |
| `regex` grader                              | 对最后消息或产物做本地正则                 | 可直接移植语义                                                          |
| `llm` grader                                | 只读 `codex exec --output-schema`          | 可移植 rubric，但输出格式要改为 JSON Schema                             |
| `tool_order` + `Write`                      | JSONL `item.*` 事件、产物或额外仪器        | 概念可移植，原工具名和事件结构不可直译                                  |
| `tool_used: Skill`                          | 官方未公开专用 skill-invocation JSONL 事件 | 当前不能可靠直译；显式 case 用 `$skill`，隐式 case 以结果行为作为主信号 |
| `min/max` 反例                              | runner 取反后聚合                          | 可实现                                                                  |
| `arm: both` 及 WITH/WITHOUT/Δ               | 两组隔离运行                               | 需自定义 ablation，Codex CLI 不自动提供                                 |

仓库当前 10 个 case 的结果 grader 大部分可以迁移：`regex` 可做本地确定性检查，`llm` 可转成带 schema 的第二次 Codex 评分。两类过程 grader 需要特别处理：所有 `skill-fired.md` 暂时只能降级为非计分诊断；`tdd-new-function` 的 `tool_order` 不能依赖 Claude 的 `Write` 工具名，应改为验证 Codex JSONL 实际 file-change 事件，或用一个可观测的测试先行证据替代。

## 建议的仓库结构

不要复制两套 prompt。保留现有 `evals/<case>/prompt.md` 作为用例真源，将 grader 中可共享的语义和宿主执行细节分开：

```text
evals/
├─ <case>/
│  ├─ prompt.md                 # 现有：用例元数据 + 用户 prompt
│  └─ graders/                  # 现有 Claude grader，逐步抽取通用 rubric
scripts/
├─ eval-codex/
│  ├─ run.mjs                  # 枚举 case、创建临时仓库、运行、评分、聚合
│  ├─ rubric.schema.json       # 模型 grader 的稳定输出协议
│  └─ adapters/                # regex / command / file / rubric
└─ results/                         # 不提交
```

每次运行应创建独立临时 Git 仓库，只拷贝 case fixture 和本次需要的 skill。当前 OpenAI 文档规定的 repo-scope 本地发现目录是从 CWD 向上扫描的 `.agents/skills`；因此 runner 应把受测 `SKILL.md` 及其配套文件拷贝到临时仓库 `.agents/skills/<skill>/`。不要依赖博客旧示例中的 `.codex/skills`路径；当前文档列出的是 `.agents/skills`。Codex 支持跟随 skill 目录的符号链接，但为了 Windows/CI 一致性，评测 fixture 直接拷贝更可预期。[Build skills](https://learn.chatgpt.com/docs/build-skills)

WITH/WITHOUT 对比需要两个等价临时仓库：WITH 放入 `.agents/skills/<skill>`，WITHOUT 不放入。两组必须固定同一 Codex CLI 版本、model、reasoning effort、sandbox、prompt 和 fixture，并隔离用户 skill/config 带来的污染。`--ignore-user-config` 可让自动化不加载用户 `config.toml`，但身份验证仍使用 `CODEX_HOME`。[Non-interactive mode](https://learn.chatgpt.com/docs/non-interactive-mode)

## 建议的分阶段实施

### P0：可重复的 Codex smoke suite

- 固定 CLI 版本和模型，实现临时 Git 仓库、超时、JSONL/最终消息/工作区产物归档。
- 先迁移现有 regex 和结果导向 llm graders，不把 `skill-fired` 纳入得分。
- 每个 case 先运行 1 次，打通协议后再加重复次数和并发。

### P1：行为与效率检查

- 增加 command/file/build/repository-cleanliness grader，统计 `turn.completed.usage` 和 command count。
- 对本机固定的 Codex CLI 版本写 JSONL contract test；未在官方文档中详述的 `item` 字段都视为版本相关适配，不放进通用 case 规范。
- 对每个隐式触发 case 配一个反例，主要看最终行为差异。

### P2：ablation 与 CI

- 实现 WITH/WITHOUT/Δ，多次重复并报告样本数，避免把单次非确定性输出当作稳定回归。
- GitHub Actions 中使用 `openai/codex-action@v1`，通过 `codex-version` 固定 CLI，通过 `model` / `effort` 固定 agent，通过 `sandbox` 限制权限；`--output-schema` 可经 `codex-args` 传递。官方建议 Linux/macOS runner；Windows 要求 `safety-strategy: unsafe`，不适合本项目的默认 CI 安全基线。[Codex GitHub Action](https://learn.chatgpt.com/docs/github-action)

## 当前限制与风险

- **没有官方 suite runner/manifest。** CSV、Node runner、得分聚合和报告都是仓库自行定义，因此不宜对外宣称现有 eval “原生支持 Codex”。
- **skill 触发缺少稳定的直接观测点。** 官方公开 JSONL 事件类型没有列出 `skill_invoked`，所以 Claude `tool_used: Skill` 不能保真移植。
- **事件细节可随 CLI 版本改变。** 官方详细示例只承诺了部分 `command_execution` 字段；文件更改、MCP 等 item 的完整 schema 不应从单次输出推导成长期公开协议。
- **隐式触发受上下文污染影响。** Codex 还会读取 repo/user/admin/system skill；大量 skill 时初始列表会受 2% context window 或未知窗口时 8,000 字符预算限制，描述可能先被缩短，再多时可能被省略。评测必须隔离无关 skill。[Build skills](https://learn.chatgpt.com/docs/build-skills)
- **权限与依赖是用例的一部分。** 写文件、安装依赖、访网和运行 dev server 都会改变可比性；应从最小 sandbox 开始，把权限失败作为明确结果，不是自动升权。
- **成本和非确定性。** 每个定性 grader 都是额外模型调用；应先跑快速确定性检查，只对仍需判断的项目调用 rubric grader。

## 决策建议

建议立项，但把目标定义为“共享用例语义 + Codex runner adapter”，而非“让 Codex 直接读 Claude eval 格式”。P0 的验收标准应是：在隔离的临时 Git 仓库中，至少能运行一个只读 case 和一个 workspace-write case，留下可重放的 prompt、CLI/model/config、JSONL trace、最终消息、workspace diff 和结构化分数，并且不把无法观测的 skill 触发当作已通过。
