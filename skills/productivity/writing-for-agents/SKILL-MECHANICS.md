# Skill 机制

[`writing-for-agents`](SKILL.md) 中专门针对 skill 的部分：当文档是 skill 时有哪些不同，包括 frontmatter、触发方式选择和路由 skill。其他写作原则见 `SKILL.md` 中的通用参考。

## Frontmatter

- `name`：英文小写字母、数字和连字符。它就是斜杠命令名，要简短、易读。
- `description`：见下文“触发方式”。运行环境通常把 name 与 description 的总长度限制在约 1024 个字符以内。
- `argument-hint`（可选）：skill 接受参数时，提示用户参数是什么。
- `disable-model-invocation: true`：只写在仅用户触发的 skill 上。

## 触发方式

有两种选择，分别在两种成本之间权衡。

### 可自动触发

**可自动触发**（model-invoked）的 skill 保留面向模型的 `description`，agent 可以按场景主动触发它，其他 skill 也能调用它。

- 用户仍然可以输入它的名称。可自动触发的 skill 始终*包含*用户显式触发的能力；description 只是增加 agent 发现它的能力，不会减少用户的使用途径。
- description 是这个 skill 的顶层上下文指针，必须一直常驻上下文：用持续的上下文成本换取可发现性。
- 一个全是参考内容的可自动触发 skill，也可以作为共享参考的存放位置：其他 skill 可以调用它，所以多个 skill 都需要的参考只需放在一处。

写法：省略 `disable-model-invocation`；description 写清触发分支（`SKILL.md` 中关于指针的写作规则全部适用），并同时提供中英文触发词，因为用户两种语言都会使用。

### 仅用户触发

**仅用户触发**（user-invoked）的 skill 让 agent 看不到 description：只有用户输入名称才能触发，其他 skill 也无法触发它。

- 不消耗上下文成本，但消耗认知成本：用户需要记住它的存在。

写法：设置 `disable-model-invocation: true`；`description` 改为给人看的一句话摘要，去掉触发词清单。

### 如何选择

只有 agent 必须自己找到这个 skill，或者另一个 skill 必须调用它时，才选择可自动触发。它只会被手动触发时，就设置为仅用户触发，避免上下文成本。

两个仅用户触发的 skill 都需要的共享参考，放在任何一个 skill 中都不合适：它们都没有可供触发的 description，互相无法调用。把共享参考放到 skill 体系之外的普通文件中，作为任何 skill 都能引用的外部参考。

## 按触发方式拆分

这是按触发方式拆分 skill 的规则（按顺序拆分见 `SKILL.md`）。满足以下任一条件时，拆出一个可自动触发的 skill：

- 有一个应当独立触发它的先导词（你在提示中确实会使用的触发词）；
- 另一个 skill 必须调用它。

新的常驻 description 会消耗上下文成本，所以这种独立可调用性必须值得这份成本。

## 路由 skill

仅用户触发的 skill 多到记不住时，用一个**路由 skill** 降低认知成本：它本身是一个仅用户触发的 skill，列出其他 skill 以及各自的使用时机。用户只需记住一个 skill，而不是很多个。

路由 skill 只能提示用户使用哪个 skill，不能触发它们：仅用户触发的 skill 没有可供触发的 description，只有用户能调用。
