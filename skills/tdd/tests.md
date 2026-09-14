# 好的测试与差的测试

## 好的测试

**集成风格**：通过真实接口测试，不 mock 内部组件。

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

- 测试用户或调用方关心的行为
- 只使用公开 API
- 内部重构后依然有效
- 描述“做什么”，不描述“怎么做”
- 每个测试只有一个逻辑断言
- 测试名称中出现“和”时，拆成两个测试

## 差的测试

**测试实现细节**：与内部结构耦合。

```typescript
// 差：测试实现细节
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
- 行为没有变化，重构后测试却失败
- 测试名称描述“怎么做”而不是“做什么”
- 绕过接口，从外部验证

```typescript
// 差：绕过接口验证
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

**同义反复测试**：期望值复述了实现，测试必然通过。

```typescript
// 差：用代码的算法重新计算期望值
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

**测试 mock 而不是测试代码**：断言在有 mock 时通过、没有 mock 时失败，它无法说明被测组件的任何行为。

```typescript
// 差：断言 mock 存在
expect(screen.getByTestId("sidebar-mock")).toBeInTheDocument();

// 好：断言真实行为
expect(screen.getByRole("navigation")).toBeInTheDocument();
```

**测试文本而不是测试行为**：断言脚本、配置或文档中包含某一行，只能证明源码内容就是源码内容。应当运行脚本，提供受控输入，断言输出、副作用或退出码。

**测试框架而不是测试自己的代码**：断言“路由调用了注册的处理器”，是框架维护者该写的测试。应当测试你的代码在边界上承担的契约：你注册的路由、你发出的查询、你生成的数据。

## 警示信号清单

- 准备数据和断言使用同一个对象，必然相等
- 测试只可能因为崩溃或找不到选择器而失败
- 每次有意修改都会失败，意外破坏时反而不会失败
- 期望值隐藏在循环、构建器或辅助函数中
- 测试读取源码文本，或断言某个已删除的符号仍然不存在
- 把自己的代码删掉、只剩框架时，这个测试依然成立
- 测试只是为了覆盖率而存在，不检查任何副作用或结果
- 断言检查的是 `*-mock` 测试 ID，或者去掉 mock 后断言就失败
- 某个方法只被测试文件调用
- mock 的准备代码占了测试一半以上，或说不清为什么需要这个 mock
- 只是为了“保险起见”而 mock
