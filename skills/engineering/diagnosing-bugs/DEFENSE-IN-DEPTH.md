# 纵深防御

修一个由无效数据引起的 bug 时，在一个地方加校验感觉就够了。但单点校验会被别的代码路径、重构或 mock 绕过。

**原则：** 在数据流经的每一层都校验，让 bug 在结构上不可能发生。

单点校验说的是"我们修了这个 bug"；多层校验说的是"我们让这个 bug 不可能再出现"。

## 什么时候值得

根源已经修好，而且满足以下任一：

- 坏数据的后果严重（写错目录、删错数据、扣错钱）
- 数据会经过多条代码路径到达危险操作
- 测试里的 mock 可能绕过入口校验

后果轻微、路径单一时，根源处的修复就够了，多加的层只是噪音。

## 四层

### 第 1 层：入口校验

在接口处拒绝明显无效的输入。

```typescript
function createProject(name: string, workingDirectory: string) {
  if (!workingDirectory || workingDirectory.trim() === "") {
    throw new Error("workingDirectory 不能为空");
  }
  if (!existsSync(workingDirectory)) {
    throw new Error(`workingDirectory 不存在：${workingDirectory}`);
  }
  // ...
}
```

### 第 2 层：业务逻辑校验

确保数据对这个操作有意义。

```typescript
function initializeWorkspace(projectDir: string, sessionId: string) {
  if (!projectDir) {
    throw new Error("初始化工作区需要 projectDir");
  }
  // ...
}
```

### 第 3 层：环境护栏

在特定上下文里阻止危险操作。

```typescript
async function gitInit(directory: string) {
  if (process.env.NODE_ENV === "test") {
    const normalized = normalize(resolve(directory));
    const tmp = normalize(resolve(tmpdir()));
    if (!normalized.startsWith(tmp)) {
      throw new Error(`测试期间拒绝在临时目录之外执行 git init：${directory}`);
    }
  }
  // ...
}
```

### 第 4 层：调试插桩

为事后取证留下上下文。

```typescript
logger.debug("即将执行 git init", { directory, cwd: process.cwd(), stack: new Error().stack });
```

## 应用步骤

1. **追踪数据流**：坏值从哪来？在哪被用？
2. **列出所有检查点**：数据经过的每一处。
3. **在每层加校验**：入口、业务、环境、调试。
4. **逐层测试**：设法绕过第 1 层，确认第 2 层能拦住。

各层抓的情况不同：不同的代码路径会绕过入口校验，mock 会绕过业务逻辑检查，不同平台的边界情况需要环境护栏，调试日志能在其他层都失手时指出结构性的误用。
