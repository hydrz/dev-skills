# 根源回溯

bug 常在调用栈深处表现出来（`git init` 跑错了目录、文件建错了位置、数据库用错了路径）。本能是在报错的地方修，但那是在治症状。

**原则：** 沿调用链往回追，直到找到最初的触发点，在源头修。

## 适用情况

- 错误发生在执行深处，而不是入口
- 堆栈显示很长的调用链
- 不清楚无效数据从哪来
- 需要找出是哪个测试或哪段代码触发了问题

## 回溯过程

### 1. 观察症状

```
Error: git init failed in ~/project/packages/core
```

### 2. 找直接原因

哪段代码直接造成了它？

```typescript
await execFileAsync("git", ["init"], { cwd: projectDir });
```

### 3. 问：谁调用了它？

```
WorktreeManager.createSessionWorktree(projectDir, sessionId)
  ← Session.initializeWorkspace()
  ← Session.create()
  ← 测试里的 Project.create()
```

### 4. 继续往上追：传进来的是什么值？

- `projectDir = ''`（空字符串！）
- 空字符串作为 `cwd` 会解析成 `process.cwd()`
- 那就是源码目录

### 5. 找到最初的触发点

空字符串从哪来？

```typescript
const context = setupCoreTest(); // 返回 { tempDir: '' }
Project.create("name", context.tempDir); // 在 beforeEach 之前就访问了！
```

**根因：** 顶层变量初始化时访问了尚未赋值的值。**修复：** 把 `tempDir` 改成 getter，在 `beforeEach` 之前访问就抛错。

## 追不下去时加堆栈

手动追不动时，在出问题的操作之前加插桩：

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

- 测试里用 `console.error()`，logger 可能被静音。
- 在危险操作*之前*记录，而不是等它失败之后。
- 带上上下文：目录、cwd、环境变量、时间戳。

运行并抓取：

```bash
npm test 2>&1 | grep '\[DEBUG-a4f2\]'
```

分析堆栈：找测试文件名、触发调用的行号、规律（同一个测试？同一个参数？）。

## 找出哪个测试造成污染

某个副作用在测试过程中出现（多出来的文件、被改的全局状态），但不知道是哪个测试造成的：逐个运行测试文件，每跑一个检查一次污染是否出现，在第一个造成污染的测试处停下。测试多时对测试列表二分。

## 关键原则

在报错处修只是治症状。一路追到源头，在源头修；之后再考虑在沿途各层加校验（见 [DEFENSE-IN-DEPTH.md](DEFENSE-IN-DEPTH.md)），让这个 bug 在结构上不可能再发生。
