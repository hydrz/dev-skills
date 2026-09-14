---
description: 改寫中文 agent 指令時，应改善表达但完整保留触发条件、动作、边界和完成条件
expected_outcome: 调用 writing-chinese；重写后仍要求修改前确认、失败时停止、验证后才能声明完成
tags: [writing-chinese, writing-for-agents, trigger, behavior]
required_skills: [writing-chinese, writing-for-agents]
max_turns: 8
allowed_tools: [Skill]
---

把下面这段 agent 指令改得更清楚，直接给改写结果，不要减少要求：

当用户尚未对于范围做出明确的确认的情况下，不应开始文件修改。在测试执行失败之际，需要停止后续提交动作以及把失败的输出汇报给用户。只有重新运行检查并看到了通过结果以后，才可以进行已经完成的声明。
