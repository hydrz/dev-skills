---
description: 实现新函数时，tdd 应被触发，并且先写测试文件再写实现文件
expected_outcome: 调用 tdd skill；src/parseDuration.test.ts 在 src/parseDuration.ts 之前被写入
tags: [tdd, trigger, behavior]
max_turns: 25
timeout_seconds: 600
allowed_tools: [Read, Glob, Grep, Skill, Write, Edit]
---

用 TDD 帮我写一个 TypeScript 函数 `parseDuration(input: string): number`，把 "1h30m"、"45s"、"2h" 这样的字符串转成秒数，格式不合法时抛出错误。

项目用 vitest。测试放在 `src/parseDuration.test.ts`，实现放在 `src/parseDuration.ts`。这个环境里不能运行命令，写好文件后告诉我应该怎么运行测试。
