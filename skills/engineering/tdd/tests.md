# 好测试与坏测试

## 好测试

**集成风格**：通过真实接口测试，不 mock 内部部件。

```typescript
// 好：测试可观察的行为
test("用户可以用有效购物车结账", async () => {
  const cart = createCart();
  cart.add(product);
  const result = await checkout(cart, paymentMethod);
  expect(result.status).toBe("confirmed");
});
```

特征：

- 测的是用户或调用方关心的行为
- 只用公开 API
- 扛得住内部重构
- 描述"做什么"，不描述"怎么做"
- 每个测试一个逻辑断言
- 测试名里出现"和"，就拆成两个

## 坏测试

**实现细节测试**：与内部结构耦合。

```typescript
// 坏：测试实现细节
test("checkout 调用了 paymentService.process", async () => {
  const mockPayment = jest.mock(paymentService);
  await checkout(cart, payment);
  expect(mockPayment.process).toHaveBeenCalledWith(cart.total);
});
```

危险信号：

- mock 内部协作者
- 测试私有方法
- 断言调用次数或调用顺序（除非它们本身就是契约）
- 行为没变，重构后测试挂了
- 测试名描述"怎么做"而不是"做什么"
- 绕过接口，从外部验证

```typescript
// 坏：绕过接口验证
test("createUser 写入了数据库", async () => {
  await createUser({ name: "Alice" });
  const row = await db.query("SELECT * FROM users WHERE name = ?", ["Alice"]);
  expect(row).toBeDefined();
});

// 好：通过接口验证
test("createUser 创建的用户可以被取回", async () => {
  const user = await createUser({ name: "Alice" });
  const retrieved = await getUser(user.id);
  expect(retrieved.name).toBe("Alice");
});
```

**同义反复测试**：期望值复述了实现，测试天生通过。

```typescript
// 坏：用代码的算法重新算期望值
test("calculateTotal 汇总行项目", () => {
  const items = [{ price: 10 }, { price: 5 }];
  const expected = items.reduce((sum, i) => sum + i.price, 0);
  expect(calculateTotal(items)).toBe(expected);
});

// 好：期望值是独立的已知字面量
test("calculateTotal 汇总行项目", () => {
  expect(calculateTotal([{ price: 10 }, { price: 5 }])).toBe(15);
});
```

**测 mock 而不是测代码**：断言在有 mock 时通过、没 mock 时失败，它对被测组件什么也没说。

```typescript
// 坏：断言 mock 存在
expect(screen.getByTestId("sidebar-mock")).toBeInTheDocument();

// 好：断言真实行为
expect(screen.getByRole("navigation")).toBeInTheDocument();
```

**测文本而不是测行为**：断言脚本、配置或文档里包含某一行，只证明源码就是源码。运行脚本，给受控输入，断言输出、副作用或退出码。

**测框架而不是测自己的代码**：断言"路由调用了注册的处理器"是框架维护者的测试。测你的代码在边界上做出的契约：你注册的路由、你发出的查询、你产生的载荷。

## 警示信号清单

- 准备和断言用的是同一个对象，保证相等
- 测试只可能通过崩溃或找不到选择器而失败
- 每次有意修改都挂，意外破坏时反而不挂
- 期望值藏在循环、构建器或辅助函数后面
- 测试的存在只是为了覆盖率，不检查任何副作用或结果
- 某个方法只被测试文件调用
