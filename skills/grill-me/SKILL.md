---
name: grill-me
description: 逐轮澄清并压力测试一个计划或设计，直到关键决策达成共识。无状态，不写入本地文件。
disable-model-invocation: true
---

使用 `grilling` skill。

本 skill 仅在对话中讨论方案，不读取、创建或修改任何本地文件。讨论在对话中完成，并在结束时输出决策清单。如果讨论涉及具体项目仓库，需要将领域术语或架构决策写入仓库文档，告诉用户运行 `/grill-with-docs`。
