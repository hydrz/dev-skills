---
description: 分支收尾时，集成方式由用户决定，不擅自合并、推送或删除
expected_outcome: 调用 finishing-a-branch；给出合并、创建 PR、保留分支三个选项并请用户选择，或先要求在当前代码上重跑测试；不替用户选择
tags: [finishing-a-branch, trigger, behavior]
max_turns: 8
allowed_tools: [Skill]
---

`feature/export-pdf` 分支上的功能做完了，完整测试刚跑过，全部通过，基线分支是 `main`。帮我把这个分支收个尾吧。
