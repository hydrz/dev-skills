# 条件等待

不稳定的测试常靠任意的延时去猜时序。这会造成竞态：快机器上通过，负载高或在 CI 里就挂。

**原则：** 等你真正关心的那个条件，而不是猜它要花多久。

## 适用情况

- 测试里有任意延时（`setTimeout`、`sleep`、`time.sleep()`）
- 测试时灵时不灵（负载高时失败）
- 并行跑时超时
- 在等异步操作完成

测试的就是时序本身（防抖、节流间隔）时，保留定时等待，并用注释写明为什么是这个时长。

## 核心模式

```typescript
// 之前：猜时序
await new Promise((r) => setTimeout(r, 50));
const result = getResult();
expect(result).toBeDefined();

// 之后：等条件
await waitFor(() => getResult() !== undefined, "结果就绪");
const result = getResult();
expect(result).toBeDefined();
```

## 常见场景

| 场景 | 写法 |
|---|---|
| 等事件 | `waitFor(() => events.find((e) => e.type === "DONE"), "DONE 事件")` |
| 等状态 | `waitFor(() => machine.state === "ready", "进入 ready")` |
| 等数量 | `waitFor(() => items.length >= 5, "至少 5 项")` |
| 等文件 | `waitFor(() => fs.existsSync(path), "文件出现")` |

## 实现

```typescript
async function waitFor<T>(
  condition: () => T | undefined | null | false,
  description: string,
  timeoutMs = 5000,
): Promise<T> {
  const start = Date.now();
  while (true) {
    const result = condition();
    if (result) return result;
    if (Date.now() - start > timeoutMs) {
      throw new Error(`等待"${description}"超时（${timeoutMs}ms）`);
    }
    await new Promise((r) => setTimeout(r, 10));
  }
}
```

要点：

- **轮询间隔 10ms 左右**：太快浪费 CPU。
- **一定带超时**，并给出清晰的错误信息。
- **在循环内调用 getter**：循环外缓存的状态是旧数据。

## 定时等待确实正确的情况

```typescript
// 工具每 100ms 输出一次，要验证部分输出需要等两个周期
await waitForEvent(manager, "TOOL_STARTED"); // 先等触发条件
await new Promise((r) => setTimeout(r, 200)); // 再等已知周期：2 × 100ms
```

条件：先等触发条件；时长基于已知的时序而不是猜测；注释说明原因。
