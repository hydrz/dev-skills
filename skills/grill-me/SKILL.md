---
name: grill-me
description: 逐轮澄清并压力测试一个计划或设计，直到关键决策达成共识。无状态，不写入本地文件。
disable-model-invocation: true
---

使用 `grilling` skill。

本 skill 是纯对话的方案讨论，不读取、创建或修改任何本地文件。讨论在对话中完成并输出决策清单；如果讨论涉及具体项目仓库，且需要将领域术语或架构决策持久化到仓库，提示用户使用 `/grill-with-docs`。
