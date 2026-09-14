# 领域文档

工程类 skill 探索代码库时，应如何读取本仓库的领域文档。

## 探索之前先阅读

- 根目录的 **`CONTEXT.md`**；或者
- 根目录存在 **`CONTEXT-MAP.md`** 时阅读它：它指向每个上下文各自的 `CONTEXT.md`，阅读与当前话题相关的那些。
- **`docs/adr/`**：阅读与你将要修改的区域相关的 ADR。多上下文仓库还要查看 `src/<上下文>/docs/adr/` 中的上下文内决策。

这些文件不存在时，**直接继续，无需提示**。不必指出文件缺失，也不必提前建议创建。`domain-modeling` skill（通过 `/grill-with-docs` 和 `/improve-codebase-architecture` 触发）会在术语或决策真正确定时按需创建它们。

## 文件结构

单上下文仓库（大多数情况）：

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

## 使用术语表中的词汇

产出中提到领域概念时（issue 标题、重构建议、假设、测试名称），使用 `CONTEXT.md` 中定义的词。术语表明确标为 _避免_ 的同义词，不要使用。

需要的概念还不在术语表中，这是一个信号：要么你在使用项目并不使用的说法（重新考虑用词），要么术语表确实有缺口（记录下来，留给 `domain-modeling` 处理）。

## 指出与 ADR 的冲突

产出与已有 ADR 矛盾时，明确指出，而不是悄悄覆盖：

> _与 ADR-0007（订单事件溯源）矛盾，但值得重新讨论，因为……_
