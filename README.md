# dev-skills

面向真实软件工程的中文 agent skills，不是氛围编程（vibe coding）。

思想主干来自 [mattpocock/skills](https://github.com/mattpocock/skills)：小、易改、可组合，由你掌控流程，而不是让流程掌控你。在此之上吸收了 [obra/superpowers](https://github.com/obra/superpowers) 久经实战的纪律：先证据后结论、子代理驱动开发、评审意见的接收方式、分支收尾。全部以中文重写，术语统一见 [CONTEXT.md](./CONTEXT.md)。

## 安装

两种方式，二选一（都装会让每个 skill 出现两次）。

**Claude Code 插件**：作为只读的整体订阅，随仓库更新。

```bash
claude plugin marketplace add hydrz/dev-skills
```

```bash
claude plugin install dev-skills@hydrz
```

**skills.sh**：把可编辑的 skill 文件复制进你的项目，适用于 Codex 等其他 agent，也适用于想自己改的 Claude Code 用户。安装时记得勾选 `setup-dev-skills`。

```bash
npx skills@latest add hydrz/dev-skills
```

然后在每个仓库里运行一次 `/setup-dev-skills`，配置 issue 追踪器（GitHub、GitLab、本地 Markdown 或其他）、分诊标签和领域文档布局。

记不住该用哪个？运行 `/guide`。

## 为什么需要这些 skill

它们针对 agent 编程里最常见的五种失败。

### 1. agent 没做你想要的

> "没有人确切知道自己想要什么。"
>
> 《程序员修炼之道》

最常见的失败是没对齐。解法是**拷问**：让 agent 按设计树一轮一轮追问你，事实由它去查，决策由你来定。规模有大小，仪式随之缩放，但**确认闸门**不缩放：动手之前，你必须对"要做什么"说出明确的"是"。

用 [`/grill-with-docs`](./skills/engineering/grill-with-docs/SKILL.md)（在仓库里）或 [`/grill-me`](./skills/productivity/grill-me/SKILL.md)（不在仓库里）。

### 2. agent 太啰嗦

> "有了通用语言，开发者之间的对话和代码的表达都源自同一个领域模型。"
>
> 《领域驱动设计》

agent 被扔进项目边猜行话边干活，于是用二十个字说一个字就能说清的事。解法是一份**通用语言**文档 `CONTEXT.md`，加上记录难以逆转决定的 ADR。`/grill-with-docs` 在拷问的同时把它们沉淀下来。

### 3. 代码跑不起来

> "始终迈小而审慎的步子。反馈的速度就是你的速度上限。"
>
> 《程序员修炼之道》

agent 没有反馈就是在盲飞。[`tdd`](./skills/engineering/tdd/SKILL.md) 在约定的接缝上一次一个 红 → 绿 切片；[`diagnosing-bugs`](./skills/engineering/diagnosing-bugs/SKILL.md) 在拿到一个会变红的紧反馈回路之前拒绝推理。

### 4. agent 说"搞定了"，其实没有

"应该好了""测试应该能过"是最昂贵的一句话。[`verifying-completion`](./skills/engineering/verifying-completion/SKILL.md) 要求**先证据后结论**：声称完成之前，本轮跑过对应命令并读过输出；子代理的"成功"报告要对照 diff 独立核实。

### 5. 我们造了一个大泥球

> "每天都投资于系统的设计。"
>
> 《解析极限编程》

> "最好的模块是深的：通过简单的接口提供大量功能。"
>
> 《软件设计的哲学》

agent 让写代码变快，也让熵增变快。[`codebase-design`](./skills/engineering/codebase-design/SKILL.md) 提供深模块词汇；[`/improve-codebase-architecture`](./skills/engineering/improve-codebase-architecture/SKILL.md) 每隔几天勘察一次加深机会。

## 主流程

```
/grill-with-docs → /to-spec → /to-tickets → /implement（逐张，你盯着）
                                          ↘ /implement-spec（子代理并发，离席跑完）
                         每张工单内部：tdd → code-review → verifying-completion → finishing-a-branch
```

匝道：`/triage`（外来的 issue）、`diagnosing-bugs`（坏了）、`/wayfinder`（大到一个会话装不下）。完整地图见 [`/guide`](./skills/engineering/guide/SKILL.md)。

## 清单

分两类，区别在谁能触发。**用户调用**的只有你键入名字才会触发，负责编排；**模型调用**的 agent 会在合适时自己用上，你也可以键入，负责承载可复用的纪律。用户调用的 skill 可以调用模型调用的 skill，反之不行。详见 [docs/invocation.md](./docs/invocation.md)。

### 工程

**用户调用**

- **[guide](./skills/engineering/guide/SKILL.md)**：问该用哪个 skill、走哪条流程。所有 skill 的路由。
- **[setup-dev-skills](./skills/engineering/setup-dev-skills/SKILL.md)**：为仓库配置 issue 追踪器、分诊标签和领域文档布局。每个仓库运行一次。
- **[grill-with-docs](./skills/engineering/grill-with-docs/SKILL.md)**：拷问的同时构建领域模型，就地更新 `CONTEXT.md` 和 ADR。
- **[to-spec](./skills/engineering/to-spec/SKILL.md)**：把当前对话综合成规格（含自查）并发布到 issue 追踪器。
- **[to-tickets](./skills/engineering/to-tickets/SKILL.md)**：把规格或计划拆成曳光弹工单，每张声明阻塞边与接口。
- **[implement](./skills/engineering/implement/SKILL.md)**：在当前会话里实现一份规格或几张工单，驱动 TDD，以评审和验证收尾。
- **[implement-spec](./skills/engineering/implement-spec/SKILL.md)**：用子代理按工单图前沿并发实现整份规格，逐张评审，台账扛过压缩，最后交付一个 PR 并上报所有裁决。
- **[wayfinder](./skills/engineering/wayfinder/SKILL.md)**：把一个会话装不下的庞大工作绘成决策工单地图，逐张解决直到路清晰。
- **[triage](./skills/engineering/triage/SKILL.md)**：让 issue 和外部 PR 在分诊状态机中流转，写出可交给 agent 的简报。
- **[improve-codebase-architecture](./skills/engineering/improve-codebase-architecture/SKILL.md)**：扫描加深机会，出可视化 HTML 报告，再拷问你挑中的那个。

**模型调用**

- **[tdd](./skills/engineering/tdd/SKILL.md)**：在约定接缝上一次一个垂直切片的 红 → 绿 循环，确认红得有道理，收尾做变异检查。
- **[diagnosing-bugs](./skills/engineering/diagnosing-bugs/SKILL.md)**：疑难 bug 的诊断循环：建会变红的紧回路 → 最小化 → 假设 → 插桩 → 根源处修复 → 回归测试；修三次不成就质疑架构。
- **[verifying-completion](./skills/engineering/verifying-completion/SKILL.md)**：先证据后结论，声称完成之前必须有本轮的验证输出。
- **[code-review](./skills/engineering/code-review/SKILL.md)**：标准与规格双轴并行评审，按严重度分级，评审员只读。
- **[receiving-code-review](./skills/engineering/receiving-code-review/SKILL.md)**：先核实再实现，不做表演式附和，该反驳时有理有据地反驳。
- **[finishing-a-branch](./skills/engineering/finishing-a-branch/SKILL.md)**：测试变绿后给出合并 / 开 PR / 保留三个选项，安全清理工作树。
- **[domain-modeling](./skills/engineering/domain-modeling/SKILL.md)**：主动打磨领域模型：质疑术语、造边界场景、就地更新 `CONTEXT.md` 和 ADR。
- **[codebase-design](./skills/engineering/codebase-design/SKILL.md)**：深模块的共享词汇与原则：小接口、干净的接缝、通过接口测试。
- **[prototype](./skills/engineering/prototype/SKILL.md)**：一次性原型回答一个设计问题：单文件 HTML 逻辑演示，或可切换的多个 UI 变体。
- **[research](./skills/engineering/research/SKILL.md)**：后台 agent 对照一手资料调研，留下带引用的 Markdown 文件。
- **[resolving-merge-conflicts](./skills/engineering/resolving-merge-conflicts/SKILL.md)**：逐个 hunk 按双方意图解决冲突，然后完成 merge / rebase。
- **[wizard](./skills/engineering/wizard/SKILL.md)**：生成交互式 bash 向导，带人完成只有人能做的步骤。

### 效率

**用户调用**

- **[grill-me](./skills/productivity/grill-me/SKILL.md)**：被无情拷问一个计划或设计，无状态。
- **[handoff](./skills/productivity/handoff/SKILL.md)**：把当前对话压缩成交接文档，交给另一个 agent。
- **[teach](./skills/productivity/teach/SKILL.md)**：以当前目录为有状态工作区，分多次会话学一个主题。
- **[to-questionnaire](./skills/productivity/to-questionnaire/SKILL.md)**：把你独自答不了的决定变成给别人填的问卷。
- **[wait-what](./skills/productivity/wait-what/SKILL.md)**：刚才那段没看懂，让 agent 带着背景用平实的话重讲。

**模型调用**

- **[grilling](./skills/productivity/grilling/SKILL.md)**：拷问原语：规模分档、按轮处理设计树前沿、事实归 agent 决策归你。
- **[writing-for-agents](./skills/productivity/writing-for-agents/SKILL.md)**：为 agent 写文档：上下文指针、信息层级、先导词、修剪；附用子代理压测 skill 的方法。

## 设计来源

| 本仓库 | 来自 mattpocock/skills | 吸收自 obra/superpowers |
|---|---|---|
| 整体架构 | 用户调用 / 模型调用二分、路由、小而可组合、由人掌控流程 | 未采用会话启动钩子，保持由人掌控 |
| `grilling` | 设计树、按轮问前沿、事实归 agent 决策归人 | brainstorming 的三档规模（探针 / 有界 / 架构级）与不缩放的确认闸门 |
| `to-spec` | 综合而不再访谈、测试接缝、规格模板 | 规格自查（占位符、一致性、歧义、范围）、全局约束 |
| `to-tickets` | 曳光弹垂直切片、阻塞边、扩展-收缩、不写文件路径 | writing-plans 的接口"消费 / 产出"块、无占位符、覆盖与类型一致性自查 |
| `implement-spec` | 工单图前沿、最大并发、工作树、上下文指针、合并子代理 | subagent-driven-development 的台账、状态契约、裁决记录、限次修复循环与熔断、模型选择、限定范围复审、最终一次修复 |
| `tdd` | 约定接缝、垂直切片、同义反复反模式、重构移出循环 | 确认红得有道理、先写代码就重来、变更探测器、变异检查、mock 的层级与完整性 |
| `diagnosing-bugs` | 紧反馈回路优先、最小化、3 到 5 个可证伪假设、打标签的调试日志 | 根源回溯、纵深防御、条件等待、多组件边界插桩、修三次不成质疑架构、并行诊断独立失败 |
| `code-review` | 标准 / 规格双轴并行、Fowler 坏味道基线、不跨轴重排 | 严重度分级、只读评审员、评审员不再派子代理、⚠️ 无法核实项 |
| `verifying-completion` | | verification-before-completion 全部思想 |
| `receiving-code-review` | | receiving-code-review 全部思想 |
| `finishing-a-branch` | | finishing-a-development-branch 与 using-git-worktrees 的清理规则 |
| `writing-for-agents` | 上下文指针、两种负载、信息层级、先导词、正向表述、修剪 | writing-skills 的用压力场景和子代理测试 skill、description 只写触发条件 |
| 其余 skill | 原样翻译并本地化 | |

写法上，统一遵循 mattpocock 的原则：用正向目标代替禁令、用先导词代替重复描述。superpowers 里行之有效的"借口 → 事实"表保留下来，但右列写事实与该做的事。

## 许可

MIT。本项目改编自 mattpocock/skills（Copyright (c) 2026 Matt Pocock）与 obra/superpowers（Copyright (c) 2025 Jesse Vincent），二者均为 MIT 许可，版权声明见 [LICENSE](./LICENSE)。
