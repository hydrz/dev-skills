本仓库是一套中文 agent skills。领域词汇见 [CONTEXT.md](../CONTEXT.md)，写任何 skill 或文档都用其中的术语。

## 目录

Skill 按桶放在 `skills/` 下：

- `engineering/`：日常写代码
- `productivity/`：日常非代码工作流

每个 skill 一个目录，`SKILL.md` 必需，参考文件放在同目录，按需拆出（渐进披露）。

## 登记

新增、改名、删除或改变 skill 的用法时，同步四处：

1. `.claude-plugin/plugin.json` 的 `skills` 数组
2. 顶层 `README.md` 的清单（skill 名链接到其 `SKILL.md`）
3. 所在桶的 `README.md`
4. `skills/engineering/guide/SKILL.md`（路由必须覆盖每个用户可达的 skill，不然就是会撒谎的路由）

改完清单后运行 `claude plugin validate . --strict`。

## 调用方式

每个 `SKILL.md` 二选一，规则见 [docs/invocation.md](../docs/invocation.md)：

- **用户调用**：frontmatter 写 `disable-model-invocation: true`，description 是给人看的一句话摘要。
- **模型调用**：不写该字段，description 面向模型，写清触发分支，中英文触发词都给。

Skill 之间的依赖写成"调用 Skill 工具，参数为 `grilling`"，一次调用一个 skill。前置条件是用户调用 skill 时，写成"告诉用户运行 `/setup-dev-skills`"。

## 写作规范

- `name` 用英文 kebab-case；正文与 description 用中文。
- 先导词首次出现时附英文原词，例如"接缝（seam）"，之后只用中文。
- 用正向表述写目标行为；禁令只留给无法正向表述的硬护栏，并配上正向目标。
- 标点用逗号、冒号、句号、括号，不用破折号。
- 中英文、中文与数字之间加空格。
