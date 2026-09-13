# 何时使用 mock

只在**系统边界**上使用 mock：

- 外部 API（支付、邮件、短信等）
- 数据库（部分情况；优先使用测试数据库）
- 时间、随机数
- 文件系统（部分情况）

你自己的类和模块、内部协作者，以及一切你能控制的代码，都使用真实实现。

## 在正确的层级 mock

替换一个方法之前，先弄清它的全部副作用：测试依赖的部分保持真实，只 mock 它下层较慢或外部的部分。拿不准时，先用真实实现运行一遍，观察实际需要发生什么。

```typescript
// 差：mock 掉了重复检测需要读取的配置写入
vi.mock("ToolCatalog", () => ({
  discoverAndCacheTools: vi.fn().mockResolvedValue(undefined),
}));

// 好：只 mock 较慢的服务启动，配置写入保持真实
vi.mock("MCPServerManager");
```

## mock 数据要完整

mock 的响应要按照真实结构提供全部字段，而不只是测试当前读取的那几个。残缺的 mock 会让问题悄悄漏过：下游代码读取被省略的字段时，测试照样通过，集成时却会出错。

## 测试替身要具体

参数、调用次数或顺序本身就是契约时，断言它们：什么输入都接受的假实现无法验证任何东西。为每个分支（成功、错误、格式错误）各准备一个 fixture 或 spy，确保走错分支时无法满足期望。

## 测试专用代码放在测试工具中

只有测试需要的清理逻辑放在测试工具中，生产类只保留生产方法。检查两个问题：这个方法是否只被测试调用？这个类是否负责这个资源的生命周期？如果答案表明它不属于生产代码，就移到测试工具中。

## mock 准备代码过多时改用集成测试

出现以下情况时，改用真实组件编写集成测试：mock 的准备代码比测试逻辑本身还多、mock 缺少真实组件具有的方法，或者 mock 一改测试就失败。

## 为便于 mock 而设计

在系统边界上，设计容易 mock 的接口：

**1. 依赖注入**

从外部传入依赖，而不是在内部创建：

```typescript
// 容易 mock
function processPayment(order, paymentClient) {
  return paymentClient.charge(order.total);
}

// 难以 mock
function processPayment(order) {
  const client = new StripeClient(process.env.STRIPE_KEY);
  return client.charge(order.total);
}
```

**2. SDK 风格的接口优于通用请求函数**

为每个外部操作提供一个具体函数，而不是一个带条件分支的通用函数：

```typescript
// 好：每个函数都能独立 mock
const api = {
  getUser: (id) => fetch(`/users/${id}`),
  getOrders: (userId) => fetch(`/users/${userId}/orders`),
  createOrder: (data) => fetch("/orders", { method: "POST", body: data }),
};

// 差：mock 中需要编写条件逻辑
const api = {
  fetch: (endpoint, options) => fetch(endpoint, options),
};
```

SDK 风格的好处：

- 每个 mock 返回一种确定的结构
- 测试准备代码中没有条件逻辑
- 更容易看出一个测试用到了哪些端点
- 每个端点都有类型安全
