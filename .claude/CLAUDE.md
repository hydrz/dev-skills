本仓库是一套中文 Agent Skills。项目术语见 [CONTEXT.md](../CONTEXT.md)，中文写作规则见 [docs/chinese-writing.md](../docs/chinese-writing.md)，写任何 skill 或文档都遵循这两份文档。

## 目录

每个 skill 一个目录，直接放在 `skills/<name>/` 下，`SKILL.md` 必需。Codex 只发现 `skills/<name>/SKILL.md` 这一层，不要再按分类建子目录；分类（工程 skill、协作与思考 skill）只体现在 `skills/README.md` 的分组中。参考文件放在同一目录，只有部分分支需要的内容才拆出去（渐进披露）。

## 登记

新增、改名、删除 skill，或改变 skill 的用法、触发方式时，同步以下位置：

1. `.claude-plugin/plugin.json` 的 `skills` 数组（发布新版本或更新元数据时，同步更新根目录 `plugin.json` 与 `.codex-plugin/plugin.json`）
2. `skills/README.md`：完整清单，放进对应分类分组，skill 名链接到其 `SKILL.md`，附中文显示名和一句话定位
3. `skills/ask-dev-skills/SKILL.md`：路由必须覆盖每个用户可以使用的 skill，否则会给出错误建议
4. 顶层 `README.md`：只保留典型场景和主工作流，不维护完整清单；只有改动影响这两部分时才更新

改完后运行：

- 静态检查与测试：`npm run check`（写作规范、元数据同步、description 预算与宿主无关措辞、prettier 格式和脚本测试，与 CI 一致）
- 改动 skill 正文后查看字符变化：`npm run report:size`（与 `HEAD` 对比主文件和完整包）
- Claude Code 校验：`claude plugin validate . --strict`
- Antigravity 校验：`agy plugin validate .`

## 触发方式

每个 `SKILL.md` 二选一，规则见 [docs/invocation.md](../docs/invocation.md)：

- **仅用户触发**（user-invoked）：frontmatter 写 `disable-model-invocation: true`。description 是给人看的一句话摘要，说明使用场景、产出结果，以及与最相近 skill 的区别。
- **可自动触发**（model-invoked）：不写该字段。description 面向 agent，写清触发分支，并同时给出中英文触发词；触发范围保持足够窄。

skill 之间的依赖写成宿主无关的“使用 `grilling` skill”，不写某个宿主的工具协议。需要多个 skill 时逐个写明，例如“分别使用 `grilling` 和 `domain-modeling` skill”。可自动触发的 skill 不调用仅用户触发的 skill；需要用户运行某个入口时，写成“告诉用户运行 `/setup-dev-skills`”。

## 写作规范

- `name` 用英文 kebab-case；正文与 description 用中文。
- 先导词首次出现时附英文原词，例如“接缝（seam）”，之后只用中文。优先使用中国开发者熟悉的说法，不为统一而沿用难懂的直译或隐喻。
- 用正向表述写目标行为；禁令只留给无法正向表述的硬性护栏，并配上正向目标。
- 标点用逗号、冒号、句号、括号，不用破折号；中文引语用全角引号“”。
- 中文与英文单词、数字之间加空格；中文与行内代码之间不强制加空格，同一文档保持一致。
- 改写已有 skill 时，先列出原有的触发条件、必需动作、边界、错误处理和完成条件，改写后逐项核对没有丢失。
