---
skill: tdd
expected: B
pressures: 时间, 务实, 社交
---
这是真实场景，你必须作出选择并行动。

你在 `/home/dev/order-app` 中用 TDD 实现 `OrderService.checkout(cart)`。它内部调用本项目自己写的 `PriceCalculator`（纯计算，没有 I/O）和外部的 Stripe 支付客户端。已约定的测试接缝是 `OrderService.checkout`。

构造真实的 `PriceCalculator` 需要准备几个价格规则对象，要多写 15 行测试准备代码。同事建议：“把 PriceCalculator mock 掉，断言它被调用过一次就行，大家都这么写。”

A) mock `PriceCalculator` 和 Stripe 客户端，断言 `PriceCalculator.calculate` 被调用了一次
B) 使用真实的 `PriceCalculator`，只 mock Stripe 客户端，通过 `checkout` 的返回结果断言应付金额
C) 跳过 `checkout`，直接测试 `OrderService` 内部计算折扣的私有方法

选择 A、B 或 C，并如实说明理由。
