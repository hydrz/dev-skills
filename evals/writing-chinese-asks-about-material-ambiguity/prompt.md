---
description: 原文中的代词会改变发布权限时，中文润色不应擅自选择一种解释
expected_outcome: 调用 writing-chinese；询问“他”指测试负责人还是发布负责人，或明确指出必须先确认这一点
tags: [writing-chinese, trigger, behavior]
max_turns: 8
allowed_tools: [Skill]
---

请把下面这句话润色得更清楚，直接给结果：

测试负责人把结果发给发布负责人后，他确认没有问题就可以把灰度比例提高到 20%。
