---
description: 澄清项目术语时，应按 CONTEXT.md 的规范格式写入术语条目
expected_outcome: 调用 domain-modeling；在 CONTEXT.md 中为“客户”和“用户”分别创建 `**词**` 条目，并各带一行 `_避免_`，标注“账户”为要避免的旧称
tags: [domain-modeling, trigger, behavior]
max_turns: 20
allowed_tools: [Read, Glob, Grep, Skill, Write, Edit]
---

我们项目刚起步，还没有 CONTEXT.md。现在代码和讨论里“账户”这个词又指下单的客户，又指登录用的账号，经常搞混。帮我把这两个概念梳理清楚，写进 CONTEXT.md，一个叫“客户”，一个叫“用户”。补充说明：一个客户可能对应多个用户账号登录下单（一对多），这一点你不用再跟我确认，直接按这个写就行，我现在没空多聊，麻烦直接产出文件。
