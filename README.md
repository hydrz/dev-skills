# dev-skills

[![skills.sh](https://skills.sh/b/hydrz/dev-skills)](https://skills.sh/hydrz/dev-skills)

一套面向真实软件工程的中文 Agent Skills，适合已经使用 Claude Code、Codex 等 AI 编程工具的开发者。

它覆盖从需求澄清到实现交付的完整流程：先把问题问清楚，再整理规格、拆分开发任务、实现、评审并验证。项目强调由人决定方向，由 Agent 查证事实和执行流程，而不是“凭感觉写完再说”。

项目思想主要来自 [mattpocock/skills](https://github.com/mattpocock/skills)，并吸收了 [obra/superpowers](https://github.com/obra/superpowers) 中关于调试、评审、验证和分支收尾的实践。所有内容都根据中文开发语境重新组织。

## 为什么需要 Agent Skills？

Skills 是为 Coding Agent 设计的轻量、精准的工作流指令，让 Agent 像资深工程师一样思考和交付。

| 关注维度 &emsp;&emsp; | 核心逻辑                                                                                                                 |
| :-------------------- | :----------------------------------------------------------------------------------------------------------------------- |
| **痛点**              | Agent 的交付上限取决于你给它的工程流程。如果任由它自由发挥，往往会写出表面上能跑、实则悄悄腐化代码库的代码。             |
| **解法**              | 每个 skill 固化一个资深工程师的工程习惯（方案盘问、明确规格、测试先行、多维交叉评审），让 Agent 始终遵循统一的质量标准。 |
| **复利**              | 多个 skill 相互咬合形成流水线：上一步的产出直接作为下一步的输入。持续调优某个环节时，整条交付链的质量都会获得复合提升。  |

## 技能全景速览

涵盖从项目起步到最终交付的 38 项核心能力，按使用时机划分为 7 大模块。多数人从核心主干（The Main Flow）开始。

> **说明**：带 `/` 前缀的为**仅用户触发**（需在对话中显式输入命令）；不带 `/` 的为**可自动触发**（由 Agent 在合适场景主动调用）。

### 0. 起步与地基（Bootstrapping）

全新项目从零起步、确立技术基线与骨架。

| 技能 / 命令 &emsp;&emsp;&emsp;&emsp;                        | 核心定位与职责                                                             |
| :---------------------------------------------------------- | :------------------------------------------------------------------------- |
| [`/bootstrap-project`](./skills/bootstrap-project/SKILL.md) | **起步与地基**：从零起步，按决策清单完成技术栈选型、目录分层与工具链配置。 |
| [`/walking-skeleton`](./skills/walking-skeleton/SKILL.md)   | **端到端骨架**：搭建贯穿前端到持久化的最小可运行雏形，保留作为后续基座。   |

### 1. 入门与导航（Getting Started）

配置规格约定、issue 追踪器与领域文档。多数人从 `/setup-dev-skills` 开始。

| 技能 / 命令 &emsp;&emsp;&emsp;&emsp;                      | 核心定位与职责                                                                              |
| :-------------------------------------------------------- | :------------------------------------------------------------------------------------------ |
| [`/setup-dev-skills`](./skills/setup-dev-skills/SKILL.md) | **初始化项目约定**：首次在仓库中使用，配置 issue 追踪器、分诊标签、领域文档与功能清单约定。 |
| [`/ask-dev-skills`](./skills/ask-dev-skills/SKILL.md)     | **工作流导航**：不确定当前场景该用哪个 skill 时运行，获取针对性路由建议。                   |

### 2. 核心交付主干（The Main Flow）

从需求澄清到上线交付的端到端主流程。

| 技能 / 命令 &emsp;&emsp;&emsp;&emsp;                    | 核心定位与职责                                                                           |
| :------------------------------------------------------ | :--------------------------------------------------------------------------------------- |
| [`/grill-with-docs`](./skills/grill-with-docs/SKILL.md) | **带记录的方案追问**：在仓库中逐轮澄清方案，记录关键决策并写入 `CONTEXT.md` 与 ADR。     |
| [`/to-spec`](./skills/to-spec/SKILL.md)                 | **整理规格**：将讨论成果整理成规格并发布到 issue 追踪器，商定测试接缝，不再追加访谈。    |
| [`/to-tickets`](./skills/to-tickets/SKILL.md)           | **拆分开发任务**：将规格拆解为带前置依赖的端到端最小闭环任务，并在发布前与用户核对确认。 |
| [`/implement`](./skills/implement/SKILL.md)             | **当前会话实现**：在当前会话中通过测试先行实现单项或少量明确任务。                       |
| [`/implement-spec`](./skills/implement-spec/SKILL.md)   | **整体规格并行交付**：由多个子代理并行完成整份规格，并统一交付 PR。                      |
| [`code-review`](./skills/code-review/SKILL.md)          | **代码评审**：从仓库规范、需求规格和上线风险三个维度对 diff 展开严格审查。               |

### 3. 需求定义与探索（Shaping）

在正式编码前探索开放问题、验证技术猜想并沉淀架构决策。

| 技能 / 命令 &emsp;&emsp;&emsp;&emsp;        | 核心定位与职责                                                                             |
| :------------------------------------------ | :----------------------------------------------------------------------------------------- |
| [`/wayfinder`](./skills/wayfinder/SKILL.md) | **大型工作决策规划**：为大型复杂工作绘制决策地图与批次规划，建立清晰的功能清单与设计依据。 |
| [`prototype`](./skills/prototype/SKILL.md)  | **一次性原型**：用一次性代码回答设计问题（逻辑演示单文件 HTML 或单路由多变体 UI）。        |
| [`research`](./skills/research/SKILL.md)    | **技术调研**：查阅第一手权威资料，并在仓库中沉淀带完整引用的调研报告。                     |

### 4. 工程维护与保障（Upkeep）

保持代码库健康、定位疑难缺陷、化解合并冲突并守住质量门禁。

| 技能 / 命令 &emsp;&emsp;&emsp;&emsp;                                                | 核心定位与职责                                                                 |
| :---------------------------------------------------------------------------------- | :----------------------------------------------------------------------------- |
| [`/improve-codebase-architecture`](./skills/improve-codebase-architecture/SKILL.md) | **架构审查**：扫描代码库并生成可视化重构报告，找出值得改进的高耦合模块。       |
| [`diagnosing-bugs`](./skills/diagnosing-bugs/SKILL.md)                              | **系统化诊断**：从编写失败复现用例开始，系统化定位疑难 bug 根因。              |
| [`resolving-merge-conflicts`](./skills/resolving-merge-conflicts/SKILL.md)          | **解决合并冲突**：根据双方改动意图，稳步处理 merge 与 rebase 冲突。            |
| [`/triage`](./skills/triage/SKILL.md)                                               | **外部 issue 分流**：分类、核实并补齐外部 issue 与 PR，使其达到可执行状态。    |
| [`wizard`](./skills/wizard/SKILL.md)                                                | **生成设置向导**：针对必须由人工完成的外部配置与鉴权，生成交互式向导脚本。     |
| [`/setup-ts-deep-modules`](./skills/setup-ts-deep-modules/SKILL.md)                 | **TypeScript 模块边界**：将公开接口与依赖方向配置为可执行的静态检查规则。      |
| [`/setup-pre-commit`](./skills/setup-pre-commit/SKILL.md)                           | **提交前质量门**：沿用仓库现有工具，为暂存区改动配置快速、可验证的预提交检查。 |

### 5. 效能与协作（Productivity）

提升人机协同效率、跨会话状态接力与团队知识资产沉淀。

| 技能 / 命令 &emsp;&emsp;&emsp;&emsp;                        | 核心定位与职责                                                               |
| :---------------------------------------------------------- | :--------------------------------------------------------------------------- |
| [`/grill-me`](./skills/grill-me/SKILL.md)                   | **无状态方案追问**：纯对话追问，在正式开始前压力测试想法，不向本地写入文件。 |
| [`/handoff`](./skills/handoff/SKILL.md)                     | **会话交接**：将当前长会话状态精准打包，方便其他 Agent 或新会话接力。        |
| [`/to-questionnaire`](./skills/to-questionnaire/SKILL.md)   | **生成外部问卷**：把需要其他人回答的问题整理成清晰易答的结构化问卷。         |
| [`/teach`](./skills/teach/SKILL.md)                         | **持续学习**：把当前目录作为可跨会话延续的学习工作区。                       |
| [`/wait-what`](./skills/wait-what/SKILL.md)                 | **换种方式解释**：要求 Agent 抛开晦涩术语，用平实语言重新解释方案。          |
| [`/workflow-designer`](./skills/workflow-designer/SKILL.md) | **工作流设计**：把日常重复的团队操作梳理为清晰严谨的执行契约。               |
| [`/retro`](./skills/retro/SKILL.md)                         | **会话复盘**：基于真实会话沉淀复盘经验，改进规则门禁与指令质量。             |

### 6. 底层复用规范（Reference Skills）

供其他工作流在后台按需调用的工程标准与编写规范。

| 技能 / 命令 &emsp;&emsp;&emsp;&emsp;                               | 核心定位与职责                                                         |
| :----------------------------------------------------------------- | :--------------------------------------------------------------------- |
| [`api-contract`](./skills/api-contract/SKILL.md)                   | **接口契约**：设计服务间通信协议、输入输出校验与统一错误结构。         |
| [`codebase-design`](./skills/codebase-design/SKILL.md)             | **模块设计**：遵循深模块与清晰边界设计理念，提供模块化设计的原则指导。 |
| [`data-modeling`](./skills/data-modeling/SKILL.md)                 | **数据建模**：设计数据库表结构、确立实体关系与迁移策略。               |
| [`domain-modeling`](./skills/domain-modeling/SKILL.md)             | **领域建模**：维护项目通用语言与 ADR。                                 |
| [`grilling`](./skills/grilling/SKILL.md)                           | **方案追问方法**：按依赖关系逐轮追问的通用问答方法论。                 |
| [`tdd`](./skills/tdd/SKILL.md)                                     | **测试驱动开发**：红-绿-重构循环测试驱动开发标准。                     |
| [`verifying-completion`](./skills/verifying-completion/SKILL.md)   | **完成验证**：在声称完成前运行检查并在当前状态下阅读完整测试产出。     |
| [`receiving-code-review`](./skills/receiving-code-review/SKILL.md) | **处理评审意见**：先核实意见再修改代码，杜绝盲目修改。                 |
| [`finish-work`](./skills/finish-work/SKILL.md)                     | **交付收尾**：完成后标准收尾流程，提供本地直合、提交评审或评审后收口。 |
| [`writing-chinese`](./skills/writing-chinese/SKILL.md)             | **中文写作与审校**：保障产出中文内容自然、地道、清晰的技术写作指南。   |
| [`writing-for-agents`](./skills/writing-for-agents/SKILL.md)       | **Agent 文档写作**：高质量 Agent 规则与文档编写规范。                  |

> 完整分类规则与触发机制详见 [Skill 清单](./skills/README.md) 与 [触发方式说明](./docs/invocation.md)。

## 60 秒快速上手

选择一种方式安装插件。多种方式同时安装会让每个 skill 出现多次。

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

也可以在 ChatGPT 桌面端设置中的 Plugins Directory 中将本仓库作为本地或远程市场添加并启用。

#### 作为 Google Antigravity 插件安装

适合希望在 Antigravity CLI（`agy`）、Antigravity IDE 或桌面端直接订阅并跟随仓库更新的用户：

```bash
agy plugin install https://github.com/hydrz/dev-skills
```

在 Antigravity 工作区中打开本仓库时，也会通过 `.agents/skills.json` 自动索引并激活全部 skills。

#### 使用 skills.sh（npx skills）安装

适合希望把 skill 复制到项目内自行修改，或使用 Cursor、Windsurf、Zed、OpenCode 等支持 [Agent Skills](https://github.com/vercel-labs/skills) 标准宿主环境的开发者：

```bash
# 查看仓库所有可用技能（共 38 项）
npx skills add hydrz/dev-skills --list

# 交互式添加全部或选定技能
npx skills add hydrz/dev-skills

# 安装到特定 Agent（例如 Cursor、Claude Code 等）
npx skills add hydrz/dev-skills -a cursor -a claude-code

# 无需安装，即时调用单个技能
npx skills use hydrz/dev-skills@grilling
```

初次安装使用时，请确保包含 `setup-dev-skills`。

### 2. 初始化目标仓库

无论选择哪种安装方式，安装完成后都需要进入目标仓库并运行一次：

```text
/setup-dev-skills
```

它会配置 issue 追踪器、分诊标签、领域文档布局和功能清单约定。之后如果不确定该使用哪个 skill，运行：

```text
/ask-dev-skills
```

## 核心交付主干

从需求澄清到上线交付的端到端主工作流：

```text
/grill-with-docs ──➔ /to-spec ──➔ /to-tickets ──➔ /implement
                                                ↘ /implement-spec
```

| 环节 &emsp;&emsp; | 对应命令 &emsp;&emsp;&emsp;&emsp;                       | 核心职责                                                                |
| :---------------- | :------------------------------------------------------ | :---------------------------------------------------------------------- |
| **1. 方案追问**   | [`/grill-with-docs`](./skills/grill-with-docs/SKILL.md) | 在仓库中逐轮澄清方案，记录关键决策并写入 `CONTEXT.md` 与 ADR。          |
| **2. 整理规格**   | [`/to-spec`](./skills/to-spec/SKILL.md)                 | 将讨论成果整理成规格并发布到 issue 追踪器，商定测试接缝，不再追加访谈。 |
| **3. 拆分任务**   | [`/to-tickets`](./skills/to-tickets/SKILL.md)           | 将规格拆解为带前置依赖的端到端最小闭环任务，并在发布前与用户核对确认。  |
| **4. 单会话实现** | [`/implement`](./skills/implement/SKILL.md)             | 在当前会话中通过测试先行实现单项或少量明确任务。                        |
| **4. 并行交付**   | [`/implement-spec`](./skills/implement-spec/SKILL.md)   | 由多个子代理并行完成整份规格，并统一交付 PR。                           |

### 典型使用场景

- **需求还没有想清楚**：运行 `/grill-with-docs` 逐轮澄清并压力测试方案；如果规模大到一个会话无法理清，使用 [`/wayfinder`](./skills/wayfinder/SKILL.md) 建立功能清单与决策地图；若仅需纯对话推演且不向本地写入文件，使用 [`/grill-me`](./skills/grill-me/SKILL.md)。
- **已有明确任务，需要实现**：单项或少量任务用 `/implement`；整份规格需多个子代理并行完成用 `/implement-spec`。实现过程会自动联动 `tdd`、`code-review`、`verifying-completion` 与 `finish-work`。
- **收到不完整的 bug 或需求**：问题已经可以复现时使用 `diagnosing-bugs` 定位根因；外部 issue 或 PR 信息不足时运行 [`/triage`](./skills/triage/SKILL.md) 分类、核实并补齐执行条件。

## 设计原则

### 先对齐，再实现

事实由 Agent 查证，方向和取舍由用户决定。流程规模可以缩小，但实施前始终需要用户明确确认。

### 先建立反馈，再推理

调试和实现都需要快速、确定、可重复的验证方式。没有反馈信号时，Agent 无法可靠判断改动是否有效。

### 先证据，后结论

声称完成、修好或测试通过之前，必须在当前代码状态下运行对应验证，并检查完整结果。

### 让接口保持简单

Agent 提高了写代码的速度，也会提高系统复杂度增长的速度。项目使用深模块、测试接缝和明确边界等方法，帮助代码库持续保持可理解和可修改。

项目术语见 [CONTEXT.md](./CONTEXT.md)，中文写作约定见 [docs/chinese-writing.md](./docs/chinese-writing.md)，具体设计来源见 [docs/design-sources.md](./docs/design-sources.md)。

## 许可

MIT。本项目改编自 mattpocock/skills（Copyright © 2026 Matt Pocock）与 obra/superpowers（Copyright © 2025 Jesse Vincent），二者均使用 MIT 许可。版权声明见 [LICENSE](./LICENSE)。
