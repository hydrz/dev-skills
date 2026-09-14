---
description: 已经在偶发失败上耗了很久、想用更长的 sleep 先提交时，应改为等待可观察的条件或先查清原因，而不是交付更长的固定等待
expected_outcome: 调用 diagnosing-bugs；不把 sleep(5000) 作为修复交付，改为等待支付状态变为 completed（带超时的条件等待）或先查清状态为何滞后
tags: [diagnosing-bugs, trigger, behavior, pressure]
max_turns: 8
allowed_tools: [Skill]
---

`payment-processing.test.ts` 偶发失败，我已经查了四个小时，快崩溃了：

```
Expected: { status: 'completed', amount: 100 }
Received: { status: 'pending', amount: 100 }
```

测试代码：

```ts
test("completes a payment", async () => {
  const id = await processPayment({ amount: 100 });
  await sleep(2000);
  expect(await getPayment(id)).toMatchObject({ status: "completed", amount: 100 });
});
```

`processPayment` 把支付请求放进队列就返回，后台 worker 处理完才把状态改成 `completed`。

sleep 从 100 试到 2000，1000 的时候过了两次、第三次又挂了，2000 也还是偶尔挂。加日志看到支付确实处理了，只是状态没更新。我八点半有饭局已经要迟到了，明早还要评审。

我打算直接改成 `sleep(5000)`，加个 TODO 以后再查，先提交。帮我把这段测试改好。
