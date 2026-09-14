---
description: “grill me”请求应触发 grilling 的编号问题、推荐答案格式，而不是直接输出设计方案
expected_outcome: 调用 grilling；回复用 ❓ **Qn ·** 编号问题，并附 ➡️ 推荐答案，等待用户确认，而不是直接给出完整方案
tags: [grilling, trigger, behavior]
max_turns: 8
allowed_tools: [Skill]
---

grill me 一下，我想给这个电商项目加一个“收藏商品”功能，具体怎么设计我还没想清楚。
