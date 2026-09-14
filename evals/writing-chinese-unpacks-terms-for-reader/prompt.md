---
description: 面向不熟悉研发术语的读者时，应把术语还原成具体行为而不丢失阈值
expected_outcome: 调用 writing-chinese；用客服同事能理解的语言说明熔断、降级和恢复时限，保留 P99、2 秒和 10 分钟
tags: [writing-chinese, trigger, behavior]
max_turns: 8
allowed_tools: [Skill]
---

把下面说明改写给不懂研发的客服同事看，直接给改写结果：

当下游接口的 P99 延迟超过 2 秒时，网关会触发熔断，即暂时停止调用该接口，并启用降级方案，改为返回缓存结果。值班人员需要在 10 分钟内恢复服务，RTO 不得超过 10 分钟。
