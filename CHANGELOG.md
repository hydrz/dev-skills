# dev-skills

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
