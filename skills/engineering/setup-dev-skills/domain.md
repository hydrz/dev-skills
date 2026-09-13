# 领域文档

工程类 skill 在探索代码库时，应当如何读取本仓库的领域文档。

## 探索之前，先读这些

- 根目录的 **`CONTEXT.md`**，或
- 根目录存在 **`CONTEXT-MAP.md`** 时读它：它指向每个上下文各自的 `CONTEXT.md`，读与话题相关的那些。
- **`docs/adr/`**：读涉及你将要工作区域的 ADR。多上下文仓库还要看 `src/<上下文>/docs/adr/` 里的上下文内决策。

这些文件不存在时，**静默继续**。不必指出它们缺失，也不必提前建议创建。`domain-modeling` skill（经由 `/grill-with-docs` 和 `/improve-codebase-architecture` 触发）会在术语或决策真正确定时按需创建它们。

## 文件结构

单上下文仓库（大多数）：

```
/
├── CONTEXT.md
├── docs/adr/
│   ├── 0001-event-sourced-orders.md
│   └── 0002-postgres-for-write-model.md
└── src/
```

多上下文仓库（根目录有 `CONTEXT-MAP.md`）：

```
/
├── CONTEXT-MAP.md
├── docs/adr/                          ← 系统级决策
└── src/
    ├── ordering/
    │   ├── CONTEXT.md
    │   └── docs/adr/                  ← 上下文内决策
    └── billing/
        ├── CONTEXT.md
        └── docs/adr/
```

## 使用术语表的词汇

你的产出提到领域概念时（issue 标题、重构建议、假设、测试名），使用 `CONTEXT.md` 里定义的词。术语表明确列为 _避免_ 的同义词，不要用。

需要的概念还不在术语表里，这是一个信号：要么你在发明项目并不使用的说法（重新考虑），要么确实有空缺（记下来留给 `domain-modeling`）。

## 标出 ADR 冲突

你的产出与已有 ADR 相矛盾时，显式标出，而不是悄悄覆盖：

> _与 ADR-0007（订单事件溯源）矛盾，但值得重新讨论，因为……_
