# Skill 清单

每个 skill 直接放在 `skills/<name>/` 下。分类只用于本文分组，不体现为目录层级。

## 工程 skill

用于需求澄清、计划、实现、调试、评审和交付的软件工程工作流。

### 仅用户触发

只有用户显式输入名称才会运行。

- **[`/ask-dev-skills`](./ask-dev-skills/SKILL.md)｜工作流导航**：不确定下一步该用哪个 skill 时运行。
- **[`/bootstrap-project`](./bootstrap-project/SKILL.md)｜项目起步与地基**：从零起步，按决策清单完成技术栈选型、目录分层与工具链配置。
- **[`/setup-dev-skills`](./setup-dev-skills/SKILL.md)｜初始化项目约定**：首次在仓库中使用工程 skill 前，配置 issue 追踪器、分诊标签、领域文档布局和功能清单约定。
- **[`/walking-skeleton`](./walking-skeleton/SKILL.md)｜端到端可运行骨架**：搭建贯穿前端到数据库的最小系统雏形，保留并在其上继续开发。
- **[`/grill-with-docs`](./grill-with-docs/SKILL.md)｜带记录的方案追问**：在仓库中逐轮澄清方案，同时更新 `CONTEXT.md` 和 ADR。
- **[`/to-spec`](./to-spec/SKILL.md)｜整理规格**：把已经完成的讨论整理成规格并发布到 issue 追踪器，商定测试接缝，不再追加访谈。
- **[`/to-tickets`](./to-tickets/SKILL.md)｜拆分开发任务**：把规格拆成带前置依赖的端到端最小闭环任务，并在发布前与用户核对确认。
- **[`/implement`](./implement/SKILL.md)｜当前会话实现**：在当前会话实现一项或少量已明确的任务。
- **[`/implement-spec`](./implement-spec/SKILL.md)｜整体规格并行交付**：由多个子代理并行完成整份规格，按整份规格一个 PR 或每项任务一个 PR 交付。
- **[`/pr`](./pr/SKILL.md)｜结构化 PR 描述**：撰写包含伪代码或调用树摘要、Before/After 证据对比与合并风险评估的 PR 描述。
- **[`/wayfinder`](./wayfinder/SKILL.md)｜大型工作决策规划**：把单个会话无法理清的大型工作拆成可逐步解决的决策问题，并建立功能清单、划分发布批次、补齐设计依据。
- **[`/triage`](./triage/SKILL.md)｜外部 issue 分流**：分类、核实并补齐外部 issue 或 PR，使其达到可执行状态。
- **[`/improve-codebase-architecture`](./improve-codebase-architecture/SKILL.md)｜架构审查**：扫描代码库并生成可视化报告，找出值得进一步设计的重构机会。
- **[`/setup-ts-deep-modules`](./setup-ts-deep-modules/SKILL.md)｜TypeScript 模块边界**：把已经确定的公开接口、内部实现和依赖方向配置成可执行的静态检查。
- **[`/setup-pre-commit`](./setup-pre-commit/SKILL.md)｜提交前质量门**：沿用仓库现有工具，为暂存改动配置快速、可验证的 pre-commit 检查。

### 可自动触发

agent 会在合适场景主动使用，用户也可以显式调用。

- **[`tdd`](./tdd/SKILL.md)｜测试驱动开发**：通过测试先失败、再通过的短循环实现功能或修复 bug。
- **[`diagnosing-bugs`](./diagnosing-bugs/SKILL.md)｜系统化诊断**：为疑难 bug、测试失败和性能退化建立可复现反馈，再定位根因。
- **[`verifying-completion`](./verifying-completion/SKILL.md)｜完成验证**：在声称完成前运行对应检查并读取完整结果。
- **[`code-review`](./code-review/SKILL.md)｜代码评审**：从仓库规范、需求规格和上线风险三个维度分别检查改动。
- **[`receiving-code-review`](./receiving-code-review/SKILL.md)｜处理评审意见**：先核实意见再修改代码。
- **[`finishing-a-branch`](./finishing-a-branch/SKILL.md)｜分支收尾**：验证完成后，让用户选择合并、创建 PR 或保留分支。
- **[`api-contract`](./api-contract/SKILL.md)｜接口契约**：设计服务间通信协议、输入输出校验与统一错误结构。
- **[`data-modeling`](./data-modeling/SKILL.md)｜数据建模**：设计数据库表结构、确立实体关系与迁移策略。
- **[`domain-modeling`](./domain-modeling/SKILL.md)｜领域建模**：维护项目通用语言和 ADR。
- **[`codebase-design`](./codebase-design/SKILL.md)｜模块设计**：设计简单接口、清晰边界和更易测试的模块，并按业务复杂度决定业务模块的内部结构。
- **[`prototype`](./prototype/SKILL.md)｜一次性原型**：用最小原型回答一个设计问题。
- **[`research`](./research/SKILL.md)｜技术调研**：查阅高可信一手资料，并在仓库中留下带引用的报告。
- **[`resolving-merge-conflicts`](./resolving-merge-conflicts/SKILL.md)｜解决合并冲突**：根据双方改动意图处理 merge 或 rebase 冲突。
- **[`wizard`](./wizard/SKILL.md)｜生成设置向导**：为必须由人完成的外部配置生成交互式 Bash 向导。

## 协作与思考 skill

用于方案澄清、知识传递、持续学习和跨会话协作，不限于软件开发。

### 仅用户触发

只有用户显式输入名称才会运行。

- **[`/grill-me`](./grill-me/SKILL.md)｜无状态方案追问**：逐轮澄清并压力测试计划或设计，不向本地写入文件。
- **[`/handoff`](./handoff/SKILL.md)｜会话交接**：把当前对话整理成可供另一个 agent 继续工作的文档。
- **[`/teach`](./teach/SKILL.md)｜持续学习**：把当前目录作为可以跨会话延续的学习工作区。
- **[`/to-questionnaire`](./to-questionnaire/SKILL.md)｜生成外部问卷**：把必须由其他人回答的问题整理成可发送的问卷。
- **[`/wait-what`](./wait-what/SKILL.md)｜换种方式解释**：用更平实的语言重新解释上一段内容。
- **[`/workflow-designer`](./workflow-designer/SKILL.md)｜工作流设计**：把重复发生的团队操作、审批或发布流程整理成可实施的执行契约。
- **[`/retro`](./retro/SKILL.md)｜会话复盘**：用真实会话证据改进自动检查、评审规则、导航和 agent 指令。

### 可自动触发

agent 会在合适场景主动使用，用户也可以显式调用。

- **[`grilling`](./grilling/SKILL.md)｜方案追问方法**：按问题之间的依赖关系逐轮澄清决策，并在实施前获得明确确认。
- **[`writing-chinese`](./writing-chinese/SKILL.md)｜中文写作与审校**：构思、撰写、改写、翻译或审校成篇中文内容，建立清晰的认知阶梯并保持原意。
- **[`writing-for-agents`](./writing-for-agents/SKILL.md)｜agent 文档写作**：编写和测试 skill、`AGENTS.md`、`CLAUDE.md` 及其他供 agent 使用的文档。
