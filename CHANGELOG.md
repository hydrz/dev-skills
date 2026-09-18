# dev-skills

## 0.8.1

### Patch Changes

- [#81](https://github.com/hydrz/dev-skills/pull/81) [`490b646`](https://github.com/hydrz/dev-skills/commit/490b646b0bd434072e2db3bbd9aa856eaba5e16c) Thanks [@hydrz](https://github.com/hydrz)! - 重写根 README 的技能全景：按使用时机分成 7 组，每组给出一句话定位、起点命令和逐条 skill 说明，修正了旧摘要表缺失的 `/pr`、`/git-guardrails` 和错误的技能总数（38 → 40）。核心交付主干改成完整编号步骤，把自动触发点（`tdd` → `code-review` → `verifying-completion`）和 `finish-work` 内部才会调用的 `pr` 摆在正确位置。删除与根 README 重复维护、已经漂移的 `skills/README.md`，同步移除对应的元数据校验和 `GEMINI.md` 登记清单。

## 0.8.0

### Minor Changes

- [#78](https://github.com/hydrz/dev-skills/pull/78) [`825d9d2`](https://github.com/hydrz/dev-skills/commit/825d9d26cef3b2c57bfff15aeebb21f85a24f187) Thanks [@hydrz](https://github.com/hydrz)! - 交付链路收尾体验优化与 implement-spec 瘦身重构：
  
  - 新增 `finish-work` 技能：重新设计交付收尾体验，替换原 `finishing-a-branch`，门禁复核后呈现本地合并、推送并创建 PR、保持现状三种选项并等待用户确认，再执行对应流程与现场清理。
  - 重构 `implement-spec` 技能：消除过度设计，砍掉脆弱的 Stacked PR 依赖链维护（移除 `PER-TICKET-PR.md`）；弱化微观的逐任务独立 Reviewer 子代理与频繁物料打包（移除 `review-package.mjs` 及测试），确立“任务级 TDD/自测闭环 + 全量整分支统一评审”模式；精简提示词与账本，完整包字符缩减近 48%。

## 0.7.0

### Minor Changes

- [#76](https://github.com/hydrz/dev-skills/pull/76) [`547c5bf`](https://github.com/hydrz/dev-skills/commit/547c5bf10cbea5e48b6dd65bc17bd02d97ce269c) Thanks [@hydrz](https://github.com/hydrz)! - 吸收与融合上游技能优秀实践 ([#70](https://github.com/hydrz/dev-skills/issues/70))：
  - 新增 `/pr` 技能（[#71](https://github.com/hydrz/dev-skills/issues/71)）：结构化撰写 PR 描述（伪代码/调用树、Before/After 鲜明对比与单向门/爆炸半径风险评估），并与 `finishing-a-branch` 闭环联动。
  - 增强 `writing-chinese` 技能（[#72](https://github.com/hydrz/dev-skills/issues/72)）：引入行文构思与地道中文认知推进规范，确立“认知铺垫（先铺垫后引用）”、“推进单元与行文步调”及“按需取材与裁剪（素材是候选池，不是宣讲脚本）”，全面恢复 `vs` 对比语义。
  - 新增 `/git-guardrails` 技能（[#73](https://github.com/hydrz/dev-skills/issues/73)）：提供宿主中立的本地 Git 防破坏拦截向导，支持原生 Git Hooks 与 Claude Code 等多宿主防御，附带 10 项专项回归测试。
  - 优化 `implement-spec` 技能（[#74](https://github.com/hydrz/dev-skills/issues/74)）：审查物料生成解耦，优先使用纯原生 Git 管道生成 diff，消除 Node.js 脚本硬依赖。
  - 全库多端同步与终验（[#75](https://github.com/hydrz/dev-skills/issues/75)）：同步元数据清单，全量测试套件、写作规范与格式门禁 100% 变绿通过。

## 0.6.5

### Patch Changes

- [#68](https://github.com/hydrz/dev-skills/pull/68) [`89b6d37`](https://github.com/hydrz/dev-skills/commit/89b6d373feee0ebe2882361bbad552d30116ae91) Thanks [@hydrz](https://github.com/hydrz)! - 全面对齐敏捷原型流规范：重构功能清单（feature-list）规范与模板，彻底移除旧版“规格拆分表”与全状态矩阵强制回填残留；优化完成验证（verifying-completion）证据标准，以任务验收标准和测试断言为准，移除死板的全状态强制截图门禁；微调测试驱动开发（tdd）端到端测试定义并更新领域术语表。

## 0.6.4

### Patch Changes

- [#66](https://github.com/hydrz/dev-skills/pull/66) [`0d373b4`](https://github.com/hydrz/dev-skills/commit/0d373b459a481ad631ff9f3d4e8913d9a9fe3a7c) Thanks [@hydrz](https://github.com/hydrz)! - 将 `implement`、`implement-spec` 与 `wayfinder` 全面适配敏捷原型流：`implement` 回归轻量切片实现节奏，移除死板页面截图硬门禁；`implement-spec` 移除预检阶段旧版接口依赖/提供矩阵与覆盖检查脚本硬性门禁，优化实现者与评审者提示词；`wayfinder` 清除旧版重型工程残留（如“规格拆分表”、因缺少功能清单 `/to-spec` 强行阻断等），顺畅交接敏捷交付主流程。

## 0.6.3

### Patch Changes

- [#64](https://github.com/hydrz/dev-skills/pull/64) [`af652e9`](https://github.com/hydrz/dev-skills/commit/af652e954848e02295a149886ec3ec9e3ec9da71) Thanks [@hydrz](https://github.com/hydrz)! - 将 `to-spec` 与 `to-tickets` 改为敏捷原型流，彻底对齐 Matt Pocock 原版理念：`to-spec` 聚焦对话综合、商定测试接缝并内联规格模板；`to-tickets` 聚焦端到端最小闭环切分、预备性重构、扩展-迁移-收缩模式与逐项核对确认，并内联任务与 issue 模板；同时清理根目录 `CONTEXT.md` 中的过时规格表述，统一规范中文工程用语。

## 0.6.2

### Patch Changes

- [#62](https://github.com/hydrz/dev-skills/pull/62) [`9dad551`](https://github.com/hydrz/dev-skills/commit/9dad551ae909593eb209baa507734a4b277a12fe) Thanks [@hydrz](https://github.com/hydrz)! - 对齐 grill-me、grill-with-docs 与 grilling 到 Matt Pocock 原版规范，还原设计树与待确认项（frontier）机制，统一分轮提问与推荐格式，并精简评测用例。

## 0.6.1

### Patch Changes

- [#60](https://github.com/hydrz/dev-skills/pull/60) [`29f6c7f`](https://github.com/hydrz/dev-skills/commit/29f6c7fe087ed091427cf98b397d298428bb0066) Thanks [@hydrz](https://github.com/hydrz)! - 重构 `prototype` skill 及其关联定义，彻底对齐 Matt Pocock 原版设计意图

## 0.6.0

### Minor Changes

- 新增“起步与地基”类技能，补齐从零到一阶段的工程指导能力：
  
  - 新增 `bootstrap-project`：覆盖技术栈选型、目录分层与工具链配置的决策清单（保持技术栈无关），并在 README 建立“0. 起步与地基”分类。
  - 新增 `data-modeling`：覆盖实体关系（ER）设计、ORM 选型、零停机迁移（Expand & Contract）与种子数据规划，并与 `domain-modeling` 双向消歧。
  - 新增 `api-contract`：覆盖通信协议选型（REST/RPC/GraphQL）、输入输出严格校验防泄漏与统一错误模型 Envelope。
  - 新增 `walking-skeleton`：覆盖端到端可运行系统雏形搭建与冒烟测试验证（保留在主干持续演进，与 `prototype` 互指）。
  - 补全 `ask-dev-skills` 的从零起步完整路径，更新 README 技能全景速览（扩展至 38 项技能、7 大模块）。

## 0.5.6

### Patch Changes

- 整理评测脚本与技能测试目录：将评测实现与测试平铺收敛到 `scripts/eval/`，将技能相关测试集中到 `scripts/skills-tests/`，并同步更新命令入口和引用路径。

## 0.5.5

### Patch Changes

- [#51](https://github.com/hydrz/dev-skills/pull/51) [`8a58016`](https://github.com/hydrz/dev-skills/commit/8a580161456782378db78cf4b5e5a0fae5d4a179) Thanks [@hydrz](https://github.com/hydrz)! - 统一评测执行与仓库元数据校验，补充安装资产同步检查和回归测试。

## 0.5.4

### Patch Changes

- [#49](https://github.com/hydrz/dev-skills/pull/49) [`d0430e3`](https://github.com/hydrz/dev-skills/commit/d0430e3b397eafc62c4163f3b7e0df3b222905b9) Thanks [@hydrz](https://github.com/hydrz)! - `improve-codebase-architecture` 的审查报告新增"已排除项"一节：强制列出探索阶段发现但未入选的候选，并点名被哪条标准挡下，证明报告是筛过一圈之后的结果。

## 0.5.3

### Patch Changes

- [#47](https://github.com/hydrz/dev-skills/pull/47) [`6fbb635`](https://github.com/hydrz/dev-skills/commit/6fbb635794a2a9846a1834875047be05a8610363) Thanks [@hydrz](https://github.com/hydrz)! - 统一 `eval:codex`、`eval:agy` 与 `eval:claude` 的输入参数和输出格式：`--ablation` 替代 `--arm`、新增 `--concurrency`/`--quick`、退出码对齐官方语义，两者都输出 `aggregate-result.json`。移除 Codex/Antigravity 评测中把技能正文注入 prompt 的做法，改为纯原生技能发现；修复由此暴露出的多个问题：grill-me 评测用例缺少技能标签、`skill-fired` grader 匹配错了技能名、agy 的 `--sandbox` 参数用法、agy 经 shell 转发时多行 prompt 被打散、agy 报告页时间戳解析崩溃，以及报告页把"不支持判定"错误渲染成红色失败。

## 0.5.2

### Patch Changes

- [#42](https://github.com/hydrz/dev-skills/pull/42) [`6a0b551`](https://github.com/hydrz/dev-skills/commit/6a0b551bc36496ba2c427b2064a88e63c4a98144) Thanks [@hydrz](https://github.com/hydrz)! - 优化方案推敲与追问体验：`grilling` 增加选项字母编号与推荐理由，方便用户快速回复，完善超大工作建议用户运行 `/wayfinder` 的协同指引，并在结束时输出决策清单；`grill-with-docs` 明确追问过程中同步更新 `CONTEXT.md` 与 ADR 的协作流程；`grill-me` 明确仅在对话中讨论、不修改本地文件的行为边界。

## 0.5.1

### Patch Changes

- [`411a561`](https://github.com/hydrz/dev-skills/commit/411a561ee55b9fc8b0d1f4f5d5a214f75f6fbb35) Thanks [@hydrz](https://github.com/hydrz)! - 提升跨平台与操作系统兼容性：新增 `.gitattributes` 锁定换行符为 LF；统一 CLI 入口和 shell 脚本的 POSIX 可执行权限；`eval-antigravity` 支持 Windows 下以脚本方式调起 `agy`；`lint-writing` 支持 CRLF 换行符解析。

- [#41](https://github.com/hydrz/dev-skills/pull/41) [`d0ef8ee`](https://github.com/hydrz/dev-skills/commit/d0ef8ee3ba06179eaa728dcfdf193a2e3dc94c21) Thanks [@hydrz](https://github.com/hydrz)! - 重构 `lint-writing` 静态检查：移除教条的破折号封杀与冗余的 frontmatter 校验；增加半角标点误用、冒号规范、斜杠顿号替代、中文括号与机翻黑话拦截规则；支持多层嵌套代码块与局部豁免，并补充完整自动化测试套件。

## 0.5.0

### Minor Changes

- [#38](https://github.com/hydrz/dev-skills/pull/38) [`f51df31`](https://github.com/hydrz/dev-skills/commit/f51df311fd35af59f2ccc5956787ffd926baed23) Thanks [@hydrz](https://github.com/hydrz)! - 降低 skill 的上下文成本：精简可自动触发 skill 的 description，skill 之间的依赖改为宿主无关的写法；`research` 只在明确要求留下调研报告时触发；`code-review` 按 diff 规模和风险决定子代理数量；`ask-dev-skills`、`finishing-a-branch`、`wayfinder`、`implement-spec`、`to-spec` 与 `to-tickets` 把条件分支或长模板拆到按需读取的参考文件；新增 description 预算和宿主绑定措辞检查。

## 0.4.0

### Minor Changes

- [#36](https://github.com/hydrz/dev-skills/pull/36) [`0c2121c`](https://github.com/hydrz/dev-skills/commit/0c2121ce36482e7ada0f9e745f16548b495ec08f) Thanks [@hydrz](https://github.com/hydrz)! - 新增 `writing-chinese`，用于撰写、改写、翻译和审校成篇中文内容。它按原意、结构、前提、指代、句子和书写形式分层检查，保留简繁变体与专业约束，并通过行为评测防止重要歧义被擅自消除或普通短对话被误触发。

## 0.3.0

### Minor Changes

- [#34](https://github.com/hydrz/dev-skills/pull/34) [`7ed592d`](https://github.com/hydrz/dev-skills/commit/7ed592deac335843856c6360556f3e344ea40633) Thanks [@hydrz](https://github.com/hydrz)! - `code-review` 新增上线风险维度：第三个并行子代理逐类检查数据迁移、对外契约、安全、依赖与运行环境、并发与性能，与规范、规格分开报告。`tdd` 和 `diagnosing-bugs` 新增常见借口与对应事实表，`diagnosing-bugs` 补充确实找不到根因时的收尾方式，并新增两个压力场景评测。`writing-for-agents` 新增按失败类型选择写法，`TESTING.md` 新增措辞对照测试和事后追问。`implement-spec` 评审模板要求合批评审逐文件核对 diff，复审以问题已不存在为已解决标准并先确认修复报告的测试证据。`to-tickets` 把准备和脚手架步骤并入需要它们的任务。

## 0.2.1

### Patch Changes

- [#32](https://github.com/hydrz/dev-skills/pull/32) [`f9c3cc2`](https://github.com/hydrz/dev-skills/commit/f9c3cc2b27107f7164cb01119b3b06acb12420cb) Thanks [@hydrz](https://github.com/hydrz)! - `implement-spec` 新增 `review-package.mjs`，把提交列表、stat 摘要和带上下文的 diff 写入一个文件，并拒绝不是祖先的 BASE 和空范围，评审和复审都用它生成材料。`diagnosing-bugs` 新增 `TEST-POLLUTION.md` 和 `scripts/find-polluter.mjs`：逐个运行测试找出留下多余文件的测试，或二分查找让另一个测试一起运行才失败的测试。两个脚本只依赖 Node.js 标准库，Windows 上可以直接运行。

- [#30](https://github.com/hydrz/dev-skills/pull/30) [`3341e59`](https://github.com/hydrz/dev-skills/commit/3341e59aedc22949ced1fee8e1a5086d4bb65257) Thanks [@hydrz](https://github.com/hydrz)! - `implement` 和 `implement-spec` 新增工作树准备说明：先检测是否已在工作树中（排除子模块），优先使用运行环境自带的工具，用 git 创建时确认目录已被忽略并安装依赖，沙箱拒绝时的退路。`finishing-a-branch` 改用 `git rev-parse --path-format=absolute` 识别工作树，修复 Windows Git Bash 下在子目录中把普通仓库误判为工作树的问题。`implement-spec` 支持把同类小改动合成一个批次派发和评审。`tdd` 的测试警示信号清单补充读取源码文本、只测框架、断言 mock 和 mock 过多等情况。

## 0.2.0

### Minor Changes

- [#18](https://github.com/hydrz/dev-skills/pull/18) [`7c09dd6`](https://github.com/hydrz/dev-skills/commit/7c09dd68ae95f1f7f1c905dea8ec8a5e2131c4cd) Thanks [@hydrz](https://github.com/hydrz)! - 新增功能清单约定，避免大型工作交付时缺功能或偏离设计：`wayfinder` 建立功能清单并新增 `design` 决策项；`to-spec` 先产出规格拆分表并要求链接依据文档；`to-tickets` 按功能项和状态核对覆盖后才发布；`prototype` 把结论写回设计依据；实现、评审和完成验证逐个状态对照设计依据；缩减范围必须由用户确认。

- [#19](https://github.com/hydrz/dev-skills/pull/19) [`e4d4327`](https://github.com/hydrz/dev-skills/commit/e4d43279c9d36198f4e329182ebbc0bbfdc158df) Thanks [@hydrz](https://github.com/hydrz)! - 功能清单增加发布批次，规格、任务覆盖和完成验证只核对当前批次；`to-spec` 按“模块 × 批次”拆分规格，新增非功能需求一节，并在规格中一次确定测试层次、接缝和页面状态的自动检查工具；`wayfinder` 纳入非功能需求，允许把同一模块的普通页面合并成一个设计决策项。

- [#22](https://github.com/hydrz/dev-skills/pull/22) [`d79d19e`](https://github.com/hydrz/dev-skills/commit/d79d19ef94c6c6d166567c00b30603ab8aa93970) Thanks [@hydrz](https://github.com/hydrz)! - 新增覆盖检查脚本 `check-feature-coverage.mjs`，由 `setup-dev-skills` 复制到项目，`to-tickets` 发布前和 `implement-spec` 预检、最终验证时运行；任务覆盖、评审和完成验证只核对当前批次，并纳入非功能需求；页面每个状态都要有可以重复运行的自动化检查；`tdd`、`implement` 沿用规格中确定的测试层次和接缝；`implement-spec` 支持每项任务一个 PR 和合并授权；缺少截图工具时生成用户可在本机运行的命令。

### Patch Changes

- [#26](https://github.com/hydrz/dev-skills/pull/26) [`23f143f`](https://github.com/hydrz/dev-skills/commit/23f143f90941a2fb729efc89106dbc9f84794ed9) Thanks [@hydrz](https://github.com/hydrz)! - 将 skill 目录扁平化为 `skills/<name>/`，修复 Codex 插件安装后发现不到任何 skill 的问题。两个分类 README 合并为 `skills/README.md`，同步更新插件清单、Antigravity 索引、校验脚本和项目说明，并新增嵌套 skill 目录的静态检查。

- [#21](https://github.com/hydrz/dev-skills/pull/21) [`1d3c021`](https://github.com/hydrz/dev-skills/commit/1d3c02107085b1fa4e11017bc7afbc4a142d15fe) Thanks [@hydrz](https://github.com/hydrz)! - 新增 `to-spec`、`to-tickets` 按正文执行的评测用例，prompt 由模板和 skill 正文生成并由测试保证一致；`wizard`、`diagnosing-bugs` 写明 Windows 上在 Git Bash 或 WSL 中运行 bash 脚本。

- [#24](https://github.com/hydrz/dev-skills/pull/24) [`d56895f`](https://github.com/hydrz/dev-skills/commit/d56895f5e506fe8aaedc27f8d719986e9952935f) Thanks [@hydrz](https://github.com/hydrz)! - 重命名路由技能 `guide` 为 `ask-dev-skills`，同步更新插件清单、分类 README、项目说明与上下文定义。

- [#23](https://github.com/hydrz/dev-skills/pull/23) [`4bc1aa2`](https://github.com/hydrz/dev-skills/commit/4bc1aa2337654098cc7efaa0e496725bbf627259) Thanks [@hydrz](https://github.com/hydrz)! - `implement-spec` 每项任务一个 PR 时写明依赖 PR 的处理顺序：前置 PR 合并后，先把依赖 PR 的目标分支改为主干，再删除前置分支，避免依赖 PR 被关闭且无法重新打开；改完目标分支后让 CI 重新运行并通过，才视为可以合并。
