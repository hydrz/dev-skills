# 根源回溯

bug 常常在调用栈深处表现出来（`git init` 在错误的目录执行、文件创建在错误的位置、数据库使用了错误的路径）。直觉是在报错的地方修复，但那只是在处理症状。

**原则：** 沿调用链往回追，直到找到最初的触发点，然后在源头修复。

## 适用情况

- 错误发生在执行深处，而不是入口处
- 堆栈显示很长的调用链
- 不清楚无效数据从哪里来
- 需要找出是哪个测试或哪段代码触发了问题

## 回溯过程

### 1. 观察症状

```
Error: git init failed in ~/project/packages/core
```

### 2. 找到直接原因

哪段代码直接导致了这个错误？

```typescript
await execFileAsync("git", ["init"], { cwd: projectDir });
```

### 3. 找出调用方

```
WorktreeManager.createSessionWorktree(projectDir, sessionId)
  ← Session.initializeWorkspace()
  ← Session.create()
  ← 测试中的 Project.create()
```

### 4. 继续往上追：传入的是什么值？

- `projectDir = ''`（空字符串！）
- 空字符串作为 `cwd` 时会解析为 `process.cwd()`
- 那正是源码目录

### 5. 找到最初的触发点

空字符串从哪里来？

```typescript
const context = setupCoreTest(); // 返回 { tempDir: '' }
Project.create("name", context.tempDir); // 在 beforeEach 之前就访问了！
```

**根因：** 顶层变量初始化时访问了尚未赋值的值。**修复：** 把 `tempDir` 改成 getter，在 `beforeEach` 之前访问时直接抛错。

## 手动追不下去时，记录堆栈

手动追踪无法继续时，在出问题的操作之前加插桩：

```typescript
async function gitInit(directory: string) {
  console.error("[DEBUG-a4f2] git init:", {
    directory,
    cwd: process.cwd(),
    nodeEnv: process.env.NODE_ENV,
    stack: new Error().stack,
  });
  await execFileAsync("git", ["init"], { cwd: directory });
}
```

- 测试中使用 `console.error()`，因为 logger 可能被静默。
- 在危险操作*之前*记录，而不是等它失败之后。
- 带上上下文：目录、cwd、环境变量、时间戳。

运行并提取日志：

```bash
npm test 2>&1 | grep '\[DEBUG-a4f2\]'
```

分析堆栈：查找测试文件名、触发调用的行号，以及规律（是否总是同一个测试？是否总是同一个参数？）。

## 找出是哪个测试造成了污染

某个副作用在测试过程中出现（多出来的文件、被修改的全局状态），但不知道由哪个测试造成时：逐个运行测试文件，每运行一个就检查一次污染是否出现，在第一个造成污染的测试处停下。测试很多时，对测试列表做二分。

## 关键原则

在报错处修复只是处理症状。一路追到源头，在源头修复；之后再考虑在沿途各层加校验（见 [DEFENSE-IN-DEPTH.md](DEFENSE-IN-DEPTH.md)），从结构上杜绝这个 bug 再次出现。
