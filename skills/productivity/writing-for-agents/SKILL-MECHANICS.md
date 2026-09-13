# Skill 机制

[`writing-for-agents`](SKILL.md) 的 skill 专属分支：文档是 skill 时有哪些不同（frontmatter、调用方式选择、路由 skill）。写作本身的其他一切，看 `SKILL.md` 里的通用参考。

## Frontmatter

- `name`：英文小写字母、数字、连字符。它就是斜杠命令，保持短而可念。
- `description`：见下文调用方式。harness 常把 name 与 description 合计限制在约 1024 字符以内。
- `argument-hint`（可选）：用户调用 skill 接受参数时，提示参数是什么。
- `disable-model-invocation: true`：只在用户调用 skill 上写。

## 调用方式

两种选择，在两种负载之间权衡：

- **模型调用** skill 保留面向模型的 `description`，agent 可以自主触发它，其他 skill 也能调用它。你仍然可以键入它的名字：模型调用永远*包含*用户可达，description 只会增加 agent 的发现能力，不会拿走人类的触达。description 是这个 skill 的顶层上下文指针，必须一直常驻：用永久的上下文负载换可发现性。一个全是参考内容的模型调用 skill，也是存放共享参考的地方：其他 skill 可以调用它，所以几个 skill 都需要的参考只放一处。写法：省略 `disable-model-invocation`，description 写清触发分支（`SKILL.md` 里的指针写作规则全部适用），中英文触发词都给，因为用户两种语言都会说。
- **用户调用** skill 让 agent 够不着 description：只有人类键入名字才能触发，其他 skill 都不能。零上下文负载，但花认知负载：你就是那个得记住它存在的索引。写法：设置 `disable-model-invocation: true`；`description` 变成给人看的一句话摘要，去掉触发词清单。

只有当 agent 必须自己够到这个 skill、或者另一个 skill 必须够到它时，才选模型调用。它只会被手动触发，就做成用户调用，不付上下文负载。

两个用户调用 skill 都需要的共享参考，放在哪个里面都不行：它们都没有 description，谁也触发不了谁。把它推到 skill 体系之外的普通文件里：任何 skill 都能指向的外部参考。

## 按调用方式拆分

拆分的调用切法（顺序切法在 `SKILL.md`）：当你有一个应当独立触发它的先导词（一个你在提示里真正会用的触发词），或者另一个 skill 必须够到它时，拆出一个模型调用 skill。新的常驻 description 要付上下文负载，所以这份独立可达性必须值这个价。

## 路由 skill

用户调用 skill 多到记不住时，堆积的认知负载用一个**路由 skill** 来治：一个用户调用 skill，列出其他 skill 以及何时用哪个，人只需记住一个 skill 而不是很多个。它只能提示，不能触发它们：用户调用 skill 没有 description，除了人谁也够不着。
