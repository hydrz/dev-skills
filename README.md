# dev-skills

[![skills.sh](https://skills.sh/b/hydrz/dev-skills)](https://skills.sh/hydrz/dev-skills)

一套面向真实软件工程的中文 agent skills，适合已经使用 Claude Code、Codex 等 AI 编程工具的开发者。

它覆盖从需求澄清到实现交付的完整流程：先把问题问清楚，再整理规格、拆分开发任务、实现、评审并验证。项目强调由人决定方向，由 agent 查证事实和执行流程，而不是“凭感觉写完再说”。

项目思想主要来自 [mattpocock/skills](https://github.com/mattpocock/skills)，并吸收了 [obra/superpowers](https://github.com/obra/superpowers) 中关于调试、评审、验证和分支收尾的实践。所有内容都根据中文开发语境重新组织。

## 60 秒快速开始

选择一种安装方式即可。多种方式同时安装会让每个 skill 出现多次。

### 作为 Claude Code 插件安装

适合希望在 Claude Code 中整体订阅并跟随仓库更新的用户。安装后的文件只读。

```bash
claude plugin marketplace add hydrz/dev-skills
claude plugin install dev-skills@hydrz
```

### 作为 OpenAI Codex 插件安装

适合希望在 Codex 或 ChatGPT 桌面端直接订阅并跟随仓库更新的用户。

```bash
codex plugin marketplace add hydrz/dev-skills
```

也可以在 ChatGPT 桌面端设置中的 Plugins Directory 中将本仓库作为本地或远程市场添加并启用。

### 作为 Google Antigravity 插件安装

适合希望在 Antigravity CLI（`agy`）、Antigravity IDE 或桌面端直接订阅并跟随仓库更新的用户。

```bash
agy plugin install https://github.com/hydrz/dev-skills
```

在 Antigravity 工作区中打开本仓库时，也会通过 `.agents/skills.json` 自动索引并激活全部 skills。

### 使用 skills.sh（npx skills）安装

适合希望把 skill 复制到项目内自行修改，或使用 Cursor、Windsurf、Zed、OpenCode 等支持 [Agent Skills](https://github.com/vercel-labs/skills) 标准宿主环境的开发者。

```bash
# 查看仓库所有可用技能（共 29 项）
npx skills add hydrz/dev-skills --list

# 交互式添加全部或选定技能
npx skills add hydrz/dev-skills

# 安装到特定 agent（例如 Cursor、Claude Code、Codex 等）
npx skills add hydrz/dev-skills -a cursor -a claude-code

# 无需安装，即时调用单个技能
npx skills use hydrz/dev-skills@grilling
```

初次安装使用时，请确保包含 `setup-dev-skills`。

### 初始化目标仓库

无论选择哪种安装方式，安装完成后都需要进入目标仓库并运行一次：

```text
/setup-dev-skills
```

它会配置 issue 追踪器、分诊标签、领域文档布局和功能清单约定。之后如果不确定该使用哪个 skill，运行：

```text
/guide
```

## 常见使用场景

### 需求还没有想清楚

在仓库里运行 `/grill-with-docs`。它会逐轮澄清并压力测试方案，同时把术语和重要决策写入项目文档。

确认方案后，依次运行：

```text
/to-spec → /to-tickets
```

前者把已经完成的讨论整理成规格，后者把规格拆成具有前置依赖的端到端最小闭环任务。

### 已有明确任务，需要实现

- 一项或少量任务，希望留在当前会话完成：运行 `/implement`。
- 一整份规格，希望由多个子代理并行完成并交付一个 PR：运行 `/implement-spec`。

这两个命令的主要差异是工作规模和执行方式，不是有没有规格。

### 收到一个不完整的 bug 或需求

- 问题已经可以复现，需要定位根因：使用 `diagnosing-bugs`。
- 外部 issue 或 PR 信息不足，需要先分类、核实并补齐执行条件：运行 `/triage`。

## 主工作流

```text
/grill-with-docs → /to-spec → /to-tickets → /implement
                                          ↘ /implement-spec
```

- `/grill-with-docs`：带记录的方案追问。
- `/to-spec`：将现有讨论整理成可实施规格，不再追加访谈。
- `/to-tickets`：将规格拆成带前置依赖的开发任务。
- `/implement`：在当前会话实现一项或少量任务。
- `/implement-spec`：并行完成整份规格并交付一个 PR。

每项任务内部通常会使用 TDD、代码评审、完成验证和分支收尾等可自动触发的 skill。

如果工作规模大到一个会话无法理清，使用 `/wayfinder` 将它拆成可以逐步解决的决策问题。交付新产品或子系统时，它还会建立功能清单，列出每个页面和功能的发布批次、要覆盖的状态和设计依据。之后的规格、任务、评审和完成验证都按清单逐项核对，避免只做了主流程，或页面偏离设计。如果只是想在仓库外澄清一个计划，使用不写文件的 `/grill-me`。

## skill 导航

skill 按触发方式分为两类：

- **仅用户触发**：只有你显式输入名称才会运行，主要负责编排完整流程。
- **可自动触发**：agent 会在合适场景主动使用，你也可以显式调用，主要提供可复用的工程方法。

完整列表与使用边界见：

- [工程 skill](./skills/engineering/README.md)
- [协作与思考 skill](./skills/productivity/README.md)
- [触发方式说明](./docs/invocation.md)

## 设计原则

### 先对齐，再实现

事实由 agent 查证，方向和取舍由用户决定。流程规模可以缩小，但实施前始终需要用户明确确认。

### 先建立反馈，再推理

调试和实现都需要快速、确定、可重复的验证方式。没有反馈信号时，agent 无法可靠判断改动是否有效。

### 先证据，后结论

声称完成、修好或测试通过之前，必须在当前代码状态下运行对应验证，并检查完整结果。

### 让接口保持简单

agent 提高了写代码的速度，也会提高系统复杂度增长的速度。项目使用深模块、测试接缝和明确边界等方法，帮助代码库持续保持可理解和可修改。

项目术语见 [CONTEXT.md](./CONTEXT.md)，中文写作约定见 [docs/chinese-writing.md](./docs/chinese-writing.md)，具体设计来源见 [docs/design-sources.md](./docs/design-sources.md)。

## 许可

MIT。本项目改编自 mattpocock/skills（Copyright © 2026 Matt Pocock）与 obra/superpowers（Copyright © 2025 Jesse Vincent），二者均使用 MIT 许可。版权声明见 [LICENSE](./LICENSE)。
