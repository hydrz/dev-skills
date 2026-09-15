---
name: grill-with-docs
description: 在仓库中逐轮澄清并压力测试计划或设计，同时更新 `CONTEXT.md` 和 ADR。无需写入项目文件时使用 grill-me。
disable-model-invocation: true
---

分别使用 `grilling` 和 `domain-modeling` skill，在澄清计划的同时同步维护仓库的领域模型与架构决策。

## 协作流程

1. **逐轮追问。** 使用 `grilling` skill 推进计划与设计讨论，按轮次提出当前待确认项。
2. **就地记录术语。** 讨论中一旦确定新领域术语或消除了概念歧义，按照 `domain-modeling` skill 立即更新 `CONTEXT.md`，逐个记录，不要攒到最后。
3. **记录重大决策。** 双方对关键决策达成共识后，如果该决策难以逆转、缺少上下文时容易让人意外且确实存在取舍，在 `docs/adr/` 创建 ADR 记录。
4. **结束汇总。** 追问结束时，在对话中输出决策清单，并列出本轮新建或更新的文档路径（如 `CONTEXT.md`、新建的 ADR）。
