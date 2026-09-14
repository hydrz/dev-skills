---
description: 追问面向用户的功能时，应做“角色 × 端 × 状态”的广度检查，而不是只追问主流程
expected_outcome: 调用 grilling；编号问题中至少涉及非默认状态（如余额不足、支付失败、未登录、加载或错误），以及不同客户端或角色的差异
tags: [grilling, trigger, behavior]
max_turns: 8
allowed_tools: [Skill]
---

grill me 一下：我们的短剧 App 要加“金币解锁剧集”，用户看到锁住的下一集时点一下，扣金币就能继续看。App 有 iOS、Android，还有 H5 网页版。帮我把方案问清楚。
