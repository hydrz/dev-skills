---
name: ask-dev-skills
description: 不确定下一步该使用哪个 skill 时，说明当前情况并获得工作流建议。本仓库所有 skill 的导航入口。
disable-model-invocation: true
---

# 工作流导航

阅读用户描述的情况，告诉用户该用哪个 skill（或哪几个、按什么顺序）以及原因。情况不清楚时，先问一两个问题再推荐。

需要解释主流程的细节、某个 skill 的具体行为或入口之间如何衔接时，读 [WORKFLOW.md](WORKFLOW.md)。用户问的是会话之间怎么切换（继续、`/clear`、`/handoff`、子代理、`/compact`）时，读 [PHASE-BOUNDARIES.md](PHASE-BOUNDARIES.md)。

## 先看规模

流程随规模简化，**实施前确认**不简化：无论改动多小，开始修改之前都要让用户对“要做什么”明确表示同意。

- **可行性验证与技术调研**（例如“能不能用 X 做到 Y？”）：说明要验证什么，用户同意后去查证；主要查阅文档与一手资料时用 `research`，涉及局部状态逻辑或界面设计推演时用 `prototype`，最后报告结论和建议
- **小范围改动**（例如仓库已有流程上的一个参数、一个小接口或一处修复）：用 `/grill-me` 或 `/grill-with-docs` 追问几轮，在对话里给出简短设计，用户同意后运行 `/implement`
- **架构级**（例如新项目、新子系统，或改变其他代码依赖的接口）：完整主流程（见下文）
- **大型模糊工作**（例如一个会话无法完成，连实现路径都还不清楚）：`/wayfinder`

在两档之间拿不准时，选更重的一档。途中发现隐藏的复杂度时，停下来升档。

## 主流程

### 从零起步

全新仓库起步时的推荐序列为：

`/bootstrap-project → /setup-dev-skills → /walking-skeleton → 现有交付主干`

各步骤不强制衔接：纯工具库、算法包或无外部通信/数据库的 CLI 项目可以跳过 `/walking-skeleton`，直接进入主流程。

### 交付主干

1. `/grill-with-docs` 追问完善想法，把术语和决策写入 `CONTEXT.md` 和 ADR；没有工作目录时用 `/grill-me`。
2. 有问题需要可运行的答案时，用 `/handoff` 开新会话做 `prototype`，再用 `/handoff` 把结论带回。
3. 需要多个会话时：`/to-spec` 整理规格并商定测试接缝，`/to-tickets` 拆成带前置依赖的端到端最小闭环任务并核对确认，然后二选一：
   - 由用户跟进：每项任务运行一次 `/implement`，任务之间 `/clear`。
   - 交给 agent：`/implement-spec` 并行派发子代理，逐项评审，按整份规格一个 PR 或每项任务一个 PR 交付。
4. 一个会话能完成时，直接 `/implement`。

实现时都使用 `tdd`、`code-review`、`verifying-completion`，最后用 `finish-work` 收尾。步骤 1 到 3 保持在同一个上下文窗口中。

## 按情况选入口

- 从零起步、还没有代码：`/bootstrap-project`
- 首次使用工程流程，还没配置 issue 追踪器和文档布局：`/setup-dev-skills`
- 搭建贯穿全链路的最小可运行雏形并保留继续开发：`/walking-skeleton`
- 有一个想法，想做出来：主流程，从 `/grill-with-docs` 开始
- 范围大、方向不清，一个会话讨论不完：`/wayfinder`，路径明确后交给 `/to-spec`
- 待处理的外部 bug 报告和需求越来越多：`/triage`，产出的 issue 由 `/implement` 领取
- 代码出错、测试失败、偶发问题、性能退化：`diagnosing-bugs`
- 正处于 merge 或 rebase 冲突中：`resolving-merge-conflicts`
- 要评审改动；收到了评审意见：`code-review`；`receiving-code-review`
- 实现完成，要合并主干、提 PR 审查或做发版就绪收尾：`/finish-work`
- 准备创建 PR，撰写结构化摘要与证据：`/pr`
- 有空时想让代码库更适合 agent 工作：`/improve-codebase-architecture`
- 设计模块接口、测试接缝，或判断是否需要 DDD：`codebase-design`
- 设计接口契约、通信协议选型与统一错误结构：`api-contract`
- 设计数据库表结构、确立实体关系与迁移策略：`data-modeling`
- 澄清术语、更新 `CONTEXT.md` 或记录 ADR：`domain-modeling`
- TypeScript 仓库要把模块边界配置成静态检查：`/setup-ts-deep-modules`
- 想在提交前获得快速质量反馈：`/setup-pre-commit`
- 防范 AI 误执行破坏性 Git 命令（强推、硬重置、强删分支等）：`/git-guardrails`
- 一次工作结束，想复盘 agent 的绕路和遗漏：`/retro`
- 需要在仓库中留下带引用的技术调研报告：`research`，报告再带进 `/grill-with-docs`
- 缺的信息在别人那里：`/to-questionnaire`
- 有只能由人完成的配置、凭据或迁移步骤：`wizard`
- 要换 agent 工具、换目录或交给同事：`/handoff`
- 没看懂刚才的消息：`/wait-what`
- 分多次会话学习一个概念：`/teach`
- 反复发生的团队操作或审批流程要整理成规格：`/workflow-designer`
- 构思、撰写或审校成篇中文内容：`writing-chinese`；内容是 agent 指令时先用 `writing-for-agents`
- 编写或测试 skill、`AGENTS.md`、`CLAUDE.md`：`writing-for-agents`
- 只想被追问一个计划，不附加任何流程：`grilling`

## 容易混淆的入口

- **`/grill-with-docs` 与 `/grill-me`**：追问方式相同（都使用 `grilling`）；前者在仓库中留下 `CONTEXT.md` 和 ADR，后者不写文件，用于没有工作目录的场景。
- **`/grill-with-docs` 与 `/wayfinder`**：一个会话能讨论完用前者，讨论不完用后者。`/wayfinder` 只产出决定，不负责实现。
- **`/implement` 与 `/implement-spec`**：前者在当前会话完成一项任务；后者作为协调者用子代理完成整份规格。
- **`/triage` 与 `/to-tickets`**：分诊只处理不是你创建的 issue；`/to-tickets` 产出的任务无需再分诊。
- **`/improve-codebase-architecture` 与 `codebase-design`**：前者寻找加深模块的候选项；后者为选中的候选项做设计。
- **`prototype` 与 `research`**：前者写一次性代码回答设计问题；后者阅读一手资料回答事实问题。
- **`prototype` 与 `/walking-skeleton`**：前者写一次性代码回答局部设计问题，分支不合并进主干；后者搭建端到端可运行系统雏形，验证后保留并在其上继续开发。
- **`/to-questionnaire` 与 `/grill-me`**：前者为别人写问卷；后者追问你自己。
- **`/wait-what` 与 `/grill-with-docs`**：前者事后补救没看懂的内容；后者通过尽早约定通用语言事前预防。
- **`/pr` vs `/finish-work`**：前者专注于撰写结构化 PR 描述（摘要、证据、合并风险）；后者负责全链路交付收尾流程（门禁复核、场景自适应合并、现场清理与发布就绪核验），并在场景 2 中联动 `/pr`。
- **`/git-guardrails` 与 `/setup-pre-commit`**：前者拦截不可逆高危 Git 操作（破坏性命令守卫）；后者在提交前运行代码格式化、lint 与轻量质量测试。

## 输出格式

```
推荐：<skill 或按顺序排列的几个 skill>
原因：<一两句，对应用户描述中的具体情况>
下一步：<用户现在要输入的命令或要说的话>
```

规模判断不确定时，写出你选择的档位和理由。
