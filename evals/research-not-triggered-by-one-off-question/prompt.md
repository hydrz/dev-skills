---
description: 一次性核实 API 行为是普通问答，不应触发 research 的后台调研和写报告流程
expected_outcome: 不调用 research；直接回答问题，不在仓库中写报告
tags: [research, negative]
max_turns: 5
allowed_tools: [Skill, Write]
---

Node.js 的 `fs.rm` 里，`recursive` 和 `force` 这两个选项分别管什么？路径不存在的时候会不会报错？
