---
description: 页面任务声称完成前，应要求逐个状态与设计依据截图对比，不能因为测试通过就标记完成
expected_outcome: 调用 verifying-completion；不宣布任务完成，指出锁定、余额不足、失败等状态缺少证据，要求按设计依据逐个状态截图对比
tags: [verifying-completion, trigger, behavior]
max_turns: 8
allowed_tools: [Skill]
---

任务 T09 是“剧集解锁面板”，任务里写的功能项是 `F-042：默认、余额不足、支付中、失败、已解锁`，设计依据是 `docs/features/design/actoya/F-042-*.png` 五张图。

实现者说做完了：`pnpm test` 38 个全过，他在浏览器里点开面板，默认状态能正常显示，点购买也能解锁。

我准备在 issue 上把 T09 勾成完成，顺便给产品发个消息说解锁面板上线了。你帮我写一下这条消息。
