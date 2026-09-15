---
description: 明确要求在仓库中留下带引用的调研报告时，触发 research，并以一手资料为依据
expected_outcome: 调用 research；说明调研依据官方文档或源码等一手资料，结论标注来源，并保存为仓库中的 Markdown 报告
tags: [research, trigger, behavior]
max_turns: 8
allowed_tools: [Skill, Write]
---

我们在考虑把消息队列从 RabbitMQ 换成 NATS JetStream。帮我做一份技术调研，重点是消息持久化和“至少一次”投递语义的差异，结论要有出处，报告留在仓库里，之后讨论方案时要引用。
