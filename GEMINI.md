本仓库是一套中文 agent skills。项目术语见 [CONTEXT.md](CONTEXT.md)。撰写、改写、翻译或审校成篇中文内容时使用 `writing-chinese`，并遵循 [docs/chinese-writing.md](docs/chinese-writing.md)；内容是 agent 指令时，同时使用 `writing-for-agents`。

## 目录与自定义结构

每个 skill 一个独立目录，直接放在 `skills/<name>/` 下，`SKILL.md` 必需。Codex 只发现 `skills/<name>/SKILL.md` 这一层，不要再按分类建子目录；分类（工程 skill、协作与思考 skill）只体现在 `skills/README.md` 的分组中。

Antigravity 通过 `.agents/skills.json` 自动索引 `skills` 目录下的所有技能。参考文件放在同一目录，按需拆出（渐进披露）。

## 登记与多端同步

新增、改名、删除 skill，或改变 skill 的用法、触发方式时，同步以下位置：

1. `.claude-plugin/plugin.json` 的 `skills` 数组（更新版本或元数据时，同步根目录 `plugin.json` 与 `.codex-plugin/plugin.json`）
2. `skills/README.md`：完整清单，放进对应分类分组，skill 名链接到其 `SKILL.md`，附中文显示名和一句话定位
3. `skills/ask-dev-skills/SKILL.md`：路由必须覆盖每个用户可以使用的 skill，否则会给出错误建议
4. 顶层 `README.md`：只保留典型场景和主工作流，不维护完整清单；只有改动影响这两部分时才更新

改完后运行：

- 自动同步多端元数据：`npm run sync`
- 综合静态检查与测试：`npm run check`（含 description 预算与宿主无关措辞检查）
- 改动 skill 正文后查看字符变化：`npm run report:size`
- 多端官方 CLI 校验：`npm run validate`（或单独运行 `npm run validate:claude`、`npm run validate:agy`、`npm run validate:codex`）
- 插件行为评测：`npm run eval:claude`、`npm run eval:agy`、`npm run eval:codex`

## 触发方式

每个 `SKILL.md` 二选一，规则见 [docs/invocation.md](docs/invocation.md)：

- **仅用户触发**（user-invoked）：frontmatter 写 `disable-model-invocation: true`。description 是给人看的一句话摘要，说明使用场景、产出结果，以及与最相近 skill 的区别。
- **可自动触发**（model-invoked）：不写该字段。description 面向 agent，写清触发分支，并同时给出中英文触发词；触发范围保持足够窄。

skill 之间的依赖写成宿主无关的“使用 `grilling` skill”，不写某个宿主的工具协议。需要多个 skill 时逐个写明，例如“分别使用 `grilling` 和 `domain-modeling` skill”。可自动触发的 skill 不调用仅用户触发的 skill；需要用户运行某个入口时，写成“告诉用户运行 `/setup-dev-skills`”。

## 写作规范

仓库特有的读者、术语、格式和本地化约定见 [docs/chinese-writing.md](docs/chinese-writing.md)，不在本文件重复维护。
