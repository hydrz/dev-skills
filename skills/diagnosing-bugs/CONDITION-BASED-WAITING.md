# 基于条件的等待

不稳定的测试常用固定延时来猜测时序。这会造成竞态：在快的机器上通过，在高负载或 CI 中失败。

**原则：** 等待你真正关心的条件，而不是猜测它需要多长时间。

## 适用情况

- 测试中有固定延时（`setTimeout`、`sleep`、`time.sleep()`）
- 测试时灵时不灵（高负载时失败）
- 并行运行时超时
- 需要等待异步操作完成

如果测试的正是时序本身（防抖、节流间隔），保留定时等待，并用注释说明为什么是这个时长。

## 核心模式

```typescript
// 之前：猜测时序
await new Promise((r) => setTimeout(r, 50));
const result = getResult();
expect(result).toBeDefined();

// 之后：等待条件
await waitFor(() => getResult() !== undefined, "结果就绪");
const result = getResult();
expect(result).toBeDefined();
```

## 常见场景

| 场景     | 写法                                                                |
| -------- | ------------------------------------------------------------------- |
| 等待事件 | `waitFor(() => events.find((e) => e.type === "DONE"), "DONE 事件")` |
| 等待状态 | `waitFor(() => machine.state === "ready", "进入 ready")`            |
| 等待数量 | `waitFor(() => items.length >= 5, "至少 5 项")`                     |
| 等待文件 | `waitFor(() => fs.existsSync(path), "文件出现")`                    |

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

- **轮询间隔约 10ms**：太频繁会浪费 CPU。
- **必须设置超时**，并给出清晰的错误信息。
- **在循环内调用 getter**：在循环外缓存的状态是过期数据。

## 确实需要定时等待的情况

```typescript
// 工具每 100ms 输出一次，验证部分输出需要等待两个周期
await waitForEvent(manager, "TOOL_STARTED"); // 先等待触发条件
await new Promise((r) => setTimeout(r, 200)); // 再等待已知周期：2 × 100ms
```

条件：先等待触发条件；时长基于已知时序而不是猜测；用注释说明原因。
