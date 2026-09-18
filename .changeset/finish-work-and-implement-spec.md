---
"dev-skills": minor
---

交付链路收尾体验优化与 implement-spec 瘦身重构：

- 新增 `finish-work` 技能：重新设计交付收尾体验，替换原 `finishing-a-branch`，门禁复核后呈现本地合并、推送并创建 PR、保持现状三种选项并等待用户确认，再执行对应流程与现场清理。
- 重构 `implement-spec` 技能：消除过度设计，砍掉脆弱的 Stacked PR 依赖链维护（移除 `PER-TICKET-PR.md`）；弱化微观的逐任务独立 Reviewer 子代理与频繁物料打包（移除 `review-package.mjs` 及测试），确立“任务级 TDD/自测闭环 + 全量整分支统一评审”模式；精简提示词与账本，完整包字符缩减近 48%。
