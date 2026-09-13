# 何时 mock

只在**系统边界**上 mock：

- 外部 API（支付、邮件、短信等）
- 数据库（有时；优先用测试库）
- 时间、随机数
- 文件系统（有时）

你自己的类和模块、内部协作者、一切你能控制的东西，用真实实现。

## mock 在正确的层级

替换一个方法之前，先弄清它的所有副作用：测试依赖的那部分保持真实，只 mock 它下面慢的或外部的那一层。拿不准时，先用真实实现跑一遍，观察实际需要发生什么。

```typescript
// 坏：mock 吞掉了重复检测要读的配置写入
vi.mock("ToolCatalog", () => ({
  discoverAndCacheTools: vi.fn().mockResolvedValue(undefined),
}));

// 好：只 mock 慢的服务启动，配置写入保持真实
vi.mock("MCPServerManager");
```

## mock 的数据要完整

mock 的响应要按真实结构完整给出所有字段，而不只是测试当下读到的那几个。残缺的 mock 会静默失败：下游代码读到被省略的字段时，测试照样通过，集成却坏了。

## 替身要具体

参数、调用次数、顺序本身就是契约时，断言它们：什么都接受的假实现什么也没验证。每个分支（成功、错误、格式错误）各给一个 fixture 或 spy，让走错分支无法满足期望。

## 测试专用代码放在测试工具里

只有测试需要的清理逻辑放在测试工具里，生产类只带生产方法。自问：这个方法只被测试调用吗？这个类拥有这个资源的生命周期吗？答案不对，就移到测试工具。

## mock 准备膨胀时换成集成测试

mock 的准备代码超过测试逻辑本身、mock 缺了真实组件有的方法、或者 mock 一改测试就挂，改用真实组件写集成测试。

## 为可 mock 而设计

在系统边界上，设计容易 mock 的接口：

**1. 依赖注入**

从外部传入依赖，而不是在内部创建：

```typescript
// 容易 mock
function processPayment(order, paymentClient) {
  return paymentClient.charge(order.total);
}

// 难 mock
function processPayment(order) {
  const client = new StripeClient(process.env.STRIPE_KEY);
  return client.charge(order.total);
}
```

**2. SDK 风格的接口优于通用请求函数**

每个外部操作一个具体函数，而不是一个带条件分支的通用函数：

```typescript
// 好：每个函数都能独立 mock
const api = {
  getUser: (id) => fetch(`/users/${id}`),
  getOrders: (userId) => fetch(`/users/${userId}/orders`),
  createOrder: (data) => fetch("/orders", { method: "POST", body: data }),
};

// 坏：mock 里得写条件逻辑
const api = {
  fetch: (endpoint, options) => fetch(endpoint, options),
};
```

SDK 风格意味着：

- 每个 mock 返回一种确定的形状
- 测试准备里没有条件逻辑
- 更容易看出一个测试用到了哪些端点
- 每个端点都有类型安全
