# 契约优先

项目采用契约优先（contract-first），或者使用 TypeSpec 定义接口时，读这份文件。其他项目按 [BUSINESS-MODULES.md](BUSINESS-MODULES.md) 的原则设计模块接口即可，不需要引入契约文件。

契约优先指先写出业务模块之间、以及对外的接口契约，评审通过后再写实现。契约是业务模块接口中可以机器校验的部分；不变量、顺序约束和错误语义仍需要在契约的注释或文档中写明。

## 契约覆盖的范围

契约只描述跨越业务模块边界的数据，是**契约模型**的唯一来源：

- HTTP 请求和响应
- RPC 命令
- 事件
- 错误
- 多个模块共用的传输类型（例如 `Money`、`CustomerId`）

领域模型和存储模型不写进契约。契约类型与领域模型结构相同时，也保留两份，由模块内部负责映射。简单增删改查模块可以直接使用生成的类型。

## 以 TypeSpec 为例

目录按业务模块划分，与实现代码的模块一一对应：

```text
contracts/
├── order/
│   ├── api.tsp
│   └── events.tsp
├── payment/
└── user/
```

```typespec
namespace Order;

model CreateOrderRequest {
  customerId: string;
  items: OrderItem[];
}

model OrderCreated {
  orderId: string;
  customerId: string;
}
```

从契约生成下游产物，生成结果不手工修改：

- OpenAPI、JSON Schema 或 Protobuf
- 服务端的请求和响应类型
- 调用方的客户端

## 在 CI 中守住契约

- 契约文件变更时，重新生成产物，并检查提交中的生成结果与重新生成的一致。
- 对已发布的契约做兼容性检查，破坏性变更需要显式升级版本。
- 契约 PR 与实现 PR 可以分开提交，契约先合并。
