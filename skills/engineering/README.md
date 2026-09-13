# 工程

日常写代码用的 skill。

## 用户调用

只有你键入名字才会触发（Claude Code：`disable-model-invocation: true`）。

- **[guide](./guide/SKILL.md)**：问该用哪个 skill、走哪条流程。所有 skill 的路由。
- **[setup-dev-skills](./setup-dev-skills/SKILL.md)**：为仓库配置 issue 追踪器、分诊标签和领域文档布局。每个仓库运行一次。
- **[grill-with-docs](./grill-with-docs/SKILL.md)**：拷问的同时构建领域模型，就地更新 `CONTEXT.md` 和 ADR。
- **[to-spec](./to-spec/SKILL.md)**：把当前对话综合成规格并发布到 issue 追踪器。
- **[to-tickets](./to-tickets/SKILL.md)**：把规格或计划拆成曳光弹工单，每张声明阻塞边与接口。
- **[implement](./implement/SKILL.md)**：在当前会话里实现一份规格或几张工单。
- **[implement-spec](./implement-spec/SKILL.md)**：用子代理按工单图前沿并发实现整份规格，交付一个 PR。
- **[wayfinder](./wayfinder/SKILL.md)**：把一个会话装不下的庞大工作绘成决策工单地图，逐张解决。
- **[triage](./triage/SKILL.md)**：让 issue 和外部 PR 在分诊状态机中流转。
- **[improve-codebase-architecture](./improve-codebase-architecture/SKILL.md)**：扫描加深机会，出可视化报告，再拷问选中的那个。

## 模型调用

agent 或你都能触发（description 带触发词，agent 会在合适时用上）。

- **[tdd](./tdd/SKILL.md)**：在约定接缝上一次一个垂直切片的 红 → 绿 循环。
- **[diagnosing-bugs](./diagnosing-bugs/SKILL.md)**：疑难 bug 与性能退化的诊断循环。
- **[verifying-completion](./verifying-completion/SKILL.md)**：先证据后结论。
- **[code-review](./code-review/SKILL.md)**：标准与规格双轴并行评审。
- **[receiving-code-review](./receiving-code-review/SKILL.md)**：先核实再实现地处理评审意见。
- **[finishing-a-branch](./finishing-a-branch/SKILL.md)**：验证测试，给出合并 / 开 PR / 保留选项，清理工作树。
- **[domain-modeling](./domain-modeling/SKILL.md)**：主动打磨领域模型，维护 `CONTEXT.md` 和 ADR。
- **[codebase-design](./codebase-design/SKILL.md)**：深模块的共享词汇与原则。
- **[prototype](./prototype/SKILL.md)**：用一次性原型回答一个设计问题。
- **[research](./research/SKILL.md)**：后台 agent 对照一手资料调研，留下带引用的文件。
- **[resolving-merge-conflicts](./resolving-merge-conflicts/SKILL.md)**：按双方意图解决 merge / rebase 冲突。
- **[wizard](./wizard/SKILL.md)**：生成交互式 bash 向导，带人完成只有人能做的步骤。
