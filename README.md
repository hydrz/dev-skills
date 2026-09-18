# dev-skills

[![skills.sh](https://skills.sh/b/hydrz/dev-skills)](https://skills.sh/hydrz/dev-skills)

一套面向真实软件工程的中文 Agent Skills，适合已经在用 Claude Code、Codex 等 AI 编程工具的开发者。

它覆盖从需求澄清到实现交付的完整流程：先把问题问清楚，再整理规格、拆分任务、实现、评审并验证。项目坚持一个原则——方向和取舍由人决定，事实查证和流程执行交给 Agent，而不是让 Agent 凭感觉写完再说。

项目思想主要来自 [mattpocock/skills](https://github.com/mattpocock/skills)，并吸收了 [obra/superpowers](https://github.com/obra/superpowers) 中关于调试、评审、验证和分支收尾的实践，所有内容按中文开发语境重新组织。

## 为什么需要 Agent Skills？

Skills 是为 Coding Agent 设计的轻量工作流指令，让 Agent 像资深工程师一样思考和交付。

| 维度     | 说明                                                                                                               |
| :------- | :----------------------------------------------------------------------------------------------------------------- |
| **痛点** | Agent 的交付上限取决于你给它的工程流程；放任自由发挥，容易写出能跑但会腐化代码库的代码。                           |
| **解法** | 每个 skill 固化一项资深工程师的工程习惯（方案追问、明确规格、测试先行、多维评审等），让 Agent 遵循统一的质量标准。 |
| **复利** | Skill 之间相互衔接、上一步产出即下一步输入，持续打磨某个环节会让整条交付链一起变好。                               |

## 技能全景

> 共 40 项 skill，按使用时机分为 7 组。带 `/` 前缀需在对话中显式输入命令触发；不带 `/` 的由 Agent 视场景自动调用，也可手动触发。触发机制详见 [docs/invocation.md](./docs/invocation.md)。

**怎么选组**：新项目、代码还不存在 → 第 0 组；已有仓库、第一次接入这套 skill → 第 1 组；有明确的需求要交付 → 第 2 组（核心主干，多数人从这里开始）；想法还没成型、需要先验证 → 第 3 组；日常维护、救火、守门禁 → 第 4 组；跟人沟通或跨会话协作，不直接涉及代码 → 第 5 组；第 6 组是被其他 skill 在后台调用的写作与设计规范，通常不需要主动使用。

### 0. 起步与地基（新项目专用）

全新项目从零起步，打好技术地基；如果仓库已经存在代码，跳到第 1 组。从 [`/bootstrap-project`](./skills/bootstrap-project/SKILL.md) 开始。

- [`/bootstrap-project`](./skills/bootstrap-project/SKILL.md)：按决策清单完成技术栈选型、目录分层与工具链配置。
- [`/walking-skeleton`](./skills/walking-skeleton/SKILL.md)：搭建贯穿前端到数据库的端到端最小可运行骨架。

### 1. 入门与导航（已有仓库首次接入）

把这套 skill 接到已有仓库时，先跑一次约定配置；之后随时能找到该用哪个 skill。从 [`/setup-dev-skills`](./skills/setup-dev-skills/SKILL.md) 开始。

- [`/setup-dev-skills`](./skills/setup-dev-skills/SKILL.md)：配置 issue 追踪器、分诊标签与领域文档约定，每个仓库只需跑一次。
- [`/ask-dev-skills`](./skills/ask-dev-skills/SKILL.md)：不确定该用哪个 skill 时，说明情况并获取推荐。

### 2. 核心交付主干（多数人从这里开始）

有一份明确需求，要从讨论一路交付到上线时，按下面的顺序走：

1. [`/grill-with-docs`](./skills/grill-with-docs/SKILL.md) —— 逐轮澄清方案，把决策记录进 `CONTEXT.md` 与 ADR。
2. [`/to-spec`](./skills/to-spec/SKILL.md) —— 把讨论结果整理成规格，发布到 issue 追踪器。
3. [`/to-tickets`](./skills/to-tickets/SKILL.md) —— 把规格拆成带前置依赖的端到端最小闭环任务。
4. 实现任务，二选一：
   - [`/implement`](./skills/implement/SKILL.md) —— 当前会话内，测试先行实现一项或少量任务；
   - [`/implement-spec`](./skills/implement-spec/SKILL.md) —— 多个子代理并行完成整份规格。
     两者内部都会自动依次跑 [`tdd`](./skills/tdd/SKILL.md)（测试先行）→ [`code-review`](./skills/code-review/SKILL.md)（三维度评审 diff）→ [`verifying-completion`](./skills/verifying-completion/SKILL.md)（验证完成），不用手动触发。
5. [`finish-work`](./skills/finish-work/SKILL.md) —— 收尾：本地合并、推送创建 PR，或保持现状，三选一。选"推送创建 PR"时会自动调用 [`pr`](./skills/pr/SKILL.md) 撰写带证据对比和合并风险评估的结构化描述，不用单独触发。

### 3. 需求定义与探索（想法还没成型）

需求或方案还不确定，编码前先验证技术猜想、把决策沉淀下来，成熟后再进入第 2 组。从 [`/wayfinder`](./skills/wayfinder/SKILL.md) 开始。

- [`/wayfinder`](./skills/wayfinder/SKILL.md)：把一个会话理不清的大型工作拆成决策地图，逐步敲定。
- [`prototype`](./skills/prototype/SKILL.md)：写一次性代码，回答一个设计问题。
- [`research`](./skills/research/SKILL.md)：查一手权威资料，留下带引用的调研报告。

### 4. 工程维护与保障（日常维护、救火）

与第 2 组不同：这里没有一份要交付的规格，而是响应式地处理已有代码库里冒出来的问题——缺陷、冲突、外部 issue、配置缺口。从 [`/improve-codebase-architecture`](./skills/improve-codebase-architecture/SKILL.md) 开始。

- [`/improve-codebase-architecture`](./skills/improve-codebase-architecture/SKILL.md)：扫描代码库，生成可视化重构报告。
- [`diagnosing-bugs`](./skills/diagnosing-bugs/SKILL.md)：从可复现用例开始，定位疑难 bug 根因。
- [`resolving-merge-conflicts`](./skills/resolving-merge-conflicts/SKILL.md)：按双方改动意图，处理 merge/rebase 冲突。
- [`/triage`](./skills/triage/SKILL.md)：分类、核实并补齐外部 issue 与 PR，使其可执行。
- [`/wizard`](./skills/wizard/SKILL.md)：为必须人工完成的外部配置生成交互式向导。
- [`/setup-deep-modules`](./skills/setup-deep-modules/SKILL.md)：把模块边界配置成可执行的静态检查。
- [`/setup-pre-commit`](./skills/setup-pre-commit/SKILL.md)：为暂存改动配置快速的预提交质量门。
- [`/git-guardrails`](./skills/git-guardrails/SKILL.md)：拦截强推、硬重置等破坏性 Git 命令。

### 5. 效能与协作（人与人、会话与会话之间）

不直接产出代码，而是处理沟通和交接：把方案讲清楚、把会话交给别人、把问题发给别人回答。从 [`/grill-me`](./skills/grill-me/SKILL.md) 开始。

- [`/grill-me`](./skills/grill-me/SKILL.md)：纯对话压力测试一个想法，不写入本地文件。
- [`/handoff`](./skills/handoff/SKILL.md)：把长会话状态打包，方便其他 agent 接力。
- [`/to-questionnaire`](./skills/to-questionnaire/SKILL.md)：把需要别人回答的问题整理成可发送的问卷。
- [`/teach`](./skills/teach/SKILL.md)：把当前目录变成可跨会话延续的学习工作区。
- [`/wait-what`](./skills/wait-what/SKILL.md)：要求用更平实的语言重新解释上一段内容。
- [`/workflow-designer`](./skills/workflow-designer/SKILL.md)：把重复发生的团队操作整理成可实施的执行契约。
- [`/retro`](./skills/retro/SKILL.md)：复盘一次会话，把经验转化为检查规则或指令改进。

### 6. 底层复用规范（不必主动调用）

以上各组的 skill 在运行时会在后台引用这些标准和方法论；单独列出是为了可以直接阅读或引用，通常不需要专门去触发它们。

- [`api-contract`](./skills/api-contract/SKILL.md)：设计接口协议、输入输出校验与统一错误结构。
- [`codebase-design`](./skills/codebase-design/SKILL.md)：深模块与清晰边界的模块化设计原则。
- [`data-modeling`](./skills/data-modeling/SKILL.md)：设计数据库表结构、实体关系与迁移策略。
- [`domain-modeling`](./skills/domain-modeling/SKILL.md)：维护项目通用语言与 ADR。
- [`grilling`](./skills/grilling/SKILL.md)：按依赖关系逐轮追问、达成共识的通用方法论。
- [`tdd`](./skills/tdd/SKILL.md)：红-绿-重构循环的测试驱动开发标准。
- [`verifying-completion`](./skills/verifying-completion/SKILL.md)：声称完成前先运行检查、读完整测试产出。
- [`receiving-code-review`](./skills/receiving-code-review/SKILL.md)：先核实评审意见，再决定是否修改代码。
- [`finish-work`](./skills/finish-work/SKILL.md)：交付收尾，合并、提交评审或保持现状。
- [`writing-chinese`](./skills/writing-chinese/SKILL.md)：保障中文内容自然、清晰、忠于原意。
- [`writing-for-agents`](./skills/writing-for-agents/SKILL.md)：编写高质量 skill 与 agent 文档。

## 60 秒快速上手

选择一种方式安装即可，多种方式同时安装会让每个 skill 重复出现。

### 1. 安装插件

#### 作为 Claude Code 插件安装

适合希望在 Claude Code 中整体订阅并跟随仓库更新的用户（安装后文件只读）：

```bash
claude plugin marketplace add hydrz/dev-skills
claude plugin install dev-skills@hydrz
```

#### 作为 OpenAI Codex 插件安装

适合希望在 Codex 或 ChatGPT 桌面端直接订阅并跟随仓库更新的用户：

```bash
codex plugin marketplace add hydrz/dev-skills
codex plugin add dev-skills@hydrz
```

也可以在 ChatGPT 桌面端设置的 Plugins Directory 中，把本仓库作为本地或远程市场添加并启用。

#### 作为 Google Antigravity 插件安装

适合希望在 Antigravity CLI（`agy`）、Antigravity IDE 或桌面端直接订阅并跟随仓库更新的用户：

```bash
agy plugin install https://github.com/hydrz/dev-skills
```

在 Antigravity 工作区中打开本仓库时，也会通过 `.agents/skills.json` 自动索引并激活全部 skill。

#### 使用 skills.sh（npx skills）安装

适合希望把 skill 复制到项目内自行修改，或使用 Cursor、Windsurf、Zed、OpenCode 等支持 [Agent Skills](https://github.com/vercel-labs/skills) 标准的宿主环境的开发者：

```bash
# 查看仓库所有可用技能（共 40 项）
npx skills add hydrz/dev-skills --list

# 交互式添加全部或选定技能
npx skills add hydrz/dev-skills

# 安装到特定 Agent（例如 Cursor、Claude Code 等）
npx skills add hydrz/dev-skills -a cursor -a claude-code

# 无需安装，即时调用单个技能
npx skills use hydrz/dev-skills@grilling
```

初次安装时，请确保包含 `setup-dev-skills`。

### 2. 初始化目标仓库

无论选择哪种安装方式，安装完成后都需要进入目标仓库运行一次：

```text
/setup-dev-skills
```

它会配置 issue 追踪器、分诊标签、领域文档布局和功能清单约定。之后不确定该用哪个 skill 时，运行：

```text
/ask-dev-skills
```

## 设计原则

**先对齐，再实现**：事实由 Agent 查证，方向和取舍由用户决定；流程规模可以缩小，但实施前始终需要用户明确确认。

**先建立反馈，再推理**：调试和实现都需要快速、确定、可重复的验证方式；没有反馈信号时，Agent 无法可靠判断改动是否有效。

**先证据，后结论**：声称完成、修好或测试通过之前，必须在当前代码状态下运行对应验证，并检查完整结果。

**让接口保持简单**：Agent 提高了写代码的速度，也会提高系统复杂度增长的速度。项目用深模块、测试接缝和明确边界，帮助代码库持续保持可理解、可修改。

项目术语见 [CONTEXT.md](./CONTEXT.md)，中文写作约定见 [docs/chinese-writing.md](./docs/chinese-writing.md)，具体设计来源见 [docs/design-sources.md](./docs/design-sources.md)。

## 许可

MIT。本项目改编自 mattpocock/skills（Copyright © 2026 Matt Pocock）与 obra/superpowers（Copyright © 2025 Jesse Vincent），二者均使用 MIT 许可。版权声明见 [LICENSE](./LICENSE)。
