# 工程 skill

用于需求澄清、计划、实现、调试、评审和交付的软件工程工作流。

## 仅用户触发

只有用户显式输入名称才会运行。

- **[`/guide`](./guide/SKILL.md)｜工作流导航**：不确定下一步该用哪个 skill 时运行。
- **[`/setup-dev-skills`](./setup-dev-skills/SKILL.md)｜初始化项目约定**：首次在仓库中使用工程 skill 前，配置 issue 追踪器、分诊标签、领域文档布局和范围清单约定。
- **[`/grill-with-docs`](./grill-with-docs/SKILL.md)｜带记录的方案追问**：在仓库中逐轮澄清方案，同时更新 `CONTEXT.md` 和 ADR。
- **[`/to-spec`](./to-spec/SKILL.md)｜整理规格**：把已经完成的讨论整理成可实施规格，大型工作先拆成规格集，不再追加访谈。
- **[`/to-tickets`](./to-tickets/SKILL.md)｜拆分开发任务**：把规格拆成带前置依赖的端到端最小闭环任务，确保覆盖每个范围项的每个状态。
- **[`/implement`](./implement/SKILL.md)｜当前会话实现**：在当前会话实现一项或少量已明确的任务。
- **[`/implement-spec`](./implement-spec/SKILL.md)｜整体规格并行交付**：由多个子代理并行完成整份规格，最后交付一个 PR。
- **[`/wayfinder`](./wayfinder/SKILL.md)｜大型工作决策规划**：把单个会话无法理清的大型工作拆成可逐步解决的决策问题，并建立范围清单、补齐设计依据。
- **[`/triage`](./triage/SKILL.md)｜外部 issue 分流**：分类、核实并补齐外部 issue 或 PR，使其达到可执行状态。
- **[`/improve-codebase-architecture`](./improve-codebase-architecture/SKILL.md)｜架构审查**：扫描代码库并生成可视化报告，找出值得进一步设计的重构机会。

## 可自动触发

agent 会在合适场景主动使用，用户也可以显式调用。

- **[`tdd`](./tdd/SKILL.md)｜测试驱动开发**：通过测试先失败、再通过的短循环实现功能或修复 bug。
- **[`diagnosing-bugs`](./diagnosing-bugs/SKILL.md)｜系统化诊断**：为疑难 bug、测试失败和性能退化建立可复现反馈，再定位根因。
- **[`verifying-completion`](./verifying-completion/SKILL.md)｜完成验证**：在声称完成前运行对应检查并读取完整结果。
- **[`code-review`](./code-review/SKILL.md)｜代码评审**：从仓库规范和需求规格两个维度分别检查改动。
- **[`receiving-code-review`](./receiving-code-review/SKILL.md)｜处理评审意见**：先核实意见再修改代码。
- **[`finishing-a-branch`](./finishing-a-branch/SKILL.md)｜分支收尾**：验证完成后，让用户选择合并、创建 PR 或保留分支。
- **[`domain-modeling`](./domain-modeling/SKILL.md)｜领域建模**：维护项目通用语言和 ADR。
- **[`codebase-design`](./codebase-design/SKILL.md)｜模块设计**：设计简单接口、清晰边界和更易测试的模块，并按业务复杂度决定业务模块的内部结构。
- **[`prototype`](./prototype/SKILL.md)｜一次性原型**：用最小原型回答一个设计问题。
- **[`research`](./research/SKILL.md)｜技术调研**：查阅高可信一手资料，并在仓库中留下带引用的报告。
- **[`resolving-merge-conflicts`](./resolving-merge-conflicts/SKILL.md)｜解决合并冲突**：根据双方改动意图处理 merge 或 rebase 冲突。
- **[`wizard`](./wizard/SKILL.md)｜生成设置向导**：为必须由人完成的外部配置生成交互式 Bash 向导。
